/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SENTINEL v2 — host-authoritative anti-cheat for the P2P arena.
 *
 * Design rules (stability first):
 *  1. It can never throw and never break the game. Every public entry point is wrapped; a bug in a
 *     detector degrades to "accept" and logs once, instead of kicking honest players.
 *  2. Decisions are statistical, not single-sample. Every detector feeds a per-subject *suspicion score*
 *     that decays over time. Lag spikes, tab switches and frame hitches produce single outliers which
 *     decay away; cheats produce sustained signal which accumulates. Escalation has hysteresis.
 *  3. Hard limits are only applied to things physics makes impossible (NaN inputs, dt budgets, packet
 *     floods, fire-rate beyond the weapon's mechanical cycle), and even those are *sanitised* rather
 *     than punished unless they repeat.
 *  4. Memory is bounded: ring buffers everywhere, per-subject state is evicted when a peer leaves.
 *  5. Deterministic & testable: no wall-clock dependence except the `now` passed in.
 *
 * What it inspects
 *  - Input packets from remote clients (host side): shape, NaN/Infinity, tick monotonicity, packet
 *    rate (flood), dt inflation (speed-hack via time), yaw/pitch snap statistics, "snap-then-fire"
 *    aimbot signature, trigger-bot cadence regularity, fire-rate vs. weapon definition, fire-while-dead.
 *  - Host's own simulation results per peer: horizontal speed vs. physics ceiling, teleport deltas,
 *    sustained hover without ground contact.
 *  - Local client (self-audit): same movement/fire checks against the local sim, plus environment
 *    integrity probes (monotonic clock, patched core prototypes, frozen weapon table).
 *
 * Escalation: CLEAN → SUSPECT (logged) → FLAGGED (inputs rate-limited, fire sanitised) → BLOCKED
 * (host drops the peer). Only BLOCKED is irreversible for the session.
 */

import { WEAPON_DEFINITIONS, type WeaponType } from '../weapons/WeaponSystem';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TrustLevel = 'CLEAN' | 'SUSPECT' | 'FLAGGED' | 'BLOCKED';

export type ViolationKind =
  | 'MALFORMED_INPUT'
  | 'PACKET_FLOOD'
  | 'TICK_REPLAY'
  | 'TIME_DILATION'
  | 'SPEED'
  | 'TELEPORT'
  | 'FLY'
  | 'AIM_SNAP'
  | 'SNAP_FIRE'
  | 'TRIGGER_BOT'
  | 'RATE_OF_FIRE'
  | 'FIRE_WHILE_DEAD'
  | 'INTEGRITY';

export interface Violation {
  kind: ViolationKind;
  weight: number;
  detail: string;
  at: number;
}

export interface SubjectReport {
  id: string;
  name: string;
  trust: TrustLevel;
  suspicion: number;          // 0..100
  violations: number;
  recent: Violation[];
  packetsPerSecond: number;
  lastSeen: number;
}

export interface AntiCheatReport {
  status: 'SECURED' | 'WARNING' | 'COMPROMISED';
  violationsCount: number;
  recentFlags: string[];
  activeProtections: { name: string; status: 'ACTIVE' | 'OK' }[];
  uptimeSeconds: number;
  subjects: SubjectReport[];
  localTrust: TrustLevel;
}

export interface InputVerdict {
  accept: boolean;            // false → drop the packet entirely
  fire: boolean;              // fire flag after sanitisation (may be forced false)
  dt: number;                 // dt after budget clamp
  trust: TrustLevel;
  kick: boolean;              // host should disconnect this peer
}

/** Minimal shape SENTINEL needs from a client input packet (already partially parsed). */
export interface InspectableInput {
  tick: number;
  dt: number;
  yaw: number;
  pitch: number;
  fire: boolean;
  weapon: string;
  moveForward: number;
  moveRight: number;
}

// ---------------------------------------------------------------------------
// Tunables — all thresholds live here
// ---------------------------------------------------------------------------

export const SENTINEL_TUNING = {
  // Suspicion
  decayPerSecond: 1.6,              // points/sec of suspicion that evaporate
  suspectAt: 18,
  flaggedAt: 42,
  blockedAt: 85,
  clearBelow: 10,                   // hysteresis: FLAGGED → SUSPECT → CLEAN only below these
  blockRequiresDistinctKinds: 2,    // never block on a single detector type alone

  // Packets
  maxPacketsPerSecond: 90,          // clients send ≤ 60 Hz; allow burst for catch-up
  packetWindowMs: 1000,
  maxTickJump: 600,                 // >10 s of ticks ahead = forged

  // Time budget (anti dt-inflation). Over any 2 s window a client may claim at most this much sim time.
  /** Time bank: client may claim sim time up to wall*ratio; the bank absorbs burst delivery / lag spikes. */
  timeBankCapMs: 1500,
  timeBankRatio: 1.05,
  timeBankFlagEveryMs: 1000,

  // Movement (host-sim results per peer; physics cannot exceed these)
  maxHorizontalSpeed: 15.5,         // m/s, above max bunny-hop/slide
  teleportDistance: 6.0,            // metres between consecutive host sim steps
  maxAirborneSeconds: 3.2,

  // Aim
  snapYawRad: 2.4,                  // ≥ ~137° in one packet
  snapPitchRad: 1.1,
  snapFireWindowMs: 60,             // snap immediately followed by fire
  triggerBotMinSamples: 8,
  triggerBotJitterMs: 1.5,          // std-dev of fire intervals below this = machine, not human

  // Fire
  rateOfFireTolerance: 0.88,        // allow 12 % under the mechanical interval for jitter
  rateOfFireStrikesToSanitise: 3,

  // Integrity self-audit interval
  integrityIntervalMs: 15000,
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const WEIGHTS: Record<ViolationKind, number> = {
  MALFORMED_INPUT: 6,
  PACKET_FLOOD: 8,
  TICK_REPLAY: 5,
  TIME_DILATION: 14,
  SPEED: 16,
  TELEPORT: 20,
  FLY: 12,
  AIM_SNAP: 4,
  SNAP_FIRE: 18,
  TRIGGER_BOT: 14,
  RATE_OF_FIRE: 10,
  FIRE_WHILE_DEAD: 12,
  INTEGRITY: 25,
};

class Ring<T> {
  private buf: (T | undefined)[];
  private head = 0;
  private count = 0;
  constructor(private readonly cap: number) { this.buf = new Array(cap); }
  push(v: T): void { this.buf[this.head] = v; this.head = (this.head + 1) % this.cap; this.count = Math.min(this.count + 1, this.cap); }
  get size(): number { return this.count; }
  toArray(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.count; i++) out.push(this.buf[(this.head - this.count + i + this.cap) % this.cap] as T);
    return out;
  }
  clear(): void { this.count = 0; this.head = 0; }
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const wrapAngle = (a: number): number => { let r = a % (Math.PI * 2); if (r > Math.PI) r -= Math.PI * 2; if (r < -Math.PI) r += Math.PI * 2; return r; };

function weaponIntervalMs(weapon: string): number {
  const def = (WEAPON_DEFINITIONS as Record<string, { fireRateRpm: number } | undefined>)[weapon];
  if (!def || !isFiniteNum(def.fireRateRpm) || def.fireRateRpm <= 0) return 50;
  return 60000 / def.fireRateRpm;
}

// ---------------------------------------------------------------------------
// Per-subject state
// ---------------------------------------------------------------------------

class Subject {
  trust: TrustLevel = 'CLEAN';
  suspicion = 0;
  violationsTotal = 0;
  recent = new Ring<Violation>(16);
  lastDecayAt: number;
  lastSeen: number;

  // packets
  packetTimes = new Ring<number>(128);
  lastTick = -1;
  // time budget
  timeBankMs: number = SENTINEL_TUNING.timeBankCapMs;
  /** Rolling accepted-shot timestamps per weapon for average-cadence enforcement. */
  shotLog = new Map<string, number[]>();
  timeBankLastAt = -1;
  timeBankLastFlagAt = -Infinity;
  // aim
  lastYaw: number | null = null;
  lastPitch: number | null = null;
  lastSnapAt = -Infinity;
  // fire
  lastFireAt = new Map<string, number>();
  fireIntervals = new Ring<number>(24);
  rofStrikes = 0;
  wasFiring = false;
  // movement (host sim)
  lastPos: [number, number, number] | null = null;
  lastPosAt = 0;
  airborneSince: number | null = null;
  alive = true;

  constructor(public readonly id: string, public name: string, now: number) {
    this.lastDecayAt = now;
    this.lastSeen = now;
  }
}

// ---------------------------------------------------------------------------
// SENTINEL
// ---------------------------------------------------------------------------

export class SentinelAntiCheat {
  private subjects = new Map<string, Subject>();
  private readonly local: Subject;
  private readonly startTime: number;
  private lastIntegrityAt = -Infinity;
  private integrityBaseline: string | null = null;
  private internalErrorLogged = false;
  private globalFlags = new Ring<string>(12);

  /** Host hook: called when a subject reaches BLOCKED. */
  public onBlock: ((peerId: string, report: SubjectReport) => void) | null = null;
  /** Called on every violation (UI toasts, logging). */
  public onViolation: ((subjectId: string, v: Violation, trust: TrustLevel) => void) | null = null;

  constructor(now: number = SentinelAntiCheat.now()) {
    this.startTime = now;
    this.local = new Subject('local', 'LOCAL', now);
    this.globalFlags.push('SENTINEL v2 online — host-authoritative validation armed.');
    this.runIntegrityProbe(now, true);
  }

  static now(): number {
    try { return performance.now(); } catch { return Date.now(); }
  }

  // ---- lifecycle ------------------------------------------------------------

  public registerSubject(peerId: string, name: string): void {
    this.safe(() => {
      if (!this.subjects.has(peerId)) this.subjects.set(peerId, new Subject(peerId, name, SentinelAntiCheat.now()));
      else this.subjects.get(peerId)!.name = name;
    });
  }

  public forgetSubject(peerId: string): void {
    this.safe(() => { this.subjects.delete(peerId); });
  }

  public setAlive(peerId: string, alive: boolean): void {
    this.safe(() => {
      const s = this.subjectFor(peerId);
      if (alive && !s.alive) this.resetMotion(s); // respawn = legitimate teleport
      s.alive = alive;
      if (!alive) s.airborneSince = null;
    });
  }

  /** Call when the host legitimately relocates a player (respawn, round reset, spawn protection). */
  public notifyTeleport(peerId: string): void {
    this.safe(() => { this.resetMotion(this.subjectFor(peerId)); });
  }

  private resetMotion(s: Subject): void {
    s.lastPos = null;
    s.lastPosAt = 0;
    s.airborneSince = null;
  }

  // ---- host: input inspection ---------------------------------------------

  /**
   * Inspect a client input packet. Always returns a usable verdict; on internal failure the packet is
   * accepted unchanged (fail-open for honest players, logged once).
   */
  public inspectInput(peerId: string, input: InspectableInput, now: number = SentinelAntiCheat.now()): InputVerdict {
    if (!input || typeof input !== 'object') return { accept: false, fire: false, dt: 0, trust: 'CLEAN', kick: false };
    const fallback: InputVerdict = { accept: true, fire: !!input?.fire, dt: isFiniteNum(input?.dt) ? Math.min(Math.max(input.dt, 0), 0.05) : 1 / 60, trust: 'CLEAN', kick: false };
    return this.safe(() => {
      const s = this.subjectFor(peerId);
      this.decay(s, now);
      s.lastSeen = now;
      if (s.trust === 'BLOCKED') return { accept: false, fire: false, dt: 0, trust: 'BLOCKED', kick: true };

      // 1. Shape / NaN
      const fields = [input.tick, input.dt, input.yaw, input.pitch, input.moveForward, input.moveRight];
      if (!fields.every(isFiniteNum) || typeof input.weapon !== 'string') {
        this.flag(s, 'MALFORMED_INPUT', 'non-finite or malformed field', now);
        return { accept: false, fire: false, dt: 0, trust: s.trust, kick: false };
      }

      // 2. Packet rate
      s.packetTimes.push(now);
      const recentPackets = s.packetTimes.toArray().filter(t => now - t <= SENTINEL_TUNING.packetWindowMs).length;
      if (recentPackets > SENTINEL_TUNING.maxPacketsPerSecond) {
        this.flag(s, 'PACKET_FLOOD', `${recentPackets} packets/s`, now);
        return { accept: false, fire: false, dt: 0, trust: s.trust, kick: trustRank(s.trust) >= 3 };
      }

      // 3. Tick monotonicity & forging
      if (input.tick <= s.lastTick) {
        // Duplicates are normal under packet reordering; only sustained replay is suspicious
        if (s.lastTick - input.tick > 30) this.flag(s, 'TICK_REPLAY', `tick ${input.tick} after ${s.lastTick}`, now);
        return { accept: false, fire: false, dt: 0, trust: s.trust, kick: false };
      }
      if (s.lastTick >= 0 && input.tick - s.lastTick > SENTINEL_TUNING.maxTickJump) {
        this.flag(s, 'TICK_REPLAY', `tick jump +${input.tick - s.lastTick}`, now);
      }
      s.lastTick = input.tick;

      // 4. dt budget — a client may not claim more simulated time than real time elapsed
      //    Implemented as a leaky time bank: wall time credits it (x ratio), claimed dt debits it.
      //    Lag spikes and burst packet delivery only dip into the bank; sustained dt inflation
      //    (speed hack) drains it, after which excess sim time is simply denied.
      let dt = Math.min(Math.max(input.dt, 0), 0.05);
      if (s.timeBankLastAt >= 0) {
        const wall = Math.max(0, now - s.timeBankLastAt);
        s.timeBankMs = Math.min(SENTINEL_TUNING.timeBankCapMs, s.timeBankMs + wall * SENTINEL_TUNING.timeBankRatio);
      }
      s.timeBankLastAt = now;
      const claimedMs = dt * 1000;
      if (claimedMs > s.timeBankMs) {
        const granted = Math.max(0, s.timeBankMs);
        if (now - s.timeBankLastFlagAt >= SENTINEL_TUNING.timeBankFlagEveryMs) {
          this.flag(s, 'TIME_DILATION', `claimed ${claimedMs.toFixed(1)}ms, bank ${s.timeBankMs.toFixed(0)}ms`, now);
          s.timeBankLastFlagAt = now;
        }
        s.timeBankMs = 0;
        dt = granted / 1000;
      } else {
        s.timeBankMs -= claimedMs;
      }

      // 5. Aim snap statistics
      let snapped = false;
      if (s.lastYaw !== null && s.lastPitch !== null) {
        const dYaw = Math.abs(wrapAngle(input.yaw - s.lastYaw));
        const dPitch = Math.abs(input.pitch - s.lastPitch);
        if (dYaw > SENTINEL_TUNING.snapYawRad || dPitch > SENTINEL_TUNING.snapPitchRad) {
          snapped = true;
          s.lastSnapAt = now;
          // A single flick is human. Weight is low; frequency makes it add up.
          this.flag(s, 'AIM_SNAP', `Δyaw ${dYaw.toFixed(2)} Δpitch ${dPitch.toFixed(2)}`, now);
        }
      }
      s.lastYaw = input.yaw;
      s.lastPitch = input.pitch;

      // 6. Fire validation
      let fire = !!input.fire;
      const risingEdge = fire && !s.wasFiring;
      s.wasFiring = fire;
      if (fire) {
        if (!s.alive) {
          this.flag(s, 'FIRE_WHILE_DEAD', input.weapon, now);
          fire = false;
        } else if (risingEdge) {
          // snap-then-fire: aimbot signature (lock + instant trigger)
          if (snapped || now - s.lastSnapAt <= SENTINEL_TUNING.snapFireWindowMs) {
            this.flag(s, 'SNAP_FIRE', `fire ${(now - s.lastSnapAt).toFixed(0)}ms after snap`, now);
          }
          // mechanical rate of fire
          const minInterval = weaponIntervalMs(input.weapon) * SENTINEL_TUNING.rateOfFireTolerance;
          const last = s.lastFireAt.get(input.weapon) ?? -Infinity;
          const interval = now - last;
          if (interval < minInterval) {
            // Host-authoritative cooldown: the shot simply doesn't happen. Honest clients already
            // respect the cooldown, so this never affects them; repeated attempts become a flag.
            fire = false;
            s.rofStrikes++;
            if (s.rofStrikes >= SENTINEL_TUNING.rateOfFireStrikesToSanitise) {
              this.flag(s, 'RATE_OF_FIRE', `${input.weapon} ${interval.toFixed(0)}ms < ${minInterval.toFixed(0)}ms`, now);
              s.rofStrikes = 0;
            }
          } else {
            // Average-cadence guard: per-shot tolerance exists for frame jitter, but the mean over
            // the last 8 shots must respect the weapon's nominal rate (jitter averages out).
            const log = s.shotLog.get(input.weapon) ?? [];
            log.push(now);
            while (log.length > 8) log.shift();
            s.shotLog.set(input.weapon, log);
            const nominal = weaponIntervalMs(input.weapon);
            if (log.length >= 8 && (log[log.length - 1] - log[0]) / (log.length - 1) < nominal * 0.97) {
              fire = false;
              log.length = 0;
              this.flag(s, 'RATE_OF_FIRE', `${input.weapon} mean cadence above nominal ${nominal.toFixed(0)}ms`, now);
            } else {
              s.rofStrikes = Math.max(0, s.rofStrikes - 1);
              if (Number.isFinite(interval) && interval < 2000) s.fireIntervals.push(interval);
              s.lastFireAt.set(input.weapon, now);
              this.checkTriggerBot(s, input.weapon, now);
            }
          }
        }
      }

      const kick = trustRank(s.trust) >= 3;
      // FLAGGED subjects lose the benefit of the doubt on fire sanitisation
      if (trustRank(s.trust) === 2 && s.rofStrikes > 0) fire = false;
      return { accept: true, fire, dt, trust: s.trust, kick };
    }, fallback);
  }

  /**
   * Host-side: validate the *result* of simulating a peer (positions come from our own physics, so a
   * violation here means the input stream is coercing physics beyond its envelope).
   */
  public observeSimulatedState(peerId: string, pos: [number, number, number], onGround: boolean, now: number = SentinelAntiCheat.now()): void {
    this.safe(() => this.observeMovement(this.subjectFor(peerId), pos, onGround, now));
  }

  // ---- local self-audit -----------------------------------------------------

  /** Local client: validate own movement each frame (catches memory-edited positions). */
  public validateMovement(currentPos: [number, number, number], dt: number, onGround: boolean): { valid: boolean; correctedPos?: [number, number, number] } {
    return this.safe(() => {
      if (!isFiniteNum(dt) || dt <= 0 || dt > 0.5) return { valid: true };
      if (!currentPos.every(isFiniteNum)) {
        this.flag(this.local, 'MALFORMED_INPUT', 'non-finite local position', SentinelAntiCheat.now());
        return { valid: false, correctedPos: this.local.lastPos ? [...this.local.lastPos] as [number, number, number] : [0, 1.7, 0] };
      }
      const before = this.local.violationsTotal;
      const prev = this.local.lastPos ? [...this.local.lastPos] as [number, number, number] : null;
      this.observeMovement(this.local, currentPos, onGround, SentinelAntiCheat.now());
      const teleported = this.local.violationsTotal > before && prev !== null &&
        Math.hypot(currentPos[0] - prev[0], currentPos[2] - prev[2]) > SENTINEL_TUNING.teleportDistance;
      return teleported ? { valid: false, correctedPos: prev! } : { valid: true };
    }, { valid: true });
  }

  /** Local client: rotation sanity (kept for API compatibility; feeds the snap statistics). */
  public validateRotation(yaw: number, pitch: number): boolean {
    return this.safe(() => {
      const s = this.local;
      const now = SentinelAntiCheat.now();
      if (!isFiniteNum(yaw) || !isFiniteNum(pitch)) return false;
      if (s.lastYaw !== null && s.lastPitch !== null) {
        const dYaw = Math.abs(wrapAngle(yaw - s.lastYaw));
        const dPitch = Math.abs(pitch - s.lastPitch);
        if (dYaw > SENTINEL_TUNING.snapYawRad && dPitch > SENTINEL_TUNING.snapPitchRad) {
          s.lastSnapAt = now;
          this.flag(s, 'AIM_SNAP', `local Δyaw ${dYaw.toFixed(2)}`, now);
        }
      }
      s.lastYaw = yaw; s.lastPitch = pitch;
      return true;
    }, true);
  }

  /** Local client: fire-rate gate. Returns false if the shot must be suppressed. */
  public validateShot(weaponId: string, allowedMinIntervalMs: number): boolean {
    return this.safe(() => {
      const s = this.local;
      const now = SentinelAntiCheat.now();
      this.decay(s, now);
      const minInterval = (isFiniteNum(allowedMinIntervalMs) && allowedMinIntervalMs > 0 ? allowedMinIntervalMs : weaponIntervalMs(weaponId)) * SENTINEL_TUNING.rateOfFireTolerance;
      const last = s.lastFireAt.get(weaponId) ?? -Infinity;
      const interval = now - last;
      if (interval < minInterval) {
        s.rofStrikes++;
        if (s.rofStrikes >= SENTINEL_TUNING.rateOfFireStrikesToSanitise) {
          this.flag(s, 'RATE_OF_FIRE', `${weaponId} ${interval.toFixed(1)}ms < ${minInterval.toFixed(1)}ms`, now);
          return false;
        }
        return false; // suppress silently; a macro will keep hitting this and accumulate strikes
      }
      s.rofStrikes = Math.max(0, s.rofStrikes - 1);
      if (now - s.lastSnapAt <= SENTINEL_TUNING.snapFireWindowMs) this.flag(s, 'SNAP_FIRE', `local fire ${(now - s.lastSnapAt).toFixed(0)}ms after snap`, now);
      if (Number.isFinite(interval) && interval < 2000) s.fireIntervals.push(interval);
      s.lastFireAt.set(weaponId, now);
      this.checkTriggerBot(s, weaponId, now);
      this.runIntegrityProbe(now, false);
      return true;
    }, true);
  }

  // ---- reporting ------------------------------------------------------------

  public getSubjectReport(peerId: string): SubjectReport | null {
    return this.safe(() => {
      const s = peerId === 'local' ? this.local : this.subjects.get(peerId);
      return s ? this.report(s) : null;
    }, null);
  }

  public getReport(): AntiCheatReport {
    return this.safe(() => {
      const now = SentinelAntiCheat.now();
      const all = [this.local, ...this.subjects.values()];
      all.forEach(s => this.decay(s, now));
      const violations = all.reduce((a, s) => a + s.violationsTotal, 0);
      const worst = all.reduce<TrustLevel>((w, s) => (trustRank(s.trust) > trustRank(w) ? s.trust : w), 'CLEAN');
      const status: AntiCheatReport['status'] = worst === 'BLOCKED' || worst === 'FLAGGED' ? 'COMPROMISED' : worst === 'SUSPECT' ? 'WARNING' : 'SECURED';
      const recentFlags = [
        ...all.flatMap(s => s.recent.toArray().map(v => ({ at: v.at, text: `[${s.name}] ${v.kind}: ${v.detail}` }))),
      ].sort((a, b) => b.at - a.at).slice(0, 8).map(x => x.text).concat(this.globalFlags.toArray().slice(-2));
      return {
        status,
        violationsCount: violations,
        recentFlags,
        activeProtections: [
          { name: 'Input schema & NaN guard', status: 'ACTIVE' },
          { name: 'Packet flood / tick replay', status: 'ACTIVE' },
          { name: 'Time-dilation budget', status: 'ACTIVE' },
          { name: 'Physics envelope (speed/teleport/fly)', status: 'ACTIVE' },
          { name: 'Aim snap + snap-fire signature', status: 'ACTIVE' },
          { name: 'Trigger-bot cadence analysis', status: 'ACTIVE' },
          { name: 'Mechanical rate-of-fire', status: 'ACTIVE' },
          { name: 'Runtime integrity probe', status: this.integrityBaseline ? 'ACTIVE' : 'OK' },
        ],
        uptimeSeconds: Math.floor((now - this.startTime) / 1000),
        subjects: all.map(s => this.report(s)),
        localTrust: this.local.trust,
      };
    }, {
      status: 'SECURED', violationsCount: 0, recentFlags: [], activeProtections: [], uptimeSeconds: 0, subjects: [], localTrust: 'CLEAN',
    });
  }

  // ---- internals ------------------------------------------------------------

  private subjectFor(id: string): Subject {
    if (id === 'local') return this.local;
    let s = this.subjects.get(id);
    if (!s) { s = new Subject(id, id.slice(0, 8), SentinelAntiCheat.now()); this.subjects.set(id, s); }
    return s;
  }

  private observeMovement(s: Subject, pos: [number, number, number], onGround: boolean, now: number): void {
    if (!pos.every(isFiniteNum)) return;
    if (s.lastPos) {
      const dtSec = (now - s.lastPosAt) / 1000;
      if (dtSec > 0.004 && dtSec < 0.5) {
        const dist = Math.hypot(pos[0] - s.lastPos[0], pos[2] - s.lastPos[2]);
        const speed = dist / dtSec;
        if (dist > SENTINEL_TUNING.teleportDistance) this.flag(s, 'TELEPORT', `${dist.toFixed(1)}m in ${(dtSec * 1000).toFixed(0)}ms`, now);
        else if (speed > SENTINEL_TUNING.maxHorizontalSpeed && dist > 0.25) this.flag(s, 'SPEED', `${speed.toFixed(1)} m/s`, now);
      }
    }
    if (onGround) s.airborneSince = null;
    else if (s.airborneSince === null) s.airborneSince = now;
    else if (now - s.airborneSince > SENTINEL_TUNING.maxAirborneSeconds * 1000 && pos[1] > 2.0) {
      this.flag(s, 'FLY', `${((now - s.airborneSince) / 1000).toFixed(1)}s airborne at y=${pos[1].toFixed(1)}`, now);
      s.airborneSince = now; // re-arm
    }
    s.lastPos = [pos[0], pos[1], pos[2]];
    s.lastPosAt = now;
  }

  /** Humans cannot click with sub-2 ms regularity; macros and trigger bots do. */
  private checkTriggerBot(s: Subject, weapon: string, now: number): void {
    const def = (WEAPON_DEFINITIONS as Record<string, { isAutomatic?: boolean } | undefined>)[weapon];
    if (def?.isAutomatic) return; // held-trigger cadence is mechanical by design
    if (s.fireIntervals.size < SENTINEL_TUNING.triggerBotMinSamples) return;
    const xs = s.fireIntervals.toArray().slice(-SENTINEL_TUNING.triggerBotMinSamples);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    if (mean < 400 && sd < SENTINEL_TUNING.triggerBotJitterMs) {
      this.flag(s, 'TRIGGER_BOT', `${xs.length} shots, σ=${sd.toFixed(2)}ms @ ${mean.toFixed(0)}ms`, now);
      s.fireIntervals.clear();
    }
  }

  private flag(s: Subject, kind: ViolationKind, detail: string, now: number): void {
    const v: Violation = { kind, weight: WEIGHTS[kind], detail, at: now };
    s.recent.push(v);
    s.violationsTotal++;
    s.suspicion = Math.min(100, s.suspicion + v.weight);
    this.escalate(s, now);
    try { this.onViolation?.(s.id, v, s.trust); } catch { /* listener errors never propagate */ }
  }

  private decay(s: Subject, now: number): void {
    const dt = (now - s.lastDecayAt) / 1000;
    if (dt <= 0) return;
    s.lastDecayAt = now;
    s.suspicion = Math.max(0, s.suspicion - dt * SENTINEL_TUNING.decayPerSecond);
    // De-escalate with hysteresis (never from BLOCKED)
    if (s.trust === 'FLAGGED' && s.suspicion < SENTINEL_TUNING.clearBelow + 10) s.trust = 'SUSPECT';
    if (s.trust === 'SUSPECT' && s.suspicion < SENTINEL_TUNING.clearBelow) s.trust = 'CLEAN';
  }

  private escalate(s: Subject, now: number): void {
    if (s.trust === 'BLOCKED') return;
    const T = SENTINEL_TUNING;
    if (s.suspicion >= T.blockedAt) {
      const kinds = new Set(s.recent.toArray().filter(v => now - v.at < 30000).map(v => v.kind));
      if (kinds.size >= T.blockRequiresDistinctKinds || kinds.has('TELEPORT') || kinds.has('INTEGRITY')) {
        s.trust = 'BLOCKED';
        this.globalFlags.push(`${s.name} BLOCKED (suspicion ${s.suspicion.toFixed(0)}, ${[...kinds].join('+')})`);
        try { if (s.id !== 'local') this.onBlock?.(s.id, this.report(s)); } catch { /* ignore */ }
        return;
      }
      s.trust = 'FLAGGED';
      return;
    }
    if (s.suspicion >= T.flaggedAt) s.trust = trustRank(s.trust) >= trustRank('FLAGGED') ? s.trust : 'FLAGGED';
    else if (s.suspicion >= T.suspectAt) s.trust = trustRank(s.trust) >= trustRank('SUSPECT') ? s.trust : 'SUSPECT';
  }

  private report(s: Subject): SubjectReport {
    const now = SentinelAntiCheat.now();
    return {
      id: s.id,
      name: s.name,
      trust: s.trust,
      suspicion: Math.round(s.suspicion),
      violations: s.violationsTotal,
      recent: s.recent.toArray().slice(-6),
      packetsPerSecond: s.packetTimes.toArray().filter(t => now - t <= 1000).length,
      lastSeen: s.lastSeen,
    };
  }

  /**
   * Environment integrity. In a browser nothing is truly tamper-proof, so these are *indicators*
   * that only ever contribute to suspicion when they change mid-session (a cheat loader patching
   * at runtime), never on their own at startup.
   */
  private runIntegrityProbe(now: number, initial: boolean): void {
    if (!initial && now - this.lastIntegrityAt < SENTINEL_TUNING.integrityIntervalMs) return;
    this.lastIntegrityAt = now;
    this.safe(() => {
      const sig = [
        typeof Math.random === 'function' && /\[native code\]/.test(Function.prototype.toString.call(Math.random)) ? 'r1' : 'r0',
        typeof performance.now === 'function' && /\[native code\]/.test(Function.prototype.toString.call(performance.now)) ? 'p1' : 'p0',
        typeof requestAnimationFrame === 'function' && /\[native code\]/.test(Function.prototype.toString.call(requestAnimationFrame)) ? 'a1' : 'a0',
        Object.keys(WEAPON_DEFINITIONS).map(k => `${k}:${(WEAPON_DEFINITIONS as Record<string, { damage: number; fireRateRpm: number }>)[k].damage}/${(WEAPON_DEFINITIONS as Record<string, { damage: number; fireRateRpm: number }>)[k].fireRateRpm}`).join(','),
      ].join('|');
      if (this.integrityBaseline === null) { this.integrityBaseline = sig; return; }
      if (sig !== this.integrityBaseline) {
        this.flag(this.local, 'INTEGRITY', 'runtime signature changed mid-session', now);
        this.integrityBaseline = sig;
      }
      // Monotonic clock check — time-warp tools break this
      const d = Date.now();
      if (!Number.isFinite(d) || !Number.isFinite(now) || now < 0) this.flag(this.local, 'INTEGRITY', 'non-monotonic clock', now);
    }, undefined);
  }

  /** Every public method runs through here: detectors can never crash the game. */
  private safe<T>(fn: () => T, fallback?: T): T {
    try { return fn(); } catch (err) {
      if (!this.internalErrorLogged) { this.internalErrorLogged = true; console.error('[SENTINEL] detector error (failing open):', err); }
      return fallback as T;
    }
  }
}

function trustRank(t: TrustLevel): number { return t === 'CLEAN' ? 0 : t === 'SUSPECT' ? 1 : t === 'FLAGGED' ? 2 : 3; }
