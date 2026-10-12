/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart hardware detection → starting graphics preset.
 *
 * Static signals (instant, before the first frame):
 *   - GPU renderer string via WEBGL_debug_renderer_info (vendor/model family heuristics)
 *   - CPU threads, device memory, touch/mobile, screen pixel count, max texture size, WebGPU availability
 * Dynamic signal (first seconds of play):
 *   - measured frame time → AdaptiveQuality steps the preset down (or up) while in "auto" mode and
 *     continuously scales render resolution to hold the target frame rate.
 */
import type { GraphicsPreset } from '../webgpu/WebGPUPipeline';

export interface HardwareProfile {
  preset: GraphicsPreset;
  score: number;          // 0..100 synthetic
  gpu: string;
  vendor: string;
  cores: number;
  memoryGb: number | null;
  isMobile: boolean;
  pixels: number;
  webgpu: boolean;
  reasons: string[];
}

const PRESET_ORDER: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra', 'overdrive'];
export const presetIndex = (p: GraphicsPreset): number => PRESET_ORDER.indexOf(p);
export const presetAt = (i: number): GraphicsPreset => PRESET_ORDER[Math.max(0, Math.min(PRESET_ORDER.length - 1, i))];

function readGpuInfo(): { gpu: string; vendor: string; maxTex: number } {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { gpu: 'none', vendor: 'none', maxTex: 0 };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { gpu, vendor, maxTex };
  } catch {
    return { gpu: 'unknown', vendor: 'unknown', maxTex: 0 };
  }
}

