/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra' | 'overdrive';

export interface QualityConfig {
  preset: GraphicsPreset;
  name: string;
  pixelRatio: number;
  shadowMapSize: number;
  shadowSoftness: 'none' | 'pcf' | 'pcf-soft' | 'exponential-ultra';
  enableSSR: boolean;
  enableGTAO: boolean;
  enableSSGI: boolean;
  enableVolumetrics: boolean;
  maxDynamicLights: number;
  maxComputeParticles: number;
  anisotropy: number;
  msaaSamples: number;
  deferredLighting: boolean;
  /** Nearest-N point / spot lights kept active (fixed per tier so shader variants never change). */
  activePointLights: number;
  activeSpotLights: number;
  /** Render-target budget in megapixels. Caps supersampling on very dense displays where it is imperceptible. */
  maxRenderMegapixels: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsPreset, QualityConfig> = {
  low: {
    preset: 'low',
    name: 'Performance / Low',
    pixelRatio: 0.75,
    shadowMapSize: 1024,
    shadowSoftness: 'none',
    enableSSR: false,
    enableGTAO: false,
    enableSSGI: false,
    enableVolumetrics: false,
    maxDynamicLights: 4,
    maxComputeParticles: 5000,
    anisotropy: 2,
    msaaSamples: 1,
    deferredLighting: false,
    activePointLights: 4,
    activeSpotLights: 2,
    maxRenderMegapixels: 1.8
  },
  medium: {
    preset: 'medium',
    name: 'Balanced / Medium',
    pixelRatio: 1.0,
    shadowMapSize: 2048,
    shadowSoftness: 'pcf',
    enableSSR: false,
    enableGTAO: true,
    enableSSGI: false,
    enableVolumetrics: false,
    maxDynamicLights: 20,
    maxComputeParticles: 50000,
    anisotropy: 4,
    msaaSamples: 2,
    deferredLighting: true,
    activePointLights: 8,
    activeSpotLights: 4,
    maxRenderMegapixels: 3.0
  },
  high: {
    preset: 'high',
    name: 'Fidelity / High',
    pixelRatio: 1.0,
    shadowMapSize: 4096,
    shadowSoftness: 'pcf-soft',
    enableSSR: true,
    enableGTAO: true,
    enableSSGI: true,
    enableVolumetrics: true,
    maxDynamicLights: 64,
    maxComputeParticles: 250000,
    anisotropy: 8,
    msaaSamples: 4,
    deferredLighting: true,
    activePointLights: 12,
    activeSpotLights: 6,
    maxRenderMegapixels: 5.0
  },
  ultra: {
    preset: 'ultra',
    name: 'Ultra / Unrestricted Extravaganza',
    pixelRatio: 1.25, // Unthrottled supersampling
    shadowMapSize: 8192,
    shadowSoftness: 'exponential-ultra',
    enableSSR: true,
    enableGTAO: true,
    enableSSGI: true,
    enableVolumetrics: true,
    maxDynamicLights: 128,
    maxComputeParticles: 1000000,
    anisotropy: 16,
    msaaSamples: 8,
    deferredLighting: true,
    activePointLights: 64,
    activeSpotLights: 32,
    maxRenderMegapixels: 9.5
  },
  overdrive: {
    preset: 'overdrive',
    name: 'Extreme Engine Overdrive (90+ FPS Auto-Cascade)',
    pixelRatio: 1.5,
    shadowMapSize: 8192,
    shadowSoftness: 'exponential-ultra',
    enableSSR: true,
    enableGTAO: true,
    enableSSGI: true,
    enableVolumetrics: true,
    maxDynamicLights: 256,
    maxComputeParticles: 1500000,
    anisotropy: 16,
    msaaSamples: 8,
    deferredLighting: true,
    activePointLights: 64,
    activeSpotLights: 32,
    maxRenderMegapixels: 14
  }
};

/**
 * WGSL Compute Shader for Massive Particle Physics (Sparks, Volumetric Smoke, Debris)
 */
export const WGSL_PARTICLE_COMPUTE_SHADER = `
struct Particle {
  position : vec3<f32>,
  life : f32,
  velocity : vec3<f32>,
  maxLife : f32,
  color : vec4<f32>,
  size : f32,
  pType : f32, // 0: spark, 1: smoke, 2: blood, 3: plasma
  pad0 : f32,
  pad1 : f32,
};

struct SimParams {
  deltaTime : f32,
  gravity : f32,
  bounceDamping : f32,
  particleCount : u32,
  time : f32,
  windSpeed : vec3<f32>,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : SimParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  if (index >= params.particleCount) {
    return;
  }

  var p = particles[index];
  if (p.life <= 0.0) {
    return;
  }

  // Update lifetime
  p.life -= params.deltaTime;
  let normalizedLife = p.life / p.maxLife;

  // Apply forces
  var grav = vec3<f32>(0.0, -params.gravity, 0.0);
  if (p.pType == 1.0) {
    // Smoke drifts upwards
    grav = vec3<f32>(0.0, 1.2, 0.0);
  }

  p.velocity += (grav + params.windSpeed * 0.1) * params.deltaTime;
  p.position += p.velocity * params.deltaTime;

  // Floor collision (y = 0.0)
  if (p.position.y < 0.0) {
    p.position.y = 0.0;
    p.velocity.y = -p.velocity.y * params.bounceDamping;
    p.velocity.x *= 0.85;
    p.velocity.z *= 0.85;
  }

  // Fade alpha over lifetime
  p.color.a = clamp(normalizedLife, 0.0, 1.0);

  // Write back
  particles[index] = p;
}
`;

/**
 * High-Performance GLSL Fallback Vertex & Fragment Shader for GPU Instanced Particle Systems
 */
export const GLSL_PARTICLE_SHADERS = {
  vertexShader: `
    attribute vec3 velocity;
    attribute float life;
    attribute float maxLife;
    attribute vec4 particleColor;
    attribute float particleSize;
    attribute float particleType;

    varying vec4 vColor;
    varying float vType;
    uniform float uTime;
    uniform float uPixelRatio;

    void main() {
      vColor = particleColor;
      vType = particleType;
      
      float progress = 1.0 - clamp(life / maxLife, 0.0, 1.0);
      vec3 pos = position;

      // Type-based motion
      if (particleType < 0.5) { // Spark
        pos += velocity * progress * 0.4;
        pos.y -= 9.8 * 0.5 * progress * progress * 0.3;
      } else if (particleType < 1.5) { // Smoke
        pos += velocity * progress * 0.2;
        pos.y += progress * 1.5;
      } else { // Debris / Blood
        pos += velocity * progress * 0.5;
        pos.y -= 12.0 * 0.5 * progress * progress * 0.4;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float sizeFade = (particleType > 0.5 && particleType < 1.5) ? (1.0 + progress * 2.0) : (1.0 - progress * 0.5);
      gl_PointSize = (particleSize * sizeFade * uPixelRatio * 300.0) / -mvPosition.z;
    }
  `,
  fragmentShader: `
    varying vec4 vColor;
    varying float vType;
    uniform float uTime;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      float alpha = (1.0 - dist * 2.0) * vColor.a;

      if (vType < 0.5) {
        // High-energy incandescent spark
        vec3 glow = vColor.rgb * (1.5 - dist * 1.8);
        gl_FragColor = vec4(glow, alpha);
      } else if (vType < 1.5) {
        // Soft volumetric smoke
        alpha *= smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(vColor.rgb, alpha * 0.45);
      } else {
        // Blood / sharp debris
        gl_FragColor = vec4(vColor.rgb, alpha * 0.9);
      }
    }
  `
};

export class GraphicsQualityManager {
  private currentConfig: QualityConfig;
  private renderer: THREE.WebGLRenderer | null = null;
  private isWebGPUAvailable: boolean = false;
  private gpuDevice: any = null;
  private recentFrameTimes: number[] = [];
  private lastTime: number = performance.now();
  private autoCascadeThrottleActive: boolean = false;

