import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const address = {
  celo: {
    addressProvider: '0xD1088091A174d33412a968Fa34Cb67131188B332',
    // sushiswap
    uniswapRouter: '0x1421bDe4B10e8dd459b3BCb598810B1337D56842',
  },
  alfajores: {
    addressProvider: '0xb3072f5F0d5e8B9036aEC29F37baB70E86EA0018',
    // ubeswap
    uniswapRouter: '0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121',
  },
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments

  const { deployerAddr } = await getNamedAccounts()
  const isCelo = hre.network.name === 'celo'

  await deploy('LiquidateLoan', {
    contract: 'LiquidateLoan',
    from: deployerAddr,
    args: [
      isCelo ? address.celo.addressProvider : address.alfajores.addressProvider,
      isCelo ? address.celo.uniswapRouter : address.alfajores.uniswapRouter,
    ],
    log: true,
  })
}

export default func
