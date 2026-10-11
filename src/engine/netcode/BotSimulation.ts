/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PlayerNetState } from './P2PNetworkEngine.ts';
import { WeaponType } from '../weapons/WeaponSystem.ts';
import { BoundingBox3D } from '../wasm/WasmPhysicsCore.ts';

export type BotCombatState = 
  | 'PATROL_PREAIM' 
  | 'HOLD_ANGLE' 
  | 'JIGGLE_PEEK' 
  | 'COUNTER_STRAFE_BURST' 
  | 'RETREAT_TO_COVER' 
  | 'FLANKING';

export type BotDifficulty = 'easy' | 'balanced' | 'hard';

export interface SoundEvent {
  pos: [number, number, number];
  intensity: 'footstep' | 'jump' | 'gunfire';
  radius: number;
  time: number;
}

export interface SmartBotEntity {
  state: PlayerNetState;
  combatState: BotCombatState;
  currentVelocity: THREE.Vector3;
  aimTarget: THREE.Vector3;
  preAimAngle: number;
  burstCount: number;
  burstCooldown: number;
  reactionTimer: number;
  hasTargetAcquired: boolean;
  jiggleTimer: number;
  jiggleDir: number;
  stateTimer: number;
  nearestCoverPos: THREE.Vector3 | null;
  patrolIndex: number;
  staggerTimer: number;
}

export class BotSimulation {
  public bots: SmartBotEntity[] = [];
  public soundEvents: SoundEvent[] = [];
  public difficulty: BotDifficulty = 'easy'; // Default to Nerfed/Easy for fun, fair gameplay
  public enabled: boolean = true; // Togglable bot simulation

  // CS2 Competitive Strategic Chokepoints
  private tacticalChokepoints: { pos: [number, number, number]; preAimDir: [number, number, number] }[] = [
    { pos: [0, 0, -28], preAimDir: [0, 0, 1] },
    { pos: [-18, 0, -12], preAimDir: [1, 0, 0.4] },
    { pos: [-22, 4.5, 0], preAimDir: [0.8, -0.2, 0] },
    { pos: [0, 4.5, 18], preAimDir: [0, -0.2, -1] },
    { pos: [22, 4.5, 0], preAimDir: [-0.8, -0.2, 0] },
    { pos: [18, 0, 12], preAimDir: [-1, 0, -0.4] },
    { pos: [0, 0, 28], preAimDir: [0, 0, -1] },
    { pos: [-10, 0, 0], preAimDir: [1, 0, 0] },
    { pos: [10, 0, 0], preAimDir: [-1, 0, 0] }
  ];

  constructor(difficulty: BotDifficulty = 'easy') {
    this.difficulty = difficulty;
    this.spawnBots(3);
  }

  public setDifficulty(diff: BotDifficulty): void {
    this.difficulty = diff;
  }

  public spawnInsaneBots(count: number = 1): void {
    // Legacy alias for lobby modal button: append extra bot
    const tacticalCallsigns = [
      'Recruit-Tango [Bot]', 
      'Cadet-Echo [Bot]', 
      'Operator-Delta [Bot]', 
      'Specialist-Bravo [Bot]', 
      'Sentry-Alpha [Bot]'
    ];
    const loadouts: WeaponType[] = ['rifle', 'shotgun', 'rifle', 'railgun', 'rifle'];

    for (let i = 0; i < count; i++) {
      const id = 'bot_' + Math.random().toString(36).substring(2, 7);
      const cp = this.tacticalChokepoints[this.bots.length % this.tacticalChokepoints.length];

      this.bots.push({
        state: {
          id,
          name: tacticalCallsigns[this.bots.length % tacticalCallsigns.length],
          isHost: false,
          isBot: true,
          position: [cp.pos[0] + (Math.random() - 0.5) * 3, cp.pos[1], cp.pos[2] + (Math.random() - 0.5) * 3],
          rotationY: Math.atan2(cp.preAimDir[0], cp.preAimDir[2]),
          pitch: 0,
          health: 100,
          armor: 80,
          kills: 0,
          deaths: 0,
          ping: 15 + Math.floor(Math.random() * 10),
          currentWeapon: loadouts[this.bots.length % loadouts.length],
          isFiring: false,
          isCrouching: false,
          lastAcknowledgedTick: 0
        },
        combatState: 'PATROL_PREAIM',
        currentVelocity: new THREE.Vector3(),
        aimTarget: new THREE.Vector3(...cp.pos).add(new THREE.Vector3(...cp.preAimDir).multiplyScalar(10)),
        preAimAngle: Math.atan2(cp.preAimDir[0], cp.preAimDir[2]),
        burstCount: 0,
        burstCooldown: 0.5,
        reactionTimer: this.getInitialReactionDelay(),
        hasTargetAcquired: false,
        jiggleTimer: 0.4,
        jiggleDir: 1,
        stateTimer: 2.0,
        nearestCoverPos: null,
        patrolIndex: this.bots.length % this.tacticalChokepoints.length,
        staggerTimer: 0
      });
    }
  }

