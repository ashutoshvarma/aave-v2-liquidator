import BigNumber from 'bignumber.js'

export function setIntervalSeq(fn: () => void, ms: number, timeout?: number) {
  const tm = timeout ? timeout : ms
  return setInterval(() => {
    try {
      setTimeout(fn, tm)
    } catch (error) {
      console.error(error)
    }
  }, ms)
}

export function tenRaiseTo(n: BigNumber) {
  return new BigNumber(10).pow(n)
}
