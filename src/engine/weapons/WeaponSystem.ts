/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WeaponSkinId, SHOP_SKINS } from '../shop/ShopSystem.ts';

export type WeaponType = 'rifle' | 'railgun' | 'shotgun' | 'pistol' | 'melee' | 'rpg' | 'smg' | 'revolver' | 'crossbow';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
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
}

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponDef> = {
  rifle: {
    id: 'rifle',
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
  }
};

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
    crossbow: 1
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
    crossbow: 15
  };

  // State
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
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
  private meleeSlashAnim: number = 0;

  // Muzzle Flash
  public muzzleLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;
  private activeSkinMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.viewmodelRoot = new THREE.Group();
    this.viewmodelRoot.position.set(0, 0, 0);
    this.camera.add(this.viewmodelRoot);

    // Muzzle Flash Point Light
    this.muzzleLight = new THREE.PointLight(0xffcc66, 0, 16);
    this.muzzleLight.position.set(0.24, -0.15, -0.85);
    this.viewmodelRoot.add(this.muzzleLight);

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
   * Helper to create blocky operator arms holding weapons (Roblox Rivals & Krunker style)
   */
  private createOperatorArms(): { armLeft: THREE.Group; armRight: THREE.Group } {
    const armGroupL = new THREE.Group();
    const armGroupR = new THREE.Group();

    // Vibrant sleeve fabric & glove material
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x243242, // Tactical CT Blue / Slate
      roughness: 0.6,
      metalness: 0.1
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f, // Tactical black fingerless gloves
      roughness: 0.7,
      metalness: 0.2
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x9b6e4e, // Human skin tone
      roughness: 0.7,
      metalness: 0.05
    });

    // Right Arm (Trigger hand)
    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.35), sleeveMat);
    rightForearm.position.set(0.08, -0.05, 0.18);
    rightForearm.rotation.x = -0.35;
    rightForearm.rotation.y = -0.2;
    armGroupR.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), gloveMat);
    rightHand.position.set(0.02, -0.05, 0.01);
    armGroupR.add(rightHand);

    // Left Arm (Foregrip support hand)
    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), sleeveMat);
    leftForearm.position.set(-0.16, -0.12, 0.12);
    leftForearm.rotation.x = -0.4;
    leftForearm.rotation.y = 0.45;
    armGroupL.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), gloveMat);
    leftHand.position.set(-0.02, -0.02, -0.22);
    armGroupL.add(leftHand);

    return { armLeft: armGroupL, armRight: armGroupR };
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

    // Curved Banana Magazine
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.13), darkSteelMat);
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
    akGroup.add(akMuzzle);

    // Front & Rear Sights
    const akFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.055, 0.02), darkSteelMat);
    akFrontSight.position.set(0, 0.075, -0.82);
    akGroup.add(akFrontSight);

    // Add Player Arms
    const akArms = this.createOperatorArms();
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

    const awpLongBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.95), darkSteelMat);
    awpLongBarrel.position.set(0, 0.04, -0.85);
    awpGroup.add(awpLongBarrel);

    const awpMuzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.14), darkSteelMat);
    awpMuzzleBrake.position.set(0, 0.04, -1.35);
    awpGroup.add(awpMuzzleBrake);

    // Giant Optical Scope Tube
    const awpScope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16), darkSteelMat);
    awpScope.rotation.x = Math.PI / 2;
    awpScope.position.set(0, 0.15, -0.18);
    awpGroup.add(awpScope);

    const awpLens = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.08, 16), darkSteelMat);
    awpLens.rotation.x = Math.PI / 2;
    awpLens.position.set(0, 0.15, -0.38);
    awpGroup.add(awpLens);

    const awpArms = this.createOperatorArms();
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

    const spasBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.65), darkSteelMat);
    spasBarrel.position.set(0, 0.035, -0.55);
    spasGroup.add(spasBarrel);

    const spasMagTube = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.58), darkSteelMat);
    spasMagTube.position.set(0, -0.02, -0.52);
    spasGroup.add(spasMagTube);

    // Ribbed Pump Slide
    const spasPump = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.22), darkSteelMat);
    spasPump.position.set(0, 0.005, -0.42);
    spasGroup.add(spasPump);

    const spasArms = this.createOperatorArms();
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

    const deagleArms = this.createOperatorArms();
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

    // Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.85), bladeMat);
    blade.position.set(0, 0.12, -0.5);
    blade.rotation.x = 0.1;
    katanaGroup.add(blade);

    // Tsuba (Guard) & Hilt
    const tsuba = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), darkSteelMat);
    tsuba.position.set(0, 0.08, -0.08);
    katanaGroup.add(tsuba);

    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.28), darkSteelMat);
    hilt.position.set(0, 0.05, 0.06);
    katanaGroup.add(hilt);

    const katanaArms = this.createOperatorArms();
    katanaGroup.add(katanaArms.armRight);

    katanaGroup.position.set(0.18, -0.2, -0.42);
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
    warheadCone.rotation.x = -Math.PI / 2;
    warheadCone.position.set(0, 0.05, -0.95);
    rpgGroup.add(warheadCone);

    const warheadBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 16), warheadMat);
    warheadBase.rotation.x = Math.PI / 2;
    warheadBase.position.set(0, 0.05, -0.84);
    rpgGroup.add(warheadBase);

    // Optical Sight
    const rpgSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.09), darkSteelMat);
    rpgSight.position.set(-0.07, 0.12, -0.25);
    rpgGroup.add(rpgSight);

    const rpgArms = this.createOperatorArms();
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

    // Extended Stick Magazine
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.06), darkSteelMat);
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

    const smgArms = this.createOperatorArms();
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
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(0, 0.02, -0.05);
    revGroup.add(cylinder);

    // Wood Hand Grip
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), woodMat);
    revGrip.position.set(0, -0.07, 0.04);
    revGrip.rotation.x = -0.32;
    revGroup.add(revGrip);

    const revArms = this.createOperatorArms();
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

    // Horizontal Bow Limbs
    const bowLimbs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.04), darkSteelMat);
    bowLimbs.position.set(0, 0.02, -0.32);
    xbowGroup.add(bowLimbs);

    // Loaded High-Velocity Arrow Bolt
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8), darkSteelMat);
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.set(0, 0.05, -0.22);
    xbowGroup.add(arrowShaft);

    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 }));
    arrowTip.rotation.x = -Math.PI / 2;
    arrowTip.position.set(0, 0.05, -0.45);
    xbowGroup.add(arrowTip);

    const xbowArms = this.createOperatorArms();
    xbowGroup.add(xbowArms.armLeft);
    xbowGroup.add(xbowArms.armRight);

    xbowGroup.position.set(0.22, -0.15, -0.38);
    xbowGroup.visible = false;
    this.viewmodelRoot.add(xbowGroup);
    this.weaponMeshes.set('crossbow', xbowGroup);
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
  }

  public canFire(): boolean {
    if (this.isReloading) return false;
    if (this.currentWeapon !== 'melee' && this.ammoInMag[this.currentWeapon] <= 0) return false;

    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    const fireIntervalMs = (60 / def.fireRateRpm) * 1000;
    return performance.now() - this.lastFireTime >= fireIntervalMs;
  }

  public fire(): { def: WeaponDef; pellets: number } | null {
    if (!this.canFire()) return null;

    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    this.lastFireTime = performance.now();
    if (this.currentWeapon !== 'melee') {
      this.ammoInMag[this.currentWeapon]--;
    }
    this.shotSequence++;

    // CS2 / Rivals Recoil Pattern
    const sprayY = Math.sin(this.shotSequence * 0.8) * def.recoilKickYaw;
    this.recoilOffset.z += def.recoilKickZ;
    this.recoilRot.x += def.recoilKickPitch;
    this.recoilRot.y += sprayY;

    if (this.currentWeapon === 'melee') {
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
    if (this.isReloading || this.currentWeapon === 'melee') return false;
    const def = WEAPON_DEFINITIONS[this.currentWeapon];
    if (this.ammoInMag[this.currentWeapon] >= def.magazineSize) return false;
    if (this.reserveAmmo[this.currentWeapon] <= 0) return false;

    this.isReloading = true;
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

    // Melee Slash Animation
    if (this.meleeSlashAnim > 0) {
      this.meleeSlashAnim = Math.max(0, this.meleeSlashAnim - dt * 4.5);
    }

    // Viewmodel Weapon Sway
    const swayTargetX = -mouseDeltaX * 0.00045;
    const swayTargetY = mouseDeltaY * 0.00045;
    this.swayOffset.x = THREE.MathUtils.lerp(this.swayOffset.x, THREE.MathUtils.clamp(swayTargetX, -0.045, 0.045), dt * 12);
    this.swayOffset.y = THREE.MathUtils.lerp(this.swayOffset.y, THREE.MathUtils.clamp(swayTargetY, -0.045, 0.045), dt * 12);

    // Head bobbing & walking sway
    if (horizontalSpeed > 0.5) {
      this.bobTime += dt * (horizontalSpeed * 2.2);
    } else {
      this.bobTime += dt * 1.8;
    }
    const bobFactor = horizontalSpeed > 0.5 ? 0.012 : 0.002;
    const bobX = Math.cos(this.bobTime * 0.5) * bobFactor;
    const bobY = Math.abs(Math.sin(this.bobTime)) * bobFactor;

    // Recoil recovery spring
    this.recoilOffset.z = THREE.MathUtils.lerp(this.recoilOffset.z, 0, dt * 16);
    this.recoilRot.x = THREE.MathUtils.lerp(this.recoilRot.x, 0, dt * 16);
    this.recoilRot.y = THREE.MathUtils.lerp(this.recoilRot.y, 0, dt * 16);

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
      const defaultRestX = this.currentWeapon === 'melee' ? 0.18 : (this.currentWeapon === 'rpg' ? 0.22 : 0.20);
      const defaultRestY = this.currentWeapon === 'rpg' ? -0.14 : (this.currentWeapon === 'melee' ? -0.16 : -0.15);
      const defaultRestZ = -0.36;

      const restPos = this.isADS
        ? new THREE.Vector3(0, -0.10, -0.30)
        : new THREE.Vector3(defaultRestX, defaultRestY + (isSliding ? -0.04 : 0), defaultRestZ);

      // Equip lift from bottom-right
      const equipLift = (1.0 - this.equipTransition) * -0.22;

      // Melee slash offset
      const meleeSwipeX = this.meleeSlashAnim * 0.2;
      const meleeSwipeRot = this.meleeSlashAnim * -0.8;

      targetMesh.position.x = THREE.MathUtils.lerp(targetMesh.position.x, restPos.x + this.swayOffset.x + bobX - meleeSwipeX, dt * 18);
      targetMesh.position.y = THREE.MathUtils.lerp(targetMesh.position.y, restPos.y + this.swayOffset.y - bobY + equipLift, dt * 18);
      targetMesh.position.z = THREE.MathUtils.lerp(targetMesh.position.z, restPos.z + this.recoilOffset.z, dt * 18);

      targetMesh.rotation.x = this.recoilRot.x;
      targetMesh.rotation.y = this.recoilRot.y + this.swayOffset.x * 0.25 + meleeSwipeRot;
      targetMesh.rotation.z = isSliding ? -0.14 : 0; // Dynamic slide banking tilt!
    }
  }
}
