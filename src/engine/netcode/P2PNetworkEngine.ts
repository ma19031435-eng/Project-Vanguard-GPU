/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, DataConnection, PeerJSOption } from 'peerjs';
import { WeaponType } from '../weapons/WeaponSystem.ts';

export interface PlayerNetState {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  position: [number, number, number];
  rotationY: number;
  pitch: number;
  health: number;
  armor: number;
  kills: number;
  deaths: number;
  ping: number;
  currentWeapon: WeaponType;
  isFiring: boolean;
  isCrouching: boolean;
  lastAcknowledgedTick: number;
}

export interface PlayerInputPacket {
  tick: number;
  sequence: number;
  moveForward: number; // -1 to 1
  moveRight: number; // -1 to 1
  jump: boolean;
  crouch: boolean;
  pitch: number;
  yaw: number;
  fire: boolean;
  weapon: WeaponType;
  dt: number;
}

export interface WorldSnapshotPacket {
  tick: number;
  timestamp: number;
  players: PlayerNetState[];
  events: {
    type: 'hit' | 'kill' | 'destroy' | 'spawn';
    attackerId?: string;
    victimId?: string;
    weapon?: WeaponType;
    isHeadshot?: boolean;
    damage?: number;
    objectId?: string;
  }[];
}

export type NetworkStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface NetworkEvent {
  level: 'info' | 'warn' | 'error';
  text: string;
}

/** Server-side record for a remote (non-host) participant. */
export interface RemotePlayerRecord {
  state: PlayerNetState;
  lastInputTick: number;
  lastInputAt: number;
  velocity: [number, number, number];
  onGround: boolean;
}

const ROOM_PREFIX = 'vanguard-';
const ROOM_CODE_RE = /^[a-z0-9-]{4,40}$/i;

function generateRoomCode(): string {
  return ROOM_PREFIX + Math.random().toString(36).substring(2, 8);
}

