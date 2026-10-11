/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import {
  Bot, Users, Target, Settings, ShoppingBag, Cpu, Wifi, WifiOff, Shield,
  Zap, Crosshair, ChevronRight, Trophy, Coins, Map as MapIcon, Swords
} from 'lucide-react';

export type SessionMode = 'bots' | 'friends' | 'range';

interface MainLobbyProps {
  playerLevel: number;
  rankName: string;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  kills: number;
  deaths: number;
  webGPUCapable: boolean;
  isWebGPU: boolean;
  networkStatus: 'online' | 'connecting' | 'offline';
  weaponCount: number;
  arenaCount: number;
  onSelectMode: (mode: SessionMode) => void;
  onOpenArmory: () => void;
  onOpenSettings: () => void;
}

interface PlaylistCard {
  mode: SessionMode;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
  badge: string;
  bullets: string[];
}

const PLAYLISTS: PlaylistCard[] = [
  {
    mode: 'bots',
    title: 'BOT SKIRMISH',
    subtitle: 'FIRST TO 10 • ADAPTIVE AI',
    description: 'Deploy instantly against adaptive combat bots that flank, pre-aim and punish slow peeks.',
    icon: <Bot className="w-7 h-7" />,
    accent: 'from-amber-500/30 via-orange-600/10 to-transparent',
    glow: 'group-hover:shadow-[0_0_45px_rgba(245,158,11,0.35)] border-amber-400/40',
    badge: 'RANKED XP',
    bullets: ['3 difficulty tiers', 'Kill streaks & coin rewards', 'Full movement kit enabled']
  },
  {
    mode: 'friends',
    title: 'PLAY WITH FRIENDS',
    subtitle: 'PRIVATE P2P ROOMS',
    description: 'Host a host-authoritative room, share your code, and squad up with friends over WebRTC.',
    icon: <Users className="w-7 h-7" />,
    accent: 'from-cyan-500/30 via-sky-600/10 to-transparent',
    glow: 'group-hover:shadow-[0_0_45px_rgba(34,211,238,0.35)] border-cyan-400/40',
    badge: 'MULTIPLAYER',
    bullets: ['Shareable room codes', 'Join by code', 'Optional bot fill']
  },
  {
    mode: 'range',
    title: 'SHOOTING RANGE',
    subtitle: 'SOLO PRACTICE • NO ENEMIES',
    description: 'Dial in recoil, test every weapon, and drill slides, slide-cancels and bunny hops safely.',
    icon: <Target className="w-7 h-7" />,
    accent: 'from-emerald-500/30 via-teal-600/10 to-transparent',
    glow: 'group-hover:shadow-[0_0_45px_rgba(16,185,129,0.35)] border-emerald-400/40',
    badge: 'WARM-UP',
    bullets: ['Infinite respawns', 'Destructible targets', 'Movement course access']
  }
];

