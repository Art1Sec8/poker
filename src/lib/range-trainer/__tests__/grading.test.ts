import { describe, it, expect } from 'vitest';
import { grade, tallyText } from '../grading';

describe('grade', () => {
  it('splits selected into correct / tooLoose and finds missed', () => {
    const reference = ['AA', 'KK', 'QQ', 'AKs'];
    const selected = ['AA', 'KK', 'JJ']; // JJ is too loose, QQ + AKs missed
    const g = grade(selected, reference);
    expect(new Set(g.correct)).toEqual(new Set(['AA', 'KK']));
    expect(g.tooLoose).toEqual(['JJ']);
    expect(new Set(g.missed)).toEqual(new Set(['QQ', 'AKs']));
    expect(g.total).toBe(4);
  });

  it('handles an empty selection', () => {
    const g = grade([], ['AA', 'KK']);
    expect(g.correct).toEqual([]);
    expect(g.tooLoose).toEqual([]);
    expect(new Set(g.missed)).toEqual(new Set(['AA', 'KK']));
  });

  it('handles a perfect selection', () => {
    const g = grade(['AA', 'KK'], ['AA', 'KK']);
    expect(g.correct.length).toBe(2);
    expect(g.tooLoose).toEqual([]);
    expect(g.missed).toEqual([]);
  });

  it('formats a tally line', () => {
    const g = grade(['AA', 'KK', 'JJ'], ['AA', 'KK', 'QQ', 'AKs']);
    expect(tallyText(g)).toBe('matched 2/4 · 1 too loose · 2 missed');
  });
});
