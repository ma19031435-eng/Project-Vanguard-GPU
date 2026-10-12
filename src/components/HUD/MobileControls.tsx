/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Touch control layer for phones / tablets.
 *  - Left half: floating virtual joystick (appears where the thumb lands) → analog move vector
 *  - Right half: drag to look (delta based, multi-touch safe — one finger per zone)
 *  - Action buttons: FIRE (hold to spray), ADS (toggle), JUMP, CROUCH/SLIDE (hold), RELOAD, weapon prev/next, pause
 * Everything is pointer-event based with per-pointer ownership so a look drag never steals the move stick.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Pause, RotateCcw, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Target } from 'lucide-react';
import type { WeaponType } from '../../engine/weapons/WeaponSystem';

export interface MobileControlsProps {
  onMove: (x: number, y: number) => void; // x: -1..1 strafe, y: -1..1 forward(+)
  onLook: (dx: number, dy: number) => void; // pixels since last event
  onFireStart: () => void;
  onFireEnd: () => void;
  onADSToggle: (ads: boolean) => void;
  onJump: (down: boolean) => void;
  onCrouch: (down: boolean) => void;
  onReload: () => void;
  onCycleWeapon: (dir: 1 | -1) => void;
  onInspect?: () => void;
  onPause: () => void;
  isADS: boolean;
  weapon: WeaponType;
  ammo: number;
  reserveAmmo: number;
  isDead?: boolean;
}

