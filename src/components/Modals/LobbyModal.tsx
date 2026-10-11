/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Users, Copy, Check, Play, Bot, Globe, ShieldCheck } from 'lucide-react';
import { PlayerNetState } from '../../engine/netcode/P2PNetworkEngine.ts';

interface LobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isHost: boolean;
  isConnected: boolean;
  allPlayers: PlayerNetState[];
  onHostNewRoom: () => void;
  onJoinRoom: (targetCode: string) => void;
  onAddBot: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  onClose,
  roomId,
  isHost,
  isConnected,
  allPlayers,
  onHostNewRoom,
  onJoinRoom,
  onAddBot
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-zinc-200">
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
            <Users className="w-5 h-5 text-cyan-400" /> P2P LISTEN SERVER MATCHMAKING
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Room Info */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl mb-6">
          <div className="text-xs text-zinc-400 mb-1">AUTHORITATIVE HOST ROOM ID</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-cyan-300 tracking-wider">
              {roomId || 'OFFLINE'}
            </span>
            <button
              onClick={handleCopy}
              className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-xs rounded border border-zinc-700 flex items-center gap-1.5 transition text-cyan-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED!' : 'COPY CODE'}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebRTC DataChannel (Unreliable UDP Simulation: ordered: false, maxRetransmits: 0)</span>
          </div>
        </div>

        {/* Join / Host Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-white mb-1">JOIN REMOTE MATCH</div>
              <p className="text-[10px] text-zinc-400 mb-3">
                Connect directly to a peer host's room code via WebRTC DataChannel.
              </p>
              <input
                type="text"
                placeholder="Enter Room Code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-cyan-400 font-mono mb-2"
              />
            </div>
            <button
              onClick={() => {
                if (joinCode.trim()) onJoinRoom(joinCode.trim());
              }}
              disabled={!joinCode.trim()}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition"
            >
              CONNECT AS PEER
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-white mb-1">HOST CONTROLS</div>
              <p className="text-[10px] text-zinc-400 mb-3">
                Spawn tactical combat bots or host an authoritative listen server session.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={onAddBot}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold text-xs rounded-lg border border-zinc-700 flex items-center justify-center gap-1.5 transition"
              >
                <Bot className="w-4 h-4" /> SPAWN TACTICAL BOT
              </button>
              <button
                onClick={onHostNewRoom}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg border border-zinc-700 transition"
              >
                NEW LISTEN SERVER
              </button>
            </div>
          </div>
        </div>

        {/* Connected Participants */}
        <div>
          <div className="text-xs font-bold text-zinc-400 mb-2">
            ACTIVE COMBATANTS ({allPlayers.length})
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {allPlayers.map((p) => (
              <div
                key={p.id}
                className="p-2 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cyan-300">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {p.isHost ? 'AUTHORITATIVE HOST' : (p.isBot ? 'BOT' : 'PEER CLIENT')}
                  </span>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  HP: <span className="text-red-400 font-bold">{p.health}</span> | PING: <span className="text-emerald-400">{p.ping}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          >
            ENTER COMBAT ZONE
          </button>
        </div>
      </div>
    </div>
  );
};
