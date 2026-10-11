/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { WasmPhysicsCore, CS2MovementState } from './engine/wasm/WasmPhysicsCore.ts';
import { GraphicsQualityManager, GraphicsPreset, GLSL_PARTICLE_SHADERS } from './engine/webgpu/WebGPUPipeline.ts';
import { SpatialAudioEngine } from './engine/audio/SpatialAudioEngine.ts';
import { MapGenerator } from './engine/graphics/MapGenerator.ts';
import { WeaponSystem, WeaponType, WEAPON_DEFINITIONS } from './engine/weapons/WeaponSystem.ts';
import { P2PNetworkEngine, PlayerNetState, NetworkStatus, RemotePlayerRecord, PlayerInputPacket } from './engine/netcode/P2PNetworkEngine.ts';
import { BotSimulation, SmartBotEntity, BotDifficulty } from './engine/netcode/BotSimulation.ts';
import { HumanOperatorBuilder, HumanSkeleton } from './engine/graphics/HumanOperatorMesh.ts';
import { CinematicPipeline } from './engine/graphics/PostProcessing.ts';
import { TacticalHUD, FloatingDamageNumber, KillFeedItem } from './components/HUD/TacticalHUD.tsx';
import { SettingsModal } from './components/Modals/SettingsModal.tsx';
import { LobbyModal } from './components/Modals/LobbyModal.tsx';
import { ShopModal } from './components/Modals/ShopModal.tsx';
import { ShopSystem, WeaponSkinId, CharacterHatId, SHOP_SKINS } from './engine/shop/ShopSystem.ts';
import { SentinelAntiCheat } from './engine/anticheat/SentinelAntiCheat.ts';
import { MainLobby, PauseOverlay, SessionMode } from './components/Lobby/MainLobby.tsx';
import { Trophy } from 'lucide-react';

const ARENA_PLAYLIST_COUNT = 6;

