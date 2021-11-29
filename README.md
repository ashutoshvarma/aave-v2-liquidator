# Moola V2 Liquidation Bot
A Fast, Modern & Modular Liquidation Bot for Moola V2.

# Features :-
- Extermely Lightweight
- Constant time oracle and loans filtering.
- No need of initial funds as it uses Flashloan to liqudate. 

## Design Architecture

There are 3 components for this bot :-

1. [`Oracle`](./packages/bot/src/oracle.ts) - A very fast constant time Oracle with lazy cached on-chain rates and refresh the cache in background.
2. [`Loans`](./packages/bot/src/loans.ts) - This fetch the active loans using subgraph and calculate their HF to filter bad loans. Also this cache the results so this is also constant time.
3. [`LiquidationBot`](./packages/bot/src/bot.ts) - Main bot which uses `Loans` to

## Requirements:-

This bot does not require any specific external resource like db, etc.
But it is recommended to use latest yarn with it for optimal experience.

## Setup

1. Clone the git repo and cd into it.
   ```bash
   $ git clone https://github.com/ashutoshvarma/moola-liquidator-v2
   $ cd moola-liquidator-v2
   ```
2. Install the deps.
   ```bash
   $ yarn
   ```
3. Configure the env files. For reference see the respective `.env.example`
4. Deploy the Flash loan contracts [**IMPORTANT**: do not run the bot before this step]
   ```bash
   $ yarn compile && yarn deploy
   ```
5. Run the bot
   ```
   $ yarn start
   ```
