/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { X, Users, Copy, Check, Play, Bot, Globe, ShieldCheck, Map, Swords, Lock, Radio } from 'lucide-react';
import { PlayerNetState, NetworkStatus } from '../../engine/netcode/P2PNetworkEngine.ts';

interface LobbyModalProps {
  isOpen: boolean; onClose: () => void; roomId: string; isHost: boolean; isConnected: boolean;
  networkStatus?: NetworkStatus;
  allPlayers: PlayerNetState[]; onHostNewRoom: () => void; onJoinRoom: (code: string) => void | Promise<void>; onAddBot: () => void;
}

const MAPS = [
  { id: 'mirage', name: 'DUST MIRAGE', theme: 'Desert outpost', color: 'from-amber-700 to-orange-950', feature: 'Ramps • catwalks' },
  { id: 'dock', name: 'NEON DOCKS', theme: 'Rainy shipping yard', color: 'from-cyan-800 to-slate-950', feature: 'Containers • lanes' },
  { id: 'summit', name: 'ALPINE SUMMIT', theme: 'Frozen radar base', color: 'from-sky-600 to-indigo-950', feature: 'Vertical • ziplines' },
  { id: 'metro', name: 'METRO ZERO', theme: 'Underground terminal', color: 'from-violet-800 to-zinc-950', feature: 'Close quarters' },
  { id: 'foundry', name: 'IRON FOUNDRY', theme: 'Industrial furnace', color: 'from-red-800 to-stone-950', feature: 'Hazards • bridges' },
  { id: 'skyline', name: 'SKYLINE', theme: 'Rooftop district', color: 'from-blue-700 to-slate-950', feature: 'Jump pads • gaps' }
];
const MODES = ['Team Deathmatch', 'Free For All', 'Gun Game', 'Hardpoint', 'Elimination'];