export function resolvePeerOptions(): PeerJSOption {
  // Official server (Railway) exposes PeerJS signaling on /peerjs, same origin in production.
  const explicit = (import.meta as any).env?.VITE_OFFICIAL_SERVER as string | undefined;
  if (explicit) {
    try {
      const u = new URL(explicit);
      return {
        host: u.hostname,
        port: Number(u.port) || (u.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        secure: u.protocol === 'https:',
        debug: 0
      };
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined' && (import.meta as any).env?.PROD) {
    const loc = window.location;
    return {
      host: loc.hostname,
      port: Number(loc.port) || (loc.protocol === 'https:' ? 443 : 80),
      path: '/peerjs',
      secure: loc.protocol === 'https:',
      debug: 0
    };
  }
  return { debug: 0 };
}

export class P2PNetworkEngine {
  public peer: Peer | null = null;
  public localPeerId: string = '';
  public hostPeerId: string = '';
  public isHost: boolean = true;
  public isConnected: boolean = false;
  public status: NetworkStatus = 'idle';

  // Active PeerJS data connections
  private connections: Map<string, DataConnection> = new Map();
  private pingTimer: number | null = null;

  // Network metrics
  public currentPing: number = 0;
  public packetLossRate: number = 0;
  private pingsSent: Map<number, number> = new Map();
  private pingSequence: number = 0;

  // Client-Side Prediction (CSP) & Reconciliation Ring Buffer
  public inputBuffer: PlayerInputPacket[] = [];
  public currentTick: number = 0;
  public lastServerTick: number = 0;
  private inputSequence: number = 0;

  // Host-authoritative remote participants
  public remotePlayers: Map<string, RemotePlayerRecord> = new Map();

  // Entity Interpolation Snapshots
  public remoteSnapshots: { timestamp: number; players: PlayerNetState[] }[] = [];
  public interpolatedPlayers: Map<string, PlayerNetState> = new Map();

  // Callbacks
  public onSnapshotReceived?: (snapshot: WorldSnapshotPacket) => void;
  public onPlayerJoined?: (playerId: string, name: string) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onChatMessage?: (sender: string, text: string) => void;
  public onStatusChange?: (status: NetworkStatus, event: NetworkEvent) => void;
  /** Host-only: authoritative movement step supplied by the game (physics lives outside netcode). */
  public simulateRemoteInput?: (record: RemotePlayerRecord, input: PlayerInputPacket) => void;

  constructor() {
    this.localPeerId = ROOM_PREFIX + Math.random().toString(36).substring(2, 8);
  }

  private setStatus(status: NetworkStatus, event: NetworkEvent): void {
    this.status = status;
    this.isConnected = status === 'connected';
    this.onStatusChange?.(status, event);
  }

  /** Tears down any live peer/connections so a new room can be hosted or joined cleanly. */
  private teardownPeer(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.connections.forEach(c => {
      try { c.close(); } catch { /* ignore */ }
    });
    this.connections.clear();
    this.pingsSent.clear();
    this.remotePlayers.clear();
    this.remoteSnapshots = [];
    this.interpolatedPlayers.clear();
    this.inputBuffer = [];
    if (this.peer) {
      const old = this.peer;
      this.peer = null;
      try { old.destroy(); } catch { /* ignore */ }
    }
    this.isConnected = false;
  }

  /**
   * Initializes host listen server
   */
  public async hostRoom(roomId?: string, attempt: number = 0): Promise<string> {
    this.teardownPeer();
    const finalRoomId = roomId || generateRoomCode();
    this.isHost = true;
    this.hostPeerId = finalRoomId;
    this.localPeerId = finalRoomId;
    this.setStatus('connecting', { level: 'info', text: `Opening room ${finalRoomId}…` });

    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        const peer = new Peer(finalRoomId, resolvePeerOptions());
        this.peer = peer;

        peer.on('open', (id) => {
          if (this.peer !== peer) return;
          this.localPeerId = id;
          this.hostPeerId = id;
          this.setupHostListeners(peer);
          this.setStatus('connected', { level: 'info', text: `Room ${id} is live. Share the code to invite friends.` });
          settled = true;
          resolve(id);
        });

        peer.on('disconnected', () => {
          if (this.peer !== peer) return;
          this.setStatus('disconnected', { level: 'warn', text: 'Signaling connection lost. Attempting to reconnect…' });
          try { peer.reconnect(); } catch { /* ignore */ }
        });

        peer.on('error', (err: any) => {
          if (this.peer !== peer) return;
          if (err?.type === 'unavailable-id' && attempt < 3) {
            this.hostRoom(generateRoomCode(), attempt + 1).then(resolve).catch(reject);
            return;
          }
          this.setStatus('error', { level: 'error', text: `Host error: ${err?.type || err?.message || 'unknown'}` });
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      } catch (err) {
        this.setStatus('error', { level: 'error', text: 'Failed to initialize host peer.' });
        reject(err);
      }
    });
  }

  /**
   * Joins an existing host peer room
   */
  public async joinRoom(targetHostId: string): Promise<boolean> {
    const code = (targetHostId || '').trim();
    if (!code) {
      this.setStatus('error', { level: 'error', text: 'Enter a room code before joining.' });
      return false;
    }
    if (!ROOM_CODE_RE.test(code)) {
      this.setStatus('error', { level: 'error', text: 'Room code format is invalid.' });
      return false;
    }

    this.teardownPeer();
    this.isHost = false;
    this.hostPeerId = code;
    this.setStatus('connecting', { level: 'info', text: `Connecting to ${code}…` });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const timeout = window.setTimeout(() => {
        if (!settled) {
          this.setStatus('error', { level: 'error', text: 'Join timed out. Check the code and NAT/firewall settings.' });
          finish(false);
        }
      }, 12000);

      try {
        const peer = new Peer(resolvePeerOptions());
        this.peer = peer;

        peer.on('open', (id) => {
          if (this.peer !== peer) return;
          this.localPeerId = id;

          // Ordered-reliable channel keeps join handshakes deterministic; snapshots stay small.
          const conn = peer.connect(code, { reliable: true, serialization: 'json' });
          this.setupClientConnection(conn, () => {
            window.clearTimeout(timeout);
            finish(true);
          }, () => {
            window.clearTimeout(timeout);
            finish(false);
          });
        });

        peer.on('disconnected', () => {
          if (this.peer !== peer) return;
          this.setStatus('disconnected', { level: 'warn', text: 'Signaling connection lost.' });
        });

        peer.on('error', (err: any) => {
          if (this.peer !== peer) return;
          const type = err?.type || 'unknown';
          const text = type === 'peer-unavailable'
            ? `Room ${code} was not found. Ask the host for a fresh code.`
            : `Join failed: ${type}`;
          this.setStatus('error', { level: 'error', text });
          window.clearTimeout(timeout);
          finish(false);
        });
      } catch (err) {
        this.setStatus('error', { level: 'error', text: 'Failed to initialize client peer.' });
        window.clearTimeout(timeout);
        finish(false);
      }
    });
  }

  private setupHostListeners(peer: Peer): void {
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        const name = 'Agent_' + conn.peer.substring(conn.peer.length - 4).toUpperCase();
        this.remotePlayers.set(conn.peer, {
          state: {
            id: conn.peer,
            name,
            isHost: false,
            isBot: false,
            position: [(Math.random() - 0.5) * 20, 0, 30],
            rotationY: 0,
            pitch: 0,
            health: 100,
            armor: 100,
            kills: 0,
            deaths: 0,
            ping: 0,
            currentWeapon: 'rifle',
            isFiring: false,
            isCrouching: false,
            lastAcknowledgedTick: 0
          },
          lastInputTick: 0,
          lastInputAt: performance.now(),
          velocity: [0, 0, 0],
          onGround: true
        });
        this.onPlayerJoined?.(conn.peer, name);
        this.onStatusChange?.(this.status, { level: 'info', text: `${name} joined the room.` });

        conn.send({ type: 'welcome', assignedId: conn.peer, serverTick: this.currentTick });
      });

      conn.on('data', (data: any) => {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'input') {
          this.handleClientInput(conn.peer, data.input);
        } else if (data.type === 'hello') {
          const rec = this.remotePlayers.get(conn.peer);
          if (rec && typeof data.name === 'string') {
            rec.state.name = data.name.slice(0, 24) || rec.state.name;
          }
        } else if (data.type === 'ping') {
          conn.send({ type: 'pong', seq: data.seq });
        } else if (data.type === 'chat') {
          if (typeof data.text === 'string' && typeof data.sender === 'string') {
            this.broadcastChatMessage(data.sender.slice(0, 24), data.text.slice(0, 240));
          }
        }
      });

      const drop = () => {
        const rec = this.remotePlayers.get(conn.peer);
        this.connections.delete(conn.peer);
        this.remotePlayers.delete(conn.peer);
        this.onPlayerLeft?.(conn.peer);
        this.onStatusChange?.(this.status, { level: 'warn', text: `${rec?.state.name || conn.peer} left the room.` });
      };
      conn.on('close', drop);
      conn.on('error', drop);
    });
  }

  private setupClientConnection(
    conn: DataConnection,
    onSuccess: () => void,
    onError: () => void
  ): void {
    conn.on('open', () => {
      this.connections.set(this.hostPeerId, conn);
      this.setStatus('connected', { level: 'info', text: `Connected to ${this.hostPeerId}.` });
      conn.send({ type: 'hello', name: 'Agent_' + this.localPeerId.slice(-4).toUpperCase() });
      this.startPingLoop();
      onSuccess();
    });

    conn.on('data', (data: any) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'snapshot') {
        this.handleSnapshot(data.snapshot);
      } else if (data.type === 'pong') {
        const sentTime = this.pingsSent.get(data.seq);
        if (sentTime) {
          this.currentPing = Math.round(performance.now() - sentTime);
          this.pingsSent.delete(data.seq);
        }
      } else if (data.type === 'chat') {
        this.onChatMessage?.(data.sender, data.text);
      }
    });

    conn.on('error', (err: any) => {
      this.setStatus('error', { level: 'error', text: `Connection error: ${err?.type || err?.message || 'unknown'}` });
      onError();
    });

    conn.on('close', () => {
      this.connections.clear();
      if (this.pingTimer !== null) {
        window.clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.setStatus('disconnected', { level: 'warn', text: 'Host closed the room or the connection dropped.' });
      onError();
    });
  }

  /**
   * Samples and queues player input for Client-Side Prediction (CSP)
   */
  public sendInput(input: Omit<PlayerInputPacket, 'tick' | 'sequence'>): void {
    this.currentTick++;
    this.inputSequence++;
    const packet: PlayerInputPacket = { ...input, tick: this.currentTick, sequence: this.inputSequence };
    this.inputBuffer.push(packet);
    if (this.inputBuffer.length > 120) this.inputBuffer.shift();

    if (!this.isHost) {
      const hostConn = this.connections.get(this.hostPeerId);
      if (hostConn && hostConn.open) {
        hostConn.send({ type: 'input', input: packet });
      }
    }
  }

  /**
   * Broadcasts world snapshot to all peers (called by host at 60Hz)
   */
  public broadcastSnapshot(snapshot: WorldSnapshotPacket): void {
    if (!this.isHost) return;
    if (this.connections.size > 0) {
      this.connections.forEach((conn) => {
        if (conn.open) conn.send({ type: 'snapshot', snapshot });
      });
    }
    this.handleSnapshot(snapshot);
  }

  /** Authoritative state for every connected remote participant. */
  public getRemotePlayerStates(): PlayerNetState[] {
    const out: PlayerNetState[] = [];
    this.remotePlayers.forEach(r => out.push(r.state));
    return out;
  }

  private handleSnapshot(snapshot: WorldSnapshotPacket): void {
    if (!snapshot || !Array.isArray(snapshot.players)) return;
    this.lastServerTick = snapshot.tick;
    const now = performance.now();
    this.remoteSnapshots.push({ timestamp: now, players: snapshot.players });
    if (this.remoteSnapshots.length > 15) this.remoteSnapshots.shift();
    this.onSnapshotReceived?.(snapshot);
  }

  /**
   * Calculates interpolated transforms for remote entities (~60ms back-buffer)
   */
  public updateEntityInterpolation(): Map<string, PlayerNetState> {
    if (this.remoteSnapshots.length < 2) {
      if (this.remoteSnapshots.length === 1) {
        this.remoteSnapshots[0].players.forEach(p => this.interpolatedPlayers.set(p.id, { ...p }));
      }
      return this.interpolatedPlayers;
    }

    const renderTime = performance.now() - 60;
    let s0 = this.remoteSnapshots[this.remoteSnapshots.length - 2];
    let s1 = this.remoteSnapshots[this.remoteSnapshots.length - 1];

    for (let i = 0; i < this.remoteSnapshots.length - 1; i++) {
      if (this.remoteSnapshots[i].timestamp <= renderTime && this.remoteSnapshots[i + 1].timestamp >= renderTime) {
        s0 = this.remoteSnapshots[i];
        s1 = this.remoteSnapshots[i + 1];
        break;
      }
    }

    const span = s1.timestamp - s0.timestamp;
    const alpha = span > 0 ? clamp((renderTime - s0.timestamp) / span, 0, 1) : 1;

    const seen = new Set<string>();
    s1.players.forEach((p1) => {
      seen.add(p1.id);
      const p0 = s0.players.find(p => p.id === p1.id);
      if (!p0) {
        this.interpolatedPlayers.set(p1.id, { ...p1 });
        return;
      }
      this.interpolatedPlayers.set(p1.id, {
        ...p1,
        position: [
          p0.position[0] + (p1.position[0] - p0.position[0]) * alpha,
          p0.position[1] + (p1.position[1] - p0.position[1]) * alpha,
          p0.position[2] + (p1.position[2] - p0.position[2]) * alpha
        ],
        pitch: p0.pitch + (p1.pitch - p0.pitch) * alpha,
        rotationY: p0.rotationY + lerpAngle(p0.rotationY, p1.rotationY, alpha)
      });
    });
    // Drop entities no longer present in the latest snapshot
    Array.from(this.interpolatedPlayers.keys()).forEach(id => {
      if (!seen.has(id)) this.interpolatedPlayers.delete(id);
    });

    return this.interpolatedPlayers;
  }

  /**
   * Host-side authoritative input handling. Validates, sanitizes and forwards
   * the input to the game's physics step. Client-supplied positions, health
   * and scores are never trusted.
   */
  private handleClientInput(peerId: string, raw: any): void {
    if (!this.isHost) return;
    const rec = this.remotePlayers.get(peerId);
    if (!rec || !raw || typeof raw !== 'object') return;

    const tick = Number(raw.tick);
    if (!Number.isFinite(tick) || tick <= rec.lastInputTick) return; // stale or duplicate

    const dtRaw = Number(raw.dt);
    if (!Number.isFinite(dtRaw) || dtRaw <= 0) return;
    const dt = Math.min(dtRaw, 0.05); // clamp to 20 Hz worth of movement per packet (anti speed-hack)

    let mf = Number(raw.moveForward) || 0;
    let mr = Number(raw.moveRight) || 0;
    const mag = Math.hypot(mf, mr);
    if (mag > 1) { mf /= mag; mr /= mag; }

    const input: PlayerInputPacket = {
      tick,
      sequence: Number(raw.sequence) || 0,
      moveForward: clamp(mf, -1, 1),
      moveRight: clamp(mr, -1, 1),
      jump: !!raw.jump,
      crouch: !!raw.crouch,
      pitch: clamp(Number(raw.pitch) || 0, -Math.PI / 2, Math.PI / 2),
      yaw: Number.isFinite(Number(raw.yaw)) ? Number(raw.yaw) : rec.state.rotationY,
      fire: !!raw.fire,
      weapon: typeof raw.weapon === 'string' ? raw.weapon as WeaponType : rec.state.currentWeapon,
      dt
    };

    rec.lastInputTick = tick;
    rec.lastInputAt = performance.now();
    rec.state.lastAcknowledgedTick = tick;
    rec.state.rotationY = input.yaw;
    rec.state.pitch = input.pitch;
    rec.state.isCrouching = input.crouch;
    rec.state.isFiring = input.fire;
    rec.state.currentWeapon = input.weapon;

    if (this.simulateRemoteInput) {
      this.simulateRemoteInput(rec, input);
    } else {
      // Minimal fallback integrator if the game hasn't supplied physics.
      const speed = input.crouch ? 2.4 : 6.8;
      const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
      const rx = Math.cos(input.yaw), rz = -Math.sin(input.yaw);
      rec.state.position[0] = clamp(rec.state.position[0] + (fx * input.moveForward + rx * input.moveRight) * speed * dt, -48, 48);
      rec.state.position[2] = clamp(rec.state.position[2] + (fz * input.moveForward + rz * input.moveRight) * speed * dt, -48, 48);
    }
  }

  public sendChatMessage(text: string, senderName: string): void {
    const payload = { type: 'chat', sender: senderName, text };
    if (this.isHost) {
      this.broadcastChatMessage(senderName, text);
    } else {
      const conn = this.connections.get(this.hostPeerId);
      if (conn && conn.open) conn.send(payload);
    }
  }

  private broadcastChatMessage(sender: string, text: string): void {
    const payload = { type: 'chat', sender, text };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(payload);
    });
    this.onChatMessage?.(sender, text);
  }

  private startPingLoop(): void {
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      if (!this.isConnected || this.isHost) return;
      const conn = this.connections.get(this.hostPeerId);
      if (conn && conn.open) {
        this.pingSequence++;
        this.pingsSent.set(this.pingSequence, performance.now());
        conn.send({ type: 'ping', seq: this.pingSequence });
        // Drop stale pings
        if (this.pingsSent.size > 10) {
          const oldest = this.pingsSent.keys().next().value;
          if (oldest !== undefined) this.pingsSent.delete(oldest);
        }
      }
    }, 1000);
  }

  public get peerCount(): number {
    return this.connections.size;
  }

  public destroy(): void {
    this.teardownPeer();
    this.status = 'idle';
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d * t;
}
