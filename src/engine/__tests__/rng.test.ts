import { describe, it, expect, afterEach } from 'vitest';
import { seedRandom, isSeeded, random, randomInt } from '../rng';
import { newShuffledDeck } from '../deck';

afterEach(() => seedRandom(null));

describe('rng', () => {
  it('is unseeded by default', () => {
    expect(isSeeded()).toBe(false);
  });

  it('replays the same deck for the same seed', () => {
    seedRandom(42);
    const a = newShuffledDeck();
    seedRandom(42);
    const b = newShuffledDeck();
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(52);
  });

  it('gives different decks for different seeds', () => {
    seedRandom(1);
    const a = newShuffledDeck();
    seedRandom(2);
    const b = newShuffledDeck();
    expect(a).not.toEqual(b);
  });

  it('keeps seeded values in range', () => {
    seedRandom(7);
    for (let i = 0; i < 1000; i++) {
      const f = random();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = randomInt(13);
      expect(Number.isInteger(n) && n >= 0 && n < 13).toBe(true);
    }
  });

  it('returns to true randomness when cleared', () => {
    seedRandom(42);
    seedRandom(null);
    expect(isSeeded()).toBe(false);
    expect(newShuffledDeck()).not.toEqual((seedRandom(42), newShuffledDeck()));
  });
});
