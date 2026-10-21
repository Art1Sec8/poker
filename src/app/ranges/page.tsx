'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '@/engine/types';
import { useGame } from '@/context/GameContext';
import { GameVariantToggle } from '@/components/shared/GameVariantToggle';
import { StakesSelector } from '@/components/shared/StakesSelector';
import { RangeMatrix } from '@/components/ranges/RangeMatrix';
import { ModeSwitcher, RangeMode } from '@/components/ranges/ModeSwitcher';
import { HandDetailSheet } from '@/components/ranges/HandDetailSheet';
import { LearnLessonCard } from '@/components/ranges/LearnLessonCard';
import { DrillController } from '@/components/ranges/DrillController';
import { getRfiRange, getRangeLabel, explainHand } from '@/data/ranges/holdem/ranges';
import { LESSONS, RfiSeat, whyRangesMatter } from '@/data/ranges/holdem/lessons';
import { logCoachEvent } from '@/lib/coachFeed';

const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

export default function RangesPage() {
  const { variant } = useGame();
  const [mode, setMode] = useState<RangeMode>('explore');
  const [position, setPosition] = useState<Position>('BTN');
  const [exploreCell, setExploreCell] = useState<{ row: number; col: number } | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  // Learn state
  const [learnStep, setLearnStep] = useState(0);
  const [learnSeat, setLearnSeat] = useState<RfiSeat>(LESSONS[0].defaultSeat);

  // When the lesson step changes, snap the matrix seat back to that step's default.
  useEffect(() => {
    setLearnSeat(LESSONS[learnStep].defaultSeat);
  }, [learnStep]);

  const lesson = LESSONS[learnStep];
  const exploreRange = getRfiRange(position);
  const learnRange = getRfiRange(learnSeat);

  return (
    <main className="min-h-screen pb-24 pt-6">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1
            className="text-2xl font-bold text-gold-light"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Range Academy
          </h1>
          <GameVariantToggle />
        </div>
        <p className="text-[10px] text-gold/50 uppercase tracking-widest font-semibold mb-4">
          6-max · 100bb cash
        </p>

        {variant === 'holdem' ? (
          <>
            {/* Mode switcher */}
            <div className="mb-4">
              <ModeSwitcher mode={mode} onChange={setMode} />
            </div>

            {/* Cosmetic stakes (no-op for MVP) + position tabs, hidden in Learn */}
            {mode !== 'learn' && (
              <>
                <div className="mb-3">
                  <StakesSelector />
                </div>
                <div className="flex gap-1 mb-4 overflow-x-auto">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => {
                        setPosition(pos);
                        logCoachEvent({ kind: 'position', mode, position: pos });
                      }}
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
              </>
            )}

            {/* Why ranges matter — collapsible intro */}
            <div className="glass rounded-xl mb-4 overflow-hidden">
              <button
                onClick={() => setShowWhy((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs font-bold text-gold uppercase tracking-widest">
                  Why ranges matter
                </span>
                <span className="text-gold/60 text-sm">{showWhy ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {showWhy && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 space-y-2"
                  >
                    {whyRangesMatter.map((b, i) => (
                      <li key={i} className="text-[12px] text-gold-light/65 leading-relaxed flex gap-2">
                        <span className="text-gold/50">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* EXPLORE */}
            {mode === 'explore' && (
              <>
                {position === 'BB' && (
                  <p className="text-[11px] text-steel/90 mb-3 text-center">
                    The big blind has no opening (raise-first-in) range — it only defends. Tap a
                    hand to see why, then check the &quot;Facing a raise&quot; quiz.
                  </p>
                )}
                <RangeMatrix
                  range={exploreRange}
                  mode="explore"
                  onCellTap={(row, col) => {
                    setExploreCell({ row, col });
                    const freq = exploreRange[row][col];
                    const info = explainHand(row, col, position, freq);
                    logCoachEvent({
                      kind: 'explore',
                      position,
                      hand: getRangeLabel(row, col),
                      freqPct: Math.round(freq * 100),
                      verdict: info.verdict,
                      lever: info.lever,
                    });
                  }}
                />
                <Legend />
                <p className="text-center text-[11px] text-gold-light/40 mt-3">
                  Tap any hand for the verdict and the &quot;why&quot;.
                </p>
                <HandDetailSheet
                  cell={exploreCell}
                  position={position}
                  onClose={() => setExploreCell(null)}
                />
              </>
            )}

            {/* LEARN */}
            {mode === 'learn' && (
              <div className="space-y-4">
                <RangeMatrix
                  range={learnRange}
                  mode="learn"
                  highlightRegion={lesson.highlight}
                />
                <LearnLessonCard
                  step={lesson}
                  index={learnStep}
                  total={LESSONS.length}
                  currentSeat={learnSeat}
                  onSeatChange={setLearnSeat}
                  onPrev={() => setLearnStep((s) => Math.max(0, s - 1))}
                  onNext={() => {
                    if (learnStep === LESSONS.length - 1) setMode('drill');
                    else setLearnStep((s) => Math.min(LESSONS.length - 1, s + 1));
                  }}
                />
              </div>
            )}

            {/* DRILL */}
            {mode === 'drill' && <DrillController key={position} position={position} />}
          </>
        ) : (
          /* PLO Categories — unchanged */
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
                  <span
                    className={`text-sm font-bold ${
                      cat.frequency > 0.7
                        ? 'text-emerald-400'
                        : cat.frequency > 0.3
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
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

function Legend() {
  return (
    <div className="flex gap-4 mt-3 justify-center text-[10px] text-gold-light/40">
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-emerald-500/50" /> Open
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-yellow-500/50" /> Mixed
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-red-500/50" /> Fold
      </span>
    </div>
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
