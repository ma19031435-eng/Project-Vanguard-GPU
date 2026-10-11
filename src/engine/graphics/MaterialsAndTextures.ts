/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface PBRTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

export class ProceduralTextureGenerator {
  private static cache: Map<string, PBRTextureSet> = new Map();

  /**
   * Generates authentic Earth desert military compound ground:
   * Sun-baked weathered concrete, asphalt cracks, and desert sand drifts
   */
  public static createMetalFloorTextures(anisotropy: number = 8): PBRTextureSet {
    if (this.cache.has('earth_ground')) {
      const cached = this.cache.get('earth_ground')!;
      this.setAnisotropy(cached, anisotropy);
      return cached;
    }

    const size = 1024;
    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = size;
    albedoCanvas.height = size;
    const ctxA = albedoCanvas.getContext('2d')!;

    // Sun-bleached warm desert concrete & gravel base (#9c8e7b / #827563)
    ctxA.fillStyle = '#8f8373';
    ctxA.fillRect(0, 0, size, size);

    // Fine sandy gravel flecks
    for (let i = 0; i < 50000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const sand = Math.floor(125 + Math.random() * 45);
      ctxA.fillStyle = `rgb(${sand + 15}, ${sand}, ${sand - 20})`;
      ctxA.fillRect(x, y, 1.5, 1.5);
    }

    // Concrete slab cuts (large realistic 256x256 slabs)
    const slabSize = 256;
    ctxA.strokeStyle = '#4d4336';
    ctxA.lineWidth = 3;
    for (let x = 0; x <= size; x += slabSize) {
      ctxA.beginPath();
      ctxA.moveTo(x, 0);
      ctxA.lineTo(x, size);
      ctxA.moveTo(0, x);
      ctxA.lineTo(size, x);
      ctxA.stroke();
    }

    // Weathered desert sand drifts blowing across slabs
    const sandGrad = ctxA.createLinearGradient(0, 0, size, size);
    sandGrad.addColorStop(0, 'rgba(195, 168, 128, 0.25)');
    sandGrad.addColorStop(0.5, 'rgba(168, 142, 102, 0.05)');
    sandGrad.addColorStop(1, 'rgba(195, 168, 128, 0.35)');
    ctxA.fillStyle = sandGrad;
    ctxA.fillRect(0, 0, size, size);

    // Weathered military ground stencils "OUTPOST-04" / "SITE B"
    ctxA.fillStyle = 'rgba(40, 35, 30, 0.45)';
    ctxA.font = 'bold 36px monospace';
    ctxA.fillText('SITE A [DEFENSE]', 220, 160);
    ctxA.fillText('BOMBSITE B', 220, 680);

    // Normal Map
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const ctxN = normalCanvas.getContext('2d')!;
    ctxN.fillStyle = 'rgb(128, 128, 255)';
    ctxN.fillRect(0, 0, size, size);

    ctxN.strokeStyle = 'rgb(160, 100, 255)';
    ctxN.lineWidth = 4;
    for (let x = 0; x <= size; x += slabSize) {
      ctxN.strokeRect(x - 2, 0, 4, size);
      ctxN.strokeRect(0, x - 2, size, 4);
    }

    // Roughness (Dry sandy concrete = high roughness 0.82)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const ctxR = roughCanvas.getContext('2d')!;
    ctxR.fillStyle = '#b8b8b8'; // Dry matte
    ctxR.fillRect(0, 0, size, size);

    // Metalness (Concrete & sand = 0 metalness)
    const metalCanvas = document.createElement('canvas');
    metalCanvas.width = size;
    metalCanvas.height = size;
    const ctxM = metalCanvas.getContext('2d')!;
    ctxM.fillStyle = '#050505';
    ctxM.fillRect(0, 0, size, size);

    // Ambient Occlusion
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = size;
    aoCanvas.height = size;
    const ctxAO = aoCanvas.getContext('2d')!;
    ctxAO.fillStyle = '#ffffff';
    ctxAO.fillRect(0, 0, size, size);
    ctxAO.strokeStyle = '#2b231a';
    ctxAO.lineWidth = 5;
    for (let x = 0; x <= size; x += slabSize) {
      ctxAO.strokeRect(x - 2, 0, 4, size);
      ctxAO.strokeRect(0, x - 2, size, 4);
    }

    const texA = new THREE.CanvasTexture(albedoCanvas);
    const texN = new THREE.CanvasTexture(normalCanvas);
    const texR = new THREE.CanvasTexture(roughCanvas);
    const texM = new THREE.CanvasTexture(metalCanvas);
    const texAO = new THREE.CanvasTexture(aoCanvas);

    [texA, texN, texR, texM, texAO].forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 6);
    });

    const set: PBRTextureSet = {
      map: texA,
      normalMap: texN,
      roughnessMap: texR,
      metalnessMap: texM,
      aoMap: texAO
    };

    this.setAnisotropy(set, anisotropy);
    this.cache.set('earth_ground', set);
    return set;
  }

  /**
   * Generates real Earth desert concrete blast walls & sandstone ramparts
   */
  public static createWallTextures(anisotropy: number = 8): PBRTextureSet {
    if (this.cache.has('earth_wall')) {
      const cached = this.cache.get('earth_wall')!;
      this.setAnisotropy(cached, anisotropy);
      return cached;
    }

    const size = 1024;
    const albedo = document.createElement('canvas');
    albedo.width = size;
    albedo.height = size;
    const ctx = albedo.getContext('2d')!;

    // Sun-baked sandstone concrete (#a39480)
    ctx.fillStyle = '#9e8f7a';
    ctx.fillRect(0, 0, size, size);

    // Horizontal reinforced blast wall blocks
    const blockH = 128;
    for (let y = 0; y < size; y += blockH) {
      ctx.fillStyle = y % 256 === 0 ? '#91826d' : '#ab9c87';
      ctx.fillRect(4, y + 4, size - 8, blockH - 8);

      // Rebar tie holes
      ctx.fillStyle = '#3d3429';
      for (let x = 64; x < size; x += 192) {
        ctx.beginPath();
        ctx.arc(x, y + 24, 5, 0, Math.PI * 2);
        ctx.arc(x, y + blockH - 24, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Weathered black tactical stencils
    ctx.fillStyle = '#26221c';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('MILITARY AREA - DO NOT ENTER', 180, 280);

    const normal = document.createElement('canvas');
    normal.width = size;
    normal.height = size;
    const ctxN = normal.getContext('2d')!;
    ctxN.fillStyle = 'rgb(128, 128, 255)';
    ctxN.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += blockH) {
      ctxN.fillStyle = 'rgb(115, 145, 255)';
      ctxN.fillRect(0, y, size, 5);
      ctxN.fillStyle = 'rgb(140, 110, 255)';
      ctxN.fillRect(0, y + blockH - 5, size, 5);
    }

    const rough = document.createElement('canvas');
    rough.width = size;
    rough.height = size;
    const ctxR = rough.getContext('2d')!;
    ctxR.fillStyle = '#a0a0a0';
    ctxR.fillRect(0, 0, size, size);

    const metal = document.createElement('canvas');
    metal.width = size;
    metal.height = size;
    const ctxM = metal.getContext('2d')!;
    ctxM.fillStyle = '#050505';
    ctxM.fillRect(0, 0, size, size);

    const ao = document.createElement('canvas');
    ao.width = size;
    ao.height = size;
    const ctxAO = ao.getContext('2d')!;
    ctxAO.fillStyle = '#ffffff';
    ctxAO.fillRect(0, 0, size, size);

    const texA = new THREE.CanvasTexture(albedo);
    const texN = new THREE.CanvasTexture(normal);
    const texR = new THREE.CanvasTexture(rough);
    const texM = new THREE.CanvasTexture(metal);
    const texAO = new THREE.CanvasTexture(ao);

    [texA, texN, texR, texM, texAO].forEach(t => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 2);
    });

    const set: PBRTextureSet = {
      map: texA,
      normalMap: texN,
      roughnessMap: texR,
      metalnessMap: texM,
      aoMap: texAO
    };

    this.setAnisotropy(set, anisotropy);
    this.cache.set('earth_wall', set);
    return set;
  }

  /**
   * Generates CS2-style weathered military shipping container textures
   */
  public static createContainerTexture(colorType: 'red' | 'blue' | 'olive' = 'red'): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Earth military paint tones
    const baseColor = colorType === 'red' ? '#782626' : (colorType === 'blue' ? '#2b4d75' : '#454f3a');
    const ribColor = colorType === 'red' ? '#5a1d1d' : (colorType === 'blue' ? '#1f3857' : '#323a2a');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    // Corrugated vertical ribs
    const ribW = 32;
    for (let x = 0; x < size; x += ribW) {
      ctx.fillStyle = ribColor;
      ctx.fillRect(x, 0, ribW / 2, size);
      ctx.fillStyle = baseColor;
      ctx.fillRect(x + ribW / 2, 0, ribW / 2, size);
    }

    // Authentic Earth Shipping Decals & Weathering
    ctx.fillStyle = 'rgba(240, 240, 240, 0.75)';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('MEDITERRANEAN CARGO', 35, 90);
    ctx.font = 'bold 18px monospace';
    ctx.fillText('MSCU 918420-5', 35, 130);
    ctx.fillText('NET WT: 28,400 KG', 35, 160);

    return new THREE.CanvasTexture(canvas);
  }

  public static setAnisotropy(textureSet: PBRTextureSet, anisotropy: number): void {
    const list = [
      textureSet.map,
      textureSet.normalMap,
      textureSet.roughnessMap,
      textureSet.metalnessMap,
      textureSet.aoMap
    ];
    for (const tex of list) {
      tex.anisotropy = Math.min(anisotropy, 16);
      tex.needsUpdate = true;
    }
  }
}
