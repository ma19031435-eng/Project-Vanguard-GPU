import * as THREE from 'three';
import type { WeaponType } from './WeaponSystem.ts';

/**
 * WeaponPartAnimator — gives every piece of a viewmodel a life of its own.
 *
 * It (1) bolts small mechanical details onto each weapon group (trigger, hammer,
 * charging handle, ejection port, sling, belt links, bow string …) and (2) runs
 * an additive per-frame pass that animates those details plus the parts the
 * builders already named (mag, slide, bolt, pump, cylinder, arms, hands, edge).
 *
 * Everything here is additive on top of the reload / action animation, so the
 * caller must reset named parts to their base pose before this pass runs
 * (WeaponSystem already does that every frame).
 */

type Vec3 = [number, number, number];

interface DetailSpec {
  kind: 'trigger' | 'hammer' | 'charger' | 'port' | 'sling' | 'belt' | 'string' | 'selector';
  pos: Vec3;
  /** Hammer/port/trigger index for dual-wield weapons (matches WeaponSystem.altHand). */
  hand?: number;
  /** Sling strap length. */
  len?: number;
  /** Port: ejects a shotgun shell instead of brass. */
  shell?: boolean;
  /** Port: ejection direction in group space (defaults to right/up/back). */
  dir?: Vec3;
}

const DETAILS: Partial<Record<WeaponType, DetailSpec[]>> = {
  rifle: [
    { kind: 'trigger', pos: [0, -0.06, 0.04] },
    { kind: 'charger', pos: [0.05, 0.03, -0.02] },
    { kind: 'port', pos: [0.045, 0.03, -0.08] },
    { kind: 'selector', pos: [0.045, -0.015, 0.03] },
    { kind: 'sling', pos: [0, -0.06, 0.24], len: 0.22 },
  ],
  railgun: [
    { kind: 'trigger', pos: [0, -0.075, 0.02] },
    { kind: 'port', pos: [0.05, 0.04, -0.06] },
    { kind: 'sling', pos: [0, -0.08, 0.32], len: 0.26 },
  ],
  shotgun: [
    { kind: 'trigger', pos: [0, -0.07, 0.0] },
    { kind: 'port', pos: [0.05, 0.0, -0.12], shell: true },
    { kind: 'sling', pos: [0, -0.08, 0.22], len: 0.22 },
  ],
  pistol: [
    { kind: 'trigger', pos: [0, -0.045, -0.03] },
    { kind: 'hammer', pos: [0, 0.03, 0.09] },
    { kind: 'port', pos: [0.035, 0.05, -0.08] },
  ],
  smg: [
    { kind: 'trigger', pos: [0, -0.055, 0.0] },
    { kind: 'charger', pos: [0.04, 0.03, -0.06] },
    { kind: 'port', pos: [0.04, 0.0, -0.08] },
    { kind: 'sling', pos: [0, -0.05, 0.17], len: 0.16 },
  ],
  revolver: [
    { kind: 'trigger', pos: [0, -0.055, 0.03] },
    { kind: 'hammer', pos: [0, 0.035, 0.1] },
  ],
  crossbow: [
    { kind: 'trigger', pos: [0, -0.06, -0.02] },
    { kind: 'string', pos: [0, 0.03, 0.02] },
  ],
  rpg: [
    { kind: 'trigger', pos: [0, -0.09, -0.1] },
  ],
  lmg: [
    { kind: 'trigger', pos: [0, -0.07, 0.08] },
    { kind: 'port', pos: [0.05, 0.0, -0.05] },
    { kind: 'belt', pos: [-0.045, -0.015, -0.02] },
    { kind: 'sling', pos: [0, -0.07, 0.44], len: 0.26 },
  ],
  dmr: [
    { kind: 'trigger', pos: [0, -0.06, 0.06] },
    { kind: 'port', pos: [0.04, 0.03, -0.06] },
    { kind: 'sling', pos: [0, -0.05, 0.42], len: 0.24 },
  ],
  scattergun: [
    { kind: 'trigger', pos: [0, -0.05, 0.0] },
    { kind: 'hammer', pos: [-0.022, 0.045, 0.02], hand: 0 },
    { kind: 'hammer', pos: [0.022, 0.045, 0.02], hand: 1 },
    { kind: 'sling', pos: [0, -0.07, 0.32], len: 0.24 },
  ],
  autopistol: [
    { kind: 'trigger', pos: [0, -0.04, -0.03] },
    { kind: 'hammer', pos: [0, 0.035, 0.04] },
    { kind: 'port', pos: [0.035, 0.045, -0.1] },
  ],
  dualies: [
    { kind: 'trigger', pos: [0, -0.045, -0.03], hand: 0 },
    { kind: 'hammer', pos: [0, 0.035, 0.03], hand: 0 },
    { kind: 'port', pos: [0.035, 0.05, -0.1], hand: 0 },
    { kind: 'trigger', pos: [-0.42, -0.045, -0.03], hand: 1 },
    { kind: 'hammer', pos: [-0.42, 0.035, 0.03], hand: 1 },
    { kind: 'port', pos: [-0.455, 0.05, -0.1], hand: 1, dir: [-1, 1, 0.3] },
  ],
};

