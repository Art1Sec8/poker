# Poker

[![CI](https://github.com/Art1Sec8/poker/actions/workflows/ci.yml/badge.svg)](https://github.com/Art1Sec8/poker/actions/workflows/ci.yml)

A Texas Hold'em and Pot-Limit Omaha trainer. Play against AI opponents, drill preflop ranges, quiz yourself on spots, and run equity calculations. Built with Next.js, React, and socket.io.

## Features

- **Play** (`/play`): heads-up or multiway against AI with a turn timer, hand history, and an optional AI coach that grades each decision.
- **Range Academy** (`/ranges`): explore, drill, and learn preflop opening ranges by position on a hand matrix with a scorecard.
- **Quiz** (`/quiz`): scenario-based decision quiz.
- **Equity** (`/equity`): Monte Carlo equity calculator for Hold'em and PLO.
- **History** (`/history`): replay past hands.
- **Multiplayer** (`/multiplayer`): room-based play over websockets with reconnect recovery.

## Running locally

```bash
npm install
npm run dev:server     # Next.js + socket.io on http://localhost:3000
```

`npm run dev` starts Next.js alone without the socket server (no multiplayer). `npm run dev:clean` is a self-healing start that clears the `.next` cache and restarts if the dev build corrupts.

## Environment

| Variable | Needed for |
| --- | --- |
| `ANTHROPIC_API_KEY` | The AI coach (`/api/coach`). Everything else works without it. |
| `PORT` | Server port, defaults to 3000. |
| `COACH_FEED_ENABLED` | Set to `1` to allow the local coaching feed (`/api/coach-feed`) in a production build. Off by default. |

## Tests

```bash
npm test               # Vitest unit tests: evaluators, betting, game state, side pots, equity, RNG
npm run test:e2e       # Playwright: builds and serves on :3100, then runs the browser suite
npm run test:e2e:prod  # same browser suite against the live Railway deploy
```

The Playwright suite runs every test on a desktop and a mobile viewport. It covers:

- **Smoke:** every route renders, home cards and bottom nav navigate.
- **Play vs AI:** deterministic hands via `/play?seed=N`. Checking down to a known showdown, losing to a named hand, folding to a turn bet, replaying the same seed, and the coach panel with a mocked coach API.
- **Equity:** AA vs KK in Hold'em and AAKK double-suited vs JT98 in PLO, asserted as ranges because the calculator is Monte Carlo.
- **Range Academy:** explore detail sheet, mode switching, and grading a drill.
- **Multiplayer:** two browser contexts join a room by code, chat, and ready up.
- **API:** the dev-only coach feed is closed in production.

Each test fails on any uncaught page error. Locators are role and text based, with `data-testid` only where there is no accessible name. CI runs lint, Vitest, and Playwright on every push and pull request, and uploads the HTML report and traces when a test fails.

**Deterministic play.** `?seed=<int>` on `/play` swaps the engine's random source for a seeded generator, so the deck and AI decisions replay exactly. It only affects that browser tab. The multiplayer server never seeds, so real games keep a cryptographic shuffle.

**Known bug.** The equity calculator's Clear button leaves the previous results on screen. Its test is marked `test.fail` until that's fixed.

## Deploy

The repo includes a `Procfile` and `nixpacks.toml` for Railway. Any host that runs `npm run build` then `npm start` will work.
