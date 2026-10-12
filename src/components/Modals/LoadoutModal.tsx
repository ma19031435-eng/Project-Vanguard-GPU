/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pre-round DEPLOY screen. The player builds a loadout of one PRIMARY, one SECONDARY and one
 * MELEE weapon before entering the arena (and again on any respawn via "Change loadout").
 * Keyboard: 1/2/3 select slot, arrows/WASD move, Enter/Space deploy, Esc deploy.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Shield, Swords, Zap, Timer, Target, Package } from 'lucide-react';
import {
  Loadout, LOADOUT_SLOTS, WeaponSlot, WeaponType, WEAPON_DEFINITIONS, weaponsForSlot
} from '../../engine/weapons/WeaponSystem.ts';

interface LoadoutModalProps {
  isOpen: boolean;
  loadout: Loadout;
  onChange: (next: Loadout) => void;
  onDeploy: () => void;
}

const SLOT_META: Record<WeaponSlot, { label: string; key: string; icon: React.ReactNode; hint: string }> = {
  primary: { label: 'PRIMARY', key: '1', icon: <Crosshair className="w-4 h-4" />, hint: 'Your main gun. Rifles, snipers, shotguns, launchers.' },
  secondary: { label: 'SECONDARY', key: '2', icon: <Shield className="w-4 h-4" />, hint: 'Sidearm for when the primary runs dry.' },
  melee: { label: 'MELEE', key: '3', icon: <Swords className="w-4 h-4" />, hint: 'Always ready. Faster movement while drawn.' },
};