/** Weapons whose hammer re-cocks when the slide/bolt comes back (single-action style). */
const SLIDE_COCKED = new Set<WeaponType>(['pistol', 'autopistol', 'dualies']);

const HAMMER_COCKED = -0.75; // rad, leaning back
const BELT_PITCH = 0.016;
const BELT_LINKS = 6;

interface Casing {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

export interface PartAnimContext {
  dt: number;
  weapon: WeaponType;
  group: THREE.Group;
  parts: Map<string, { obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[]>;
  sinceShot: number;
  fireInterval: number;
  isAuto: boolean;
  isTriggerHeld: boolean;
  isReloading: boolean;
  ammo: number;
  speed: number;
  bobTime: number;
  idleTime: number;
  mouseDX: number;
  mouseDY: number;
  recoilZ: number;
  meleeSlash: number;
  altHand: number;
  /** Mechanical action window from the weapon's feel profile (seconds). */
  actionDelay: number;
  actionDur: number;
  action: string;
}

export class WeaponPartAnimator {
  private casings: Casing[] = [];
  private brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a84a, metalness: 0.9, roughness: 0.3 });
  private shellMat = new THREE.MeshStandardMaterial({ color: 0xb8232a, roughness: 0.6, metalness: 0.1 });
  private brassGeo = new THREE.BoxGeometry(0.008, 0.008, 0.022);
  private shellGeo = new THREE.BoxGeometry(0.018, 0.018, 0.05);

  // Per-weapon persistent state
  private trigger = new Map<WeaponType, number>();
  private hammer = new Map<string, number>();        // key weapon:hand -> 0 (down) .. 1 (cocked)
  private sling = new Map<WeaponType, { ax: number; az: number; vx: number; vz: number }>();
  private belt = new Map<WeaponType, number>();      // 0..1 advance of the current link
  private stringZ = new Map<WeaponType, { z: number; v: number }>();
  private limbT = new Map<WeaponType, number>();
  private lastRecoilZ = 0;
  private lastSpeed = 0;
  private fireKick = 0; // decaying 1 -> 0 after each shot (shared hand/mag rattle)
  private pendingEject: { weapon: WeaponType; at: number; hand: number } | null = null;

  constructor(private root: THREE.Group) {}

  // ---------------------------------------------------------------------------
  // Build-time: bolt the detail parts onto a weapon group
  // ---------------------------------------------------------------------------

