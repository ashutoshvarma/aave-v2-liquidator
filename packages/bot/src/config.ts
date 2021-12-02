import dotenv from 'dotenv'
dotenv.config()
import { ChainId, parseNetwork } from '@ubeswap/sdk'
import { createLogger, format, transports } from 'winston'
import BigNumber from 'bignumber.js'

export enum NetworkNames {
  Alfajores = 'Alfajores',
  Mainnet = 'Mainnet',
}

export const Alfajores = {
  name: NetworkNames.Alfajores,
  rpcUrl: 'https://alfajores-forno.celo-testnet.org',
  graphQl: 'https://alfajores-blockscout.celo-testnet.org/graphiql',
  explorer: 'https://alfajores-blockscout.celo-testnet.org',
  chainId: ChainId.ALFAJORES,
} as const

export const Mainnet = {
  name: NetworkNames.Mainnet,
  rpcUrl: 'https://forno.celo.org',
  graphQl: 'https://explorer.celo.org/graphiql',
  explorer: 'https://explorer.celo.org',
  chainId: ChainId.MAINNET,
} as const

const Config = {
  log_file: process.env.CELO_LOG_FILE,
  log_level: process.env.CELO_LOG_LEVEL || 'info',
  rpc_url: process.env.CELO_RPC || Mainnet.rpcUrl,
  chain_id: process.env.CELO_CHAIN_ID
    ? parseNetwork(Number(process.env.CELO_CHAIN_ID))
    : Mainnet.chainId,
  oracle_polling: 1500,
  subgraph_polling: 15000, //15s
  bot_polling: 2000,
  health_factor_max: new BigNumber(1),
  flash_loan_fee: new BigNumber(0.009),
  max_amount_liquidate: new BigNumber(0.5),
  subgraph_endpoint:
    process.env.MOOLA_SUBGRAPH ||
    'https://api.thegraph.com/subgraphs/name/ashutoshvarma/moola-v2-celo',
}

const myFormat = format.combine(
  format.timestamp(),
  format.align(),
  format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message} ${
        info.stack ? info.stack : ''
      }`,
  ),
)

const myTransports = Config.log_file
  ? [
      new transports.Console({
        format: format.combine(format.colorize(), myFormat),
      }),
      new transports.File({
        filename: Config.log_file,
        format: myFormat,
      }),
    ]
  : [
      new transports.Console({
        format: format.combine(format.colorize(), myFormat),
      }),
    ]

export const logger = createLogger({
  defaultMeta: 'LiquidationBot',
  level: Config.log_level,
  format: format.errors({ stack: true }),
  transports: myTransports,
})

export default Config
