'use client';

import { useUI } from '@/context/UIContext';

const ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/quiz', icon: '🎯', label: 'Quiz' },
  { href: '/ranges', icon: '📊', label: 'Ranges' },
  { href: '/play', icon: '🃏', label: 'Play' },
  { href: '/multiplayer', icon: '👥', label: 'Multi' },
  { href: '/history', icon: '📜', label: 'History' },
];

export function BottomNav() {
  const { immersive } = useUI();
  // During a live game the table owns the screen — the nav gets out of the way.
  if (immersive) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gold/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-0.5 text-gold-light/60 hover:text-gold active:text-gold transition-colors min-w-[44px] min-h-[44px] px-1"
          >
            <span className="text-2xl leading-none">{item.icon}</span>
            <span className="text-[11px] font-medium tracking-wide uppercase">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
