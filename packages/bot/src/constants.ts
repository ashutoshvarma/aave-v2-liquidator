import { logger } from './config'

export const MoolaAddress = {
  mCUSD: '0x918146359264c492bd6934071c6bd31c854edbc3',
  mcEUR: '0xe273ad7ee11dcfaa87383ad5977ee1504ac07568',
  mCELO: '0x7d00cd74ff385c955ea3d79e47bf06bd7386387d',
  aaveAddressRegistry: '',
}

export enum CeloToken {
  CELO,
  cUSD,
  cEUR,
}

export const AddressToCeloToken: Record<string, CeloToken> = {
  '0x471ece3750da237f93b8e339c536989b8978a438': CeloToken.CELO,
  '0x765de816845861e75a25fca122bb6898b8b1282a': CeloToken.cUSD,
  '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73': CeloToken.cEUR,
}

export const CeloTokenToAddress = {
  [CeloToken.CELO]: '0x471ece3750da237f93b8e339c536989b8978a438',
  [CeloToken.cUSD]: '0x765de816845861e75a25fca122bb6898b8b1282a',
  [CeloToken.cEUR]: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
}

export const WETH = '0xe919f65739c26a42616b7b8eedc6b5524d1e3ac4'

export const ubeswapV2Router = '0x1421bDe4B10e8dd459b3BCb598810B1337D56842'

export const swapPath = (_a: string, _b: string) => {
  const [a, b] = [_a, _b].sort().map((i) => AddressToCeloToken[i])

  if (_a === _b) {
    logger.debug(
      `constants::swapPath(${a}, ${b}): Same asset, returning ${[_a, _b]}`,
    )
    return [_a, _b]
  } else if (a === CeloToken.CELO && b === CeloToken.cUSD) {
    // CELO -> WETH -> CUSD
    // CUSD -> WETH -> CELO
    return [_a, WETH, _b]
  } else if (a === CeloToken.CELO && b === CeloToken.cEUR) {
    // CELO -> WETH -> cEUR
    // cEUR -> WETH -> CELO
    return [_a, WETH, _b]
  } else if (a === CeloToken.cUSD && b === CeloToken.cEUR) {
    // CUSD -> CEUR
    // CEUR -> CUSD
    return [_a, _b]
  } else {
    logger.error(`constants::swapPath(${a}, ${b}): No route for given pair`)
    throw new Error(' No route for given pair')
  }
}
