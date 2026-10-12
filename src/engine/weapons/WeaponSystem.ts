/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WeaponPartAnimator } from './WeaponPartAnimator.ts';
import { WeaponSkinId, SHOP_SKINS } from '../shop/ShopSystem.ts';

export type WeaponType =
  | 'rifle' | 'railgun' | 'shotgun' | 'pistol' | 'melee' | 'rpg' | 'smg' | 'revolver' | 'crossbow'
  | 'lmg' | 'dmr' | 'scattergun' | 'autopistol' | 'dualies' | 'sledge' | 'knife';

/** Loadout slot a weapon occupies. A loadout = one primary + one secondary + one melee. */
export type WeaponSlot = 'primary' | 'secondary' | 'melee';

export interface Loadout { primary: WeaponType; secondary: WeaponType; melee: WeaponType; }
export const DEFAULT_LOADOUT: Loadout = { primary: 'rifle', secondary: 'pistol', melee: 'melee' };
export const LOADOUT_SLOTS: WeaponSlot[] = ['primary', 'secondary', 'melee'];

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
  slot: WeaponSlot;
  /** One-line role description for the deploy screen. */
  role: string;
  damage: number;
  headshotMultiplier: number;
  fireRateRpm: number;
  magazineSize: number;
  reloadTimeSec: number;
  baseSpread: number;
  movingSpreadPenalty: number;
  recoilKickPitch: number;
  recoilKickYaw: number;
  recoilKickZ: number;
  pelletCount: number;
  range: number;
  color: string;
  isMelee?: boolean;
  isExplosive?: boolean;
  /** Fully automatic: holding the trigger keeps firing at fireRateRpm. */
  isAutomatic?: boolean;
  /** ADS field-of-view multiplier (1 = no zoom). */
  adsZoom?: number;
}

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponDef> = {
  rifle: {
    id: 'rifle',
    slot: 'primary',
    role: 'All-rounder. Controllable spray, lethal headshots.',
    adsZoom: 0.8,
    isAutomatic: true,
    name: 'AK-47 Tactical',
    category: 'Assault Rifle (1-Tap Lethal)',
    damage: 36,
    headshotMultiplier: 4.0,
    fireRateRpm: 600,
    magazineSize: 30,
    reloadTimeSec: 2.0,
    baseSpread: 0.003,
    movingSpreadPenalty: 0.08,
    recoilKickPitch: 0.045,
    recoilKickYaw: 0.012,
    recoilKickZ: 0.08,
    pelletCount: 1,
    range: 160,
    color: '#ffcc33'
  },
  railgun: {
    id: 'railgun',
    slot: 'primary',
    role: 'One-shot body at any range. Slow, punishing misses.',
    adsZoom: 0.4,
    name: 'AWP Heavy Sniper',
    category: 'Precision Bolt-Action (1-Shot Body)',
    damage: 115,
    headshotMultiplier: 4.0,
    fireRateRpm: 45,
    magazineSize: 5,
    reloadTimeSec: 2.8,
    baseSpread: 0.0005,
    movingSpreadPenalty: 0.22,
    recoilKickPitch: 0.12,
    recoilKickYaw: 0.02,
    recoilKickZ: 0.24,
    pelletCount: 1,
    range: 300,
    color: '#33ccff'
  },
  smg: {
    id: 'smg',
    slot: 'primary',
    role: 'Sprint-and-spray. Wins close fights, falls off at range.',
    adsZoom: 0.86,
    isAutomatic: true,
    name: 'SMG (Run N Gun)',
    category: 'Submachine Gun (Rapid Spray)',
    damage: 22,
    headshotMultiplier: 2.2,
    fireRateRpm: 920,
    magazineSize: 35,
    reloadTimeSec: 1.6,
    baseSpread: 0.006,
    movingSpreadPenalty: 0.03,
    recoilKickPitch: 0.03,
    recoilKickYaw: 0.012,
    recoilKickZ: 0.05,
    pelletCount: 1,
    range: 110,
    color: '#00e5ff'
  },
  shotgun: {
    id: 'shotgun',
    slot: 'primary',
    role: 'Pump buckshot. Deletes anything inside 10 m.',
    adsZoom: 0.9,
    name: 'SPAS-12 Pump Shotgun',
    category: 'Heavy Close-Quarters Buckshot',
    damage: 18,
    headshotMultiplier: 2.2,
    fireRateRpm: 80,
    magazineSize: 8,
    reloadTimeSec: 2.4,
    baseSpread: 0.045,
    movingSpreadPenalty: 0.02,
    recoilKickPitch: 0.09,
    recoilKickYaw: 0.015,
    recoilKickZ: 0.18,
    pelletCount: 8,
    range: 65,
    color: '#ff8833'
  },
  pistol: {
    id: 'pistol',
    slot: 'secondary',
    role: 'Heavy sidearm. Two body shots, one to the head.',
    adsZoom: 0.8,
    name: 'Desert Eagle .50',
    category: 'Heavy Tactical Handgun',
    damage: 54,
    headshotMultiplier: 2.5,
    fireRateRpm: 280,
    magazineSize: 7,
    reloadTimeSec: 1.5,
    baseSpread: 0.005,
    movingSpreadPenalty: 0.035,
    recoilKickPitch: 0.065,
    recoilKickYaw: 0.008,
    recoilKickZ: 0.07,
    pelletCount: 1,
    range: 100,
    color: '#ffd700'
  },
  revolver: {
    id: 'revolver',
    slot: 'secondary',
    role: 'Precision hand cannon. Slow, rewards accuracy.',
    adsZoom: 0.72,
    name: 'Six-Shooter Revolver',
    category: 'Precision Marksman Cannon',
    damage: 66,
    headshotMultiplier: 3.2,
    fireRateRpm: 210,
    magazineSize: 6,
    reloadTimeSec: 2.1,
    baseSpread: 0.002,
    movingSpreadPenalty: 0.04,
    recoilKickPitch: 0.085,
    recoilKickYaw: 0.008,
    recoilKickZ: 0.09,
    pelletCount: 1,
    range: 140,
    color: '#f59e0b'
  },
  crossbow: {
    id: 'crossbow',
    slot: 'primary',
    role: 'Silent one-shot headshots. Single bolt, re-nock between shots.',
    adsZoom: 0.62,
    name: 'Bowman Crossbow',
    category: 'Silent Precision Projectile',
    damage: 120,
    headshotMultiplier: 2.5,
    fireRateRpm: 48,
    magazineSize: 1,
    reloadTimeSec: 1.8,
    baseSpread: 0.001,
    movingSpreadPenalty: 0.02,
    recoilKickPitch: 0.06,
    recoilKickYaw: 0.005,
    recoilKickZ: 0.07,
    pelletCount: 1,
    range: 240,
    color: '#10b981'
  },
  melee: {
    id: 'melee',
    slot: 'melee',
    role: 'Fast blade. Two swings to kill.',
    adsZoom: 1.0,
    isAutomatic: true,
    name: 'Cyber Katana',
    category: 'Tactical Melee Edge',
    damage: 85,
    headshotMultiplier: 1.5,
    fireRateRpm: 140,
    magazineSize: 1,
    reloadTimeSec: 0.1,
    baseSpread: 0.0,
    movingSpreadPenalty: 0.0,
    recoilKickPitch: 0.02,
    recoilKickYaw: 0.06,
    recoilKickZ: 0.02,
    pelletCount: 1,
    range: 4.5,
    color: '#00ffff',
    isMelee: true
  },
  rpg: {
    id: 'rpg',
    slot: 'primary',
    role: 'Splash damage. One rocket, long reload.',
    adsZoom: 0.85,
    name: 'RPG-7 Warhead',
    category: 'High-Explosive Rocket Launcher',
    damage: 135,
    headshotMultiplier: 1.5,
    fireRateRpm: 35,
    magazineSize: 1,
    reloadTimeSec: 3.2,
    baseSpread: 0.008,
    movingSpreadPenalty: 0.05,
    recoilKickPitch: 0.15,
    recoilKickYaw: 0.01,
    recoilKickZ: 0.28,
    pelletCount: 1,
    range: 220,
    color: '#ff3333',
    isExplosive: true
  },
  lmg: {
    id: 'lmg',
    slot: 'primary',
    role: 'Suppression. 100-round belt, heavy recoil, very long reload.',
    adsZoom: 0.85,
    isAutomatic: true,
    name: 'Bulwark LMG',
    category: 'Light Machine Gun (Sustained Fire)',
    damage: 29,
    headshotMultiplier: 2.5,
    fireRateRpm: 760,
    magazineSize: 100,
    reloadTimeSec: 4.6,
    baseSpread: 0.012,
    movingSpreadPenalty: 0.14,
    recoilKickPitch: 0.06,
    recoilKickYaw: 0.02,
    recoilKickZ: 0.09,
    pelletCount: 1,
    range: 150,
    color: '#8fd16a'
  },
  dmr: {
    id: 'dmr',
    slot: 'primary',
    role: 'Semi-auto marksman. Two body shots, one headshot, fast follow-up.',
    adsZoom: 0.55,
    name: 'Longshot DMR',
    category: 'Designated Marksman Rifle',
    damage: 62,
    headshotMultiplier: 2.2,
    fireRateRpm: 300,
    magazineSize: 12,
    reloadTimeSec: 2.3,
    baseSpread: 0.0012,
    movingSpreadPenalty: 0.12,
    recoilKickPitch: 0.07,
    recoilKickYaw: 0.006,
    recoilKickZ: 0.14,
    pelletCount: 1,
    range: 260,
    color: '#7cc8ff'
  },
  scattergun: {
    id: 'scattergun',
    slot: 'primary',
    role: 'Double-barrel. Two devastating shells, then a quick break-open reload.',
    adsZoom: 0.95,
    name: 'Twin-Bore Scattergun',
    category: 'Break-Action Double Barrel',
    damage: 22,
    headshotMultiplier: 1.4,
    fireRateRpm: 190,
    magazineSize: 2,
    reloadTimeSec: 1.5,
    baseSpread: 0.07,
    movingSpreadPenalty: 0.04,
    recoilKickPitch: 0.16,
    recoilKickYaw: 0.02,
    recoilKickZ: 0.3,
    pelletCount: 11,
    range: 32,
    color: '#ffa552'
  },
  autopistol: {
    id: 'autopistol',
    slot: 'secondary',
    role: 'Full-auto machine pistol. Melts up close, empties in a second.',
    adsZoom: 0.9,
    isAutomatic: true,
    name: 'Viper Machine Pistol',
    category: 'Automatic Sidearm',
    damage: 19,
    headshotMultiplier: 2.0,
    fireRateRpm: 1050,
    magazineSize: 21,
    reloadTimeSec: 1.7,
    baseSpread: 0.02,
    movingSpreadPenalty: 0.06,
    recoilKickPitch: 0.03,
    recoilKickYaw: 0.02,
    recoilKickZ: 0.05,
    pelletCount: 1,
    range: 60,
    color: '#f472b6'
  },
  dualies: {
    id: 'dualies',
    slot: 'secondary',
    role: 'Akimbo pistols. Big magazine, alternating fire, loose accuracy.',
    adsZoom: 1.0,
    isAutomatic: true,
    name: 'Gemini Akimbo',
    category: 'Dual-Wield Pistols',
    damage: 25,
    headshotMultiplier: 2.2,
    fireRateRpm: 640,
    magazineSize: 26,
    reloadTimeSec: 2.4,
    baseSpread: 0.025,
    movingSpreadPenalty: 0.05,
    recoilKickPitch: 0.035,
    recoilKickYaw: 0.03,
    recoilKickZ: 0.06,
    pelletCount: 1,
    range: 70,
    color: '#c4b5fd'
  },
  sledge: {
    id: 'sledge',
    slot: 'melee',
    role: 'Two-handed hammer. One swing kills, but it is slow.',
    isAutomatic: true,
    name: 'Breaker Sledgehammer',
    category: 'Heavy Melee',
    damage: 150,
    headshotMultiplier: 1.0,
    fireRateRpm: 55,
    magazineSize: 1,
    reloadTimeSec: 0.1,
    baseSpread: 0,
    movingSpreadPenalty: 0,
    recoilKickPitch: 0.06,
    recoilKickYaw: 0.0,
    recoilKickZ: 0.0,
    pelletCount: 1,
    range: 3.4,
    color: '#d6d3d1',
    isMelee: true
  },
  knife: {
    id: 'knife',
    slot: 'melee',
    role: 'Fastest swing in the game. Three hits to kill, lets you run at full speed.',
    isAutomatic: true,
    name: 'Fang Combat Knife',
    category: 'Light Melee',
    damage: 40,
    headshotMultiplier: 1.0,
    fireRateRpm: 240,
    magazineSize: 1,
    reloadTimeSec: 0.1,
    baseSpread: 0,
    movingSpreadPenalty: 0,
    recoilKickPitch: 0.01,
    recoilKickYaw: 0.0,
    recoilKickZ: 0.0,
    pelletCount: 1,
    range: 2.6,
    color: '#fde68a',
    isMelee: true
  }
};