/** Rough GPU class from the renderer string: 0 = software/very weak … 4 = flagship. */
export function classifyGpu(gpu: string, reasons: string[]): number {
  const g = gpu.toLowerCase();
  const num = (re: RegExp): number => { const m = g.match(re); return m ? parseInt(m[1], 10) : 0; };

  if (/swiftshader|llvmpipe|software|microsoft basic|mesa offscreen/.test(g)) { reasons.push('Software renderer'); return 0; }

  // NVIDIA
  if (/rtx\s?50\d\d/.test(g)) { reasons.push('NVIDIA RTX 50-series'); return 4; }
  if (/rtx\s?40\d\d/.test(g)) { reasons.push('NVIDIA RTX 40-series'); return num(/rtx\s?40(\d)\d/) >= 7 ? 4 : 3; }
  if (/rtx\s?30\d\d/.test(g)) { reasons.push('NVIDIA RTX 30-series'); return num(/rtx\s?30(\d)\d/) >= 7 ? 4 : 3; }
  if (/rtx\s?20\d\d/.test(g)) { reasons.push('NVIDIA RTX 20-series'); return 3; }
  if (/gtx\s?16\d\d/.test(g)) { reasons.push('NVIDIA GTX 16-series'); return 2; }
  if (/gtx\s?10\d\d/.test(g)) { reasons.push('NVIDIA GTX 10-series'); return num(/gtx\s?10(\d)\d/) >= 6 ? 2 : 1; }
  if (/gtx\s?9\d\d/.test(g)) { reasons.push('NVIDIA GTX 900-series'); return 1; }
  if (/\bmx\d{3}\b/.test(g)) { reasons.push('NVIDIA MX laptop GPU'); return 1; }
  if (/geforce|nvidia/.test(g)) { reasons.push('Older NVIDIA GPU'); return 1; }

  // AMD
  if (/rx\s?7\d{3}/.test(g)) { reasons.push('AMD RX 7000-series'); return num(/rx\s?7(\d)\d\d/) >= 7 ? 4 : 3; }
  if (/rx\s?6\d{3}/.test(g)) { reasons.push('AMD RX 6000-series'); return num(/rx\s?6(\d)\d\d/) >= 7 ? 4 : 3; }
  if (/rx\s?5\d{3}/.test(g)) { reasons.push('AMD RX 5000-series'); return 2; }
  if (/rx\s?(4|5)\d\d\b|vega/.test(g)) { reasons.push('AMD Polaris/Vega'); return 2; }
  if (/radeon.*(graphics|680m|780m|890m)/.test(g) && /\b(680m|780m|890m)\b/.test(g)) { reasons.push('AMD RDNA iGPU'); return 2; }
  if (/radeon/.test(g)) { reasons.push('AMD integrated/older Radeon'); return 1; }

  // Apple
  if (/apple m[34]/.test(g) || /apple gpu/.test(g) && /max|ultra|pro/.test(g)) { reasons.push('Apple Silicon (recent)'); return 3; }
  if (/apple m[12]/.test(g)) { reasons.push('Apple Silicon M1/M2'); return /max|ultra|pro/.test(g) ? 3 : 2; }
  if (/apple/.test(g)) { reasons.push('Apple GPU'); return 2; }

  // Intel
  if (/arc\s?(a|b)\d{3}/.test(g)) { reasons.push('Intel Arc'); return 2; }
  if (/iris xe|iris\(r\) xe/.test(g)) { reasons.push('Intel Iris Xe'); return 1; }
  if (/uhd graphics 7\d\d|uhd graphics 6[3-5]\d/.test(g)) { reasons.push('Intel UHD (recent)'); return 1; }
  if (/intel.*(hd|uhd) graphics/.test(g)) { reasons.push('Intel HD/UHD integrated'); return 0; }
  if (/intel/.test(g)) { reasons.push('Intel integrated'); return 0; }

  // Mobile
  if (/adreno\s?\(?tm\)?\s?(7|8)\d\d/.test(g) || /adreno 7\d\d|adreno 8\d\d/.test(g)) { reasons.push('Qualcomm Adreno 7xx/8xx'); return 2; }
  if (/adreno/.test(g)) { reasons.push('Qualcomm Adreno'); return 1; }
  if (/mali-g7|immortalis/.test(g)) { reasons.push('ARM Mali G7x/Immortalis'); return 2; }
  if (/mali/.test(g)) { reasons.push('ARM Mali'); return 0; }
  if (/powervr|xclipse|samsung/.test(g)) { reasons.push('Mobile GPU'); return 1; }

  // ANGLE strings sometimes hide the model: fall back to vendor guesses
  if (/angle/.test(g)) { reasons.push('ANGLE (unknown GPU model)'); return 1; }
  reasons.push('Unknown GPU — conservative default');
  return 1;
}

export function profileHardware(): HardwareProfile {
  const reasons: string[] = [];
  const { gpu, vendor, maxTex } = readGpuInfo();
  const cores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  const isMobile = (navigator.maxTouchPoints ?? 0) > 0 && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const pixels = Math.round(window.screen.width * window.screen.height * (window.devicePixelRatio || 1));
  const webgpu = 'gpu' in navigator;

  const gpuClass = classifyGpu(gpu, reasons);
  let score = [12, 32, 55, 78, 95][gpuClass];

  if (cores <= 2) { score -= 15; reasons.push('≤2 CPU threads'); }
  else if (cores <= 4) { score -= 6; reasons.push('4 CPU threads'); }
  else if (cores >= 12) { score += 4; }
  if (memoryGb !== null) {
    if (memoryGb <= 2) { score -= 15; reasons.push('≤2 GB RAM'); }
    else if (memoryGb <= 4) { score -= 8; reasons.push('4 GB RAM'); }
  }
  if (isMobile) { score -= 12; reasons.push('Touch/mobile device'); }
  if (pixels > 3840 * 2160 * 0.9) { score -= 10; reasons.push('4K+ display'); }
  else if (pixels > 2560 * 1440 * 0.9) { score -= 5; reasons.push('1440p+ display'); }
  if (maxTex && maxTex < 8192) { score -= 8; reasons.push('Small max texture size'); }
  if (!webgpu) { score -= 3; }

  score = Math.max(0, Math.min(100, score));
  const preset: GraphicsPreset = score < 22 ? 'low' : score < 45 ? 'medium' : score < 68 ? 'high' : score < 88 ? 'ultra' : 'overdrive';
  return { preset, score, gpu, vendor, cores, memoryGb, isMobile, pixels, webgpu, reasons };
}

