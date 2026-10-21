'use client';

import { GameProvider } from '@/context/GameContext';
import { UIProvider } from '@/context/UIContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <UIProvider>
        <GameProvider>{children}</GameProvider>
      </UIProvider>
    </ErrorBoundary>
  );
}