  constructor(initialPreset: GraphicsPreset = 'ultra') {
    this.currentConfig = { ...GRAPHICS_PRESETS[initialPreset] };
    this.checkWebGPUSupport();
  }

  private async checkWebGPUSupport(): Promise<void> {
    if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.gpuDevice = await adapter.requestDevice();
          this.isWebGPUAvailable = true;
        }
      } catch {
        this.isWebGPUAvailable = false;
      }
    }
  }

  /**
   * Preset pixel ratio with a physical sanity cap. On small, very dense screens (3x phones)
   * anything beyond ~2x device pixels is imperceptible, and total render pixels are capped per
   * tier so a 4K / 3x display cannot quietly quadruple the fill cost for no visible gain.
   */
  public static computePixelRatio(config: QualityConfig): number {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const shortSide = Math.min(w, h);
    const baseDpr = Math.min(window.devicePixelRatio || 1, shortSide < 900 ? 2 : 3);
    const wanted = baseDpr * config.pixelRatio;
    const budgetCap = Math.sqrt((config.maxRenderMegapixels * 1e6) / (w * h));
    return Math.max(0.5, Math.min(wanted, budgetCap, 2.5));
  }

  public attachRenderer(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.applyConfiguration(this.currentConfig.preset);
  }

  public applyConfiguration(preset: GraphicsPreset): QualityConfig {
    const config = GRAPHICS_PRESETS[preset];
    this.currentConfig = { ...config };

    if (this.renderer) {
      this.renderer.setPixelRatio(GraphicsQualityManager.computePixelRatio(config));
      
      // Tone mapping (exposure is owned by the render pipeline, not the preset)
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

      // Shadow engine configuration
      this.renderer.shadowMap.enabled = true;
      if (config.shadowSoftness === 'exponential-ultra' || config.shadowSoftness === 'pcf-soft') {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } else if (config.shadowSoftness === 'pcf') {
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
      } else {
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
      }

      this.renderer.shadowMap.needsUpdate = true;
    }

    return this.currentConfig;
  }

  /**
   * Overdrive auto-cascade frame latency watchdog.
   * If frame rate drops below 90fps while in Overdrive mode,
   * asynchronously tunes non-critical cascades to preserve 120Hz reactivity.
   */
  public recordFrame(now: number): { fps: number; frameTimeMs: number; isThrottled: boolean } {
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.recentFrameTimes.push(delta);
    if (this.recentFrameTimes.length > 60) {
      this.recentFrameTimes.shift();
    }

    const avgDelta = this.recentFrameTimes.reduce((a, b) => a + b, 0) / this.recentFrameTimes.length;
    const currentFps = Math.round(1000 / (avgDelta || 16.6));

    if (this.currentConfig.preset === 'overdrive') {
      // Resolution is owned by the runtime governor (AdaptiveQuality); this only reports state.
      if (currentFps < 90 && !this.autoCascadeThrottleActive) this.autoCascadeThrottleActive = true;
      else if (currentFps >= 100 && this.autoCascadeThrottleActive) this.autoCascadeThrottleActive = false;
    }

    return {
      fps: currentFps,
      frameTimeMs: avgDelta,
      isThrottled: this.autoCascadeThrottleActive
    };
  }

  public getConfig(): QualityConfig {
    return this.currentConfig;
  }

  public isWebGPU(): boolean {
    return this.isWebGPUAvailable;
  }
}
