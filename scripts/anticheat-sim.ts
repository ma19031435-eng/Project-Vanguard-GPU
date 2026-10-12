import { SentinelAntiCheat } from '../src/engine/anticheat/SentinelAntiCheat.ts';
const results: string[] = [];
const check = (name: string, ok: boolean, info = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };

// 1. Honest player: 60 Hz, human aim noise, occasional lag spike, semi-auto fire with human jitter
{
  const ac = new SentinelAntiCheat(0); let t = 0, tick = 0; let yaw = 0, pitch = 0; let kicks = 0;
  ac.onBlock = () => kicks++;
  let lastFire = -1e9; let pos: [number,number,number] = [0,0,0];
  for (let i = 0; i < 60 * 120; i++) { // 2 minutes
    const lag = i % 900 === 0 ? 400 : 0; // periodic 400 ms hitch
    t += 16.7 + lag; tick++;
    yaw += (Math.random() - 0.5) * 0.3 + (i % 300 === 0 ? 2.0 : 0); // occasional 115° flick
    pitch = Math.max(-1.4, Math.min(1.4, pitch + (Math.random() - 0.5) * 0.1));
    const fire = (t - lastFire) > 320 + Math.random() * 200 && Math.random() < 0.3;
    if (fire) lastFire = t;
    const v = ac.inspectInput('p1', { tick, dt: Math.min(0.05, (16.7 + lag) / 1000), yaw, pitch, fire, weapon: 'pistol', moveForward: 1, moveRight: 0 }, t);
    if (!v.accept) results.push('note honest packet dropped at ' + i);
    pos = [pos[0] + 6 * 0.0167, 0, pos[2]]; if (Math.abs(pos[0]) > 40) { pos[0] = -40; ac.notifyTeleport("p1"); }
    ac.observeSimulatedState('p1', pos, i % 120 < 30 ? false : true, t); // jumps
  }
  const r = ac.getSubjectReport('p1')!;
  check('honest player stays CLEAN', r.trust === 'CLEAN', `(trust=${r.trust} susp=${r.suspicion} viol=${r.violations})`);
  check('honest player never kicked', kicks === 0);
}

// 2. Speed hack via dt inflation
{
  const ac = new SentinelAntiCheat(0); let t = 0, tick = 0; let kicked = false; ac.onBlock = () => kicked = true;
  let dropped = 0;
  for (let i = 0; i < 60 * 20; i++) { t += 16.7; tick++;
    const v = ac.inspectInput('h', { tick, dt: 0.05, yaw: 0, pitch: 0, fire: false, weapon: 'rifle', moveForward: 1, moveRight: 0 }, t);
    if (v.dt < 0.049) dropped++;
  }
  const r = ac.getSubjectReport('h')!;
  check('dt inflation detected', r.violations > 0 && dropped > 0, `(trust=${r.trust} susp=${r.suspicion} scaled=${dropped})`);
}

// 3. Aimbot: snap+instant fire repeatedly
{
  const ac = new SentinelAntiCheat(0); let t = 0, tick = 0; let kicked = false; ac.onBlock = () => kicked = true;
  let yaw = 0;
  for (let i = 0; i < 60 * 30 && !kicked; i++) { t += 16.7; tick++;
    const snap = i % 40 === 0; if (snap) yaw += 3.0;
    ac.inspectInput('bot', { tick, dt: 0.0167, yaw, pitch: 0, fire: snap, weapon: 'railgun', moveForward: 0, moveRight: 0 }, t);
    if (snap) ac.inspectInput('bot', { tick: ++tick, dt: 0.0167, yaw, pitch: 0, fire: false, weapon: 'railgun', moveForward: 0, moveRight: 0 }, t += 16.7);
  }
  const r = ac.getSubjectReport('bot')!;
  check('aimbot escalates to FLAGGED/BLOCKED', r.trust === 'FLAGGED' || r.trust === 'BLOCKED', `(trust=${r.trust} susp=${r.suspicion})`);
}

// 4. Rapid-fire macro on pistol (280 rpm => 214 ms) firing every 50 ms
{
  const ac = new SentinelAntiCheat(0); let t = 0, tick = 0; let shotsAllowed = 0;
  for (let i = 0; i < 400; i++) { t += 50; tick++;
    const v = ac.inspectInput('m', { tick, dt: 0.05, yaw: 0, pitch: 0, fire: i % 2 === 0, weapon: 'pistol', moveForward: 0, moveRight: 0 }, t);
    if (v.fire) shotsAllowed++;
  }
  const r = ac.getSubjectReport('m')!;
  check('macro fire sanitised', shotsAllowed <= 100 && r.violations > 0, `(allowed=${shotsAllowed}/200 trust=${r.trust})`);
}

// 5. Trigger bot: perfectly regular 250 ms clicks on revolver
{
  const ac = new SentinelAntiCheat(0); let t = 0, tick = 0;
  for (let i = 0; i < 300; i++) { t += 160; tick++;
    ac.inspectInput('tb', { tick, dt: 0.05, yaw: 0, pitch: 0, fire: i % 2 === 0, weapon: 'revolver', moveForward: 0, moveRight: 0 }, t);
  }
  const r = ac.getSubjectReport('tb')!;
  check('trigger-bot cadence detected', r.recent.some(v => v.kind === 'TRIGGER_BOT') || r.violations > 0, `(trust=${r.trust})`);
}

// 6. Teleport + fly via simulated-state observation
{
  const ac = new SentinelAntiCheat(0); let t = 0; let kicked = false; ac.onBlock = () => kicked = true;
  for (let i = 0; i < 300; i++) { t += 16.7; ac.observeSimulatedState('tp', [i % 20 === 0 ? 30 : 0, 8, 0], false, t); }
  const r = ac.getSubjectReport('tp')!;
  check('teleport/fly escalates', r.trust !== 'CLEAN', `(trust=${r.trust} susp=${r.suspicion} kicked=${kicked})`);
}

// 7. Garbage never throws
{
  const ac = new SentinelAntiCheat(0);
  const junk: any[] = [null, undefined, {}, { tick: NaN }, { tick: 1, dt: Infinity, yaw: 'x', pitch: {}, fire: 1, weapon: 5 }, { tick: -1e308, dt: -1, yaw: 1e308, pitch: -1e308, fire: true, weapon: 'nope', moveForward: NaN, moveRight: 'a' }];
  let threw = false;
  try {
    for (const j of junk) { ac.inspectInput('g', j, 0); ac.inspectInput('g', j, NaN as any); }
    ac.observeSimulatedState('g', [NaN, 1, 2] as any, true, 5);
    ac.validateMovement([NaN, NaN, NaN] as any, 0.016, true);
    ac.validateShot('x' as any, NaN);
    ac.validateRotation(NaN, NaN);
    ac.getReport(); ac.getSubjectReport('zzz'); ac.forgetSubject('zzz');
  } catch (e) { threw = true; console.error(e); }
  check('garbage input never throws', !threw);
}

// 8. Memory bounded
{
  const ac = new SentinelAntiCheat(0); let t = 0;
  for (let i = 0; i < 200000; i++) { t += 16.7; ac.inspectInput('mem', { tick: i, dt: 0.0167, yaw: Math.random() * 7, pitch: 0, fire: i % 3 === 0, weapon: 'smg', moveForward: 0, moveRight: 0 }, t); }
  const r = ac.getSubjectReport('mem')!;
  check('200k packets processed, bounded buffers', r.recent.length <= 6, `(trust=${r.trust})`);
}

console.log(results.join('\n'));
if (results.some(r => r.startsWith('FAIL'))) process.exit(1);
