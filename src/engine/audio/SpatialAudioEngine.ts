/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private occlusionFilter: BiquadFilterNode | null = null;
  private listenerPos: [number, number, number] = [0, 0, 0];
  private initialized: boolean = false;

  constructor() {}

  public init(): void {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

      this.occlusionFilter = this.ctx.createBiquadFilter();
      this.occlusionFilter.type = 'lowpass';
      this.occlusionFilter.frequency.setValueAtTime(22000, this.ctx.currentTime);

      this.sfxGain.connect(this.occlusionFilter);
      this.occlusionFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;
    } catch {
      // AudioContext unavailable
    }
  }

  public updateListener(
    pos: [number, number, number],
    forward: [number, number, number],
    up: [number, number, number] = [0, 1, 0]
  ): void {
    this.listenerPos = pos;
    if (!this.ctx || !this.initialized) return;

    const listener = this.ctx.listener;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(pos[0], this.ctx.currentTime);
      listener.positionY.setValueAtTime(pos[1], this.ctx.currentTime);
      listener.positionZ.setValueAtTime(pos[2], this.ctx.currentTime);
      listener.forwardX.setValueAtTime(forward[0], this.ctx.currentTime);
      listener.forwardY.setValueAtTime(forward[1], this.ctx.currentTime);
      listener.forwardZ.setValueAtTime(forward[2], this.ctx.currentTime);
      listener.upX.setValueAtTime(up[0], this.ctx.currentTime);
      listener.upY.setValueAtTime(up[1], this.ctx.currentTime);
      listener.upZ.setValueAtTime(up[2], this.ctx.currentTime);
    } else {
      (listener as any).setPosition(pos[0], pos[1], pos[2]);
      (listener as any).setOrientation(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
    }
  }

  private createPanner(sourcePos: [number, number, number], isOccluded: boolean = false): PannerNode | null {
    if (!this.ctx || !this.initialized) return null;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3.0;
    panner.maxDistance = 150;
    panner.rolloffFactor = 1.1;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(sourcePos[0], this.ctx.currentTime);
      panner.positionY.setValueAtTime(sourcePos[1], this.ctx.currentTime);
      panner.positionZ.setValueAtTime(sourcePos[2], this.ctx.currentTime);
    } else {
      (panner as any).setPosition(sourcePos[0], sourcePos[1], sourcePos[2]);
    }

    return panner;
  }

  /**
   * Real AK-47 7.62x39mm Gunpowder Detonation
   * Sharp supersonic mechanical snap, intense powder explosion crack, deep chest thump, and outdoor echo
   */
  public playAssaultRifle(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    // 1. Supersonic Bullet Crack (high frequency explosive impulse)
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.createGunpowderBuffer(0.045, 0.95);
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1200, t);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(1.2, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.045);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(dest);
    crack.start(t);

    // 2. Heavy 7.62mm Powder Detonation Body (Dense Mid-Punch)
    const bodyNoise = this.ctx.createBufferSource();
    bodyNoise.buffer = this.createGunpowderBuffer(0.18, 0.7);
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(800, t);
    bodyFilter.frequency.exponentialRampToValueAtTime(250, t + 0.16);
    bodyFilter.Q.setValueAtTime(2.0, t);
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.setValueAtTime(1.0, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    bodyNoise.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(dest);
    bodyNoise.start(t);

    // 3. Deep Sub-Bass Detonation Thump (Chest Punch)
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.14);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(t);
    sub.stop(t + 0.16);

    // 4. Outdoor Landscape Echo Tail
    const echoNoise = this.ctx.createBufferSource();
    echoNoise.buffer = this.createGunpowderBuffer(0.45, 0.3);
    const echoFilter = this.ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(600, t);
    const echoGain = this.ctx.createGain();
    echoGain.gain.setValueAtTime(0.35, t + 0.05);
    echoGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    echoNoise.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(dest);
    echoNoise.start(t + 0.02);
  }

  /**
   * Real AWP .338 Lapua Magnum Thunderclap Blast
   * Massive roaring gunshot heard across the entire desert map
   */
  public playPlasmaRailgun(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    // 1. Deafening Initial Muzzle Crack
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.createGunpowderBuffer(0.06, 1.0);
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(900, t);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(1.6, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(dest);
    crack.start(t);

    // 2. Earth-Shaking Sub Thunder Blast
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.38);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(t);
    sub.stop(t + 0.42);

    // 3. Huge Rolling Outdoor Desert Echo Tail (1.2 seconds)
    const tailNoise = this.ctx.createBufferSource();
    tailNoise.buffer = this.createGunpowderBuffer(1.2, 0.4);
    const tailFilter = this.ctx.createBiquadFilter();
    tailFilter.type = 'lowpass';
    tailFilter.frequency.setValueAtTime(800, t);
    tailFilter.frequency.exponentialRampToValueAtTime(150, t + 1.2);
    const tailGain = this.ctx.createGain();
    tailGain.gain.setValueAtTime(0.65, t + 0.04);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    tailNoise.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(dest);
    tailNoise.start(t + 0.03);
  }

  /**
   * Real M4A4 5.56x45mm NATO Rapid Combat Fire
   * Crisp, tight, snappy metallic rifle crack
   */
  public playShotgun(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    // Sharp 5.56mm Crack
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.createGunpowderBuffer(0.04, 0.9);
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1400, t);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(1.1, t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(dest);
    crack.start(t);

    // Mid punch
    const sub = this.ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(170, t);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(t);
    sub.stop(t + 0.14);
  }

  /**
   * Roblox Rivals & Krunker Rapid SMG Fire (high frequency chatter)
   */
  public playSMG(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    const crack = this.ctx.createBufferSource();
    crack.buffer = this.createGunpowderBuffer(0.028, 0.88);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
    crack.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    crack.start(t);
  }

  /**
   * Six-Shooter Marksman Revolver Heavy Hammer Snap
   */
  public playRevolver(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    const crack = this.ctx.createBufferSource();
    crack.buffer = this.createGunpowderBuffer(0.06, 0.95);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    crack.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    crack.start(t);
  }

  /**
   * Bowman Crossbow Twang & Arrow Release
   */
  public playCrossbow(pos?: [number, number, number]): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Cyber Katana Aerodynamic Blade Swing
   */
  public playMeleeSwing(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Roblox Rivals & Krunker.io Ground Slide Swoosh
   */
  public playSlide(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createGunpowderBuffer(0.35, 0.45);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(t);
  }

  /**
   * Signature Slide Cancel Pop / High Momentum Leap
   */
  public playSlideCancel(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.09);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Snappy Weapon Equip Cocking Bolt Sound
   */
  public playWeaponSwitch(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.setValueAtTime(1250, t + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Krunker.io Pop / Kill Medal Audio Chime
   */
  public playKillMedal(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.25, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.18);
    });
  }

  /**
   * CS2 Iconic Headshot "DINK" & Kill Chime
   */
  public playHitmarker(isHeadshot: boolean = false, isShieldBreak: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // Iconic CS2 Helmet "DINK!" (crisp metallic strike ~2400Hz)
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.setValueAtTime(1800, t + 0.03);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      // Flesh bullet impact hit chime (~1100Hz)
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  /**
   * Level Up / Rank Promotion Fanfare
   */
  public playLevelUp(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playFootstep(): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Real combat boot thud on sand / concrete
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playExplosion(pos: [number, number, number]): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos);

    const sub = this.ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(18, t + 0.85);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(1.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(t);
    sub.stop(t + 0.9);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createGunpowderBuffer(0.8, 0.85);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.8);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(t);
  }

  /**
   * .50 AE Hand Cannon — sharp, high-pitched crack with a hard metallic slide clack.
   */
  public playPistol(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    this.burst(dest, t, 0.035, 0.98, 'highpass', 2200, 1.3, 0.035);
    this.burst(dest, t, 0.12, 0.75, 'bandpass', 1100, 0.9, 0.12, 3.0, 380);
    this.tone(dest, t, 'sine', 210, 45, 1.0, 0.1);
    // slide cycling clack
    this.tone(dest, t + 0.055, 'square', 1800, 900, 0.12, 0.03);
    this.burst(dest, t + 0.06, 0.25, 0.3, 'lowpass', 700, 0.25, 0.25);
  }

  /**
   * RPG launch — ignition pop, rocket motor whoosh with doppler-ish pitch slide.
   */
  public playRPGLaunch(pos?: [number, number, number], isOccluded: boolean = false): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDestination(pos, isOccluded);

    this.burst(dest, t, 0.08, 0.9, 'lowpass', 1800, 1.1, 0.08);
    this.tone(dest, t, 'triangle', 120, 30, 1.2, 0.25);
    // motor whoosh
    const whoosh = this.ctx.createBufferSource();
    whoosh.buffer = this.createGunpowderBuffer(0.9, 0.55);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.setValueAtTime(1.2, t);
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    whoosh.connect(f); f.connect(g); g.connect(dest);
    whoosh.start(t);
  }

  // ---------------------------------------------------------------------------
  // Reload foley — every weapon has its own stage set (driven by WeaponSystem.onReloadStage)
  // ---------------------------------------------------------------------------
  public playReloadStage(weapon: string, stage: string): void {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const d = this.sfxGain!;
    const key = `${weapon}:${stage}`;

    switch (key) {
      // --- Assault rifle: heavy steel mag, loud charging handle ---
      case 'rifle:magOut': this.click(d, t, 520, 0.05, 0.5); this.burst(d, t + 0.01, 0.12, 0.5, 'lowpass', 900, 0.4, 0.12); break;
      case 'rifle:magIn': this.click(d, t, 380, 0.04, 0.6); this.click(d, t + 0.05, 260, 0.08, 0.9); this.tone(d, t + 0.05, 'sine', 140, 60, 0.5, 0.1); break;
      case 'rifle:bolt': this.slideNoise(d, t, 0.09, 1600, 0.6); this.click(d, t + 0.1, 700, 0.05, 0.9); this.click(d, t + 0.11, 300, 0.07, 0.7); break;

      // --- SMG: lighter polymer mag, quick snappy bolt ---
      case 'smg:magOut': this.click(d, t, 900, 0.03, 0.4); this.burst(d, t, 0.08, 0.6, 'bandpass', 1400, 0.3, 0.08); break;
      case 'smg:magIn': this.click(d, t, 1100, 0.025, 0.5); this.click(d, t + 0.03, 600, 0.05, 0.7); break;
      case 'smg:bolt': this.slideNoise(d, t, 0.05, 2400, 0.5); this.click(d, t + 0.05, 1500, 0.03, 0.8); break;

      // --- Pistol: slide lock, mag, slide release ---
      case 'pistol:slideLock': this.slideNoise(d, t, 0.06, 2000, 0.5); this.click(d, t + 0.06, 1900, 0.03, 0.7); break;
      case 'pistol:magOut': this.click(d, t, 1300, 0.03, 0.5); this.burst(d, t + 0.01, 0.07, 0.5, 'highpass', 900, 0.25, 0.07); break;
      case 'pistol:magIn': this.click(d, t, 800, 0.03, 0.6); this.click(d, t + 0.04, 450, 0.06, 0.8); break;
      case 'pistol:slideRelease': this.click(d, t, 2200, 0.02, 0.9); this.click(d, t + 0.015, 900, 0.05, 0.9); this.tone(d, t, 'sine', 200, 90, 0.3, 0.06); break;

      // --- Shotgun: shell into tube, pump rack ---
      case 'shotgun:shell0': case 'shotgun:shell1': case 'shotgun:shell2': case 'shotgun:shell3':
        this.click(d, t, 1000, 0.03, 0.45); this.click(d, t + 0.03, 420, 0.07, 0.7); this.burst(d, t, 0.06, 0.4, 'bandpass', 2400, 0.2, 0.06, 2.0); break;
      case 'shotgun:pump': this.slideNoise(d, t, 0.1, 1200, 0.8); this.click(d, t + 0.1, 500, 0.06, 1.0); this.slideNoise(d, t + 0.17, 0.08, 1200, 0.7); this.click(d, t + 0.25, 420, 0.07, 1.0); break;

      // --- Sniper: bolt-action ---
      case 'railgun:boltOpen': this.click(d, t, 1600, 0.03, 0.8); this.slideNoise(d, t + 0.03, 0.12, 1500, 0.7); this.click(d, t + 0.15, 700, 0.05, 0.6); break;
      case 'railgun:magOut': this.click(d, t, 600, 0.05, 0.6); this.burst(d, t, 0.1, 0.5, 'lowpass', 800, 0.3, 0.1); break;
      case 'railgun:magIn': this.click(d, t, 500, 0.04, 0.7); this.click(d, t + 0.05, 300, 0.08, 0.9); break;
      case 'railgun:boltClose': this.slideNoise(d, t, 0.12, 1500, 0.7); this.click(d, t + 0.12, 900, 0.04, 1.0); this.click(d, t + 0.16, 400, 0.08, 0.9); break;

      // --- Revolver ---
      case 'revolver:cylOpen': this.click(d, t, 2400, 0.02, 0.7); this.click(d, t + 0.03, 1200, 0.05, 0.6); break;
      case 'revolver:eject': for (let i = 0; i < 6; i++) this.click(d, t + i * 0.035, 3200 + Math.random() * 1500, 0.04, 0.35); break;
      case 'revolver:loader': this.click(d, t, 1500, 0.03, 0.5); this.click(d, t + 0.05, 900, 0.05, 0.6); this.click(d, t + 0.12, 2000, 0.02, 0.4); break;
      case 'revolver:cylClose': this.click(d, t, 1800, 0.02, 0.9); this.click(d, t + 0.02, 650, 0.06, 1.0); this.tone(d, t, 'sine', 240, 110, 0.25, 0.06); break;

      // --- RPG ---
      case 'rpg:unlatch': this.click(d, t, 400, 0.08, 0.9); this.burst(d, t + 0.02, 0.15, 0.4, 'lowpass', 600, 0.4, 0.15); break;
      case 'rpg:slideIn': this.slideNoise(d, t, 0.35, 700, 0.8); break;
      case 'rpg:latch': this.click(d, t, 350, 0.1, 1.0); this.click(d, t + 0.09, 1400, 0.03, 0.6); break;

      // --- Crossbow ---
      case 'crossbow:draw': this.creak(d, t, 0.45); break;
      case 'crossbow:latch': this.click(d, t, 2600, 0.02, 0.6); this.click(d, t + 0.02, 1100, 0.05, 0.7); break;
      case 'crossbow:boltIn': this.slideNoise(d, t, 0.08, 3000, 0.4); this.click(d, t + 0.08, 1800, 0.03, 0.5); break;

      // --- Melee ---
      case 'melee:flourish': this.playMeleeSwing(); break;
    }
  }

  // --- tiny synth helpers -----------------------------------------------------
  private burst(dest: AudioNode, t: number, dur: number, rough: number, type: BiquadFilterType, freq: number, gain: number, decay: number, q: number = 1, endFreq?: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.createGunpowderBuffer(dur, rough);
    const f = this.ctx!.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + decay);
    f.Q.setValueAtTime(q, t);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t);
  }

  private tone(dest: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, gain: number, dur: number): void {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.01);
  }

  /** Short metallic impact: resonant band-passed noise + a pitched ping. */
  private click(dest: AudioNode, t: number, freq: number, dur: number, gain: number): void {
    this.burst(dest, t, dur, 0.9, 'bandpass', freq, gain, dur, 6);
    this.tone(dest, t, 'triangle', freq * 1.5, freq * 0.6, gain * 0.25, dur * 1.5);
  }

  /** Steel-on-steel sliding scrape. */
  private slideNoise(dest: AudioNode, t: number, dur: number, freq: number, gain: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.createGunpowderBuffer(dur, 0.7);
    const f = this.ctx!.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.setValueAtTime(2.5, t);
    f.frequency.setValueAtTime(freq * 0.7, t);
    f.frequency.linearRampToValueAtTime(freq * 1.3, t + dur);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.5, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t);
  }

  /** Bowstring / wood creak: slow, wobbling sawtooth under tension. */
  private creak(dest: AudioNode, t: number, dur: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(260, t + dur);
    const lfo = this.ctx!.createOscillator();
    lfo.frequency.setValueAtTime(28, t);
    const lfoG = this.ctx!.createGain();
    lfoG.gain.setValueAtTime(40, t);
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    const f = this.ctx!.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1200, t);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }

  private getDestination(pos?: [number, number, number], isOccluded: boolean = false): AudioNode {
    if (!this.ctx) return this.sfxGain!;
    let currentDest: AudioNode = this.sfxGain!;

    if (isOccluded) {
      const occlude = this.ctx.createBiquadFilter();
      occlude.type = 'lowpass';
      occlude.frequency.setValueAtTime(600, this.ctx.currentTime);
      occlude.connect(this.sfxGain!);
      currentDest = occlude;
    }

    if (pos) {
      const panner = this.createPanner(pos, isOccluded);
      if (panner) {
        panner.connect(currentDest);
        return panner;
      }
    }

    return currentDest;
  }

  private createGunpowderBuffer(durationSeconds: number, roughness: number = 0.8): AudioBuffer {
    const sampleRate = this.ctx?.sampleRate || 44100;
    const frameCount = sampleRate * durationSeconds;
    const buffer = this.ctx!.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);

    let lastVal = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      // Pink / brown filtered acoustic noise
      lastVal = (lastVal * (1 - roughness)) + (white * roughness);
      channel[i] = lastVal;
    }
    return buffer;
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }
}
