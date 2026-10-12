/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BoundingBox3D, WasmPhysicsCore } from '../wasm/WasmPhysicsCore.ts';

const WasmPhysicsCore_STEP = WasmPhysicsCore.STEP_HEIGHT;
import { ProceduralTextureGenerator } from './MaterialsAndTextures.ts';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EnvironmentDetailer } from './EnvironmentDetailer.ts';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface DestructibleObject {
  id: string;
  mesh: THREE.Mesh;
  box: BoundingBox3D;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
}

export interface BulletDecal {
  mesh: THREE.Mesh;
  life: number;
}

export interface ShellCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
}

export class MapGenerator {
  public scene: THREE.Scene;
  public worldCollisionBoxes: BoundingBox3D[] = [];
  public destructibles: Map<string, DestructibleObject> = new Map();
  public dynamicLights: THREE.PointLight[] = [];
  public activeShards: { mesh: THREE.Mesh; vel: THREE.Vector3; rotVel: THREE.Vector3; life: number }[] = [];
  public activeDecals: BulletDecal[] = [];
  public activeShells: ShellCasing[] = [];

  private decalMaterial: THREE.MeshBasicMaterial;
  private shellGeometry: THREE.CylinderGeometry;
  private shellMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Realistic microscopic chipped concrete bullet hole (0.04m, NOT big dark marks!)
    const decalCanvas = document.createElement('canvas');
    decalCanvas.width = 64;
    decalCanvas.height = 64;
    const ctx = decalCanvas.getContext('2d')!;

    const rad = ctx.createRadialGradient(32, 32, 2, 32, 32, 24);
    rad.addColorStop(0, '#1c1815');
    rad.addColorStop(0.5, '#3b322a');
    rad.addColorStop(0.8, '#69594a');
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();

    const decalTex = new THREE.CanvasTexture(decalCanvas);
    this.decalMaterial = new THREE.MeshBasicMaterial({
      map: decalTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });

