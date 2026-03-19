'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SessionStatsProps {
  stats: {
    handsPlayed: number;
    handsWon: number;
    vpip: number;
    pfr: number;
    aggressionFactor: number;
    consecutiveMistakes: number;
  };
  isOpen: boolean;
  onToggle: () => void;
}

export function SessionStats({ stats, isOpen, onToggle }: SessionStatsProps) {
  const winRate = stats.handsPlayed > 0 ? (stats.handsWon / stats.handsPlayed * 100).toFixed(0) : '0';
  const vpipPct = stats.handsPlayed > 0 ? (stats.vpip / stats.handsPlayed * 100).toFixed(0) : '0';
  const pfrPct = stats.handsPlayed > 0 ? (stats.pfr / stats.handsPlayed * 100).toFixed(0) : '0';
  const af = stats.aggressionFactor.toFixed(1);

  // Tilt detection
  const tiltLevel = stats.consecutiveMistakes >= 5 ? 'high' : stats.consecutiveMistakes >= 3 ? 'medium' : 'low';

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-40 w-8 h-8 rounded-full glass flex items-center justify-center text-gold/60 hover:text-gold transition-colors"
      >
        <span className="text-sm">📊</span>
      </button>

      {/* Stats panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="fixed top-14 right-4 z-40 w-56 glass rounded-xl p-4"
          >
            <h3 className="text-[10px] text-gold/60 uppercase tracking-widest font-semibold mb-3">
              Session Stats
            </h3>

            <div className="space-y-2">
              <StatRow label="Hands" value={`${stats.handsPlayed}`} />
              <StatRow label="Win Rate" value={`${winRate}%`} />
              <StatRow label="VPIP" value={`${vpipPct}%`} hint="Voluntarily Put $ In Pot" />
              <StatRow label="PFR" value={`${pfrPct}%`} hint="Preflop Raise %" />
              <StatRow label="AF" value={af} hint="Aggression Factor" />
            </div>

            {/* Tilt meter */}
            {stats.consecutiveMistakes >= 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-3 p-2 rounded-lg text-xs font-semibold text-center ${
                  tiltLevel === 'high'
                    ? 'bg-red-900/40 text-red-300 border border-red-500/30'
                    : 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/30'
                }`}
              >
                {tiltLevel === 'high'
                  ? '🔥 You may be tilting. Take a 5-minute break.'
                  : '⚠️ Careful — mistakes are stacking up.'}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex justify-between items-center" title={hint}>
      <span className="text-[11px] text-gold-light/50">{label}</span>
      <span className="text-sm font-bold text-gold">{value}</span>
    </div>
  );
}
