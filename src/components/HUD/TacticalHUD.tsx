/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Crosshair, Shield, Heart, Zap, Terminal, Trophy, 
  Settings, Users, Radio, Activity, Cpu, Sparkles,
  ShoppingBag, Coins, ShieldCheck, Flame, Sword, Bot
} from 'lucide-react';
import { WeaponType, WEAPON_DEFINITIONS } from '../../engine/weapons/WeaponSystem.ts';
import { PlayerNetState } from '../../engine/netcode/P2PNetworkEngine.ts';
import { GraphicsPreset } from '../../engine/webgpu/WebGPUPipeline.ts';

export interface FloatingDamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  isHeadshot: boolean;
  opacity: number;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: WeaponType;
  isHeadshot: boolean;
  time: number;
}

interface TacticalHUDProps {
  health: number;
  armor: number;
  ammo: number;
  reserveAmmo: number;
  weapon: WeaponType;
  isReloading: boolean;
  reloadProgress: number;
  spreadBloom: number;
  isADS: boolean;
  hitmarkerState: 'body' | 'headshot' | 'shield_break' | null;
  floatingDamages: FloatingDamageNumber[];
  killFeed: KillFeedItem[];
  playerPos: [number, number, number];
  playerYaw: number;
  allPlayers: PlayerNetState[];
  fps: number;
  frameTimeMs: number;
  latencyMs: number;
  activeParticles: number;
  preset: GraphicsPreset;
  isWebGPU: boolean;
  isHost: boolean;
  roomId: string;
  onOpenSettings: () => void;
  onOpenLobby: () => void;
  currentSpeed: number;
  isDead?: boolean;
  killerName?: string;
  respawnCountdown?: number;
  onRespawn?: () => void;
  xp?: number;
  level?: number;
  rankName?: string;
  xpToNextLevel?: number;
  xpGains?: { id: string; amount: number; reason: string }[];
  levelUpNotification?: string | null;
  botDifficulty?: 'easy' | 'balanced' | 'hard';
  onToggleBotDifficulty?: () => void;
  coins?: number;
  activeSkinName?: string;
  antiCheatStatus?: string;
  antiCheatViolations?: number;
  botsEnabled?: boolean;
  onToggleBots?: () => void;
  onOpenShop?: () => void;
  killStreak?: number;
  onSelectWeaponSlot?: (weapon: WeaponType) => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps & { currentSpeed?: number }> = ({
  health,
  armor,
  ammo,
  reserveAmmo,
  weapon,
  isReloading,
  reloadProgress,
  spreadBloom,
  isADS,
  hitmarkerState,
  floatingDamages,
  killFeed,
  playerPos,
  playerYaw,
  allPlayers,
  fps,
  frameTimeMs,
  latencyMs,
  activeParticles,
  preset,
  isWebGPU,
  isHost,
  roomId,
  onOpenSettings,
  onOpenLobby,
  currentSpeed = 0,
  isDead = false,
  killerName = 'Enemy Operator',
  respawnCountdown = 3,
  onRespawn,
  xp = 0,
  level = 1,
  rankName = 'RECRUIT',
  xpToNextLevel = 500,
  xpGains = [],
  levelUpNotification = null,
  botDifficulty = 'easy',
  onToggleBotDifficulty,
  coins = 0,
  activeSkinName = 'Standard',
  antiCheatStatus = 'SECURED',
  antiCheatViolations = 0,
  botsEnabled = true,
  onToggleBots,
  onOpenShop,
  killStreak = 0,
  onSelectWeaponSlot
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Tab key for leaderboard, B for shop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowLeaderboard(prev => !prev);
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        onOpenShop?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenShop]);

  const currentWeaponDef = WEAPON_DEFINITIONS[weapon];
  const crosshairGap = Math.max(8, Math.min(36, spreadBloom * 240));

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono text-xs">
      {/* 1. Low Health Red Blood Pulse Vignette */}
      {health < 35 && (
        <div 
          className="absolute inset-0 pointer-events-none animate-pulse" 
          style={{
            background: `radial-gradient(circle, transparent 40%, rgba(220, 20, 60, ${0.45 * (1 - health / 35)}))`
          }}
        />
      )}

