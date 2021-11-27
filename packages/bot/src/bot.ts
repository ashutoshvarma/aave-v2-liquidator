/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContractKit, newKit } from '@celo/contractkit'
import Config, { logger, Mainnet } from './config'
import Loans, { Loan } from './loans'
import Oracle from './oracle'
import { setIntervalSeq } from './utils'
import { LiquidateLoan } from '@moola-v2-liquidator/contracts/generated/LiquidateLoan'
import { CeloTokenToAddress, swapPath } from './constants'

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

  return new kit.web3.eth.Contract(
    <any>jsonFile.abi,
    jsonFile.address,
  ) as unknown as LiquidateLoan
}

class LiquidationBot {
  private static _instance: LiquidationBot
  private static _kit: ContractKit
  private static _liquidation: LiquidateLoan
  private static _intervalFunc: NodeJS.Timer | undefined

  private constructor(pk: string) {
    const kit = newKit(Config.rpc_url)

    const account = kit.web3.eth.accounts.wallet.add(pk)
    kit.web3.eth.defaultAccount = account.address

    LiquidationBot._kit = kit
  }

  private static async _liquidate(loan: Loan) {
    try {
      const assetToLiquidate = CeloTokenToAddress[loan.maxBorrowed.token]
      const flashAmt = loan.maxBorrowed.principal.multipliedBy(
        Config.max_amount_liquidate,
      )
      const collateral = CeloTokenToAddress[loan.maxCollateral.token]
      const swapP = swapPath(collateral, assetToLiquidate)
      const reciept = await LiquidationBot._liquidation.methods
        .executeFlashLoans(
          assetToLiquidate,
          flashAmt.toString(),
          collateral,
          loan.user,
          swapP,
        )
        .send()
    } catch (err) {
      //
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

    Oracle.Initialize()
    Loans.Initialize()
    logger.info('LiquidationBot::Initialize(): Initialized')
    return this._instance || (this._instance = new this(pk))
  }

  public static isRunning(): boolean {
    return LiquidationBot._intervalFunc !== undefined
  }

  public static async start() {
    if (LiquidationBot.isRunning()) {
      logger.info('LiquidationBot::start(): Already Running')
    }

    await Oracle.start()
    await Loans.start()

    // to initialised the prices
    await LiquidationBot._runPolling()
    LiquidationBot._intervalFunc = setIntervalSeq(
      LiquidationBot._runPolling,
      Config.bot_polling,
    )

    // initialised contract
    LiquidationBot._liquidation = await getLiquidationContract(
      LiquidationBot._kit,
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