/** Normalised 0..1 stat bars so weapons are comparable at a glance. */
function statBars(w: WeaponType) {
  const d = WEAPON_DEFINITIONS[w];
  const perShot = d.damage * d.pelletCount;
  const dps = perShot * (d.fireRateRpm / 60);
  return [
    { label: 'DMG', value: Math.min(1, perShot / 150), text: `${perShot}` },
    { label: 'DPS', value: Math.min(1, dps / 900), text: `${Math.round(dps)}` },
    { label: 'RATE', value: Math.min(1, d.fireRateRpm / 1000), text: `${d.fireRateRpm}` },
    { label: 'RANGE', value: d.isMelee ? 0.05 : Math.min(1, d.range / 260), text: d.isMelee ? 'melee' : `${d.range}m` },
    { label: 'CTRL', value: Math.max(0, 1 - (d.recoilKickPitch * 4 + d.baseSpread * 8)), text: '' },
  ];
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({ isOpen, loadout, onChange, onDeploy }) => {
  const [slot, setSlot] = useState<WeaponSlot>('primary');
  const options = useMemo(() => weaponsForSlot(slot), [slot]);
  const selected = loadout[slot];
  const selDef = WEAPON_DEFINITIONS[selected];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') setSlot('primary');
      else if (e.code === 'Digit2') setSlot('secondary');
      else if (e.code === 'Digit3') setSlot('melee');
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); onDeploy(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        const dir = e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : -1;
        const list = weaponsForSlot(slot);
        const i = Math.max(0, list.indexOf(loadout[slot]));
        onChange({ ...loadout, [slot]: list[(i + dir + list.length) % list.length] });
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') setSlot(LOADOUT_SLOTS[(LOADOUT_SLOTS.indexOf(slot) + 1) % 3]);
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') setSlot(LOADOUT_SLOTS[(LOADOUT_SLOTS.indexOf(slot) + 2) % 3]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, slot, loadout, onChange, onDeploy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 hud-font select-none">
      <div className="w-full max-w-5xl bg-zinc-950/95 border border-cyan-500/30 rounded-2xl shadow-2xl text-zinc-200 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[94dvh]">
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-7 pt-5 pb-3 border-b border-zinc-800 flex items-end justify-between" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <div>
            <div className="text-[10px] tracking-[0.5em] text-cyan-400/80">PRE-ROUND</div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-white">SELECT LOADOUT</h2>
          </div>
          <div className="hidden sm:block text-[10px] text-zinc-500 text-right leading-5">
            <div><b className="text-zinc-300">1 / 2 / 3</b> slot &nbsp; <b className="text-zinc-300">◀ ▶</b> weapon</div>
            <div><b className="text-zinc-300">ENTER</b> deploy</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-7 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Slot column */}
          <div className="flex lg:flex-col gap-2">
            {LOADOUT_SLOTS.map((s) => {
              const w = loadout[s];
              const d = WEAPON_DEFINITIONS[w];
              const active = slot === s;
              return (
                <button key={s} onClick={() => setSlot(s)}
                  className={`flex-1 text-left rounded-xl border p-3 transition ${active ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.3)]' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600'}`}>
                  <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-400">
                    <span className="flex items-center gap-1.5">{SLOT_META[s].icon}{SLOT_META[s].label}</span>
                    <span className={`w-5 h-5 rounded text-center leading-5 font-black ${active ? 'bg-cyan-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}>{SLOT_META[s].key}</span>
                  </div>
                  <div className="mt-1.5 font-black text-white text-sm truncate" style={{ color: d.color }}>{d.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{d.category}</div>
                </button>
              );
            })}
          </div>

          {/* Options + details */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="text-[10px] text-zinc-500">{SLOT_META[slot].hint}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {options.map((w) => {
                const d = WEAPON_DEFINITIONS[w];
                const on = selected === w;
                return (
                  <button key={w} onClick={() => onChange({ ...loadout, [slot]: w })} onDoubleClick={onDeploy}
                    className={`relative text-left rounded-xl border p-3 transition group ${on ? 'bg-white text-black border-white' : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-500 hover:bg-zinc-900'}`}>
                    <div className="h-1 rounded-full mb-2" style={{ background: d.color, opacity: on ? 1 : 0.7 }} />
                    <div className="font-black text-[13px] leading-tight truncate">{d.name}</div>
                    <div className={`text-[10px] truncate ${on ? 'text-black/60' : 'text-zinc-500'}`}>{d.category}</div>
                    <div className={`mt-2 flex items-center gap-3 text-[10px] font-bold ${on ? 'text-black/70' : 'text-zinc-400'}`}>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{d.damage * d.pelletCount}</span>
                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{d.fireRateRpm}</span>
                      {!d.isMelee && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{d.magazineSize}</span>}
                    </div>
                    {on && <div className="absolute top-2 right-2 text-[9px] font-black tracking-widest bg-black text-white px-1.5 py-0.5 rounded">EQUIPPED</div>}
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-400"><Target className="w-3.5 h-3.5" />{SLOT_META[slot].label}</div>
                <div className="text-xl font-black text-white mt-0.5" style={{ color: selDef.color }}>{selDef.name}</div>
                <div className="text-[11px] text-zinc-300 mt-1">{selDef.role}</div>
                <div className="text-[10px] text-zinc-500 mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums">
                  <span>Headshot ×{selDef.headshotMultiplier}</span>
                  <span>{selDef.isMelee ? 'No ammo' : `Mag ${selDef.magazineSize} · reload ${selDef.reloadTimeSec}s`}</span>
                  <span>{selDef.isAutomatic ? 'Automatic' : 'Semi-automatic'}</span>
                  <span>{selDef.pelletCount > 1 ? `${selDef.pelletCount} pellets` : selDef.isExplosive ? 'Splash damage' : selDef.adsZoom && selDef.adsZoom <= 0.6 ? 'Scoped' : 'Hitscan'}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 justify-center">
                {statBars(selected).map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-[10px]">
                    <span className="w-11 text-zinc-500 font-bold">{b.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(b.value * 100)}%`, background: selDef.color }} />
                    </div>
                    <span className="w-10 text-right text-zinc-400 tabular-nums">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-7 py-3 border-t border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950 rounded-b-2xl" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="text-[10px] text-zinc-500 hidden sm:flex items-center gap-2">
            <span className="font-bold text-zinc-300">{WEAPON_DEFINITIONS[loadout.primary].name}</span>·
            <span className="font-bold text-zinc-300">{WEAPON_DEFINITIONS[loadout.secondary].name}</span>·
            <span className="font-bold text-zinc-300">{WEAPON_DEFINITIONS[loadout.melee].name}</span>
          </div>
          <button onClick={onDeploy} autoFocus
            className="ml-auto px-8 py-3 rounded-lg bg-cyan-400 text-black font-black text-sm tracking-[0.2em] hover:bg-cyan-300 active:scale-[0.98] transition shadow-[0_0_24px_rgba(34,211,238,0.35)]">
            DEPLOY <span className="text-black/50 font-semibold ml-2">ENTER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
