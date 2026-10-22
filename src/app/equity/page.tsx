'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/engine/types';
import { cardToDisplay } from '@/engine/card';
import { useGame } from '@/context/GameContext';
import { useEquityWorker } from '@/hooks/useEquityWorker';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { CardPicker } from '@/components/shared/CardPicker';

export default function EquityPage() {
  const { variant } = useGame();
  const handSize = variant === 'plo' ? 4 : 2;

  const [hand1, setHand1] = useState<Card[]>([]);
  const [hand2, setHand2] = useState<Card[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const { result, isRunning, calculate, cancel } = useEquityWorker();

  const allUsed = [...hand1, ...hand2, ...board];
  const canCalculate = hand1.length === handSize && hand2.length === handSize && !isRunning;

  function handleCalculate() {
    if (!canCalculate) return;
    calculate([hand1, hand2], board, variant, 20000);
  }

  function handleClear() {
    cancel();
    setHand1([]);
    setHand2([]);
    setBoard([]);
  }

  return (
    <main className="min-h-screen pb-24 pt-6">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            Equity Calculator
          </h1>
          <GameVariantToggle />
        </div>

        {/* Hand 1 */}
        <div className="glass rounded-xl p-4 mb-3" data-testid="equity-hand-1">
          <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
            Hand 1 ({handSize} cards)
          </label>
          <CardPicker
            selectedCards={hand1}
            onSelect={c => hand1.length < handSize && setHand1([...hand1, c])}
            onRemove={c => setHand1(hand1.filter(x => x !== c))}
            disabledCards={[...hand2, ...board]}
            maxCards={handSize}
          />
        </div>

        {/* VS divider */}
        <div className="text-center text-gold/40 text-xs font-bold tracking-widest my-1">VS</div>

        {/* Hand 2 */}
        <div className="glass rounded-xl p-4 mb-3" data-testid="equity-hand-2">
          <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
            Hand 2 ({handSize} cards)
          </label>
          <CardPicker
            selectedCards={hand2}
            onSelect={c => hand2.length < handSize && setHand2([...hand2, c])}
            onRemove={c => setHand2(hand2.filter(x => x !== c))}
            disabledCards={[...hand1, ...board]}
            maxCards={handSize}
          />
        </div>

        {/* Board */}
        <div className="glass rounded-xl p-4 mb-4" data-testid="equity-board">
          <label className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-2 block">
            Board (0-5 cards)
          </label>
          <CardPicker
            selectedCards={board}
            onSelect={c => board.length < 5 && setBoard([...board, c])}
            onRemove={c => setBoard(board.filter(x => x !== c))}
            disabledCards={[...hand1, ...hand2]}
            maxCards={5}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="flex-1 py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-all bg-gradient-to-r from-gold-dark to-gold text-background disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-gold/20"
          >
            {isRunning ? 'Calculating...' : 'Calculate'}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-3 rounded-xl font-bold text-sm tracking-wide uppercase text-gold/50 border border-gold/20 hover:text-gold hover:border-gold/40 transition-all"
          >
            Clear
          </button>
        </div>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold">Results</span>
              <span className="text-[10px] text-gold-light/30">{result.samples.toLocaleString()} samples</span>
            </div>

            {result.equities.map((eq, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-gold-light">
                    Hand {i + 1}: <HandDisplay cards={i === 0 ? hand1 : hand2} />
                  </span>
                  <span className="text-lg font-bold text-gold" data-testid={`equity-result-${i + 1}`}>{(eq * 100).toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-midnight rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${eq * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      i === 0
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-r from-crimson/80 to-crimson'
                    }`}
                  />
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-gold-light/30">
                  <span>Win: {result.wins[i]}</span>
                  <span>Tie: {result.ties[i]}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}

function HandDisplay({ cards }: { cards: Card[] }) {
  return (
    <span>
      {cards.map((c, i) => {
        const d = cardToDisplay(c);
        return (
          <span key={i} className={d.isRed ? 'text-red-400' : 'text-white'}>
            {d.rank}{d.suitSymbol}
          </span>
        );
      })}
    </span>
  );
}
