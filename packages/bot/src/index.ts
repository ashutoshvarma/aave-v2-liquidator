import LiquidationBot from './bot'
import { logger } from './config'

LiquidationBot.Initialize()
LiquidationBot.start()

process.on('exit', (code) => {
  logger.info(`Bot Stopped with code ${code}`)
})

//catches ctrl+c event
process.on('SIGINT', () => {
  process.exit()
})

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', () => {
  process.exit()
})

process.on('SIGUSR2', () => {
  process.exit()
})
