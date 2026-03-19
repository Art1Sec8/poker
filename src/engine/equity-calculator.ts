import { Card, EquityResult, GameVariant } from './types';
import { evaluateHand } from './hand-evaluator';
import { evaluatePloHand } from './plo-evaluator';
import { createDeck, removeCards, shuffleDeck } from './deck';

/**
 * Monte Carlo equity calculator.
 * Simulates random runouts and compares hand strengths.
 */
export function calculateEquity(
  hands: Card[][],
  board: Card[],
  variant: GameVariant,
  iterations: number = 10000,
): EquityResult {
  const numPlayers = hands.length;
  const wins = new Array(numPlayers).fill(0);
  const ties = new Array(numPlayers).fill(0);
  let samples = 0;

  // Cards already dealt
  const deadCards = [...board, ...hands.flat()];
  const remainingDeck = removeCards(createDeck(), deadCards);
  const cardsNeeded = 5 - board.length;

  for (let i = 0; i < iterations; i++) {
    // Shuffle remaining deck and draw cards to complete the board
    const shuffled = shuffleDeck([...remainingDeck]);
    const runout = [...board, ...shuffled.slice(0, cardsNeeded)];

    // Evaluate each player's hand
    const ranks = hands.map(hand => {
      if (variant === 'plo') {
        return evaluatePloHand(hand, runout).rank;
      } else {
        return evaluateHand([...hand, ...runout]).rank;
      }
    });

    // Find the best (lowest) rank
    const bestRank = Math.min(...ranks);

    // Count winners
    const winners = ranks.reduce((acc, r, idx) => {
      if (r === bestRank) acc.push(idx);
      return acc;
    }, [] as number[]);

    if (winners.length === 1) {
      wins[winners[0]]++;
    } else {
      for (const w of winners) {
        ties[w]++;
      }
    }

    samples++;
  }

  const equities = hands.map((_, i) => (wins[i] + ties[i] / 2) / samples);

  return {
    equities,
    wins,
    ties,
    samples,
    isComplete: true,
  };
}
