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

export const ubeswapV2Router = ''
