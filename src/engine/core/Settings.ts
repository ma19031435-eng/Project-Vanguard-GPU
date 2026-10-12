/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistent player settings. Versioned, validated and clamped on load so a
 * corrupted or stale localStorage entry can never put the game in a bad state.
 */
import type { GraphicsPreset } from '../webgpu/WebGPUPipeline';

export type BotDifficultySetting = 'easy' | 'balanced' | 'hard';

export interface PlayerSettings {
  version: number;
  mouseSens: number;
  fov: number;
  masterVol: number;
  preset: GraphicsPreset;
  botDifficulty: BotDifficultySetting;
  showDamageNumbers: boolean;
  cameraShake: number; // 0..1 multiplier
  touchMode: 'auto' | 'on' | 'off';
  /** 'auto' = hardware profiler + runtime governor pick the preset; 'manual' = user choice is sacred. */
  presetSource: 'auto' | 'manual';
  /** Manual render-scale multiplier on top of the preset (1 = preset native). */
  renderScale: number;
  /** Allow the runtime governor to lower resolution to hold frame rate. */
  dynamicResolution: boolean;
  /** Post-AA contrast-adaptive sharpening, 0..1. */
  sharpness: number;
  /** Competitive = no aberration/grain, light vignette. */
  postStyle: 'competitive' | 'cinematic';
  /** Raw (unaccelerated, unadjusted) mouse input when the browser supports it. */
  rawInput: boolean;
}

const STORAGE_KEY = 'vanguard.settings.v1';
const VERSION = 1;

export const DEFAULT_SETTINGS: PlayerSettings = {
  version: VERSION,
  mouseSens: 1.0,
  fov: 85,
  masterVol: 0.85,
  preset: 'ultra',
  botDifficulty: 'easy',
  showDamageNumbers: true,
  cameraShake: 1.0,
  touchMode: 'auto',
  presetSource: 'auto',
  renderScale: 1.0,
  dynamicResolution: true,
  sharpness: 0.35,
  postStyle: 'competitive',
  rawInput: true,
};

const PRESETS: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra', 'overdrive'];
const DIFFS: BotDifficultySetting[] = ['easy', 'balanced', 'hard'];

const num = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

export function sanitizeSettings(raw: unknown): PlayerSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    version: VERSION,
    mouseSens: num(r.mouseSens, DEFAULT_SETTINGS.mouseSens, 0.05, 10),
    fov: num(r.fov, DEFAULT_SETTINGS.fov, 60, 120),
    masterVol: num(r.masterVol, DEFAULT_SETTINGS.masterVol, 0, 1),
    preset: PRESETS.includes(r.preset as GraphicsPreset) ? (r.preset as GraphicsPreset) : DEFAULT_SETTINGS.preset,
    botDifficulty: DIFFS.includes(r.botDifficulty as BotDifficultySetting) ? (r.botDifficulty as BotDifficultySetting) : DEFAULT_SETTINGS.botDifficulty,
    showDamageNumbers: typeof r.showDamageNumbers === 'boolean' ? r.showDamageNumbers : DEFAULT_SETTINGS.showDamageNumbers,
    cameraShake: num(r.cameraShake, DEFAULT_SETTINGS.cameraShake, 0, 1),
    touchMode: r.touchMode === 'on' || r.touchMode === 'off' ? r.touchMode : 'auto',
    presetSource: r.presetSource === 'manual' ? 'manual' : 'auto',
    renderScale: num(r.renderScale, 1.0, 0.5, 2.0),
    dynamicResolution: typeof r.dynamicResolution === 'boolean' ? r.dynamicResolution : true,
    sharpness: num(r.sharpness, 0.35, 0, 1),
    postStyle: r.postStyle === 'cinematic' ? 'cinematic' : 'competitive',
    rawInput: typeof r.rawInput === 'boolean' ? r.rawInput : true,
  };
}

export function loadSettings(): PlayerSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced write — sliders can fire dozens of updates per second. */
export function saveSettings(partial: Partial<PlayerSettings>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const merged = sanitizeSettings({ ...loadSettings(), ...partial });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* quota / private mode */ }
    }, 150);
  } catch { /* ignore */ }
}
