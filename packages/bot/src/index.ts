import { CeloTokens, newKit, StableToken } from '@celo/contractkit'
import Config from './config'
import { AddressToCeloToken, CeloToken, CeloTokenToAddress } from './constants'
import Loans from './loans'
import Oracle from './oracle'

const kit = newKit(Config.rpc_url)
;(async () => {
  Oracle.Initialize()
  await Oracle.start()
  Loans.Initialize()
  await Loans.start()
  // setInterval(() => {
  //   console.log(
  //     JSON.stringify(
  //       {
  //         cUSD: Oracle.medianRate(CeloTokenToAddress[CeloToken.cUSD]),
  //         cEUR: Oracle.medianRate(CeloTokenToAddress[CeloToken.cEUR]),
  //         CELO: Oracle.medianRate(CeloTokenToAddress[CeloToken.CELO]),
  //       },
  //       null,
  //       2,
  //     ),
  //   )
  // }, 2000)
  console.log(JSON.stringify(await Loans.getUnHealthy(), null, 2))
  process.exit()
})()
