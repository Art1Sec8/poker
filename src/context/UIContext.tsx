'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  /** When true, the global bottom nav hides so a game can own the full screen. */
  immersive: boolean;
  setImmersive: (v: boolean) => void;
}

const UIContext = createContext<UIContextType>({
  immersive: false,
  setImmersive: () => {},
});

export function UIProvider({ children }: { children: ReactNode }) {
  const [immersive, setImmersive] = useState(false);
  return (
    <UIContext.Provider value={{ immersive, setImmersive }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}