export const MainLobby: React.FC<MainLobbyProps> = ({
  playerLevel, rankName, xp, xpToNextLevel, coins, kills, deaths,
  webGPUCapable, isWebGPU, networkStatus, weaponCount, arenaCount,
  onSelectMode, onOpenArmory, onOpenSettings
}) => {
  const xpPct = Math.min(100, Math.round((xp / Math.max(1, xpToNextLevel)) * 100));
  const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  return (
    <div className="absolute inset-0 z-40 font-mono select-none text-zinc-200 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,116,144,0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(217,119,6,0.25),_transparent_50%)] bg-[#05070c]/92 backdrop-blur-md" />
      <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative h-full flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.5)]">
              <Crosshair className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-xl font-black tracking-[0.3em] text-white leading-none">VANGUARD</div>
              <div className="text-[10px] text-cyan-300/80 tracking-widest mt-1">SEASON 1 • MOMENTUM PROTOCOL</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[10px]">
            <StatusPill
              ok={webGPUCapable}
              icon={<Cpu className="w-3 h-3" />}
              label={webGPUCapable ? (isWebGPU ? 'WEBGPU DEVICE READY' : 'WEBGPU CAPABLE') : 'WEBGPU MISSING'}
            />
            <StatusPill
              ok={networkStatus === 'online'}
              warn={networkStatus === 'connecting'}
              icon={networkStatus === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              label={networkStatus === 'online' ? 'NETWORK ONLINE' : networkStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
            />
            <StatusPill ok icon={<Shield className="w-3 h-3" />} label="SENTINEL AC ACTIVE" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onOpenArmory} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black hover:bg-amber-500/25 transition cursor-pointer">
              <ShoppingBag className="w-4 h-4" /> ARMORY
            </button>
            <button onClick={onOpenSettings} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-zinc-200 text-xs font-black hover:bg-white/10 transition cursor-pointer">
              <Settings className="w-4 h-4" /> SETTINGS
            </button>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Operator card */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/15 flex items-center justify-center text-2xl font-black text-cyan-300">
                  {playerLevel}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 tracking-widest">OPERATOR</div>
                  <div className="font-black text-white text-lg truncate">COMMANDER</div>
                  <div className="text-[11px] text-amber-300 font-bold truncate">{rankName}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1"><span>LEVEL {playerLevel}</span><span>{xp} / {xpToNextLevel} XP</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Stat label="K/D" value={kd} />
                <Stat label="KILLS" value={String(kills)} />
                <Stat label="COINS" value={String(coins)} icon={<Coins className="w-3 h-3 text-amber-400" />} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
              <div className="text-[10px] text-zinc-500 tracking-widest">GAME CONTENT</div>
              <ContentRow icon={<Swords className="w-4 h-4 text-amber-400" />} label="Weapons" value={`${weaponCount} unlocked`} />
              <ContentRow icon={<MapIcon className="w-4 h-4 text-cyan-400" />} label="Arenas" value={`${arenaCount} playlists`} />
              <ContentRow icon={<Zap className="w-4 h-4 text-emerald-400" />} label="Movement" value="Slide • Cancel • Bhop" />
              <ContentRow icon={<Trophy className="w-4 h-4 text-violet-400" />} label="Progression" value="XP • Ranks • Skins" />
            </div>
          </aside>

          {/* Playlists */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-wider">SELECT DEPLOYMENT</h1>
                <p className="text-xs text-zinc-400 mt-1">Choose how you want to enter the arena. All modes share the same movement engine and arsenal.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {PLAYLISTS.map(card => (
                <button
                  key={card.mode}
                  onClick={() => onSelectMode(card.mode)}
                  className={`group relative text-left rounded-2xl border bg-black/50 overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-pointer ${card.glow}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${card.accent} opacity-80`} />
                  <div className="relative p-5 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">{card.icon}</div>
                      <span className="text-[9px] font-black px-2 py-1 rounded bg-white/10 border border-white/15 tracking-widest">{card.badge}</span>
                    </div>
                    <div className="mt-5">
                      <div className="text-lg font-black text-white tracking-wide">{card.title}</div>
                      <div className="text-[10px] text-zinc-300/80 tracking-widest mt-0.5">{card.subtitle}</div>
                    </div>
                    <p className="text-xs text-zinc-300 mt-3 leading-relaxed">{card.description}</p>
                    <ul className="mt-4 space-y-1 text-[11px] text-zinc-400">
                      {card.bullets.map(b => <li key={b} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-white/60" />{b}</li>)}
                    </ul>
                    <div className="mt-auto pt-5 flex items-center justify-between text-xs font-black text-white">
                      <span>DEPLOY</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!webGPUCapable && (
              <div className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 p-4 text-xs text-red-100">
                <b>WEBGPU REQUIRED.</b> This build mandates a WebGPU-capable browser and GPU. Enable WebGPU or switch to a current Chromium-based browser before deploying.
              </div>
            )}
          </section>
        </main>

        {/* Footer controls strip */}
        <footer className="px-6 lg:px-10 py-3 border-t border-white/10 bg-black/40 flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] text-zinc-500">
          <span><b className="text-zinc-300">WASD</b> Move</span>
          <span><b className="text-zinc-300">SPACE</b> Jump / Bhop</span>
          <span><b className="text-zinc-300">C / CTRL</b> Slide</span>
          <span><b className="text-zinc-300">SPACE while sliding</b> Slide-cancel</span>
          <span><b className="text-zinc-300">1-9 / Scroll</b> Weapons</span>
          <span><b className="text-zinc-300">R</b> Reload</span>
          <span><b className="text-zinc-300">B</b> Armory</span>
          <span><b className="text-zinc-300">ESC</b> Pause</span>
          <span className="ml-auto text-emerald-400 flex items-center gap-1"><Shield className="w-3 h-3" /> SENTINEL ANTI-CHEAT: SECURED</span>
        </footer>
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ ok: boolean; warn?: boolean; icon: React.ReactNode; label: string }> = ({ ok, warn, icon, label }) => (
  <span className={`flex items-center gap-1 px-2 py-1 rounded border font-bold tracking-wider ${ok ? 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' : warn ? 'border-amber-400/40 text-amber-300 bg-amber-500/10' : 'border-red-400/40 text-red-300 bg-red-500/10'}`}>
    {icon}{label}
  </span>
);

const Stat: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg bg-white/5 border border-white/10 py-2">
    <div className="text-[9px] text-zinc-500 tracking-widest">{label}</div>
    <div className="text-sm font-black text-white flex items-center justify-center gap-1">{icon}{value}</div>
  </div>
);

const ContentRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="flex items-center gap-2 text-zinc-300">{icon}{label}</span>
    <span className="text-zinc-500">{value}</span>
  </div>
);

export const PauseOverlay: React.FC<{
  mode: SessionMode;
  onResume: () => void;
  onReturnToLobby: () => void;
  onOpenSettings: () => void;
  onOpenLobby: () => void;
}> = ({ mode, onResume, onReturnToLobby, onOpenSettings, onOpenLobby }) => (
  <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 font-mono select-none">
    <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#090d15]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)]">
      <div className="text-[10px] text-zinc-500 tracking-widest">SESSION PAUSED</div>
      <div className="text-xl font-black text-white mt-1">
        {mode === 'bots' ? 'BOT SKIRMISH' : mode === 'friends' ? 'PRIVATE MATCH' : 'SHOOTING RANGE'}
      </div>
      <div className="mt-5 space-y-2">
        <button onClick={onResume} className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black text-sm transition cursor-pointer">RESUME (CLICK TO LOCK)</button>
        {mode === 'friends' && (
          <button onClick={onOpenLobby} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 font-black text-xs transition cursor-pointer">ROOM &amp; INVITES</button>
        )}
        <button onClick={onOpenSettings} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 font-black text-xs transition cursor-pointer">SETTINGS</button>
        <button onClick={onReturnToLobby} className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/40 text-red-200 font-black text-xs transition cursor-pointer">RETURN TO LOBBY</button>
      </div>
    </div>
  </div>
);
