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
  /** Last place the bot saw the player (used for suppression + flanking). */
  lastKnownPlayerPos: THREE.Vector3 | null;
  lastSeenTime: number;
  /** Smooth, time-correlated aim error (human-like drift instead of white noise per bullet). */
  aimDrift: THREE.Vector3;
  aimDriftTarget: THREE.Vector3;
  aimDriftTimer: number;
  /** Cover peek cycle. */
  peekPhase: 'HIDE' | 'PEEK';
  peekTimer: number;
  coverPeekOffset: THREE.Vector3;
  flankGoal: THREE.Vector3 | null;
  footstepTimer: number;
  shotsSinceLastSeen: number;
}

export class BotSimulation {
  public bots: SmartBotEntity[] = [];
  public soundEvents: SoundEvent[] = [];
  public difficulty: BotDifficulty = 'easy'; // Default to Nerfed/Easy for fun, fair gameplay
  public enabled: boolean = true; // Togglable bot simulation
  /** Fired whenever a moving bot plants a foot — the game plays a spatialised footstep. */
  public onBotFootstep: ((bot: SmartBotEntity, pos: [number, number, number]) => void) | null = null;

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
    const loadouts: WeaponType[] = ['rifle', 'shotgun', 'smg', 'railgun', 'lmg', 'dmr', 'rifle', 'scattergun'];

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
        staggerTimer: 0,
        lastKnownPlayerPos: null,
        lastSeenTime: 0,
        aimDrift: new THREE.Vector3(),
        aimDriftTarget: new THREE.Vector3(),
        aimDriftTimer: 0,
        peekPhase: 'HIDE',
        peekTimer: 0,
        coverPeekOffset: new THREE.Vector3(),
        flankGoal: null,
        footstepTimer: Math.random(),
        shotsSinceLastSeen: 0
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
    const loadouts: WeaponType[] = ['rifle', 'shotgun', 'smg', 'railgun', 'lmg', 'dmr', 'rifle', 'scattergun'];

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
        staggerTimer: 0,
        lastKnownPlayerPos: null,
        lastSeenTime: 0,
        aimDrift: new THREE.Vector3(),
        aimDriftTarget: new THREE.Vector3(),
        aimDriftTimer: 0,
        peekPhase: 'HIDE',
        peekTimer: 0,
        coverPeekOffset: new THREE.Vector3(),
        flankGoal: null,
        footstepTimer: Math.random(),
        shotsSinceLastSeen: 0
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
   * Core AI decision loop (runs every frame).
   *
   * Perception  : vision cone + LOS raycast against world geometry, hearing with radii per sound type.
   * Memory      : last-known player position drives suppression fire, searching and flanking.
   * Tactics     : cover search (geometry-aware), hide/peek cycles from cover, jiggle-peeks, counter-strafe
   *               bursts, flanking when the player camps, retreat when hurt.
   * Aim model   : time-correlated drift + per-shot spread + target leading (hard) instead of white noise.
   * Movement    : velocity-smoothed steering with AABB collision resolution so bots never clip through props.
   */
  public update(
    dt: number,
    playerPos: [number, number, number],
    playerSpeed: number,
    worldBoxes: BoundingBox3D[],
    onBotFire?: (bot: SmartBotEntity, rayOrigin: [number, number, number], rayDir: [number, number, number], isHeadshotAim: boolean) => void,
    playerVelocity: [number, number, number] = [0, 0, 0]
  ): void {
    if (!this.enabled) return;

    const pPosVec = new THREE.Vector3(...playerPos);
    const pVel = new THREE.Vector3(...playerVelocity);
    const now = performance.now();
    const diff = this.difficulty;
    const T = {
      visionDot: diff === 'easy' ? 0.35 : diff === 'balanced' ? 0.05 : -0.15,
      visionRange: diff === 'easy' ? 45 : diff === 'balanced' ? 65 : 80,
      moveSpeed: diff === 'easy' ? 3.6 : diff === 'balanced' ? 4.6 : 5.2,
      turnSpeed: diff === 'easy' ? 6.5 : diff === 'balanced' ? 9.0 : 12.0,
      spread: diff === 'easy' ? 0.075 : diff === 'balanced' ? 0.042 : 0.02,
      driftAmp: diff === 'easy' ? 0.09 : diff === 'balanced' ? 0.05 : 0.022,
      maxBurst: diff === 'easy' ? 2 : diff === 'balanced' ? 3 : 4,
      burstPause: diff === 'easy' ? 1.25 : diff === 'balanced' ? 0.75 : 0.42,
      cyclic: diff === 'easy' ? 0.17 : diff === 'balanced' ? 0.13 : 0.1,
      lead: diff === 'hard' ? 0.85 : diff === 'balanced' ? 0.35 : 0,
      headshotChance: diff === 'easy' ? 0.02 : diff === 'balanced' ? 0.1 : 0.28,
      memoryMs: diff === 'easy' ? 2500 : 5000,
    };

    this.bots.forEach((bot) => {
      if (bot.state.health <= 0) return;

      const botPos = new THREE.Vector3(...bot.state.position);
      const eye = botPos.clone().add(new THREE.Vector3(0, 1.5, 0));
      const toPlayer = pPosVec.clone().sub(botPos);
      const distToPlayer = toPlayer.length();

      if (bot.staggerTimer > 0) bot.staggerTimer -= dt;

      // ---- 1. Hearing -------------------------------------------------------
      let heardPos: THREE.Vector3 | null = null;
      for (let i = this.soundEvents.length - 1; i >= 0; i--) {
        const snd = this.soundEvents[i];
        if (now - snd.time > 1000) continue;
        const sp = new THREE.Vector3(...snd.pos);
        if (botPos.distanceTo(sp) <= snd.radius) { heardPos = sp; break; }
      }

      // ---- 2. Vision cone + line of sight ----------------------------------
      const botFacing = new THREE.Vector3(Math.sin(bot.state.rotationY), 0, Math.cos(bot.state.rotationY));
      const dirFlat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
      const inCone = botFacing.dot(dirFlat) >= T.visionDot || distToPlayer < 4.5 || !!heardPos;
      let hasLOS = false;
      if (distToPlayer < T.visionRange && inCone) {
        hasLOS = !this.segmentBlocked(eye, pPosVec.clone().add(new THREE.Vector3(0, 1.2, 0)), worldBoxes);
      }

      if (hasLOS) {
        bot.lastKnownPlayerPos = pPosVec.clone();
        bot.lastSeenTime = now;
        bot.shotsSinceLastSeen = 0;
      } else if (heardPos) {
        bot.lastKnownPlayerPos = heardPos.clone();
        bot.lastSeenTime = Math.max(bot.lastSeenTime, now - 800);
      }
      const remembers = bot.lastKnownPlayerPos !== null && now - bot.lastSeenTime < T.memoryMs;

      // ---- 3. State transitions ---------------------------------------------
      bot.stateTimer -= dt;
      if (hasLOS) {
        if (!bot.hasTargetAcquired) {
          bot.hasTargetAcquired = true;
          bot.reactionTimer = this.getInitialReactionDelay();
        } else {
          bot.reactionTimer -= dt;
        }

        const lowHp = bot.state.health < (diff === 'hard' ? 30 : 45);
        if (lowHp && bot.combatState !== 'RETREAT_TO_COVER') {
          bot.combatState = 'RETREAT_TO_COVER';
          bot.nearestCoverPos = this.findCover(botPos, pPosVec, worldBoxes);
          bot.stateTimer = 2.5;
        } else if (!lowHp && bot.stateTimer <= 0) {
          const r = Math.random();
          if (distToPlayer > 24) {
            // Long range: take a cover position and trade from it, or hold and burst
            if (r < 0.55 && diff !== 'easy') {
              bot.nearestCoverPos = this.findCover(botPos, pPosVec, worldBoxes);
              bot.combatState = bot.nearestCoverPos ? 'HOLD_ANGLE' : 'COUNTER_STRAFE_BURST';
            } else {
              bot.combatState = 'COUNTER_STRAFE_BURST';
            }
            bot.stateTimer = 2.0 + Math.random() * 1.5;
          } else {
            bot.combatState = r < 0.45 ? 'JIGGLE_PEEK' : 'COUNTER_STRAFE_BURST';
            bot.stateTimer = 1.2 + Math.random() * 1.0;
          }
        }
      } else if (remembers && bot.lastKnownPlayerPos) {
        // Lost sight: suppress briefly, then flank or push the last known position
        if (bot.combatState !== 'FLANKING' && bot.combatState !== 'RETREAT_TO_COVER') {
          if (bot.stateTimer <= 0) {
            const shouldFlank = diff !== 'easy' && (playerSpeed < 0.5 || Math.random() < 0.5);
            if (shouldFlank) {
              bot.combatState = 'FLANKING';
              const side = Math.random() < 0.5 ? 1 : -1;
              const toLK = bot.lastKnownPlayerPos.clone().sub(botPos).setY(0).normalize();
              const perp = new THREE.Vector3(-toLK.z, 0, toLK.x).multiplyScalar(side * (8 + Math.random() * 6));
              bot.flankGoal = bot.lastKnownPlayerPos.clone().add(perp).add(toLK.clone().multiplyScalar(-3));
              bot.flankGoal.x = THREE.MathUtils.clamp(bot.flankGoal.x, -44, 44);
              bot.flankGoal.z = THREE.MathUtils.clamp(bot.flankGoal.z, -44, 44);
              bot.stateTimer = 4.5;
            } else {
              bot.combatState = 'HOLD_ANGLE';
              bot.stateTimer = 1.5 + Math.random();
            }
          }
        } else if (bot.combatState === 'FLANKING' && bot.stateTimer <= 0) {
          bot.combatState = 'HOLD_ANGLE';
          bot.flankGoal = null;
          bot.stateTimer = 1.5;
        }
        bot.hasTargetAcquired = false;
      } else {
        bot.hasTargetAcquired = false;
        bot.flankGoal = null;
        if (bot.combatState !== 'PATROL_PREAIM') bot.combatState = 'PATROL_PREAIM';
      }

      // ---- 4. Aim model -----------------------------------------------------
      bot.aimDriftTimer -= dt;
      if (bot.aimDriftTimer <= 0) {
        bot.aimDriftTimer = 0.25 + Math.random() * 0.35;
        bot.aimDriftTarget.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2).multiplyScalar(T.driftAmp);
      }
      bot.aimDrift.lerp(bot.aimDriftTarget, dt * 3.5);
      // Drift shrinks the longer the bot has had the target in view (settling onto the target)
      const settle = bot.hasTargetAcquired ? THREE.MathUtils.clamp(1 - (-bot.reactionTimer) * 0.5, 0.35, 1) : 1;

      const aimHead = Math.random() < T.headshotChance;
      const targetAimPoint = (): THREE.Vector3 => {
        const lead = pVel.clone().multiplyScalar(T.lead * Math.min(distToPlayer / 60, 1) * 0.5);
        return pPosVec.clone().add(lead).add(new THREE.Vector3(0, aimHead ? 1.6 : 1.05, 0));
      };

      // ---- 5. State execution ----------------------------------------------
      const moveVec = new THREE.Vector3();
      let wantsToFire = false;

      switch (bot.combatState) {
        case 'PATROL_PREAIM': {
          const cp = this.tacticalChokepoints[bot.patrolIndex];
          const goal = new THREE.Vector3(...cp.pos);
          if (botPos.distanceTo(goal) < 3.0) bot.patrolIndex = (bot.patrolIndex + 1) % this.tacticalChokepoints.length;
          moveVec.copy(this.steer(botPos, goal, worldBoxes)).multiplyScalar(T.moveSpeed * 0.85);
          const preAimLook = goal.clone().add(new THREE.Vector3(...cp.preAimDir).multiplyScalar(6));
          preAimLook.y = 1.2;
          bot.aimTarget.lerp(preAimLook, dt * 4);
          bot.state.isCrouching = false;
          break;
        }

        case 'HOLD_ANGLE': {
          // From cover: hide/peek rhythm. Without cover: crouch and watch the last known position.
          const lk = bot.lastKnownPlayerPos ?? pPosVec;
          if (bot.nearestCoverPos) {
            bot.peekTimer -= dt;
            if (bot.peekTimer <= 0) {
              bot.peekPhase = bot.peekPhase === 'HIDE' ? 'PEEK' : 'HIDE';
              bot.peekTimer = bot.peekPhase === 'PEEK' ? 0.7 + Math.random() * 0.6 : 0.6 + Math.random() * 0.9;
              if (bot.peekPhase === 'PEEK') {
                const toT = lk.clone().sub(bot.nearestCoverPos).setY(0).normalize();
                const side = Math.random() < 0.5 ? 1 : -1;
                bot.coverPeekOffset.set(-toT.z, 0, toT.x).multiplyScalar(side * 1.3);
              }
            }
            const goal = bot.peekPhase === 'PEEK' ? bot.nearestCoverPos.clone().add(bot.coverPeekOffset) : bot.nearestCoverPos;
            if (botPos.distanceTo(goal) > 0.35) moveVec.copy(this.steer(botPos, goal, worldBoxes)).multiplyScalar(T.moveSpeed);
            bot.state.isCrouching = bot.peekPhase === 'HIDE';
            wantsToFire = bot.peekPhase === 'PEEK' && hasLOS;
          } else {
            bot.state.isCrouching = true;
            wantsToFire = hasLOS;
          }
          bot.aimTarget.lerp(hasLOS ? targetAimPoint() : lk.clone().add(new THREE.Vector3(0, 1.1, 0)), dt * 10);
          break;
        }

        case 'JIGGLE_PEEK': {
          bot.jiggleTimer -= dt;
          if (bot.jiggleTimer <= 0) {
            bot.jiggleTimer = 0.3 + Math.random() * 0.25;
            bot.jiggleDir *= -1;
          }
          const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
          moveVec.copy(perp).multiplyScalar(3.4 * bot.jiggleDir);
          bot.aimTarget.copy(targetAimPoint());
          bot.state.isCrouching = false;
          wantsToFire = hasLOS && diff !== 'easy'; // moving fire only for tougher bots
          break;
        }

        case 'COUNTER_STRAFE_BURST': {
          // Plant feet, fire a burst, micro-strafe between bursts
          const between = bot.burstCount === 0 && bot.burstCooldown > 0.25;
          if (between && diff !== 'easy') {
            const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
            moveVec.copy(perp).multiplyScalar(2.2 * bot.jiggleDir);
          }
          bot.aimTarget.copy(targetAimPoint());
          bot.state.isCrouching = !between && Math.random() < 0.015 ? !bot.state.isCrouching : bot.state.isCrouching;
          wantsToFire = hasLOS;
          break;
        }

        case 'FLANKING': {
          const goal = bot.flankGoal ?? (bot.lastKnownPlayerPos ?? pPosVec);
          if (botPos.distanceTo(goal) < 1.5) { bot.stateTimer = 0; }
          moveVec.copy(this.steer(botPos, goal, worldBoxes)).multiplyScalar(T.moveSpeed);
          const look = (bot.lastKnownPlayerPos ?? pPosVec).clone().add(new THREE.Vector3(0, 1.1, 0));
          bot.aimTarget.lerp(look, dt * 6);
          bot.state.isCrouching = false;
          break;
        }

        case 'RETREAT_TO_COVER': {
          const cover = bot.nearestCoverPos;
          if (cover && botPos.distanceTo(cover) > 0.5) {
            moveVec.copy(this.steer(botPos, cover, worldBoxes)).multiplyScalar(T.moveSpeed * 1.1);
            bot.state.isCrouching = false;
          } else if (cover) {
            // In cover: heal-up pause, then transition to peeking from it
            bot.state.isCrouching = true;
            if (bot.stateTimer <= 0) { bot.combatState = 'HOLD_ANGLE'; bot.peekPhase = 'HIDE'; bot.peekTimer = 0.4; bot.stateTimer = 3; }
          } else {
            moveVec.copy(toPlayer.clone().negate().setY(0).normalize()).multiplyScalar(4.5);
            bot.state.isCrouching = false;
            if (bot.stateTimer <= 0) { bot.combatState = 'COUNTER_STRAFE_BURST'; bot.stateTimer = 1.5; }
          }
          // Blind-fire back while retreating if still visible (harder bots)
          wantsToFire = hasLOS && diff === 'hard' && Math.random() < 0.5;
          bot.aimTarget.lerp(hasLOS ? targetAimPoint() : (bot.lastKnownPlayerPos ?? pPosVec).clone().add(new THREE.Vector3(0, 1.1, 0)), dt * 8);
          break;
        }
      }

      // Suppression: after losing sight, pour a few rounds into the last known position
      if (!hasLOS && remembers && bot.lastKnownPlayerPos && diff !== 'easy' && bot.shotsSinceLastSeen < 3 &&
          now - bot.lastSeenTime < 900 && bot.combatState !== 'RETREAT_TO_COVER') {
        wantsToFire = true;
        bot.aimTarget.copy(bot.lastKnownPlayerPos).add(new THREE.Vector3(0, 1.0, 0));
      }

      // ---- 6. Firing --------------------------------------------------------
      bot.state.isFiring = false;
      const canShoot = wantsToFire && bot.reactionTimer <= 0 && bot.staggerTimer <= 0;
      if (canShoot) {
        bot.burstCooldown -= dt;
        if (bot.burstCooldown <= 0) {
          bot.state.isFiring = true;
          bot.burstCount++;
          if (!hasLOS) bot.shotsSinceLastSeen++;

          if (onBotFire) {
            const aimDir = bot.aimTarget.clone().add(bot.aimDrift.clone().multiplyScalar(settle * distToPlayer * 0.25)).sub(eye).normalize();
            // Per-shot spread grows through a burst (recoil) and while moving
            const moving = moveVec.lengthSq() > 0.5 ? 1.6 : 1.0;
            const recoil = 1 + (bot.burstCount - 1) * 0.35;
            const sp = T.spread * moving * recoil;
            aimDir.x += (Math.random() - 0.5) * sp;
            aimDir.y += (Math.random() - 0.5) * sp * 0.7;
            aimDir.z += (Math.random() - 0.5) * sp;
            aimDir.normalize();
            onBotFire(bot, [eye.x, eye.y, eye.z], [aimDir.x, aimDir.y, aimDir.z], aimHead);
          }

          if (bot.burstCount >= T.maxBurst) {
            bot.burstCount = 0;
            bot.burstCooldown = T.burstPause + Math.random() * 0.2;
            bot.jiggleDir *= -1;
          } else {
            bot.burstCooldown = T.cyclic;
          }
        }
      } else if (bot.burstCount > 0 && !wantsToFire) {
        bot.burstCount = 0;
        bot.burstCooldown = Math.max(bot.burstCooldown, 0.2);
      }

      // ---- 7. Rotation & aim tracking -------------------------------------
      const lookDelta = bot.aimTarget.clone().sub(eye);
      const desiredYaw = Math.atan2(lookDelta.x, lookDelta.z);
      const flatDist = Math.hypot(lookDelta.x, lookDelta.z);
      const desiredPitch = -Math.atan2(lookDelta.y, flatDist);
      let deltaYaw = (desiredYaw - bot.state.rotationY) % (Math.PI * 2);
      if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      bot.state.rotationY += deltaYaw * Math.min(1.0, dt * T.turnSpeed);
      bot.state.pitch = THREE.MathUtils.lerp(bot.state.pitch, desiredPitch, Math.min(1, dt * T.turnSpeed));

      // ---- 8. Movement + collision ----------------------------------------
      if (bot.state.isCrouching) moveVec.multiplyScalar(0.55);
      if (bot.staggerTimer > 0) moveVec.multiplyScalar(0.4);
      bot.currentVelocity.lerp(moveVec, Math.min(1, dt * 9.0));

      botPos.x += bot.currentVelocity.x * dt;
      botPos.z += bot.currentVelocity.z * dt;
      this.resolveCollisions(botPos, worldBoxes);
      botPos.x = THREE.MathUtils.clamp(botPos.x, -46, 46);
      botPos.z = THREE.MathUtils.clamp(botPos.z, -46, 46);
      bot.state.position = [botPos.x, botPos.y, botPos.z];

      // Footsteps: cadence scales with speed; both audible to the player and to other bots
      const speed = Math.hypot(bot.currentVelocity.x, bot.currentVelocity.z);
      if (speed > 1.0) {
        bot.footstepTimer -= dt * (speed / 2.6);
        if (bot.footstepTimer <= 0) {
          bot.footstepTimer = bot.state.isCrouching ? 0.9 : 0.5;
          if (!bot.state.isCrouching) this.onBotFootstep?.(bot, [botPos.x, botPos.y, botPos.z]);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  private static readonly BOT_RADIUS = 0.42;

  /** True if the segment a→b passes through any world box (ignores boxes the segment starts inside). */
  private segmentBlocked(a: THREE.Vector3, b: THREE.Vector3, boxes: BoundingBox3D[]): boolean {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-4) return false;
    dir.divideScalar(len);
    for (let i = 0; i < boxes.length; i++) {
      if (this.checkLineIntersectsBox(a, dir, len, boxes[i])) return true;
    }
    return false;
  }

  /** Steering direction toward goal with simple obstacle avoidance (whisker probes). */
  private steer(pos: THREE.Vector3, goal: THREE.Vector3, boxes: BoundingBox3D[]): THREE.Vector3 {
    const desired = goal.clone().sub(pos).setY(0);
    if (desired.lengthSq() < 1e-4) return new THREE.Vector3();
    desired.normalize();
    const probe = (d: THREE.Vector3, dist: number): boolean =>
      this.segmentBlocked(pos.clone().add(new THREE.Vector3(0, 0.6, 0)), pos.clone().add(new THREE.Vector3(0, 0.6, 0)).addScaledVector(d, dist), boxes);
    if (!probe(desired, 2.2)) return desired;
    // Try rotating left/right in widening steps
    for (const ang of [0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6]) {
      const d = desired.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      if (!probe(d, 2.0)) return d;
    }
    return desired.negate();
  }

  /** Push the bot out of any walkable-height box it overlaps (XZ circle vs AABB). */
  private resolveCollisions(pos: THREE.Vector3, boxes: BoundingBox3D[]): void {
    const r = BotSimulation.BOT_RADIUS;
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        // Only boxes that actually block at body height
        if (b.maxY < pos.y + 0.3 || b.minY > pos.y + 1.6) continue;
        const cx = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
        const cz = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (r - d);
          pos.z += (dz / d) * (r - d);
        } else {
          // Centre is inside the box: exit through the nearest face
          const exits = [pos.x - b.minX + r, b.maxX - pos.x + r, pos.z - b.minZ + r, b.maxZ - pos.z + r];
          const k = exits.indexOf(Math.min(...exits));
          if (k === 0) pos.x = b.minX - r; else if (k === 1) pos.x = b.maxX + r; else if (k === 2) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
        }
      }
    }
  }

