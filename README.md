# Poker

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

## Tests

```bash
npm test
```

Engine tests cover the hand evaluator, betting rules, game state, side pots, and range notation.

## Deploy

The repo includes a `Procfile` and `nixpacks.toml` for Railway. Any host that runs `npm run build` then `npm start` will work.
