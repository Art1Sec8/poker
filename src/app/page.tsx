'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { PlayingCard, CardGroup } from '@/components/ui/PlayingCard';
import { parseCards } from '@/engine/card';

const features = [
  {
    href: '/trainer',
    title: 'Range Trainer',
    description: 'Paint ranges on the grid, get AI-coached',
    icon: '🧩',
    gradient: 'from-emerald-900/40 to-emerald-950/60',
  },
  {
    href: '/quiz',
    title: 'Hand Quiz',
    description: 'Test your decision-making under pressure',
    icon: '🎯',
    gradient: 'from-amber-900/40 to-amber-950/60',
  },
  {
    href: '/ranges',
    title: 'Preflop Ranges',
    description: 'Master opening ranges by position',
    icon: '📊',
    gradient: 'from-emerald-900/40 to-emerald-950/60',
  },
  {
    href: '/play',
    title: 'Play vs AI',
    description: 'Practice against AI with coaching',
    icon: '🃏',
    gradient: 'from-red-900/40 to-red-950/60',
  },
  {
    href: '/multiplayer',
    title: 'Multiplayer',
    description: 'Play live with friends online',
    icon: '👥',
    gradient: 'from-purple-900/40 to-purple-950/60',
  },
  {
    href: '/equity',
    title: 'Equity Calc',
    description: 'Calculate hand vs hand equity',
    icon: '📈',
    gradient: 'from-blue-900/40 to-blue-950/60',
  },
  {
    href: '/history',
    title: 'Hand History',
    description: 'Review and replay past hands',
    icon: '📜',
    gradient: 'from-teal-900/40 to-teal-950/60',
  },
];

export default function Home() {
  const demoCards = parseCards('AhKh');

  return (
    <main className="min-h-screen pb-20">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-midnight via-background to-background" />
        <div className="absolute inset-0 vignette" />

        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              <span className="gold-shimmer">Poker</span>
              <span className="text-foreground ml-2">Trainer</span>
            </h1>
            <p className="mt-3 text-gold-light/50 text-sm tracking-widest uppercase">
              Hold&apos;em &middot; PLO &middot; AI Coach
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center mt-8"
          >
            <CardGroup cards={demoCards} size="lg" overlap={true} />
          </motion.div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-lg mx-auto px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <Link href={feature.href}>
                <div className="glass rounded-xl p-4 h-full hover:border-gold/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className="relative">
                    <span className="text-2xl">{feature.icon}</span>
                    <h2 className="mt-2 text-sm font-semibold text-gold-light tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {feature.title}
                    </h2>
                    <p className="mt-1 text-[11px] text-gold-light/40 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="max-w-lg mx-auto px-6 mt-8 text-center"
      >
        <p className="text-[10px] text-gold-light/30 tracking-widest uppercase">
          Supports No-Limit Hold&apos;em &middot; Pot-Limit Omaha
        </p>
      </motion.div>
    </main>
  );
}
