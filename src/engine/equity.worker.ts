// Web Worker for equity calculation — runs Monte Carlo off the main thread
import { calculateEquity } from './equity-calculator';
import { Card, GameVariant } from './types';

interface WorkerMessage {
  hands: Card[][];
  board: Card[];
  variant: GameVariant;
  iterations: number;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { hands, board, variant, iterations } = e.data;

  // Run in chunks and post progressive results
  const chunkSize = Math.min(2000, iterations);
  const totalChunks = Math.ceil(iterations / chunkSize);

  const totalWins = new Array(hands.length).fill(0);
  const totalTies = new Array(hands.length).fill(0);
  let totalSamples = 0;

  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const thisChunk = Math.min(chunkSize, iterations - totalSamples);
    const result = calculateEquity(hands, board, variant, thisChunk);

    for (let i = 0; i < hands.length; i++) {
      totalWins[i] += result.wins[i];
      totalTies[i] += result.ties[i];
    }
    totalSamples += result.samples;

    const equities = hands.map((_, i) =>
      (totalWins[i] + totalTies[i] / 2) / totalSamples
    );

    self.postMessage({
      equities,
      wins: totalWins.slice(),
      ties: totalTies.slice(),
      samples: totalSamples,
      isComplete: chunk === totalChunks - 1,
    });
  }
};
