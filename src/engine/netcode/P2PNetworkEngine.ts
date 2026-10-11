/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, DataConnection } from 'peerjs';
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

export class P2PNetworkEngine {
  public peer: Peer | null = null;
  public localPeerId: string = '';
  public hostPeerId: string = '';
  public isHost: boolean = true;
  public isConnected: boolean = false;

  // Active PeerJS data connections
  private connections: Map<string, DataConnection> = new Map();

  // Network metrics
  public currentPing: number = 18;
  public packetLossRate: number = 0;
  private pingsSent: Map<number, number> = new Map();
  private pingSequence: number = 0;

  // Client-Side Prediction (CSP) & Reconciliation Ring Buffer
  public inputBuffer: PlayerInputPacket[] = [];
  public currentTick: number = 0;
  public lastServerTick: number = 0;

  // Entity Interpolation Snapshots
  public remoteSnapshots: { timestamp: number; players: PlayerNetState[] }[] = [];
  public interpolatedPlayers: Map<string, PlayerNetState> = new Map();

  // Callbacks
  public onSnapshotReceived?: (snapshot: WorldSnapshotPacket) => void;
  public onPlayerJoined?: (playerId: string, name: string) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onChatMessage?: (sender: string, text: string) => void;

  constructor() {
    this.localPeerId = 'vanguard_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Initializes host listen server
   */
  public async hostRoom(roomId?: string): Promise<string> {
    const finalRoomId = roomId || 'room_' + Math.random().toString(36).substring(2, 8);
    this.isHost = true;
    this.hostPeerId = finalRoomId;
    this.localPeerId = finalRoomId;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(finalRoomId, {
          debug: 0
        });

        this.peer.on('open', (id) => {
          this.localPeerId = id;
          this.isConnected = true;
          this.setupHostListeners();
          resolve(id);
        });

        this.peer.on('error', (err) => {
          // Fallback if ID is taken: generate unique
          if (err.type === 'unavailable-id') {
            const fallbackId = 'room_' + Math.random().toString(36).substring(2, 8);
            this.peer?.destroy();
            this.hostRoom(fallbackId).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Joins an existing host peer room
   */
  public async joinRoom(targetHostId: string): Promise<boolean> {
    this.isHost = false;
    this.hostPeerId = targetHostId;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 0
        });

        this.peer.on('open', (id) => {
          this.localPeerId = id;
          
          // Connect with UDP simulation flags: unordered & zero retransmits
          const conn = this.peer!.connect(targetHostId, {
            reliable: false,
            serialization: 'json'
          });

          this.setupClientConnection(conn, resolve, reject);
        });

        this.peer.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private setupHostListeners(): void {
    if (!this.peer) return;

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        if (this.onPlayerJoined) {
          this.onPlayerJoined(conn.peer, 'Agent_' + conn.peer.substring(0, 4));
        }

        // Send welcome packet
        conn.send({
          type: 'welcome',
          assignedId: conn.peer,
          serverTick: this.currentTick
        });
      });

      conn.on('data', (data: any) => {
        if (!data) return;
        if (data.type === 'input') {
          // Process client input packet for authoritative tick simulation
          this.handleClientInput(conn.peer, data.input);
        } else if (data.type === 'ping') {
          conn.send({ type: 'pong', seq: data.seq });
        } else if (data.type === 'chat') {
          this.broadcastChatMessage(data.sender, data.text);
        }
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        if (this.onPlayerLeft) {
          this.onPlayerLeft(conn.peer);
        }
      });
    });
  }

  private setupClientConnection(
    conn: DataConnection,
    onSuccess: (val: boolean) => void,
    onError: (err: any) => void
  ): void {
    conn.on('open', () => {
      this.connections.set(this.hostPeerId, conn);
      this.isConnected = true;
      this.startPingLoop();
      onSuccess(true);
    });

    conn.on('data', (data: any) => {
      if (!data) return;
      if (data.type === 'snapshot') {
        this.handleSnapshot(data.snapshot);
      } else if (data.type === 'pong') {
        const sentTime = this.pingsSent.get(data.seq);
        if (sentTime) {
          this.currentPing = Math.round(performance.now() - sentTime);
          this.pingsSent.delete(data.seq);
        }
      } else if (data.type === 'chat') {
        if (this.onChatMessage) {
          this.onChatMessage(data.sender, data.text);
        }
      }
    });

    conn.on('error', (err) => {
      onError(err);
    });

    conn.on('close', () => {
      this.isConnected = false;
      this.connections.clear();
    });
  }