const STICK_RADIUS = 56;

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove, onLook, onFireStart, onFireEnd, onADSToggle, onJump, onCrouch, onReload, onCycleWeapon, onPause,
  isADS, weapon, ammo, reserveAmmo, isDead,
}) => {
  const movePointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const stickOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastLook = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const [crouchHeld, setCrouchHeld] = useState(false);
  const [fireHeld, setFireHeld] = useState(false);

  // Release everything if the component unmounts (death, menu) so no input sticks.
  useEffect(() => () => { onMove(0, 0); onFireEnd(); onJump(false); onCrouch(false); }, [onMove, onFireEnd, onJump, onCrouch]);

  const onZonePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    const isLeft = e.clientX < window.innerWidth * 0.5;
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    if (isLeft && movePointer.current === null) {
      movePointer.current = e.pointerId;
      stickOrigin.current = { x: e.clientX, y: e.clientY };
      setStick({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 });
    } else if (!isLeft && lookPointer.current === null) {
      lookPointer.current = e.pointerId;
      lastLook.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onZonePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === movePointer.current) {
      let dx = e.clientX - stickOrigin.current.x;
      let dy = e.clientY - stickOrigin.current.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) { dx = (dx / len) * STICK_RADIUS; dy = (dy / len) * STICK_RADIUS; }
      // Dead-zone + response curve for fine control near centre
      const mag = Math.min(len / STICK_RADIUS, 1);
      const shaped = mag < 0.12 ? 0 : Math.pow((mag - 0.12) / 0.88, 1.35);
      const nx = len > 0 ? (dx / Math.max(len, 1e-5)) * shaped : 0;
      const ny = len > 0 ? (dy / Math.max(len, 1e-5)) * shaped : 0;
      onMove(nx, -ny);
      setStick({ ox: stickOrigin.current.x, oy: stickOrigin.current.y, dx, dy });
    } else if (e.pointerId === lookPointer.current) {
      const dx = e.clientX - lastLook.current.x;
      const dy = e.clientY - lastLook.current.y;
      lastLook.current = { x: e.clientX, y: e.clientY };
      onLook(dx, dy);
    }
  }, [onMove, onLook]);

  const onZonePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === movePointer.current) {
      movePointer.current = null;
      setStick(null);
      onMove(0, 0);
    } else if (e.pointerId === lookPointer.current) {
      lookPointer.current = null;
    }
  }, [onMove]);

  const hold = (down: () => void, up: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); down(); },
    onPointerUp: (e: React.PointerEvent) => { e.stopPropagation(); up(); },
    onPointerCancel: (e: React.PointerEvent) => { e.stopPropagation(); up(); },
    onPointerLeave: (e: React.PointerEvent) => { e.stopPropagation(); up(); },
  });
  const tap = (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); fn(); },
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
  });

  const btn = 'pointer-events-auto select-none flex items-center justify-center rounded-full border backdrop-blur-md font-black tracking-wider transition-transform active:scale-95';

  if (isDead) return null;

  return (
    <div className="absolute inset-0 z-40 select-none" style={{ touchAction: 'none' }}>
      {/* Movement / look zones */}
      <div
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
        onPointerDown={onZonePointerDown}
        onPointerMove={onZonePointerMove}
        onPointerUp={onZonePointerUp}
        onPointerCancel={onZonePointerUp}
      />

      {/* Floating joystick */}
      {stick && (
        <div className="absolute pointer-events-none" style={{ left: stick.ox - STICK_RADIUS - 14, top: stick.oy - STICK_RADIUS - 14, width: (STICK_RADIUS + 14) * 2, height: (STICK_RADIUS + 14) * 2 }}>
          <div className="absolute inset-0 rounded-full border-2 border-cyan-300/40 bg-black/25" />
          <div
            className="absolute rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.7)]"
            style={{ width: 52, height: 52, left: STICK_RADIUS + 14 - 26 + stick.dx, top: STICK_RADIUS + 14 - 26 + stick.dy }}
          />
        </div>
      )}
      {!stick && (
        <div className="absolute left-10 bottom-16 text-[10px] text-cyan-200/50 tracking-[0.3em] pointer-events-none">◎ DRAG TO MOVE</div>
      )}

      {/* Top-right: pause */}
      <button {...tap(onPause)} className={`${btn} absolute top-3 right-3 w-11 h-11 border-zinc-500/60 bg-black/50 text-white`} aria-label="Pause">
        <Pause className="w-5 h-5" />
      </button>

      {/* Right cluster */}
      <div className="absolute right-4 bottom-6 flex items-end gap-3">
        <div className="flex flex-col items-center gap-3 mb-2">
          <button {...tap(() => onCycleWeapon(-1))} className={`${btn} w-12 h-12 border-zinc-500/60 bg-black/50 text-white`} aria-label="Previous weapon"><ChevronLeft className="w-5 h-5" /></button>
          <button {...tap(() => onCycleWeapon(1))} className={`${btn} w-12 h-12 border-zinc-500/60 bg-black/50 text-white`} aria-label="Next weapon"><ChevronRight className="w-5 h-5" /></button>
          <button {...tap(onReload)} className={`${btn} w-14 h-14 border-amber-400/60 bg-amber-500/20 text-amber-200`} aria-label="Reload">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            {...tap(() => onADSToggle(!isADS))}
            className={`${btn} w-14 h-14 ${isADS ? 'border-cyan-300 bg-cyan-400/40 text-white' : 'border-cyan-400/50 bg-black/50 text-cyan-200'}`}
            aria-label="Aim down sights"
          >
            <Target className="w-6 h-6" />
          </button>
          <button
            {...hold(() => { setFireHeld(true); onFireStart(); }, () => { setFireHeld(false); onFireEnd(); })}
            className={`${btn} w-24 h-24 text-sm ${fireHeld ? 'border-red-300 bg-red-500/60 text-white shadow-[0_0_30px_rgba(239,68,68,0.8)]' : 'border-red-400/70 bg-red-600/35 text-red-100'}`}
            aria-label="Fire"
          >
            <div className="flex flex-col items-center leading-none gap-1">
              <Crosshair className="w-8 h-8" />
              <span className="text-[10px]">{ammo}<span className="opacity-60">/{reserveAmmo}</span></span>
            </div>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 mb-2">
          <button {...hold(() => onJump(true), () => onJump(false))} className={`${btn} w-14 h-14 border-emerald-400/60 bg-emerald-500/20 text-emerald-100`} aria-label="Jump">
            <ArrowUp className="w-6 h-6" />
          </button>
          <button
            {...hold(() => { setCrouchHeld(true); onCrouch(true); }, () => { setCrouchHeld(false); onCrouch(false); })}
            className={`${btn} w-14 h-14 ${crouchHeld ? 'border-violet-300 bg-violet-500/50 text-white' : 'border-violet-400/60 bg-violet-500/20 text-violet-100'}`}
            aria-label="Crouch / slide"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="absolute right-4 top-16 text-[10px] text-zinc-300/60 tracking-[0.25em] pointer-events-none uppercase">{weapon} · drag right side to aim</div>
    </div>
  );
};
