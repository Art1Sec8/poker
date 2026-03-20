'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Poker app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="glass rounded-xl p-8 max-w-md text-center">
            <div className="text-3xl mb-3">🃏</div>
            <h2 className="text-lg font-bold text-gold-light mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Something went wrong
            </h2>
            <p className="text-sm text-gold-light/40 mb-4">
              The game encountered an unexpected error.
            </p>
            {this.state.error && (
              <p className="text-[10px] text-red-400/60 mb-4 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-gold-dark to-gold text-background"
            >
              Restart
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
