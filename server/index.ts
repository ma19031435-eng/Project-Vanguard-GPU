/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanguard Official Server (Railway-ready)
 * - Serves the production Vite build
 * - Hosts a private PeerJS signaling server on /peerjs
 * - Exposes a lightweight room directory for matchmaking on /api/rooms
 * - Health check on /api/health
 */

import express, { Request, Response, NextFunction } from 'express';
import { ExpressPeerServer } from 'peer';
import http from 'http';
import path from 'path';
import fs from 'fs';

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ROOM_TTL_MS = 45_000; // rooms without a heartbeat for 45s are dropped
const MAX_ROOMS = 500;

export interface RoomRecord {
  id: string;
  name: string;
  mode: string;
  map: string;
  region: string;
  capacity: number;
  players: number;
  createdAt: number;
  lastHeartbeat: number;
}

const VALID_MODES = new Set(['Team Deathmatch', 'Free For All', 'Gun Game', 'Hardpoint', 'Elimination']);
const VALID_MAPS = new Set(['mirage', 'dock', 'summit', 'metro', 'foundry', 'skyline']);
const VALID_REGIONS = new Set(['auto', 'na-east', 'na-west', 'eu-west', 'eu-central', 'me-south', 'ap-south', 'ap-east', 'sa-east', 'oce']);
const ROOM_ID_RE = /^[a-z0-9-]{4,40}$/i;

export const rooms = new Map<string, RoomRecord>();

function pruneRooms(now = Date.now()): void {
  for (const [id, room] of rooms) {
    if (now - room.lastHeartbeat > ROOM_TTL_MS) rooms.delete(id);
  }
}

function sanitizeString(v: unknown, max: number, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const t = v.trim().slice(0, max);
  return t.length ? t : fallback;
}

function toInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Railway sits behind a reverse proxy
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Security headers (kept permissive enough for WebRTC/WebGPU and the Vite bundle)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // --- Health ---
  app.get('/api/health', (_req: Request, res: Response) => {
    pruneRooms();
    res.json({
      ok: true,
      service: 'vanguard-official-server',
      uptimeSec: Math.round(process.uptime()),
      rooms: rooms.size,
      signaling: '/peerjs',
      timestamp: Date.now()
    });
  });

  // --- Room directory (matchmaking) ---
  app.get('/api/rooms', (req: Request, res: Response) => {
    pruneRooms();
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region : undefined;
    const list = Array.from(rooms.values())
      .filter(r => (!mode || r.mode === mode) && (!region || region === 'auto' || r.region === region))
      .filter(r => r.players < r.capacity)
      .sort((a, b) => b.players - a.players || a.createdAt - b.createdAt)
      .slice(0, 100);
    res.json({ rooms: list, total: rooms.size });
  });

  app.post('/api/rooms', (req: Request, res: Response) => {
    pruneRooms();
    const body = req.body ?? {};
    const id = sanitizeString(body.id, 40, '');
    if (!ROOM_ID_RE.test(id)) {
      res.status(400).json({ error: 'invalid room id' });
      return;
    }
    const mode = sanitizeString(body.mode, 32, 'Team Deathmatch');
    const map = sanitizeString(body.map, 32, 'mirage');
    const region = sanitizeString(body.region, 16, 'auto').toLowerCase();
    if (!VALID_MODES.has(mode)) { res.status(400).json({ error: 'invalid mode' }); return; }
    if (!VALID_MAPS.has(map)) { res.status(400).json({ error: 'invalid map' }); return; }
    if (!VALID_REGIONS.has(region)) { res.status(400).json({ error: 'invalid region' }); return; }
    if (!rooms.has(id) && rooms.size >= MAX_ROOMS) { res.status(503).json({ error: 'room directory full' }); return; }

    const now = Date.now();
    const existing = rooms.get(id);
    const capacity = toInt(body.capacity, 2, 16, 8);
    const record: RoomRecord = {
      id,
      name: sanitizeString(body.name, 32, `Room ${id.slice(-4).toUpperCase()}`),
      mode,
      map,
      region,
      capacity,
      players: toInt(body.players, 1, capacity, 1),
      createdAt: existing?.createdAt ?? now,
      lastHeartbeat: now
    };
    rooms.set(id, record);
    res.status(existing ? 200 : 201).json(record);
  });

  app.patch('/api/rooms/:id/heartbeat', (req: Request, res: Response) => {
    const room = rooms.get(String(req.params.id));
    if (!room) { res.status(404).json({ error: 'room not found' }); return; }
    room.lastHeartbeat = Date.now();
    if (req.body && req.body.players !== undefined) {
      room.players = toInt(req.body.players, 0, room.capacity, room.players);
    }
    res.json(room);
  });

  app.delete('/api/rooms/:id', (req: Request, res: Response) => {
    const existed = rooms.delete(String(req.params.id));
    res.status(existed ? 204 : 404).end();
  });

  // --- Static production build (SPA) ---
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR, { maxAge: '1h', index: false }));
    app.get(/^(?!\/(api|peerjs)).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  } else {
    app.get('/', (_req: Request, res: Response) => {
      res.status(503).type('text').send('Vanguard build not found. Run `npm run build` first.');
    });
  }

  return app;
}

export function startServer(port = PORT) {
  const app = createApp();
  const server = http.createServer(app);

  // PeerJS signaling mounted at /peerjs (clients use path '/peerjs')
  const peerServer = ExpressPeerServer(server, {
    path: '/',
    proxied: true,
    allow_discovery: false,
    alive_timeout: 60_000,
    key: 'peerjs'
  });
  app.use('/peerjs', peerServer);

  peerServer.on('connection', (client: { getId: () => string }) => {
    console.log(`[signaling] peer connected: ${client.getId()}`);
  });
  peerServer.on('disconnect', (client: { getId: () => string }) => {
    const id = client.getId();
    rooms.delete(id); // if a host drops, its directory entry goes with it
    console.log(`[signaling] peer disconnected: ${id}`);
  });

  const janitor = setInterval(() => pruneRooms(), 10_000);

  server.listen(port, HOST, () => {
    console.log(`Vanguard official server listening on http://${HOST}:${port}`);
    console.log(`  static:    ${fs.existsSync(DIST_DIR) ? DIST_DIR : '(no build found)'}`);
    console.log(`  signaling: /peerjs`);
    console.log(`  health:    /api/health`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down gracefully…`);
    clearInterval(janitor);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).includes(path.join('server', 'index'));
if (isMain) startServer();