const MILITARY_RANKS = [
  'RECRUIT',
  'PRIVATE FIRST CLASS',
  'CORPORAL',
  'SERGEANT',
  'STAFF SERGEANT',
  'MASTER SERGEANT',
  'LIEUTENANT',
  'CAPTAIN',
  'MAJOR',
  'COLONEL',
  'GLOBAL ELITE'
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointerLockExit = useRef<number>(0);
  const lastDamageTimeRef = useRef<number>(0);
  const regenAccumulatorRef = useRef<number>(0);

  // Shop & Anti-Cheat Subsystems
  const shopRef = useRef(new ShopSystem());
  const antiCheatRef = useRef(new SentinelAntiCheat());
  const [coins, setCoins] = useState(shopRef.current.coins);
  const [activeSkin, setActiveSkin] = useState<WeaponSkinId>(shopRef.current.equippedSkin);
  const [activeHat, setActiveHat] = useState<CharacterHatId>(shopRef.current.equippedHat);
  const [shopOpen, setShopOpen] = useState(false);
  const [botsEnabled, setBotsEnabled] = useState(true);
  const botsEnabledRef = useRef(true);
  botsEnabledRef.current = botsEnabled;
  const [killStreak, setKillStreak] = useState(0);
  const [antiCheatStatus, setAntiCheatStatus] = useState('SECURED');
  const [antiCheatViolations, setAntiCheatViolations] = useState(0);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);

  // Session flow: players spawn in the lobby and pick a deployment.
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const sessionModeRef = useRef<SessionMode | null>(null);
  sessionModeRef.current = sessionMode;

  // Modal & Engine State
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('easy');
  const botDifficultyRef = useRef<BotDifficulty>('easy');
  botDifficultyRef.current = botDifficulty;

  // Player Vital & Death State
  const [playerHp, setPlayerHp] = useState(100);
  const [playerArmor, setPlayerArmor] = useState(100);
  const [playerDeaths, setPlayerDeaths] = useState(0);
  const [playerKills, setPlayerKills] = useState(0);
  const [isPlayerDead, setIsPlayerDead] = useState(false);
  const [killerName, setKillerName] = useState('Faceit Bot');
  const [respawnCountdown, setRespawnCountdown] = useState(3);

  // CS2 XP & Progression Leveling System
  const [playerXp, setPlayerXp] = useState(180);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xpToNextLevel, setXpToNextLevel] = useState(500);
  const [xpGains, setXpGains] = useState<{ id: string; amount: number; reason: string }[]>([]);
  const [levelUpNotification, setLevelUpNotification] = useState<string | null>(null);

  // Weapon & Combat HUD State
  const [ammo, setAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(90);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>('rifle');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [spreadBloom, setSpreadBloom] = useState(0.003);
  const [isADS, setIsADS] = useState(false);
  const [hitmarker, setHitmarker] = useState<'body' | 'headshot' | 'shield_break' | null>(null);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamageNumber[]>([]);
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 28]);
  const [playerYaw, setPlayerYaw] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [allPlayers, setAllPlayers] = useState<PlayerNetState[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [isHostSession, setIsHostSession] = useState(true);
  const playerKillsRef = useRef(0);
  const playerDeathsRef = useRef(0);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: number }[]>([
    { sender: 'OPERATION DUST', text: 'Welcome to Outpost Mirage. Authentic CS2 recoil and real firearms active.', time: Date.now() },
    { sender: 'VANGUARD-OS', text: 'Earn XP from eliminations, headshots, and combat actions to rank up.', time: Date.now() }
  ]);

  // Telemetry & Settings
  const [fps, setFps] = useState(60);
  const [frameTimeMs, setFrameTimeMs] = useState(16.6);
  const [latencyMs, setLatencyMs] = useState(0.04);
  const [activeParticles, setActiveParticles] = useState(150000);
  const [currentPreset, setCurrentPreset] = useState<GraphicsPreset>('ultra');
  const [isWebGPU, setIsWebGPU] = useState(false);
  const webGPUCapable = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const [mouseSens, setMouseSens] = useState(1.0);
  const [fov, setFov] = useState(85);
  const [masterVol, setMasterVol] = useState(0.85);

  // Master Engine Object Reference
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    pipeline: CinematicPipeline;
    qualityManager: GraphicsQualityManager;
    wasmCore: WasmPhysicsCore;
    audioEngine: SpatialAudioEngine;
    mapGen: MapGenerator;
    weaponSystem: WeaponSystem;
    p2pNet: P2PNetworkEngine;
    botSim: BotSimulation;
    particleGeo: THREE.BufferGeometry;
    particlePoints: THREE.Points;
    particlePosArr: Float32Array;
    particleVelArr: Float32Array;
    particleLifeArr: Float32Array;
    particleMaxLifeArr: Float32Array;
    particleColorArr: Float32Array;
    particleTypeArr: Float32Array;
    particleSizeArr: Float32Array;
    particleNextIdx: number;
    particleActive: Set<number>;
    remoteSkeletons: Map<string, HumanSkeleton>;
    remoteMoveStates: Map<string, CS2MovementState>;
    remoteLastPos: Map<string, [number, number, number]>;
    bulletTracers: { line: THREE.Line; life: number; maxLife: number }[];
    cs2MoveState: CS2MovementState;
    mouseDeltaX: number;
    mouseDeltaY: number;
    pitch: number;
    yaw: number;
    punchPitch: number;
    landingPunchY: number;
    footstepSoundTimer: number;
    keysDown: Set<string>;
    spawnPoints: [number, number, number][];
    playerHp: number;
    playerArmor: number;
    isDead: boolean;
  } | null>(null);

  // XP Awarding & Leveling Logic
  const awardXp = useCallback((amount: number, reason: string) => {
    const id = Math.random().toString();
    setXpGains(prev => [...prev, { id, amount, reason }]);
    setTimeout(() => {
      setXpGains(prev => prev.filter(g => g.id !== id));
    }, 1800);

    setPlayerXp(prevXp => {
      const nextXp = prevXp + amount;
      if (nextXp >= xpToNextLevel) {
        // Level up!
        setPlayerLevel(prevLvl => {
          const newLvl = prevLvl + 1;
          const nextTarget = Math.round(500 * Math.pow(1.35, newLvl - 1));
          setXpToNextLevel(nextTarget);
          const rank = MILITARY_RANKS[Math.min(newLvl - 1, MILITARY_RANKS.length - 1)];
          setLevelUpNotification(rank);
          engineRef.current?.audioEngine.playLevelUp();
          setTimeout(() => setLevelUpNotification(null), 3500);
          return newLvl;
        });
        return nextXp - xpToNextLevel;
      }
      return nextXp;
    });
  }, [xpToNextLevel]);

  const handleCycleBotDifficulty = useCallback(() => {
    setBotDifficulty(prev => {
      const next: BotDifficulty = prev === 'easy' ? 'balanced' : (prev === 'balanced' ? 'hard' : 'easy');
      engineRef.current?.botSim.setDifficulty(next);
      botDifficultyRef.current = next;
      return next;
    });
  }, []);

  const handleSetBotDifficulty = useCallback((diff: BotDifficulty) => {
    setBotDifficulty(diff);
    engineRef.current?.botSim.setDifficulty(diff);
    botDifficultyRef.current = diff;
  }, []);

  const handleAwardCoins = useCallback((amount: number, reason: string) => {
    const updated = shopRef.current.addCoins(amount);
    setCoins(updated);
    setChatMessages(prev => [...prev, {
      sender: 'RIVALS ARMORY',
      text: `+${amount} Coins earned (${reason})! Balance: ${updated} ⛁`,
      time: Date.now()
    }]);
  }, []);

  const handleToggleBots = useCallback(() => {
    setBotsEnabled(prev => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.botSim.enabled = next;
      }
      setChatMessages(prevChat => [...prevChat, {
        sender: 'VANGUARD KERNEL',
        text: next ? 'AI Combat Bots ENABLED on tactical grid.' : 'AI Combat Bots DISABLED. Solo duel arena active.',
        time: Date.now()
      }]);
      return next;
    });
  }, []);

  const handleSkinChanged = useCallback((skinId: WeaponSkinId) => {
    setActiveSkin(skinId);
    engineRef.current?.weaponSystem.setSkin(skinId);
  }, []);

  const handleHatChanged = useCallback((hatId: CharacterHatId) => {
    setActiveHat(hatId);
  }, []);

  const handleSelectWeapon = useCallback((w: WeaponType) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.weaponSystem.switchWeapon(w);
    setCurrentWeapon(w);
  }, []);

  const requestPointerLock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || document.pointerLockElement === canvas) return;
    if (Date.now() - lastPointerLockExit.current < 1100) return;
    try {
      const p = (canvas.requestPointerLock as any)();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      engineRef.current?.audioEngine.init();
    } catch {}
  }, []);

  const applyBotVisibility = useCallback((visible: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.botSim.enabled = visible;
  }, []);

  // Deploy from lobby into one of the three session types.
  const handleSelectMode = useCallback((mode: SessionMode) => {
    const engine = engineRef.current;
    setSessionMode(mode);
    setRoundWinner(null);
    setPlayerKills(0);
    setKillStreak(0);

    if (mode === 'bots') {
      setBotsEnabled(true);
      applyBotVisibility(true);
      setChatMessages(prev => [...prev, { sender: 'MATCH CONTROL', text: 'Bot Skirmish started. First to 10 eliminations wins.', time: Date.now() }]);
      requestPointerLock();
    } else if (mode === 'range') {
      setBotsEnabled(false);
      applyBotVisibility(false);
      setChatMessages(prev => [...prev, { sender: 'RANGE OFFICER', text: 'Shooting Range open. Enemies disabled — practice recoil, slides and slide-cancels freely.', time: Date.now() }]);
      requestPointerLock();
    } else {
      setBotsEnabled(false);
      applyBotVisibility(false);
      setLobbyOpen(true);
      setChatMessages(prev => [...prev, { sender: 'VANGUARD NETWORK', text: 'Private match setup. Share your room code or join a friend.', time: Date.now() }]);
    }
    if (engine) engine.isDead = false;
  }, [applyBotVisibility, requestPointerLock]);

  const handleReturnToLobby = useCallback(() => {
    setSessionMode(null);
    setLobbyOpen(false);
    setRoundWinner(null);
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  // Authoritative Player Respawn
  const handleRespawn = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const spList = engine.spawnPoints || [[0, 0, 28], [0, 0, -28], [28, 0, 0], [-28, 0, 0]];
    const nextSpawn = spList[Math.floor(Math.random() * spList.length)];

    engine.cs2MoveState = {
      position: [nextSpawn[0], 0, nextSpawn[2]],
      velocity: [0, 0, 0],
      onGround: true,
      crouchProgress: 0,
      viewHeight: WasmPhysicsCore.EYE_HEIGHT_STAND,
      stamina: 0,
      crouchFatigue: 0,
      isSliding: false,
      slideTimer: 0,
      slideCooldown: 0,
      slideCancelStreak: 0,
      cameraRoll: 0
    };

    engine.pitch = 0;
    engine.punchPitch = 0;
    engine.landingPunchY = 0;
    engine.playerHp = 100;
    engine.playerArmor = 100;
    engine.isDead = false;

    setPlayerHp(100);
    setPlayerArmor(100);
    setIsPlayerDead(false);
    setRespawnCountdown(3);

    const w = engine.weaponSystem;
    w.ammoInMag.rifle = 30;
    w.ammoInMag.railgun = 5;
    w.ammoInMag.shotgun = 30;
    w.reserveAmmo.rifle = 90;
    w.reserveAmmo.railgun = 20;
    w.reserveAmmo.shotgun = 90;
    setAmmo(w.ammoInMag[w.currentWeapon]);
    setReserveAmmo(w.reserveAmmo[w.currentWeapon]);

    setChatMessages(prev => [...prev, { sender: 'SYSTEM', text: 'Operator respawned. Health and Kevlar restored.', time: Date.now() }]);
  }, []);

  // Authoritative Player Death
  const triggerPlayerDeath = useCallback((killer: string, weaponUsed: WeaponType) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.isDead = true;
    engine.playerHp = 0;
    setIsPlayerDead(true);
    setPlayerHp(0);
    setKillerName(killer);
    setPlayerDeaths(prev => { playerDeathsRef.current = prev + 1; return prev + 1; });

    engine.audioEngine.playHitmarker(true, true);
    setKillFeed(prev => [
      {
        id: Math.random().toString(),
        killer,
        victim: 'YOU',
        weapon: weaponUsed,
        isHeadshot: true,
        time: Date.now()
      },
      ...prev.slice(0, 5)
    ]);

    let count = 3;
    setRespawnCountdown(count);
    const interval = setInterval(() => {
      count--;
      setRespawnCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        handleRespawn();
      }
    }, 1000);
  }, [handleRespawn]);

  // Initialize Core Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // 1. Real Earth Sunny Atmosphere (Outpost Mirage under bright blue skies)
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xd9cdb8, 0.0032); // Warm desert haze (sky dome supplies the background)

    const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.05, 3000);
    camera.rotation.order = 'YXZ'; // Strictly 'YXZ' to prevent any camera / crosshair roll tilt!
    camera.position.set(0, WasmPhysicsCore.EYE_HEIGHT_STAND, 28);
    scene.add(camera); // Essential for camera children (viewmodels & arms) to render in Three.js!

    // 2. High-Performance Renderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // SMAA in the post stack
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Quality & Pipeline Manager
    const qualityManager = new GraphicsQualityManager(currentPreset);
    qualityManager.attachRenderer(renderer);
    setIsWebGPU(qualityManager.isWebGPU());
    // Device acquisition is asynchronous; reflect the mandated WebGPU capability as soon as it resolves.
    const gpuStatusTimer = window.setInterval(() => {
      if (qualityManager.isWebGPU()) {
        setIsWebGPU(true);
        window.clearInterval(gpuStatusTimer);
      }
    }, 250);

    // 4. Real Earth Midday Sunlight + Warm Sky Reflections
    const skyLight = new THREE.HemisphereLight(0x8fb8e8, 0xa08a66, 0.9);
    scene.add(skyLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 3.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 8192;
    sunLight.shadow.mapSize.height = 8192;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 320;
    sunLight.shadow.camera.left = -75;
    sunLight.shadow.camera.right = 75;
    sunLight.shadow.camera.top = 75;
    sunLight.shadow.camera.bottom = -75;
    sunLight.shadow.bias = -0.00012;
    sunLight.shadow.normalBias = 0.02;
    sunLight.shadow.radius = 3;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Cinematic post stack + physical sky + PMREM environment reflections
    const pipeline = new CinematicPipeline(renderer, scene, camera, sunLight);

    // 5. WASM Physics Engine
    const wasmCore = new WasmPhysicsCore();

    // 6. Spatial Audio Engine
    const audioEngine = new SpatialAudioEngine();

    // 7. Real Earth Military Compound Map
    const mapGen = new MapGenerator(scene);
    const { spawnPoints } = mapGen.buildArena(qualityManager.getConfig().anisotropy);

    // 8. Procedural Weapon System
    const weaponSystem = new WeaponSystem(camera);

    // 9. P2P Host-Authoritative Netcode Engine
    const p2pNet = new P2PNetworkEngine();
    p2pNet.onStatusChange = (status, event) => {
      setNetworkStatus(status);
      setRoomCode(p2pNet.hostPeerId);
      setIsHostSession(p2pNet.isHost);
      setChatMessages(prev => [...prev.slice(-40), { sender: event.level === 'error' ? 'NETWORK ERROR' : 'VANGUARD NETWORK', text: event.text, time: Date.now() }]);
    };
    p2pNet.onPlayerLeft = (id) => {
      const eng = engineRef.current;
      if (!eng) return;
      const skel = eng.remoteSkeletons.get(id);
      if (skel) { eng.scene.remove(skel.root); eng.remoteSkeletons.delete(id); }
      eng.remoteMoveStates.delete(id);
      eng.remoteLastPos.delete(id);
    };
    // Host authoritative movement for remote peers: same physics step as the local player.
    p2pNet.simulateRemoteInput = (record: RemotePlayerRecord, input: PlayerInputPacket) => {
      const eng = engineRef.current;
      if (!eng) return;
      let ms = eng.remoteMoveStates.get(record.state.id);
      if (!ms) {
        ms = {
          position: [...record.state.position] as [number, number, number],
          velocity: [0, 0, 0], onGround: true, crouchProgress: 0,
          viewHeight: WasmPhysicsCore.EYE_HEIGHT_STAND, stamina: 0, crouchFatigue: 0,
          isSliding: false, slideTimer: 0, slideCooldown: 0, slideCancelStreak: 0, cameraRoll: 0
        };
        eng.remoteMoveStates.set(record.state.id, ms);
      }
      const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
      const rx = Math.cos(input.yaw), rz = -Math.sin(input.yaw);
      let wx = fx * input.moveForward + rx * input.moveRight;
      let wz = fz * input.moveForward + rz * input.moveRight;
      const len = Math.hypot(wx, wz);
      if (len > 0.001) { wx /= len; wz /= len; }
      const wishSpeed = len > 0.001 ? (input.crouch ? WasmPhysicsCore.CROUCH_SPEED : WasmPhysicsCore.MAX_GROUND_SPEED) : 0;
      const { nextState } = eng.wasmCore.stepCS2Movement(ms, [wx, 0, wz], wishSpeed, input.jump, input.crouch, input.dt, eng.mapGen.worldCollisionBoxes);
      // Arena bounds clamp (never trust the client, never let anyone leave the map)
      nextState.position[0] = Math.max(-49, Math.min(49, nextState.position[0]));
      nextState.position[2] = Math.max(-49, Math.min(49, nextState.position[2]));
      eng.remoteMoveStates.set(record.state.id, nextState);
      record.state.position = [nextState.position[0], nextState.position[1], nextState.position[2]];
      record.velocity = [nextState.velocity[0], nextState.velocity[1], nextState.velocity[2]];
      record.onGround = nextState.onGround;
    };
    p2pNet.hostRoom().catch(() => { /* status surfaced via onStatusChange */ });

    // 10. Insanely Smart Bot Simulation Engine (idle until a deployment is selected)
    const botSim = new BotSimulation(botDifficultyRef.current);
    botSim.enabled = false;

    // 11. Overloaded GPU Particle Buffer (Volumetric desert sand & dust motes)
    const pCount = 150000;
    const particleGeo = new THREE.BufferGeometry();
    const particlePosArr = new Float32Array(pCount * 3);
    const particleVelArr = new Float32Array(pCount * 3);
    const particleLifeArr = new Float32Array(pCount);
    const particleMaxLifeArr = new Float32Array(pCount);
    const particleColorArr = new Float32Array(pCount * 4);
    const particleTypeArr = new Float32Array(pCount);
    const particleSizeArr = new Float32Array(pCount);

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePosArr, 3));
    particleGeo.setAttribute('velocity', new THREE.BufferAttribute(particleVelArr, 3));
    particleGeo.setAttribute('life', new THREE.BufferAttribute(particleLifeArr, 1));
    particleGeo.setAttribute('maxLife', new THREE.BufferAttribute(particleMaxLifeArr, 1));
    particleColorArr.fill(1.0);
    particleGeo.setAttribute('particleColor', new THREE.BufferAttribute(particleColorArr, 4));
    particleGeo.setAttribute('particleType', new THREE.BufferAttribute(particleTypeArr, 1));
    particleSizeArr.fill(0.0);
    particleMaxLifeArr.fill(1.0); // avoid life/maxLife NaN in the shader for untouched slots
    for (let i = 0; i < pCount; i++) particlePosArr[i * 3 + 1] = -1000; // parked below the world
    particleGeo.setAttribute('particleSize', new THREE.BufferAttribute(particleSizeArr, 1));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: GLSL_PARTICLE_SHADERS.vertexShader,
      fragmentShader: GLSL_PARTICLE_SHADERS.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    particlePoints.frustumCulled = false;
    scene.add(particlePoints);

    engineRef.current = {
      scene,
      camera,
      renderer,
      pipeline,
      qualityManager,
      wasmCore,
      audioEngine,
      mapGen,
      weaponSystem,
      p2pNet,
      botSim,
      particleGeo,
      particlePoints,
      particlePosArr,
      particleVelArr,
      particleLifeArr,
      particleMaxLifeArr,
      particleColorArr,
      particleTypeArr,
      particleSizeArr,
      particleNextIdx: 0,
      particleActive: new Set(),
      remoteSkeletons: new Map(),
      remoteMoveStates: new Map(),
      remoteLastPos: new Map(),
      bulletTracers: [],
      cs2MoveState: {
        position: [0, 0, 28],
        velocity: [0, 0, 0],
        onGround: true,
        crouchProgress: 0,
        viewHeight: WasmPhysicsCore.EYE_HEIGHT_STAND,
        stamina: 0,
        crouchFatigue: 0,
        isSliding: false,
        slideTimer: 0,
        slideCooldown: 0,
        slideCancelStreak: 0,
        cameraRoll: 0
      },
      mouseDeltaX: 0,
      mouseDeltaY: 0,
      pitch: 0,
      yaw: 0,
      punchPitch: 0,
      landingPunchY: 0,
      footstepSoundTimer: 0,
      keysDown: new Set(),
      spawnPoints,
      playerHp: 100,
      playerArmor: 100,
      isDead: false
    };

    p2pNet.onChatMessage = (sender, text) => {
      setChatMessages(prev => [...prev, { sender, text, time: Date.now() }]);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      pipeline.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 12. Main 60Hz Render & Simulation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const dt = Math.min((time - lastTime) / 1000, 0.08);
      lastTime = time;

      const engine = engineRef.current;
      if (!engine) return;

      const { fps: curFps, frameTimeMs: curDelta } = engine.qualityManager.recordFrame(time);
      setFps(curFps);
      setFrameTimeMs(curDelta);
      const wasmStatus = engine.wasmCore.getStatus();
      setLatencyMs(wasmStatus.latencyMs);

      // Rotate hazard lights
      const tSec = time * 0.001;
      engine.mapGen.dynamicLights.forEach((light, i) => {
        const base = (light.userData.baseIntensity ??= light.intensity);
        light.intensity = base * (0.8 + 0.2 * Math.sin(tSec * 2.4 + i * 1.3));
      });

      // Update debris shards and shell casings
      engine.mapGen.updateShardsAndShells(dt);

      // Update Bullet Tracers
      for (let i = engine.bulletTracers.length - 1; i >= 0; i--) {
        const tracer = engine.bulletTracers[i];
        tracer.life -= dt;
        if (tracer.life <= 0) {
          engine.scene.remove(tracer.line);
          tracer.line.geometry.dispose();
          engine.bulletTracers.splice(i, 1);
        } else {
          (tracer.line.material as THREE.LineBasicMaterial).opacity = tracer.life / tracer.maxLife;
        }
      }

      // Age GPU particles: only iterate the active set, never the full 150k buffer.
      if (engine.particleActive.size > 0) {
        const lifeArr = engine.particleLifeArr;
        const sizeArr = engine.particleSizeArr;
        const colArr = engine.particleColorArr;
        const posArr = engine.particlePosArr;
        for (const idx of engine.particleActive) {
          const remaining = lifeArr[idx] - dt;
          if (remaining <= 0) {
            lifeArr[idx] = 0;
            sizeArr[idx] = 0;
            colArr[idx * 4 + 3] = 0;
            posArr[idx * 3 + 1] = -1000;
            engine.particleActive.delete(idx);
          } else {
            lifeArr[idx] = remaining;
            colArr[idx * 4 + 3] = Math.min(1, remaining / Math.max(engine.particleMaxLifeArr[idx], 1e-3)) * (engine.particleTypeArr[idx] === 1 ? 0.6 : 1.0);
          }
        }
        engine.particleGeo.attributes.life.needsUpdate = true;
        engine.particleGeo.attributes.particleSize.needsUpdate = true;
        engine.particleGeo.attributes.particleColor.needsUpdate = true;
        engine.particleGeo.attributes.position.needsUpdate = true;
      }

      // 13. CS2 Source-Engine Movement
      const keys = engine.keysDown;
      let wishX = 0;
      let wishZ = 0;

      if (!engine.isDead) {
        if (keys.has('KeyW')) wishZ -= 1;
        if (keys.has('KeyS')) wishZ += 1;
        if (keys.has('KeyA')) wishX -= 1;
        if (keys.has('KeyD')) wishX += 1;
      }

      const isCrouching = !engine.isDead && (keys.has('KeyC') || keys.has('ControlLeft'));
      const isShiftWalking = !engine.isDead && keys.has('ShiftLeft');
      const isJumping = !engine.isDead && keys.has('Space');

      const forward = new THREE.Vector3(-Math.sin(engine.yaw), 0, -Math.cos(engine.yaw));
      const right = new THREE.Vector3(Math.cos(engine.yaw), 0, -Math.sin(engine.yaw));

      const wishDirVec = new THREE.Vector3()
        .addScaledVector(forward, -wishZ)
        .addScaledVector(right, wishX);

      if (wishDirVec.length() > 0.001) {
        wishDirVec.normalize();
      }

      let maxSpeed = WasmPhysicsCore.MAX_GROUND_SPEED;
      if (isCrouching) maxSpeed = WasmPhysicsCore.CROUCH_SPEED;
      else if (isShiftWalking) maxSpeed = 2.4;

      const wishSpeed = wishDirVec.length() > 0 ? maxSpeed : 0;

      const { nextState, landingShock } = engine.wasmCore.stepCS2Movement(
        engine.cs2MoveState,
        [wishDirVec.x, 0, wishDirVec.z],
        wishSpeed,
        isJumping,
        isCrouching,
        dt,
        engine.mapGen.worldCollisionBoxes
      );

      engine.cs2MoveState = nextState;

      if (landingShock && !engine.isDead) {
        engine.landingPunchY = -0.1;
        engine.audioEngine.playFootstep();
        engine.botSim.registerSound(nextState.position, 'jump');
      }
      engine.landingPunchY = THREE.MathUtils.lerp(engine.landingPunchY, 0, dt * 10);

      if (!engine.isDead) {
        camera.position.set(
          nextState.position[0],
          nextState.position[1] + nextState.viewHeight + engine.landingPunchY,
          nextState.position[2]
        );
      } else {
        camera.position.set(
          nextState.position[0],
          nextState.position[1] + 0.22,
          nextState.position[2]
        );
      }

      const horizSpeed = Math.hypot(nextState.velocity[0], nextState.velocity[2]);
      setCurrentSpeed(horizSpeed);

      if (nextState.onGround && horizSpeed > 1.2 && !engine.isDead) {
        engine.footstepSoundTimer -= dt;
        const stepInterval = isShiftWalking ? 0.55 : 0.32;
        if (engine.footstepSoundTimer <= 0) {
          engine.footstepSoundTimer = stepInterval;
          engine.audioEngine.playFootstep();
          if (!isShiftWalking) {
            engine.botSim.registerSound(nextState.position, 'footstep');
          }
        }
      }

      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      engine.audioEngine.updateListener(
        [camera.position.x, camera.position.y, camera.position.z],
        [camDir.x, camDir.y, camDir.z]
      );

      // 14. Heavy CS2 Recoil Recovery (Pull-down spray compensation)
      engine.punchPitch = THREE.MathUtils.lerp(engine.punchPitch, 0, dt * 10);

      camera.rotation.order = 'YXZ';
      if (!engine.isDead) {
        camera.rotation.set(engine.pitch + engine.punchPitch, engine.yaw, 0, 'YXZ');
      } else {
        camera.rotation.set(0.25, engine.yaw, 0.45, 'YXZ');
      }

      // 15. Update Weapons & Viewmodel
      engine.weaponSystem.update(dt, engine.mouseDeltaX, engine.mouseDeltaY, horizSpeed);
      engine.mouseDeltaX = 0;
      engine.mouseDeltaY = 0;

      setAmmo(engine.weaponSystem.ammoInMag[engine.weaponSystem.currentWeapon]);
      setReserveAmmo(engine.weaponSystem.reserveAmmo[engine.weaponSystem.currentWeapon]);
      setIsReloading(engine.weaponSystem.isReloading);
      setReloadProgress(engine.weaponSystem.reloadProgress);
      setSpreadBloom(engine.weaponSystem.spreadCurrent);

      // 16. Update Insanely Smart Bots Simulation
      engine.botSim.update(
        dt,
        [camera.position.x, camera.position.y - nextState.viewHeight, camera.position.z],
        horizSpeed,
        engine.mapGen.worldCollisionBoxes,
        (bot, rayOrigin, rayDir, isHeadshotAim) => {
          if (engine.isDead) return;

          engine.audioEngine.playAssaultRifle(rayOrigin);
          engine.botSim.registerSound(rayOrigin, 'gunfire');
          spawnBulletTracer(rayOrigin, rayDir, 75, '#ff4433');

          const hit = engine.wasmCore.raycastTarget(
            rayOrigin,
            rayDir,
            [camera.position.x, camera.position.y - nextState.viewHeight, camera.position.z],
            isCrouching
          );

          if (hit.hit && hit.distance < 85) {
            const isHead = hit.part === 'head';
            const curDiff = botDifficultyRef.current;
            // Heavily nerfed bot bullet damage (casual & fair CS2 bot tuning)
            const rawDmg = isHead
              ? (curDiff === 'easy' ? 16 : curDiff === 'balanced' ? 24 : 38)
              : (curDiff === 'easy' ? 9 : curDiff === 'balanced' ? 14 : 20);

            // True CS2 Kevlar Armor absorption: absorbs 50% damage
            if (engine.playerArmor > 0) {
              const armorAbsorb = Math.min(engine.playerArmor, Math.round(rawDmg * 0.5));
              const healthDmg = rawDmg - armorAbsorb;
              engine.playerArmor = Math.max(0, engine.playerArmor - armorAbsorb);
              engine.playerHp = Math.max(0, engine.playerHp - healthDmg);
            } else {
              engine.playerHp = Math.max(0, engine.playerHp - rawDmg);
            }

            setPlayerArmor(engine.playerArmor);
            setPlayerHp(engine.playerHp);
            lastDamageTimeRef.current = Date.now();

            engine.audioEngine.playHitmarker(isHead, false);
            engine.punchPitch += 0.02; // Gentle tactical aim punch

            if (engine.playerHp <= 0 && !engine.isDead) {
              triggerPlayerDeath(bot.state.name, bot.state.currentWeapon);
            }
          }
        }
      );

      // 16.5 Out-of-Combat Field Medic Recovery (Regenerate up to 75 HP if not damaged for 4s)
      if (!engine.isDead && Date.now() - lastDamageTimeRef.current > 4000 && engine.playerHp < 75) {
        regenAccumulatorRef.current += dt;
        if (regenAccumulatorRef.current >= 0.45) {
          regenAccumulatorRef.current = 0;
          engine.playerHp = Math.min(75, engine.playerHp + 2);
          setPlayerHp(engine.playerHp);
        }
      }

      // 17. Update / Render Human Operator Skeletal Animations
      updateHumanOperatorMeshes(engine, dt);

      // 18. Networking: host broadcasts authoritative world state, clients stream inputs
      if (engine.p2pNet.isHost) {
        const combatants: PlayerNetState[] = [
          {
            id: 'local',
            name: 'YOU [HOST]',
            isHost: true,
            isBot: false,
            position: [camera.position.x, camera.position.y - nextState.viewHeight, camera.position.z],
            rotationY: engine.yaw,
            pitch: engine.pitch,
            health: engine.playerHp,
            armor: engine.playerArmor,
            kills: playerKillsRef.current,
            deaths: playerDeathsRef.current,
            ping: 0,
            currentWeapon: engine.weaponSystem.currentWeapon,
            isFiring: false,
            isCrouching,
            lastAcknowledgedTick: engine.p2pNet.currentTick
          },
          ...engine.p2pNet.getRemotePlayerStates(),
          ...(engine.botSim.enabled ? engine.botSim.bots.map(b => b.state) : [])
        ];

        setAllPlayers(combatants);
        engine.p2pNet.currentTick++;
        engine.p2pNet.broadcastSnapshot({
          tick: engine.p2pNet.currentTick,
          timestamp: time,
          players: combatants,
          events: []
        });
      } else if (engine.p2pNet.isConnected) {
        engine.p2pNet.sendInput({
          moveForward: -wishZ,
          moveRight: wishX,
          jump: isJumping,
          crouch: isCrouching,
          pitch: engine.pitch,
          yaw: engine.yaw,
          fire: false,
          weapon: engine.weaponSystem.currentWeapon,
          dt
        });

        const interp = engine.p2pNet.updateEntityInterpolation();
        const list: PlayerNetState[] = [];
        interp.forEach(p => list.push(p));
        setAllPlayers(list);

        // Light reconciliation: snap if the host disagrees with our predicted position by a lot.
        const self = interp.get(engine.p2pNet.localPeerId);
        if (self) {
          const dx = self.position[0] - nextState.position[0];
          const dz = self.position[2] - nextState.position[2];
          if (dx * dx + dz * dz > 2.5 * 2.5) {
            engine.cs2MoveState = { ...engine.cs2MoveState, position: [self.position[0], self.position[1], self.position[2]] };
          }
        }
      }

      (particleMat.uniforms.uTime as any).value = tSec;
      engine.pipeline.render(dt, time);

      setPlayerPos([camera.position.x, camera.position.y, camera.position.z]);
      setPlayerYaw(engine.yaw);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      window.clearInterval(gpuStatusTimer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      pipeline.dispose();
      renderer.dispose();
      p2pNet.destroy();
    };
  }, [fov, triggerPlayerDeath]);

  // Update Realistic Human Operators (bots on host, plus every remote peer / host-side entity)
  const updateHumanOperatorMeshes = (engine: NonNullable<typeof engineRef.current>, dt: number) => {
    const live = new Set<string>();

    const upsert = (id: string, index: number, pos: [number, number, number], rotY: number, pitch: number, crouch: boolean, dead: boolean, vel: THREE.Vector3, visible: boolean) => {
      live.add(id);
      let skel = engine.remoteSkeletons.get(id);
      if (!skel) {
        skel = HumanOperatorBuilder.createOperator(index % 2 === 1);
        engine.scene.add(skel.root);
        engine.remoteSkeletons.set(id, skel);
      }
      skel.root.visible = visible;
      skel.root.position.set(pos[0], pos[1], pos[2]);
      skel.root.rotation.y = rotY;
      HumanOperatorBuilder.updateAnimation(skel, dt, vel, crouch, pitch, dead);
    };

    // Bots (simulated locally on host)
    engine.botSim.bots.forEach((bot, index) => {
      upsert(bot.state.id, index, bot.state.position, bot.state.rotationY, bot.state.pitch, bot.state.isCrouching, bot.state.health <= 0, bot.currentVelocity, engine.botSim.enabled);
    });

    // Remote humans: host renders connected peers; clients render everyone in the snapshot except themselves.
    const remote: PlayerNetState[] = engine.p2pNet.isHost
      ? engine.p2pNet.getRemotePlayerStates()
      : Array.from(engine.p2pNet.updateEntityInterpolation().values()).filter(p => p.id !== engine.p2pNet.localPeerId);

    remote.forEach((p, i) => {
      if (!engine.p2pNet.isHost && p.isBot && !botsEnabledRef.current) return;
      const last = engine.remoteLastPos.get(p.id) || p.position;
      const vel = new THREE.Vector3((p.position[0] - last[0]) / Math.max(dt, 1e-3), 0, (p.position[2] - last[2]) / Math.max(dt, 1e-3));
      engine.remoteLastPos.set(p.id, [p.position[0], p.position[1], p.position[2]]);
      upsert(p.id, i + 7, p.position, p.rotationY, p.pitch, p.isCrouching, p.health <= 0, vel, true);
    });

    // Remove skeletons for entities that no longer exist
    engine.remoteSkeletons.forEach((skel, id) => {
      if (!live.has(id)) {
        engine.scene.remove(skel.root);
        engine.remoteSkeletons.delete(id);
        engine.remoteLastPos.delete(id);
      }
    });
  };

  const spawnBulletTracer = (
    from: [number, number, number],
    dir: [number, number, number],
    dist: number,
    color: string = '#ffe066'
  ) => {
    const engine = engineRef.current;
    if (!engine) return;

    const to = [
      from[0] + dir[0] * dist,
      from[1] + dir[1] * dist,
      from[2] + dir[2] * dist
    ];

    const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.95,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    engine.scene.add(line);

    engine.bulletTracers.push({
      line,
      life: 0.14,
      maxLife: 0.14
    });
  };

  const emitGpuParticles = (
    origin: [number, number, number],
    normal: [number, number, number],
    count: number,
    type: 0 | 1 | 2 | 3
  ) => {
    const engine = engineRef.current;
    if (!engine) return;

    const {
      particlePosArr, particleVelArr, particleLifeArr,
      particleMaxLifeArr, particleColorArr, particleTypeArr,
      particleSizeArr, particleGeo
    } = engine;

    const totalAllocated = particleLifeArr.length;

    for (let i = 0; i < count; i++) {
      const idx = engine.particleNextIdx % totalAllocated;
      engine.particleNextIdx++;
      engine.particleActive.add(idx);

      particlePosArr[idx * 3] = origin[0];
      particlePosArr[idx * 3 + 1] = origin[1];
      particlePosArr[idx * 3 + 2] = origin[2];

      const speed = type === 0 ? 12 + Math.random() * 15 : (type === 1 ? 1.5 + Math.random() * 2 : 8 + Math.random() * 8);
      particleVelArr[idx * 3] = (normal[0] + (Math.random() - 0.5) * 1.5) * speed;
      particleVelArr[idx * 3 + 1] = (normal[1] + (Math.random() - 0.5) * 1.5) * speed;
      particleVelArr[idx * 3 + 2] = (normal[2] + (Math.random() - 0.5) * 1.5) * speed;

      const maxLife = type === 1 ? 1.4 : 0.6;
      particleLifeArr[idx] = maxLife;
      particleMaxLifeArr[idx] = maxLife;

      if (type === 0) {
        particleColorArr[idx * 4] = 1.0;
        particleColorArr[idx * 4 + 1] = 0.85;
        particleColorArr[idx * 4 + 2] = 0.3;
        particleColorArr[idx * 4 + 3] = 1.0;
        particleSizeArr[idx] = 1.8;
      } else if (type === 1) {
        particleColorArr[idx * 4] = 0.45;
        particleColorArr[idx * 4 + 1] = 0.48;
        particleColorArr[idx * 4 + 2] = 0.52;
        particleColorArr[idx * 4 + 3] = 0.6;
        particleSizeArr[idx] = 4.0;
      } else if (type === 2) {
        particleColorArr[idx * 4] = 0.95;
        particleColorArr[idx * 4 + 1] = 0.05;
        particleColorArr[idx * 4 + 2] = 0.05;
        particleColorArr[idx * 4 + 3] = 1.0;
        particleSizeArr[idx] = 2.6;
      }

      particleTypeArr[idx] = type;
    }

    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.velocity.needsUpdate = true;
    particleGeo.attributes.life.needsUpdate = true;
    particleGeo.attributes.maxLife.needsUpdate = true;
    particleGeo.attributes.particleColor.needsUpdate = true;
    particleGeo.attributes.particleType.needsUpdate = true;
    particleGeo.attributes.particleSize.needsUpdate = true;
  };

  // Combat Firing with Heavy CS2 Recoil & Real Gunpowder Sound
  const handleFire = () => {
    const engine = engineRef.current;
    if (!engine || engine.isDead) return;

    const curDef = WEAPON_DEFINITIONS[engine.weaponSystem.currentWeapon];
    const minInterval = (60 / curDef.fireRateRpm) * 1000;
    if (!antiCheatRef.current.validateShot(curDef.id, minInterval)) {
      setAntiCheatStatus('FLAGGED');
      setAntiCheatViolations(antiCheatRef.current.getReport().violationsCount);
      return;
    }

    const fireResult = engine.weaponSystem.fire();
    if (!fireResult) return;

    const { def, pellets } = fireResult;

    // Authentic Gunpowder & Melee Detonation Audio
    if (def.id === 'rifle') engine.audioEngine.playAssaultRifle();
    else if (def.id === 'railgun') engine.audioEngine.playPlasmaRailgun();
    else if (def.id === 'shotgun') engine.audioEngine.playShotgun();
    else if (def.id === 'pistol') engine.audioEngine.playAssaultRifle();
    else if (def.id === 'melee') engine.audioEngine.playFootstep();
    else if (def.id === 'rpg') engine.audioEngine.playExplosion([engine.camera.position.x, engine.camera.position.y, engine.camera.position.z]);

    // Heavy CS2 Recoil Pitch Punch (Kicks view up! Player pulls down mouse to spray control)
    engine.punchPitch += def.recoilKickPitch * 0.65;

    engine.botSim.registerSound(
      [engine.camera.position.x, engine.camera.position.y, engine.camera.position.z],
      'gunfire'
    );

    // Eject Brass Shell Casing
    const cam = engine.camera;
    const camForward = new THREE.Vector3();
    cam.getWorldDirection(camForward);
    const camRight = new THREE.Vector3(camForward.z, 0, -camForward.x).normalize();
    const camUp = new THREE.Vector3().crossVectors(camRight, camForward).normalize();

    const chamberPos = cam.position.clone()
      .addScaledVector(camForward, 0.4)
      .addScaledVector(camRight, 0.22)
      .addScaledVector(camUp, -0.15);

    engine.mapGen.spawnShellCasing(chamberPos, camRight, camUp);

    const rayOrigin: [number, number, number] = [cam.position.x, cam.position.y, cam.position.z];

    for (let p = 0; p < pellets; p++) {
      const spread = (Math.random() - 0.5) * engine.weaponSystem.spreadCurrent;
      const spreadY = (Math.random() - 0.5) * engine.weaponSystem.spreadCurrent;

      const finalDir = camForward.clone()
        .addScaledVector(camRight, spread)
        .addScaledVector(camUp, spreadY)
        .normalize();

      const dirTuple: [number, number, number] = [finalDir.x, finalDir.y, finalDir.z];

      spawnBulletTracer(rayOrigin, dirTuple, def.range, def.color);

      let closestHitDist = def.range;
      let hitBot: SmartBotEntity | null = null;
      let hitPart: 'head' | 'torso' | 'limbs' | 'none' = 'none';

      for (const bot of engine.botSim.bots) {
        if (bot.state.health <= 0) continue;
        const hitRes = engine.wasmCore.raycastTarget(
          rayOrigin,
          dirTuple,
          bot.state.position,
          bot.state.isCrouching
        );

        if (hitRes.hit && hitRes.distance < closestHitDist) {
          closestHitDist = hitRes.distance;
          hitBot = bot;
          hitPart = hitRes.part;
        }
      }

      for (const [id, crate] of engine.mapGen.destructibles) {
        if (crate.isDestroyed) continue;
        const dist = engine.wasmCore.rayAABBIntersect(
          rayOrigin[0], rayOrigin[1], rayOrigin[2],
          dirTuple[0], dirTuple[1], dirTuple[2],
          crate.box
        );

        if (dist > 0 && dist < closestHitDist) {
          closestHitDist = dist;
          hitBot = null;
          const hitPoint = cam.position.clone().addScaledVector(finalDir, dist);
          const shattered = engine.mapGen.damageDestructible(id, def.damage, hitPoint);
          if (shattered) {
            engine.audioEngine.playExplosion([hitPoint.x, hitPoint.y, hitPoint.z]);
            emitGpuParticles([hitPoint.x, hitPoint.y, hitPoint.z], [0, 1, 0], 35, 0);
            awardXp(50, 'OBJECT DESTROYED');
          } else {
            engine.mapGen.spawnBulletDecal(hitPoint, new THREE.Vector3(0, 0, 1));
          }
        }
      }

      // Hit Registration & XP Rewards
      if (hitBot && hitBot.state.health > 0) {
        const isHeadshot = hitPart === 'head';
        const mult = isHeadshot ? def.headshotMultiplier : (hitPart === 'limbs' ? 0.8 : 1.0);
        const finalDmg = Math.round(def.damage * mult);

        hitBot.state.health = Math.max(0, hitBot.state.health - finalDmg);
        engine.botSim.applyStagger(hitBot.state.id); // Stagger & flinch bot on hit!

        setHitmarker(isHeadshot ? 'headshot' : 'body');
        setTimeout(() => setHitmarker(null), 120);
        engine.audioEngine.playHitmarker(isHeadshot, false);

        // Award damage XP
        awardXp(isHeadshot ? 45 : 20, isHeadshot ? 'CRITICAL HIT' : 'HIT CONFIRMED');

        emitGpuParticles(hitBot.state.position, [0, 1, 0], isHeadshot ? 35 : 18, 2);

        const dmgId = Math.random().toString(36);
        setFloatingDamages(prev => [
          ...prev,
          {
            id: dmgId,
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
            y: window.innerHeight / 2 - 40 + (Math.random() - 0.5) * 30,
            damage: finalDmg,
            isHeadshot,
            opacity: 1
          }
        ]);
        setTimeout(() => {
          setFloatingDamages(prev => prev.filter(d => d.id !== dmgId));
        }, 800);

        // BOT ELIMINATED!
        if (hitBot.state.health <= 0) {
          hitBot.state.deaths++;
          setPlayerKills(prev => { playerKillsRef.current = prev + 1; return prev + 1; });

          // Killstreak & Rival Coin Rewards
          setKillStreak(prev => prev + 1);
          handleAwardCoins(isHeadshot ? 100 : 50, isHeadshot ? 'Headshot Kill' : 'Enemy Eliminated');

          // Match Victory Check (10 Kills)
          if (playerKills + 1 >= 10 && !roundWinner) {
            setRoundWinner('VICTORY');
            handleAwardCoins(250, 'MATCH WINNER BONUS');
            awardXp(500, 'MATCH VICTORY');
          }

          // Adrenaline Surge: Restore HP & Armor on kill!
          engine.playerHp = Math.min(100, engine.playerHp + 25);
          engine.playerArmor = Math.min(100, engine.playerArmor + 15);
          setPlayerHp(engine.playerHp);
          setPlayerArmor(engine.playerArmor);

          // Generous XP Reward!
          awardXp(150, 'ENEMY ELIMINATED');
          awardXp(25, '+25 HP ADRENALINE SURGE');
          if (isHeadshot) {
            awardXp(150, 'HEADSHOT BONUS');
          }

          setKillFeed(prev => [
            {
              id: Math.random().toString(),
              killer: 'YOU',
              victim: hitBot.state.name,
              weapon: def.id,
              isHeadshot,
              time: Date.now()
            },
            ...prev.slice(0, 5)
          ]);

          const skel = engine.remoteSkeletons.get(hitBot.state.id);
          if (skel) {
            skel.isDead = true;
          }

          setTimeout(() => {
            const spawnPos: [number, number, number] = [
              (Math.random() - 0.5) * 55,
              0,
              (Math.random() - 0.5) * 55
            ];
            engine.botSim.respawnBot(hitBot.state.id, spawnPos);
            if (skel) {
              skel.isDead = false;
            }
          }, 3000);
        }
      } else {
        const hitPoint = cam.position.clone().addScaledVector(finalDir, closestHitDist);
        engine.mapGen.spawnBulletDecal(hitPoint, new THREE.Vector3(0, 0, 1));
        emitGpuParticles([hitPoint.x, hitPoint.y, hitPoint.z], [0, 1, 0], 14, 0);
      }
    }
  };

  const handleCanvasClick = () => {
    if (!sessionModeRef.current) return; // Lobby owns the screen until a mode is chosen.
    if (settingsOpen || shopOpen || lobbyOpen) return;
    requestPointerLock();
  };

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      setIsPointerLocked(locked);
      if (!locked) {
        lastPointerLockExit.current = Date.now();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvasRef.current) return;
      const engine = engineRef.current;
      if (!engine || engine.isDead) return;

      const sens = 0.0022 * mouseSens;
      engine.yaw -= e.movementX * sens;
      engine.pitch -= e.movementY * sens;
      engine.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, engine.pitch));

      engine.mouseDeltaX = e.movementX;
      engine.mouseDeltaY = e.movementY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvasRef.current) return;
      if (!sessionModeRef.current) return;
      if (e.button === 0) {
        handleFire();
      } else if (e.button === 2) {
        e.preventDefault();
        const engine = engineRef.current;
        if (engine && !engine.isDead) {
          engine.weaponSystem.isADS = true;
          setIsADS(true);
          engine.camera.fov = engine.weaponSystem.currentWeapon === 'railgun' ? 35 : fov - 18;
          engine.camera.updateProjectionMatrix();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        const engine = engineRef.current;
        if (engine) {
          engine.weaponSystem.isADS = false;
          setIsADS(false);
          engine.camera.fov = fov;
          engine.camera.updateProjectionMatrix();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (!sessionModeRef.current) return;
      const typing = (e.target as HTMLElement | null)?.tagName === 'INPUT' || (e.target as HTMLElement | null)?.tagName === 'TEXTAREA';
      if (typing) return;

      engine.keysDown.add(e.code);

      if (e.code === 'Space' && engine.isDead) {
        handleRespawn();
      } else if (e.code === 'KeyR' && !engine.isDead) {
        engine.weaponSystem.reload();
      } else if (e.code === 'Digit1' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('rifle');
        setCurrentWeapon('rifle');
      } else if (e.code === 'Digit2' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('railgun');
        setCurrentWeapon('railgun');
      } else if (e.code === 'Digit3' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('shotgun');
        setCurrentWeapon('shotgun');
      } else if (e.code === 'Digit4' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('pistol');
        setCurrentWeapon('pistol');
      } else if (e.code === 'Digit5' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('melee');
        setCurrentWeapon('melee');
      } else if (e.code === 'Digit6' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('rpg');
        setCurrentWeapon('rpg');
      } else if (e.code === 'Digit7' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('smg');
        setCurrentWeapon('smg');
      } else if (e.code === 'Digit8' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('revolver');
        setCurrentWeapon('revolver');
      } else if (e.code === 'Digit9' && !engine.isDead) {
        engine.weaponSystem.switchWeapon('crossbow');
        setCurrentWeapon('crossbow');
      } else if (e.code === 'KeyB' && !engine.isDead) {
        setShopOpen(true);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const engine = engineRef.current;
      if (!engine || engine.isDead) return;
      const arsenal: WeaponType[] = ['rifle', 'railgun', 'shotgun', 'pistol', 'melee', 'rpg', 'smg', 'revolver', 'crossbow'];
      const curIdx = arsenal.indexOf(engine.weaponSystem.currentWeapon);
      const nextIdx = e.deltaY > 0 ? (curIdx + 1) % arsenal.length : (curIdx - 1 + arsenal.length) % arsenal.length;
      const nextW = arsenal[nextIdx];
      engine.weaponSystem.switchWeapon(nextW);
      setCurrentWeapon(nextW);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.keysDown.delete(e.code);
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [mouseSens, fov, handleRespawn]);

  const handleSendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');
      if (cmd === 'bot') {
        engineRef.current?.botSim.spawnInsaneBots(1);
        setChatMessages(prev => [...prev, { sender: 'SYSTEM', text: 'Human Operator deployed to arena.', time: Date.now() }]);
      } else if (cmd === 'xp') {
        awardXp(500, 'TEST XP BONUS');
      } else if (cmd === 'fps') {
        setChatMessages(prev => [...prev, { sender: 'SYSTEM', text: `Engine FPS: ${fps} (${frameTimeMs.toFixed(1)}ms)`, time: Date.now() }]);
      } else if (cmd === 'quality') {
        const next = (args[0] as GraphicsPreset) || 'overdrive';
        handleSelectPreset(next);
      } else if (cmd === 'overdrive') {
        handleSelectPreset('overdrive');
      } else if (cmd === 'reset') {
        handleRespawn();
      } else {
        setChatMessages(prev => [...prev, { sender: 'SYSTEM', text: 'Commands: /bot, /xp, /overdrive, /quality, /reset, /fps', time: Date.now() }]);
      }
      return;
    }

    engineRef.current?.p2pNet.sendChatMessage(trimmed, 'COMMANDER');
    setChatMessages(prev => [...prev, { sender: 'COMMANDER', text: trimmed, time: Date.now() }]);
  };

  const handleSelectPreset = (preset: GraphicsPreset) => {
    setCurrentPreset(preset);
    if (engineRef.current) {
      const conf = engineRef.current.qualityManager.applyConfiguration(preset);
      setActiveParticles(conf.maxComputeParticles);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-mono select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-crosshair"
      />

      {!webGPUCapable && sessionMode && (
        <div className="absolute inset-x-0 top-0 z-[70] bg-red-950/95 border-b border-red-400 px-4 py-3 text-center text-xs text-red-100">
          <b>WEBGPU REQUIRED:</b> This competitive build mandates a WebGPU-capable browser and GPU. Enable WebGPU or use a current Chromium-based browser.
        </div>
      )}

      {!sessionMode && (
        <MainLobby
          playerLevel={playerLevel}
          rankName={MILITARY_RANKS[Math.min(playerLevel - 1, MILITARY_RANKS.length - 1)]}
          xp={playerXp}
          xpToNextLevel={xpToNextLevel}
          coins={coins}
          kills={playerKills}
          deaths={playerDeaths}
          webGPUCapable={webGPUCapable}
          isWebGPU={isWebGPU}
          networkStatus={networkStatus === 'connected' ? 'online' : networkStatus === 'connecting' || networkStatus === 'idle' ? 'connecting' : 'offline'}
          weaponCount={Object.keys(WEAPON_DEFINITIONS).length}
          arenaCount={ARENA_PLAYLIST_COUNT}
          onSelectMode={handleSelectMode}
          onOpenArmory={() => setShopOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {sessionMode && !isPointerLocked && !isPlayerDead && !settingsOpen && !shopOpen && !lobbyOpen && !roundWinner && (
        <PauseOverlay
          mode={sessionMode}
          onResume={requestPointerLock}
          onReturnToLobby={handleReturnToLobby}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLobby={() => setLobbyOpen(true)}
        />
      )}

      {sessionMode && <TacticalHUD
        health={playerHp}
        armor={playerArmor}
        ammo={ammo}
        reserveAmmo={reserveAmmo}
        weapon={currentWeapon}
        isReloading={isReloading}
        reloadProgress={reloadProgress}
        spreadBloom={spreadBloom}
        isADS={isADS}
        hitmarkerState={hitmarker}
        floatingDamages={floatingDamages}
        killFeed={killFeed}
        playerPos={playerPos}
        playerYaw={playerYaw}
        allPlayers={allPlayers}
        fps={fps}
        frameTimeMs={frameTimeMs}
        latencyMs={latencyMs}
        activeParticles={activeParticles}
        preset={currentPreset}
        isWebGPU={isWebGPU}
        isHost={isHostSession}
        roomId={roomCode}
        onSendChat={handleSendChat}
        chatMessages={chatMessages}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLobby={() => setLobbyOpen(true)}
        currentSpeed={currentSpeed}
        isDead={isPlayerDead}
        killerName={killerName}
        respawnCountdown={respawnCountdown}
        onRespawn={handleRespawn}
        xp={playerXp}
        level={playerLevel}
        rankName={MILITARY_RANKS[Math.min(playerLevel - 1, MILITARY_RANKS.length - 1)]}
        xpToNextLevel={xpToNextLevel}
        xpGains={xpGains}
        levelUpNotification={levelUpNotification}
        botDifficulty={botDifficulty}
        onToggleBotDifficulty={handleCycleBotDifficulty}
        coins={coins}
        activeSkinName={SHOP_SKINS[activeSkin]?.name || 'Standard'}
        antiCheatStatus={antiCheatStatus}
        antiCheatViolations={antiCheatViolations}
        botsEnabled={botsEnabled}
        onToggleBots={handleToggleBots}
        onOpenShop={() => setShopOpen(true)}
        killStreak={killStreak}
        onSelectWeaponSlot={handleSelectWeapon}
      />}

      <ShopModal
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        shop={shopRef.current}
        onSkinChanged={handleSkinChanged}
        onHatChanged={handleHatChanged}
        currentWeapon={currentWeapon}
        onSelectWeapon={handleSelectWeapon}
      />

      {roundWinner && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
          <div className="bg-zinc-950 border-2 border-amber-500 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(245,158,11,0.5)]">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 animate-pulse" />
            <h2 className="text-3xl font-black text-white tracking-widest mb-1">MATCH VICTORY!</h2>
            <p className="text-xs text-amber-400 font-bold mb-4">10 ELIMINATIONS DOMINATION REACHED</p>
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 mb-6">
              <div className="text-sm font-black text-white">+250 RIVAL COINS &bull; +500 XP</div>
              <div className="text-[11px] text-zinc-400 mt-1">Kills: {playerKills} | Deaths: {playerDeaths} | Spree: {killStreak}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setRoundWinner(null);
                  setPlayerKills(0);
                  setKillStreak(0);
                  requestPointerLock();
                }}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-xl transition shadow-[0_0_20px_#f59e0b] cursor-pointer"
              >
                NEXT ROUND
              </button>
              <button
                onClick={handleReturnToLobby}
                className="py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 font-black text-sm rounded-xl transition cursor-pointer"
              >
                LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        mouseSens={mouseSens}
        onMouseSensChange={setMouseSens}
        fov={fov}
        onFovChange={setFov}
        masterVol={masterVol}
        onMasterVolChange={(vol) => {
          setMasterVol(vol);
          engineRef.current?.audioEngine.setMasterVolume(vol);
        }}
        isWebGPU={isWebGPU}
        botDifficulty={botDifficulty}
        onBotDifficultyChange={handleSetBotDifficulty}
      />

      <LobbyModal
        isOpen={lobbyOpen}
        onClose={() => { setLobbyOpen(false); if (sessionMode === 'friends') requestPointerLock(); }}
        roomId={roomCode}
        isHost={isHostSession}
        isConnected={networkStatus === 'connected'}
        networkStatus={networkStatus}
        allPlayers={allPlayers}
        onHostNewRoom={() => {
          const engine = engineRef.current;
          if (!engine) return;
          engine.remoteSkeletons.forEach(sk => engine.scene.remove(sk.root));
          engine.remoteSkeletons.clear();
          engine.remoteMoveStates.clear();
          engine.p2pNet.hostRoom().catch(() => {});
        }}
        onJoinRoom={async (code) => {
          const engine = engineRef.current;
          if (!engine) return;
          engine.remoteSkeletons.forEach(sk => engine.scene.remove(sk.root));
          engine.remoteSkeletons.clear();
          engine.remoteMoveStates.clear();
          const ok = await engine.p2pNet.joinRoom(code);
          if (ok) {
            setBotsEnabled(false);
            applyBotVisibility(false);
            if (!sessionModeRef.current) setSessionMode('friends');
            setLobbyOpen(false);
            requestPointerLock();
          }
        }}
        onAddBot={() => {
          const engine = engineRef.current;
          if (!engine) return;
          engine.botSim.spawnInsaneBots(1);
          setBotsEnabled(true);
          applyBotVisibility(true);
        }}
      />
    </div>
  );
}
