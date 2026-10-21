// ============================================================
// Preflop range NOTATION parser
// ------------------------------------------------------------
// Turns standard hand-range notation strings (e.g. "22+, ATs+,
// KQo, A5s-A4s") into the app's 13x13 frequency matrix.
//
// Grid encoding (matches getRangeLabel in ranges.ts exactly):
//   RANK_LABELS index 0 = A (highest) ... 12 = 2 (lowest)
//   suited  high H low L -> matrix[idx(H)][idx(L)]  (row < col)
//   offsuit high H low L -> matrix[idx(L)][idx(H)]  (row > col)
//   pair                 -> matrix[i][i]
// ============================================================

export const RANK_LABELS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

/** Matrix index for a rank character. A -> 0, K -> 1, ... 2 -> 12. */
export function rankIdx(ch: string): number {
  return RANK_LABELS.indexOf(ch.toUpperCase() as (typeof RANK_LABELS)[number]);
}

function zeros(): number[][] {
  return Array.from({ length: 13 }, () => Array(13).fill(0));
}

type AtomType = 'pair' | 'suited' | 'offsuit';
interface Atom {
  type: AtomType;
  /** higher-rank index (lower number) — also the pair index for pairs */
  hi: number;
  /** lower-rank index (higher number) — unused for pairs */
  lo: number;
}

/** Parse a bare atom like "ATs", "K9o" or "22" (no +/- suffix). */
function parseAtom(atom: string): Atom {
  const a = atom.trim();
  // Pairs are two identical rank chars with no suit suffix ("22", "TT").
  if (a.length === 2) {
    return { type: 'pair', hi: rankIdx(a[0]), lo: rankIdx(a[1]) };
  }
  // Suited / offsuit: "HLs" / "HLo".
  const i1 = rankIdx(a[0]);
  const i2 = rankIdx(a[1]);
  const suit = a[2].toLowerCase();
  const hi = Math.min(i1, i2); // lower index = higher rank
  const lo = Math.max(i1, i2);
  return { type: suit === 's' ? 'suited' : 'offsuit', hi, lo };
}

/** Map a (type, hiIdx, loIdx) triple to its [row, col] cell. */
function cellFor(type: AtomType, hi: number, lo: number): [number, number] {
  if (type === 'suited') return [hi, lo]; // row < col
  return [lo, hi]; // offsuit: row > col
}

/** Expand a single token (e.g. "ATs+", "TT-77", "K9o") into its cells. */
function tokenCells(rawToken: string): Array<[number, number]> {
  const token = rawToken.trim();
  const cells: Array<[number, number]> = [];
  if (!token) return cells;

  // Span: "A5s-A4s" / "TT-77".
  if (token.includes('-')) {
    const [aStr, bStr] = token.split('-').map((s) => s.trim());
    const a = parseAtom(aStr);
    const b = parseAtom(bStr);
    if (a.type === 'pair') {
      const lo = Math.min(a.hi, b.hi);
      const hi = Math.max(a.hi, b.hi);
      for (let i = lo; i <= hi; i++) cells.push([i, i]);
    } else {
      // Fix the high card, vary the low card between the two endpoints.
      const lo = Math.min(a.lo, b.lo);
      const hi = Math.max(a.lo, b.lo);
      for (let l = lo; l <= hi; l++) cells.push(cellFor(a.type, a.hi, l));
    }
    return cells;
  }

  const plus = token.endsWith('+');
  const atom = plus ? token.slice(0, -1) : token;
  const p = parseAtom(atom);

  if (p.type === 'pair') {
    if (plus) {
      // All pairs from this rank up to A (index 0).
      for (let i = 0; i <= p.hi; i++) cells.push([i, i]);
    } else {
      cells.push([p.hi, p.hi]);
    }
    return cells;
  }

  // Suited / offsuit.
  if (plus) {
    // Fix the high card, raise the low card toward it: from idx(L) up to idx(H)+1.
    for (let l = p.lo; l >= p.hi + 1; l--) cells.push(cellFor(p.type, p.hi, l));
  } else {
    cells.push(cellFor(p.type, p.hi, p.lo));
  }
  return cells;
}

/**
 * Parse a comma-separated range notation string into a fresh 13x13 matrix
 * with 1.0 in every matched cell, 0.0 elsewhere.
 */
export function parseRangeNotation(notation: string): number[][] {
  const m = zeros();
  for (const token of notation.split(',')) {
    for (const [r, c] of tokenCells(token)) {
      if (r >= 0 && r < 13 && c >= 0 && c < 13) m[r][c] = 1.0;
    }
  }
  return m;
}

/**
 * Build a range matrix: parse `core` at 1.0, then overwrite any cell named in
 * `mixedNotation` with 0.5 (a mixed / coin-flip frequency). Cells in neither
 * stay 0.0.
 */
export function buildRange(coreNotation: string, mixedNotation?: string): number[][] {
  const m = parseRangeNotation(coreNotation);
  if (mixedNotation) {
    const mixed = parseRangeNotation(mixedNotation);
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        if (mixed[r][c] > 0) m[r][c] = 0.5;
      }
    }
  }
  return m;
}