export const LobbyModal: React.FC<LobbyModalProps> = ({ isOpen, onClose, roomId, isHost, isConnected, networkStatus = 'idle', allPlayers, onHostNewRoom, onJoinRoom, onAddBot }) => {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'play' | 'custom'>('play');
  const [selectedMap, setSelectedMap] = useState('mirage');
  const [selectedMode, setSelectedMode] = useState(MODES[0]);
  const [searching, setSearching] = useState(false);
  if (!isOpen) return null;

  const copy = async () => { try { if (roomId) await navigator.clipboard.writeText(roomId); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const join = async () => { const code = joinCode.trim(); if (!code || joining) return; setJoining(true); try { await onJoinRoom(code); } finally { setJoining(false); } };
  const statusLabel = networkStatus === 'connected' ? (isHost ? 'HOSTING • READY' : 'CONNECTED TO HOST') : networkStatus === 'connecting' ? 'CONNECTING…' : networkStatus === 'error' ? 'CONNECTION ERROR' : networkStatus === 'disconnected' ? 'DISCONNECTED' : 'IDLE';
  const statusColor = networkStatus === 'connected' ? 'text-emerald-400' : networkStatus === 'connecting' ? 'text-amber-400' : networkStatus === 'idle' ? 'text-zinc-500' : 'text-red-400';
  const quickPlay = () => { setSearching(true); onHostNewRoom(); setTimeout(() => setSearching(false), 1800); };

  return <div className="fixed inset-0 z-50 bg-[#05070c]/95 backdrop-blur-xl flex items-center justify-center p-3 font-mono select-none">
    <div className="bg-[#090d15] border border-cyan-400/30 rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden shadow-[0_0_80px_rgba(6,182,212,.16)] text-zinc-200">
      <header className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 to-transparent">
        <div><div className="flex items-center gap-2 text-cyan-300 font-black text-xl tracking-widest"><Globe className="w-5 h-5"/> VANGUARD NETWORK</div><div className="text-[10px] text-zinc-500 mt-1">P2P PREVIEW • DEDICATED MATCHMAKING INFRASTRUCTURE COMING LATER</div></div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5"/></button>
      </header>

      <div className="flex border-b border-white/10 px-6">
        <button onClick={()=>setTab('play')} className={`px-5 py-3 text-xs font-black border-b-2 ${tab==='play'?'text-cyan-300 border-cyan-400':'text-zinc-500 border-transparent'}`}>QUICK PLAY</button>
        <button onClick={()=>setTab('custom')} className={`px-5 py-3 text-xs font-black border-b-2 ${tab==='custom'?'text-cyan-300 border-cyan-400':'text-zinc-500 border-transparent'}`}>CUSTOM P2P</button>
      </div>

      <main className="p-6 overflow-y-auto max-h-[72vh]">
      {tab === 'play' ? <>
        <div className="flex items-center justify-between mb-3"><div><h2 className="font-black tracking-wider">SELECT ARENA</h2><p className="text-[10px] text-zinc-500">Six original combat spaces designed for slides, air-strafes and vertical routes.</p></div><Map className="text-cyan-500"/></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">{MAPS.map(m=><button key={m.id} onClick={()=>setSelectedMap(m.id)} className={`relative text-left rounded-xl overflow-hidden border-2 transition ${selectedMap===m.id?'border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.3)]':'border-white/10 hover:border-white/30'}`}>
          <div className={`h-24 bg-gradient-to-br ${m.color} p-3 flex flex-col justify-end`}><div className="font-black text-white tracking-wide">{m.name}</div><div className="text-[10px] text-white/65">{m.theme}</div></div><div className="px-3 py-2 bg-black/40 text-[10px] text-cyan-300">{m.feature}</div>
        </button>)}</div>
        <div className="grid md:grid-cols-[1fr_260px] gap-5">
          <div><div className="text-xs font-black mb-2 flex items-center gap-2"><Swords className="w-4 h-4 text-amber-400"/> MODE</div><div className="flex flex-wrap gap-2">{MODES.map(mode=><button key={mode} onClick={()=>setSelectedMode(mode)} className={`px-3 py-2 rounded-lg text-[10px] font-bold border ${selectedMode===mode?'bg-amber-400 text-black border-amber-300':'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>{mode}</button>)}</div>
          <div className="mt-4 p-3 border border-amber-500/20 bg-amber-500/5 rounded-lg flex gap-2 text-[10px] text-zinc-400"><Lock className="w-4 h-4 text-amber-400 shrink-0"/><span>Global skill matchmaking and dedicated servers are reserved for a future backend release. Quick Play currently creates a shareable host-authoritative P2P room.</span></div></div>
          <button onClick={quickPlay} disabled={searching} className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black tracking-wider min-h-24 shadow-[0_0_25px_rgba(34,211,238,.25)]"><Play className="inline w-5 h-5 mr-2 fill-black"/>{searching?'CREATING ROOM…':'HOST QUICK PLAY'}<div className="text-[9px] opacity-60 mt-1">{selectedMode.toUpperCase()}</div></button>
        </div>
      </> : <>
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <section className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"><div className="text-[10px] text-zinc-500 mb-1">YOUR SHAREABLE ROOM CODE</div><div className="flex items-center justify-between"><span className="text-lg font-black text-cyan-300 tracking-wider">{isHost ? (roomId||'OPENING…') : (roomId ? `→ ${roomId}` : '—')}</span><button onClick={copy} className="px-3 py-2 bg-zinc-800 rounded-lg text-[10px] text-cyan-300">{copied?<Check className="inline w-3 h-3"/>:<Copy className="inline w-3 h-3"/>} {copied?'COPIED':'COPY'}</button></div><div className="text-[10px] text-emerald-400 mt-3 flex gap-1"><ShieldCheck className="w-3 h-3"/> Host-authoritative WebRTC session</div></section>
          <section className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl"><div className="text-xs font-black mb-3">JOIN FRIEND</div><div className="flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') join(); }} placeholder="vanguard-xxxxxx" className="min-w-0 flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400"/><button disabled={!joinCode.trim()||joining} onClick={join} className="px-4 py-2 bg-cyan-500 disabled:opacity-40 text-black font-black text-xs rounded-lg cursor-pointer">{joining?'JOINING…':'JOIN'}</button></div></section>
        </div>
        <div className="flex items-center justify-between mb-2"><div className="text-xs font-black">SQUAD ({allPlayers.length})</div><div className="flex gap-2"><button onClick={onAddBot} className="px-3 py-2 border border-zinc-700 rounded-lg text-[10px] text-cyan-300"><Bot className="inline w-3 h-3"/> ADD BOT</button><button onClick={onHostNewRoom} className="px-3 py-2 border border-zinc-700 rounded-lg text-[10px]"><Radio className="inline w-3 h-3"/> NEW ROOM</button></div></div>
        <div className="space-y-2">{allPlayers.length===0?<div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-600">Waiting for combatants… share your code to invite friends.</div>:allPlayers.map(p=><div key={p.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between text-xs"><span className="font-bold text-cyan-300">{p.name} <small className="text-zinc-600">{p.isBot?'BOT':p.isHost?'HOST':'PEER'}</small></span><span className="text-zinc-500">{p.health} HP • {p.ping} MS</span></div>)}</div>
      </>}
      </main>
      <footer className="px-6 py-3 border-t border-white/10 flex justify-between text-[9px] text-zinc-600"><span>REGION: AUTO • NAT TRAVERSAL ENABLED</span><span className={statusColor}>● {statusLabel}</span></footer>
    </div>
  </div>;
};
