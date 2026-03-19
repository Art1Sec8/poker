import { Card } from './types';

/**
 * Create a standard 52-card deck (cards 0-51).
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 52; i++) {
    deck.push(i);
  }
  return deck;
}

/**
 * Fisher-Yates shuffle. Mutates and returns the array.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Create a fresh shuffled deck.
 */
export function newShuffledDeck(): Card[] {
  return shuffleDeck(createDeck());
}

/**
 * Deal n cards from the top of the deck. Mutates the deck.
 */
export function dealCards(deck: Card[], n: number): Card[] {
  if (deck.length < n) throw new Error(`Cannot deal ${n} cards from deck of ${deck.length}`);
  return deck.splice(0, n);
}

/**
 * Remove specific cards from the deck. Returns a new array.
 */
export function removeCards(deck: Card[], cards: Card[]): Card[] {
  const removeSet = new Set(cards);
  return deck.filter(c => !removeSet.has(c));
}
