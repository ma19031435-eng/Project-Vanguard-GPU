/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BoundingBox3D } from '../wasm/WasmPhysicsCore.ts';
import { ProceduralTextureGenerator } from './MaterialsAndTextures.ts';

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
    const floorMat = new THREE.MeshStandardMaterial({
      map: groundTextures.map,
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
      const wallGeo = new THREE.PlaneGeometry(wc.w, wallHeight);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(wc.x, wallHeight / 2, wc.z);
      wall.rotation.y = wc.rotY;
      wall.receiveShadow = true;
      this.scene.add(wall);

      const thick = 2.0;
      let minX = wc.x - (wc.rotY === 0 || wc.rotY === Math.PI ? wc.w / 2 : thick / 2);
      let maxX = wc.x + (wc.rotY === 0 || wc.rotY === Math.PI ? wc.w / 2 : thick / 2);
      let minZ = wc.z - (wc.rotY === 0 || wc.rotY === Math.PI ? thick / 2 : wc.w / 2);
      let maxZ = wc.z + (wc.rotY === 0 || wc.rotY === Math.PI ? thick / 2 : wc.w / 2);

      this.worldCollisionBoxes.push({
        minX, minY: 0, minZ,
        maxX, maxY: wallHeight, maxZ
      });
    });

    // 3. Central Military Outpost Bunker & Radio Watchtower (NO Sci-Fi reactor!)
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x827563, roughness: 0.8, metalness: 0.1 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.45, metalness: 0.75 });

    // Fortified concrete bunker base (10x10m, 4m high)
    const bunkerGeo = new THREE.BoxGeometry(10, 4.0, 10);
    const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
    bunker.position.set(0, 2.0, 0);
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    this.scene.add(bunker);

    // Watchtower Upper Cabin
    const cabinGeo = new THREE.BoxGeometry(6, 3.0, 6);
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

    this.buildRamp(0, 2.25, -12, 4.5, 16, -Math.PI / 12);
    this.buildRamp(0, 2.25, 12, 4.5, 16, Math.PI / 12);

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
      { x: 8, z: -18, sx: 3.4, sy: 2.5, sz: 3.4, mat: oliveMat },
      { x: -8, z: 18, sx: 3.4, sy: 2.5, sz: 3.4, mat: blueMat }
    ];

    containerLocations.forEach((loc, index) => {
      this.createDestructibleCrate(`container_${index}`, loc.x, loc.sy / 2, loc.z, loc.sx, loc.sy, loc.sz, loc.mat);
    });

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

  private buildCatwalk(x: number, y: number, z: number, w: number, d: number): void {
    const geo = new THREE.BoxGeometry(w, 0.45, d);
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

  private buildRamp(x: number, y: number, z: number, w: number, d: number, rotX: number): void {
    const geo = new THREE.BoxGeometry(w, 0.35, d);
    const mat = new THREE.MeshStandardMaterial({ color: 0x474e57, roughness: 0.5, metalness: 0.55 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rotX;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.worldCollisionBoxes.push({
      minX: x - w / 2, minY: 0, minZ: z - d / 2,
      maxX: x + w / 2, maxY: y * 2, maxZ: z + d / 2
    });
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
