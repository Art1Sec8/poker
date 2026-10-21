'use client';

import { motion } from 'framer-motion';
import { LessonStep, RfiSeat } from '@/data/ranges/holdem/lessons';
import {
  getRfiRange,
  openingPercent,
  explainHand,
} from '@/data/ranges/holdem/ranges';

// A9o cell, 76s cell, KJo cell.
const A9O = { row: 5, col: 0 };
const S76 = { row: 7, col: 8 };
const KJO = { row: 3, col: 1 };

export function LearnLessonCard({
  step,
  index,
  total,
  currentSeat,
  onSeatChange,
  onPrev,
  onNext,
}: {
  step: LessonStep;
  index: number;
  total: number;
  currentSeat: RfiSeat;
  onSeatChange: (seat: RfiSeat) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      {/* Stepper dots */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-gold/60 font-bold">
          {step.level} · {step.title}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i === index ? 'bg-gold' : 'bg-gold/25'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-sm text-gold-light/70 leading-relaxed">{step.teachingText}</p>

      {/* Widgets */}
      {step.widget === 'a9o-reveal' && (
        <A9oReveal currentSeat={currentSeat} onSeatChange={onSeatChange} />
      )}
      {step.widget === 'opening-counter' && (
        <OpeningCounter
          seats={step.seatProgression ?? ['UTG', 'MP', 'CO', 'BTN']}
          currentSeat={currentSeat}
          onSeatChange={onSeatChange}
        />
      )}
      {step.widget === 'side-by-side' && <SideBySide />}

      {/* Nav */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="flex-1 py-2 rounded-lg bg-white/5 text-gold-light/60 text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="flex-1 py-2 rounded-lg bg-gold/20 text-gold text-sm font-semibold hover:bg-gold/30 transition-colors disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}

function A9oReveal({
  currentSeat,
  onSeatChange,
}: {
  currentSeat: RfiSeat;
  onSeatChange: (seat: RfiSeat) => void;
}) {
  const freq = getRfiRange(currentSeat)[A9O.row][A9O.col];
  const inRange = freq >= 0.3;
  return (
    <div className="mt-4">
      <p className="text-[10px] text-gold-light/40 uppercase tracking-widest mb-2">
        A9o from this seat
      </p>
      <div className="flex gap-2 mb-3">
        {(['UTG', 'BTN'] as RfiSeat[]).map((s) => (
          <button
            key={s}
            onClick={() => onSeatChange(s)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              currentSeat === s
                ? 'bg-gold/25 text-gold border border-gold/40'
                : 'bg-white/5 text-gold-light/50'
            }`}
          >
            {s === 'UTG' ? 'Under the gun' : 'Button'}
          </button>
        ))}
      </div>
      <div
        className={`text-center py-2 rounded-lg font-bold text-sm ${
          inRange
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-steel/15 text-steel'
        }`}
      >
        {inRange ? 'RAISE' : 'FOLD'} — {(freq * 100).toFixed(0)}% open
      </div>
    </div>
  );
}

function OpeningCounter({
  seats,
  currentSeat,
  onSeatChange,
}: {
  seats: RfiSeat[];
  currentSeat: RfiSeat;
  onSeatChange: (seat: RfiSeat) => void;
}) {
  const pct = openingPercent(getRfiRange(currentSeat));
  return (
    <div className="mt-4">
      <div className="text-center mb-3">
        <motion.span
          key={currentSeat}
          initial={{ scale: 0.85, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-gold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {pct.toFixed(0)}%
        </motion.span>
        <p className="text-[10px] text-gold-light/40 uppercase tracking-widest mt-1">
          of hands opened from {currentSeat}
        </p>
      </div>
      <div className="flex gap-1.5">
        {seats.map((s) => (
          <button
            key={s}
            onClick={() => onSeatChange(s)}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              currentSeat === s
                ? 'bg-gold/25 text-gold border border-gold/40'
                : 'bg-white/5 text-gold-light/50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideBySide() {
  const seat = 'CO';
  const cells = [
    { ...S76, name: '76s' },
    { ...KJO, name: 'KJo' },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {cells.map((c) => {
        const freq = getRfiRange(seat)[c.row][c.col];
        const info = explainHand(c.row, c.col, seat, freq);
        return (
          <div key={c.name} className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-gold">{c.name}</span>
              <span className="text-[9px] uppercase tracking-wider text-gold/60 font-bold">
                {info.lever}
              </span>
            </div>
            <p className="text-[11px] text-gold-light/60 leading-snug">{info.text}</p>
          </div>
        );
      })}
    </div>
  );
}
