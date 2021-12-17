/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContractKit, newKit } from '@celo/contractkit'
import Config, { logger, Mainnet } from './config'
import Loans, { Loan } from './loans'
import Oracle from './oracle'
import { setIntervalSeq } from './utils'
import { LiquidateLoan } from '@moola-v2-liquidator/contracts/generated/LiquidateLoan'
import { CeloTokenToAddress, swapPath } from './constants'
import { TransactionReceipt } from 'web3-core'

async function getLiquidationContract(kit: ContractKit) {
  let jsonFile
  if (Config.chain_id === Mainnet.chainId) {
    jsonFile = await import(
      '@moola-v2-liquidator/contracts/deployments/celo/LiquidateLoan.json'
    )
  } else {
    jsonFile = await import(
      '@moola-v2-liquidator/contracts/deployments/alfajores/LiquidateLoan.json'
    )
  }

  return new kit.web3.eth.Contract(<any>jsonFile.abi, jsonFile.address, {
    from: kit.defaultAccount,
  }) as unknown as LiquidateLoan
}

class LiquidationBot {
  private static _instance: LiquidationBot
  static _kit: ContractKit
  private static _liquidation: LiquidateLoan
  private static _intervalFunc: NodeJS.Timer | undefined

  private constructor(pk: string) {
    LiquidationBot._kit = newKit(Config.rpc_url)
    LiquidationBot._kit.connection.addAccount(pk)
  }

  private static async _liquidate(loan: Loan) {
    logger.info(
      `LiquidationBot::_liquidate(${loan.user}): Attempting Liquidation`,
    )
    let receipt: TransactionReceipt | undefined
    let debugData
    try {
      const assetToLiquidate = CeloTokenToAddress[loan.maxBorrowed.token]
      const flashAmt = loan.maxBorrowed.principal.multipliedBy(
        Config.max_amount_liquidate,
      )
      const collateral = CeloTokenToAddress[loan.maxCollateral.token]
      const swapP = swapPath(collateral, assetToLiquidate)
      debugData = {
        assetToLiquidate,
        flashAmt,
        collateral,
        swapP,
        loan,
      }
      // if flash amount is more than 5 celo then use higher gas price
      const gasPrice = loan.maxCollateral.priceInCelo
        .dividedBy(2)
        .isLessThanOrEqualTo(5)
        ? undefined
        : '690000000'
      receipt = await LiquidationBot._liquidation.methods
        .executeFlashLoans(
          assetToLiquidate,
          flashAmt.toFixed().split('.')[0],
          collateral,
          loan.user,
          swapP,
        )
        .send({ from: this._kit.defaultAccount, gasPrice })
    } catch (err) {
      logger.error(
        `LiquidationBot::_liquidate(${loan.user}): Error while Attempting Liquidation of user ${loan.user} with HF ${loan.healthFactor}`,
      )
      logger.error(err)
    } finally {
      const logOut = {
        ...receipt,
        debugData,
      }
      logger.info(
        `LiquidationBot::_liquidate(${loan.user}): Attempted Liquidation of user ${loan.user} with HF ${loan.healthFactor}`,
      )
      if (receipt?.status === true) {
        // logger.info(`\n${JSON.stringify(logOut, null, 2)}`)
        logger.info(
          `LiquidationBot::_liquidate(${loan.user}): Liquidation Success: ${receipt.transactionHash}`,
        )
      } else if (receipt?.status === false) {
        logger.error(
          `LiquidationBot::_liquidate(${loan.user}): ${JSON.stringify({
            logOut,
            receipt: receipt,
          })}`,
        )
      } else {
        logger.error(
          `LiquidationBot::_liquidate(${loan.user}): ${JSON.stringify({
            logOut,
            receipt: null,
          })}`,
        )
      }
    }
  }

  private static async _runPolling() {
    logger.debug('LiquidationBot::_runPolling: Starting')
    const badLoans = await Loans.getUnHealthy()
    badLoans.forEach((l) => setTimeout(() => LiquidationBot._liquidate(l), 0))
  }

  public static Initialize() {
    const pk = process.env.CELO_PRIVATE_KEY
    if (!pk) throw new Error('Please provide CELO_PRIVATE_KEY env variable')

    LiquidationBot._kit = newKit(Config.rpc_url)
    LiquidationBot._kit.connection.addAccount(pk)

    Oracle.Initialize()
    Loans.Initialize()
    logger.info('LiquidationBot::Initialize(): Initialized')
    return this._instance || (this._instance = new this(pk))
  }

  public static isRunning(): boolean {
    return LiquidationBot._intervalFunc !== undefined
  }

  public static async start() {
    const account = (await this._kit.connection.getAccounts())[0]
    this._kit.defaultAccount = account

    if (LiquidationBot.isRunning()) {
      logger.info('LiquidationBot::start(): Already Running')
    }

    // initialised contract
    LiquidationBot._liquidation = await getLiquidationContract(
      LiquidationBot._kit,
    )

    await Oracle.start()
    await Loans.start()

    // to initialised the prices
    await LiquidationBot._runPolling()
    LiquidationBot._intervalFunc = setIntervalSeq(
      LiquidationBot._runPolling,
      Config.bot_polling,
    )

    logger.info('LiquidationBot::start(): Started')
  }

  public static stop() {
    if (LiquidationBot._intervalFunc) {
      Oracle.stop()
      Loans.stop()
      clearInterval(LiquidationBot._intervalFunc)
      logger.info('LiquidationBot:"stop() Stopped')
    } else {
      logger.info('LiquidationBot:"stop() Not Running')
    }
  }

  public static async startBlocking() {
    logger.info('LiquidationBot::startBlocking(): Started')
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await LiquidationBot._runPolling()
    }
  }
}

export default LiquidationBot
