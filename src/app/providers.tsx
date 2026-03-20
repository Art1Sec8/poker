'use client';

import { GameProvider } from '@/context/GameContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <GameProvider>{children}</GameProvider>
    </ErrorBoundary>
  );
}