/**
 * Physical handling profile. Drives how each viewmodel moves: mass controls sway lag, bob amplitude,
 * recoil recovery and roll; `action` is the mechanical cycle animated after every shot.
 */
export interface FeelProfile {
  /** Approximate mass in kg - the single biggest driver of handling. */
  massKg: number;
  /** Post-shot mechanical cycle animated on named parts. */
  action: 'slide' | 'bolt' | 'pump' | 'break' | 'belt' | 'revolver' | 'crossbow' | 'rocket' | 'none';
  /** Delay before a manual action (bolt / pump / break) starts, seconds. */
  actionDelay: number;
  /** Duration of the action cycle, seconds. */
  actionDur: number;
  /** Visual roll (rad) per shot - revolvers & hand cannons twist, rifles stay flat. */
  kickRoll: number;
  /** Muzzle rise visual multiplier on top of def.recoilKickPitch. */
  riseMul: number;
  /** Melee swing style. */
  melee?: 'slash' | 'stab' | 'overhead';
}

export const FEEL: Record<WeaponType, FeelProfile> = {
  rifle:      { massKg: 3.5, action: 'none',     actionDelay: 0,    actionDur: 0,    kickRoll: 0.02, riseMul: 1.0 },
  railgun:    { massKg: 6.5, action: 'bolt',     actionDelay: 0.28, actionDur: 0.75, kickRoll: 0.03, riseMul: 1.6 },
  smg:        { massKg: 2.6, action: 'none',     actionDelay: 0,    actionDur: 0,    kickRoll: 0.03, riseMul: 0.8 },
  shotgun:    { massKg: 4.2, action: 'pump',     actionDelay: 0.22, actionDur: 0.42, kickRoll: 0.05, riseMul: 1.5 },
  pistol:     { massKg: 2.0, action: 'slide',    actionDelay: 0,    actionDur: 0.11, kickRoll: 0.09, riseMul: 1.4 },
  revolver:   { massKg: 1.3, action: 'revolver', actionDelay: 0,    actionDur: 0.2,  kickRoll: 0.12, riseMul: 1.8 },
  crossbow:   { massKg: 3.2, action: 'crossbow', actionDelay: 0,    actionDur: 0.18, kickRoll: 0.0,  riseMul: 0.3 },
  melee:      { massKg: 1.1, action: 'none',     actionDelay: 0,    actionDur: 0,    kickRoll: 0,    riseMul: 0, melee: 'slash' },
  rpg:        { massKg: 7.0, action: 'rocket',   actionDelay: 0,    actionDur: 0.5,  kickRoll: 0.04, riseMul: 1.2 },
  lmg:        { massKg: 7.5, action: 'belt',     actionDelay: 0,    actionDur: 0.08, kickRoll: 0.025, riseMul: 1.1 },
  dmr:        { massKg: 4.5, action: 'slide',    actionDelay: 0,    actionDur: 0.09, kickRoll: 0.02, riseMul: 1.3 },
  scattergun: { massKg: 3.4, action: 'break',    actionDelay: 0,    actionDur: 0.3,  kickRoll: 0.08, riseMul: 2.0 },
  autopistol: { massKg: 1.2, action: 'slide',    actionDelay: 0,    actionDur: 0.06, kickRoll: 0.07, riseMul: 1.0 },
  dualies:    { massKg: 1.8, action: 'slide',    actionDelay: 0,    actionDur: 0.1,  kickRoll: 0.1,  riseMul: 1.2 },
  sledge:     { massKg: 5.5, action: 'none',     actionDelay: 0,    actionDur: 0,    kickRoll: 0,    riseMul: 0, melee: 'overhead' },
  knife:      { massKg: 0.3, action: 'none',     actionDelay: 0,    actionDur: 0,    kickRoll: 0,    riseMul: 0, melee: 'stab' }
};

export const ALL_WEAPONS: WeaponType[] = Object.keys(WEAPON_DEFINITIONS) as WeaponType[];
export const weaponsForSlot = (slot: WeaponSlot): WeaponType[] => ALL_WEAPONS.filter(w => WEAPON_DEFINITIONS[w].slot === slot);
export const isMeleeWeapon = (w: WeaponType): boolean => !!WEAPON_DEFINITIONS[w].isMelee;
export function sanitizeLoadout(raw: unknown): Loadout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = (slot: WeaponSlot, def: WeaponType): WeaponType => {
    const v = r[slot] as WeaponType;
    return typeof v === 'string' && WEAPON_DEFINITIONS[v]?.slot === slot ? v : def;
  };
  return { primary: pick('primary', DEFAULT_LOADOUT.primary), secondary: pick('secondary', DEFAULT_LOADOUT.secondary), melee: pick('melee', DEFAULT_LOADOUT.melee) };
}

export class WeaponSystem {
  public camera: THREE.Camera;
  public viewmodelRoot: THREE.Group;
  public weaponMeshes: Map<WeaponType, THREE.Group> = new Map();
  public currentWeapon: WeaponType = 'rifle';
  public currentSkin: WeaponSkinId = 'default';

  public ammoInMag: Record<WeaponType, number> = {
    rifle: 30,
    railgun: 5,
    shotgun: 8,
    pistol: 7,
    melee: 1,
    rpg: 1,
    smg: 35,
    revolver: 6,
    crossbow: 1,
    lmg: 100,
    dmr: 12,
    scattergun: 2,
    autopistol: 21,
    dualies: 26,
    sledge: 1,
    knife: 1
  };
  public reserveAmmo: Record<WeaponType, number> = {
    rifle: 90,
    railgun: 20,
    shotgun: 32,
    pistol: 28,
    melee: 999,
    rpg: 4,
    smg: 140,
    revolver: 36,
    crossbow: 15,
    lmg: 200,
    dmr: 48,
    scattergun: 24,
    autopistol: 84,
    dualies: 104,
    sledge: 999,
    knife: 999
  };

  // State
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
  /** Reload stage callbacks (used by the audio layer): fired once per stage per reload. */
  public onReloadStage: ((weapon: WeaponType, stage: string) => void) | null = null;
  private firedReloadStages: Set<string> = new Set();
  private reloadPartCache: Map<THREE.Group, Map<string, { obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[]>> = new Map();
  private reloadPose = { pos: new THREE.Vector3(), rot: new THREE.Vector3() };
  /** Weapon inspect flourish (F). 0 = idle, counts 0..1 over ~2.4 s. */
  private inspectT: number = -1;

  public inspect(): void {
    if (this.isReloading || this.isADS || this.inspectT >= 0 || this.equipTransition < 1) return;
    this.inspectT = 0;
  }

  public cancelInspect(): void { this.inspectT = -1; }
  public isADS: boolean = false;
  private lastFireTime: number = 0;
  public spreadCurrent: number = 0.003;
  private shotSequence: number = 0;
  private equipTransition: number = 1.0;

  // Viewmodel Springs & Sway
  private swayOffset = new THREE.Vector3(0, 0, 0);
  private recoilOffset = new THREE.Vector3(0, 0, 0);
  private recoilRot = new THREE.Vector3(0, 0, 0);
  private bobTime: number = 0;
  /** Seconds since the last shot (drives post-shot action cycles). */
  private sinceShot = 99;
  private recoilRoll = 0;
  /** Alternates for akimbo / dual-slide weapons. */
  private altHand = 0;
  private idleTime = 0;
  private meleeSlashAnim: number = 0;

  // Muzzle Flash
  public muzzleLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;
  private activeSkinMaterials: THREE.MeshStandardMaterial[] = [];
  private partAnimator: WeaponPartAnimator;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.viewmodelRoot = new THREE.Group();
    this.viewmodelRoot.position.set(0, 0, 0);
    this.camera.add(this.viewmodelRoot);

    // Muzzle Flash Point Light
    this.muzzleLight = new THREE.PointLight(0xffcc66, 0, 16);
    this.muzzleLight.position.set(0.24, -0.15, -0.85);
    this.viewmodelRoot.add(this.muzzleLight);

    this.partAnimator = new WeaponPartAnimator(this.viewmodelRoot);
    this.buildIndieBlockyWeapons();
    this.switchWeapon('rifle');
  }

  public setSkin(skinId: WeaponSkinId): void {
    this.currentSkin = skinId;
    const skinDef = SHOP_SKINS[skinId] || SHOP_SKINS.default;

    const baseColor = new THREE.Color(skinDef.colorHex);
    const accentColor = new THREE.Color(skinDef.accentHex);

    this.activeSkinMaterials.forEach(mat => {
      mat.color.copy(baseColor);
      if (skinId === 'gold') {
        mat.metalness = 0.95;
        mat.roughness = 0.15;
        mat.emissive.setHex(0x332200);
      } else if (skinId === 'neon') {
        mat.metalness = 0.4;
        mat.roughness = 0.2;
        mat.emissive.copy(accentColor).multiplyScalar(0.45);
      } else if (skinId === 'dragon') {
        mat.metalness = 0.3;
        mat.roughness = 0.4;
        mat.emissive.setHex(0x551100);
      } else if (skinId === 'void') {
        mat.metalness = 0.7;
        mat.roughness = 0.2;
        mat.emissive.setHex(0x330055);
      } else {
        mat.metalness = 0.8;
        mat.roughness = 0.35;
        mat.emissive.setHex(0x000000);
      }
      mat.needsUpdate = true;
    });
  }

