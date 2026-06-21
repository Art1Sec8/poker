// 13x13 Hold'em hand grid — canonical notation and helpers.
//
// Rank order is used for BOTH rows and columns. Index 0 is the strongest rank.
//   - cell (i, i)  -> a pair        (the diagonal),         e.g. "AA", "77", "22"
//   - cell (i, j<) -> suited        (upper-right triangle), e.g. "AKs", "T9s"
//   - cell (i, j>) -> offsuit       (lower-left triangle),  e.g. "AKo", "A5o"
//
// The higher rank is always listed first. "T" is used for ten.
// Sanity: AKs sits one cell to the RIGHT of the AK diagonal (upper triangle),
//         AKo sits one cell BELOW it (lower triangle).

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank = (typeof RANKS)[number];

const RANK_SET = new Set<string>(RANKS);

/** Strength index of a rank: 0 = A (strongest) ... 12 = 2 (weakest). */
export function rankIndex(r: string): number {
  return RANKS.indexOf(r as Rank);
}

export type Region = 'pair' | 'suited' | 'offsuit';

/** The region for the cell at row i, column j. */
export function regionAt(i: number, j: number): Region {
  if (i === j) return 'pair';
  return i < j ? 'suited' : 'offsuit';
}

/** The canonical hand string for the cell at row i, column j. */
export function handAt(i: number, j: number): string {
  if (i === j) return RANKS[i] + RANKS[i];
  // Lower index => higher rank, so the smaller of (i, j) is the higher card.
  const hi = RANKS[Math.min(i, j)];
  const lo = RANKS[Math.max(i, j)];
  return i < j ? `${hi}${lo}s` : `${hi}${lo}o`;
}

/** The two-character label shown in a cell (region encodes suited vs offsuit). */
export function labelAt(i: number, j: number): string {
  const hi = RANKS[Math.min(i, j)];
  const lo = RANKS[Math.max(i, j)];
  return hi + lo;
}

/** Number of card combinations for a canonical hand. */
export function comboCount(hand: string): number {
  if (hand.length === 2) return 6; // pair
  return hand.endsWith('s') ? 4 : 12; // suited : offsuit
}

/**
 * Fold any model-produced (or user-typed) string into canonical form:
 * uppercase ranks, higher rank first, an "s"/"o" suffix for non-pairs and
 * none for pairs. Returns null for anything that isn't a valid hand.
 */
export function normalizeHand(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toUpperCase().replace(/10/g, 'T').replace(/\s+/g, '');
  if (s.length < 2) return null;

  let suffix = '';
  const last = s[s.length - 1];
  if (last === 'S' || last === 'O') {
    suffix = last;
    s = s.slice(0, -1);
  }
  if (s.length !== 2) return null;

  const a = s[0];
  const b = s[1];
  if (!RANK_SET.has(a) || !RANK_SET.has(b)) return null;

  if (a === b) {
    // A pair cannot be "suited"; "AAs" is invalid. "AAo" folds to "AA".
    if (suffix === 'S') return null;
    return a + b;
  }

  // Non-pairs must declare suited/offsuit.
  if (suffix !== 'S' && suffix !== 'O') return null;
  const hi = rankIndex(a) < rankIndex(b) ? a : b;
  const lo = rankIndex(a) < rankIndex(b) ? b : a;
  return `${hi}${lo}${suffix.toLowerCase()}`;
}

/** Normalize a list of raw hands, dropping invalid entries and de-duplicating. */
export function normalizeRange(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const h of raw) {
    const n = normalizeHand(h);
    if (n) out.add(n);
  }
  return [...out];
}

/** Build the full 13x13 grid of canonical hand strings. */
export function buildGrid(): string[][] {
  return Array.from({ length: 13 }, (_, i) =>
    Array.from({ length: 13 }, (_, j) => handAt(i, j)),
  );
}
