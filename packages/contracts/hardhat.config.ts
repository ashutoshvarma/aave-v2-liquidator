import '@ubeswap/hardhat-celo'
import '@typechain/hardhat'
import 'dotenv/config'
import 'hardhat-deploy'

import { HardhatUserConfig } from 'hardhat/types'
import { fornoURLs, ICeloNetwork, derivationPath } from '@ubeswap/hardhat-celo'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
  },
  networks: {
    hardhat: {
      // process.env.HARDHAT_FORK will specify the network that the fork is made from.
      // this line ensure the use of the corresponding accounts
      accounts: {
        count: 8,
        path: derivationPath,
        accountsBalance: '10000000000000000000000',
      },
    },
    alfajores: {
      url: fornoURLs[ICeloNetwork.ALFAJORES],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      accounts: [process.env.CELO_PRIVATE_KEY!],
      chainId: ICeloNetwork.ALFAJORES,
      live: true,
      gasPrice: 0.5 * 10 ** 9,
      gas: 8000000,
    },
    celo: {
      url: fornoURLs[ICeloNetwork.MAINNET],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      accounts: [process.env.CELO_PRIVATE_KEY!],
      chainId: ICeloNetwork.MAINNET,
      live: true,
      gasPrice: 0.5 * 10 ** 9,
      gas: 8000000,
    },
  },
  namedAccounts: {
    deployerAddr: 0,
  },
  paths: {
    sources: 'src',
  },
  typechain: {
    outDir: 'generated',
    target: 'web3-v1',
  },
}
export default config
