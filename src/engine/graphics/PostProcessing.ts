/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cinematic render pipeline: GTAO ambient occlusion, HDR bloom, SMAA
 * anti-aliasing, vignette + chromatic aberration + film grain, and a
 * physically-based sky that also feeds PBR reflections through PMREM.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.3 },
    uAberration: { value: 0.0022 },
    uGrain: { value: 0.02 },
    uSaturation: { value: 1.08 },
    uContrast: { value: 1.08 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uAberration, uGrain, uSaturation, uContrast;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      // Radial chromatic aberration (stronger at the edges)
      vec2 dir = centered * r2 * uAberration * 40.0;
      float cr = texture2D(tDiffuse, vUv + dir).r;
      float cg = texture2D(tDiffuse, vUv).g;
      float cb = texture2D(tDiffuse, vUv - dir).b;
      vec3 col = vec3(cr, cg, cb);

      // Contrast & saturation
      col = (col - 0.5) * uContrast + 0.5;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Vignette
      float vig = smoothstep(0.85, 0.25, r2 * (1.0 + uVignette * 2.0));
      col *= mix(1.0 - uVignette, 1.0, vig);

      // Fine animated film grain
      float g = (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.3)) - 0.5) * uGrain;
      col += g;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export class CinematicPipeline {
  public composer: EffectComposer;
  public bloom: UnrealBloomPass;
  public smaa: SMAAPass;
  public cinematic: ShaderPass;
  public sky: Sky;
  public sunDirection = new THREE.Vector3();

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmrem: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, sunLight: THREE.DirectionalLight) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // --- Physically based sky ---
    this.sky = new Sky();
    this.sky.scale.setScalar(4500);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 10.0;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.0015; // small sun halo — keeps the sky near the sun readable
    u.mieDirectionalG.value = 0.7;
    scene.add(this.sky);

    const elevation = THREE.MathUtils.degToRad(58); // high sun: out of the eye line
    const azimuth = THREE.MathUtils.degToRad(145);
    this.sunDirection.setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);
    u.sunPosition.value.copy(this.sunDirection);
    sunLight.position.copy(this.sunDirection.clone().multiplyScalar(140));

    // Lens flare on the sun
    const flareTex = CinematicPipeline.makeFlareTexture();
    const flare = new Lensflare();
    flare.addElement(new LensflareElement(flareTex, 160, 0, new THREE.Color(0x8a7a60)));
    flare.addElement(new LensflareElement(flareTex, 50, 0.35, new THREE.Color(0x5a4a30)));
    flare.addElement(new LensflareElement(flareTex, 70, 0.6, new THREE.Color(0x30505a)));
    flare.addElement(new LensflareElement(flareTex, 40, 0.85, new THREE.Color(0x5a4028)));
    sunLight.add(flare);

    // Environment reflections from the sky
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.refreshEnvironment();

    // --- Composer ---
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(w, h);

    this.composer.addPass(new RenderPass(scene, camera));

    // Bloom only on genuinely hot pixels (emissives, sun) — threshold sits above the HDR sky.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.18, 0.2, 2.2);
    this.composer.addPass(this.bloom);

    // Tone mapping + sRGB first, then grade on display-referred colour.
    this.composer.addPass(new OutputPass());

    this.cinematic = new ShaderPass(CinematicShader);
    this.composer.addPass(this.cinematic);

    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);
  }

  private static makeFlareTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,245,220,0.6)');
    g.addColorStop(0.5, 'rgba(255,220,160,0.12)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  public refreshEnvironment(): void {
    const skyScene = new THREE.Scene();
    skyScene.add(this.sky);
    this.envTarget?.dispose();
    this.envTarget = this.pmrem.fromScene(skyScene, 0.02);
    this.scene.add(this.sky); // re-attach after rendering into PMREM
    this.scene.environment = this.envTarget.texture;
    // The sky is HDR-bright; keep IBL contribution modest so surfaces don't wash out.
    this.scene.environmentIntensity = 0.15;
  }

  public setSize(w: number, h: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  public render(dt: number, time: number): void {
    (this.cinematic.uniforms.uTime as { value: number }).value = time * 0.001;
    void dt;
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
    this.pmrem.dispose();
    this.envTarget?.dispose();
  }
}