    this.shellGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8);
    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc9933,
      metalness: 0.95,
      roughness: 0.25
    });

    this.createAtmosphericDesertDust();
  }

  /**
   * Earth Environmental Dust & Sun Motes
   */
  private createAtmosphericDesertDust(): void {
    const dustCount = 600;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 100;
      dustPos[i * 3 + 1] = Math.random() * 12;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xdfcfb0, // Sandy dust color
      size: 0.08,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    const dustPoints = new THREE.Points(dustGeo, dustMat);
    this.scene.add(dustPoints);
  }

  /**
   * Builds "Outpost Mirage" - Authentic Earth Military Compound
   * Bright sunny blue skies, concrete blast ramparts, sandbag posts, military shipping depot
   */
  public buildArena(anisotropy: number = 8): { spawnPoints: [number, number, number][] } {
    const groundTextures = ProceduralTextureGenerator.createMetalFloorTextures(anisotropy);
    const wallTextures = ProceduralTextureGenerator.createWallTextures(anisotropy);

    // 1. Earth Desert Military Outpost Ground (120x120m)
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    [groundTextures.map, groundTextures.normalMap, groundTextures.roughnessMap, groundTextures.metalnessMap, groundTextures.aoMap].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(14, 14);
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: groundTextures.map,
      normalScale: new THREE.Vector2(1.4, 1.4),
      normalMap: groundTextures.normalMap,
      roughnessMap: groundTextures.roughnessMap,
      metalnessMap: groundTextures.metalnessMap,
      aoMap: groundTextures.aoMap,
      roughness: 0.85,
      metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // 2. Concrete Blast Walls
    [wallTextures.map, wallTextures.normalMap, wallTextures.roughnessMap, wallTextures.metalnessMap, wallTextures.aoMap].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 1.2);
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTextures.map,
      normalMap: wallTextures.normalMap,
      roughnessMap: wallTextures.roughnessMap,
      metalnessMap: wallTextures.metalnessMap,
      aoMap: wallTextures.aoMap,
      roughness: 0.75,
      metalness: 0.1
    });

    const arenaSize = 100;
    const wallHeight = 12;

    const wallConfigs = [
      { x: 0, z: -arenaSize / 2, rotY: 0, w: arenaSize },
      { x: 0, z: arenaSize / 2, rotY: Math.PI, w: arenaSize },
      { x: -arenaSize / 2, z: 0, rotY: Math.PI / 2, w: arenaSize },
      { x: arenaSize / 2, z: 0, rotY: -Math.PI / 2, w: arenaSize }
    ];

    wallConfigs.forEach(wc => {
      const thick = 2.0;
      const wallGeo = new RoundedBoxGeometry(wc.w, wallHeight, thick, 3, 0.12);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(wc.x, wallHeight / 2, wc.z);
      wall.rotation.y = wc.rotY;
      // Push the wall outward so its inner face sits on the arena boundary
      wall.translateZ(-thick / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);

      const horizontal = wc.rotY === 0 || wc.rotY === Math.PI;
      const minX = wc.x - (horizontal ? wc.w / 2 : thick / 2);
      const maxX = wc.x + (horizontal ? wc.w / 2 : thick / 2);
      const minZ = wc.z - (horizontal ? thick / 2 : wc.w / 2);
      const maxZ = wc.z + (horizontal ? thick / 2 : wc.w / 2);

      this.worldCollisionBoxes.push({
        minX, minY: 0, minZ,
        maxX, maxY: wallHeight, maxZ
      });
    });

    // 3. Central Military Outpost Bunker & Radio Watchtower (NO Sci-Fi reactor!)
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x827563, roughness: 0.8, metalness: 0.1 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.45, metalness: 0.75 });

    // Fortified concrete bunker base (10x10m, 4m high)
    const bunkerGeo = new RoundedBoxGeometry(10, 4.0, 10, 4, 0.15);
    const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
    bunker.position.set(0, 2.0, 0);
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    this.scene.add(bunker);

    // Watchtower Upper Cabin
    const cabinGeo = new RoundedBoxGeometry(6, 3.0, 6, 3, 0.1);
    const cabin = new THREE.Mesh(cabinGeo, steelMat);
    cabin.position.set(0, 5.5, 0);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.scene.add(cabin);

    // Military Radio Antenna Mast
    const mastGeo = new THREE.CylinderGeometry(0.1, 0.18, 9, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.set(0, 11.5, 0);
    mast.castShadow = true;
    this.scene.add(mast);

    this.worldCollisionBoxes.push({
      minX: -5.0, minY: 0, minZ: -5.0,
      maxX: 5.0, maxY: 7.0, maxZ: 5.0
    });

    // 4. Catwalks & Access Ramps (Steel Military Scaffolding)
    this.buildCatwalk(0, 4.5, -22, 38, 4.5);
    this.buildCatwalk(0, 4.5, 22, 38, 4.5);
    this.buildCatwalk(-22, 4.5, 0, 4.5, 38);
    this.buildCatwalk(22, 4.5, 0, 4.5, 38);

    // Walkable ramps from ground (bunker side) up to the N/S catwalks
    this.buildStairRamp(0, -13.5, 13, 4.2, 4.5, 'z', -1);
    this.buildStairRamp(0, 13.5, 13, 4.2, 4.5, 'z', 1);
    // Side ramps up to the E/W catwalks
    this.buildStairRamp(-13.5, 0, 13, 4.2, 4.5, 'x', -1);
    this.buildStairRamp(13.5, 0, 13, 4.2, 4.5, 'x', 1);

    // 5. Authentic CS2 Shipping Containers (Red, Blue, Olive Green)
    const redContainerTex = ProceduralTextureGenerator.createContainerTexture('red');
    const blueContainerTex = ProceduralTextureGenerator.createContainerTexture('blue');
    const oliveContainerTex = ProceduralTextureGenerator.createContainerTexture('olive');

    const redMat = new THREE.MeshStandardMaterial({ map: redContainerTex, roughness: 0.5, metalness: 0.5 });
    const blueMat = new THREE.MeshStandardMaterial({ map: blueContainerTex, roughness: 0.5, metalness: 0.5 });
    const oliveMat = new THREE.MeshStandardMaterial({ map: oliveContainerTex, roughness: 0.5, metalness: 0.5 });

    const containerLocations = [
      { x: -10, z: -8, sx: 3.4, sy: 2.5, sz: 3.4, mat: redMat },
      { x: -14, z: -8, sx: 3.4, sy: 2.5, sz: 3.4, mat: blueMat },
      { x: 10, z: 8, sx: 3.4, sy: 2.5, sz: 3.4, mat: oliveMat },
      { x: 14, z: 8, sx: 3.4, sy: 2.5, sz: 3.4, mat: redMat },
      { x: -16, z: 14, sx: 4.4, sy: 2.5, sz: 2.5, mat: blueMat },
      { x: 16, z: -14, sx: 4.4, sy: 2.5, sz: 2.5, mat: redMat },
      { x: 8, z: -22, sx: 3.4, sy: 2.5, sz: 3.4, mat: oliveMat },
      { x: -8, z: 22, sx: 3.4, sy: 2.5, sz: 3.4, mat: blueMat }
    ];

    containerLocations.forEach((loc, index) => {
      this.createDestructibleCrate(`container_${index}`, loc.x, loc.sy / 2, loc.z, loc.sx, loc.sy, loc.sz, loc.mat);
      this.decorateContainer(loc.x, loc.sy / 2, loc.z, loc.sx, loc.sy, loc.sz);
    });

    // 6. Movement Course: slide gates, flank platforms, approach ramps & tactical cover
    this.buildMovementCourse();

    // 7. High-detail environment layer (props, railings, terrain, decals, signage)
    const detailer = new EnvironmentDetailer(this.scene, this.worldCollisionBoxes);
    detailer.build();

    const spawnPoints: [number, number, number][] = [
      [0, 0, -38],
      [0, 0, 38],
      [-38, 0, 0],
      [38, 0, 0],
      [-20, 0, -20],
      [20, 0, 20]
    ];

    return { spawnPoints };
  }

  /**
   * Momentum movement course layered onto the outpost:
   * - Four slide gates: a low horizontal bar you can only pass under while sliding
   * - Four elevated corner flank platforms with approach ramps
   * - Eight waist-high cover blocks for peeking / slide-cancel duels
   * - Emissive route strips and beacons that read the slide lanes at a glance
   */
  private buildMovementCourse(): void {
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.45, metalness: 0.8 });
    const barMat = new THREE.MeshStandardMaterial({
      color: 0x0e7490, emissive: 0x22d3ee, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6
    });
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.55, metalness: 0.6 });
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.85, metalness: 0.05 });
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x0891b2, emissive: 0x06b6d4, emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.2
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, emissive: 0xfbbf24, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.4
    });

    // --- Slide gates on the four open center lanes (between bunker and catwalks) ---
    // Gate clearance 1.0m: standing (1.62 eye) & crouching (1.15) are blocked, sliding (0.82) passes.
    const gateClearance = 1.0;
    const gates = [
      { x: 9, z: -16, alongX: true },
      { x: -9, z: 16, alongX: true },
      { x: -16, z: 9, alongX: false },
      { x: 16, z: -9, alongX: false }
    ];

    gates.forEach((g, i) => {
      const span = 6.5;
      const half = span / 2;
      // Two support pillars
      for (const side of [-1, 1]) {
        const px = g.alongX ? g.x + side * half : g.x;
        const pz = g.alongX ? g.z : g.z + side * half;
        const pillar = new THREE.Mesh(new RoundedBoxGeometry(0.45, 2.6, 0.45, 2, 0.05), supportMat);
        pillar.position.set(px, 1.3, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.scene.add(pillar);
        this.worldCollisionBoxes.push({
          minX: px - 0.225, minY: 0, minZ: pz - 0.225,
          maxX: px + 0.225, maxY: 2.6, maxZ: pz + 0.225
        });
      }

      // Horizontal slide bar — collidable from clearance height to top, passable underneath
      const barGeo = g.alongX
        ? new THREE.BoxGeometry(span, 0.3, 0.3)
        : new THREE.BoxGeometry(0.3, 0.3, span);
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(g.x, gateClearance + 0.15, g.z);
      bar.castShadow = true;
      this.scene.add(bar);
      this.worldCollisionBoxes.push({
        minX: g.alongX ? g.x - half : g.x - 0.15,
        minY: gateClearance,
        minZ: g.alongX ? g.z - 0.15 : g.z - half,
        maxX: g.alongX ? g.x + half : g.x + 0.15,
        maxY: gateClearance + 0.3,
        maxZ: g.alongX ? g.z + 0.15 : g.z + half
      });

      // Overhead sign plate
      const sign = new THREE.Mesh(
        g.alongX ? new THREE.BoxGeometry(span, 0.5, 0.12) : new THREE.BoxGeometry(0.12, 0.5, span),
        supportMat
      );
      sign.position.set(g.x, 2.35, g.z);
      this.scene.add(sign);

      // Glowing floor strip through the gate marking the slide lane
      const strip = new THREE.Mesh(
        g.alongX ? new THREE.BoxGeometry(0.5, 0.03, 10) : new THREE.BoxGeometry(10, 0.03, 0.5),
        stripMat
      );
      strip.position.set(g.x, 0.015, g.z);
      strip.receiveShadow = true;
      this.scene.add(strip);

      // Gate beacon light
      const light = new THREE.PointLight(0x22d3ee, 2.4, 14, 2);
      light.position.set(g.x, 2.1, g.z);
      this.scene.add(light);
      this.dynamicLights.push(light);
      void i;
    });

    // --- Elevated corner flank platforms + approach ramps ---
    const corners = [
      { x: -30, z: -30 },
      { x: 30, z: -30 },
      { x: -30, z: 30 },
      { x: 30, z: 30 }
    ];
    corners.forEach(c => {
      const w = 9, d = 9, h = 3.2;
      const plat = new THREE.Mesh(new RoundedBoxGeometry(w, 0.5, d, 2, 0.06), platformMat);
      plat.position.set(c.x, h, c.z);
      plat.castShadow = true;
      plat.receiveShadow = true;
      this.scene.add(plat);
      this.worldCollisionBoxes.push({
        minX: c.x - w / 2, minY: h - 0.25, minZ: c.z - d / 2,
        maxX: c.x + w / 2, maxY: h + 0.25, maxZ: c.z + d / 2
      });

      // Four support legs
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.4), supportMat);
        leg.position.set(c.x + sx * (w / 2 - 0.4), h / 2, c.z + sz * (d / 2 - 0.4));
        leg.castShadow = true;
        this.scene.add(leg);
      }

      // Approach ramp pointing toward arena center (walkable staircase collision)
      const dirX = (-Math.sign(c.x)) as 1 | -1;
      const rampLen = 10;
      const rampW = 3.2;
      const rx = c.x + dirX * (w / 2 + rampLen / 2);
      this.buildStairRamp(rx, c.z, rampLen, rampW, h, 'x', (-dirX) as 1 | -1);

      // Corner beacon
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 12), beaconMat);
      beacon.position.set(c.x, h + 1.05, c.z);
      this.scene.add(beacon);
      const bl = new THREE.PointLight(0xfbbf24, 1.8, 16, 2);
      bl.position.set(c.x, h + 2, c.z);
      this.scene.add(bl);
      this.dynamicLights.push(bl);
    });

    // --- Waist-high tactical cover (symmetrical) ---
    const covers = [
      { x: -8, z: -26 }, { x: 8, z: -26 }, { x: -8, z: 26 }, { x: 8, z: 26 },
      { x: -26, z: -8 }, { x: -26, z: 8 }, { x: 26, z: -8 }, { x: 26, z: 8 }
    ];
    covers.forEach(cv => {
      const w = 2.6, h = 1.1, d = 0.9;
      const alongX = Math.abs(cv.z) > Math.abs(cv.x);
      const geo = alongX ? new THREE.BoxGeometry(w, h, d) : new THREE.BoxGeometry(d, h, w);
      const m = new THREE.Mesh(geo, coverMat);
      m.position.set(cv.x, h / 2, cv.z);
      // Bevelled cap on top of each cover block
      const cap = new THREE.Mesh(new RoundedBoxGeometry(alongX ? w + 0.1 : d + 0.1, 0.12, alongX ? d + 0.1 : w + 0.1, 2, 0.04), coverMat);
      cap.position.set(cv.x, h + 0.06, cv.z);
      cap.castShadow = true;
      this.scene.add(cap);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.worldCollisionBoxes.push({
        minX: cv.x - (alongX ? w : d) / 2, minY: 0, minZ: cv.z - (alongX ? d : w) / 2,
        maxX: cv.x + (alongX ? w : d) / 2, maxY: h, maxZ: cv.z + (alongX ? d : w) / 2
      });
    });

    // --- Perimeter route guidance strips (ring road under the catwalks) ---
    const ringR = 32;
    for (const [sx, sz, horiz] of [[0, -1, true], [0, 1, true], [-1, 0, false], [1, 0, false]] as const) {
      const strip = new THREE.Mesh(
        horiz ? new THREE.BoxGeometry(44, 0.03, 0.3) : new THREE.BoxGeometry(0.3, 0.03, 44),
        stripMat
      );
      strip.position.set(sx * ringR, 0.015, sz * ringR);
      this.scene.add(strip);
    }
  }

  /** Corrugation ribs, corner castings, locking bars and a door seam for shipping containers. */
  private decorateContainer(x: number, y: number, z: number, w: number, h: number, d: number): void {
    const g = new THREE.Group();
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x1f2226, roughness: 0.6, metalness: 0.7 });
    const castMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.5, metalness: 0.85 });
    // Vertical corrugation ribs on long faces
    const longAlongX = w >= d;
    const faceLen = longAlongX ? w : d;
    const ribCount = Math.floor(faceLen / 0.3);
    for (let i = 0; i <= ribCount; i++) {
      const t = -faceLen / 2 + (i / ribCount) * faceLen;
      for (const side of [-1, 1]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(longAlongX ? 0.06 : 0.04, h - 0.2, longAlongX ? 0.04 : 0.06), ribMat);
        rib.position.set(longAlongX ? t : side * (w / 2 + 0.02), 0, longAlongX ? side * (d / 2 + 0.02) : t);
        g.add(rib);
      }
    }
    // Corner castings
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), castMat);
      c.position.set(sx * (w / 2 - 0.1), sy * (h / 2 - 0.1), sz * (d / 2 - 0.1));
      g.add(c);
    }
    // Door end: locking bars + handles
    const doorAlongX = !longAlongX;
    for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 2; k++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h - 0.3, 8), castMat);
      const off = i * (0.35 + k * 0.5);
      bar.position.set(doorAlongX ? off : w / 2 + 0.05, 0, doorAlongX ? d / 2 + 0.05 : off);
      g.add(bar);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(doorAlongX ? 0.25 : 0.06, 0.05, doorAlongX ? 0.06 : 0.25), castMat);
      handle.position.set(doorAlongX ? off + 0.12 : w / 2 + 0.08, -0.2, doorAlongX ? d / 2 + 0.08 : off + 0.12);
      g.add(handle);
    }
    // Roof vents
    for (const sx of [-0.3, 0.3]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), castMat);
      vent.position.set(sx * w, h / 2 + 0.04, 0);
      g.add(vent);
    }
    // Batch the ~70 detail pieces into two draw calls (one per material)
    const batched = new THREE.Group();
    for (const mat of [ribMat, castMat]) {
      const geos: THREE.BufferGeometry[] = [];
      g.children.forEach(c => {
        const m = c as THREE.Mesh;
        if (m.material !== mat) return;
        m.updateMatrix();
        const gg = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        gg.applyMatrix4(m.matrix);
        geos.push(gg);
      });
      if (!geos.length) continue;
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      geos.forEach(gg => gg.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      batched.add(mesh);
    }
    batched.position.set(x, y, z);
    this.scene.add(batched);
    // Keep decoration tied to the crate so it disappears when destroyed
    const crate = Array.from(this.destructibles.values()).pop();
    if (crate) crate.mesh.userData.decor = batched;
  }

  private buildCatwalk(x: number, y: number, z: number, w: number, d: number): void {
    const geo = new RoundedBoxGeometry(w, 0.45, d, 2, 0.05);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d434a,
      roughness: 0.5,
      metalness: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.worldCollisionBoxes.push({
      minX: x - w / 2, minY: y - 0.25, minZ: z - d / 2,
      maxX: x + w / 2, maxY: y + 0.25, maxZ: z + d / 2
    });
  }

  /**
   * Walkable ramp: a single tilted slab for visuals plus a staircase of
   * collision boxes (each below STEP_HEIGHT) so the physics step-up can climb it.
   * `axis` is the direction of travel, `dir` the sign toward the HIGH end.
   */
  public buildStairRamp(cx: number, cz: number, length: number, width: number, height: number, axis: 'x' | 'z', dir: 1 | -1): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x474e57, roughness: 0.5, metalness: 0.55 });
    const slabLen = Math.hypot(length, height);
    const geo = axis === 'x'
      ? new RoundedBoxGeometry(slabLen, 0.3, width, 2, 0.04)
      : new RoundedBoxGeometry(width, 0.3, slabLen, 2, 0.04);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, height / 2 - 0.05, cz);
    const angle = Math.atan2(height, length);
    if (axis === 'x') mesh.rotation.z = dir * angle; else mesh.rotation.x = -dir * angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Anti-slip strips
    const stripMat = new THREE.MeshStandardMaterial({ color: 0xd9b43a, roughness: 0.8 });
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const strip = new THREE.Mesh(axis === 'x' ? new THREE.BoxGeometry(0.12, 0.02, width - 0.3) : new THREE.BoxGeometry(width - 0.3, 0.02, 0.12), stripMat);
      const along = -length / 2 + t * length;
      const y = (t) * height + 0.12;
      strip.position.set(axis === 'x' ? cx + dir * along : cx, y, axis === 'z' ? cz + dir * along : cz);
      if (axis === 'x') strip.rotation.z = dir * angle; else strip.rotation.x = -dir * angle;
      this.scene.add(strip);
    }

    const stepH = WasmPhysicsCore_STEP - 0.1;
    const steps = Math.ceil(height / stepH);
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const a0 = -length / 2 + t0 * length;
      const a1 = -length / 2 + t1 * length;
      const lo = cx * 0 + Math.min(dir * a0, dir * a1);
      const hi = Math.max(dir * a0, dir * a1);
      this.worldCollisionBoxes.push(axis === 'x'
        ? { minX: cx + lo, minY: 0, minZ: cz - width / 2, maxX: cx + hi, maxY: height * t1, maxZ: cz + width / 2 }
        : { minX: cx - width / 2, minY: 0, minZ: cz + lo, maxX: cx + width / 2, maxY: height * t1, maxZ: cz + hi });
    }
  }

  public createDestructibleCrate(
    id: string,
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    mat: THREE.Material
  ): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box: BoundingBox3D = {
      minX: x - w / 2, minY: y - h / 2, minZ: z - d / 2,
      maxX: x + w / 2, maxY: y + h / 2, maxZ: z + d / 2
    };

    this.worldCollisionBoxes.push(box);
    this.destructibles.set(id, {
      id,
      mesh,
      box,
      health: 120,
      maxHealth: 120,
      isDestroyed: false
    });
  }

  /**
   * Tiny, realistic pinpoint bullet hole (0.04m, NOT big ugly marks!)
   */
  public spawnBulletDecal(point: THREE.Vector3, normal: THREE.Vector3): void {
    const decalGeo = new THREE.PlaneGeometry(0.045, 0.045);
    const decalMesh = new THREE.Mesh(decalGeo, this.decalMaterial);
    decalMesh.position.copy(point).addScaledVector(normal, 0.008);
    decalMesh.lookAt(point.clone().add(normal));
    this.scene.add(decalMesh);

    this.activeDecals.push({
      mesh: decalMesh,
      life: 8.0
    });

    if (this.activeDecals.length > 25) {
      const old = this.activeDecals.shift();
      if (old) {
        this.scene.remove(old.mesh);
        old.mesh.geometry.dispose();
      }
    }
  }

  public spawnShellCasing(pos: THREE.Vector3, rightDir: THREE.Vector3, upDir: THREE.Vector3): void {
    const shell = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
    shell.position.copy(pos);
    shell.castShadow = true;
    this.scene.add(shell);

    const ejectVel = rightDir.clone().multiplyScalar(2.6 + Math.random() * 1.4)
      .add(upDir.clone().multiplyScalar(1.6 + Math.random() * 0.8))
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));

    this.activeShells.push({
      mesh: shell,
      velocity: ejectVel,
      rotVelocity: new THREE.Vector3(Math.random() * 25, Math.random() * 25, Math.random() * 25),
      life: 5.0
    });

    if (this.activeShells.length > 25) {
      const old = this.activeShells.shift();
      if (old) {
        this.scene.remove(old.mesh);
      }
    }
  }

  public damageDestructible(id: string, damage: number, impactPoint?: THREE.Vector3): boolean {
    const item = this.destructibles.get(id);
    if (!item || item.isDestroyed) return false;

    item.health -= damage;
    if (item.health <= 0) {
      this.shatterObject(item, impactPoint);
      return true;
    }
    return false;
  }

  private shatterObject(item: DestructibleObject, impactPoint?: THREE.Vector3): void {
    item.isDestroyed = true;
    this.scene.remove(item.mesh);
    if (item.mesh.userData.decor) this.scene.remove(item.mesh.userData.decor as THREE.Object3D);

    const idx = this.worldCollisionBoxes.indexOf(item.box);
    if (idx !== -1) {
      this.worldCollisionBoxes.splice(idx, 1);
    }

    const pos = item.mesh.position;
    const shardGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x474f5b,
      roughness: 0.6,
      metalness: 0.5
    });

    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const offsetX = (Math.random() - 0.5) * 1.5;
      const offsetY = (Math.random() - 0.5) * 1.5;
      const offsetZ = (Math.random() - 0.5) * 1.5;
      shard.position.set(pos.x + offsetX, pos.y + offsetY, pos.z + offsetZ);
      shard.castShadow = true;
      this.scene.add(shard);

      const explodeDir = impactPoint
        ? shard.position.clone().sub(impactPoint).normalize()
        : new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 1, (Math.random() - 0.5) * 2).normalize();

      const speed = 6 + Math.random() * 8;
      this.activeShards.push({
        mesh: shard,
        vel: explodeDir.multiplyScalar(speed),
        rotVel: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        life: 4.0
      });
    }
  }

  public updateShardsAndShells(dt: number): void {
    for (let i = this.activeShards.length - 1; i >= 0; i--) {
      const s = this.activeShards[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.activeShards.splice(i, 1);
        continue;
      }

      s.vel.y -= 19.6 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.rotVel.x * dt;
      s.mesh.rotation.y += s.rotVel.y * dt;
      s.mesh.rotation.z += s.rotVel.z * dt;

      if (s.mesh.position.y < 0.35) {
        s.mesh.position.y = 0.35;
        s.vel.y = -s.vel.y * 0.35;
        s.vel.x *= 0.7;
        s.vel.z *= 0.7;
      }
    }

    for (let i = this.activeShells.length - 1; i >= 0; i--) {
      const shell = this.activeShells[i];
      shell.life -= dt;
      if (shell.life <= 0) {
        this.scene.remove(shell.mesh);
        this.activeShells.splice(i, 1);
        continue;
      }

      shell.velocity.y -= 16.0 * dt;
      shell.mesh.position.addScaledVector(shell.velocity, dt);
      shell.mesh.rotation.x += shell.rotVelocity.x * dt;
      shell.mesh.rotation.y += shell.rotVelocity.y * dt;
      shell.mesh.rotation.z += shell.rotVelocity.z * dt;

      if (shell.mesh.position.y < 0.02) {
        shell.mesh.position.y = 0.02;
        shell.velocity.y = -shell.velocity.y * 0.45;
        shell.velocity.x *= 0.75;
        shell.velocity.z *= 0.75;
        shell.rotVelocity.multiplyScalar(0.7);
      }
    }
  }
}
