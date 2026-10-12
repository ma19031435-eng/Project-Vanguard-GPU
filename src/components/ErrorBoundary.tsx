/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

interface State { error: Error | null }

/**
 * Last line of defence: a render/runtime exception in any component shows a
 * recoverable crash screen instead of a blank page, and never loses the user's
 * persisted progress (shop/settings are already in localStorage).
 */
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Vanguard] Unrecoverable UI error', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="w-screen h-screen bg-[#07090d] text-zinc-200 font-mono flex items-center justify-center p-8">
        <div className="max-w-xl w-full border border-red-500/40 bg-black/70 rounded-xl p-6 shadow-[0_0_60px_rgba(239,68,68,0.15)]">
          <div className="text-[10px] tracking-[0.35em] text-red-400 mb-2">SYSTEM FAULT</div>
          <h1 className="text-2xl font-black text-white mb-3">Vanguard hit an unrecoverable error</h1>
          <p className="text-sm text-zinc-400 mb-4">
            Your settings, coins and unlocks are safe. Reload to rejoin the arena. If this keeps happening,
            try a lower graphics preset from the main menu.
          </p>
          <pre className="text-[11px] text-red-300/80 bg-red-950/30 border border-red-900/40 rounded p-3 overflow-auto max-h-40 mb-5">
            {this.state.error.message}
          </pre>
          <div className="flex gap-3">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded text-sm">
              RELOAD GAME
            </button>
            <button onClick={() => this.setState({ error: null })} className="px-4 py-2 border border-zinc-600 hover:border-zinc-400 rounded text-sm">
              TRY TO CONTINUE
            </button>
          </div>
        </div>
      </div>
    );
  }
}