      {/* Top-Center: Rank, Coins, Armory Shop & Anti-Cheat */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {/* CS2 / Rivals Rank & XP Progression Bar */}
        <div className="p-2.5 bg-black/80 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px]">
          {/* Rank Badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.5)]">
              {level}
            </div>
            <div>
              <div className="text-[10px] text-amber-400/80 font-bold tracking-wider">RANK {level}</div>
              <div className="text-xs font-black text-white">{rankName}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-zinc-300 font-semibold mb-1">
              <span className="text-amber-400">{xp} XP</span>
              <span className="text-zinc-500">{xpToNextLevel} XP</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-amber-900/60 p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-300 shadow-[0_0_8px_#f59e0b]"
                style={{ width: `${Math.min(100, Math.max(0, (xp / xpToNextLevel) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Rival Coins Counter & Shop Quick-Button */}
        <button
          onClick={onOpenShop}
          className="pointer-events-auto p-2.5 bg-black/80 hover:bg-zinc-900/90 backdrop-blur-md border border-amber-500/50 rounded-xl flex items-center gap-2.5 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition group cursor-pointer"
        >
          <Coins className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
          <div className="text-left">
            <div className="text-[9px] text-zinc-400 font-bold">RIVAL COINS</div>
            <div className="text-xs font-black text-amber-300">{coins.toLocaleString()} ⛁</div>
          </div>
          <span className="ml-1 px-2 py-0.5 rounded bg-amber-500 text-black font-black text-[10px] group-hover:bg-amber-400 transition">
            [B] SHOP
          </span>
        </button>

        {/* Bots Togglable Quick Switch */}
        <button
          onClick={onToggleBots}
          title="Click to enable/disable AI bots"
          className={`pointer-events-auto p-2.5 backdrop-blur-md border rounded-xl flex items-center gap-2 transition cursor-pointer ${
            botsEnabled
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'bg-zinc-900/80 border-zinc-700 text-zinc-400'
          }`}
        >
          <Bot className="w-4 h-4" />
          <div className="text-left">
            <div className="text-[9px] text-zinc-400 font-bold">BOT SIM</div>
            <div className="text-[11px] font-black">{botsEnabled ? 'ENABLED [ON]' : 'DISABLED [OFF]'}</div>
          </div>
        </button>

        {/* Sentinel Anti-Cheat Security Shield */}
        <div className="p-2.5 bg-black/80 backdrop-blur-md border border-cyan-500/40 rounded-xl flex items-center gap-2 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <div className="text-left text-[9px]">
            <div className="text-zinc-400 font-bold">SENTINEL AC</div>
            <div className="font-black text-cyan-300">{antiCheatStatus} {antiCheatViolations > 0 ? `(${antiCheatViolations}!)` : ''}</div>
          </div>
        </div>
      </div>

      {/* Real-time Floating XP Gain Toasts */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-50">
        {xpGains.map(g => (
          <div
            key={g.id}
            className="py-1 px-3 bg-amber-500 text-black font-black text-xs rounded-full shadow-[0_0_15px_#f59e0b] animate-bounce flex items-center gap-1.5"
          >
            <span>+{g.amount} XP</span>
            <span className="text-[10px] bg-black/20 px-1 rounded">{g.reason}</span>
          </div>
        ))}

        {levelUpNotification && (
          <div className="py-2 px-5 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black font-black text-sm rounded-xl shadow-[0_0_25px_#f59e0b] animate-pulse">
            ★ RANK PROMOTION: {levelUpNotification}! ★
          </div>
        )}
      </div>

      {/* 2. Top-Left: Tactical Radar / Minimap */}
      <div className="absolute top-4 left-4 p-3 bg-black/65 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-cyan-500/20 text-cyan-400">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-[11px]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>RADAR COMPASS</span>
          </div>
          <span className="text-[10px] text-cyan-300/70">
            {Math.round(((-playerYaw * 180) / Math.PI + 360) % 360)}°
          </span>
        </div>

        {/* Circular Radar Canvas */}
        <div className="relative w-32 h-32 rounded-full border border-cyan-500/40 bg-zinc-950/80 overflow-hidden flex items-center justify-center">
          {/* Radar Sweep Arc */}
          <div 
            className="absolute inset-0 rounded-full border-t border-cyan-400/50 animate-spin"
            style={{ animationDuration: '3s' }}
          />

          {/* Grid lines */}
          <div className="absolute w-full h-[1px] bg-cyan-500/20" />
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />
          <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20" />

          {/* Local player center blip */}
          <div 
            className="w-2.5 h-2.5 bg-cyan-400 rounded-full z-10 shadow-[0_0_8px_#00e5ff] relative"
            style={{ transform: `rotate(${-playerYaw}rad)` }}
          >
            {/* Direction pointer */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-cyan-300" />
          </div>

          {/* Remote Entities Blips */}
          {allPlayers.map((p) => {
            if (p.id === 'local') return null;
            // Relative coordinates
            const relX = (p.position[0] - playerPos[0]) * 1.4;
            const relZ = (p.position[2] - playerPos[2]) * 1.4;
            // Rotate matching player yaw
            const cos = Math.cos(playerYaw);
            const sin = Math.sin(playerYaw);
            const rotatedX = relX * cos - relZ * sin;
            const rotatedY = relX * sin + relZ * cos;

            if (Math.hypot(rotatedX, rotatedY) > 60) return null;

            return (
              <div
                key={p.id}
                className={`absolute w-2 h-2 rounded-full z-10 ${p.health <= 0 ? 'bg-zinc-600' : 'bg-red-500 shadow-[0_0_6px_#ef4444]'}`}
                style={{
                  transform: `translate(${rotatedX}px, ${rotatedY}px)`
                }}
              />
            );
          })}
        </div>

        {/* Coordinates */}
        <div className="mt-2 text-[10px] text-zinc-400 flex justify-between">
          <span>X: {playerPos[0].toFixed(1)}</span>
          <span>Y: {playerPos[1].toFixed(1)}</span>
          <span>Z: {playerPos[2].toFixed(1)}</span>
        </div>
      </div>

      {/* 3. Top-Right: Hardware / Engine Telemetry & KillFeed */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {/* Hardware & WASM/WGSL Performance HUD */}
        <div className="p-2.5 bg-black/75 backdrop-blur-md border border-cyan-500/30 rounded-lg text-[10px] text-zinc-300 space-y-1 shadow-2xl min-w-[210px]">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-700/60 font-bold text-cyan-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" /> VANGUARD KERNEL
            </span>
            <span className="text-emerald-400">{preset.toUpperCase()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-400">PIPELINE:</span>
            <span className={`font-semibold ${isWebGPU ? 'text-cyan-300' : 'text-amber-400'}`}>
              {isWebGPU ? 'WebGPU Native (WGSL)' : 'WebGL2 (GLSL JIT)'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-400">RENDER FPS:</span>
            <span className={`font-bold ${fps >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {fps} FPS ({frameTimeMs.toFixed(1)} ms)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-400">WASM RAYCAST LATENCY:</span>
            <span className="text-cyan-300">{latencyMs.toFixed(3)} ms</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-400">GPU PARTICLES:</span>
            <span className="text-purple-400">{activeParticles.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">BOT DIFFICULTY:</span>
            <button
              onClick={onToggleBotDifficulty}
              title="Click to toggle bot difficulty"
              className="pointer-events-auto px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/50 text-[9px] font-bold text-emerald-300 transition"
            >
              {botDifficulty === 'easy' ? 'CASUAL (NERFED)' : botDifficulty.toUpperCase()}
            </button>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-400">P2P NETWORK PING:</span>
            <span className="text-emerald-400">{allPlayers.length > 1 ? `${allPlayers[0]?.ping || 18} ms` : 'HOST LISTEN (0 ms)'}</span>
          </div>

          <div className="pt-1 flex gap-1 pointer-events-auto">
            <button
              onClick={onOpenSettings}
              className="flex-1 py-1 px-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 rounded flex items-center justify-center gap-1 transition"
            >
              <Settings className="w-3 h-3" /> SETTINGS
            </button>
            <button
              onClick={onOpenLobby}
              className="flex-1 py-1 px-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded flex items-center justify-center gap-1 transition"
            >
              <Users className="w-3 h-3" /> ROOM LOBBY
            </button>
          </div>
        </div>

        {/* Animated Killfeed */}
        <div className="flex flex-col gap-1 w-64 items-end mt-2">
          {killFeed.map((kf) => (
            <div
              key={kf.id}
              className="py-1 px-2.5 bg-black/70 backdrop-blur border-l-2 border-red-500 rounded text-[11px] flex items-center gap-2 animate-fade-in text-white shadow-lg"
            >
              <span className="font-semibold text-cyan-400">{kf.killer}</span>
              <span className="text-[10px] text-zinc-400 px-1 py-0.5 bg-zinc-800 rounded">
                [{WEAPON_DEFINITIONS[kf.weapon].name}]
              </span>
              {kf.isHeadshot && (
                <span className="text-amber-400 text-[10px] font-bold">🎯 HEADSHOT</span>
              )}
              <span className="text-zinc-400">▶</span>
              <span className="text-red-400 font-semibold">{kf.victim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CS2 Speedometer & Counter-Strafe Indicator */}
      <div className="absolute bottom-28 left-6 p-2 bg-black/65 backdrop-blur border border-zinc-800 rounded-lg text-[10px] text-zinc-300 min-w-[140px]">
        <div className="flex justify-between text-zinc-400">
          <span>VELOCITY:</span>
          <span className={`font-bold font-mono ${currentSpeed <= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(currentSpeed * 40).toFixed(0)} u/s
          </span>
        </div>
        <div className="flex justify-between text-zinc-400">
          <span>ACCURACY:</span>
          <span className={`font-bold ${currentSpeed <= 0.8 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currentSpeed <= 0.8 ? 'PINPOINT (STOPPED)' : 'INACCURATE (MOVING)'}
          </span>
        </div>
      </div>

      {/* 4. Iconic CS2 Static/Dynamic Competitive Green Crosshair */}
      {!isADS && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Top Bar */}
          <div
            className="absolute w-[2px] bg-[#00ff66] shadow-[0_0_1px_#000000,0_0_2px_#000000]"
            style={{
              height: '7px',
              top: `-${crosshairGap + 7}px`,
              left: '-1px'
            }}
          />
          {/* Bottom Bar */}
          <div
            className="absolute w-[2px] bg-[#00ff66] shadow-[0_0_1px_#000000,0_0_2px_#000000]"
            style={{
              height: '7px',
              top: `${crosshairGap}px`,
              left: '-1px'
            }}
          />
          {/* Left Bar */}
          <div
            className="absolute h-[2px] bg-[#00ff66] shadow-[0_0_1px_#000000,0_0_2px_#000000]"
            style={{
              width: '7px',
              left: `-${crosshairGap + 7}px`,
              top: '-1px'
            }}
          />
          {/* Right Bar */}
          <div
            className="absolute h-[2px] bg-[#00ff66] shadow-[0_0_1px_#000000,0_0_2px_#000000]"
            style={{
              width: '7px',
              left: `${crosshairGap}px`,
              top: '-1px'
            }}
          />

          {/* Center Precision Dot */}
          <div className="w-[2px] h-[2px] bg-[#00ff66] shadow-[0_0_1px_#000000] -translate-x-1/2 -translate-y-1/2" />
        </div>
      )}

      {/* CS2 AWP Full Sniper Optical Scope Overlay */}
      {isADS && weapon === 'railgun' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Heavy Black Scope Mask Border */}
          <div className="absolute inset-0 bg-black/95" style={{
            maskImage: 'radial-gradient(circle 38vh at center, transparent 98%, black 100%)',
            WebkitMaskImage: 'radial-gradient(circle 38vh at center, transparent 98%, black 100%)'
          }} />

          {/* Optical Scope Ring */}
          <div className="w-[76vh] h-[76vh] rounded-full border-2 border-zinc-700/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] relative flex items-center justify-center">
            {/* Fine Reticle Lines */}
            <div className="absolute w-full h-[1px] bg-black/80" />
            <div className="absolute h-full w-[1px] bg-black/80" />
            <div className="w-2 h-2 rounded-full border border-red-500/80" />
            <div className="w-0.5 h-0.5 bg-red-500 rounded-full" />
          </div>

          {/* Moving Scope Inaccuracy Warning */}
          {currentSpeed > 0.8 && (
            <div className="absolute top-[22%] text-red-500 font-bold text-xs tracking-wider animate-pulse">
              [ SCOPE INACCURATE - COUNTER-STRAFE TO STOP ]
            </div>
          )}
        </div>
      )}

      {/* ADS Holographic Reticle for Assault Rifles */}
      {isADS && weapon !== 'railgun' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#00e5ff]" />
          </div>
        </div>
      )}

      {/* Dynamic Hitmarker Tick Overlay */}
      {hitmarkerState && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping">
          <div className={`relative w-8 h-8 ${hitmarkerState === 'headshot' ? 'text-amber-400' : 'text-white'}`}>
            <div className={`absolute top-0 left-0 w-3 h-[2px] rotate-45 ${hitmarkerState === 'headshot' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className={`absolute top-0 right-0 w-3 h-[2px] -rotate-45 ${hitmarkerState === 'headshot' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className={`absolute bottom-0 left-0 w-3 h-[2px] -rotate-45 ${hitmarkerState === 'headshot' ? 'bg-amber-400' : 'bg-red-400'}`} />
            <div className={`absolute bottom-0 right-0 w-3 h-[2px] rotate-45 ${hitmarkerState === 'headshot' ? 'bg-amber-400' : 'bg-red-400'}`} />
          </div>
        </div>
      )}

      {/* Floating Combat Damage Numbers */}
      {floatingDamages.map((dmg) => (
        <div
          key={dmg.id}
          className={`absolute font-black pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all ${
            dmg.isHeadshot
              ? 'text-amber-400 text-lg shadow-[0_0_12px_#f59e0b]'
              : 'text-white text-sm'
          }`}
          style={{
            left: `${dmg.x}px`,
            top: `${dmg.y}px`,
            opacity: dmg.opacity
          }}
        >
          {dmg.damage}
          {dmg.isHeadshot && ' CRIT!'}
        </div>
      ))}

      {/* 5. Bottom-Left: Vital Health & Armor Indicators */}
      <div className="absolute bottom-6 left-6 p-4 bg-black/75 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl min-w-[260px]">
        {/* Health bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-red-400 font-bold tracking-wider">
              <Heart className="w-4 h-4 fill-red-500/40 text-red-400" /> HP
            </span>
            <span className="text-lg font-black text-white">{Math.max(0, health)}</span>
          </div>
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-red-950 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-150 rounded-full shadow-[0_0_8px_#e11d48]"
              style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
            />
          </div>
        </div>

        {/* Armor / Shield bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider">
              <Shield className="w-4 h-4 fill-cyan-500/40 text-cyan-400" /> NANO SHIELD
            </span>
            <span className="text-base font-bold text-cyan-300">{Math.max(0, armor)}</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-cyan-950 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-sky-400 transition-all duration-150 rounded-full shadow-[0_0_8px_#0284c7]"
              style={{ width: `${Math.max(0, Math.min(100, (armor / 50) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Killstreak Banner (Roblox Rivals Style) */}
      {killStreak >= 2 && (
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center animate-bounce z-40">
          <div className="py-1 px-4 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-black font-black text-sm rounded-full shadow-[0_0_20px_#f59e0b] flex items-center gap-2 border-2 border-white">
            <Flame className="w-4 h-4 fill-black" />
            <span>
              {killStreak === 2 ? 'DOUBLE ELIMINATION (x2)!' :
               killStreak === 3 ? 'TRIPLE KILL (x3)!' :
               killStreak === 4 ? 'QUAD DOMINATION (x4)!' :
               '🔥 UNSTOPPABLE SPREE (x' + killStreak + ')! 🔥'}
            </span>
          </div>
        </div>
      )}

      {/* 6. Bottom-Right: Tactical Weapon Display & Ammunition */}
      <div className="absolute bottom-6 right-6 p-4 bg-black/80 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl min-w-[320px]">
        <div className="flex justify-between items-start mb-2 border-b border-zinc-800 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-400/80 uppercase font-semibold">
                {currentWeaponDef.category}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {activeSkinName}
              </span>
            </div>
            <div className="text-base font-black text-white tracking-wide flex items-center gap-2">
              <span>{currentWeaponDef.name}</span>
            </div>
          </div>
        </div>

        {/* 9-Slot Hotkey Arsenal Bar (Clickable / Quick switch) */}
        <div className="grid grid-cols-9 gap-1 mb-2 pointer-events-auto">
          {(['rifle', 'railgun', 'shotgun', 'pistol', 'melee', 'rpg', 'smg', 'revolver', 'crossbow'] as WeaponType[]).map((wId, idx) => {
            const isCur = weapon === wId;
            const shortNames: Record<WeaponType, string> = { rifle: 'AK', railgun: 'AWP', shotgun: 'SPAS', pistol: 'DEAGLE', melee: 'BLADE', rpg: 'RPG', smg: 'SMG', revolver: 'REV', crossbow: 'BOW' };
            const shortName = shortNames[wId];
            return (
              <button
                key={wId}
                onClick={() => onSelectWeaponSlot?.(wId)}
                className={`py-1 px-1 rounded text-[9px] font-bold border transition text-center ${
                  isCur 
                    ? 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_8px_#f59e0b]' 
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                }`}
              >
                <div>[{idx + 1}]</div>
                <div className="truncate">{shortName}</div>
              </button>
            );
          })}
        </div>

        {/* Ammo Counter */}
        <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-zinc-800/60">
          <div className="flex items-baseline gap-1">
            {currentWeaponDef.isMelee ? (
              <span className="text-xl font-black text-cyan-300 flex items-center gap-1">
                <Sword className="w-5 h-5 text-cyan-400" /> READY
              </span>
            ) : (
              <>
                <span className={`text-4xl font-black tracking-tight ${ammo <= (weapon === 'rpg' ? 0 : 4) ? 'text-red-500 animate-pulse' : 'text-cyan-300'}`}>
                  {ammo}
                </span>
                <span className="text-zinc-500 text-lg font-semibold">/ {reserveAmmo}</span>
              </>
            )}
          </div>

          {/* Reload indicator */}
          {isReloading && (
            <div className="text-right">
              <span className="text-amber-400 font-bold text-xs animate-pulse">RELOADING...</span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 8. Global Match Leaderboard Overlay (Tab) */}
      {showLeaderboard && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl p-6 w-[640px] shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                <Trophy className="w-5 h-5 text-amber-400" /> MATCH LEADERBOARD
              </div>
              <span className="text-zinc-500 text-xs">Press [TAB] to close</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2">PLAYER</th>
                  <th className="pb-2">TYPE</th>
                  <th className="pb-2 text-right">KILLS</th>
                  <th className="pb-2 text-right">DEATHS</th>
                  <th className="pb-2 text-right">SCORE</th>
                  <th className="pb-2 text-right">PING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {allPlayers.map((p) => (
                  <tr key={p.id} className="text-zinc-200">
                    <td className="py-2.5 font-bold text-cyan-300">{p.name}</td>
                    <td className="py-2.5 text-zinc-400">
                      {p.isHost ? 'HOST' : (p.isBot ? 'TACTICAL BOT' : 'PEER')}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-emerald-400">{p.kills}</td>
                    <td className="py-2.5 text-right text-red-400">{p.deaths}</td>
                    <td className="py-2.5 text-right font-black text-amber-300">{p.kills * 100}</td>
                    <td className="py-2.5 text-right text-zinc-400">{p.ping} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 9. Player Elimination & Death Screen Overlay */}
      {isDead && (
        <div className="absolute inset-0 bg-red-950/75 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-50 animate-fade-in">
          <div className="text-red-500 text-4xl font-black tracking-widest animate-pulse mb-2 drop-shadow-[0_0_20px_#ef4444]">
            YOU WERE ELIMINATED
          </div>
          <div className="text-zinc-300 text-sm mb-4">
            Eliminated by <span className="font-bold text-white text-base text-cyan-300">{killerName}</span>
          </div>
          <div className="text-amber-400 font-mono text-base font-bold mb-6">
            RESPAWNING IN {respawnCountdown}s...
          </div>
          <button
            onClick={onRespawn}
            className="py-3 px-8 bg-red-600 hover:bg-red-500 text-white font-black text-sm rounded-xl shadow-[0_0_25px_#ef4444] transition cursor-pointer"
          >
            RESPAWN NOW [SPACE]
          </button>
        </div>
      )}
    </div>
  );
};
