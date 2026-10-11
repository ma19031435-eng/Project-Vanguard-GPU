/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Environment detail layer for Dust Mirage. Replaces flat, blocky surfaces
 * with bevelled geometry, layered props, signage, cabling, vegetation,
 * terrain beyond the walls and ground decals. Visual fidelity first.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoundingBox3D } from '../wasm/WasmPhysicsCore.ts';

type Vec3 = [number, number, number];

export class EnvironmentDetailer {
  private scene: THREE.Scene;
  private boxes: BoundingBox3D[];
  private rng: () => number;
  /** Static meshes queued for batching, grouped by material. */
  private batches: Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }> = new Map();
  public drawCallsSaved = 0;

  // Shared materials
  public readonly mat = {
    concrete: new THREE.MeshStandardMaterial({ color: 0x9a907f, roughness: 0.92, metalness: 0.02 }),
    concreteDark: new THREE.MeshStandardMaterial({ color: 0x6f675b, roughness: 0.95, metalness: 0.02 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3c4249, roughness: 0.38, metalness: 0.85 }),
    steelPainted: new THREE.MeshStandardMaterial({ color: 0x4f5a3b, roughness: 0.55, metalness: 0.5 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6e3b1f, roughness: 0.9, metalness: 0.35 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.85, metalness: 0.0 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95, metalness: 0.05 }),
    sandbag: new THREE.MeshStandardMaterial({ color: 0xa08f6c, roughness: 1.0, metalness: 0.0 }),
    tarp: new THREE.MeshPhysicalMaterial({ color: 0x5c6b4a, roughness: 0.7, metalness: 0.0, sheen: 0.6, sheenColor: new THREE.Color(0x9aa98a), side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc9e8, roughness: 0.05, metalness: 0.0, transmission: 0.85, thickness: 0.3, transparent: true, opacity: 0.9 }),
    emissiveAmber: new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a1f, emissiveIntensity: 2.4, roughness: 0.4 }),
    emissiveRed: new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2020, emissiveIntensity: 2.6, roughness: 0.4 }),
    emissiveCyan: new THREE.MeshStandardMaterial({ color: 0x5be1ff, emissive: 0x22d3ee, emissiveIntensity: 2.0, roughness: 0.4 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x8c7d68, roughness: 1.0, metalness: 0.0, flatShading: true }),
    sand: new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 1.0, metalness: 0.0 }),
    mountain: new THREE.MeshStandardMaterial({ color: 0xa48f73, roughness: 1.0, metalness: 0.0, flatShading: true })
  };

  constructor(scene: THREE.Scene, collisionBoxes: BoundingBox3D[], seed = 1337) {
    this.scene = scene;
    this.boxes = collisionBoxes;
    let s = seed;
    this.rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }

  /** Builds everything. */
  public build(): void {
    this.buildTerrainBeyondWalls();
    this.buildPerimeterWallDetail();
    this.buildBunkerDetail();
    this.buildCatwalkRailings();
    this.buildLightPolesAndCables();
    this.buildJerseyBarriers();
    this.buildSandbagNests();
    this.buildBarrelClusters();
    this.buildPalletsAndCrates();
    this.buildTirePiles();
    this.buildFences();
    this.buildTarps();
    this.buildVegetationAndRocks();
    this.buildGroundDecals();
    this.buildSignage();
    this.flushBatches();
  }

  /**
   * Static batching: bakes every queued mesh's world transform into its geometry
   * and merges all geometry that shares a material into a single draw call.
   */
  private flushBatches(): void {
    this.batches.forEach((batch, material) => {
      if (batch.geos.length === 0) return;
      const merged = BufferGeometryUtils.mergeGeometries(batch.geos, false);
      batch.geos.forEach(g => g.dispose());
      if (!merged) return;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = batch.cast;
      mesh.receiveShadow = batch.receive;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.drawCallsSaved += batch.geos.length - 1;
    });
    this.batches.clear();
  }

  private static normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry | null {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.position) return null;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    // Keep only the attributes every primitive shares so merging never fails.
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.clearGroups();
    return g;
  }

  // ------------------------------------------------------------------ helpers

  private add(obj: THREE.Object3D, castShadow = true, receiveShadow = true): void {
    obj.updateMatrixWorld(true);
    const leftovers: THREE.Object3D[] = [];
    obj.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material)) {
        const g = EnvironmentDetailer.normalizeForMerge(m.geometry as THREE.BufferGeometry);
        if (g) {
          g.applyMatrix4(m.matrixWorld);
          const key = m.material as THREE.Material;
          let b = this.batches.get(key);
          if (!b) { b = { geos: [], cast: castShadow, receive: receiveShadow }; this.batches.set(key, b); }
          b.geos.push(g);
          return;
        }
      }
      if ((o as THREE.Light).isLight || (o as any).isLensflare) leftovers.push(o);
    });
    // Lights (and their targets) are re-parented to the scene with their world transform preserved.
    leftovers.forEach(l => {
      const target = (l as THREE.SpotLight).target;
      const wp = new THREE.Vector3();
      l.getWorldPosition(wp);
      this.scene.add(l);
      l.position.copy(wp);
      if (target) {
        const tp = new THREE.Vector3();
        target.getWorldPosition(tp);
        this.scene.add(target);
        target.position.copy(tp);
      }
    });
  }

  private collide(x: number, y: number, z: number, w: number, h: number, d: number): void {
    this.boxes.push({ minX: x - w / 2, minY: y, minZ: z - d / 2, maxX: x + w / 2, maxY: y + h, maxZ: z + d / 2 });
  }

  private rbox(w: number, h: number, d: number, r = 0.04, seg = 3): RoundedBoxGeometry {
    return new RoundedBoxGeometry(w, h, d, seg, r);
  }

  private canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
  }

  // ------------------------------------------------------------------ terrain

  private buildTerrainBeyondWalls(): void {
    // Rolling dunes outside the compound
    const duneGeo = new THREE.PlaneGeometry(900, 900, 160, 160);
    const pos = duneGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const dist = Math.hypot(x, y);
      if (dist < 62) { pos.setZ(i, -0.6); continue; }
      const h = Math.sin(x * 0.045) * Math.cos(y * 0.037) * 3.2 + Math.sin(x * 0.012 + y * 0.02) * 6 + (this.rng() - 0.5) * 0.4;
      pos.setZ(i, h * Math.min(1, (dist - 62) / 60) - 0.6);
    }
    duneGeo.computeVertexNormals();
    const dunes = new THREE.Mesh(duneGeo, this.mat.sand);
    dunes.rotation.x = -Math.PI / 2;
    dunes.receiveShadow = true;
    this.scene.add(dunes);

    // Distant mountain ring
    const ring = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + this.rng() * 0.2;
      const r = 300 + this.rng() * 90;
      const h = 40 + this.rng() * 70;
      const w = 90 + this.rng() * 120;
      const g = new THREE.ConeGeometry(w / 2, h, 7, 3);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < p.count; v++) {
        p.setX(v, p.getX(v) * (0.85 + this.rng() * 0.3));
        p.setZ(v, p.getZ(v) * (0.85 + this.rng() * 0.3));
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, this.mat.mountain);
      m.position.set(Math.cos(a) * r, h / 2 - 8, Math.sin(a) * r);
      m.rotation.y = this.rng() * Math.PI;
      ring.add(m);
    }
    this.scene.add(ring);

    // Haze band near the horizon
    const hazeGeo = new THREE.CylinderGeometry(420, 420, 70, 48, 1, true);
    const hazeMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc8, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.position.y = 20;
    this.scene.add(haze);
  }

  // ------------------------------------------------------------------ walls

  private buildPerimeterWallDetail(): void {
    const half = 50;
    const wallH = 12;
    const stripeTex = this.canvasTexture(256, ctx => {
      ctx.fillStyle = '#d9b43a';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#1a1a1a';
      for (let i = -256; i < 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 256); ctx.lineTo(i + 32, 256); ctx.lineTo(i + 32 + 256, 0); ctx.lineTo(i + 256, 0); ctx.closePath(); ctx.fill();
      }
    }, [16, 1]);
    const stripeMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8 });

    const sides: { x: number; z: number; rot: number }[] = [
      { x: 0, z: -half, rot: 0 }, { x: 0, z: half, rot: Math.PI },
      { x: -half, z: 0, rot: Math.PI / 2 }, { x: half, z: 0, rot: -Math.PI / 2 }
    ];

    sides.forEach(sd => {
      const g = new THREE.Group();
      // Buttress columns every 10m
      for (let i = -4; i <= 4; i++) {
        const col = new THREE.Mesh(this.rbox(1.4, wallH + 0.6, 1.6, 0.08), this.mat.concreteDark);
        col.position.set(i * 10.5, (wallH + 0.6) / 2, 0.9);
        g.add(col);
        // Column cap
        const cap = new THREE.Mesh(this.rbox(1.8, 0.35, 2.0, 0.06), this.mat.concrete);
        cap.position.set(i * 10.5, wallH + 0.75, 0.9);
        g.add(cap);
      }
      // Coping along the top
      const coping = new THREE.Mesh(this.rbox(100, 0.5, 2.4, 0.1), this.mat.concrete);
      coping.position.set(0, wallH + 0.25, 0.4);
      g.add(coping);
      // Hazard stripe band
      const band = new THREE.Mesh(new THREE.BoxGeometry(100, 0.6, 0.08), stripeMat);
      band.position.set(0, 1.4, 0.06);
      g.add(band);
      // Razor wire coils on top
      const coilGeo = new THREE.TorusGeometry(0.45, 0.025, 6, 24);
      const coilMat = this.mat.steel;
      for (let i = -48; i <= 48; i += 0.9) {
        const c = new THREE.Mesh(coilGeo, coilMat);
        c.position.set(i, wallH + 0.95, 0.4);
        c.rotation.y = Math.PI / 2;
        c.rotation.x = i * 0.35;
        g.add(c);
      }
      // Drainage pipes & grime streaks
      for (let i = -3; i <= 3; i += 2) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, wallH - 1, 10), this.mat.rust);
        pipe.position.set(i * 10.5 + 3, (wallH - 1) / 2 + 0.3, 0.35);
        g.add(pipe);
      }
      // Floodlight housings on columns
      for (let i = -4; i <= 4; i += 2) {
        const housing = new THREE.Mesh(this.rbox(0.9, 0.4, 0.5, 0.05), this.mat.steel);
        housing.position.set(i * 10.5, wallH - 0.6, 1.95);
        housing.rotation.x = 0.5;
        g.add(housing);
        const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.25), this.mat.emissiveAmber);
        lens.position.set(i * 10.5, wallH - 0.72, 2.22);
        lens.rotation.x = -Math.PI / 2 + 0.5;
        g.add(lens);
      }
      g.position.set(sd.x, 0, sd.z);
      g.rotation.y = sd.rot;
      this.add(g);
    });

    // Corner guard towers
    const towerOffsets = [[-47, -47], [47, -47], [-47, 47], [47, 47]];
    towerOffsets.forEach(([x, z]) => {
      const t = new THREE.Group();
      const base = new THREE.Mesh(this.rbox(4.5, 3, 4.5, 0.1), this.mat.concreteDark);
      base.position.y = 1.5;
      t.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 11, 12), this.mat.concrete);
      shaft.position.y = 8.5;
      t.add(shaft);
      const cabin = new THREE.Mesh(this.rbox(4.8, 2.6, 4.8, 0.12), this.mat.steelPainted);
      cabin.position.y = 15.3;
      t.add(cabin);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(4.9, 1.2, 4.9), this.mat.glass);
      glass.position.y = 15.5;
      t.add(glass);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.6, 4), this.mat.steel);
      roof.position.y = 17.4;
      roof.rotation.y = Math.PI / 4;
      t.add(roof);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), this.mat.emissiveRed);
      beacon.position.y = 18.4;
      t.add(beacon);
      const light = new THREE.PointLight(0xff3030, 2.5, 25, 2);
      light.position.y = 18.4;
      t.add(light);
      t.position.set(x, 0, z);
      this.add(t);
      this.collide(x, 0, z, 4.5, 20, 4.5);
    });
  }

  // ------------------------------------------------------------------ bunker

  private buildBunkerDetail(): void {
    const g = new THREE.Group();
    // Bevelled shell around the existing bunker block
    const shell = new THREE.Mesh(this.rbox(10.3, 4.1, 10.3, 0.18, 4), this.mat.concrete);
    shell.position.y = 2.05;
    g.add(shell);
    // Firing slits
    for (let side = 0; side < 4; side++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.3), this.mat.rubber);
      const a = (side * Math.PI) / 2;
      slit.position.set(Math.sin(a) * 5.1, 2.6, Math.cos(a) * 5.1);
      slit.rotation.y = a;
      g.add(slit);
    }
    // Blast door
    const door = new THREE.Mesh(this.rbox(1.6, 2.4, 0.2, 0.05), this.mat.steelPainted);
    door.position.set(0, 1.2, 5.2);
    g.add(door);
    const doorLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), this.mat.emissiveRed);
    doorLight.position.set(0, 2.6, 5.25);
    g.add(doorLight);
    // Cabin detail: window band, AC units, vents
    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.9, 6.1), this.mat.glass);
    cabinGlass.position.y = 5.9;
    g.add(cabinGlass);
    for (let i = 0; i < 3; i++) {
      const ac = new THREE.Mesh(this.rbox(1.0, 0.8, 0.9, 0.04), this.mat.steel);
      ac.position.set(-2 + i * 2, 7.4, -2.4);
      g.add(ac);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), this.mat.rubber);
      fan.position.set(-2 + i * 2, 7.83, -2.4);
      g.add(fan);
    }
    // Satellite dish
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
    dish.position.set(2.2, 7.6, 1.8);
    dish.rotation.set(-Math.PI / 2 + 0.9, 0.4, 0);
    g.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), this.mat.steel);
    feed.position.set(2.2, 8.2, 1.4);
    feed.rotation.x = 0.9;
    g.add(feed);
    // Antenna guy wires & cross arms
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6 - i * 0.4, 0.05, 0.05), this.mat.steel);
      arm.position.set(0, 12.5 + i * 1.3, 0);
      arm.rotation.y = i * 0.7;
      g.add(arm);
    }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), this.mat.emissiveRed);
    tip.position.y = 16.05;
    g.add(tip);
    const tipLight = new THREE.PointLight(0xff2a2a, 1.6, 20, 2);
    tipLight.position.y = 16;
    g.add(tipLight);
    // Sandbags around the base
    this.sandbagRing(g, 0, 0, 7.2, 14);
    this.add(g);
  }

  private sandbagRing(parent: THREE.Group, cx: number, cz: number, radius: number, count: number): void {
    const geo = new THREE.CapsuleGeometry(0.22, 0.5, 4, 8);
    for (let layer = 0; layer < 3; layer++) {
      const n = count + layer * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + layer * 0.15;
        if (Math.abs(Math.sin(a)) < 0.12 && Math.cos(a) > 0) continue; // doorway gap
        const b = new THREE.Mesh(geo, this.mat.sandbag);
        b.position.set(cx + Math.cos(a) * radius, 0.22 + layer * 0.38, cz + Math.sin(a) * radius);
        b.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2);
        b.scale.set(1, 1, 0.85 + this.rng() * 0.3);
        parent.add(b);
      }
    }
  }

  // ------------------------------------------------------------------ catwalks

  private buildCatwalkRailings(): void {
    const specs = [
      { x: 0, z: -22, w: 38, d: 4.5 }, { x: 0, z: 22, w: 38, d: 4.5 },
      { x: -22, z: 0, w: 4.5, d: 38 }, { x: 22, z: 0, w: 4.5, d: 38 }
    ];
    const y = 4.75;
    const gratingTex = this.canvasTexture(128, ctx => {
      ctx.fillStyle = '#2a2e33'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#0b0c0e';
      for (let gx = 4; gx < 128; gx += 16) for (let gy = 4; gy < 128; gy += 16) ctx.fillRect(gx, gy, 9, 9);
    }, [8, 1]);
    const gratingMat = new THREE.MeshStandardMaterial({ map: gratingTex, roughness: 0.5, metalness: 0.8 });

    specs.forEach(s => {
      const g = new THREE.Group();
      const alongX = s.w > s.d;
      const len = alongX ? s.w : s.d;
      const wid = alongX ? s.d : s.w;
      // Grating overlay
      const grate = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), gratingMat);
      grate.rotation.x = -Math.PI / 2;
      grate.position.y = 0.01;
      if (!alongX) grate.rotation.z = Math.PI / 2;
      g.add(grate);
      // Railings both sides
      for (const side of [-1, 1]) {
        const off = side * (wid / 2 - 0.1);
        const posts = Math.floor(len / 2.2);
        for (let i = 0; i <= posts; i++) {
          const t = -len / 2 + (i / posts) * len;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), this.mat.steelPainted);
          post.position.set(alongX ? t : off, 0.55, alongX ? off : t);
          g.add(post);
        }
        for (const h of [0.55, 1.08]) {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), this.mat.steelPainted);
          rail.rotation.z = alongX ? Math.PI / 2 : 0;
          rail.rotation.x = alongX ? 0 : Math.PI / 2;
          rail.position.set(alongX ? 0 : off, h, alongX ? off : 0);
          g.add(rail);
        }
        // Kick plate
        const kick = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.04, 0.15, alongX ? 0.04 : len), this.mat.steelPainted);
        kick.position.set(alongX ? 0 : off, 0.08, alongX ? off : 0);
        g.add(kick);
      }
      // Support trusses underneath
      const n = Math.floor(len / 6);
      for (let i = 0; i <= n; i++) {
        const t = -len / 2 + (i / n) * len;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.25 : wid, 0.4, alongX ? wid : 0.25), this.mat.steel);
        beam.position.set(alongX ? t : 0, -0.45, alongX ? 0 : t);
        g.add(beam);
        for (const side of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, y - 0.5, 10), this.mat.steel);
          leg.position.set(alongX ? t : side * (wid / 2 - 0.3), -(y - 0.5) / 2 - 0.25, alongX ? side * (wid / 2 - 0.3) : t);
          g.add(leg);
        }
        // Cross brace
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, Math.hypot(wid, y - 1), 0.06), this.mat.steel);
        brace.position.set(alongX ? t : 0, -(y) / 2, alongX ? 0 : t);
        brace.rotation.z = alongX ? 0 : Math.atan2(wid, y - 1);
        brace.rotation.x = alongX ? Math.atan2(wid, y - 1) : 0;
        g.add(brace);
      }
      g.position.set(s.x, y, s.z);
      this.add(g);
    });
  }

  // ------------------------------------------------------------------ lighting & cables

  private buildLightPolesAndCables(): void {
    const poles: Vec3[] = [[-34, 0, -12], [34, 0, 12], [-12, 0, 34], [12, 0, -34], [-34, 0, 34], [34, 0, -34]];
    const tops: THREE.Vector3[] = [];
    poles.forEach(([x, , z]) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 12), this.mat.concreteDark);
      base.position.y = 0.25;
      g.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 9, 12), this.mat.steelPainted);
      pole.position.y = 4.75;
      g.add(pole);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), this.mat.steelPainted);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(1.0, 9.1, 0);
      g.add(arm);
      const head = new THREE.Mesh(this.rbox(1.1, 0.3, 0.6, 0.05), this.mat.steel);
      head.position.set(2.0, 9.0, 0);
      g.add(head);
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), this.mat.emissiveAmber);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(2.0, 8.84, 0);
      g.add(lamp);
      const spot = new THREE.SpotLight(0xffd9a0, 18, 30, 0.7, 0.5, 1.4);
      spot.position.set(2.0, 8.8, 0);
      spot.target.position.set(2.5, 0, 0);
      spot.castShadow = false;
      g.add(spot, spot.target);
      // Junction box + conduit
      const jbox = new THREE.Mesh(this.rbox(0.35, 0.5, 0.25, 0.03), this.mat.steel);
      jbox.position.set(0, 1.6, 0.25);
      g.add(jbox);
      g.position.set(x, 0, z);
      g.lookAt(0, 0, 0);
      this.add(g);
      this.collide(x, 0, z, 0.6, 9, 0.6);
      tops.push(new THREE.Vector3(x, 9.3, z));
    });

    // Draped cables between neighbouring poles
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    for (let i = 0; i < tops.length; i++) {
      const a = tops[i];
      const b = tops[(i + 1) % tops.length];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y -= 2.2 + this.rng();
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.03, 6, false), cableMat);
      this.add(tube, true, false);
    }
  }

  // ------------------------------------------------------------------ props

  private jerseyGeo(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0); shape.lineTo(0.4, 0); shape.lineTo(0.3, 0.25); shape.lineTo(0.14, 0.95); shape.lineTo(-0.14, 0.95); shape.lineTo(-0.3, 0.25); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    g.translate(0, 0, -1.5);
    return g;
  }

  private buildJerseyBarriers(): void {
    const geo = this.jerseyGeo();
    const placements: { x: number; z: number; rot: number }[] = [
      { x: -20, z: -30, rot: 0 }, { x: -17, z: -30, rot: 0 }, { x: 20, z: 30, rot: 0 }, { x: 17, z: 30, rot: 0 },
      { x: -30, z: 20, rot: Math.PI / 2 }, { x: -30, z: 17, rot: Math.PI / 2 }, { x: 30, z: -20, rot: Math.PI / 2 }, { x: 30, z: -17, rot: Math.PI / 2 },
      { x: -40, z: -6, rot: Math.PI / 2 + 0.3 }, { x: 40, z: 6, rot: Math.PI / 2 - 0.3 }
    ];
    placements.forEach(p => {
      const m = new THREE.Mesh(geo, this.rng() > 0.5 ? this.mat.concrete : this.mat.concreteDark);
      m.position.set(p.x, 0, p.z);
      m.rotation.y = p.rot;
      this.add(m);
      const alongX = Math.abs(Math.cos(p.rot)) > 0.7;
      this.collide(p.x, 0, p.z, alongX ? 0.8 : 3, 0.95, alongX ? 3 : 0.8);
    });
  }

  private buildSandbagNests(): void {
    const nests: { x: number; z: number; facing: number }[] = [
      { x: -14, z: -34, facing: 0 }, { x: 14, z: 34, facing: Math.PI }, { x: -34, z: 14, facing: Math.PI / 2 }, { x: 34, z: -14, facing: -Math.PI / 2 }
    ];
    const geo = new THREE.CapsuleGeometry(0.2, 0.46, 4, 8);
    nests.forEach(n => {
      const g = new THREE.Group();
      for (let layer = 0; layer < 3; layer++) {
        for (let i = -3; i <= 3; i++) {
          const b = new THREE.Mesh(geo, this.mat.sandbag);
          b.position.set(i * 0.45 + (layer % 2) * 0.22, 0.2 + layer * 0.36, 0);
          b.rotation.z = Math.PI / 2;
          b.rotation.y = (this.rng() - 0.5) * 0.3;
          g.add(b);
        }
        for (const side of [-1, 1]) {
          for (let k = 0; k < 3 - layer; k++) {
            const b = new THREE.Mesh(geo, this.mat.sandbag);
            b.position.set(side * 1.6, 0.2 + layer * 0.36, 0.5 + k * 0.45);
            b.rotation.x = Math.PI / 2;
            g.add(b);
          }
        }
      }
      // Ammo crate inside nest
      const crate = new THREE.Mesh(this.rbox(0.8, 0.4, 0.5, 0.03), this.mat.steelPainted);
      crate.position.set(0.3, 0.2, 0.9);
      g.add(crate);
      g.position.set(n.x, 0, n.z);
      g.rotation.y = n.facing;
      this.add(g);
      this.collide(n.x, 0, n.z, 3.4, 1.1, 1.0);
    });
  }

  private buildBarrelClusters(): void {
    const body = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 20);
    const rim = new THREE.TorusGeometry(0.3, 0.025, 8, 24);
    const colors = [0x8a2b1f, 0x2f4d8a, 0x4d5a2e, 0x9c8a2a, 0x3a3a3a];
    const clusters: Vec3[] = [[-24, 0, -40], [24, 0, 40], [-41, 0, 24], [41, 0, -24], [-6, 0, -41], [6, 0, 41], [-41, 0, -34], [41, 0, 34]];
    clusters.forEach(([cx, , cz]) => {
      const n = 3 + Math.floor(this.rng() * 4);
      for (let i = 0; i < n; i++) {
        const a = this.rng() * Math.PI * 2;
        const r = this.rng() * 1.1;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        const mat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(this.rng() * colors.length)], roughness: 0.55 + this.rng() * 0.3, metalness: 0.6 });
        const g = new THREE.Group();
        const b = new THREE.Mesh(body, mat);
        b.position.y = 0.45;
        g.add(b);
        for (const h of [0.15, 0.45, 0.75]) {
          const rr = new THREE.Mesh(rim, this.mat.steel);
          rr.rotation.x = Math.PI / 2;
          rr.position.y = h;
          g.add(rr);
        }
        const tipped = this.rng() > 0.8;
        if (tipped) { g.rotation.z = Math.PI / 2; g.position.y = 0.3; }
        g.position.x = x; g.position.z = z;
        g.rotation.y = this.rng() * Math.PI;
        this.add(g);
      }
      this.collide(cx, 0, cz, 2.4, 0.9, 2.4);
    });
  }

  private buildPalletsAndCrates(): void {
    const plankGeo = new THREE.BoxGeometry(1.2, 0.04, 0.12);
    const makePallet = () => {
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const p = new THREE.Mesh(plankGeo, this.mat.wood);
        p.position.set(0, 0.14, -0.5 + i * 0.165);
        g.add(p);
      }
      for (const x of [-0.55, 0, 0.55]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.0), this.mat.wood);
        s.position.set(x, 0.07, 0);
        g.add(s);
      }
      return g;
    };
    const crateTex = this.canvasTexture(256, ctx => {
      ctx.fillStyle = '#5b6a3e'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#3a4527'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 236, 236);
      ctx.fillStyle = '#d8d2b8'; ctx.font = 'bold 28px monospace'; ctx.fillText('VNG-7.62', 40, 120); ctx.font = '18px monospace'; ctx.fillText('AMMUNITION', 56, 160);
    });
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.75 });
    const spots: Vec3[] = [[-30, 0, -24], [30, 0, 24], [-24, 0, 30], [24, 0, -30], [-38, 0, 40], [38, 0, -40]];
    spots.forEach(([x, , z]) => {
      const pallet = makePallet();
      pallet.position.set(x, 0, z);
      pallet.rotation.y = this.rng() * 0.6;
      this.add(pallet);
      const stack = 1 + Math.floor(this.rng() * 3);
      for (let i = 0; i < stack; i++) {
        const c = new THREE.Mesh(this.rbox(0.9, 0.5, 0.6, 0.03), crateMat);
        c.position.set(x + (this.rng() - 0.5) * 0.15, 0.16 + 0.25 + i * 0.5, z + (this.rng() - 0.5) * 0.15);
        c.rotation.y = pallet.rotation.y + (this.rng() - 0.5) * 0.2;
        this.add(c);
      }
      this.collide(x, 0, z, 1.3, 0.2 + stack * 0.5, 1.1);
    });
  }

  private buildTirePiles(): void {
    const geo = new THREE.TorusGeometry(0.42, 0.17, 10, 24);
    const piles: Vec3[] = [[-44, 0, 2], [44, 0, -2], [2, 0, -44], [-2, 0, 44]];
    piles.forEach(([x, , z]) => {
      for (let i = 0; i < 5; i++) {
        const t = new THREE.Mesh(geo, this.mat.rubber);
        const stacked = i < 3;
        t.position.set(x + (stacked ? 0 : (this.rng() - 0.5) * 1.8), stacked ? 0.17 + i * 0.34 : 0.45, z + (stacked ? 0 : 0.9 + this.rng()));
        t.rotation.x = stacked ? Math.PI / 2 : this.rng() * 0.5;
        t.rotation.z = stacked ? 0 : this.rng() * Math.PI;
        this.add(t);
      }
      this.collide(x, 0, z, 1.2, 1.1, 1.2);
    });
  }

  private buildFences(): void {
    const meshTex = this.canvasTexture(64, ctx => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(190,195,200,0.95)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -64; i < 128; i += 16) { ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.moveTo(i + 64, 0); ctx.lineTo(i, 64); }
      ctx.stroke();
    }, [12, 2]);
    const fenceMat = new THREE.MeshStandardMaterial({ map: meshTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.7 });
    const runs: { x: number; z: number; len: number; rot: number }[] = [
      { x: -38, z: -20, len: 12, rot: 0 }, { x: 38, z: 20, len: 12, rot: 0 },
      { x: 20, z: -38, len: 12, rot: Math.PI / 2 }, { x: -20, z: 38, len: 12, rot: Math.PI / 2 }
    ];
    runs.forEach(r => {
      const g = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(r.len, 2.4), fenceMat);
      panel.position.y = 1.2;
      g.add(panel);
      const posts = Math.round(r.len / 3);
      for (let i = 0; i <= posts; i++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), this.mat.steel);
        p.position.set(-r.len / 2 + (i / posts) * r.len, 1.3, 0);
        g.add(p);
      }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, r.len, 8), this.mat.steel);
      top.rotation.z = Math.PI / 2;
      top.position.y = 2.45;
      g.add(top);
      g.position.set(r.x, 0, r.z);
      g.rotation.y = r.rot;
      this.add(g, true, false);
      const alongX = r.rot === 0;
      this.collide(r.x, 0, r.z, alongX ? r.len : 0.2, 2.5, alongX ? 0.2 : r.len);
    });
  }

  private buildTarps(): void {
    const spots: { x: number; z: number; w: number; d: number; h: number }[] = [
      { x: -30, z: -24, w: 5, d: 4, h: 2.4 }, { x: 30, z: 24, w: 5, d: 4, h: 2.4 }
    ];
    spots.forEach(s => {
      const geo = new THREE.PlaneGeometry(s.w, s.d, 16, 12);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        p.setZ(i, Math.sin(x * 2.1) * 0.12 + Math.cos(y * 2.7) * 0.1 - (x * x + y * y) * 0.02);
      }
      geo.computeVertexNormals();
      const tarp = new THREE.Mesh(geo, this.mat.tarp);
      tarp.rotation.x = -Math.PI / 2;
      tarp.position.set(s.x, s.h, s.z);
      this.add(tarp);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, s.h, 8), this.mat.steel);
        pole.position.set(s.x + sx * s.w / 2, s.h / 2, s.z + sz * s.d / 2);
        this.add(pole);
      }
    });
  }

  // ------------------------------------------------------------------ nature

  private buildVegetationAndRocks(): void {
    const shrubTex = this.canvasTexture(128, ctx => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.strokeStyle = '#6f6a45'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 90; i++) {
        ctx.beginPath(); ctx.moveTo(64, 126);
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const l = 40 + Math.random() * 80;
        ctx.quadraticCurveTo(64 + Math.cos(a) * l * 0.5 + (Math.random() - 0.5) * 20, 126 + Math.sin(a) * l * 0.5, 64 + Math.cos(a) * l, 126 + Math.sin(a) * l);
        ctx.stroke();
      }
    });
    const shrubMat = new THREE.MeshStandardMaterial({ map: shrubTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 1 });
    const shrubGeo = new THREE.PlaneGeometry(1.2, 1.2);
    for (let i = 0; i < 70; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 36 + this.rng() * 12;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > 48 || Math.abs(z) > 48) continue;
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const pl = new THREE.Mesh(shrubGeo, shrubMat);
        pl.rotation.y = (k / 3) * Math.PI;
        pl.position.y = 0.55;
        g.add(pl);
      }
      const s = 0.6 + this.rng() * 0.9;
      g.scale.setScalar(s);
      g.position.set(x, 0, z);
      this.add(g, false, false);
    }

    // Rocks
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.DodecahedronGeometry(0.3 + this.rng() * 0.7, 1);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.8 + this.rng() * 0.4), p.getY(v) * (0.5 + this.rng() * 0.4), p.getZ(v) * (0.8 + this.rng() * 0.4));
      geo.computeVertexNormals();
      const rock = new THREE.Mesh(geo, this.mat.rock);
      const a = this.rng() * Math.PI * 2;
      const r = 38 + this.rng() * 10;
      rock.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      if (Math.abs(rock.position.x) > 48 || Math.abs(rock.position.z) > 48) continue;
      rock.rotation.set(this.rng() * 3, this.rng() * 3, this.rng() * 3);
      this.add(rock);
    }

    // Dead palms near corners
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5438, roughness: 1 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x8c8a4a, roughness: 1, side: THREE.DoubleSide });
    [[-44, -44], [44, 44], [44, -44], [-44, 44]].forEach(([x, z]) => {
      const g = new THREE.Group();
      const trunkCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 3, 0.2), new THREE.Vector3(0.3, 6.5, 0.6)]);
      const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 12, 0.22, 8, false), trunkMat);
      g.add(trunk);
      for (let f = 0; f < 9; f++) {
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6, 1, 6), frondMat);
        const fp = frond.geometry.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < fp.count; v++) fp.setZ(v, -Math.pow(fp.getY(v) + 1.3, 2) * 0.18);
        frond.geometry.computeVertexNormals();
        frond.position.set(0.3, 7.4, 0.6);
        frond.rotation.set(-0.5 - this.rng() * 0.4, (f / 9) * Math.PI * 2, 0, 'YXZ');
        frond.geometry.translate(0, 1.3, 0);
        g.add(frond);
      }
      g.position.set(x + 2.5 * Math.sign(-x), 0, z + 6 * Math.sign(-z));
      g.rotation.y = this.rng() * Math.PI;
      this.add(g);
    });
  }

  // ------------------------------------------------------------------ decals & signage

  private buildGroundDecals(): void {
    const mk = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const t = this.canvasTexture(256, ctx => { ctx.clearRect(0, 0, 256, 256); draw(ctx); });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 });
    };
    const oil = mk(ctx => {
      const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
      g.addColorStop(0, 'rgba(10,10,12,0.85)'); g.addColorStop(0.6, 'rgba(20,18,16,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(128, 128, 120, 90, 0.4, 0, Math.PI * 2); ctx.fill();
    });
    const sandDrift = mk(ctx => {
      const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
      g.addColorStop(0, 'rgba(214,190,145,0.9)'); g.addColorStop(1, 'rgba(214,190,145,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
    const tracks = mk(ctx => {
      ctx.fillStyle = 'rgba(60,50,40,0.45)';
      for (const x of [70, 170]) for (let y = 0; y < 256; y += 14) ctx.fillRect(x, y, 18, 8);
    });
    const crack = mk(ctx => {
      ctx.strokeStyle = 'rgba(40,34,28,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, 128);
      let x = 20, y = 128;
      while (x < 240) { x += 12 + Math.random() * 10; y += (Math.random() - 0.5) * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    });

    const place = (mat: THREE.Material, x: number, z: number, size: number, rot = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.012, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };

    for (let i = 0; i < 10; i++) place(oil, (this.rng() - 0.5) * 80, (this.rng() - 0.5) * 80, 2 + this.rng() * 3, this.rng() * 6);
    for (let i = 0; i < 24; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = 20 + this.rng() * 26;
      place(sandDrift, Math.cos(a) * r, Math.sin(a) * r, 5 + this.rng() * 7, this.rng() * 6);
    }
    for (let i = 0; i < 6; i++) place(tracks, (this.rng() - 0.5) * 70, (this.rng() - 0.5) * 70, 6, this.rng() * 6);
    for (let i = 0; i < 18; i++) place(crack, (this.rng() - 0.5) * 90, (this.rng() - 0.5) * 90, 3 + this.rng() * 3, this.rng() * 6);
  }

  private buildSignage(): void {
    const sign = (text: string, sub: string, bg: string, fg: string) => {
      const t = this.canvasTexture(512, ctx => {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = fg; ctx.lineWidth = 14; ctx.strokeRect(20, 20, 472, 472);
        ctx.fillStyle = fg; ctx.textAlign = 'center';
        ctx.font = 'bold 86px monospace'; ctx.fillText(text, 256, 250);
        ctx.font = 'bold 40px monospace'; ctx.fillText(sub, 256, 330);
      });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.2 });
    };
    const danger = sign('DANGER', 'LIVE FIRE ZONE', '#c9262b', '#fff2e0');
    const sector = sign('SECTOR 7', 'OUTPOST MIRAGE', '#1e2a3a', '#dbe7f3');
    const slide = sign('SLIDE', 'LOW CLEARANCE', '#0e7490', '#e0fbff');

    const put = (mat: THREE.Material, x: number, y: number, z: number, rotY: number, size = 1.6) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      m.castShadow = false;
      this.scene.add(m);
      const frame = new THREE.Mesh(this.rbox(size + 0.12, size + 0.12, 0.06, 0.02), this.mat.steel);
      frame.position.copy(m.position).add(new THREE.Vector3(Math.sin(rotY) * -0.04, 0, Math.cos(rotY) * -0.04));
      frame.rotation.y = rotY;
      this.scene.add(frame);
    };
    put(danger, 0, 3.6, -49.3, 0, 2.2);
    put(sector, 0, 3.6, 49.3, Math.PI, 2.2);
    put(danger, -49.3, 3.6, 0, Math.PI / 2, 2.2);
    put(sector, 49.3, 3.6, 0, -Math.PI / 2, 2.2);
    // Slide gate signs
    put(slide, 0, 2.35, -15.9, 0, 0.9);
    put(slide, 0, 2.35, 16.1, Math.PI, 0.9);
    put(slide, -15.9, 2.35, 0, Math.PI / 2, 0.9);
    put(slide, 16.1, 2.35, 0, -Math.PI / 2, 0.9);
  }
}
