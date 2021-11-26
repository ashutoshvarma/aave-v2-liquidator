import { ContractKit, newKit } from '@celo/contractkit'
import BigNumber from 'bignumber.js'
import Config, { logger } from './config'
import { AddressToCeloToken, CeloToken, CeloTokenToAddress } from './constants'
import { setIntervalSeq } from './utils'

class Oracle {
  private static _instance: Oracle
  private static _kit: ContractKit
  private static _rates: Record<string, BigNumber>
  private static _intervalFunc: NodeJS.Timer | undefined

  private constructor() {
    const kit = newKit(Config.rpc_url)
    Oracle._kit = kit
    Oracle._rates = {}
  }

  private static async _runPolling() {
    const oracle = await Oracle._kit.contracts.getSortedOracles()
    const cEURp = oracle
      .medianRate(CeloTokenToAddress[CeloToken.cEUR])
      .then((m) => m.rate)
      .then((r) => (Oracle._rates[CeloTokenToAddress[CeloToken.cEUR]] = r))
    const cUSDp = oracle
      .medianRate(CeloTokenToAddress[CeloToken.cUSD])
      .then((m) => m.rate)
      .then((r) => (Oracle._rates[CeloTokenToAddress[CeloToken.cUSD]] = r))
    await Promise.all([cEURp, cUSDp])
    logger.debug(
      `Oracle::_runPolling(): rates=${JSON.stringify({
        cEUR: Oracle._rates[CeloTokenToAddress[CeloToken.cEUR]],
        cUSD: Oracle._rates[CeloTokenToAddress[CeloToken.cUSD]],
      })}`,
    )
  }

  public static Initialize() {
    logger.info('Oracle::Initialize(): Initialized')
    return this._instance || (this._instance = new this())
  }

  public static isRunning(): boolean {
    return Oracle._intervalFunc !== undefined
  }

  public static async start() {
    if (Oracle.isRunning()) {
      logger.info('Oracle::start(): Already Running')
    }
    // to initialised the prices
    await Oracle._runPolling()
    Oracle._intervalFunc = setIntervalSeq(
      Oracle._runPolling,
      Config.oracle_polling,
    )
    logger.info('Oracle::start(): Started')
  }

  public static stop() {
    if (Oracle._intervalFunc) {
      clearInterval(Oracle._intervalFunc)
      logger.info('Oracle:"stop() Stopped')
    } else {
      logger.info('Oracle:"stop() Not Running')
    }
  }

  /**
   * Get the cache SortedOracle median price
   * @param address Asset Address
   * @returns Price of 1 CELO in asset with normal decimals
   */
  public static medianRate(address: string) {
    if (!Oracle.isRunning()) {
      logger.warn(
        `Oracle::medianRate(${address}): Oracle is not polling, price might be outdated`,
      )
    }
    if (AddressToCeloToken[address] === undefined) {
      logger.error(`Oracle::medianRate(${address}): Asset Not supported`)
      throw new Error('Asset Not supported')
    }

    if (AddressToCeloToken[address] === CeloToken.CELO) return new BigNumber(1)

    return Oracle._rates[address]
  }
}

export default Oracle
