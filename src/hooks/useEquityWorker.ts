'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, EquityResult, GameVariant } from '@/engine/types';
import { calculateEquity } from '@/engine/equity-calculator';

interface UseEquityWorkerReturn {
  result: EquityResult | null;
  isRunning: boolean;
  calculate: (hands: Card[][], board: Card[], variant: GameVariant, iterations?: number) => void;
  cancel: () => void;
}

export function useEquityWorker(): UseEquityWorkerReturn {
  const [result, setResult] = useState<EquityResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsRunning(false);
  }, []);

  const calculate = useCallback((hands: Card[][], board: Card[], variant: GameVariant, iterations = 20000) => {
    cancel();
    setIsRunning(true);
    setResult(null);

    // Try Web Worker, fall back to main thread
    try {
      const worker = new Worker(
        new URL('../engine/equity.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<EquityResult>) => {
        setResult(e.data);
        if (e.data.isComplete) {
          setIsRunning(false);
        }
      };

      worker.onerror = () => {
        // Fallback to main thread
        const fallbackResult = calculateEquity(hands, board, variant, iterations);
        setResult(fallbackResult);
        setIsRunning(false);
      };

      worker.postMessage({ hands, board, variant, iterations });
    } catch {
      // Workers not supported — run on main thread
      const fallbackResult = calculateEquity(hands, board, variant, iterations);
      setResult(fallbackResult);
      setIsRunning(false);
    }
  }, [cancel]);

  return { result, isRunning, calculate, cancel };
}
