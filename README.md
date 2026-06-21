# Poker Trainer

A Next.js (App Router) + React + TypeScript + Tailwind poker‑training app. Alongside the
quiz, play‑vs‑AI, equity, and multiplayer tools, it includes the **Hold'em Range Trainer**.

## Range Trainer

Train No‑Limit Hold'em **range intuition**:

1. Pick a focus (**Preflop** or **Flop**) and **Deal a spot** — positions, stack depth, the
   action so far, and exactly whose range to build.
2. **Paint** the range onto the 13×13 hand grid (tap to toggle, click‑drag to paint a region).
3. **Check my range** — the grid lights up with a color diff (green = correct, red = too loose,
   gold = missed) and an AI coach explains *why*, in terms of position, board texture,
   blockers/combos, and equity.
4. Ask **follow‑up questions** about that exact spot ("why is A5s in but A9o out?").
5. **Walk me through it** builds the range from scratch and reveals it on the grid.

Grading is pure set math and runs locally (no API needed). The Anthropic API is called **only**
from the server‑side route handler at `src/app/api/range-coach/route.ts`; the API key is read from
`ANTHROPIC_API_KEY` and **never reaches the browser**.

> Note on the route path: the codebase already ships a different coach at `/api/coach` (the
> play‑vs‑AI hand coach), so the Range Trainer uses `/api/range-coach` to avoid clobbering it.
> The security architecture is identical — server‑side only, key never sent to the client.

## Install & run

```bash
npm install
npm run dev      # http://localhost:3000  →  open /trainer
```

Other scripts: `npm run build` (production build), `npm test` (Vitest), `npm run lint`.

## Anthropic API key (optional but recommended)

The Range Trainer works **with or without** a key:

- **Without a key** — Deal / paint / check / grade all work using ~10 built‑in spots, and the
  coach panel shows that spot's written key ideas. (Live follow‑up Q&A shows a notice.)
- **With a key** — live AI scenario generation, graded feedback, walkthroughs, and follow‑up Q&A.

To add a key:

1. Get one from the **Anthropic Console** → <https://console.anthropic.com/> → *API Keys*.
2. Create a file named `.env.local` in the project root:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Restart the dev server (`npm run dev`). `.env.local` is git‑ignored, so the key stays local.

The model is defined as a single constant `MODEL = "claude-sonnet-4-6"` in
`src/app/api/range-coach/route.ts` — swap it there for a faster/cheaper model anytime.

## How the grid is built

Rank order (rows and columns): `A K Q J T 9 8 7 6 5 4 3 2`. For cell `(i, j)`:

- `i === j` → **pair** (diagonal), e.g. `AA`, `77`, `22`.
- `i < j` → **suited** (upper‑right), higher card first + `s`, e.g. `AKs`, `T9s`.
- `i > j` → **offsuit** (lower‑left), higher card first + `o`, e.g. `AKo`, `A5o`.

So `AKs` sits one cell to the right of the `AK` diagonal, and `AKo` one cell below it. The grid
logic, `normalizeHand` canonicalizer, and grading live in `src/lib/range-trainer/` and are covered
by tests (`npm test`).
