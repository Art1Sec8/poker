'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '@/engine/types';
import {
  getRangeLabel,
  getRfiRange,
  explainHand,
  type Verdict,
} from '@/data/ranges/holdem/ranges';

const SEATS: { seat: Position; label: string }[] = [
  { seat: 'UTG', label: 'UTG' },
  { seat: 'MP', label: 'MP' },
  { seat: 'CO', label: 'CO' },
  { seat: 'BTN', label: 'BTN' },
  { seat: 'SB', label: 'SB' },
];

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string }> = {
  open: { label: 'OPEN', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  mixed: { label: 'MIXED', cls: 'bg-gold/20 text-gold border-gold/40' },
  fold: { label: 'FOLD', cls: 'bg-steel/20 text-steel border-steel/40' },
};

function dotColor(freq: number): string {
  if (freq >= 0.7) return 'rgba(34,197,94,0.85)';
  if (freq >= 0.3) return 'rgba(234,179,8,0.85)';
  return 'rgba(255,255,255,0.12)';
}

export function HandDetailSheet({
  cell,
  position,
  onClose,
}: {
  cell: { row: number; col: number } | null;
  position: Position;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {cell && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-lg mx-auto glass rounded-t-2xl border-t border-gold/20 p-5 pb-24"
          >
            <SheetBody cell={cell} position={position} />
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 rounded-lg bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SheetBody({
  cell,
  position,
}: {
  cell: { row: number; col: number };
  position: Position;
}) {
  const { row, col } = cell;
  const label = getRangeLabel(row, col);
  const freq = getRfiRange(position)[row][col];
  const info = explainHand(row, col, position, freq);
  const v = VERDICT_STYLE[info.verdict];

  return (
    <div>
      {/* Drag handle */}
      <div className="w-10 h-1 rounded-full bg-gold/30 mx-auto mb-4" />

      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-3xl font-bold text-gold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {label}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${v.cls}`}
        >
          {v.label}
        </span>
      </div>

      {/* Frequency bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-gold-light/40 uppercase tracking-widest mb-1">
          <span>Open frequency from {position}</span>
          <span>{(freq * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${freq * 100}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: dotColor(freq) }}
          />
        </div>
      </div>

      {/* Position strip — same cards, different answer */}
      <div className="mb-4">
        <p className="text-[10px] text-gold-light/40 uppercase tracking-widest mb-2">
          {label} across seats
        </p>
        <div className="flex justify-between">
          {SEATS.map(({ seat, label: l }) => {
            const f = getRfiRange(seat)[row][col];
            return (
              <div key={seat} className="flex flex-col items-center gap-1">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    backgroundColor: dotColor(f),
                    color: f >= 0.3 ? '#0d0d0d' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {(f * 100).toFixed(0)}
                </span>
                <span
                  className={`text-[9px] font-semibold ${
                    seat === position ? 'text-gold' : 'text-gold-light/40'
                  }`}
                >
                  {l}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why */}
      <div className="glass rounded-lg p-3">
        <span className="text-[9px] uppercase tracking-widest text-gold/60 font-bold">
          Lever: {info.lever}
        </span>
        <p className="text-sm text-gold-light/70 leading-relaxed mt-1">{info.text}</p>
      </div>
    </div>
  );
}
