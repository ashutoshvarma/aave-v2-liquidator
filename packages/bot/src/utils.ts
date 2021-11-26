import BigNumber from 'bignumber.js'
import { logger } from './config'

export function setIntervalSeq(fn: () => void, ms: number, timeout?: number) {
  const tm = timeout ? timeout : ms
  return setInterval(() => {
    try {
      setTimeout(fn, tm)
    } catch (error) {
      logger.error(
        `setIntervalSeq(${fn.name}(), ${ms}, ${timeout}): Error Occured`,
      )
      logger.error(error)
    }
  }, ms)
}

export function tenRaiseTo(n: BigNumber) {
  return new BigNumber(10).pow(n)
}
