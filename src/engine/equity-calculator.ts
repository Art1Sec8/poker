import { Card, EquityResult, GameVariant } from './types';
import { evaluateHand } from './hand-evaluator';
import { evaluatePloHand } from './plo-evaluator';
import { createDeck, removeCards } from './deck';
import { validateCards, validateBoard } from './validation';

/**
 * Monte Carlo equity calculator.
 * Uses partial Fisher-Yates shuffle for performance:
 * only shuffles the first `cardsNeeded` positions per iteration
 * instead of copying and fully shuffling the entire deck.
 */
export function calculateEquity(
  hands: Card[][],
  board: Card[],
  variant: GameVariant,
  iterations: number = 10000,
): EquityResult {
  if (hands.length === 0) throw new Error('At least one hand is required');
  if (iterations <= 0) throw new Error('Iterations must be positive');

  // Validate inputs
  const allCards = [...board, ...hands.flat()];
  validateCards(allCards, 'equity input');
  validateBoard(board, hands.flat());

  const numPlayers = hands.length;
  const wins = new Array(numPlayers).fill(0);
  const ties = new Array(numPlayers).fill(0);
  let samples = 0;

  const deadCards = [...board, ...hands.flat()];
  const remainingDeck = removeCards(createDeck(), deadCards);
  const cardsNeeded = 5 - board.length;

  if (cardsNeeded === 0) {
    // Board is complete — single evaluation, no Monte Carlo needed
    return evaluateOnce(hands, board, variant);
  }

  // Partial Fisher-Yates: shuffle only first `cardsNeeded` positions in-place
  const deck = [...remainingDeck];
  for (let iter = 0; iter < iterations; iter++) {
    // Partial shuffle: pick `cardsNeeded` random cards from the deck
    for (let i = 0; i < cardsNeeded; i++) {
      const j = i + Math.floor(Math.random() * (deck.length - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const runout = [...board, ...deck.slice(0, cardsNeeded)];

    // Evaluate each player's hand
    const ranks = hands.map(hand => {
      if (variant === 'plo') {
        return evaluatePloHand(hand, runout).rank;
      }
      return evaluateHand([...hand, ...runout]).rank;
    });

    const bestRank = Math.min(...ranks);
    const winners: number[] = [];
    for (let i = 0; i < numPlayers; i++) {
      if (ranks[i] === bestRank) winners.push(i);
    }

    if (winners.length === 1) {
      wins[winners[0]]++;
    } else {
      for (const w of winners) ties[w]++;
    }

    samples++;
  }

  const equities = hands.map((_, i) => (wins[i] + ties[i] / 2) / samples);

  return { equities, wins, ties, samples, isComplete: true };
}

/**
 * Single evaluation when the board is complete (no Monte Carlo needed).
 */
function evaluateOnce(hands: Card[][], board: Card[], variant: GameVariant): EquityResult {
  const numPlayers = hands.length;
  const wins = new Array(numPlayers).fill(0);
  const ties = new Array(numPlayers).fill(0);

  const ranks = hands.map(hand => {
    if (variant === 'plo') return evaluatePloHand(hand, board).rank;
    return evaluateHand([...hand, ...board]).rank;
  });

  const bestRank = Math.min(...ranks);
  const winners: number[] = [];
  for (let i = 0; i < numPlayers; i++) {
    if (ranks[i] === bestRank) winners.push(i);
  }

  if (winners.length === 1) {
    wins[winners[0]] = 1;
  } else {
    for (const w of winners) ties[w] = 1;
  }

  const equities = hands.map((_, i) => (wins[i] + ties[i] / 2));
  return { equities, wins, ties, samples: 1, isComplete: true };
}
