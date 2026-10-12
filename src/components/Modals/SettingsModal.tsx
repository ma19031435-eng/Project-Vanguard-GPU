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
  presetSource?: 'auto' | 'manual';
  onAutoPreset?: () => void;
  renderScale?: number;
  onRenderScaleChange?: (v: number) => void;
  dynamicResolution?: boolean;
  onDynamicResolutionChange?: (v: boolean) => void;
  sharpness?: number;
  onSharpnessChange?: (v: number) => void;
  postStyle?: 'competitive' | 'cinematic';
  onPostStyleChange?: (v: 'competitive' | 'cinematic') => void;
  rawInput?: boolean;
  onRawInputChange?: (v: boolean) => void;
  hardware?: { preset: GraphicsPreset; score: number; gpu: string; cores: number; memoryGb: number | null; isMobile: boolean; reasons: string[] };
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
  onBotDifficultyChange,
  presetSource = 'manual',
  onAutoPreset,
  hardware,
  renderScale = 1,
  onRenderScaleChange,
  dynamicResolution = true,
  onDynamicResolutionChange,
  sharpness = 0.35,
  onSharpnessChange,
  postStyle = 'competitive',
  onPostStyleChange,
  rawInput = true,
  onRawInputChange,
}) => {
  const Toggle = ({ value, onChange, labels = ['ON', 'OFF'] }: { value: boolean; onChange?: (v: boolean) => void; labels?: [string, string] }) => (
    <div className="grid grid-cols-2 gap-1">
      {[true, false].map((v, i) => (
        <button key={String(v)} onClick={() => onChange?.(v)}
          className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${value === v ? 'bg-cyan-950/80 border-cyan-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
          {labels[i]}
        </button>
      ))}
    </div>
  );
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 hud-font select-none" onClick={onClose}>
      <div
        className="bg-zinc-950 border border-cyan-500/40 rounded-2xl w-full max-w-xl shadow-2xl text-zinc-200 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header — always reachable close button */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base sm:text-lg">
            <Sliders className="w-5 h-5 text-cyan-400" /> SETTINGS
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 -mr-2 hover:bg-zinc-800 active:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white transition pointer-events-auto"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Monitor className="w-4 h-4 text-cyan-400" /> GRAPHICS QUALITY
            </div>
            <button
              onClick={onAutoPreset}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${presetSource === 'auto' ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}
              title="Let the hardware profiler and runtime governor manage quality"
            >
              {presetSource === 'auto' ? '● AUTO (ACTIVE)' : 'USE AUTO'}
            </button>
          </div>
          {hardware && (
            <div className="mb-3 p-2.5 rounded-lg bg-black/40 border border-zinc-800 text-[11px] text-zinc-400">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-zinc-200 font-semibold truncate max-w-[60%]" title={hardware.gpu}>{hardware.gpu}</span>
                <span>{hardware.cores} threads</span>
                {hardware.memoryGb !== null && <span>{hardware.memoryGb} GB</span>}
                {hardware.isMobile && <span>mobile</span>}
                <span className="ml-auto text-cyan-300 font-bold">Score {hardware.score}/100 → {hardware.preset.toUpperCase()}</span>
              </div>
              {hardware.reasons.length > 0 && <div className="mt-1 text-zinc-500">{hardware.reasons.join(' · ')}</div>}
              <div className="mt-1 text-zinc-500">Auto mode also scales render resolution live and steps the preset down if the frame rate can't hold.</div>
            </div>
          )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

        {/* Competitive display & clarity */}
        <div className="mb-2 text-xs font-bold text-zinc-300 flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /> COMPETITIVE DISPLAY</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-zinc-300 font-bold">RENDER SCALE</span>
              <span className="text-cyan-400 font-bold">{Math.round(renderScale * 100)}%</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.05" value={renderScale}
              onChange={(e) => onRenderScaleChange?.(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer" />
            <div className="text-[10px] text-zinc-500 mt-1">On top of the preset. 100% = preset native; above 100% supersamples.</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-300 font-bold mb-2">DYNAMIC RESOLUTION</div>
            <Toggle value={dynamicResolution} onChange={onDynamicResolutionChange} />
            <div className="text-[10px] text-zinc-500 mt-1">Off = always native. On = scales down only to hold frame rate (never below 85% on High+).</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-zinc-300 font-bold">SHARPENING</span>
              <span className="text-cyan-400 font-bold">{Math.round(sharpness * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={sharpness}
              onChange={(e) => onSharpnessChange?.(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer" />
            <div className="text-[10px] text-zinc-500 mt-1">Contrast-adaptive sharpen after anti-aliasing. Restores edge detail without halos.</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
            <div className="text-xs text-zinc-300 font-bold mb-2">POST STYLE</div>
            <Toggle value={postStyle === 'competitive'} onChange={(v) => onPostStyleChange?.(v ? 'competitive' : 'cinematic')} labels={['COMPETITIVE', 'CINEMATIC']} />
            <div className="text-[10px] text-zinc-500 mt-1">Competitive removes chromatic aberration and film grain for maximum clarity.</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl sm:col-span-2">
            <div className="text-xs text-zinc-300 font-bold mb-2">RAW MOUSE INPUT</div>
            <Toggle value={rawInput} onChange={onRawInputChange} />
            <div className="text-[10px] text-zinc-500 mt-1">Bypasses OS pointer acceleration and scaling (Chromium / Edge). Re-locks on next click.</div>
          </div>
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

        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-zinc-800 flex justify-end bg-zinc-950 rounded-b-2xl" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 sm:py-2 px-6 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-300 text-black font-bold text-xs rounded-xl transition shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
