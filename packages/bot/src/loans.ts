/* eslint-disable @typescript-eslint/no-explicit-any */
import BigNumber from 'bignumber.js'
import { request, gql } from 'graphql-request'
import Config, { logger } from './config'
import { AddressToCeloToken, CeloToken } from './constants'
import Oracle from './oracle'
import { setIntervalSeq, tenRaiseTo } from './utils'

interface User {
  userId: string
  borrowReserve: any[]
  collateralReserve: any[]
}

interface UserDataResponse {
  users: User[]
}

export interface Loan {
  user: string
  // userData: User
  healthFactor: BigNumber
  maxCollateral: {
    token: CeloToken
    principal: BigNumber
    priceInCelo: BigNumber
  }
  maxBorrowed: {
    token: CeloToken
    principal: BigNumber
    priceInCelo: BigNumber
  }
}

export const userQuery = gql`
  query getUserData($lastID: String) {
    users(first: 1000, where: { id_gt: $lastID }) {
      userId: id
      collateralReserve: reserves(
        where: { currentATokenBalance_gt: 0, usageAsCollateralEnabled: true }
      ) {
        currentATokenBalance
        reserve {
          name
          underlyingAsset
          symbol
          decimals
          reserveLiquidationThreshold
          reserveLiquidationBonus
        }
      }
      borrowReserve: reserves(where: { currentTotalDebt_gt: 0 }) {
        currentTotalDebt
        reserve {
          name
          underlyingAsset
          symbol
          decimals
          reserveLiquidationThreshold
          reserveLiquidationBonus
        }
      }
    }
  }
`

async function runQuery(vars: { lastID: string } = { lastID: '' }) {
  return await request<UserDataResponse>(
    Config.subgraph_endpoint,
    userQuery,
    vars,
  )
}

async function fetchUserData() {
  let lastID = ''
  let tmpUsers = (await runQuery()).users
  let users = tmpUsers.filter((u) => u.borrowReserve.length > 0)
  while (tmpUsers.length !== 0) {
    lastID = tmpUsers[tmpUsers.length - 1].userId
    tmpUsers = (await runQuery({ lastID })).users
    users = [...users, ...tmpUsers.filter((u) => u.borrowReserve.length > 0)]
  }
  return users
}

export class Loans {
  private static _users: User[]
  private static _instance: Loans
  private static _intervalFunc: NodeJS.Timer | undefined

  private constructor() {
    Loans._users = []
  }

  private static async _runPolling() {
    logger.debug('Loans::_runPolling: Starting')
    Loans._users = await fetchUserData()
    logger.debug(
      `Loans::_runPolling: Finished. Total Active Loans - ${Loans._users.length}`,
    )
  }

  public static Initialize() {
    logger.info('Loans::Initialize(): Initialized')
    return this._instance || (this._instance = new this())
  }

  public static isRunning(): boolean {
    return Loans._intervalFunc !== undefined
  }

  public static async start() {
    if (Loans.isRunning()) {
      logger.info('Loans::start(): Already Running')
    }
    await Loans._runPolling()
    Loans._intervalFunc = setIntervalSeq(
      Loans._runPolling,
      Config.subgraph_polling,
    )
    logger.info('Loans::start(): Started')
  }

  public static stop() {
    if (Loans._intervalFunc) {
      clearInterval(Loans._intervalFunc)
      logger.info('Loans:"stop() Stopped')
    } else {
      logger.info('Loans:"stop() Not Running')
    }
  }

  public static async getUnHealthy(): Promise<Loan[]> {
    const unhealthy: Loan[] = []
    for (const userData of Loans._users) {
      // initialize variables
      let totalBorrowedInCelo = new BigNumber(0)
      let maxBorrowedToken: CeloToken = CeloToken.CELO
      let maxBorrowedPrincipal = new BigNumber(0)
      let maxBorrowedInCelo = new BigNumber(0)

      let totalCollateralThresholdInCelo = new BigNumber(0)
      let maxCollateralToken: CeloToken = CeloToken.CELO
      let maxCollateralPrincipal = new BigNumber(0)
      let maxCollateralInCelo = new BigNumber(0)

      userData.borrowReserve.forEach((b) => {
        const borrowToken = AddressToCeloToken[b.reserve.underlyingAsset]
        const principal = new BigNumber(b.currentTotalDebt)
        const priceInCelo = principal.dividedBy(
          Oracle.medianRate(b.reserve.underlyingAsset),
        )
        const decimals = new BigNumber(b.reserve.decimals)
        totalBorrowedInCelo = totalBorrowedInCelo.plus(
          priceInCelo.div(tenRaiseTo(decimals)),
        )

        if (priceInCelo.gt(maxBorrowedInCelo)) {
          maxBorrowedInCelo = priceInCelo
          maxBorrowedToken = borrowToken
          maxBorrowedPrincipal = principal
        }
      })

      userData.collateralReserve.forEach((b) => {
        const collateralToken = AddressToCeloToken[b.reserve.underlyingAsset]
        const principal = new BigNumber(b.currentATokenBalance)
        const priceInCelo = principal.dividedBy(
          Oracle.medianRate(b.reserve.underlyingAsset),
        )
        const decimals = new BigNumber(b.reserve.decimals)
        const threshold = new BigNumber(
          b.reserve.reserveLiquidationThreshold,
        ).dividedBy(10000)
        totalCollateralThresholdInCelo = totalCollateralThresholdInCelo.plus(
          priceInCelo.multipliedBy(threshold).div(tenRaiseTo(decimals)),
        )

        if (priceInCelo.gt(maxCollateralInCelo)) {
          maxCollateralInCelo = priceInCelo
          maxCollateralToken = collateralToken
          maxCollateralPrincipal = principal
        }
      })

      const healthFactor =
        totalCollateralThresholdInCelo.dividedBy(totalBorrowedInCelo)

      unhealthy.push({
        healthFactor,
        // userData,
        user: userData.userId,
        maxBorrowed: {
          priceInCelo: maxBorrowedInCelo,
          principal: maxBorrowedPrincipal,
          token: maxBorrowedToken,
        },
        maxCollateral: {
          priceInCelo: maxCollateralInCelo,
          principal: maxCollateralPrincipal,
          token: maxCollateralToken,
        },
      })
    }

    const filteredLoans = unhealthy
      .filter((l) => l.healthFactor.lte(Config.health_factor_max))
      .sort((a, b) => a.healthFactor.minus(b.healthFactor).toNumber())

    logger.info(
      `Loans::getUnHealthy(): Total Loans - ${unhealthy.length}, UnHealthy Loans - ${filteredLoans.length}`,
    )
    console.log(JSON.stringify(filteredLoans, null, 2))
    return filteredLoans
  }
}

export default Loans
