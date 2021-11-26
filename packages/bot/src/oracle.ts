import {
  CeloContract,
  ContractKit,
  newKit,
  StableToken,
} from '@celo/contractkit'
import BigNumber from 'bignumber.js'
import Config from './config'
import { AddressToCeloToken, CeloToken, CeloTokenToAddress } from './constants'

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
  }

  public static Initialize() {
    return this._instance || (this._instance = new this())
  }

  public static isRunning(): boolean {
    return Oracle._intervalFunc !== undefined
  }

  public static async start() {
    if (Oracle.isRunning()) return
    // to initialised the prices
    await Oracle._runPolling()
    Oracle._intervalFunc = setInterval(
      () => setTimeout(Oracle._runPolling, Config.oracle_polling),
      Config.oracle_polling,
    )
  }

  public static stop() {
    if (Oracle._intervalFunc) clearInterval(Oracle._intervalFunc)
  }

  public static medianRate(address: string) {
    if (!Oracle.isRunning()) throw new Error('Oracle is not Polling')
    if (AddressToCeloToken[address] === undefined)
      throw new Error('Asset Not supported')

    if (AddressToCeloToken[address] === CeloToken.CELO) return new BigNumber(1)

    return Oracle._rates[address]
  }
}

export default Oracle
