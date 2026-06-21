// Local grading — pure set math, no API required.

export interface GradeResult {
  /** selected ∩ reference — painted correctly (green). */
  correct: string[];
  /** selected − reference — painted but shouldn't be (red). */
  tooLoose: string[];
  /** reference − selected — should be painted but isn't (gold). */
  missed: string[];
  /** Size of the reference range. */
  total: number;
}

/**
 * Compare the player's selected hands against the scenario's reference range.
 * Both inputs are expected to be canonical hand strings.
 */
export function grade(selected: Iterable<string>, reference: Iterable<string>): GradeResult {
  const sel = new Set(selected);
  const ref = new Set(reference);

  const correct: string[] = [];
  const tooLoose: string[] = [];
  for (const h of sel) {
    if (ref.has(h)) correct.push(h);
    else tooLoose.push(h);
  }

  const missed: string[] = [];
  for (const h of ref) {
    if (!sel.has(h)) missed.push(h);
  }

  return { correct, tooLoose, missed, total: ref.size };
}

/** A short tally line, e.g. "matched 18/24 · 4 too loose · 6 missed". */
export function tallyText(g: GradeResult): string {
  return `matched ${g.correct.length}/${g.total} · ${g.tooLoose.length} too loose · ${g.missed.length} missed`;
}