  public spawnBots(count: number = 3): void {
    this.bots = [];
    const tacticalCallsigns = [
      'Recruit-Tango [Bot]', 
      'Cadet-Echo [Bot]', 
      'Operator-Delta [Bot]', 
      'Specialist-Bravo [Bot]', 
      'Sentry-Alpha [Bot]'
    ];
    const loadouts: WeaponType[] = ['rifle', 'shotgun', 'rifle', 'railgun', 'rifle'];

    for (let i = 0; i < count; i++) {
      const id = 'bot_' + Math.random().toString(36).substring(2, 7);
      const cp = this.tacticalChokepoints[(i * 3) % this.tacticalChokepoints.length];

      this.bots.push({
        state: {
          id,
          name: tacticalCallsigns[i % tacticalCallsigns.length],
          isHost: false,
          isBot: true,
          position: [cp.pos[0] + (Math.random() - 0.5) * 3, cp.pos[1], cp.pos[2] + (Math.random() - 0.5) * 3],
          rotationY: Math.atan2(cp.preAimDir[0], cp.preAimDir[2]),
          pitch: 0,
          health: 100,
          armor: 80,
          kills: 0,
          deaths: 0,
          ping: 15 + Math.floor(Math.random() * 10),
          currentWeapon: loadouts[i % loadouts.length],
          isFiring: false,
          isCrouching: false,
          lastAcknowledgedTick: 0
        },
        combatState: 'PATROL_PREAIM',
        currentVelocity: new THREE.Vector3(),
        aimTarget: new THREE.Vector3(...cp.pos).add(new THREE.Vector3(...cp.preAimDir).multiplyScalar(10)),
        preAimAngle: Math.atan2(cp.preAimDir[0], cp.preAimDir[2]),
        burstCount: 0,
        burstCooldown: 0.5,
        reactionTimer: this.getInitialReactionDelay(),
        hasTargetAcquired: false,
        jiggleTimer: 0.4,
        jiggleDir: 1,
        stateTimer: 2.0,
        nearestCoverPos: null,
        patrolIndex: i % this.tacticalChokepoints.length,
        staggerTimer: 0
      });
    }
  }

  private getInitialReactionDelay(): number {
    switch (this.difficulty) {
      case 'easy':
        // Generous reaction time (1.3s - 1.9s) so player easily reacts first!
        return 1.3 + Math.random() * 0.6;
      case 'balanced':
        return 0.85 + Math.random() * 0.4;
      case 'hard':
        return 0.45 + Math.random() * 0.25;
    }
  }

  public registerSound(pos: [number, number, number], intensity: 'footstep' | 'jump' | 'gunfire'): void {
    // Only detect close footsteps, gunfire travels further
    const radius = intensity === 'gunfire' ? 45 : (intensity === 'jump' ? 18 : 10);
    this.soundEvents.push({
      pos,
      intensity,
      radius,
      time: performance.now()
    });

    if (this.soundEvents.length > 15) {
      this.soundEvents.shift();
    }
  }

  public applyStagger(botId: string): void {
    const b = this.bots.find(x => x.state.id === botId);
    if (b) {
      b.staggerTimer = 0.45; // Flinch on being shot
      b.burstCooldown = Math.max(b.burstCooldown, 0.6);
    }
  }

