import { describe, it, expect } from 'vitest';
import { evaluatePloHand } from '../plo-evaluator';
import { parseCards } from '../card';

describe('PLO evaluator', () => {
  it('uses exactly 2 hole cards + 3 board cards', () => {
    // Hole: AhKhQdJd, Board: ThKdQc2s3s
    // Best hand should use 2 from hole + 3 from board
    const hole = parseCards('AhKhQdJd');
    const board = parseCards('Th9d8c2s3s');
    const result = evaluatePloHand(hole, board);
    // A-K-Q-J-T straight using Ah+Jd from hole + Th+9d+8c from board? No.
    // Actually: best is Q-J-T-9-8 straight using Qd+Jd from hole + Th+9d+8c from board
    expect(result.category).toBe('straight');
  });

  it('cannot use 3 hole cards even if it makes a better hand', () => {
    // Hole: AhKhQhJh — 3 hearts in hole
    // Board: Th2h3s4s5s — 1 heart on board
    // In Hold'em this would be a flush (AhKhQhJh+2h), but PLO requires exactly 2 hole cards
    // With 2 hole hearts + 1 board heart = only 3 hearts, not a flush
    const hole = parseCards('AhKhQhJh');
    const board = parseCards('Th2h3s4s5s');
    const result = evaluatePloHand(hole, board);
    // Can't make a flush (need 3 hearts on board for 2 hole hearts)
    expect(result.category).not.toBe('flush');
  });

  it('finds the best combination from 60 possibilities', () => {
    // Hole: AhAdKhKd, Board: AcKc2s3s4s
    // Best: full house AAA-KK using AhAd from hole + AcKc2s from board? No.
    // Best: AAA with K kicker = three of a kind? No — can use AhAd + AcKc = full house AxAyAc + KcKh/Kd
    // Wait: with Ah,Ad from hole + Ac,Kc,2s from board = Ah,Ad,Ac,Kc,2s = trips with kickers
    // With Ah,Kh from hole + Ac,Kc,2s from board = Ah,Kh,Ac,Kc,2s = two pair AA KK
    // With Ah,Kd from hole + Ac,Kc,2s from board = Ah,Kd,Ac,Kc,2s = two pair AA KK
    // With Ad,Kh from hole + Ac,Kc,2s from board = two pair
    // With Ad,Kd from hole + Ac,Kc,2s from board = two pair
    // With Kh,Kd from hole + Ac,Kc,2s from board = Kh,Kd,Ac,Kc,2s = trips KKK with A kicker
    // Actually best: Ah,Ad from hole + Ac,Kc,2s = three aces. But wait, we need to use EXACTLY 3 board cards.
    // Ah,Ad + Ac,Kc,2s = AhAdAcKc2s = three aces, K kicker = three of a kind
    // Kh,Kd + Ac,Kc,2s = KhKdKcAc2s = three kings, A kicker = three of a kind (worse than three aces)
    // So best is three aces
    const hole = parseCards('AhAdKhKd');
    const board = parseCards('AcKc2s');
    const result = evaluatePloHand(hole, board);
    expect(result.category).toBe('three-of-a-kind');
  });

  it('throws for wrong number of hole cards', () => {
    const hole = parseCards('AhKh');
    const board = parseCards('QhJhTh');
    expect(() => evaluatePloHand(hole, board)).toThrow('4 hole cards');
  });

  it('throws for wrong board size', () => {
    const hole = parseCards('AhKhQdJd');
    const board = parseCards('Th9d');
    expect(() => evaluatePloHand(hole, board)).toThrow('3-5 cards');
  });

  it('works with 4-card board (turn)', () => {
    const hole = parseCards('AhAdKhKd');
    const board = parseCards('AcKc2s3s');
    const result = evaluatePloHand(hole, board);
    expect(result.rank).toBeGreaterThan(0);
  });

  it('works with 5-card board (river)', () => {
    const hole = parseCards('AhAdKhKd');
    const board = parseCards('AcKc2s3s4s');
    const result = evaluatePloHand(hole, board);
    expect(result.rank).toBeGreaterThan(0);
  });
});
