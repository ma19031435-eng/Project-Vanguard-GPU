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

const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.3 },
    uAberration: { value: 0.0006 },
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
  public sky: THREE.Mesh;
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

    // --- Bounded-brightness gradient sky (no HDR blowout, small soft sun disc) ---
    const elevation = THREE.MathUtils.degToRad(58);
    const azimuth = THREE.MathUtils.degToRad(145);
    this.sunDirection.setFromSphericalCoords(1, Math.PI / 2 - elevation, azimuth);
    sunLight.position.copy(this.sunDirection.clone().multiplyScalar(140));

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSun: { value: this.sunDirection.clone() },
        uZenith: { value: new THREE.Color(0x2f5f9e) },
        uHorizon: { value: new THREE.Color(0xb9c6d2) },
        uGround: { value: new THREE.Color(0x8d7d66) }
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww; // always on the far plane
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun, uZenith, uHorizon, uGround;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -1.0, 1.0);
          vec3 col = h >= 0.0
            ? mix(uHorizon, uZenith, pow(h, 0.55))
            : mix(uHorizon, uGround, clamp(-h * 6.0, 0.0, 1.0));
          float cosA = dot(d, normalize(uSun));
          float disc = smoothstep(0.9993, 0.9998, cosA);        // ~1.3 deg sun disc
          float glow = pow(max(cosA, 0.0), 180.0) * 0.35;        // tight, dim halo
          col += vec3(1.0, 0.95, 0.85) * (disc * 1.6 + glow);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skyMat);
    this.sky.scale.setScalar(2500);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    scene.add(this.sky);

    // Environment reflections from the sky
    this.pmrem = new THREE.PMREMGenerator(renderer);
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

  public refreshEnvironment(): void {
    const skyScene = new THREE.Scene();
    skyScene.add(this.sky);
    this.envTarget?.dispose();
    this.envTarget = this.pmrem.fromScene(skyScene, 0.02);
    this.scene.add(this.sky); // re-attach after rendering into PMREM
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.5;
  }

  /** Toggle individual post effects per graphics preset. */
  public setQuality(opts: { bloom: boolean; smaa: boolean; cinematic: boolean; bloomStrength?: number }): void {
    this.bloom.enabled = opts.bloom;
    if (opts.bloomStrength !== undefined) this.bloom.strength = opts.bloomStrength;
    this.smaa.enabled = opts.smaa;
    this.cinematic.enabled = opts.cinematic;
    this.setSize(window.innerWidth, window.innerHeight);
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
