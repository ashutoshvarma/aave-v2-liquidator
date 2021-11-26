import { ContractKit, newKit } from '@celo/contractkit'
import Config, { logger } from './config'
import Loans from './loans'
import Oracle from './oracle'
import { setIntervalSeq } from './utils'

class LiquidationBot {
  private static _instance: LiquidationBot
  private static _kit: ContractKit
  private static _intervalFunc: NodeJS.Timer | undefined

  private constructor() {
    const kit = newKit(Config.rpc_url)
    LiquidationBot._kit = kit
  }
  private static async _runPolling() {
    logger.debug('LiquidationBot::_runPolling: Starting')
    const loans = await Loans.getUnHealthy()
  }

  public static Initialize() {
    Oracle.Initialize()
    Loans.Initialize()
    logger.info('LiquidationBot::Initialize(): Initialized')
    return this._instance || (this._instance = new this())
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
