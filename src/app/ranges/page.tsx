'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Position } from '@/engine/types';
import { useGame } from '@/context/GameContext';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { StakesSelector } from '@/components/shared/StakesSelector';
import { getHoldemRange, getRangeLabel, isRangeSuited, RANK_LABELS } from '@/data/ranges/holdem/ranges';

const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

export default function RangesPage() {
  const { variant, stakes } = useGame();
  const [position, setPosition] = useState<Position>('BTN');
  const [quizMode, setQuizMode] = useState(false);
  const [quizHand, setQuizHand] = useState<{ row: number; col: number } | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<'correct' | 'wrong' | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const range = getHoldemRange(stakes, position);

  function startQuiz() {
    setQuizMode(true);
    nextQuizHand();
  }

  function nextQuizHand() {
    const row = Math.floor(Math.random() * 13);
    const col = Math.floor(Math.random() * 13);
    setQuizHand({ row, col });
    setQuizAnswer(null);
  }

  function answerQuiz(shouldPlay: boolean) {
    if (!quizHand) return;
    const freq = range[quizHand.row][quizHand.col];
    const isCorrect = shouldPlay ? freq >= 0.3 : freq < 0.3;
    setQuizAnswer(isCorrect ? 'correct' : 'wrong');
    setQuizScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    setTimeout(nextQuizHand, 1200);
  }

  return (
    <main className="min-h-screen pb-24 pt-6">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gold-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            Preflop Ranges
          </h1>
          <GameVariantToggle />
        </div>

        <div className="mb-4">
          <StakesSelector />
        </div>

        {/* Position tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                position === pos
                  ? 'bg-gold/20 text-gold border border-gold/30'
                  : 'text-gold-light/40 hover:text-gold-light/60 border border-transparent'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {variant === 'holdem' ? (
          <>
            {/* Quiz mode toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold">
                {quizMode ? `Quiz: ${quizScore.correct}/${quizScore.total}` : 'Range Grid'}
              </span>
              <button
                onClick={() => quizMode ? setQuizMode(false) : startQuiz()}
                className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold hover:text-gold transition-colors"
              >
                {quizMode ? 'Exit Quiz' : 'Quiz Mode'}
              </button>
            </div>

            {/* Quiz overlay */}
            {quizMode && quizHand && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-xl p-5 mb-4 text-center"
              >
                <p className="text-gold-light/50 text-xs mb-2">Should you open from {position}?</p>
                <p className="text-3xl font-bold text-gold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {getRangeLabel(quizHand.row, quizHand.col)}
                </p>
                {quizAnswer ? (
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`text-lg font-bold ${quizAnswer === 'correct' ? 'text-emerald-400' : 'text-crimson'}`}
                  >
                    {quizAnswer === 'correct' ? 'Correct!' : 'Wrong!'}
                    <span className="text-sm text-gold-light/40 ml-2">
                      ({(range[quizHand.row][quizHand.col] * 100).toFixed(0)}% freq)
                    </span>
                  </motion.p>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => answerQuiz(true)}
                      className="px-6 py-2 rounded-xl bg-emerald-600/80 text-white font-bold text-sm hover:bg-emerald-500 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => answerQuiz(false)}
                      className="px-6 py-2 rounded-xl bg-crimson/80 text-white font-bold text-sm hover:bg-crimson transition-colors"
                    >
                      Fold
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* 13x13 Range Grid */}
            <div className="glass rounded-xl p-2 overflow-x-auto">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(13, 1fr)', minWidth: 340 }}>
                {Array.from({ length: 13 }, (_, row) =>
                  Array.from({ length: 13 }, (_, col) => {
                    const freq = range[row][col];
                    const type = isRangeSuited(row, col);
                    const label = getRangeLabel(row, col);
                    const isQuizTarget = quizMode && quizHand?.row === row && quizHand?.col === col;

                    return (
                      <motion.div
                        key={`${row}-${col}`}
                        whileHover={{ scale: 1.1 }}
                        className={`aspect-square flex items-center justify-center rounded text-[7px] font-bold cursor-default transition-all ${
                          isQuizTarget ? 'ring-2 ring-gold' : ''
                        }`}
                        style={{
                          backgroundColor: freq > 0
                            ? `rgba(${freq > 0.7 ? '34,197,94' : freq > 0.3 ? '234,179,8' : '239,68,68'}, ${0.15 + freq * 0.5})`
                            : 'rgba(255,255,255,0.03)',
                          color: freq > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        }}
                        title={`${label}: ${(freq * 100).toFixed(0)}%`}
                      >
                        {label}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 justify-center text-[10px] text-gold-light/40">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/50" /> Always
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-500/50" /> Sometimes
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500/50" /> Rarely
              </span>
            </div>
          </>
        ) : (
          /* PLO Categories */
          <div className="space-y-3">
            {PLO_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gold-light">{cat.name}</h3>
                    <p className="text-[10px] text-gold-light/40 mt-0.5">{cat.description}</p>
                    <p className="text-[10px] text-gold/50 mt-1">e.g. {cat.examples.join(', ')}</p>
                  </div>
                  <span className={`text-sm font-bold ${
                    cat.frequency > 0.7 ? 'text-emerald-400' : cat.frequency > 0.3 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {(cat.frequency * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const PLO_CATEGORIES = [
  { name: 'Premium Pairs', description: 'AAxx, KKxx with suited/connected side cards', examples: ['AAKKds', 'AAJTs'], frequency: 0.95 },
  { name: 'Rundowns', description: '4 connected cards in sequence', examples: ['TJQK', '6789', '9TJQ'], frequency: 0.85 },
  { name: 'Double-Suited Hands', description: 'Two suits each appearing twice', examples: ['AsKsAhKh', 'Js9sJh9h'], frequency: 0.80 },
  { name: 'Suited Aces', description: 'Ace with suited connector(s)', examples: ['AhKhQx', 'AsTsJx'], frequency: 0.70 },
  { name: 'Medium Pairs + Connectors', description: 'Pair with connected side cards', examples: ['QQJTs', 'JJT9s'], frequency: 0.65 },
  { name: 'Gapped Rundowns', description: 'Near-connected with 1 gap', examples: ['JT8 7', 'T975'], frequency: 0.40 },
  { name: 'Small Pairs', description: 'Low pairs without connectivity', examples: ['22xx', '55xx'], frequency: 0.20 },
  { name: 'Danglers', description: 'Three connected + one disconnected card', examples: ['QJT2', 'AKQ5'], frequency: 0.15 },
];