/**
 * Runtime governor. Feed it frame times every frame; it returns a resolution scale and,
 * when the preset is in auto mode, occasionally recommends stepping the preset.
 */
export class AdaptiveQuality {
  public targetFps = 60;
  public resolutionScale = 1.0;
  public minScale = 0.55;
  public maxScale = 1.0;
  private emaFrameMs = 16.7;
  private warmupUntil = 0;
  private lastStepAt = 0;
  private lastScaleAt = 0;
  private slowAccum = 0;
  private fastAccum = 0;

  constructor(now: number, isMobile: boolean) {
    this.warmupUntil = now + 2500; // shader compiles / first-frame hitches don't count
    if (isMobile) { this.targetFps = 45; this.minScale = 0.45; }
  }

  reset(now: number): void {
    this.warmupUntil = now + 2000;
    this.slowAccum = 0;
    this.fastAccum = 0;
  }

  /** Returns -1 (step preset down), +1 (step up) or 0. Also updates resolutionScale. */
  /** Whether the governor may lower render resolution at all. */
  public enabled = true;

  update(now: number, dtMs: number, autoPreset: boolean, currentPreset: GraphicsPreset): -1 | 0 | 1 {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return 0;
    if (!this.enabled) { this.resolutionScale = 1.0; return 0; }
    // High-end tiers are chosen for image quality: never let them degrade into a blur.
    // Manual picks are sacred too - the player asked for this resolution.
    const tierFloor = presetIndex(currentPreset) >= 2 ? 0.85 : presetIndex(currentPreset) === 1 ? 0.7 : (this.targetFps < 60 ? 0.45 : 0.55);
    const floor = autoPreset ? tierFloor : Math.max(tierFloor, 0.85);
    if (this.resolutionScale < floor) this.resolutionScale = floor;
    this.emaFrameMs += (Math.min(dtMs, 100) - this.emaFrameMs) * 0.08;
    if (now < this.warmupUntil) return 0;

    const targetMs = 1000 / this.targetFps;
    const ratio = this.emaFrameMs / targetMs; // >1 = too slow

    // Resolution scaling: react every 500 ms, small steps, hysteresis
    if (now - this.lastScaleAt > 500) {
      this.lastScaleAt = now;
      if (ratio > 1.12) this.resolutionScale = Math.max(floor, this.resolutionScale - 0.07);
      else if (ratio < 0.8 && this.resolutionScale < this.maxScale) this.resolutionScale = Math.min(this.maxScale, this.resolutionScale + 0.04);
    }

    if (!autoPreset) return 0;
    // Preset stepping: only when resolution scaling alone can't hold the target
    if (ratio > 1.25 && this.resolutionScale <= floor + 0.01) this.slowAccum += dtMs; else this.slowAccum = Math.max(0, this.slowAccum - dtMs * 0.5);
    if (ratio < 0.55 && this.resolutionScale >= this.maxScale - 0.01) this.fastAccum += dtMs; else this.fastAccum = Math.max(0, this.fastAccum - dtMs * 0.5);

    if (now - this.lastStepAt < 8000) return 0;
    if (this.slowAccum > 3000 && currentPreset !== 'low') { this.lastStepAt = now; this.slowAccum = 0; this.resolutionScale = Math.min(1, this.resolutionScale + 0.25); return -1; }
    if (this.fastAccum > 10000 && currentPreset !== 'high') { this.lastStepAt = now; this.fastAccum = 0; return 1; } // auto never climbs past "high"
    return 0;
  }
}
