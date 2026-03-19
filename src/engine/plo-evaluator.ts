import { Card, HandRankResult } from './types';
import { evaluateHand } from './hand-evaluator';

/**
 * Evaluate a PLO hand: must use exactly 2 of 4 hole cards + exactly 3 of 5 board cards.
 * Tests all C(4,2) * C(5,3) = 6 * 10 = 60 combinations.
 * Returns the best (lowest rank) hand.
 */
export function evaluatePloHand(holeCards: Card[], board: Card[]): HandRankResult {
  if (holeCards.length !== 4) throw new Error(`PLO requires 4 hole cards, got ${holeCards.length}`);
  if (board.length < 3 || board.length > 5) throw new Error(`Board must have 3-5 cards, got ${board.length}`);

  let bestResult: HandRankResult | null = null;

  // All 2-card combos from hole cards: C(4,2) = 6
  const holeCombos = getCombos(holeCards, 2);

  // All 3-card combos from board: C(n,3)
  const boardCombos = getCombos(board, 3);

  for (const holeCombo of holeCombos) {
    for (const boardCombo of boardCombos) {
      const fiveCards = [...holeCombo, ...boardCombo];
      const result = evaluateHand(fiveCards);
      if (!bestResult || result.rank < bestResult.rank) {
        bestResult = result;
      }
    }
  }

  return bestResult!;
}

function getCombos<T>(arr: T[], k: number): T[][] {
  const results: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return results;
}
