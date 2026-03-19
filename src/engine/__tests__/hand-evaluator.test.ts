import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../hand-evaluator';
import { parseCards } from '../card';

// Helper: evaluate a hand string like "AhKhQhJhTh"
function evalHand(str: string) {
  return evaluateHand(parseCards(str));
}

describe('hand evaluator', () => {
  describe('hand categories', () => {
    it('identifies royal flush', () => {
      const result = evalHand('AhKhQhJhTh');
      expect(result.rank).toBe(1);
      expect(result.category).toBe('royal-flush');
    });

    it('identifies straight flush (K-high)', () => {
      const result = evalHand('KhQhJhTh9h');
      expect(result.rank).toBe(2);
      expect(result.category).toBe('straight-flush');
    });

    it('identifies straight flush (5-high wheel)', () => {
      const result = evalHand('5h4h3h2hAh');
      expect(result.rank).toBe(10);
      expect(result.category).toBe('straight-flush');
    });

    it('identifies four of a kind', () => {
      const result = evalHand('AhAdAcAsKh');
      expect(result.rank).toBeGreaterThanOrEqual(11);
      expect(result.rank).toBeLessThanOrEqual(166);
      expect(result.category).toBe('four-of-a-kind');
    });

    it('identifies full house', () => {
      const result = evalHand('AhAdAcKhKd');
      expect(result.rank).toBeGreaterThanOrEqual(167);
      expect(result.rank).toBeLessThanOrEqual(322);
      expect(result.category).toBe('full-house');
    });

    it('identifies flush', () => {
      const result = evalHand('AhKh9h7h2h');
      expect(result.rank).toBeGreaterThanOrEqual(323);
      expect(result.rank).toBeLessThanOrEqual(1599);
      expect(result.category).toBe('flush');
    });

    it('identifies straight', () => {
      const result = evalHand('AhKdQcJhTs');
      expect(result.rank).toBeGreaterThanOrEqual(1600);
      expect(result.rank).toBeLessThanOrEqual(1609);
      expect(result.category).toBe('straight');
    });

    it('identifies wheel straight (A-5)', () => {
      const result = evalHand('5h4d3c2hAs');
      expect(result.rank).toBe(1609); // worst straight (5-high)
      expect(result.category).toBe('straight');
    });

    it('identifies three of a kind', () => {
      const result = evalHand('AhAdAcKhQd');
      expect(result.rank).toBeGreaterThanOrEqual(1610);
      expect(result.rank).toBeLessThanOrEqual(2467);
      expect(result.category).toBe('three-of-a-kind');
    });

    it('identifies two pair', () => {
      const result = evalHand('AhAdKhKdQc');
      expect(result.rank).toBeGreaterThanOrEqual(2468);
      expect(result.rank).toBeLessThanOrEqual(3325);
      expect(result.category).toBe('two-pair');
    });

    it('identifies one pair', () => {
      const result = evalHand('AhAdKhQdJc');
      expect(result.rank).toBeGreaterThanOrEqual(3326);
      expect(result.rank).toBeLessThanOrEqual(6185);
      expect(result.category).toBe('one-pair');
    });

    it('identifies high card', () => {
      const result = evalHand('AhKd9c7h2s');
      expect(result.rank).toBeGreaterThanOrEqual(6186);
      expect(result.rank).toBeLessThanOrEqual(7462);
      expect(result.category).toBe('high-card');
    });
  });

  describe('hand ordering', () => {
    it('royal flush beats straight flush', () => {
      const royal = evalHand('AhKhQhJhTh');
      const sf = evalHand('KsQsJsTs9s');
      expect(royal.rank).toBeLessThan(sf.rank);
    });

    it('straight flush beats four of a kind', () => {
      const sf = evalHand('9h8h7h6h5h');
      const quads = evalHand('AhAdAcAsKh');
      expect(sf.rank).toBeLessThan(quads.rank);
    });

    it('four of a kind beats full house', () => {
      const quads = evalHand('2h2d2c2sAh');
      const fh = evalHand('AhAdAcKhKd');
      expect(quads.rank).toBeLessThan(fh.rank);
    });

    it('full house beats flush', () => {
      const fh = evalHand('2h2d2cAhAd');
      const flush = evalHand('AhKh9h7h2h');
      expect(fh.rank).toBeLessThan(flush.rank);
    });

    it('flush beats straight', () => {
      const flush = evalHand('Ah9h7h4h2h');
      const straight = evalHand('AhKdQcJhTs');
      expect(flush.rank).toBeLessThan(straight.rank);
    });

    it('straight beats three of a kind', () => {
      const straight = evalHand('5h4d3c2hAs');
      const trips = evalHand('AhAdAcKhQd');
      expect(straight.rank).toBeLessThan(trips.rank);
    });

    it('three of a kind beats two pair', () => {
      const trips = evalHand('2h2d2c4h5s');
      const twoPair = evalHand('AhAdKhKdQc');
      expect(trips.rank).toBeLessThan(twoPair.rank);
    });

    it('two pair beats one pair', () => {
      const twoPair = evalHand('2h2d3h3dAc');
      const onePair = evalHand('AhAdKhQdJc');
      expect(twoPair.rank).toBeLessThan(onePair.rank);
    });

    it('one pair beats high card', () => {
      const onePair = evalHand('2h2dAcKhQs');
      const highCard = evalHand('AhKd9c7h2s');
      expect(onePair.rank).toBeLessThan(highCard.rank);
    });
  });

  describe('kicker ordering', () => {
    it('higher four of a kind beats lower', () => {
      const aaaa = evalHand('AhAdAcAs2h');
      const kkkk = evalHand('KhKdKcKsAh');
      expect(aaaa.rank).toBeLessThan(kkkk.rank);
    });

    it('same quads, higher kicker wins', () => {
      const aaaaK = evalHand('AhAdAcAsKh');
      const aaaaQ = evalHand('AhAdAcAsQh');
      expect(aaaaK.rank).toBeLessThan(aaaaQ.rank);
    });

    it('higher full house trips wins', () => {
      const aaakk = evalHand('AhAdAcKhKd');
      const kkkaa = evalHand('KhKdKcAhAd');
      expect(aaakk.rank).toBeLessThan(kkkaa.rank);
    });

    it('higher flush cards win', () => {
      const akq = evalHand('AhKhQh9h2h');
      const akj = evalHand('AhKhJh9h2h');
      expect(akq.rank).toBeLessThan(akj.rank);
    });

    it('higher straight wins', () => {
      const aceHigh = evalHand('AhKdQcJhTs');
      const kingHigh = evalHand('KhQdJcTh9s');
      expect(aceHigh.rank).toBeLessThan(kingHigh.rank);
    });

    it('higher two pair wins', () => {
      const aakk = evalHand('AhAdKhKdQc');
      const aaqq = evalHand('AhAdQhQdKc');
      expect(aakk.rank).toBeLessThan(aaqq.rank);
    });

    it('same two pair, higher kicker wins', () => {
      const aakkQ = evalHand('AhAdKhKdQc');
      const aakkJ = evalHand('AhAdKhKdJc');
      expect(aakkQ.rank).toBeLessThan(aakkJ.rank);
    });

    it('higher pair wins', () => {
      const aa = evalHand('AhAdKhQdJc');
      const kk = evalHand('KhKdAhQdJc');
      expect(aa.rank).toBeLessThan(kk.rank);
    });

    it('same pair, higher kickers win', () => {
      const aaKQJ = evalHand('AhAdKhQdJc');
      const aaKQT = evalHand('AhAdKhQdTc');
      expect(aaKQJ.rank).toBeLessThan(aaKQT.rank);
    });

    it('higher high card wins', () => {
      const ak = evalHand('AhKd9c7h3s');
      const aq = evalHand('AhQd9c7h3s');
      expect(ak.rank).toBeLessThan(aq.rank);
    });
  });

  describe('7-card hands (Hold\'em)', () => {
    it('finds best 5 from 7 cards', () => {
      // Has a flush in hearts: Ah Kh 9h 7h 2h, plus two non-heart cards
      const result = evaluateHand(parseCards('AhKh9h7h2hTdJs'));
      expect(result.category).toBe('flush');
    });

    it('finds straight in 7 cards', () => {
      const result = evaluateHand(parseCards('AhKdQcJhTs2h3d'));
      expect(result.category).toBe('straight');
    });

    it('finds full house in 7 cards', () => {
      const result = evaluateHand(parseCards('AhAdAcKhKd2s3c'));
      expect(result.category).toBe('full-house');
    });
  });

  describe('6-card hands', () => {
    it('finds best 5 from 6 cards', () => {
      const result = evaluateHand(parseCards('AhKhQhJhTh2d'));
      expect(result.category).toBe('royal-flush');
    });
  });

  describe('edge cases', () => {
    it('throws for fewer than 5 cards', () => {
      expect(() => evaluateHand(parseCards('AhKhQh'))).toThrow();
    });

    it('throws for more than 7 cards', () => {
      expect(() => evaluateHand(parseCards('AhKhQhJhTh9h8h2d'))).toThrow();
    });
  });

  describe('compareHands', () => {
    it('returns negative when first hand is better', () => {
      const a = evalHand('AhKhQhJhTh'); // royal flush
      const b = evalHand('AhKd9c7h2s'); // high card
      expect(compareHands(a, b)).toBeLessThan(0);
    });

    it('returns 0 for equal hands', () => {
      const a = evalHand('AhKdQcJhTs'); // A-high straight
      const b = evalHand('AsKcQdJsTh'); // A-high straight (different suits)
      expect(compareHands(a, b)).toBe(0);
    });
  });

  describe('rank uniqueness', () => {
    it('total unique ranks equals 7462', () => {
      // Verify the evaluator can produce ranks from 1 to 7462
      // by testing boundary hands
      const best = evalHand('AhKhQhJhTh');
      expect(best.rank).toBe(1);

      // Worst possible high card: 7-5-4-3-2 (not suited, not straight)
      const worst = evalHand('7h5d4c3s2h');
      expect(worst.rank).toBe(7462);
    });
  });
});
