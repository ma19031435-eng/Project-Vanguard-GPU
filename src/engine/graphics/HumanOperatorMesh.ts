/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CharacterHatId } from '../shop/ShopSystem.ts';

export interface HumanSkeleton {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Mesh;
  vest: THREE.Mesh;
  pouches: THREE.Mesh[];
  head: THREE.Group;
  helmet: THREE.Mesh;
  goggles: THREE.Mesh;
  hatGroup: THREE.Group;
  armL: THREE.Group;
  forearmL: THREE.Group;
  armR: THREE.Group;
  forearmR: THREE.Group;
  weaponProp: THREE.Group;
  legL: THREE.Group;
  shinL: THREE.Group;
  legR: THREE.Group;
  shinR: THREE.Group;
  animTime: number;
  isDead: boolean;
  deathTime: number;
}

export class HumanOperatorBuilder {
  /**
   * Constructs a high-detail CS2-style SAS / CT Operator
   * with articulated limbs, Kevlar carrier, helmet, and realistic textures
   */
  public static createOperator(isTerrorist: boolean = false): HumanSkeleton {
    const root = new THREE.Group();

    // Uniform Fabrics & Tactical Gear Materials
    const bduColor = isTerrorist ? 0x3d433b : 0x1f2733; // T olive/khaki vs CT navy/dark grey
    const vestColor = isTerrorist ? 0x2b221a : 0x14181f; // T leather rig vs CT black Kevlar
    const gearColor = 0x111317;

    const bduMat = new THREE.MeshPhysicalMaterial({
      color: bduColor,
      roughness: 0.9,
      metalness: 0.0,
      sheen: 0.5,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(isTerrorist ? 0x6b705c : 0x4a5568)
    });

    const vestMat = new THREE.MeshPhysicalMaterial({
      color: vestColor,
      roughness: 0.8,
      metalness: 0.05,
      sheen: 0.35,
      sheenColor: new THREE.Color(0x4a4036)
    });

    const helmetMat = new THREE.MeshPhysicalMaterial({
      color: isTerrorist ? 0x282e25 : 0x222a36,
      roughness: 0.55,
      metalness: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.5
    });

    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1a24,
      roughness: 0.05,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: 0x0b3a4a,
      emissiveIntensity: 0.35
    });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.95 });
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.85, metalness: 0.05 });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x9e7456,
      roughness: 0.8,
      metalness: 0.05
    });

    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x151619,
      roughness: 0.7,
      metalness: 0.2
    });

    // 1. Pelvis / Hip Root
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.9, 0);
    root.add(pelvis);

    // 2. Torso & Kevlar Plate Carrier
    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.45, 0.24, 4, 0.07), bduMat);
    torso.position.set(0, 0.22, 0);
    torso.castShadow = true;
    pelvis.add(torso);

    const vest = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.38, 0.28, 4, 0.06), vestMat);
    vest.position.set(0, 0.2, 0);
    vest.castShadow = true;
    pelvis.add(vest);

    // Ammo Mag Pouches on Chest Rig
    const pouches: THREE.Mesh[] = [];
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.14, 0.06, 2, 0.015), vestMat);
      pouch.position.set(p * 0.11, 0.16, 0.16);
      pouch.castShadow = true;
      pelvis.add(pouch);
      pouches.push(pouch);
    }

    // Shoulder straps, belt, radio, shoulder & knee pads, helmet rail + NVG mount
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.34, 0.3, 2, 0.015), strapMat);
      strap.position.set(side * 0.12, 0.28, 0);
      strap.rotation.x = 0.05;
      pelvis.add(strap);
      const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), padMat);
      shoulderPad.position.set(side * 0.235, 0.41, 0);
      shoulderPad.castShadow = true;
      pelvis.add(shoulderPad);
    }
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20, 1, true), strapMat);
    belt.position.set(0, 0.0, 0);
    belt.scale.z = 0.7;
    pelvis.add(belt);
    const radio = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.12, 0.04, 2, 0.01), padMat);
    radio.position.set(-0.17, 0.3, 0.1);
    pelvis.add(radio);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), padMat);
    antenna.position.set(-0.17, 0.45, 0.1);
    pelvis.add(antenna);
    const backPlate = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.3, 0.08, 3, 0.03), vestMat);
    backPlate.position.set(0, 0.22, -0.16);
    pelvis.add(backPlate);
    const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 14), padMat);
    canteen.position.set(0.17, -0.04, -0.12);
    pelvis.add(canteen);

    // 3. Head & Tactical Helmet / Balaclava
    const head = new THREE.Group();
    head.position.set(0, 0.52, 0);
    pelvis.add(head);

    // Head base (balaclava)
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), bduMat);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Ballistic Helmet with NVG Mount
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.65), helmetMat);
    helmet.rotation.x = -0.15;
    helmet.position.set(0, 0.03, -0.01);
    helmet.castShadow = true;
    head.add(helmet);

    // Tactical Goggles / Visor
    const goggles = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.06, 0.08, 3, 0.02), lensMat);
    goggles.position.set(0, 0.02, 0.12);
    head.add(goggles);

    // Helmet side rail, NVG shroud & chin strap
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.03, 0.14, 2, 0.006), padMat);
      rail.position.set(side * 0.14, 0.03, -0.01);
      head.add(rail);
    }
    const shroud = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.03, 2, 0.008), padMat);
    shroud.position.set(0, 0.1, 0.12);
    head.add(shroud);
    const chin = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 20, Math.PI), strapMat);
    chin.rotation.z = Math.PI;
    chin.rotation.y = Math.PI / 2;
    chin.position.set(0, -0.02, 0);
    head.add(chin);

    // Dynamic Cosmetics / Hat Mount Group
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.12, 0);
    head.add(hatGroup);

    // 4. Arms & Forearms
    // Left Arm
    const armL = new THREE.Group();
    armL.position.set(-0.24, 0.38, 0);
    pelvis.add(armL);

    const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.28, 16), bduMat);
    upperArmL.position.set(0, -0.14, 0);
    upperArmL.castShadow = true;
    armL.add(upperArmL);

    const forearmL = new THREE.Group();
    forearmL.position.set(0, -0.28, 0);
    armL.add(forearmL);

    const lowerArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.26, 16), bduMat);
    lowerArmL.position.set(0, -0.13, 0);
    lowerArmL.castShadow = true;
    forearmL.add(lowerArmL);

    const handL = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.08, 0.07, 2, 0.02), gloveMat);
    handL.position.set(0, -0.28, 0);
    forearmL.add(handL);

    // Right Arm
    const armR = new THREE.Group();
    armR.position.set(0.24, 0.38, 0);
    pelvis.add(armR);

    const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.28, 16), bduMat);
    upperArmR.position.set(0, -0.14, 0);
    upperArmR.castShadow = true;
    armR.add(upperArmR);

    const forearmR = new THREE.Group();
    forearmR.position.set(0, -0.28, 0);
    armR.add(forearmR);

    const lowerArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.26, 16), bduMat);
    lowerArmR.position.set(0, -0.13, 0);
    lowerArmR.castShadow = true;
    forearmR.add(lowerArmR);

    const handR = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.08, 0.07, 2, 0.02), gloveMat);
    handR.position.set(0, -0.28, 0);
    forearmR.add(handR);

    // Weapon Prop in Hand (AK-47 / Tactical Rifle)
    const weaponProp = new THREE.Group();
    const gunSteelMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.35, metalness: 0.85 });
    const gunWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.6, metalness: 0.1 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.42), gunSteelMat);
    weaponProp.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), gunSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.35);
    weaponProp.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.09), gunSteelMat);
    mag.position.set(0, -0.1, -0.05);
    mag.rotation.x = 0.25;
    weaponProp.add(mag);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.2), gunWoodMat);
    handguard.position.set(0, 0.02, -0.24);
    weaponProp.add(handguard);

    weaponProp.position.set(0, -0.24, 0.16);
    weaponProp.rotation.set(-0.35, 0.2, 0);
    forearmR.add(weaponProp);

    // Initial Two-Handed Rifle Stance
    armR.rotation.set(0.65, -0.2, -0.1);
    forearmR.rotation.set(0.75, 0.3, 0);
    armL.rotation.set(0.85, 0.45, 0.2);
    forearmL.rotation.set(0.9, -0.2, 0);

    // 5. Legs & Shins
    // Left Leg
    const legL = new THREE.Group();
    legL.position.set(-0.14, 0, 0);
    pelvis.add(legL);

    const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 16), bduMat);
    thighL.position.set(0, -0.21, 0);
    thighL.castShadow = true;
    legL.add(thighL);

    const shinL = new THREE.Group();
    shinL.position.set(0, -0.42, 0);
    legL.add(shinL);

    const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.42, 16), bduMat);
    calfL.position.set(0, -0.21, 0);
    calfL.castShadow = true;
    shinL.add(calfL);

    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), padMat);
    kneeL.position.set(0, 0.0, 0.03);
    kneeL.rotation.x = Math.PI / 2;
    shinL.add(kneeL);

    const bootL = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.22, 2, 0.03), gloveMat);
    bootL.position.set(0, -0.42, 0.04);
    shinL.add(bootL);

    // Right Leg
    const legR = new THREE.Group();
    legR.position.set(0.14, 0, 0);
    pelvis.add(legR);

    const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 16), bduMat);
    thighR.position.set(0, -0.21, 0);
    thighR.castShadow = true;
    legR.add(thighR);

    const shinR = new THREE.Group();
    shinR.position.set(0, -0.42, 0);
    legR.add(shinR);

    const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.055, 0.42, 16), bduMat);
    calfR.position.set(0, -0.21, 0);
    calfR.castShadow = true;
    shinR.add(calfR);

    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), padMat);
    kneeR.position.set(0, 0.0, 0.03);
    kneeR.rotation.x = Math.PI / 2;
    shinR.add(kneeR);

    const bootR = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.22, 2, 0.03), gloveMat);
    bootR.position.set(0, -0.42, 0.04);
    shinR.add(bootR);

    return {
      root,
      pelvis,
      torso,
      vest,
      pouches,
      head,
      helmet,
      goggles,
      hatGroup,
      armL,
      forearmL,
      armR,
      forearmR,
      weaponProp,
      legL,
      shinL,
      legR,
      shinR,
      animTime: 0,
      isDead: false,
      deathTime: 0
    };
  }

  public static setHat(skel: HumanSkeleton, hatId: CharacterHatId): void {
    while (skel.hatGroup.children.length > 0) {
      skel.hatGroup.remove(skel.hatGroup.children[0]);
    }

    if (hatId === 'crown') {
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8), crownMat);
      skel.hatGroup.add(band);
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), crownMat);
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.13, 0.05, Math.sin(angle) * 0.13);
        skel.hatGroup.add(spike);
      }
    } else if (hatId === 'visor') {
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x0088cc, metalness: 0.8, roughness: 0.1 });
      const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.1), visorMat);
      visorMesh.position.set(0, -0.06, 0.12);
      skel.hatGroup.add(visorMesh);
    } else if (hatId === 'ninja') {
      const oniMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.4, metalness: 0.2 });
      const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.08), oniMat);
      maskMesh.position.set(0, -0.1, 0.11);
      skel.hatGroup.add(maskMesh);
    }
  }

  /**
   * Procedural CS2 Skeletal Animation Engine:
   * Stride cycle, knee bending, torso sway, aim pitch tracking,
   * crouch stance, and backward ragdoll death collapse!
   */
  public static updateAnimation(
    skel: HumanSkeleton,
    dt: number,
    velocity: THREE.Vector3,
    isCrouching: boolean,
    aimPitch: number,
    isDead: boolean
  ): void {
    if (isDead) {
      if (!skel.isDead) {
        skel.isDead = true;
        skel.deathTime = 0;
      }
      skel.deathTime += dt;

      // Realistic CS2 Elimination Ragdoll Collapse (falls backwards to ground)
      const t = Math.min(skel.deathTime * 3.5, 1.0);
      skel.pelvis.position.y = THREE.MathUtils.lerp(0.9, 0.18, t);
      skel.pelvis.position.z = THREE.MathUtils.lerp(0, -0.5, t);
      skel.pelvis.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2.1, t);
      skel.head.rotation.x = THREE.MathUtils.lerp(0, 0.6, t);
      skel.armL.rotation.z = THREE.MathUtils.lerp(0.2, 0.8, t);
      skel.armR.rotation.z = THREE.MathUtils.lerp(-0.1, -0.7, t);
      skel.legL.rotation.x = THREE.MathUtils.lerp(0, 0.3, t);
      skel.legR.rotation.x = THREE.MathUtils.lerp(0, 0.2, t);
      return;
    }

    // Reset if alive
    skel.isDead = false;
    const speed = Math.hypot(velocity.x, velocity.z);
    const isMoving = speed > 0.4;

    if (isMoving) {
      skel.animTime += dt * (speed * 2.2);
    } else {
      skel.animTime += dt * 2.0; // Idle breathing
    }

    const t = skel.animTime;

    // 1. Crouch vs Stand Height
    const targetHipY = isCrouching ? 0.62 : 0.9;
    skel.pelvis.position.y = THREE.MathUtils.lerp(skel.pelvis.position.y, targetHipY, dt * 10);
    skel.pelvis.position.z = 0;
    skel.pelvis.rotation.x = isCrouching ? 0.2 : 0;

    // 2. Aim Pitch Tracking (Torso and head tilt up/down)
    skel.torso.rotation.x = -aimPitch * 0.5;
    skel.head.rotation.x = -aimPitch * 0.5;

    // 3. Stride Run Cycles (Leg swings and knee flexion)
    if (isMoving) {
      const legStride = Math.sin(t) * 0.65;
      skel.legL.rotation.x = legStride;
      skel.shinL.rotation.x = legStride < 0 ? -legStride * 0.8 : 0;

      skel.legR.rotation.x = -legStride;
      skel.shinR.rotation.x = -legStride < 0 ? legStride * 0.8 : 0;

      // Pelvis bobbing & spine bounce
      skel.pelvis.position.y = targetHipY + Math.abs(Math.sin(t * 2)) * 0.04;
      skel.pelvis.rotation.y = Math.sin(t) * 0.08;
    } else {
      // Idle tactical stance
      skel.legL.rotation.x = THREE.MathUtils.lerp(skel.legL.rotation.x, 0.08, dt * 8);
      skel.shinL.rotation.x = THREE.MathUtils.lerp(skel.shinL.rotation.x, 0, dt * 8);
      skel.legR.rotation.x = THREE.MathUtils.lerp(skel.legR.rotation.x, -0.08, dt * 8);
      skel.shinR.rotation.x = THREE.MathUtils.lerp(skel.shinR.rotation.x, 0, dt * 8);
      skel.pelvis.rotation.y = THREE.MathUtils.lerp(skel.pelvis.rotation.y, 0, dt * 8);

      // Subtle breathing motion
      skel.torso.position.y = 0.22 + Math.sin(t) * 0.006;
    }

    // 4. Two-Handed Rifle Holding with Subtle Recoil/Sway
    const breatheSway = Math.sin(t * 0.8) * 0.02;
    skel.armR.rotation.x = 0.65 - aimPitch * 0.6 + breatheSway;
    skel.armR.rotation.y = -0.2;
    skel.armR.rotation.z = -0.1;

    skel.armL.rotation.x = 0.85 - aimPitch * 0.6 + breatheSway;
    skel.armL.rotation.y = 0.45;
    skel.armL.rotation.z = 0.2;
  }
}