  /**
   * Find a standing position near the bot that breaks line of sight from the threat:
   * sample points around nearby boxes on the side facing away from the threat and
   * keep the closest one that is actually occluded.
   */
  private findCover(botPos: THREE.Vector3, threat: THREE.Vector3, boxes: BoundingBox3D[]): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestScore = Infinity;
    const threatEye = threat.clone().add(new THREE.Vector3(0, 1.2, 0));
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.maxY - b.minY < 0.9) continue; // too low to hide behind
      if (b.minY > botPos.y + 1.0 || b.maxY < botPos.y + 0.8) continue; // not on this level
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const distBox = Math.hypot(cx - botPos.x, cz - botPos.z);
      if (distBox > 18) continue;
      const away = new THREE.Vector3(cx - threat.x, 0, cz - threat.z).normalize();
      const hx = (b.maxX - b.minX) / 2 + 0.7;
      const hz = (b.maxZ - b.minZ) / 2 + 0.7;
      for (const f of [1.0, 1.35]) {
        const cand = new THREE.Vector3(cx + away.x * hx * f, botPos.y, cz + away.z * hz * f);
        if (Math.abs(cand.x) > 45 || Math.abs(cand.z) > 45) continue;
        const candEye = cand.clone().add(new THREE.Vector3(0, 1.3, 0));
        if (!this.segmentBlocked(threatEye, candEye, boxes)) continue; // still visible
        const probe = cand.clone(); this.resolveCollisions(probe, boxes);
        if (probe.distanceTo(cand) > 0.3) continue; // inside geometry
        const score = cand.distanceTo(botPos) + (cand.distanceTo(threat) < 4 ? 10 : 0);
        if (score < bestScore) { bestScore = score; best = cand; }
      }
    }
    return best;
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
      b.lastKnownPlayerPos = null;
      b.flankGoal = null;
      b.nearestCoverPos = null;
      b.burstCount = 0;
    }
  }
}