  public attachDetails(group: THREE.Group, weapon: WeaponType, darkMat: THREE.Material): void {
    const specs = DETAILS[weapon];
    if (!specs) return;
    for (const s of specs) {
      const pivot = new THREE.Group();
      pivot.position.set(s.pos[0], s.pos[1], s.pos[2]);
      pivot.userData.hand = s.hand ?? 0;
      pivot.userData.spec = s;
      switch (s.kind) {
        case 'trigger': {
          pivot.name = 'trigger';
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.034, 0.008), darkMat);
          blade.position.y = -0.017;
          blade.rotation.x = 0.15;
          pivot.add(blade);
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.07), darkMat);
          guard.position.set(0, -0.042, 0.0);
          pivot.add(guard);
          break;
        }
        case 'hammer': {
          pivot.name = 'hammer';
          const spur = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.04, 0.012), darkMat);
          spur.position.y = 0.02;
          pivot.add(spur);
          const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.016), darkMat);
          thumb.position.set(0, 0.042, 0.004);
          pivot.add(thumb);
          pivot.rotation.x = HAMMER_COCKED;
          this.hammer.set(`${weapon}:${s.hand ?? 0}`, 1);
          break;
        }
        case 'charger': {
          pivot.name = 'charger';
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.018, 0.035), darkMat);
          pivot.add(handle);
          break;
        }
        case 'selector': {
          pivot.name = 'selector';
          const lever = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.05), darkMat);
          lever.position.z = -0.02;
          pivot.add(lever);
          pivot.rotation.x = -0.35;
          break;
        }
        case 'port': {
          pivot.name = 'port';
          // A dark ejection-port recess so the brass visibly comes out of somewhere
          const recess = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.05), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.9 }));
          pivot.add(recess);
          break;
        }
        case 'sling': {
          pivot.name = 'sling';
          const len = s.len ?? 0.2;
          const strapMat = new THREE.MeshStandardMaterial({ color: 0x2a2f26, roughness: 0.95, metalness: 0 });
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.022, len, 0.005), strapMat);
          strap.position.y = -len / 2;
          pivot.add(strap);
          const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.008), darkMat);
          buckle.position.y = -len * 0.55;
          pivot.add(buckle);
          const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, len * 0.35, 0.004), strapMat);
          tail.position.set(0, -len - len * 0.17, 0.004);
          tail.rotation.x = 0.35;
          pivot.add(tail);
          this.sling.set(weapon, { ax: 0, az: 0, vx: 0, vz: 0 });
          break;
        }
        case 'belt': {
          pivot.name = 'belt';
          for (let i = 0; i < BELT_LINKS; i++) {
            const round = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.05), this.brassMat);
            round.position.set(i * BELT_PITCH, 0, 0);
            pivot.add(round);
            const link = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), darkMat);
            link.position.set(i * BELT_PITCH + BELT_PITCH * 0.5, 0, 0.01);
            pivot.add(link);
          }
          this.belt.set(weapon, 0);
          break;
        }
        case 'string': {
          pivot.name = 'string';
          const strMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.8 });
          const str = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.004, 0.004), strMat);
          pivot.add(str);
          const nock = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.012), darkMat);
          pivot.add(nock);
          this.stringZ.set(weapon, { z: 0, v: 0 });
          break;
        }
      }
      group.add(pivot);
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  public onFire(weapon: WeaponType, group: THREE.Group, altHand: number, action: string, actionDelay: number, actionDur: number): void {
    this.fireKick = 1;
    this.trigger.set(weapon, 1);
    // Hammer drops immediately on anything that has one
    const hand = (weapon === 'dualies' || weapon === 'scattergun') ? altHand : 0;
    if (this.hammer.has(`${weapon}:${hand}`)) this.hammer.set(`${weapon}:${hand}`, 0);
    // Belt feeds one link
    if (this.belt.has(weapon)) this.belt.set(weapon, 0);
    // Crossbow string snaps forward, limbs twang
    if (this.stringZ.has(weapon)) { const s = this.stringZ.get(weapon)!; s.v = -6; }
    if (weapon === 'crossbow') this.limbT.set(weapon, 0);
    // Brass: semi/auto eject instantly; manual actions eject when the bolt / pump comes back
    if (action === 'bolt' || action === 'pump') {
      this.pendingEject = { weapon, at: actionDelay + actionDur * 0.3, hand };
    } else if (action === 'slide' || action === 'belt' || action === 'none') {
      this.eject(group, weapon, hand);
    }
  }

  public onReloadStage(weapon: WeaponType, group: THREE.Group, stage: string): void {
    if (weapon === 'revolver' && stage === 'eject') {
      for (let i = 0; i < 6; i++) this.spawnCasing(group, [0.0, 0.0, 0.02], [(Math.random() - 0.5) * 0.8, -1.2, 0.8 + Math.random() * 0.4], false);
    }
    if (weapon === 'scattergun' && stage === 'unlatch') {
      for (const sx of [-1, 1]) this.spawnCasing(group, [sx * 0.025, 0.03, -0.1], [sx * 0.3, 1.4, 1.2], true);
      this.hammer.set('scattergun:0', 0); this.hammer.set('scattergun:1', 0);
    }
    if (weapon === 'scattergun' && stage === 'latch') {
      this.hammer.set('scattergun:0', 1); this.hammer.set('scattergun:1', 1);
    }
    if (weapon === 'revolver' && stage === 'cylClose') this.hammer.set('revolver:0', 0);
    if (weapon === 'crossbow' && stage === 'draw') { const s = this.stringZ.get(weapon); if (s) { s.v = 0; } }
  }

  // ---------------------------------------------------------------------------
  // Per-frame additive pass
  // ---------------------------------------------------------------------------

  public update(c: PartAnimContext): void {
    const { dt, weapon, parts } = c;
    const each = (name: string, fn: (o: THREE.Object3D, base: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }, i: number) => void) => {
      parts.get(name)?.forEach((e, i) => fn(e.obj, e, i));
    };
    const handOf = (o: THREE.Object3D) => (o.userData.hand as number) ?? 0;

    this.fireKick = Math.max(0, this.fireKick - dt * 9);
    const kick = this.fireKick;
    const fireEnv = Math.exp(-c.sinceShot * 14);                       // sharp decaying impulse

    // Delayed brass for bolt / pump actions
    if (this.pendingEject && this.pendingEject.weapon === weapon && c.sinceShot >= this.pendingEject.at) {
      this.eject(c.group, weapon, this.pendingEject.hand);
      this.pendingEject = null;
    }

    // ---- Trigger & trigger finger ------------------------------------------------
    {
      let pull = this.trigger.get(weapon) ?? 0;
      const holding = c.isTriggerHeld && c.isAuto && c.sinceShot < c.fireInterval + 0.06;
      const target = holding || c.sinceShot < 0.07 ? 1 : 0;
      pull = THREE.MathUtils.damp(pull, target, target > pull ? 60 : 18, dt);
      this.trigger.set(weapon, pull);
      const idleFlex = 0.04 * Math.sin(c.idleTime * 1.7);
      each('trigger', (o, b) => {
        const mine = weapon !== 'dualies' || handOf(o) === c.altHand || pull < 0.02;
        const p = mine ? pull : 0;
        o.rotation.x = b.rot.x - 0.5 * p;
      });
      each('finger', (o, b) => {
        o.rotation.x = b.rot.x - 0.55 * pull + idleFlex;
        o.position.z = b.pos.z + 0.008 * pull;
        o.position.y = b.pos.y - 0.004 * pull;
      });
    }

    // ---- Hammers ---------------------------------------------------------------------
    {
      each('hammer', (o, b) => {
        const key = `${weapon}:${handOf(o)}`;
        let h = this.hammer.get(key) ?? 1;
        if (weapon === 'revolver') {
          // Double action: the trigger pull cocks the hammer, then it falls
          const t = c.sinceShot;
          if (t < 0.045) h = t / 0.045; else if (t < 0.075) h = 1 - (t - 0.045) / 0.03; else h = THREE.MathUtils.damp(h, 0, 30, dt);
        } else if (SLIDE_COCKED.has(weapon)) {
          // Re-cocked by the slide travelling back
          const mine = weapon !== 'dualies' || handOf(o) === c.altHand;
          if (mine && c.sinceShot > c.actionDelay + c.actionDur * 0.3) h = THREE.MathUtils.damp(h, 1, 40, dt);
        } else {
          h = THREE.MathUtils.damp(h, this.hammer.get(key) ?? 1, 40, dt);
        }
        this.hammer.set(key, h);
        o.rotation.x = HAMMER_COCKED * h + 0.12 * (1 - h) * fireEnv; // small bounce when it slams home
        void b;
      });
    }

    // ---- Charging handle reciprocates with the bolt carrier ----------------------------
    each('charger', (o, b) => {
      const t = c.sinceShot;
      const cyc = t < 0.085 ? Math.sin((t / 0.085) * Math.PI) : 0;
      o.position.z = b.pos.z + 0.055 * cyc;
    });

    // ---- Selector / small furniture shivers under recoil -------------------------------
    each('selector', (o, b) => { o.rotation.x = b.rot.x + 0.08 * fireEnv * Math.sin(c.sinceShot * 90); });

    // ---- Sling pendulum physics --------------------------------------------------------
    {
      const s = this.sling.get(weapon);
      if (s) {
        const dRecoil = c.recoilZ - this.lastRecoilZ;
        const dSpeed = c.speed - this.lastSpeed;
        const bobDrive = Math.cos(c.bobTime) * Math.min(c.speed / 5, 1) * 2.2;
        // fore/aft swing from recoil + bob, side swing from turning + strafing
        const kx = 48, kz = 42, cx = 5.5, cz = 5.0;
        const accX = -kx * s.ax - cx * s.vx + dRecoil * 260 + bobDrive - dSpeed * 1.6;
        const accZ = -kz * s.az - cz * s.vz + c.mouseDX * 0.9 + Math.sin(c.bobTime * 0.5) * Math.min(c.speed / 5, 1) * 1.2;
        s.vx += accX * dt; s.vz += accZ * dt;
        s.ax += s.vx * dt; s.az += s.vz * dt;
        s.ax = THREE.MathUtils.clamp(s.ax, -1.0, 1.0); s.az = THREE.MathUtils.clamp(s.az, -0.9, 0.9);
        each('sling', (o, b) => { o.rotation.x = b.rot.x + s.ax; o.rotation.z = b.rot.z + s.az; });
      }
    }

    // ---- LMG belt feeds one link per shot ----------------------------------------------
    {
      const adv = this.belt.get(weapon);
      if (adv !== undefined) {
        const n = Math.min(1, adv + dt / 0.08);
        this.belt.set(weapon, n);
        const e = n * n * (3 - 2 * n);
        each('belt', (o, b) => { o.position.x = b.pos.x + BELT_PITCH * e; o.position.y = b.pos.y + 0.003 * Math.sin(e * Math.PI); });
      }
    }

    // ---- Crossbow string + limbs -------------------------------------------------------
    {
      const st = this.stringZ.get(weapon);
      if (st) {
        const rest = c.ammo > 0 || c.isReloading ? 0 : -0.2;  // drawn at the nock vs relaxed forward
        const acc = -420 * (st.z - rest) - 14 * st.v;
        st.v += acc * dt; st.z += st.v * dt;
        each('string', (o, b) => { o.position.z = b.pos.z + st.z; o.scale.x = b.scale.x * (1 - Math.abs(st.z) * 0.5); });
      }
      const lt = this.limbT.get(weapon);
      if (lt !== undefined) {
        const t = lt + dt;
        this.limbT.set(weapon, t);
        const flex = Math.exp(-t * 9) * Math.cos(t * 55) * 0.07;
        each('limb', (o, b) => { o.scale.x = b.scale.x * (1 - flex); o.rotation.x = b.rot.x + flex * 2; });
      }
    }

    // ---- Magazine: loose-fit rattle while moving and after each shot --------------------
    each('mag', (o, b) => {
      const move = Math.min(c.speed / 5, 1);
      o.rotation.x += 0.012 * Math.sin(c.bobTime) * move;
      o.position.y += -0.003 * kick * Math.abs(Math.sin(c.sinceShot * 70));
    });

    // ---- Barrel heat shimmer stand-in: muzzle devices pulse with the shot ---------------
    each('muzzle', (o, b) => { o.scale.setScalar(b.scale.x * (1 + 0.08 * fireEnv)); });

    // ---- Arms breathe, hands tighten on the shot --------------------------------------
    {
      const br = Math.sin(c.idleTime * 1.3);
      each('armRight', (o, b) => { o.position.y = b.pos.y + 0.002 * br; o.position.z = b.pos.z + 0.006 * fireEnv; });
      each('armLeft', (o, b) => { o.position.y = b.pos.y + 0.0028 * Math.sin(c.idleTime * 1.3 + 0.9); o.position.x = b.pos.x - 0.003 * fireEnv; });
      each('hand', (o, b) => { o.scale.setScalar(b.scale.x * (1 + 0.05 * kick)); });
    }

    // ---- Katana edge glow: slow breath, flare through the cut --------------------------
    each('edge', (o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (!m || !('emissiveIntensity' in m)) return;
      const arc = Math.sin(c.meleeSlash * Math.PI);
      m.emissiveIntensity = 0.85 + 0.25 * Math.sin(c.idleTime * 2.1) + 2.2 * arc;
    });

    // ---- Sledge head: lags the haft then overshoots at the end of the swing --------------
    each('head', (o, b) => {
      const arc = Math.sin(c.meleeSlash * Math.PI);
      o.rotation.x = b.rot.x + 0.06 * arc * Math.sin(c.meleeSlash * Math.PI * 3);
    });

    this.lastRecoilZ = c.recoilZ;
    this.lastSpeed = c.speed;
    this.updateCasings(dt);
  }

  // ---------------------------------------------------------------------------
  // Brass
  // ---------------------------------------------------------------------------

  private eject(group: THREE.Group, weapon: WeaponType, hand: number): void {
    const ports = group.children.filter(o => o.name === 'port' && ((o.userData.hand as number) ?? 0) === hand);
    for (const p of ports) {
      const spec = p.userData.spec as DetailSpec;
      const dir = spec.dir ?? [1, 1, 0.35];
      this.spawnCasing(group, [p.position.x, p.position.y, p.position.z], dir, !!spec.shell);
    }
    void weapon;
  }

  private spawnCasing(group: THREE.Group, local: Vec3, dir: Vec3, shell: boolean): void {
    let slot = this.casings.find(k => k.life <= 0);
    if (!slot) {
      if (this.casings.length >= 24) slot = this.casings.reduce((a, b) => (a.life < b.life ? a : b));
      else {
        const mesh = new THREE.Mesh(this.brassGeo, this.brassMat);
        mesh.castShadow = false; mesh.frustumCulled = false;
        this.root.add(mesh);
        slot = { mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 };
        this.casings.push(slot);
      }
    }
    slot.mesh.geometry = shell ? this.shellGeo : this.brassGeo;
    slot.mesh.material = shell ? this.shellMat : this.brassMat;
    group.updateMatrixWorld(true);
    const world = new THREE.Vector3(local[0], local[1], local[2]);
    group.localToWorld(world);
    this.root.worldToLocal(world);
    slot.mesh.position.copy(world);
    slot.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const spd = shell ? 1.3 : 1.9;
    slot.vel.set(
      dir[0] * spd + (Math.random() - 0.5) * 0.5,
      dir[1] * spd * 0.8 + Math.random() * 0.4,
      dir[2] * spd + (Math.random() - 0.5) * 0.4
    );
    slot.spin.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
    slot.life = 0.75;
    slot.mesh.visible = true;
  }

  private updateCasings(dt: number): void {
    for (const k of this.casings) {
      if (k.life <= 0) continue;
      k.life -= dt;
      if (k.life <= 0) { k.mesh.visible = false; continue; }
      k.vel.y -= 7.5 * dt;
      k.mesh.position.addScaledVector(k.vel, dt);
      k.mesh.rotation.x += k.spin.x * dt;
      k.mesh.rotation.y += k.spin.y * dt;
      k.mesh.rotation.z += k.spin.z * dt;
    }
  }
}
