'use client';

import { motion } from 'framer-motion';

export interface WeakSpot {
  label: string;
  text: string;
}

export interface ScorecardData {
  accuracy: number; // 0-1
  correct: number;
  total: number;
  userPct: number;
  targetPct: number;
  falsePositives: WeakSpot[];
  falseNegatives: WeakSpot[];
  coinFlipCount: number;
  leakSummary: string;
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.round(accuracy * 100);
  const color = accuracy >= 0.85 ? '#22c55e' : accuracy >= 0.6 ? '#c9a84c' : '#b22234';
  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - accuracy) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function Scorecard({
  data,
  onRetry,
}: {
  data: ScorecardData;
  onRetry: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Top: ring + opening % tiles */}
      <div className="glass rounded-xl p-5 flex items-center gap-5">
        <AccuracyRing accuracy={data.accuracy} />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-bold text-gold-light">
            {data.correct}/{data.total} cells correct
          </p>
          <div className="flex gap-2">
            <div className="flex-1 glass rounded-lg p-2 text-center">
              <p className="text-[9px] uppercase tracking-widest text-gold-light/40">Your open</p>
              <p className="text-lg font-bold text-gold">{data.userPct.toFixed(0)}%</p>
            </div>
            <div className="flex-1 glass rounded-lg p-2 text-center">
              <p className="text-[9px] uppercase tracking-widest text-gold-light/40">Target</p>
              <p className="text-lg font-bold text-emerald-300">{data.targetPct.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leak summary */}
      <div className="glass rounded-xl p-4 border border-gold/15">
        <p className="text-[10px] uppercase tracking-widest text-gold/60 font-bold mb-1">Your leak</p>
        <p className="text-sm text-gold-light/70 leading-relaxed">{data.leakSummary}</p>
        {data.coinFlipCount > 0 && (
          <p className="text-[11px] text-gold/50 mt-2">
            {data.coinFlipCount} mixed (coin-flip) {data.coinFlipCount === 1 ? 'hand was' : 'hands were'} scored correct either way.
          </p>
        )}
      </div>

      {/* False positives — opening dominated junk */}
      {data.falsePositives.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-crimson font-bold mb-2">
            Opened too much ({data.falsePositives.length})
          </p>
          <div className="space-y-2">
            {data.falsePositives.map((w) => (
              <div key={w.label}>
                <span className="text-sm font-bold text-crimson">{w.label}</span>
                <span className="text-[11px] text-gold-light/55 ml-2">{w.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* False negatives — folding playable hands */}
      {data.falseNegatives.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-steel font-bold mb-2">
            Folded too much ({data.falseNegatives.length})
          </p>
          <div className="space-y-2">
            {data.falseNegatives.map((w) => (
              <div key={w.label}>
                <span className="text-sm font-bold text-steel">{w.label}</span>
                <span className="text-[11px] text-gold-light/55 ml-2">{w.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-lg bg-gold/20 text-gold text-sm font-semibold hover:bg-gold/30 transition-colors"
        >
          Retry
        </button>
        <a
          href="/quiz"
          className="flex-1 py-2.5 rounded-lg bg-white/5 text-gold-light/70 text-sm font-semibold hover:bg-white/10 transition-colors text-center"
        >
          Facing a raise →
        </a>
      </div>
    </motion.div>
  );
}