  /**
   * Procedural operator arms. Hands are placed exactly on the weapon's grip anchors and the
   * forearm / upper arm are solved back toward the shoulder (camera space), so every weapon is
   * held naturally instead of sharing one fixed arm pose.
   *
   * @param groupPos   weapon group position in camera space (used to convert shoulders to weapon-local)
   * @param grips      grip anchors in weapon-local space; omit `left` for one-handed holds
   */
  private createOperatorArms(
    groupPos: [number, number, number],
    grips: { right: [number, number, number]; left?: [number, number, number] }
  ): { armLeft: THREE.Group; armRight: THREE.Group } {
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.6, metalness: 0.1 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.7, metalness: 0.2 });

    // Shoulder sockets in camera space (just outside the frustum edge, below eye level)
    const shoulderCam = { right: [0.21, -0.32, 0.18], left: [-0.21, -0.32, 0.18] } as const;

    const segment = (a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, mat: THREE.Material): THREE.Mesh => {
      const len = Math.max(0.02, a.distanceTo(b));
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.lookAt(b);
      m.castShadow = false;
      return m;
    };

    const buildArm = (gripLocal: [number, number, number], side: 'right' | 'left', mirror: number): THREE.Group => {
      const g = new THREE.Group();
      const hand = new THREE.Vector3(...gripLocal);
      const sc = shoulderCam[side];
      const shoulder = new THREE.Vector3(sc[0] - groupPos[0], sc[1] - groupPos[1], sc[2] - groupPos[2]);
      // Elbow: 42% of the way back to the shoulder, dropped and flared outward for a bent-arm look
      const elbow = hand.clone().lerp(shoulder, 0.42);
      elbow.y -= 0.07;
      elbow.x += mirror * 0.05;
      // Hand block sits on the grip, oriented along the forearm
      const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.07, 0.1), gloveMat);
      handMesh.position.copy(hand);
      handMesh.lookAt(elbow);
      handMesh.name = 'hand';
      g.add(handMesh);
      if (side === 'right') {
        // Index finger: rests along the frame, curls onto the trigger when firing
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.055), gloveMat);
        finger.position.set(hand.x - 0.004, hand.y + 0.012, hand.z - 0.07);
        finger.rotation.x = 0.2;
        finger.name = 'finger';
        g.add(finger);
      }
      // Wrist cuff -> forearm -> upper arm
      const wrist = hand.clone().lerp(elbow, 0.12);
      g.add(segment(wrist, elbow, 0.085, 0.085, sleeveMat));
      g.add(segment(elbow, shoulder, 0.1, 0.1, sleeveMat));
      return g;
    };

    const armRight = buildArm(grips.right, 'right', 1);
    armRight.name = 'armRight';
    const armLeft = grips.left ? buildArm(grips.left, 'left', -1) : new THREE.Group();
    armLeft.name = 'armLeft';
    return { armLeft, armRight };
  }

  /**
   * Builds high-fidelity, distinct blocky indie 3D viewmodels
   */
  private buildIndieBlockyWeapons(): void {
    // Physically based gunmetal: anisotropic-feeling brushed steel with a thin clearcoat
    const steelBaseMat = new THREE.MeshPhysicalMaterial({
      color: 0x262b32,
      metalness: 0.9,
      roughness: 0.32,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      envMapIntensity: 1.3
    });
    const woodMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a3222,
      metalness: 0.0,
      roughness: 0.45,
      clearcoat: 0.6,
      clearcoatRoughness: 0.35,
      sheen: 0.2,
      sheenColor: new THREE.Color(0x7a5a3a)
    });
    const darkSteelMat = new THREE.MeshPhysicalMaterial({
      color: 0x111316,
      metalness: 0.95,
      roughness: 0.28,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1.3
    });

    // 1. AK-47 Tactical (Assault Rifle with blocky receiver, curved banana mag, wood guard)
    const akGroup = new THREE.Group();
    const akSkinMat = steelBaseMat.clone();
    this.activeSkinMaterials.push(akSkinMat);

    // Receiver
    const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), akSkinMat);
    akGroup.add(akReceiver);
    const akGroupGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    akGroupGrip.position.set(0, -0.1, 0.1);
    akGroupGrip.rotation.x = -0.3;
    akGroup.add(akGroupGrip);

    // Curved Banana Magazine
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.13), darkSteelMat);
    akMag.name = 'mag';
    akMag.position.set(0, -0.14, -0.06);
    akMag.rotation.x = 0.26;
    akGroup.add(akMag);

    // Wooden Handguard
    const akHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.28), woodMat);
    akHandguard.position.set(0, 0.03, -0.38);
    akGroup.add(akHandguard);

    // Barrel & Slant Muzzle Brake
    const akBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.45), darkSteelMat);
    akBarrel.position.set(0, 0.03, -0.65);
    akGroup.add(akBarrel);

    const akMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.08), darkSteelMat);
    akMuzzle.position.set(0, 0.03, -0.88);
    akMuzzle.name = 'muzzle';
    akGroup.add(akMuzzle);

    // Front & Rear Sights
    const akFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.055, 0.02), darkSteelMat);
    akFrontSight.position.set(0, 0.075, -0.82);
    akGroup.add(akFrontSight);

    // Add Player Arms
    const akArms = this.createOperatorArms([0.24, -0.22, -0.5], { right: [0.0, -0.11, 0.1], left: [0.0, -0.04, -0.4] });
    akGroup.add(akArms.armLeft);
    akGroup.add(akArms.armRight);

    akGroup.position.set(0.24, -0.22, -0.5);
    this.viewmodelRoot.add(akGroup);
    this.weaponMeshes.set('rifle', akGroup);

    // 2. AWP Heavy Sniper Rifle (Massive olive/camo chassis, long barrel, giant optical scope)
    const awpGroup = new THREE.Group();
    const awpSkinMat = steelBaseMat.clone();
    awpSkinMat.color.setHex(0x2f3b2d); // Tactical olive chassis
    this.activeSkinMaterials.push(awpSkinMat);

    const awpStock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.8), awpSkinMat);
    awpGroup.add(awpStock);
    const awpGroupGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    awpGroupGrip.position.set(0, -0.09, 0.08);
    awpGroupGrip.rotation.x = -0.3;
    awpGroup.add(awpGroupGrip);

    const awpLongBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.95), darkSteelMat);
    awpLongBarrel.position.set(0, 0.04, -0.85);
    awpGroup.add(awpLongBarrel);

    const awpMuzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.14), darkSteelMat);
    awpMuzzleBrake.position.set(0, 0.04, -1.35);
    awpMuzzleBrake.name = 'muzzle';
    awpGroup.add(awpMuzzleBrake);

    // Giant Optical Scope Tube
    const awpScope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), darkSteelMat);
    awpScope.name = 'scope';
    awpScope.rotation.x = Math.PI / 2;
    awpScope.position.set(0, 0.15, -0.18);
    awpGroup.add(awpScope);

    const awpLens = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.08, 16), darkSteelMat);
    awpLens.rotation.x = Math.PI / 2;
    awpLens.position.set(0, 0.15, -0.38);
    awpGroup.add(awpLens);

    const awpBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), darkSteelMat);
    awpBolt.name = 'bolt';
    awpBolt.rotation.z = Math.PI / 2;
    awpBolt.position.set(0.07, 0.07, -0.05);
    awpGroup.add(awpBolt);
    const awpMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.14), darkSteelMat);
    awpMag.name = 'mag';
    awpMag.position.set(0, -0.12, -0.12);
    awpGroup.add(awpMag);

    const awpArms = this.createOperatorArms([0.25, -0.24, -0.52], { right: [0.0, -0.1, 0.08], left: [0.0, -0.03, -0.55] });
    awpGroup.add(awpArms.armLeft);
    awpGroup.add(awpArms.armRight);

    awpGroup.position.set(0.25, -0.24, -0.52);
    awpGroup.visible = false;
    this.viewmodelRoot.add(awpGroup);
    this.weaponMeshes.set('railgun', awpGroup);

    // 3. SPAS-12 Pump Shotgun (Heavy bore barrel, heat shield, ribbed pump forend)
    const spasGroup = new THREE.Group();
    const spasSkinMat = steelBaseMat.clone();
    this.activeSkinMaterials.push(spasSkinMat);

    const spasReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.55), spasSkinMat);
    spasGroup.add(spasReceiver);
    const spasGroupGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    spasGroupGrip.position.set(0, -0.09, 0.06);
    spasGroupGrip.rotation.x = -0.3;
    spasGroup.add(spasGroupGrip);

    const spasBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.65), darkSteelMat);
    spasBarrel.position.set(0, 0.035, -0.55);
    spasGroup.add(spasBarrel);

    const spasMagTube = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.58), darkSteelMat);
    spasMagTube.position.set(0, -0.02, -0.52);
    spasGroup.add(spasMagTube);

    // Ribbed Pump Slide
    const spasPump = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.22), darkSteelMat);
    spasPump.name = 'pump';
    spasPump.position.set(0, 0.005, -0.42);
    spasGroup.add(spasPump);

    const spasArms = this.createOperatorArms([0.24, -0.22, -0.5], { right: [0.0, -0.1, 0.06], left: [0.0, -0.05, -0.42] });
    spasGroup.add(spasArms.armLeft);
    spasGroup.add(spasArms.armRight);

    spasGroup.position.set(0.24, -0.22, -0.5);
    spasGroup.visible = false;
    this.viewmodelRoot.add(spasGroup);
    this.weaponMeshes.set('shotgun', spasGroup);

    // 4. Desert Eagle .50 (Polished blocky chrome slide & heavy hammer)
    const deagleGroup = new THREE.Group();
    const deagleSkinMat = steelBaseMat.clone();
    deagleSkinMat.metalness = 0.95;
    deagleSkinMat.roughness = 0.15;
    this.activeSkinMaterials.push(deagleSkinMat);

    // Slide
    const deagleSlide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.36), deagleSkinMat);
    deagleSlide.name = 'slide';
    deagleSlide.position.set(0, 0.04, -0.15);
    deagleGroup.add(deagleSlide);

    // Grip
    const deagleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.18, 0.09), darkSteelMat);
    deagleGrip.position.set(0, -0.07, -0.02);
    deagleGrip.rotation.x = -0.25;
    deagleGroup.add(deagleGrip);

    // Heavy Bore Barrel
    const deagleBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), darkSteelMat);
    deagleBarrel.position.set(0, 0.045, -0.35);
    deagleGroup.add(deagleBarrel);

    const deagleArms = this.createOperatorArms([0.22, -0.2, -0.42], { right: [0.0, -0.12, -0.01], left: [-0.045, -0.14, -0.03] });
    deagleGroup.add(deagleArms.armLeft);
    deagleGroup.add(deagleArms.armRight);

    deagleGroup.position.set(0.22, -0.2, -0.42);
    deagleGroup.visible = false;
    this.viewmodelRoot.add(deagleGroup);
    this.weaponMeshes.set('pistol', deagleGroup);

    // 5. Cyber Katana (Sleek blocky tactical blade with glowing edge)
    const katanaGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0088cc
    });
    this.activeSkinMaterials.push(bladeMat);

    const spineMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.85, roughness: 0.3 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: 0.9, metalness: 0.05 });
    const menukiMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.9, roughness: 0.25 });

    // Blade: three segments with a gentle sori (curve) so the tip sweeps up; glowing edge + dark spine on one axis
    const segLen = 0.26;
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Group();
      const curve = i * 0.055;
      seg.position.set(0, i * 0.012 + i * i * 0.006, -0.03 - i * segLen);
      seg.rotation.x = curve;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, segLen + 0.01), spineMat);
      spine.position.set(0, 0.005, -segLen / 2);
      seg.add(spine);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, segLen + 0.01), bladeMat);
      edge.name = 'edge';
      edge.position.set(0, -0.016, -segLen / 2);
      seg.add(edge);
      katanaGroup.add(seg);
    }
    // Kissaki (tip) — tapered wedge
    const kissaki = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 4), bladeMat);
    kissaki.rotation.x = -Math.PI / 2 + 0.11; kissaki.rotation.z = Math.PI / 4;
    kissaki.position.set(0, 0.075, -0.855);
    katanaGroup.add(kissaki);

    // Tsuba (guard), habaki collar, wrapped tsuka with menuki and kashira cap
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 8), darkSteelMat);
    tsuba.rotation.x = Math.PI / 2;
    tsuba.position.set(0, 0, 0);
    katanaGroup.add(tsuba);
    const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.03), menukiMat);
    habaki.position.set(0, 0, -0.02);
    katanaGroup.add(habaki);
    const tsuka = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.27), wrapMat);
    tsuka.position.set(0, 0, 0.14);
    katanaGroup.add(tsuka);
    for (let i = 0; i < 5; i++) {
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.012), spineMat);
      wrap.position.set(0, 0, 0.03 + i * 0.05);
      wrap.rotation.z = (i % 2 ? 1 : -1) * 0.5;
      katanaGroup.add(wrap);
    }
    const kashira = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.02), darkSteelMat);
    kashira.position.set(0, 0, 0.285);
    katanaGroup.add(kashira);

    // Two-hand grip: right hand up against the tsuba, left hand at the pommel
    const katanaRest: [number, number, number] = [0.12, -0.22, -0.36];
    const katanaArms = this.createOperatorArms(katanaRest, { right: [0.0, 0.0, 0.06], left: [0.0, 0.0, 0.22] });
    katanaGroup.add(katanaArms.armLeft);
    katanaGroup.add(katanaArms.armRight);

    katanaGroup.position.set(katanaRest[0], katanaRest[1], katanaRest[2]);
    // Chudan guard: tip raised, angled in toward centre screen, edge canted
    katanaGroup.userData.baseRot = new THREE.Euler(0.42, 0.32, 0.28);
    katanaGroup.visible = false;
    this.viewmodelRoot.add(katanaGroup);
    this.weaponMeshes.set('melee', katanaGroup);

    // 6. RPG-7 Rocket Launcher (Massive launch tube + protruding green warhead)
    const rpgGroup = new THREE.Group();
    const rpgSkinMat = steelBaseMat.clone();
    this.activeSkinMaterials.push(rpgSkinMat);

    // Main Tube
    const rpgTube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.1, 16), rpgSkinMat);
    rpgTube.rotation.x = Math.PI / 2;
    rpgTube.position.set(0, 0.05, -0.3);
    rpgGroup.add(rpgTube);
    const rpgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    rpgGrip.position.set(0, -0.06, -0.08);
    rpgGrip.rotation.x = -0.3;
    rpgGroup.add(rpgGrip);
    const rpgForeGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), darkSteelMat);
    rpgForeGrip.position.set(0, -0.06, -0.38);
    rpgGroup.add(rpgForeGrip);

    // Wooden Heat Shield wrap
    const rpgWood = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.35, 16), woodMat);
    rpgWood.rotation.x = Math.PI / 2;
    rpgWood.position.set(0, 0.05, -0.2);
    rpgGroup.add(rpgWood);

    // Protruding Rocket Warhead
    const warheadMat = new THREE.MeshStandardMaterial({
      color: 0x3d6b35, // Olive Warhead
      roughness: 0.5,
      metalness: 0.2
    });
    const warheadCone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 16), warheadMat);
    warheadCone.name = 'warhead';
    warheadCone.rotation.x = -Math.PI / 2;
    warheadCone.position.set(0, 0.05, -0.95);
    rpgGroup.add(warheadCone);

    const warheadBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 16), warheadMat);
    warheadBase.name = 'warhead';
    warheadBase.rotation.x = Math.PI / 2;
    warheadBase.position.set(0, 0.05, -0.84);
    rpgGroup.add(warheadBase);

    // Optical Sight
    const rpgSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.09), darkSteelMat);
    rpgSight.position.set(-0.07, 0.12, -0.25);
    rpgGroup.add(rpgSight);

    const rpgArms = this.createOperatorArms([0.24, -0.15, -0.38], { right: [0.0, -0.07, -0.08], left: [0.0, -0.07, -0.38] });
    rpgGroup.add(rpgArms.armLeft);
    rpgGroup.add(rpgArms.armRight);

    rpgGroup.position.set(0.24, -0.15, -0.38);
    rpgGroup.visible = false;
    this.viewmodelRoot.add(rpgGroup);
    this.weaponMeshes.set('rpg', rpgGroup);

    // 7. SMG (Run N Gun) - Compact Tactical Machine Pistol (High RoF)
    const smgGroup = new THREE.Group();
    const smgSkinMat = steelBaseMat.clone();
    smgSkinMat.color.setHex(0x1a232b);
    this.activeSkinMaterials.push(smgSkinMat);

    // Receiver
    const smgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.38), smgSkinMat);
    smgGroup.add(smgReceiver);
    const smgGroupGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    smgGroupGrip.position.set(0, -0.1, 0.06);
    smgGroupGrip.rotation.x = -0.3;
    smgGroup.add(smgGroupGrip);

    // Extended Stick Magazine
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.06), darkSteelMat);
    smgMag.name = 'mag';
    smgMag.position.set(0, -0.14, 0.02);
    smgMag.rotation.x = -0.1;
    smgGroup.add(smgMag);

    // Short Barrel & Flash Hider
    const smgBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.18), darkSteelMat);
    smgBarrel.position.set(0, 0.02, -0.26);
    smgGroup.add(smgBarrel);

    // Tactical Reflex Red Dot Sight
    const reflexSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.08), darkSteelMat);
    reflexSight.position.set(0, 0.085, -0.06);
    smgGroup.add(reflexSight);

    const smgArms = this.createOperatorArms([0.20, -0.14, -0.36], { right: [0.0, -0.11, 0.06], left: [0.0, -0.06, -0.2] });
    smgGroup.add(smgArms.armLeft);
    smgGroup.add(smgArms.armRight);

    smgGroup.position.set(0.20, -0.14, -0.36);
    smgGroup.visible = false;
    this.viewmodelRoot.add(smgGroup);
    this.weaponMeshes.set('smg', smgGroup);

    // 8. Six-Shooter Marksman Revolver (Western Cannon)
    const revGroup = new THREE.Group();
    const revSkinMat = steelBaseMat.clone();
    revSkinMat.metalness = 0.95;
    revSkinMat.roughness = 0.2;
    this.activeSkinMaterials.push(revSkinMat);

    // Octagonal Long Barrel
    const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.36), revSkinMat);
    revBarrel.position.set(0, 0.04, -0.26);
    revGroup.add(revBarrel);

    // Revolver Cylinder (Six-Shooter drum)
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12), darkSteelMat);
    cylinder.name = 'cylinder';
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.02, -0.05);
    revGroup.add(cylinder);

    // Wood Hand Grip
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), woodMat);
    revGrip.position.set(0, -0.07, 0.04);
    revGrip.rotation.x = -0.32;
    revGroup.add(revGrip);

    const revArms = this.createOperatorArms([0.20, -0.14, -0.35], { right: [0.0, -0.12, 0.05], left: [-0.045, -0.14, 0.03] });
    revGroup.add(revArms.armLeft);
    revGroup.add(revArms.armRight);

    revGroup.position.set(0.20, -0.14, -0.35);
    revGroup.visible = false;
    this.viewmodelRoot.add(revGroup);
    this.weaponMeshes.set('revolver', revGroup);

    // 9. Bowman Crossbow (Silent Precision Projectile)
    const xbowGroup = new THREE.Group();
    const xbowSkinMat = steelBaseMat.clone();
    xbowSkinMat.color.setHex(0x2d3a29); // Olive Hunter
    this.activeSkinMaterials.push(xbowSkinMat);

    // Crossbow Stock & Flight Rail
    const xbowRail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.65), xbowSkinMat);
    xbowGroup.add(xbowRail);
    const xbowGroupGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.07), darkSteelMat);
    xbowGroupGrip.position.set(0, -0.08, 0.02);
    xbowGroupGrip.rotation.x = -0.3;
    xbowGroup.add(xbowGroupGrip);

    // Horizontal Bow Limbs
    const bowLimbs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.04), darkSteelMat);
    bowLimbs.position.set(0, 0.02, -0.32);
    bowLimbs.name = 'limb';
    xbowGroup.add(bowLimbs);

    // Loaded High-Velocity Arrow Bolt
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), darkSteelMat);
    arrowShaft.name = 'bolt';
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.set(0, 0.05, -0.22);
    xbowGroup.add(arrowShaft);

    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 }));
    arrowTip.name = 'bolt';
    arrowTip.rotation.x = -Math.PI / 2;
    arrowTip.position.set(0, 0.05, -0.45);
    xbowGroup.add(arrowTip);

    const xbowArms = this.createOperatorArms([0.22, -0.15, -0.38], { right: [0.0, -0.09, 0.02], left: [0.0, -0.05, -0.28] });
    xbowGroup.add(xbowArms.armLeft);
    xbowGroup.add(xbowArms.armRight);

    xbowGroup.position.set(0.22, -0.15, -0.38);
    xbowGroup.visible = false;
    this.viewmodelRoot.add(xbowGroup);
    this.weaponMeshes.set('crossbow', xbowGroup);

    // ------------------------------------------------------------------ expansion roster
    const finish = (g: THREE.Group, id: WeaponType, pos: [number, number, number]) => {
      g.position.set(pos[0], pos[1], pos[2]);
      g.visible = false;
      this.viewmodelRoot.add(g);
      this.weaponMeshes.set(id, g);
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, name?: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (name) m.name = name;
      return m;
    };
    const cyl = (r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, name?: string) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      m.rotation.x = Math.PI / 2;
      m.position.set(x, y, z);
      if (name) m.name = name;
      return m;
    };

    // 10. Bulwark LMG - long heavy receiver, box belt-feed, bipod, thick barrel shroud
    {
      const g = new THREE.Group();
      const skin = steelBaseMat.clone(); skin.color.setHex(0x2e3a2a); this.activeSkinMaterials.push(skin);
      g.add(box(0.09, 0.13, 0.6, skin, 0, 0, -0.02));
      g.add(box(0.14, 0.12, 0.16, darkSteelMat, -0.08, -0.08, -0.02, 'mag')); // belt box, side-mounted
      g.add(box(0.05, 0.14, 0.07, darkSteelMat, 0, -0.1, 0.12)); // pistol grip
      g.add(box(0.07, 0.11, 0.2, darkSteelMat, 0, -0.01, 0.38)); // stock
      g.add(cyl(0.028, 0.6, darkSteelMat, 0, 0.03, -0.6)); // barrel
      g.add(box(0.07, 0.07, 0.42, darkSteelMat, 0, 0.03, -0.5)); // shroud
      for (const sx of [-1, 1]) { const leg = box(0.015, 0.2, 0.015, darkSteelMat, sx * 0.04, -0.1, -0.62); leg.rotation.z = sx * 0.25; g.add(leg); }
      g.add(box(0.03, 0.06, 0.03, darkSteelMat, 0, 0.09, 0.0, 'bolt')); // charging handle
      g.add(box(0.018, 0.05, 0.02, darkSteelMat, 0, 0.09, -0.86)); // front sight
      const arms = this.createOperatorArms([0.24, -0.2, -0.48], { right: [0, -0.12, 0.12], left: [0, -0.04, -0.4] });
      g.add(arms.armLeft, arms.armRight);
      finish(g, 'lmg', [0.24, -0.2, -0.48]);
    }

    // 11. Longshot DMR - slim receiver, mid-power scope, long fluted barrel, skeleton stock
    {
      const g = new THREE.Group();
      const skin = steelBaseMat.clone(); skin.color.setHex(0x3a3f4a); this.activeSkinMaterials.push(skin);
      g.add(box(0.07, 0.1, 0.5, skin, 0, 0, -0.05));
      g.add(box(0.045, 0.2, 0.08, darkSteelMat, 0, -0.12, -0.02, 'mag'));
      g.add(box(0.05, 0.13, 0.07, darkSteelMat, 0, -0.09, 0.1)); // grip
      g.add(box(0.05, 0.08, 0.22, darkSteelMat, 0, 0.0, 0.36)); // stock
      g.add(box(0.06, 0.07, 0.3, darkSteelMat, 0, 0.0, -0.42)); // handguard
      g.add(cyl(0.016, 0.55, darkSteelMat, 0, 0.03, -0.75));
      g.add(cyl(0.03, 0.22, darkSteelMat, 0, 0.11, -0.12)); // scope tube
      const lens = cyl(0.028, 0.02, new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x114466, roughness: 0.1, metalness: 0.4 }), 0, 0.11, -0.24);
      g.add(lens);
      g.add(box(0.012, 0.03, 0.05, darkSteelMat, 0.04, 0.05, 0.0, 'bolt')); // charging handle
      const arms = this.createOperatorArms([0.24, -0.22, -0.5], { right: [0, -0.1, 0.1], left: [0, -0.04, -0.45] });
      g.add(arms.armLeft, arms.armRight);
      finish(g, 'dmr', [0.24, -0.22, -0.5]);
    }

    // 12. Twin-Bore Scattergun - side-by-side barrels, break-action breech, wooden stock
    {
      const g = new THREE.Group();
      const skin = steelBaseMat.clone(); skin.color.setHex(0x3b2f2a); this.activeSkinMaterials.push(skin);
      const breech = new THREE.Group(); breech.name = 'breech'; breech.position.set(0, 0, -0.12);
      for (const sx of [-1, 1]) breech.add(cyl(0.022, 0.62, darkSteelMat, sx * 0.025, 0.02, -0.31));
      breech.add(box(0.075, 0.06, 0.16, woodMat, 0, -0.01, -0.22)); // fore-end
      g.add(breech);
      g.add(box(0.08, 0.09, 0.14, skin, 0, 0.0, -0.05)); // receiver
      g.add(box(0.05, 0.12, 0.07, woodMat, 0, -0.09, 0.05)); // grip
      g.add(box(0.06, 0.1, 0.26, woodMat, 0, -0.02, 0.26)); // stock
      g.add(box(0.03, 0.025, 0.08, darkSteelMat, 0, 0.065, -0.02, 'bolt')); // top lever
      const arms = this.createOperatorArms([0.23, -0.21, -0.46], { right: [0, -0.1, 0.05], left: [0, -0.04, -0.36] });
      g.add(arms.armLeft, arms.armRight);
      finish(g, 'scattergun', [0.23, -0.21, -0.46]);
    }

    // 13. Viper Machine Pistol - compact slide, extended magazine, folding stock stub
    {
      const g = new THREE.Group();
      const skin = steelBaseMat.clone(); skin.color.setHex(0x23262d); skin.roughness = 0.2; this.activeSkinMaterials.push(skin);
      g.add(box(0.06, 0.07, 0.3, skin, 0, 0.04, -0.12, 'slide'));
      g.add(box(0.062, 0.06, 0.24, darkSteelMat, 0, -0.01, -0.09)); // frame
      g.add(box(0.055, 0.17, 0.085, darkSteelMat, 0, -0.1, -0.01)); // grip
      g.add(box(0.04, 0.16, 0.05, darkSteelMat, 0, -0.26, -0.01, 'mag')); // extended mag below grip
      g.add(box(0.03, 0.03, 0.08, darkSteelMat, 0, 0.0, 0.1)); // stock stub
      g.add(cyl(0.013, 0.08, darkSteelMat, 0, 0.045, -0.3));
      const arms = this.createOperatorArms([0.22, -0.2, -0.42], { right: [0, -0.12, -0.01], left: [-0.045, -0.14, -0.03] });
      g.add(arms.armLeft, arms.armRight);
      finish(g, 'autopistol', [0.22, -0.2, -0.42]);
    }

    // 14. Gemini Akimbo - two pistols, one per hand (left mirrored)
    {
      const g = new THREE.Group();
      const skin = steelBaseMat.clone(); skin.color.setHex(0x4b4e6d); skin.metalness = 0.95; skin.roughness = 0.18; this.activeSkinMaterials.push(skin);
      const mkPistol = (x: number, mirror: boolean) => {
        const p = new THREE.Group();
        p.add(box(0.055, 0.07, 0.3, skin, 0, 0.04, -0.13, 'slide'));
        p.add(box(0.058, 0.055, 0.22, darkSteelMat, 0, -0.01, -0.1));
        const grip = box(0.05, 0.16, 0.08, darkSteelMat, 0, -0.08, -0.01); grip.rotation.x = -0.25; p.add(grip);
        p.add(box(0.04, 0.06, 0.05, darkSteelMat, 0, -0.17, -0.02, 'mag'));
        p.add(cyl(0.012, 0.06, darkSteelMat, 0, 0.045, -0.3));
        p.position.x = x;
        p.rotation.z = mirror ? 0.08 : -0.08;
        return p;
      };
      g.add(mkPistol(0.0, false));
      g.add(mkPistol(-0.42, true));
      // Two independent one-handed arms
      const right = this.createOperatorArms([0.22, -0.2, -0.42], { right: [0, -0.12, -0.01] }).armRight;
      const left = this.createOperatorArms([0.22, -0.2, -0.42], { right: [0, 0, 0], left: [-0.42, -0.12, -0.01] }).armLeft;
      g.add(right, left);
      finish(g, 'dualies', [0.22, -0.2, -0.42]);
    }

    // 15. Breaker Sledgehammer - long haft, massive steel head carried over the shoulder
    {
      const g = new THREE.Group();
      const headMat = steelBaseMat.clone(); headMat.color.setHex(0x55595f); headMat.roughness = 0.5; this.activeSkinMaterials.push(headMat);
      const haft = cyl(0.02, 0.9, woodMat, 0, 0.0, -0.2); g.add(haft);
      g.add(box(0.12, 0.12, 0.22, headMat, 0, 0.0, -0.62, 'head'));
      g.add(box(0.13, 0.13, 0.03, darkSteelMat, 0, 0.0, -0.74));
      g.add(box(0.13, 0.13, 0.03, darkSteelMat, 0, 0.0, -0.5));
      g.add(cyl(0.028, 0.14, darkSteelMat, 0, 0.0, 0.18)); // grip wrap
      const arms = this.createOperatorArms([0.2, -0.22, -0.4], { right: [0, 0.0, 0.16], left: [0, 0.0, -0.05] });
      g.add(arms.armLeft, arms.armRight);
      g.userData.baseRot = new THREE.Euler(-0.35, 0.25, 0.1);
      finish(g, 'sledge', [0.2, -0.22, -0.4]);
    }

    // 16. Fang Combat Knife - short blade, serrated spine, reverse grip
    {
      const g = new THREE.Group();
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0xdadde3, metalness: 0.95, roughness: 0.12 });
      this.activeSkinMaterials.push(edgeMat);
      const blade = box(0.012, 0.045, 0.26, edgeMat, 0, 0.03, -0.2); g.add(blade);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), edgeMat); tip.rotation.x = -Math.PI / 2; tip.rotation.z = Math.PI / 4; tip.position.set(0, 0.03, -0.36); g.add(tip);
      g.add(box(0.05, 0.06, 0.02, darkSteelMat, 0, 0.03, -0.07)); // guard
      g.add(box(0.03, 0.035, 0.14, darkSteelMat, 0, 0.03, 0.01)); // handle
      const arms = this.createOperatorArms([0.2, -0.22, -0.4], { right: [0, 0.03, 0.02] });
      g.add(arms.armRight);
      g.userData.baseRot = new THREE.Euler(0.1, -0.5, 0.2);
      finish(g, 'knife', [0.2, -0.22, -0.4]);
    }

    // Living details on every weapon: triggers, hammers, chargers, ports, slings, belts, strings
    this.weaponMeshes.forEach((group, id) => this.partAnimator.attachDetails(group, id, darkSteelMat));
    this.reloadPartCache.clear();
  }

  public switchWeapon(type: WeaponType): void {
    if (this.currentWeapon === type && this.weaponMeshes.get(type)?.visible) return;
    this.weaponMeshes.forEach((mesh, key) => {
      mesh.visible = key === type;
    });
    this.currentWeapon = type;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.shotSequence = 0;
    this.equipTransition = 0.0; // Trigger snappy equip lift
    this.inspectT = -1;
    this.sinceShot = 99;
    this.recoilRoll = 0;
  }

  public canFire(): boolean {
    if (this.isReloading) return false;
    if (!isMeleeWeapon(this.currentWeapon) && this.ammoInMag[this.currentWeapon] <= 0) return false;

    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    const fireIntervalMs = (60 / def.fireRateRpm) * 1000;
    return performance.now() - this.lastFireTime >= fireIntervalMs;
  }

  public fire(): { def: WeaponDef; pellets: number } | null {
    if (!this.canFire()) return null;

    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    this.lastFireTime = performance.now();
    this.inspectT = -1;
    if (!isMeleeWeapon(this.currentWeapon)) {
      this.ammoInMag[this.currentWeapon]--;
    }
    this.shotSequence++;

    // CS2 / Rivals Recoil Pattern, scaled by the weapon's handling profile
    const feel = FEEL[this.currentWeapon];
    const sprayY = Math.sin(this.shotSequence * 0.8) * def.recoilKickYaw;
    this.recoilOffset.z += def.recoilKickZ;
    this.recoilRot.x += def.recoilKickPitch * feel.riseMul;
    this.recoilRot.y += sprayY;
    this.recoilRoll += feel.kickRoll * (this.shotSequence % 2 === 0 ? 1 : -0.6);
    this.sinceShot = 0;
    this.altHand ^= 1;
    const fireMesh = this.weaponMeshes.get(this.currentWeapon);
    if (fireMesh) this.partAnimator.onFire(this.currentWeapon, fireMesh, this.altHand, feel.action, feel.actionDelay, feel.actionDur);

    if (isMeleeWeapon(this.currentWeapon)) {
      this.meleeSlashAnim = 1.0;
    }

    // Accuracy bloom
    this.spreadCurrent = Math.min(this.spreadCurrent + 0.025, 0.2);

    // Muzzle flash
    this.muzzleLight.intensity = this.currentWeapon === 'rpg' ? 12.0 : (this.currentWeapon === 'railgun' ? 8.0 : 5.0);
    this.muzzleFlashTimer = 0.055;

    return {
      def,
      pellets: def.pelletCount
    };
  }

  public reload(): boolean {
    if (this.isReloading || isMeleeWeapon(this.currentWeapon)) return false;
    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    if (this.ammoInMag[this.currentWeapon] >= def.magazineSize) return false;
    if (this.reserveAmmo[this.currentWeapon] <= 0) return false;

    this.isReloading = true;
    this.firedReloadStages.clear();
    this.inspectT = -1;
    this.reloadProgress = 0;
    this.shotSequence = 0;
    return true;
  }

  public update(
    dt: number,
    mouseDeltaX: number,
    mouseDeltaY: number,
    horizontalSpeed: number,
    isSliding: boolean = false
  ): void {
    const def = WEAPON_DEFINITIONS[this.currentWeapon];

    // Reload timer
    if (this.isReloading) {
      this.reloadProgress += dt / def.reloadTimeSec;
      if (this.reloadProgress >= 1.0) {
        const needed = def.magazineSize - this.ammoInMag[this.currentWeapon];
        const loaded = Math.min(needed, this.reserveAmmo[this.currentWeapon]);
        this.ammoInMag[this.currentWeapon] += loaded;
        this.reserveAmmo[this.currentWeapon] -= loaded;
        this.isReloading = false;
        this.reloadProgress = 0;
        const mesh = this.weaponMeshes.get(this.currentWeapon);
        if (mesh) this.resetReloadParts(mesh);
      }
    }
    this.reloadPose.pos.set(0, 0, 0);
    this.reloadPose.rot.set(0, 0, 0);
    if (this.isReloading) {
      const mesh = this.weaponMeshes.get(this.currentWeapon);
      if (mesh) this.applyReloadAnimation(mesh, Math.min(this.reloadProgress, 1));
    } else if (this.inspectT >= 0) {
      this.inspectT += dt / 2.4;
      if (this.inspectT >= 1) {
        this.inspectT = -1;
      } else {
        // Bring the weapon up and centre, roll it to show the left side, then the top, and settle back.
        const t = this.inspectT;
        const env = Math.sin(Math.min(t / 0.15, 1) * Math.PI * 0.5) * (t > 0.82 ? Math.cos(((t - 0.82) / 0.18) * Math.PI * 0.5) : 1);
        const phase = THREE.MathUtils.clamp((t - 0.15) / 0.67, 0, 1);
        this.reloadPose.pos.set(-0.08 * env, 0.05 * env, 0.08 * env);
        this.reloadPose.rot.set(
          0.25 * env * Math.sin(phase * Math.PI),
          (-0.9 * Math.sin(phase * Math.PI) + 0.35 * Math.sin(phase * Math.PI * 2)) * env,
          (0.75 * Math.sin(phase * Math.PI) ) * env
        );
      }
    }

    // Dynamic Accuracy Spread
    const moveFactor = Math.min(horizontalSpeed / 5.5, 1.0);
    const targetSpread = def.baseSpread + moveFactor * def.movingSpreadPenalty;
    this.spreadCurrent = THREE.MathUtils.lerp(this.spreadCurrent, targetSpread, dt * 10);

    // Muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
      }
    }

    // Equip transition spring
    if (this.equipTransition < 1.0) {
      this.equipTransition = Math.min(1.0, this.equipTransition + dt * 5.0);
    }

    const feel = FEEL[this.currentWeapon];
    // Mass 0.3 kg (knife) .. 7.5 kg (LMG) -> 0..1 heaviness
    const heavy = THREE.MathUtils.clamp((feel.massKg - 1) / 6.5, 0, 1);
    this.sinceShot += dt;
    this.idleTime += dt;

    // Melee swing animation: speed depends on the weapon (knife snaps, sledge follows through)
    if (this.meleeSlashAnim > 0) {
      const swingSpeed = feel.melee === 'stab' ? 9.0 : feel.melee === 'overhead' ? 2.6 : 3.4;
      this.meleeSlashAnim = Math.max(0, this.meleeSlashAnim - dt * swingSpeed);
    }

    // Viewmodel sway: heavy weapons lag the view more and swing further
    const swayGain = 0.00035 + heavy * 0.00035;
    const swayLimit = 0.035 + heavy * 0.03;
    const swayFollow = 16 - heavy * 9; // light = snappy, heavy = sluggish
    const swayTargetX = -mouseDeltaX * swayGain;
    const swayTargetY = mouseDeltaY * swayGain;
    this.swayOffset.x = THREE.MathUtils.lerp(this.swayOffset.x, THREE.MathUtils.clamp(swayTargetX, -swayLimit, swayLimit), dt * swayFollow);
    this.swayOffset.y = THREE.MathUtils.lerp(this.swayOffset.y, THREE.MathUtils.clamp(swayTargetY, -swayLimit, swayLimit), dt * swayFollow);

    // Walk cycle: figure-8 bob; heavier weapons bob lower and slower, melee bounces more
    if (horizontalSpeed > 0.5) {
      this.bobTime += dt * (horizontalSpeed * (2.4 - heavy * 0.6));
    } else {
      this.bobTime += dt * 1.8;
    }
    const bobAmp = (horizontalSpeed > 0.5 ? 0.012 : 0.0) * (1.15 - heavy * 0.5) * (this.isADS ? 0.25 : 1);
    const bobX = Math.cos(this.bobTime * 0.5) * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobAmp;
    // Idle breathing (always present, subtle; heavier guns breathe slower and lower)
    const breathe = this.isADS ? 0.0008 : 0.0025;
    const idleX = Math.sin(this.idleTime * (1.1 - heavy * 0.3)) * breathe;
    const idleY = Math.sin(this.idleTime * (2.2 - heavy * 0.6)) * breathe * 0.8;

    // Recoil recovery: a light pistol snaps back, a heavy rifle settles slowly
    const recover = 22 - heavy * 11;
    this.recoilOffset.z = THREE.MathUtils.lerp(this.recoilOffset.z, 0, dt * recover);
    this.recoilRot.x = THREE.MathUtils.lerp(this.recoilRot.x, 0, dt * recover * 0.9);
    this.recoilRot.y = THREE.MathUtils.lerp(this.recoilRot.y, 0, dt * recover);
    this.recoilRoll = THREE.MathUtils.lerp(this.recoilRoll, 0, dt * (recover * 0.7));

    // Post-shot mechanical action on the named parts (slide / bolt / pump / belt ...)
    const actMesh = this.weaponMeshes.get(this.currentWeapon);
    if (actMesh && !this.isReloading) {
      this.resetReloadParts(actMesh);
      this.applyActionAnimation(actMesh, feel);
    }

    // Alignment and visibility
    const targetMesh = this.weaponMeshes.get(this.currentWeapon);
    if (targetMesh) {
      // In AWP scoped mode, weapon hides so optical reticle covers view
      if (this.isADS && this.currentWeapon === 'railgun') {
        targetMesh.visible = false;
      } else {
        targetMesh.visible = true;
      }

      // Rest position in front-right viewport (elevated so weapon is prominently visible)
      const isMeleeNow = isMeleeWeapon(this.currentWeapon);
      const isKatana = this.currentWeapon === 'melee';
      const defaultRestX = isKatana ? 0.12 : isMeleeNow ? 0.18 : (this.currentWeapon === 'rpg' ? 0.22 : 0.20);
      const defaultRestY = this.currentWeapon === 'rpg' ? -0.14 : (isKatana ? -0.2 : isMeleeNow ? -0.16 : -0.15);
      const defaultRestZ = -0.36;

      const restPos = this.isADS
        ? new THREE.Vector3(0, -0.10, -0.30)
        : new THREE.Vector3(defaultRestX, defaultRestY + (isSliding ? -0.04 : 0), defaultRestZ);

      // Equip lift from bottom-right
      const equipLift = (1.0 - this.equipTransition) * -0.22;

      // Melee swing by style
      const sw = this.meleeSlashAnim;              // 1 -> 0 over the swing
      const arc = Math.sin(sw * Math.PI);          // 0 -> 1 -> 0
      let meleeX = 0, meleeY = 0, meleeZ = 0, meleeRX = 0, meleeRY = 0, meleeRZ = 0;
      if (feel.melee === 'stab') {                 // knife: fast forward thrust, slight twist
        meleeZ = -0.22 * arc; meleeX = -0.04 * arc; meleeRZ = 0.5 * arc; meleeRX = 0.15 * arc;
      } else if (feel.melee === 'overhead') {      // sledge: wind up over the shoulder, slam down, follow through
        const wind = THREE.MathUtils.smoothstep(sw, 0.65, 1.0);          // early phase
        const slam = THREE.MathUtils.smoothstep(1 - sw, 0.35, 0.8);      // later phase
        meleeRX = 0.9 * wind - 1.5 * slam; meleeY = 0.12 * wind - 0.18 * slam; meleeZ = 0.1 * wind - 0.12 * slam; meleeRZ = -0.25 * slam;
      } else if (feel.melee) {                      // katana: kesa-giri — wind up high right, diagonal cut to low left, recover
        const p = 1 - sw;                                                  // 0 -> 1 over the swing
        const wind = THREE.MathUtils.smoothstep(p, 0.0, 0.2);               // raise to upper right
        const cut = THREE.MathUtils.smoothstep(p, 0.2, 0.5);                // the cut itself (fast)
        const recover = THREE.MathUtils.smoothstep(p, 0.5, 1.0);            // settle back to guard
        const k = (hi: number, lo: number) => (hi * wind + (lo - hi) * cut) * (1 - recover);
        meleeX  = k( 0.14, -0.30);
        meleeY  = k( 0.10, -0.14);
        meleeZ  = k( 0.06, -0.10);
        meleeRX = k( 0.55, -0.95);
        meleeRY = k(-0.70,  0.95);
        meleeRZ = k( 0.15, -0.75);
      }

      const base = (targetMesh.userData.baseRot as THREE.Euler | undefined);
      const bx = base?.x ?? 0, by = base?.y ?? 0, bz = base?.z ?? 0;
      const follow = 22 - heavy * 8; // heavy weapons settle more slowly into every pose

      const rp = this.reloadPose;
      targetMesh.position.x = THREE.MathUtils.lerp(targetMesh.position.x, restPos.x + this.swayOffset.x + bobX + idleX + meleeX + rp.pos.x, dt * follow);
      targetMesh.position.y = THREE.MathUtils.lerp(targetMesh.position.y, restPos.y + this.swayOffset.y - bobY + idleY + equipLift + meleeY + rp.pos.y, dt * follow);
      targetMesh.position.z = THREE.MathUtils.lerp(targetMesh.position.z, restPos.z + this.recoilOffset.z + meleeZ + rp.pos.z, dt * follow);

      targetMesh.rotation.x = THREE.MathUtils.lerp(targetMesh.rotation.x, bx + this.recoilRot.x + meleeRX + rp.rot.x, dt * (follow + 2));
      targetMesh.rotation.y = THREE.MathUtils.lerp(targetMesh.rotation.y, by + this.recoilRot.y + this.swayOffset.x * (0.25 + heavy * 0.3) + meleeRY + rp.rot.y, dt * (follow + 2));
      targetMesh.rotation.z = THREE.MathUtils.lerp(targetMesh.rotation.z, bz + (isSliding ? -0.14 : 0) + this.recoilRoll + this.swayOffset.x * -0.6 + meleeRZ + rp.rot.z, dt * (follow + 2));

      // Additive life on every part (runs after reload / action so it stacks on top)
      this.partAnimator.update({
        dt,
        weapon: this.currentWeapon,
        group: targetMesh,
        parts: this.getReloadParts(targetMesh),
        sinceShot: this.sinceShot,
        fireInterval: 60 / def.fireRateRpm,
        isAuto: !!def.isAutomatic,
        isTriggerHeld: this.sinceShot < 60 / def.fireRateRpm + 0.05,
        isReloading: this.isReloading,
        ammo: this.ammoInMag[this.currentWeapon],
        speed: horizontalSpeed,
        bobTime: this.bobTime,
        idleTime: this.idleTime,
        mouseDX: mouseDeltaX,
        mouseDY: mouseDeltaY,
        recoilZ: this.recoilOffset.z,
        meleeSlash: this.meleeSlashAnim,
        altHand: this.altHand,
        actionDelay: feel.actionDelay,
        actionDur: feel.actionDur,
        action: feel.action,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Per-weapon reload animations
  // ---------------------------------------------------------------------------

  /**
   * Mechanical cycle after each shot, animated on the named parts of the viewmodel.
   * Semi-autos cycle instantly; bolt/pump/break actions wait for the shooter's hand.
   */
  private applyActionAnimation(group: THREE.Group, feel: FeelProfile): void {
    if (feel.action === 'none' || feel.actionDur <= 0) return;
    // Single-shot launchers show an empty rail / tube until the reload seats a new projectile
    if ((feel.action === 'rocket' || feel.action === 'crossbow') && this.ammoInMag[this.currentWeapon] <= 0) {
      this.getReloadParts(group).get(feel.action === 'rocket' ? 'warhead' : 'bolt')?.forEach(e => { e.obj.visible = false; });
    }
    const t = this.sinceShot - feel.actionDelay;
    if (t < 0 || t > feel.actionDur) return;
    const p = t / feel.actionDur; // 0..1 through the cycle
    const parts = this.getReloadParts(group);
    const set = (name: string, fn: (o: THREE.Object3D, b: { pos: THREE.Vector3; rot: THREE.Euler }, i: number) => void) => {
      parts.get(name)?.forEach((e, i) => fn(e.obj, e, i));
    };
    const pulse = Math.sin(p * Math.PI);
    switch (feel.action) {
      case 'slide': // slide flies back fast, returns under spring; dualies alternate hands
        set('slide', (o, b, i) => {
          if (parts.get('slide')!.length > 1 && i !== this.altHand) return;
          const back = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
          o.position.z = b.pos.z + 0.055 * back;
        });
        break;
      case 'bolt': { // lift, pull back, push forward, lock down - whole rifle dips with the hand
        const lift = THREE.MathUtils.smoothstep(p, 0.0, 0.18) - THREE.MathUtils.smoothstep(p, 0.8, 1.0);
        const back = THREE.MathUtils.smoothstep(p, 0.18, 0.42) - THREE.MathUtils.smoothstep(p, 0.55, 0.78);
        set('bolt', (o, b) => { o.rotation.z = b.rot.z + 1.1 * lift; o.position.z = b.pos.z + 0.09 * back; });
        set('armRight', (o, b) => { o.position.z = b.pos.z + 0.09 * back; o.position.y = b.pos.y + 0.03 * lift; });
        this.reloadPose.rot.z += -0.08 * lift;
        this.reloadPose.rot.x += 0.05 * back;
        break;
      }
      case 'pump': { // fore-end back then forward; off hand rides it
        const back = p < 0.45 ? THREE.MathUtils.smoothstep(p, 0, 0.45) : 1 - THREE.MathUtils.smoothstep(p, 0.5, 1);
        set('pump', (o, b) => { o.position.z = b.pos.z + 0.11 * back; });
        set('armLeft', (o, b) => { o.position.z = b.pos.z + 0.11 * back; });
        this.reloadPose.rot.x += 0.04 * back;
        break;
      }
      case 'break': // double barrel: violent muzzle flip handled by riseMul; here the breech shudders
        set('breech', (o, b) => { o.rotation.x = b.rot.x + 0.05 * pulse; });
        break;
      case 'belt': // belt box rattles, charging handle shivers
        set('mag', (o, b) => { o.position.y = b.pos.y + 0.006 * Math.sin(p * Math.PI * 6); o.rotation.z = b.rot.z + 0.03 * pulse; });
        set('bolt', (o, b) => { o.position.z = b.pos.z + 0.03 * pulse; });
        break;
      case 'revolver': // hammer falls, cylinder indexes one chamber
        set('cylinder', (o, b) => { o.rotation.z = b.rot.z + (Math.PI / 3) * THREE.MathUtils.smoothstep(p, 0.3, 1.0); });
        break;
      case 'crossbow': // limbs snap forward, string thrums
        set('bolt', (o) => { o.visible = p > 0.95; });
        break;
      case 'rocket': // launcher rocks back, smoke lingers; warhead gone until reload
        set('warhead', (o) => { o.visible = false; });
        this.reloadPose.rot.x += 0.12 * (1 - p);
        this.reloadPose.pos.z += 0.06 * (1 - p);
        break;
    }
  }

  private getReloadParts(group: THREE.Group): Map<string, { obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[]> {
    let cache = this.reloadPartCache.get(group);
    if (!cache) {
      cache = new Map();
      group.traverse((o) => {
        if (!o.name || o === group) return;
        const list = cache!.get(o.name) ?? [];
        list.push({ obj: o, pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() });
        cache!.set(o.name, list);
      });
      this.reloadPartCache.set(group, cache);
    }
    return cache;
  }

  private resetReloadParts(group: THREE.Group): void {
    const cache = this.getReloadParts(group);
    cache.forEach((list) => list.forEach((e) => {
      e.obj.position.copy(e.pos);
      e.obj.rotation.copy(e.rot);
      e.obj.scale.copy(e.scale);
      e.obj.visible = true;
    }));
  }

  private stage(name: string, progress: number, at: number): void {
    if (progress >= at && !this.firedReloadStages.has(name)) {
      this.firedReloadStages.add(name);
      this.onReloadStage?.(this.currentWeapon, name);
      const g = this.weaponMeshes.get(this.currentWeapon);
      if (g) this.partAnimator.onReloadStage(this.currentWeapon, g, name);
    }
  }

  /** Smooth 0..1 ramp between a and b of progress. */
  private static ramp(p: number, a: number, b: number): number {
    const t = THREE.MathUtils.clamp((p - a) / Math.max(b - a, 1e-5), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** 0 -> 1 -> 0 pulse between a and b. */
  private static pulse(p: number, a: number, b: number): number {
    const t = THREE.MathUtils.clamp((p - a) / Math.max(b - a, 1e-5), 0, 1);
    return Math.sin(t * Math.PI);
  }

  private applyReloadAnimation(group: THREE.Group, p: number): void {
    const parts = this.getReloadParts(group);
    this.resetReloadParts(group);
    const R = WeaponSystem.ramp;
    const P = WeaponSystem.pulse;
    const pose = this.reloadPose;
    const set = (name: string, fn: (o: THREE.Object3D, base: { pos: THREE.Vector3; rot: THREE.Euler }) => void) => {
      parts.get(name)?.forEach((e) => fn(e.obj, e));
    };
    const offhand = (fn: (o: THREE.Object3D, base: { pos: THREE.Vector3; rot: THREE.Euler }) => void) => set('armLeft', fn);

    switch (this.currentWeapon) {
      case 'rifle': {
        // Tilt weapon inward, drop magazine, slap in fresh one, rack charging handle.
        const tilt = P(p, 0.0, 1.0);
        pose.rot.z = -0.55 * tilt;
        pose.rot.x = 0.22 * tilt;
        pose.pos.y = -0.04 * tilt;
        const out = R(p, 0.08, 0.3);
        const back = R(p, 0.55, 0.78);
        const magDrop = out * (1 - back);
        set('mag', (o, b) => {
          o.position.y = b.pos.y - magDrop * 0.38;
          o.position.z = b.pos.z + magDrop * 0.08;
          o.rotation.x = b.rot.x + magDrop * 0.6;
          o.visible = !(out > 0.95 && back < 0.05);
        });
        offhand((o, b) => {
          o.position.y = b.pos.y - magDrop * 0.3;
          o.position.z = b.pos.z + magDrop * 0.1;
        });
        const slap = P(p, 0.74, 0.84);
        pose.pos.y += -0.02 * slap;
        const rack = P(p, 0.86, 1.0);
        pose.pos.z += 0.05 * rack;
        pose.rot.x += 0.12 * rack;
        this.stage('magOut', p, 0.14);
        this.stage('magIn', p, 0.76);
        this.stage('bolt', p, 0.9);
        break;
      }
      case 'smg': {
        // Fast, snappy version with a sideways cant.
        const tilt = P(p, 0.0, 1.0);
        pose.rot.z = 0.45 * tilt;
        pose.rot.y = -0.2 * tilt;
        pose.pos.x = -0.03 * tilt;
        const out = R(p, 0.05, 0.28);
        const back = R(p, 0.5, 0.72);
        const magDrop = out * (1 - back);
        set('mag', (o, b) => {
          o.position.y = b.pos.y - magDrop * 0.42;
          o.rotation.x = b.rot.x + magDrop * 0.4;
          o.visible = !(out > 0.95 && back < 0.05);
        });
        offhand((o, b) => { o.position.y = b.pos.y - magDrop * 0.34; });
        const rack = P(p, 0.8, 1.0);
        pose.pos.z += 0.04 * rack;
        pose.rot.x += 0.1 * rack;
        this.stage('magOut', p, 0.1);
        this.stage('magIn', p, 0.7);
        this.stage('bolt', p, 0.86);
        break;
      }
      case 'pistol': {
        // Slide locks back, mag drops, new mag, slide release.
        const tilt = P(p, 0.0, 1.0);
        pose.rot.z = -0.35 * tilt;
        pose.rot.x = 0.3 * tilt;
        pose.pos.y = -0.03 * tilt;
        const slideLock = 1 - R(p, 0.86, 0.93);
        set('slide', (o, b) => { o.position.z = b.pos.z + 0.07 * slideLock; });
        const out = R(p, 0.1, 0.32);
        const back = R(p, 0.5, 0.74);
        const magDrop = out * (1 - back);
        set('mag', (o, b) => {
          o.position.y = b.pos.y - magDrop * 0.3;
          o.visible = !(out > 0.95 && back < 0.05);
        });
        offhand((o, b) => { o.position.y = b.pos.y - magDrop * 0.25; o.position.x = b.pos.x + magDrop * 0.05; });
        const snap = P(p, 0.86, 0.96);
        pose.pos.z += 0.03 * snap;
        this.stage('slideLock', p, 0.05);
        this.stage('magOut', p, 0.16);
        this.stage('magIn', p, 0.7);
        this.stage('slideRelease', p, 0.88);
        break;
      }
      case 'shotgun': {
        // Shells thumbed into the tube one by one, then a pump to chamber.
        const cant = P(p, 0.0, 1.0);
        pose.rot.z = 0.5 * cant;
        pose.rot.y = -0.25 * cant;
        pose.pos.x = -0.05 * cant;
        pose.pos.y = -0.03 * cant;
        const shells = 4;
        const loadStart = 0.1;
        const loadEnd = 0.82;
        const per = (loadEnd - loadStart) / shells;
        let bump = 0;
        for (let i = 0; i < shells; i++) {
          const a = loadStart + per * i;
          bump += P(p, a, a + per);
          this.stage(`shell${i}`, p, a + per * 0.6);
        }
        offhand((o, b) => {
          const t = (p - loadStart) / per;
          const f = THREE.MathUtils.clamp(t, 0, shells) % 1;
          const inLoad = p >= loadStart && p < loadEnd ? 1 : 0;
          o.position.y = b.pos.y - 0.18 * inLoad * (1 - Math.abs(f * 2 - 1));
          o.position.z = b.pos.z + 0.1 * inLoad * (1 - Math.abs(f * 2 - 1));
        });
        pose.pos.y += -0.012 * bump;
        const pump = P(p, 0.86, 1.0);
        set('pump', (o, b) => { o.position.z = b.pos.z + 0.11 * pump; });
        pose.rot.x += 0.08 * pump;
        this.stage('pump', p, 0.9);
        break;
      }
      case 'railgun': {
        // Bolt-action: lift & pull bolt, swap mag, drive bolt home.
        const tilt = P(p, 0.0, 1.0);
        pose.rot.z = -0.4 * tilt;
        pose.rot.x = 0.15 * tilt;
        pose.pos.x = 0.04 * tilt;
        const boltOpen = R(p, 0.06, 0.22) * (1 - R(p, 0.84, 0.97));
        set('bolt', (o, b) => {
          o.rotation.x = b.rot.x - 1.2 * boltOpen;
          o.position.z = b.pos.z + 0.1 * boltOpen;
          o.position.y = b.pos.y + 0.03 * boltOpen;
        });
        const out = R(p, 0.3, 0.48);
        const back = R(p, 0.6, 0.78);
        const magDrop = out * (1 - back);
        set('mag', (o, b) => {
          o.position.y = b.pos.y - magDrop * 0.3;
          o.rotation.x = b.rot.x + magDrop * 0.4;
          o.visible = !(out > 0.95 && back < 0.05);
        });
        offhand((o, b) => {
          const toBolt = P(p, 0.0, 0.3) + P(p, 0.8, 1.0);
          o.position.y = b.pos.y + 0.1 * toBolt - magDrop * 0.28;
          o.position.x = b.pos.x + 0.12 * toBolt;
          o.position.z = b.pos.z + 0.25 * toBolt;
        });
        pose.pos.z += 0.03 * P(p, 0.84, 0.97);
        this.stage('boltOpen', p, 0.1);
        this.stage('magOut', p, 0.34);
        this.stage('magIn', p, 0.74);
        this.stage('boltClose', p, 0.9);
        break;
      }
      case 'revolver': {
        // Swing cylinder out, tip up and eject, speed-loader in, snap shut.
        const tiltUp = R(p, 0.1, 0.3) * (1 - R(p, 0.42, 0.6));
        const open = R(p, 0.05, 0.2) * (1 - R(p, 0.84, 0.95));
        pose.rot.x = 0.9 * tiltUp - 0.5 * R(p, 0.42, 0.6) * (1 - R(p, 0.84, 0.95));
        pose.rot.z = -0.6 * open;
        pose.pos.y = 0.04 * tiltUp;
        set('cylinder', (o, b) => {
          o.position.x = b.pos.x - 0.07 * open;
          o.rotation.z = b.rot.z + 0.9 * open;
          o.rotation.y = b.rot.y + p * 12.0 * open; // spin while open
        });
        offhand((o, b) => {
          const act = P(p, 0.2, 0.42) + P(p, 0.6, 0.84);
          o.position.y = b.pos.y + 0.08 * act;
          o.position.z = b.pos.z - 0.15 * act;
          o.position.x = b.pos.x + 0.08 * act;
        });
        pose.pos.z += 0.02 * P(p, 0.84, 0.96);
        this.stage('cylOpen', p, 0.1);
        this.stage('eject', p, 0.3);
        this.stage('loader', p, 0.72);
        this.stage('cylClose', p, 0.88);
        break;
      }
      case 'rpg': {
        // Tube drops to hip, spent warhead removed, fresh warhead seated from the front.
        const down = P(p, 0.0, 1.0);
        pose.rot.x = -0.35 * down;
        pose.rot.y = 0.5 * down;
        pose.pos.y = -0.12 * down;
        pose.pos.x = -0.06 * down;
        const out = R(p, 0.1, 0.3);
        const back = R(p, 0.5, 0.82);
        set('warhead', (o, b) => {
          const off = out * (1 - back);
          o.position.z = b.pos.z - 0.6 * off;
          o.visible = !(out > 0.95 && back < 0.05);
        });
        offhand((o, b) => {
          const act = P(p, 0.1, 0.3) + P(p, 0.5, 0.86);
          o.position.z = b.pos.z - 0.45 * act;
          o.position.y = b.pos.y + 0.1 * act;
        });
        pose.pos.z += 0.04 * P(p, 0.82, 0.92);
        this.stage('unlatch', p, 0.12);
        this.stage('slideIn', p, 0.6);
        this.stage('latch', p, 0.86);
        break;
      }
      case 'crossbow': {
        // Lower bow, foot-stirrup draw (string creak), latch, seat new bolt.
        const low = P(p, 0.0, 1.0);
        pose.rot.x = -0.6 * low;
        pose.pos.y = -0.1 * low;
        pose.pos.z = 0.05 * low;
        const draw = R(p, 0.15, 0.5);
        const boltIn = R(p, 0.68, 0.9);
        set('bolt', (o, b) => {
          o.visible = p > 0.6;
          o.position.y = b.pos.y - 0.25 * (1 - boltIn);
        });
        set('armLeft', (o, b) => {
          o.position.z = b.pos.z + 0.3 * draw * (1 - R(p, 0.5, 0.65)) - 0.1 * P(p, 0.65, 0.92);
          o.position.y = b.pos.y - 0.06 * draw * (1 - R(p, 0.5, 0.65)) - 0.14 * P(p, 0.65, 0.92);
        });
        pose.rot.x += 0.12 * draw * (1 - R(p, 0.5, 0.62)); // strain as the string is drawn
        this.stage('draw', p, 0.18);
        this.stage('latch', p, 0.52);
        this.stage('boltIn', p, 0.84);
        break;
      }
      case 'melee':
      case 'knife':
      case 'sledge': {
        // Blade / hammer flourish.
        const spin = P(p, 0, 1);
        pose.rot.y = -1.2 * spin;
        pose.rot.z = 0.8 * spin;
        this.stage('flourish', p, 0.05);
        break;
      }
      case 'scattergun': {
        // Break open, shells out, two fresh shells in, snap shut.
        const open = P(p, 0.0, 1.0);
        pose.rot.x = 0.35 * open;
        pose.rot.z = -0.25 * open;
        pose.pos.y = -0.05 * open;
        set('breech', (o, b) => { o.rotation.x = b.rot.x + 0.6 * R(p, 0.05, 0.25) * (1 - R(p, 0.8, 0.95)); });
        this.stage('magOut', p, 0.3);
        this.stage('magIn', p, 0.7);
        this.stage('bolt', p, 0.92);
        break;
      }
      default: {
        // Generic: tilt inward, drop magazine, seat a fresh one, rack.
        const tilt = P(p, 0.0, 1.0);
        pose.rot.z = -0.5 * tilt;
        pose.rot.x = 0.2 * tilt;
        pose.pos.y = -0.04 * tilt;
        const out = R(p, 0.08, 0.3);
        const back = R(p, 0.5, 0.75);
        set('mag', (o, b) => { o.position.y = b.pos.y - 0.22 * (out - back); o.rotation.x = b.rot.x + 0.3 * (out - back); });
        offhand((o, b) => { o.position.y = b.pos.y - 0.2 * (out - back); });
        this.stage('magOut', p, 0.3);
        this.stage('magIn', p, 0.72);
        this.stage('bolt', p, 0.9);
        break;
      }
    }
  }
}
