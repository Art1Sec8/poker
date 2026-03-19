import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, newShuffledDeck, dealCards, removeCards } from '../deck';

describe('deck', () => {
  it('creates a 52-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(Math.min(...deck)).toBe(0);
    expect(Math.max(...deck)).toBe(51);
  });

  it('shuffles deck (result differs from sorted)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck([...deck]);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled).size).toBe(52);
    // Extremely unlikely to remain sorted
    const isSorted = shuffled.every((v, i) => v === i);
    expect(isSorted).toBe(false);
  });

  it('creates a fresh shuffled deck', () => {
    const deck = newShuffledDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
  });

  it('deals cards from the top', () => {
    const deck = createDeck();
    const dealt = dealCards(deck, 5);
    expect(dealt).toHaveLength(5);
    expect(deck).toHaveLength(47);
    expect(dealt).toEqual([0, 1, 2, 3, 4]);
  });

  it('throws when dealing more cards than available', () => {
    const deck = createDeck();
    expect(() => dealCards(deck, 53)).toThrow();
  });

  it('throws on negative deal count', () => {
    const deck = createDeck();
    expect(() => dealCards(deck, -1)).toThrow();
  });

  it('deals 0 cards', () => {
    const deck = createDeck();
    const dealt = dealCards(deck, 0);
    expect(dealt).toHaveLength(0);
    expect(deck).toHaveLength(52);
  });

  it('removes specific cards', () => {
    const deck = createDeck();
    const filtered = removeCards(deck, [0, 1, 2]);
    expect(filtered).toHaveLength(49);
    expect(filtered).not.toContain(0);
    expect(filtered).not.toContain(1);
    expect(filtered).not.toContain(2);
  });
});