  /**
   * Samples and queues player input for Client-Side Prediction (CSP)
   * Sends unreliable UDP-like packet to host
   */
  public sendInput(input: PlayerInputPacket): void {
    this.currentTick++;
    input.tick = this.currentTick;
    this.inputBuffer.push(input);

    // Keep ring buffer bounded
    if (this.inputBuffer.length > 120) {
      this.inputBuffer.shift();
    }

    if (!this.isHost) {
      const hostConn = this.connections.get(this.hostPeerId);
      if (hostConn && hostConn.open) {
        // Unreliable send
        hostConn.send({
          type: 'input',
          input
        });
      }
    }
  }

  /**
   * Broadcasts world snapshot to all peers (called by host at 60Hz)
   */
  public broadcastSnapshot(snapshot: WorldSnapshotPacket): void {
    if (!this.isHost) return;

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: 'snapshot',
          snapshot
        });
      }
    });

    // Also notify local host simulation
    this.handleSnapshot(snapshot);
  }

  /**
   * Entity Interpolation Engine:
   * Buffers remote state updates and smoothly interpolates positions over time
   */
  private handleSnapshot(snapshot: WorldSnapshotPacket): void {
    this.lastServerTick = snapshot.tick;
    const now = performance.now();
    this.remoteSnapshots.push({ timestamp: now, players: snapshot.players });

    // Keep buffer at last 15 snapshots
    if (this.remoteSnapshots.length > 15) {
      this.remoteSnapshots.shift();
    }

    if (this.onSnapshotReceived) {
      this.onSnapshotReceived(snapshot);
    }
  }

  /**
   * Calculates interpolated transforms for remote entities
   * Interpolation delay: ~60ms back-buffer
   */
  public updateEntityInterpolation(): Map<string, PlayerNetState> {
    if (this.remoteSnapshots.length < 2) {
      return this.interpolatedPlayers;
    }

    const renderTime = performance.now() - 60; // 60ms interp delay
    let s0 = this.remoteSnapshots[0];
    let s1 = this.remoteSnapshots[1];

    for (let i = 0; i < this.remoteSnapshots.length - 1; i++) {
      if (this.remoteSnapshots[i].timestamp <= renderTime && this.remoteSnapshots[i + 1].timestamp >= renderTime) {
        s0 = this.remoteSnapshots[i];
        s1 = this.remoteSnapshots[i + 1];
        break;
      }
    }

    const span = s1.timestamp - s0.timestamp;
    const alpha = span > 0 ? THREE_MathUtils_clamp((renderTime - s0.timestamp) / span, 0, 1) : 1;

    // Interpolate players
    s1.players.forEach((p1) => {
      const p0 = s0.players.find(p => p.id === p1.id);
      if (!p0) {
        this.interpolatedPlayers.set(p1.id, { ...p1 });
        return;
      }

      const interpX = p0.position[0] + (p1.position[0] - p0.position[0]) * alpha;
      const interpY = p0.position[1] + (p1.position[1] - p0.position[1]) * alpha;
      const interpZ = p0.position[2] + (p1.position[2] - p0.position[2]) * alpha;

      this.interpolatedPlayers.set(p1.id, {
        ...p1,
        position: [interpX, interpY, interpZ],
        pitch: p0.pitch + (p1.pitch - p0.pitch) * alpha,
        rotationY: p0.rotationY + (p1.rotationY - p0.rotationY) * alpha
      });
    });

    return this.interpolatedPlayers;
  }

  private handleClientInput(peerId: string, input: PlayerInputPacket): void {
    // Stored for authoritative tick loop
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
    if (this.onChatMessage) {
      this.onChatMessage(sender, text);
    }
  }

  private startPingLoop(): void {
    setInterval(() => {
      if (!this.isConnected || this.isHost) return;
      const conn = this.connections.get(this.hostPeerId);
      if (conn && conn.open) {
        this.pingSequence++;
        this.pingsSent.set(this.pingSequence, performance.now());
        conn.send({ type: 'ping', seq: this.pingSequence });
      }
    }, 1000);
  }

  public destroy(): void {
    this.connections.forEach(c => c.close());
    this.connections.clear();
    this.peer?.destroy();
    this.isConnected = false;
  }
}

function THREE_MathUtils_clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