  /**
   * Core AI Decision Making Loop (60Hz) with nerfed difficulty parameters
   */
  public update(
    dt: number,
    playerPos: [number, number, number],
    playerSpeed: number,
    worldBoxes: BoundingBox3D[],
    onBotFire?: (bot: SmartBotEntity, rayOrigin: [number, number, number], rayDir: [number, number, number], isHeadshotAim: boolean) => void
  ): void {
    if (!this.enabled) return;

    const pPosVec = new THREE.Vector3(...playerPos);
    const now = performance.now();

    this.bots.forEach((bot) => {
      if (bot.state.health <= 0) return;

      const botPos = new THREE.Vector3(...bot.state.position);
      const toPlayer = pPosVec.clone().sub(botPos);
      const distToPlayer = toPlayer.length();

      if (bot.staggerTimer > 0) {
        bot.staggerTimer -= dt;
      }

      // 1. Hearing Check
      let heardSound = false;
      let heardPos: THREE.Vector3 | null = null;

      for (let s = this.soundEvents.length - 1; s >= 0; s--) {
        const snd = this.soundEvents[s];
        if (now - snd.time > 1000) continue;
        const dist = botPos.distanceTo(new THREE.Vector3(...snd.pos));
        if (dist <= snd.radius) {
          heardSound = true;
          heardPos = new THREE.Vector3(...snd.pos);
          break;
        }
      }

      // 2. Realistic Human Vision Cone (No 360-degree all-seeing x-ray radar)
      // Bot facing direction based on rotationY
      const botFacing = new THREE.Vector3(
        Math.sin(bot.state.rotationY),
        0,
        Math.cos(bot.state.rotationY)
      ).normalize();

      const dirToPlayerFlat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
      const dotFov = botFacing.dot(dirToPlayerFlat);

      // Vision cone threshold:
      // Easy: ~70 degree cone (dot > 0.35)
      // Balanced: ~90 degree cone (dot > 0.0)
      // Close proximity (< 5m) or hearing loud gunshots bypasses FOV cone
      const fovThreshold = this.difficulty === 'easy' ? 0.35 : 0.0;
      const inVisionCone = dotFov >= fovThreshold || distToPlayer < 4.5 || heardSound;

      // 3. Line of Sight Raycast Check (Blocked by crates/walls)
      let hasLineOfSight = false;
      if (distToPlayer < (this.difficulty === 'easy' ? 45 : 65) && inVisionCone) {
        hasLineOfSight = true;
        const checkDir = toPlayer.clone().normalize();
        for (let b = 0; b < worldBoxes.length; b++) {
          const box = worldBoxes[b];
          if (this.checkLineIntersectsBox(botPos, checkDir, distToPlayer, box)) {
            hasLineOfSight = false;
            break;
          }
        }
      }

      // 4. State Machine Transitions
      bot.stateTimer -= dt;

      if (hasLineOfSight) {
        if (!bot.hasTargetAcquired) {
          bot.hasTargetAcquired = true;
          bot.reactionTimer = this.getInitialReactionDelay();
        } else {
          bot.reactionTimer -= dt;
        }

        if (bot.state.health < 40) {
          bot.combatState = 'RETREAT_TO_COVER';
        } else if (distToPlayer > 22) {
          bot.combatState = 'COUNTER_STRAFE_BURST';
        } else {
          if (bot.stateTimer <= 0) {
            bot.combatState = Math.random() > 0.6 ? 'JIGGLE_PEEK' : 'COUNTER_STRAFE_BURST';
            bot.stateTimer = 1.4 + Math.random() * 1.0;
          }
        }
      } else if (heardSound && heardPos) {
        bot.combatState = 'HOLD_ANGLE';
        bot.aimTarget.copy(heardPos).add(new THREE.Vector3(0, 0.9, 0));
        bot.hasTargetAcquired = false;
      } else {
        bot.hasTargetAcquired = false;
        if (bot.combatState !== 'PATROL_PREAIM') {
          bot.combatState = 'PATROL_PREAIM';
        }
      }

      // 5. State Execution
      const moveVec = new THREE.Vector3();
      const moveSpeed = this.difficulty === 'easy' ? 3.6 : 4.8;

      switch (bot.combatState) {
        case 'PATROL_PREAIM': {
          const cp = this.tacticalChokepoints[bot.patrolIndex];
          const goal = new THREE.Vector3(...cp.pos);
          if (botPos.distanceTo(goal) < 3.0) {
            bot.patrolIndex = (bot.patrolIndex + 1) % this.tacticalChokepoints.length;
          }
          const dir = goal.clone().sub(botPos).normalize();
          moveVec.copy(dir).multiplyScalar(moveSpeed);

          const preAimLook = goal.clone().add(new THREE.Vector3(...cp.preAimDir).multiplyScalar(6));
          preAimLook.y = 1.2;
          bot.aimTarget.lerp(preAimLook, dt * 4);
          bot.state.isCrouching = false;
          break;
        }

        case 'HOLD_ANGLE': {
          moveVec.set(0, 0, 0);
          bot.state.isCrouching = true;
          break;
        }

        case 'JIGGLE_PEEK': {
          bot.jiggleTimer -= dt;
          if (bot.jiggleTimer <= 0) {
            bot.jiggleTimer = 0.35 + Math.random() * 0.2;
            bot.jiggleDir *= -1;
          }
          const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
          moveVec.copy(perp).multiplyScalar(3.2 * bot.jiggleDir);

          // Aim at center of body (waist/chest) instead of head
          bot.aimTarget.copy(pPosVec).add(new THREE.Vector3(0, 1.05, 0));
          bot.state.isCrouching = false;
          break;
        }

        case 'COUNTER_STRAFE_BURST': {
          moveVec.set(0, 0, 0);
          // Aim at torso/chest (1.05m height)
          bot.aimTarget.copy(pPosVec).add(new THREE.Vector3(0, 1.05, 0));
          bot.state.isCrouching = Math.random() < 0.2;

          // Only fire once reaction delay has elapsed and bot is not staggered
          if (bot.reactionTimer <= 0 && hasLineOfSight && bot.staggerTimer <= 0) {
            bot.burstCooldown -= dt;
            if (bot.burstCooldown <= 0) {
              bot.state.isFiring = true;
              bot.burstCount++;

              if (onBotFire) {
                const aimDir = bot.aimTarget.clone().sub(botPos.clone().add(new THREE.Vector3(0, 1.5, 0))).normalize();
                
                // Generous human spread so bots miss most shots on Easy!
                const spreadAmount = this.difficulty === 'easy' 
                  ? 0.085 + Math.random() * 0.045
                  : (this.difficulty === 'balanced' ? 0.05 + Math.random() * 0.03 : 0.02 + Math.random() * 0.02);

                aimDir.x += (Math.random() - 0.5) * spreadAmount;
                aimDir.y += (Math.random() - 0.5) * spreadAmount * 0.7; // slight vertical leeway
                aimDir.z += (Math.random() - 0.5) * spreadAmount;
                aimDir.normalize();

                const eyePos: [number, number, number] = [botPos.x, botPos.y + 1.5, botPos.z];
                onBotFire(bot, eyePos, [aimDir.x, aimDir.y, aimDir.z], false);
              }

              // Burst limit (1-2 bullets max in easy)
              const maxBurst = this.difficulty === 'easy' ? 2 : (this.difficulty === 'balanced' ? 2 : 3);
              if (bot.burstCount >= maxBurst) {
                bot.burstCount = 0;
                // Long recovery pause so player has ample time to shoot
                bot.burstCooldown = this.difficulty === 'easy' ? 1.25 : (this.difficulty === 'balanced' ? 0.85 : 0.5);
              } else {
                bot.burstCooldown = 0.16; // Moderate cyclic delay
              }
            }
          }
          break;
        }

        case 'RETREAT_TO_COVER': {
          const retreatDir = toPlayer.clone().negate().normalize();
          moveVec.copy(retreatDir).multiplyScalar(4.5);
          bot.state.isCrouching = true;
          break;
        }
      }

      // Smooth CS2 Rotation & Aim Tracking (more relaxed turn rate on easy)
      const lookDelta = bot.aimTarget.clone().sub(botPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      const desiredYaw = Math.atan2(lookDelta.x, lookDelta.z);
      const flatDist = Math.sqrt(lookDelta.x * lookDelta.x + lookDelta.z * lookDelta.z);
      const desiredPitch = -Math.atan2(lookDelta.y, flatDist);

      // Fluid Shortest-Angle Rotation & Aim Tracking (No 360 spin artifacts)
      const turnSpeed = this.difficulty === 'easy' ? 6.5 : 9.5;
      let deltaYaw = (desiredYaw - bot.state.rotationY) % (Math.PI * 2);
      if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      bot.state.rotationY += deltaYaw * Math.min(1.0, dt * turnSpeed);

      bot.state.pitch = THREE.MathUtils.lerp(bot.state.pitch, desiredPitch, dt * turnSpeed);

      // Smooth Velocity Acceleration & Damping (No jerky snaps)
      bot.currentVelocity.lerp(moveVec, dt * 9.0);

      // Apply movement step
      botPos.x += bot.currentVelocity.x * dt;
      botPos.z += bot.currentVelocity.z * dt;
      botPos.x = THREE.MathUtils.clamp(botPos.x, -46, 46);
      botPos.z = THREE.MathUtils.clamp(botPos.z, -46, 46);

      bot.state.position = [botPos.x, botPos.y, botPos.z];
    });
  }

  private checkLineIntersectsBox(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    box: BoundingBox3D
  ): boolean {
    let tmin = -Infinity;
    let tmax = Infinity;

    if (Math.abs(dir.x) > 1e-6) {
      let t1 = (box.minX - origin.x) / dir.x;
      let t2 = (box.maxX - origin.x) / dir.x;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    }
    if (Math.abs(dir.y) > 1e-6) {
      let t1 = (box.minY - origin.y) / dir.y;
      let t2 = (box.maxY - origin.y) / dir.y;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    }
    if (Math.abs(dir.z) > 1e-6) {
      let t1 = (box.minZ - origin.z) / dir.z;
      let t2 = (box.maxZ - origin.z) / dir.z;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    }

    if (tmin > tmax || tmax < 0) return false;
    return tmin > 0 && tmin < maxDist;
  }

  public respawnBot(botId: string, spawnPos: [number, number, number]): void {
    const b = this.bots.find(x => x.state.id === botId);
    if (b) {
      b.state.health = 100;
      b.state.armor = 80;
      b.state.position = [...spawnPos];
      b.hasTargetAcquired = false;
      b.combatState = 'PATROL_PREAIM';
      b.reactionTimer = this.getInitialReactionDelay();
      b.staggerTimer = 0;
    }
  }
}
