/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, Monitor, Volume2, ShieldAlert, Cpu, Target } from 'lucide-react';
import { GraphicsPreset, GRAPHICS_PRESETS } from '../../engine/webgpu/WebGPUPipeline.ts';
import { BotDifficulty } from '../../engine/netcode/BotSimulation.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: GraphicsPreset;
  onSelectPreset: (preset: GraphicsPreset) => void;
  mouseSens: number;
  onMouseSensChange: (val: number) => void;
  fov: number;
  onFovChange: (val: number) => void;
  masterVol: number;
  onMasterVolChange: (val: number) => void;
  isWebGPU: boolean;
  botDifficulty?: BotDifficulty;
  onBotDifficultyChange?: (diff: BotDifficulty) => void;
  cameraShake?: number;
  onCameraShakeChange?: (v: number) => void;
  showDamageNumbers?: boolean;
  onShowDamageNumbersChange?: (v: boolean) => void;
  touchMode?: 'auto' | 'on' | 'off';
  onTouchModeChange?: (m: 'auto' | 'on' | 'off') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  onSelectPreset,
  mouseSens,
  onMouseSensChange,
  fov,
  onFovChange,
  masterVol,
  onMasterVolChange,
  isWebGPU,
  botDifficulty = 'easy',
  cameraShake = 1,
  onCameraShakeChange,
  showDamageNumbers = true,
  onShowDamageNumbersChange,
  touchMode = 'auto',
  onTouchModeChange,
  onBotDifficultyChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
            <Sliders className="w-5 h-5 text-cyan-400" /> VANGUARD SYSTEM CONFIGURATION
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Combat Difficulty (Nerf tuning) */}
        <div className="mb-6 bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold">
              <Target className="w-4 h-4 text-emerald-400" /> BOT COMBAT DIFFICULTY
            </span>
            <span className="text-[11px] text-emerald-400 font-bold uppercase">
              {botDifficulty === 'easy' ? 'Casual / Nerfed (Recommended)' : botDifficulty}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'balanced', 'hard'] as BotDifficulty[]).map((mode) => {
              const isSelected = botDifficulty === mode;
              const title = mode === 'easy' ? 'Casual (Nerfed)' : mode === 'balanced' ? 'Balanced' : 'Hardcore';
              const desc = mode === 'easy' 
                ? 'High spread, relaxed reaction (~1.5s), reduced damage, fun CS2 gunplay' 
                : mode === 'balanced' 
                  ? 'Standard reaction (~1.0s), moderate spread' 
                  : 'Fast reaction, tighter spray';

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onBotDifficultyChange?.(mode)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    isSelected
                      ? 'bg-emerald-950/70 border-emerald-400 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-bold text-xs text-emerald-300">{title}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5 leading-tight">{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Graphics Quality Management Engine Presets */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-3">
            <Monitor className="w-4 h-4 text-cyan-400" /> GRAPHICS QUALITY ENGINE (5 PRESETS)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(GRAPHICS_PRESETS) as GraphicsPreset[]).map((p) => {
              const conf = GRAPHICS_PRESETS[p];
              const isSelected = currentPreset === p;

              return (
                <button
                  key={p}
                  onClick={() => onSelectPreset(p)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-cyan-300">{conf.name}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                    )}
                  </div>
                  <div className="text-[10px] space-y-0.5 text-zinc-400">
                    <div>Particles: {conf.maxComputeParticles.toLocaleString()}</div>
                    <div>Shadows: {conf.shadowMapSize}px ({conf.shadowSoftness})</div>
                    <div>Anisotropy: {conf.anisotropy}x | MSAA: {conf.msaaSamples}x</div>
                  </div>
                </button>
              );
            })}
          </div>

          {currentPreset === 'overdrive' && (
            <div className="mt-3 p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Extreme Overdrive active: Unthrottled supersampling & 1.5M GPU particles. If frame rate drops below 90fps, dynamic asynchronous downscaling will preserve 120Hz responsiveness.
              </span>
            </div>
          )}
        </div>

        {/* Input & Field of View */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-zinc-300 font-bold">MOUSE SENSITIVITY</span>
              <span className="text-cyan-400 font-bold">{mouseSens.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={mouseSens}
              onChange={(e) => onMouseSensChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-zinc-300 font-bold">FIELD OF VIEW (FOV)</span>
              <span className="text-cyan-400 font-bold">{fov}°</span>
            </div>
            <input
              type="range"
              min="75"
              max="115"
              step="1"
              value={fov}
              onChange={(e) => onFovChange(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Audio Engine */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl mb-6">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
              <Volume2 className="w-4 h-4 text-cyan-400" /> MASTER SPATIAL AUDIO VOLUME
            </span>
            <span className="text-cyan-400 font-bold">{Math.round(masterVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVol}
            onChange={(e) => onMasterVolChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Gameplay feel & accessibility */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-zinc-300 font-bold">CAMERA SHAKE</span>
              <span className="text-cyan-400 font-bold">{Math.round(cameraShake * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05" value={cameraShake}
              onChange={(e) => onCameraShakeChange?.(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="text-[10px] text-zinc-500 mt-1">Hit & explosion shake. 0% for motion sensitivity.</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-300 font-bold mb-2">DAMAGE NUMBERS</div>
            <div className="grid grid-cols-2 gap-1">
              {[true, false].map((v) => (
                <button key={String(v)} onClick={() => onShowDamageNumbersChange?.(v)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${showDamageNumbers === v ? 'bg-cyan-950/80 border-cyan-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                  {v ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Floating hit values near the crosshair.</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-300 font-bold mb-2">TOUCH CONTROLS</div>
            <div className="grid grid-cols-3 gap-1">
              {(['auto', 'on', 'off'] as const).map((m) => (
                <button key={m} onClick={() => onTouchModeChange?.(m)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition uppercase ${touchMode === m ? 'bg-cyan-950/80 border-cyan-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Auto detects phones & tablets.</div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            CONFIRM & RETURN TO COMBAT
          </button>
        </div>
      </div>
    </div>
  );
};
