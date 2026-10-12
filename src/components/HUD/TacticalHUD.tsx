/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Sword, Settings, Users, Coins, Bot, ShieldCheck } from 'lucide-react';
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
  damageIndicators?: { id: number; angle: number; time: number }[];
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
  kills?: number;
  deaths?: number;
  targetKills?: number;
  presetAuto?: boolean;
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
  latencyMs,
  damageIndicators = [],
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
  onSelectWeaponSlot,
  kills,
  deaths,
  targetKills = 10,
  presetAuto = false,
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (damageIndicators.length === 0) return;
    let raf = 0;
    const loop = () => { setNowTick(Date.now()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [damageIndicators.length]);
  const liveIndicators = damageIndicators.filter(d => nowTick - d.time < 1400);
  const recentHit = liveIndicators.length > 0 ? Math.max(0, 1 - (nowTick - liveIndicators[liveIndicators.length - 1].time) / 600) : 0;

  // Tab = scoreboard (hold or toggle), B = armory
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Tab') { e.preventDefault(); setShowLeaderboard(true); }
      else if (e.code === 'KeyB') { e.preventDefault(); onOpenShop?.(); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Tab') setShowLeaderboard(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [onOpenShop]);

  const currentWeaponDef = WEAPON_DEFINITIONS[weapon];
  const local = allPlayers.find(p => p.id === 'local');
  const myKills = kills ?? local?.kills ?? 0;
  const myDeaths = deaths ?? local?.deaths ?? 0;
  const topEnemy = allPlayers.filter(p => p.id !== 'local').reduce((m, p) => Math.max(m, p.kills), 0);
  const crosshairGap = Math.max(6, Math.min(30, spreadBloom * 220));
  const moving = currentSpeed > 0.8;
  const lowAmmo = !currentWeaponDef.isMelee && ammo <= Math.max(1, Math.ceil(currentWeaponDef.magazineSize * 0.25));
  const hpPct = Math.max(0, Math.min(100, health));
  const armorPct = Math.max(0, Math.min(100, armor));
  const arsenal: WeaponType[] = ['rifle', 'railgun', 'shotgun', 'pistol', 'melee', 'rpg', 'smg', 'revolver', 'crossbow'];
  const shortNames: Record<WeaponType, string> = { rifle: 'AK', railgun: 'AWP', shotgun: 'SPAS', pistol: 'DE', melee: 'BLADE', rpg: 'RPG', smg: 'SMG', revolver: 'REV', crossbow: 'BOW' };

  // Shared surfaces — soft gradient panels instead of boxed cards
  const panelL = 'bg-gradient-to-r from-black/70 via-black/45 to-transparent';
  const panelR = 'bg-gradient-to-l from-black/70 via-black/45 to-transparent';
  const label = 'text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase';
  const num = 'tabular-nums';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden text-white hud-font">
      {/* ---------- Full-screen feedback layers ---------- */}
      {health < 35 && (
        <div className="absolute inset-0 pointer-events-none animate-pulse"
          style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(190, 18, 40, ${0.5 * (1 - health / 35)}))` }} />
      )}
      {recentHit > 0 && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, transparent 48%, rgba(255, 40, 40, ${0.35 * recentHit}))` }} />
      )}
      {/* Subtle vignette for legibility against the bright sky */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)' }} />

      {/* Directional damage arcs */}
      <div className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none">
        {liveIndicators.map((d) => {
          const age = (nowTick - d.time) / 1400;
          const alpha = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
          return (
            <div key={d.id} className="absolute left-0 top-0" style={{ transform: `rotate(${(d.angle * 180) / Math.PI}deg)`, opacity: Math.max(0, alpha) }}>
              <div className="absolute" style={{
                left: -40, top: -140, width: 80, height: 34,
                background: 'radial-gradient(ellipse at 50% 100%, rgba(255,70,70,0.95) 0%, rgba(255,70,70,0.45) 50%, transparent 74%)',
                clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)', filter: 'drop-shadow(0 0 6px rgba(255,0,0,0.7))' }} />
            </div>
          );
        })}
      </div>

      {/* ---------- Top-left: radar ---------- */}
      <div className="absolute top-4 left-4 flex items-start gap-3">
        <div className="relative w-[124px] h-[124px] rounded-full border border-white/15 bg-black/45 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(34,211,238,0.10) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: '4s', background: 'conic-gradient(from 0deg, rgba(34,211,238,0.22), transparent 25%)' }} />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
          <div className="absolute inset-[26%] rounded-full border border-white/10" />
          {/* enemies */}
          {allPlayers.map((p) => {
            if (p.id === 'local') return null;
            const relX = (p.position[0] - playerPos[0]) * 1.3;
            const relZ = (p.position[2] - playerPos[2]) * 1.3;
            const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
            const rx = relX * cos - relZ * sin;
            const ry = relX * sin + relZ * cos;
            const dist = Math.hypot(rx, ry);
            if (dist > 56) return null;
            return (
              <div key={p.id} className={`absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full ${p.health <= 0 ? 'bg-white/25' : 'bg-red-500 shadow-[0_0_6px_#ef4444]'}`}
                style={{ transform: `translate(${rx}px, ${ry}px)` }} />
            );
          })}
          {/* self */}
          <div className="absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] w-[10px] h-[10px]">
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-cyan-300 drop-shadow-[0_0_4px_#22d3ee]" />
          </div>
          <div className="absolute inset-x-0 bottom-1 text-center text-[9px] text-white/50 tabular-nums">{Math.round(((-playerYaw * 180) / Math.PI + 360) % 360)}°</div>
        </div>
        <div className="pt-1">
          <div className={label}>Rank {level}</div>
          <div className="text-sm font-bold leading-tight">{rankName}</div>
          <div className="mt-1.5 w-28 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (xp / xpToNextLevel) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ---------- Top-center: objective / score ---------- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div className="flex items-stretch rounded-lg overflow-hidden border border-white/10 bg-black/55 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          <div className="px-3 py-1.5 bg-cyan-500/20 text-center min-w-[64px]">
            <div className={`text-xl font-black leading-none ${num}`}>{myKills}</div>
            <div className="text-[9px] text-cyan-200/70 tracking-[0.2em] mt-0.5">YOU</div>
          </div>
          <div className="px-3 py-1.5 text-center min-w-[88px] flex flex-col justify-center">
            <div className={label}>First to {targetKills}</div>
            <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, (myKills / targetKills) * 100)}%` }} />
            </div>
          </div>
          <div className="px-3 py-1.5 bg-red-500/20 text-center min-w-[64px]">
            <div className={`text-xl font-black leading-none ${num}`}>{topEnemy}</div>
            <div className="text-[9px] text-red-200/70 tracking-[0.2em] mt-0.5">TOP OP</div>
          </div>
        </div>
      </div>

      {/* XP toasts + rank up + streak */}
      <div className="absolute top-[14%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none">
        {levelUpNotification && (
          <div className="px-5 py-1.5 rounded-md bg-amber-400 text-black font-black text-sm tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.6)]">RANK UP — {levelUpNotification}</div>
        )}
        {killStreak >= 2 && (
          <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-black/60 border border-amber-400/50 text-amber-300 font-black text-sm tracking-wide">
            <Flame className="w-4 h-4" />
            {killStreak === 2 ? 'DOUBLE KILL' : killStreak === 3 ? 'TRIPLE KILL' : killStreak === 4 ? 'QUAD KILL' : `${killStreak} KILL STREAK`}
          </div>
        )}
        {xpGains.slice(-3).map(g => (
          <div key={g.id} className="text-[12px] font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] animate-fade-in">
            +{g.amount} XP <span className="text-white/60 font-medium">{g.reason}</span>
          </div>
        ))}
      </div>

      {/* ---------- Top-right: kill feed + perf chip ---------- */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 w-80">
        <div className="flex items-center gap-2 text-[10px] text-white/55 tabular-nums">
          <span className={fps >= 60 ? 'text-emerald-300/80' : 'text-amber-300/90'}>{fps} FPS</span>
          <span className="text-white/25">·</span>
          <span>{allPlayers.length > 1 ? `${allPlayers[0]?.ping || 18} ms` : 'HOST'}</span>
          <span className="text-white/25">·</span>
          <span className="uppercase">{preset}{presetAuto ? " · auto" : ""}</span>
          {!isWebGPU && <span className="text-amber-300/80">· WebGL</span>}
        </div>
        {killFeed.slice(-6).map((kf) => (
          <div key={kf.id} className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-sm border border-white/10 text-[11px] animate-fade-in">
            <span className={`font-bold ${kf.killer === 'COMMANDER' || kf.killer === 'YOU' ? 'text-cyan-300' : 'text-white'}`}>{kf.killer}</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-medium">{shortNames[kf.weapon]}</span>
            {kf.isHeadshot && <span className="text-amber-300 text-[10px] font-bold">HS</span>}
            <span className="font-bold text-red-300">{kf.victim}</span>
          </div>
        ))}
      </div>

      {/* ---------- Center: crosshair / reticles ---------- */}
      {!isADS && (
        <div className="absolute top-1/2 left-1/2 pointer-events-none">
          {[
            { w: 2, h: 7, x: -1, y: -(crosshairGap + 7) },
            { w: 2, h: 7, x: -1, y: crosshairGap },
            { w: 7, h: 2, x: -(crosshairGap + 7), y: -1 },
            { w: 7, h: 2, x: crosshairGap, y: -1 },
          ].map((b, i) => (
            <div key={i} className="absolute bg-[#36ff8a]" style={{ width: b.w, height: b.h, left: b.x, top: b.y, boxShadow: '0 0 0 1px rgba(0,0,0,0.75)' }} />
          ))}
          <div className="absolute w-[2px] h-[2px] -ml-px -mt-px bg-[#36ff8a]" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.75)' }} />
          {moving && <div className="absolute left-1/2 -translate-x-1/2 top-9 text-[9px] tracking-[0.25em] text-white/40">MOVING</div>}
        </div>
      )}

      {isADS && weapon === 'railgun' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black" style={{
            maskImage: 'radial-gradient(circle 40vh at center, transparent 98.5%, black 100%)',
            WebkitMaskImage: 'radial-gradient(circle 40vh at center, transparent 98.5%, black 100%)' }} />
          <div className="w-[80vh] h-[80vh] rounded-full relative flex items-center justify-center" style={{ boxShadow: 'inset 0 0 90px rgba(0,0,0,0.9), inset 0 0 6px rgba(0,0,0,1)' }}>
            <div className="absolute w-full h-px bg-black/85" />
            <div className="absolute h-full w-px bg-black/85" />
            {[-120, -80, -40, 40, 80, 120].map(o => <div key={`h${o}`} className="absolute h-2 w-px bg-black/70" style={{ left: `calc(50% + ${o}px)` }} />)}
            {[40, 80, 120].map(o => <div key={`v${o}`} className="absolute w-2 h-px bg-black/70" style={{ top: `calc(50% + ${o}px)` }} />)}
            <div className="w-1 h-1 bg-red-500 rounded-full shadow-[0_0_4px_#ef4444]" />
          </div>
          {moving && <div className="absolute top-[18%] text-red-400 font-bold text-xs tracking-[0.3em] animate-pulse">UNSTABLE — STOP TO FIRE</div>}
        </div>
      )}

      {isADS && weapon !== 'railgun' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-7 h-7 rounded-full border border-cyan-300/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee]" />
          </div>
        </div>
      )}

      {hitmarkerState && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hitmarker-pop">
          <div className="relative w-7 h-7">
            {[45, -45, -45, 45].map((r, i) => (
              <div key={i} className={`absolute w-3 h-[2px] ${hitmarkerState === 'headshot' ? 'bg-amber-300' : hitmarkerState === 'shield_break' ? 'bg-cyan-300' : 'bg-white'}`}
                style={{ transform: `rotate(${r}deg)`, left: i % 2 === 0 ? 0 : 'auto', right: i % 2 === 1 ? 0 : 'auto', top: i < 2 ? 0 : 'auto', bottom: i >= 2 ? 0 : 'auto', boxShadow: '0 0 0 1px rgba(0,0,0,0.6)' }} />
            ))}
          </div>
        </div>
      )}

      {floatingDamages.map((dmg) => (
        <div key={dmg.id} className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 font-black tabular-nums ${dmg.isHeadshot ? 'text-amber-300 text-lg' : 'text-white text-sm'}`}
          style={{ left: dmg.x, top: dmg.y, opacity: dmg.opacity, textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>
          {dmg.damage}
        </div>
      ))}

      {/* ---------- Bottom-left: vitals ---------- */}
      <div className={`absolute bottom-0 left-0 pl-6 pb-6 pr-24 pt-10 ${panelL}`}>
        <div className="flex items-end gap-3">
          <div className={`text-[56px] font-black leading-none ${num} ${health < 35 ? 'text-red-400' : 'text-white'}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>{Math.max(0, Math.round(health))}</div>
          <div className="pb-2 w-44">
            <div className="flex justify-between items-baseline mb-1">
              <span className={label}>Health</span>
              {armor > 0 && <span className={`text-[11px] font-bold text-cyan-300 ${num}`}>⛨ {Math.max(0, Math.round(armor))}</span>}
            </div>
            <div className="h-2 bg-white/10 rounded-sm overflow-hidden">
              <div className={`h-full transition-all duration-150 ${health < 35 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${hpPct}%` }} />
            </div>
            <div className="h-1 mt-1 bg-white/10 rounded-sm overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${armorPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Bottom-right: weapon ---------- */}
      <div className={`absolute bottom-0 right-0 pr-6 pb-6 pl-24 pt-10 ${panelR} text-right`}>
        <div className="flex items-end justify-end gap-4">
          <div className="pb-2">
            <div className="text-sm font-bold tracking-wide">{currentWeaponDef.name}</div>
            <div className="text-[10px] text-white/45">{currentWeaponDef.category.split(' (')[0]}{activeSkinName !== 'Standard' ? ` · ${activeSkinName}` : ''}</div>
          </div>
          {currentWeaponDef.isMelee ? (
            <div className="flex items-center gap-2 text-2xl font-black"><Sword className="w-6 h-6 text-cyan-300" /> READY</div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className={`text-[56px] font-black leading-none ${num} ${lowAmmo ? 'text-red-400' : 'text-white'} ${ammo === 0 ? 'animate-pulse' : ''}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>{ammo}</span>
              <span className={`text-lg font-semibold text-white/45 ${num}`}>/ {reserveAmmo}</span>
            </div>
          )}
        </div>

        {/* reload / prompt line */}
        <div className="h-5 mt-1 flex items-center justify-end">
          {isReloading ? (
            <div className="w-56 h-1 bg-white/10 rounded-sm overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${reloadProgress * 100}%` }} />
            </div>
          ) : ammo === 0 && !currentWeaponDef.isMelee ? (
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-300 animate-pulse">PRESS R TO RELOAD</span>
          ) : lowAmmo ? (
            <span className="text-[10px] tracking-[0.2em] text-amber-300/90">LOW AMMO</span>
          ) : null}
        </div>

        {/* weapon rail */}
        <div className="flex justify-end gap-1 mt-2 pointer-events-auto">
          {arsenal.map((w, idx) => {
            const cur = weapon === w;
            return (
              <button key={w} onClick={() => onSelectWeaponSlot?.(w)} title={`${idx + 1} — ${WEAPON_DEFINITIONS[w].name}`}
                className={`relative px-2 h-7 rounded-[4px] text-[10px] font-bold transition-all ${cur ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}>
                {shortNames[w]}
                <span className={`absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full text-[8px] leading-[14px] text-center ${cur ? 'bg-amber-400 text-black' : 'bg-black/70 text-white/50'}`}>{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- Bottom-center: contextual hint ---------- */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-white/30">
        TAB SCOREBOARD · B ARMORY · F INSPECT · ESC MENU
      </div>

      {/* ---------- Scoreboard (hold Tab) ---------- */}
      {showLeaderboard && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
          <div className="w-[720px] max-w-[94vw] rounded-xl border border-white/10 bg-[#0b0e14]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-base font-black tracking-wide">SCOREBOARD</div>
                  <div className="text-[11px] text-white/45">First to {targetKills} · {isHost ? 'Hosting' : 'Peer'}{roomId ? ` · Room ${roomId}` : ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded bg-amber-400/15 text-amber-300 font-bold flex items-center gap-1"><Coins className="w-3.5 h-3.5" />{coins.toLocaleString()}</span>
                <span className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${antiCheatViolations > 0 ? 'bg-red-500/15 text-red-300' : 'bg-cyan-400/10 text-cyan-300'}`}><ShieldCheck className="w-3.5 h-3.5" />{antiCheatStatus}</span>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="px-6 py-2 font-semibold tracking-wider">OPERATOR</th>
                  <th className="py-2 font-semibold tracking-wider">TYPE</th>
                  <th className="py-2 text-right font-semibold tracking-wider">K</th>
                  <th className="py-2 text-right font-semibold tracking-wider">D</th>
                  <th className="py-2 text-right font-semibold tracking-wider">K/D</th>
                  <th className="px-6 py-2 text-right font-semibold tracking-wider">PING</th>
                </tr>
              </thead>
              <tbody>
                {[...allPlayers].sort((a, b) => b.kills - a.kills).map((p) => (
                  <tr key={p.id} className={`border-b border-white/5 ${p.id === 'local' ? 'bg-cyan-400/10' : ''}`}>
                    <td className="px-6 py-2.5 font-bold">{p.name}{p.id === 'local' && <span className="ml-2 text-[9px] text-cyan-300">YOU</span>}</td>
                    <td className="py-2.5 text-white/50">{p.isHost ? 'Host' : p.isBot ? 'Bot' : 'Peer'}</td>
                    <td className={`py-2.5 text-right font-bold ${num}`}>{p.kills}</td>
                    <td className={`py-2.5 text-right text-white/60 ${num}`}>{p.deaths}</td>
                    <td className={`py-2.5 text-right ${num}`}>{(p.kills / Math.max(1, p.deaths)).toFixed(2)}</td>
                    <td className={`px-6 py-2.5 text-right text-white/50 ${num}`}>{p.ping} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-3 bg-black/30 text-[11px]">
              <div className="flex items-center gap-2">
                <button onClick={onToggleBots} className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-semibold ${botsEnabled ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10' : 'border-white/15 text-white/50'}`}>
                  <Bot className="w-3.5 h-3.5" /> Bots {botsEnabled ? 'on' : 'off'}
                </button>
                <button onClick={onToggleBotDifficulty} className="px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:text-white font-semibold capitalize">
                  {botDifficulty}
                </button>
                <span className="text-white/35 ml-2">{isWebGPU ? 'WebGPU' : 'WebGL'} · {latencyMs.toFixed(2)} ms raycast · {myKills}/{myDeaths} K/D</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onOpenSettings} className="px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:text-white flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</button>
                <button onClick={onOpenLobby} className="px-2.5 py-1 rounded-md border border-white/15 text-white/70 hover:text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Lobby</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Death screen ---------- */}
      {isDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto z-50 animate-fade-in" style={{ background: 'radial-gradient(ellipse at center, rgba(60,0,8,0.55) 0%, rgba(0,0,0,0.85) 100%)' }}>
          <div className="text-[11px] tracking-[0.5em] text-red-300/80 mb-2">ELIMINATED</div>
          <div className="text-3xl font-black tracking-wide mb-1">by {killerName}</div>
          <div className={`text-white/50 text-sm mb-8 ${num}`}>Redeploying in {respawnCountdown}s</div>
          <button onClick={onRespawn} className="px-8 py-3 rounded-lg bg-white text-black font-black text-sm tracking-wide hover:bg-cyan-200 transition">
            DEPLOY NOW <span className="text-black/50 font-semibold ml-1">SPACE</span>
          </button>
        </div>
      )}
    </div>
  );
};
