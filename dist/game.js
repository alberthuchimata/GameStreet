'use strict';
/* =========================================================
   MIAMI FIGHTER — jogo completo
   Fluxo: Studio -> Title -> Select (1/2, 2/2) -> VS -> Fight -> Win / Continue
   Lógica de luta em frames fixos a 60 fps.
   Coordenadas "fonte" = sprite 512x768 (pé em y=700, centro x=256).
   ========================================================= */
const W = 1280, H = 720, SIZE = 1.12, DS = 0.5 * SIZE;
const WALL_L = 70, WALL_R = 1210, PUSH_HALF = 52 * SIZE;
let FLOOR = 652;
const DATA = window.MF_DATA.chars;

const ROSTER = [
  { id: 'birrow', name: 'BIRROW', style: 'RHYTHM · SPEED', stage: 'ocean_drive', special: 'NEON BEAT' },
  { id: 'hector', name: 'HECTOR', style: 'KICKBOXING · BASS', stage: 'coral_gables', special: 'PATRON FLAME' },
  { id: 'halfred', name: 'HALFRED', style: 'ENERGY · RUSH', stage: 'coral_way', special: 'VOLT RUSH' },
  { id: 'cesar', name: 'CESAR', style: 'REACH · HARMONY', stage: 'coconut_grove', special: 'HARMONY WAVE' },
  { id: 'galego', name: 'EL GALEGO', style: 'RUMBA · PRESSURE', stage: 'havana', special: 'RUMBA STORM' },
  { id: 'alberth', name: 'ALBERTH BJJ', style: 'JIU-JITSU · THROWS', stage: 'brickell', special: 'NEON UCHIMATA', kd: 'thrown_forward' },
  { id: 'matheus', name: 'MATHEUS BR', style: 'STRIKES · REVIVAL', stage: 'port_miami', special: 'HARBOR REVIVAL', height: 1.06 }
];
const RB = Object.fromEntries(ROSTER.map(r => [r.id, r]));
const STAGES = {
  ocean_drive: { name: 'OCEAN DRIVE', tag: 'OCEAN DRIVE', floor: 646, dot: [1132, 333] },
  coral_gables: { name: 'CORAL GABLES', tag: 'CORAL GABLES', floor: 652, dot: [824, 445] },
  coral_way: { name: 'CORAL WAY', tag: 'CORAL WAY', floor: 640, dot: [865, 305] },
  coconut_grove: { name: 'COCONUT GROVE', tag: 'COCONUT GROVE', floor: 652, dot: [908, 396] },
  havana: { name: 'HAVANA, CUBA', tag: 'HAVANA', floor: 652, dot: [1020, 505] },
  brickell: { name: 'BRICKELL ROOFTOP', tag: 'BRICKELL', floor: 632, dot: [738, 283] },
  port_miami: { name: 'PORT OF MIAMI', tag: 'PORT OF MIAMI', floor: 652, dot: [1065, 412] }
};
const LOCKED_DOT = [1018, 284];
const AIR_ANIMS = new Set(['jump_vertical', 'jump_diagonal_forward', 'jump_diagonal_backward', 'jump_attack_medium', 'jump_attack_strong']);
const FALLBACK = { crouch_kick_strong_sweep: 'crouch_kick_medium', throw_back_counter: 'throw_front', crouch_hold: 'crouch_block_low' };

/* Frame data (60 fps) */
const MOVES = {
  stMP: { anim: 'stand_punch_medium', su: 5, ac: 3, rc: 10, dmg: 50, hs: 17, bs: 13, stop: 8, lvl: 'mid', push: 9, sfx: 'light' },
  stHP: { anim: 'stand_punch_strong', su: 8, ac: 3, rc: 18, dmg: 90, hs: 21, bs: 16, stop: 11, lvl: 'mid', push: 11, heavy: 1, sfx: 'heavy' },
  stMK: { anim: 'stand_kick_medium', su: 7, ac: 3, rc: 14, dmg: 60, hs: 18, bs: 14, stop: 9, lvl: 'mid', push: 10, sfx: 'light' },
  stHK: { anim: 'stand_kick_strong', su: 10, ac: 4, rc: 21, dmg: 100, hs: 22, bs: 17, stop: 12, lvl: 'mid', push: 12, heavy: 1, sfx: 'heavy' },
  crMP: { anim: 'crouch_punch_medium', su: 5, ac: 3, rc: 10, dmg: 45, hs: 16, bs: 12, stop: 8, lvl: 'mid', push: 9, sfx: 'light' },
  crHP: { anim: 'crouch_punch_strong', su: 6, ac: 5, rc: 22, dmg: 90, hs: 21, bs: 15, stop: 11, lvl: 'mid', push: 10, heavy: 1, sfx: 'heavy' },
  crMK: { anim: 'crouch_kick_medium', su: 6, ac: 3, rc: 13, dmg: 50, hs: 17, bs: 13, stop: 8, lvl: 'low', push: 9, sfx: 'light' },
  crHK: { anim: 'crouch_kick_strong_sweep', su: 9, ac: 4, rc: 25, dmg: 85, hs: 0, bs: 14, stop: 11, lvl: 'low', push: 8, kd: 'ko_fall', heavy: 1, sfx: 'heavy' },
  jM: { anim: 'jump_attack_medium', su: 5, ac: 10, rc: 0, dmg: 60, hs: 18, bs: 14, stop: 9, lvl: 'high', push: 7, air: 1, sfx: 'light' },
  jH: { anim: 'jump_attack_strong', su: 7, ac: 8, rc: 0, dmg: 85, hs: 21, bs: 16, stop: 11, lvl: 'high', push: 8, air: 1, heavy: 1, sfx: 'heavy' },
  sp: { anim: 'special', su: 12, ac: 6, rc: 28, dmg: 220, hs: 0, bs: 18, stop: 14, lvl: 'mid', push: 10, kd: 'special', chip: 0.25, cost: 100, inv: 12, heavy: 1, sfx: 'heavy' }
};
const THROW = { su: 3, range: 118 * SIZE, whiff: 22, len: 48, dmg: 120, tech: 8 };
const COMBO_SCALE = [1, 1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];

/* ---------- Canvas / imagens ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const IMG = {};
function loadImg(key, src) {
  return new Promise(res => { const i = new Image(); i.onload = () => { IMG[key] = i; res(); }; i.onerror = () => { console.error('falhou', src); res(); }; i.src = src; });
}

/* ---------- Áudio ---------- */
const Audio2 = {
  ctx: null, master: null, musicGain: null, sfxGain: null, muted: false, files: {},
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.5; this.sfxGain.connect(this.master);
    Music.start();
  },
  file(name, vol = 0.7) {
    if (this.muted) return;
    const base = this.files[name] || (this.files[name] = new Audio(`audio/${name}.mp3`));
    const a = base.cloneNode(); a.volume = vol; a.play().catch(() => { });
  },
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.9; },
  tone(type, f0, f1, dur, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq = 1200, q = 0.8, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when, n = Math.floor(this.ctx.sampleRate * dur);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t);
  },
  sfx(name) {
    switch (name) {
      case 'move': this.tone('square', 880, 1320, 0.05, 0.12); break;
      case 'back': this.tone('square', 520, 260, 0.09, 0.12); break;
      case 'deny': this.tone('sawtooth', 160, 120, 0.16, 0.14); break;
      case 'whoosh': this.noise(0.09, 0.25, 2600, 0.7); break;
      case 'light': this.noise(0.08, 0.9, 900, 1.2); this.tone('sine', 190, 70, 0.08, 0.5); break;
      case 'heavy': this.noise(0.14, 1.1, 600, 1); this.tone('sine', 140, 45, 0.18, 0.8); break;
      case 'block': this.noise(0.06, 0.6, 3200, 3); this.tone('square', 1400, 900, 0.04, 0.08); break;
      case 'jump': this.tone('triangle', 300, 520, 0.08, 0.12); break;
      case 'land': this.noise(0.05, 0.25, 400, 1); break;
      case 'throw': this.noise(0.2, 1, 350, 0.8); this.tone('sine', 110, 40, 0.25, 0.9); break;
      case 'special': this.tone('sawtooth', 220, 880, 0.35, 0.18); this.tone('square', 330, 1320, 0.35, 0.1, 0.05); break;
      case 'ko': this.tone('sawtooth', 300, 50, 0.9, 0.25); this.noise(0.5, 0.8, 300, 0.7); break;
      case 'bell': for (let i = 0; i < 3; i++) this.tone('triangle', 1760, 1700, 0.25, 0.2, i * 0.12); break;
    }
  }
};
/* Música sintetizada (sequenciador simples) */
const Music = {
  track: null, step: 0, next: 0, timer: null,
  TRACKS: {
    menu: { bpm: 112, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] },
    fight: { bpm: 142, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]] },
    win: { bpm: 120, chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]] }
  },
  start() { if (this.timer) return; this.timer = setInterval(() => this.tick(), 25); },
  play(name) {
    if (this.track === name) return;
    this.track = name; this.step = 0;
    if (Audio2.ctx) this.next = Audio2.ctx.currentTime + 0.08;
  },
  tick() {
    const A = Audio2.ctx; if (!A || !this.track) return;
    const T = this.TRACKS[this.track], s16 = 60 / T.bpm / 4;
    if (this.next < A.currentTime) this.next = A.currentTime + 0.05;
    while (this.next < A.currentTime + 0.15) { this.note(T, this.step, this.next, s16); this.next += s16; this.step++; }
  },
  note(T, step, t, s16) {
    const A = Audio2.ctx, bar = Math.floor(step / 16) % 4, pos = step % 16, ch = T.chords[bar];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const voice = (type, m, dur, vol, cutoff) => {
      const o = A.createOscillator(), g = A.createGain(), f = A.createBiquadFilter();
      o.type = type; o.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.value = cutoff;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(f); f.connect(g); g.connect(Audio2.musicGain); o.start(t); o.stop(t + dur + 0.02);
    };
    const fight = this.track === 'fight';
    if (fight ? true : pos % 2 === 0) voice('sawtooth', ch[0] - 24 + (pos % 8 === 6 ? 12 : 0), s16 * 1.8, 0.5, 700);
    voice('square', ch[step % 3] + 12 + (pos >= 8 ? 12 : 0), s16 * 0.9, 0.12, 2600);
    if (pos % 4 === 0) { // kick
      const o = A.createOscillator(), g = A.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g); g.connect(Audio2.musicGain); o.start(t); o.stop(t + 0.17);
    }
    if (pos % 8 === 4 || (pos % 2 === 1)) { // snare / hat
      const snare = pos % 8 === 4, n = Math.floor(A.sampleRate * (snare ? 0.12 : 0.03));
      const b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = A.createBufferSource(); s.buffer = b;
      const f = A.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = snare ? 1200 : 7000;
      const g = A.createGain(); g.gain.value = snare ? 0.35 : 0.12;
      s.connect(f); f.connect(g); g.connect(Audio2.musicGain); s.start(t);
    }
    if (pos === 0) voice('triangle', ch[2] + 24, s16 * 6, 0.1, 5000);
  }
};

/* ---------- Dados dos personagens ---------- */
const animName = (ch, a) => { const A = DATA[ch].anims; if (A[a]) return a; const f = FALLBACK[a]; return f && A[f] ? f : 'idle'; };
const nFrames = (ch, a) => DATA[ch].anims[animName(ch, a)].length;
const actIdx = n => n >= 6 ? 3 : n >= 4 ? 2 : (n / 2) | 0;
const charScale = ch => RB[ch].height || 1;
const hitOf = (ch, a) => DATA[ch].hit[animName(ch, a)];
const actOf = (ch, a) => { const n = nFrames(ch, a), v = DATA[ch].act && DATA[ch].act[animName(ch, a)]; return v !== undefined ? v : actIdx(n); };

/* ---------- Estado da luta ---------- */
let F = [], simFrame = 0, hitstop = 0, shake = 0, flash = 0, flashCh = null;
let fight = null; // {p1,p2,stage,round,wins,roundState,roundT,timer,timerSub,winner,paused}
let msg = { text: '', t: 0, big: true, total: 1 }, sparks = [];
let showBoxes = false;
const keys = new Set(), pressQueue = [];

function makeFighter(i, ch) {
  return {
    i, ch, x: i ? 864 : 416, y: FLOOR, vx: 0, vy: 0, jvx: 0, dir: i ? -1 : 1,
    life: 1000, trail: 1000, trailWait: 0, power: 0, state: 'idle', st: 0, t: 0,
    move: null, mt: 0, hasHit: false, jumpAnim: 'jump_vertical', usedAir: false,
    hitstun: 0, blockstun: 0, pushV: 0, pushFrom: null, combo: 0, comboDmg: 0, comboT: 0,
    kdAnim: 'ko_fall', inv: 0, buf: {}, inp: { press: [] }, throwBack: false, other: null, z: 0, ai: {}
  };
}
function resetRound() {
  F = [makeFighter(0, fight.p1), makeFighter(1, fight.p2)];
  F[0].other = F[1]; F[1].other = F[0];
  F.forEach(f => f.power = fight.power[f.i] || 0);
  hitstop = 0; shake = 0; sparks = []; flash = 0;
  fight.roundState = 'intro'; fight.roundT = 0; fight.timer = 99; fight.timerSub = 0; fight.winner = null;
  showMsg('ROUND ' + fight.round, 60);
}
function startFight(p1, p2) {
  const st = STAGES[RB[p2].stage];
  FLOOR = st.floor;
  fight = { p1, p2, stage: RB[p2].stage, round: 1, wins: [0, 0], power: [0, 0], paused: false };
  resetRound();
}

/* ---------- Geometria ---------- */
function geom(ch, anim, idx) {
  const a = animName(ch, anim), list = DATA[ch].anims[a];
  const fr = list[Math.max(0, Math.min(idx, list.length - 1))];
  const k = (DATA[ch].scale[a] || 1) * charScale(ch);
  const off = AIR_ANIMS.has(a) ? (700 - (fr[5] + fr[7])) * DS * k : 0;
  return { fr, k, off };
}
function toGame(f, g, sx, sy) { return [f.x + f.dir * (sx - 256) * DS * g.k, f.y + (sy - 700) * DS * g.k + g.off]; }
function rectGame(f, g, x1, y1, x2, y2) {
  const a = toGame(f, g, x1, y1), b = toGame(f, g, x2, y2);
  return { x1: Math.min(a[0], b[0]), x2: Math.max(a[0], b[0]), y1: Math.min(a[1], b[1]), y2: Math.max(a[1], b[1]) };
}
const overlap = (a, b) => a && b && a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
function isCrouching(f) {
  return f.state === 'crouch' || f.state === 'cblock' || f.state === 'chit' || (f.state === 'attack' && f.move && f.move.anim.startsWith('crouch'));
}
function pushbox(f) {
  if (['thrown', 'throw', 'kd', 'lie', 'ko'].includes(f.state)) return null;
  const c = charScale(f.ch), hw = PUSH_HALF * c;
  if (f.y < FLOOR - 1) return { x1: f.x - hw, x2: f.x + hw, y1: f.y - 160 * c, y2: f.y - 60 * c };
  const tall = (isCrouching(f) ? 160 : 250) * c;
  return { x1: f.x - hw, x2: f.x + hw, y1: f.y - tall, y2: f.y };
}
function hurtbox(f) {
  if (['kd', 'lie', 'wakeup', 'ko', 'thrown', 'throw', 'win'].includes(f.state) || f.inv > 0) return null;
  const [anim, idx] = pose(f), g = geom(f.ch, anim, idx), fr = g.fr;
  return rectGame(f, g, fr[4] + fr[6] * 0.14, fr[5] + fr[7] * 0.03, fr[4] + fr[6] * 0.86, fr[5] + fr[7]);
}
function hitbox(f) {
  if (f.state !== 'attack' || phase(f) !== 'ac' || f.hasHit) return null;
  const m = f.move, box = hitOf(f.ch, m.anim);
  if (!box) return null;
  const g = geom(f.ch, m.anim, actOf(f.ch, m.anim));
  return rectGame(f, g, box[0], box[1], box[2], box[3]);
}

/* ---------- Pose ---------- */
function phase(f) {
  const m = f.move; if (!m) return '';
  if (f.mt <= m.su) return 'su';
  if (f.mt <= m.su + m.ac) return 'ac';
  return 'rc';
}
function pose(f) {
  const st = f.st, n = a => nFrames(f.ch, a);
  switch (f.state) {
    case 'idle': return ['idle', ((f.t / 8) | 0) % n('idle')];
    case 'walkF': return ['walk_forward', ((f.t / 5) | 0) % n('walk_forward')];
    case 'walkB': return ['walk_backward', ((f.t / 5) | 0) % n('walk_backward')];
    case 'crouch': return ['crouch_block_low', st < 2 ? 1 : st < 4 ? 2 : st < 6 ? 3 : 5];
    case 'block': return ['block_stand', f.blockstun > 0 ? (f.blockstun % 4 < 2 ? 2 : 3) : Math.min(2, (st / 2) | 0)];
    case 'cblock': return ['crouch_block_low', f.blockstun > 0 ? (f.blockstun % 4 < 2 ? 4 : 5) : 4];
    case 'prejump': return [f.jumpAnim, 0];
    case 'air': return [f.jumpAnim, f.vy < -8 * SIZE ? 1 : f.vy < -2 * SIZE ? 2 : f.vy < 4 * SIZE ? 3 : 4];
    case 'land': return [f.jumpAnim, 5];
    case 'attack': {
      const m = f.move, p = phase(f), cnt = n(m.anim), ai = actOf(f.ch, m.anim);
      if (p === 'su') return [m.anim, Math.max(0, Math.min(ai - 1, Math.floor((f.mt - 1) / m.su * ai)))];
      if (p === 'ac') return [m.anim, ai];
      if (m.air) return [m.anim, Math.min(cnt - 1, ai + 1)];
      const rn = Math.max(1, cnt - 1 - ai), r = f.mt - m.su - m.ac;
      return [m.anim, Math.min(cnt - 1, ai + 1 + Math.min(rn - 1, Math.floor(r / m.rc * rn)))];
    }
    case 'hit': { const c = n('hit_stand'); return ['hit_stand', Math.min(c - 1, 1 + Math.floor(st / Math.max(1, f.hsTotal) * (c - 2)))]; }
    case 'chit': { const c = n('hit_crouch'); return ['hit_crouch', Math.min(c - 1, 1 + Math.floor(st / Math.max(1, f.hsTotal) * (c - 2)))]; }
    case 'kd': return [f.kdAnim, Math.min(n(f.kdAnim) - 1, (st / 5) | 0)];
    case 'lie': return [f.kdAnim, n(f.kdAnim) - 1];
    case 'ko': return [f.kdAnim, Math.min(n(f.kdAnim) - 1, (st / 6) | 0)];
    case 'wakeup': return ['recovery', Math.min(n('recovery') - 1, (st / 5) | 0)];
    case 'throwtry': return ['throw_front', 0];
    case 'throwwhiff': return ['throw_front', st < 10 ? 1 : 0];
    case 'throw': { const a = f.throwBack ? 'throw_back_counter' : 'throw_front', c = n(a); return [a, Math.min(c - 1, Math.floor(st / (THROW.len / c)))]; }
    case 'thrown': {
      const b = f.other.throwBack;
      if (st < 24) { const a = b ? 'grabbed_back' : 'grabbed_front', c = n(a); return [a, Math.min(c - 1, Math.floor(st / (24 / c)))]; }
      const a = b ? 'thrown_back' : 'thrown_forward', c = n(a); return [a, Math.min(c - 1, Math.floor((st - 24) / (24 / c)))];
    }
    case 'recoil': return ['hit_stand', 2];
    case 'win': return ['victory', Math.min(n('victory') - 1, (st / 7) | 0)];
  }
  return ['idle', 0];
}

/* ---------- Entrada ---------- */
const KEYMAP = {
  KeyA: 'l', KeyD: 'r', KeyS: 'd', KeyW: 'u', ArrowLeft: 'l', ArrowRight: 'r', ArrowDown: 'd', ArrowUp: 'u',
  Insert: 'mp', Home: 'hp', PageUp: 'grab', Delete: 'mk', End: 'hk', PageDown: 'sp',
  KeyJ: 'mp', KeyU: 'hp', KeyL: 'grab', KeyK: 'mk', KeyI: 'hk', KeyO: 'sp'
};
const BUTTONS = ['mp', 'hp', 'mk', 'hk', 'grab', 'sp'];
/* ---------- Toque (celular) ---------- */
const TOUCH = /[?&]touch=1/.test(location.search) || (matchMedia('(pointer: coarse)').matches && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
const IS_IOS = /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !document.documentElement.requestFullscreen);
const touchDir = { l: false, r: false, u: false, d: false };
const STICK_HOME = { x: 190, y: 540 }, STICK_R = 118;
const stick = { id: null, bx: STICK_HOME.x, by: STICK_HOME.y, kx: 0, ky: 0 };
const TBTN = [
  { b: 'mp', img: 'mp', x: 900, y: 520, r: 58 }, { b: 'hp', img: 'hp', x: 1025, y: 480, r: 58 },
  { b: 'mk', img: 'mk', x: 930, y: 650, r: 58 }, { b: 'hk', img: 'hk', x: 1055, y: 610, r: 58 },
  { b: 'grab', img: 'grab', x: 790, y: 620, r: 52 }, { b: 'sp', img: 'special', x: 1180, y: 540, r: 70 }
];
const tPressed = {};
const PAUSE_BTN = { x: 598, y: 120, s: 58 }, FS_FIGHT = { x: 682, y: 120, s: 58 }, FS_MENU = { x: 1228, y: 52, s: 60 };
let iosHint = 0;
function playerInput() {
  const inp = { l: keys.has('l') || touchDir.l, r: keys.has('r') || touchDir.r, d: keys.has('d') || touchDir.d, u: keys.has('u') || touchDir.u, press: [] };
  while (pressQueue.length) inp.press.push(pressQueue.shift());
  return inp;
}
const fwdHeld = (f, i) => f.dir > 0 ? i.r : i.l;
const backHeld = (f, i) => f.dir > 0 ? i.l : i.r;

/* ---------- CPU ---------- */
function cpuInput(f) {
  const o = f.other, inp = { l: false, r: false, d: false, u: false, press: [] };
  const back = v => { if (f.dir > 0) inp.l = v; else inp.r = v; };
  const fwd = v => { if (f.dir > 0) inp.r = v; else inp.l = v; };
  const dist = Math.abs(o.x - f.x);
  const oAtk = o.state === 'attack' && phase(o) !== 'rc';
  if (fight.roundState !== 'fight') return inp;
  const ai = f.ai;
  if (f.state === 'thrown' && f.st < 6 && !ai.techRoll) { ai.techRoll = 1; if (Math.random() < 0.3) inp.press.push('grab'); }
  if (f.state !== 'thrown') ai.techRoll = 0;
  const threatKey = oAtk ? 'a' + o.z : o.state === 'air' ? 'j' + o.jumpId : '';
  if (threatKey && dist < 330 * SIZE) {
    if (ai.guardFor !== threatKey) { ai.guardFor = threatKey; ai.guard = Math.random() < 0.55; }
    if (ai.guard) { back(true); inp.d = oAtk && o.move.lvl === 'low'; return inp; }
  }
  if (o.state === 'air' && dist < 240 * SIZE && o.vy > -4 * SIZE && Math.random() < 0.08) { inp.d = true; inp.press.push('hp'); return inp; }
  if (ai.retreat > 0) { ai.retreat--; back(true); return inp; }
  if (dist > 250 * SIZE) { fwd(true); if (Math.random() < 0.004) inp.u = true; return inp; }
  if (f.power >= 100 && Math.random() < 0.02) { inp.press.push('sp'); return inp; }
  if (dist < 116 * SIZE && Math.random() < 0.02) { inp.press.push('grab'); return inp; }
  if (Math.random() < 0.05) {
    const pick = dist < 170 * SIZE ? ['mp', 'mk', 'mp', 'hp'] : ['mk', 'hk', 'hk', 'hp'];
    inp.press.push(pick[(Math.random() * pick.length) | 0]);
    inp.d = Math.random() < 0.35;
    return inp;
  }
  if (Math.random() < 0.012) ai.retreat = 18;
  if (dist > 190 * SIZE && Math.random() < 0.5) fwd(true);
  return inp;
}

/* ---------- Estados ---------- */
function setState(f, s) { f.state = s; f.st = 0; }
function actionable(f) {
  return ['idle', 'walkF', 'walkB', 'crouch'].includes(f.state) || ((f.state === 'block' || f.state === 'cblock') && f.blockstun <= 0);
}
function threat(f) {
  const o = f.other, dist = Math.abs(o.x - f.x);
  return (o.state === 'attack' && phase(o) !== 'rc' && dist < 330 * SIZE) || (o.state === 'air' && dist < 280 * SIZE);
}
function takeBuffered(f) {
  for (const b of ['sp', 'grab', 'hp', 'hk', 'mp', 'mk']) {
    if (f.buf[b] !== undefined && simFrame - f.buf[b] <= 5) { delete f.buf[b]; return b; }
  }
  return null;
}
function startAttack(f, key) {
  const m = MOVES[key];
  if (m.cost && f.power < m.cost) return false;
  if (m.cost) { f.power -= m.cost; flash = 26; flashCh = f; showMsg(RB[f.ch].special, 50, false); f.inv = m.inv; Audio2.sfx('special'); }
  else Audio2.sfx('whoosh');
  f.move = m; f.moveKey = key; f.mt = 0; f.hasHit = false; f.z = simFrame;
  f.state = 'attack'; f.st = 0;
  f.power = Math.min(100, f.power + 2);
  return true;
}
function doButton(f, b, inp) {
  if (b === 'sp') return f.power >= 100 && startAttack(f, 'sp');
  if (b === 'grab') { f.throwBack = backHeld(f, inp); setState(f, 'throwtry'); f.z = simFrame; return true; }
  const c = inp.d;
  return startAttack(f, { mp: c ? 'crMP' : 'stMP', hp: c ? 'crHP' : 'stHP', mk: c ? 'crMK' : 'stMK', hk: c ? 'crHK' : 'stHK' }[b]);
}
function neutral(f, inp) {
  const b = takeBuffered(f);
  if (b && doButton(f, b, inp)) return;
  const fwd = fwdHeld(f, inp), back = backHeld(f, inp);
  if (inp.u) {
    f.jumpAnim = fwd ? 'jump_diagonal_forward' : back ? 'jump_diagonal_backward' : 'jump_vertical';
    f.jvx = (fwd ? f.dir * 3.6 : back ? -f.dir * 3.2 : 0) * SIZE;
    f.usedAir = false; f.jumpId = simFrame; setState(f, 'prejump'); return;
  }
  const guarding = back && threat(f);
  if (inp.d) { const s = guarding ? 'cblock' : 'crouch'; if (f.state !== s && !(s === 'crouch' && f.state === 'cblock')) setState(f, s); else f.state = s; return; }
  if (guarding) { if (f.state !== 'block') setState(f, 'block'); return; }
  const s = fwd ? 'walkF' : back ? 'walkB' : 'idle';
  if (f.state !== s) setState(f, s);
}
function updateFighter(f) {
  const inp = f.inp;
  for (const b of inp.press) f.buf[b] = simFrame;
  f.st++; f.t++; if (f.inv > 0) f.inv--;
  if (f.comboT > 0) f.comboT--;
  if (fight.roundState !== 'fight' && !['kd', 'lie', 'ko', 'win', 'wakeup', 'thrown', 'throw'].includes(f.state)) {
    if (f.state !== 'idle' && f.y >= FLOOR) setState(f, 'idle');
    physics(f); return;
  }
  switch (f.state) {
    case 'idle': case 'walkF': case 'walkB': case 'crouch': neutral(f, inp); break;
    case 'block': case 'cblock':
      if (f.blockstun > 0) { f.blockstun--; if (f.blockstun === 0) f.st = 0; } else neutral(f, inp);
      break;
    case 'prejump': if (f.st >= 4) { f.vy = -15.6 * SIZE; f.y -= 1; setState(f, 'air'); if (f.i === 0) Audio2.sfx('jump'); } break;
    case 'air': {
      const b = takeBuffered(f);
      if (b && !f.usedAir && ['mp', 'mk', 'hp', 'hk'].includes(b)) {
        f.usedAir = true;
        const key = (b === 'mp' || b === 'mk') ? 'jM' : 'jH';
        f.move = MOVES[key]; f.moveKey = key; f.mt = 0; f.hasHit = false; f.state = 'attack'; f.st = 0; f.z = simFrame;
        Audio2.sfx('whoosh');
      }
      break;
    }
    case 'land': if (f.st >= 4) { setState(f, 'idle'); neutral(f, inp); } break;
    case 'attack': {
      f.mt++;
      const m = f.move;
      if (m.air) { if (f.y >= FLOOR && f.mt > 1) { f.move = null; setState(f, 'land'); } }
      else if (f.mt >= m.su + m.ac + m.rc) { f.move = null; setState(f, inp.d ? 'crouch' : 'idle'); f.st = 6; neutral(f, inp); }
      break;
    }
    case 'hit': case 'chit':
      f.hitstun--;
      if (f.hitstun <= 0) { setState(f, f.state === 'chit' ? 'crouch' : 'idle'); f.st = 6; }
      break;
    case 'kd': if (f.st >= 30 && f.y >= FLOOR) { setState(f, 'lie'); Audio2.sfx('land'); } break;
    case 'lie': if (f.st >= 22) setState(f, 'wakeup'); break;
    case 'wakeup': if (f.st >= 30) { setState(f, 'idle'); f.inv = 3; } break;
    case 'throwtry': if (f.st >= THROW.su) tryThrow(f); break;
    case 'throwwhiff': case 'recoil': if (f.st >= (f.state === 'recoil' ? 14 : THROW.whiff)) setState(f, 'idle'); break;
    case 'throw': updateThrow(f); break;
    case 'thrown': if (f.st <= THROW.tech && f.buf.grab !== undefined && simFrame - f.buf.grab <= 3) techThrow(f.other, f); break;
  }
  physics(f);
}
function physics(f) {
  const s = f.state;
  if (s === 'walkF') f.x += f.dir * 3.3 * SIZE;
  if (s === 'walkB') f.x -= f.dir * 2.7 * SIZE;
  if (f.y < FLOOR && s !== 'thrown') {
    f.vy += 0.62 * SIZE; f.y += f.vy;
    if (s === 'air' || (s === 'attack' && f.move?.air)) f.x += f.jvx;
    if (s === 'kd' || s === 'ko') f.x += f.vx;
    if (f.y >= FLOOR) {
      f.y = FLOOR; f.vy = 0;
      if (s === 'air') setState(f, 'land');
      if (s === 'attack' && f.move?.air) { f.move = null; setState(f, 'land'); }
    }
  } else if (s === 'kd' || s === 'ko') { f.x += f.vx; f.vx *= 0.88; }
  if (f.pushV) {
    f.x += f.pushV; f.pushV *= 0.84; if (Math.abs(f.pushV) < 0.2) f.pushV = 0;
    const cl = Math.max(WALL_L, Math.min(WALL_R, f.x));
    if (cl !== f.x && f.pushFrom) f.pushFrom.x -= (f.x - cl);
    f.x = cl;
  }
  f.x = Math.max(WALL_L, Math.min(WALL_R, f.x));
}

/* ---------- Agarrão ---------- */
function throwable(d) {
  if (d.y < FLOOR || d.inv > 0) return false;
  if (['throw', 'thrown', 'throwtry', 'kd', 'lie', 'wakeup', 'ko', 'hit', 'chit', 'air', 'land', 'win'].includes(d.state)) return false;
  if ((d.state === 'block' || d.state === 'cblock') && d.blockstun > 0) return false;
  return true;
}
function tryThrow(a) {
  const d = a.other;
  if (d.state === 'throwtry' && d.st >= THROW.su - 1) { techThrow(a, d); return; }
  if (Math.abs(d.x - a.x) <= THROW.range && throwable(d)) {
    setState(a, 'throw'); setState(d, 'thrown'); d.move = null; d.z = 0; a.z = simFrame + 1; d.buf = {};
    return;
  }
  setState(a, 'throwwhiff');
}
function techThrow(a, d) {
  setState(a, 'recoil'); setState(d, 'recoil');
  a.x = d.x - a.dir * 110 * SIZE;
  a.pushV = -a.dir * 7 * SIZE; d.pushV = a.dir * 7 * SIZE; a.pushFrom = null; d.pushFrom = null;
  showMsg('TECH!', 40, false); hitstop = 6; Audio2.sfx('block');
}
function updateThrow(a) {
  const d = a.other, st = a.st, dir = a.dir;
  if (d.state !== 'thrown') { setState(a, 'idle'); return; }
  if (!a.throwBack) d.x = st < 24 ? a.x + dir * 92 * SIZE : a.x + dir * (92 + (st - 24) * 5) * SIZE;
  else d.x = st < 24 ? a.x + dir * (92 - (152 * st / 24)) * SIZE : a.x - dir * (60 + (st - 24) * 5) * SIZE;
  d.y = FLOOR;
  if (st === 30) {
    applyDamage(d, THROW.dmg);
    hitstop = 7; shake = 8; Audio2.sfx('throw');
    sparks.push({ x: d.x, y: FLOOR - 150, t: 0, c: '#ffe14a', big: true });
  }
  if (st >= THROW.len) {
    d.x = Math.max(WALL_L, Math.min(WALL_R, d.x));
    d.kdAnim = a.throwBack ? 'thrown_back' : 'thrown_forward';
    setState(a, 'idle');
    if (d.life <= 0) { setState(d, 'ko'); d.st = 60; } else setState(d, 'lie');
  }
}

/* ---------- Golpes ---------- */
function canGuard(d) {
  if (d.y < FLOOR) return false;
  return ['idle', 'walkF', 'walkB', 'crouch', 'block', 'cblock'].includes(d.state) && backHeld(d, d.inp);
}
function applyDamage(d, dmg) { d.life = Math.max(0, d.life - dmg); d.trailWait = 40; }
function register(a, d, hb, hu, m) {
  a.hasHit = true;
  const cx = (Math.max(hb.x1, hu.x1) + Math.min(hb.x2, hu.x2)) / 2, cy = (Math.max(hb.y1, hu.y1) + Math.min(hb.y2, hu.y2)) / 2;
  const crouching = d.inp.d;
  let guarded = canGuard(d);
  if (guarded && m.lvl === 'low' && !crouching) guarded = false;
  if (guarded && m.lvl === 'high' && crouching) guarded = false;
  if (guarded) {
    setState(d, crouching ? 'cblock' : 'block');
    d.blockstun = m.bs; d.pushV = a.dir * m.push * SIZE; d.pushFrom = a;
    if (m.chip) applyDamage(d, Math.round(m.dmg * m.chip));
    hitstop = Math.max(4, m.stop - 3);
    a.power = Math.min(100, a.power + 4); d.power = Math.min(100, d.power + 3);
    sparks.push({ x: cx, y: cy, t: 0, c: '#7ff6ff', big: false, block: true });
    Audio2.sfx('block');
    return;
  }
  const counter = d.state === 'attack' && phase(d) === 'su';
  const comboing = ['hit', 'chit', 'kd'].includes(d.state);
  d.combo = comboing ? d.combo + 1 : 1;
  if (d.combo === 1) d.comboDmg = 0;
  const dmg = Math.round(m.dmg * COMBO_SCALE[Math.min(d.combo - 1, COMBO_SCALE.length - 1)] * (counter ? 1.15 : 1));
  applyDamage(d, dmg);
  d.comboDmg += dmg; d.comboT = 90;
  a.power = Math.min(100, a.power + 8); d.power = Math.min(100, d.power + 5);
  const wasAir = d.y < FLOOR;
  d.move = null;
  if (d.life <= 0) {
    d.kdAnim = 'ko_fall'; setState(d, 'ko'); d.vy = wasAir ? -3 : -5; d.y -= 1; d.vx = a.dir * 3 * SIZE;
  } else if (m.kd || wasAir) {
    d.kdAnim = m.kd === 'special' ? (RB[a.ch].kd || 'ko_fall') : 'ko_fall';
    setState(d, 'kd'); d.vx = a.dir * 2.6 * SIZE;
    if (wasAir) d.vy = -4; else if (m.kd === 'special') { d.vy = -6; d.y -= 1; }
  } else {
    setState(d, d.inp.d && d.y >= FLOOR ? 'chit' : 'hit');
    d.hitstun = m.hs + (counter ? 3 : 0); d.hsTotal = d.hitstun;
    d.pushV = a.dir * m.push * SIZE; d.pushFrom = a;
  }
  hitstop = m.stop; if (m.heavy) shake = 7;
  sparks.push({ x: cx, y: cy, t: 0, c: counter ? '#ff4df3' : '#ffe14a', big: !!m.heavy });
  Audio2.sfx(m.sfx);
  if (counter) showMsg('COUNTER', 34, false);
}
function checkHits() {
  const res = [];
  for (const a of F) {
    const hb = hitbox(a); if (!hb) continue;
    const hu = hurtbox(a.other); if (!hu) continue;
    if (overlap(hb, hu)) res.push([a, a.other, hb, hu, a.move]);
  }
  for (const r of res) register(...r);
}
function resolvePush() {
  const [a, b] = F, pa = pushbox(a), pb = pushbox(b);
  if (!pa || !pb || !(pa.y1 < pb.y2 && pa.y2 > pb.y1)) return;
  const dx = b.x - a.x, ov = (pa.x2 - pa.x1) / 2 + (pb.x2 - pb.x1) / 2 - Math.abs(dx);
  if (ov <= 0) return;
  const s = dx === 0 ? a.dir : Math.sign(dx);
  a.x -= s * ov / 2; b.x += s * ov / 2;
  for (const [f, o] of [[a, b], [b, a]]) {
    if (f.x < WALL_L) { o.x += WALL_L - f.x; f.x = WALL_L; }
    if (f.x > WALL_R) { o.x -= f.x - WALL_R; f.x = WALL_R; }
  }
}
function updateFacing() {
  for (const f of F) if (actionable(f) || ['prejump', 'land', 'lie', 'wakeup'].includes(f.state)) { const d = Math.sign(f.other.x - f.x); if (d) f.dir = d; }
}

/* ---------- Round ---------- */
function showMsg(text, t, big = true) { msg = { text, t, big, total: t }; }
function roundLogic() {
  const R = fight; R.roundT++;
  if (R.roundState === 'intro') {
    if (R.roundT === 62) { showMsg('FIGHT!', 40); Audio2.sfx('bell'); }
    if (R.roundT >= 90) R.roundState = 'fight';
  } else if (R.roundState === 'fight') {
    if (++R.timerSub >= 60) { R.timerSub = 0; R.timer = Math.max(0, R.timer - 1); }
    const ko = F.find(f => f.life <= 0);
    if (ko || R.timer <= 0) {
      R.roundState = 'ko'; R.roundT = 0;
      if (ko) { R.winner = ko.other; showMsg('K.O.', 80); Audio2.sfx('ko'); }
      else { R.winner = F[0].life === F[1].life ? null : F[0].life > F[1].life ? F[0] : F[1]; showMsg('TIME', 80); }
      if (R.winner) R.wins[R.winner.i]++;
    }
  } else if (R.roundState === 'ko') {
    const settled = F.every(f => !['attack', 'hit', 'chit', 'kd', 'throw', 'thrown', 'air', 'prejump'].includes(f.state) && f.y >= FLOOR);
    if (R.roundT > 70 && settled) {
      if (R.winner && R.winner.state !== 'win') setState(R.winner, 'win');
      if (!msg.t) showMsg(R.winner ? RB[R.winner.ch].name + ' WINS' : 'DRAW', 110);
    }
    if (R.roundT > 240) {
      R.power = F.map(f => f.power);
      if (R.wins[0] >= 2) return Scene.go('win');
      if (R.wins[1] >= 2) return Scene.go('continue');
      R.round++; resetRound();
    }
  }
}
function fightTick() {
  if (msg.t > 0) msg.t--;
  if (flash > 0) { flash--; return; }
  sparks.forEach(s => s.t++); sparks = sparks.filter(s => s.t < 16);
  if (shake > 0) shake--;
  if (hitstop > 0) { hitstop--; const p = playerInput(); for (const b of p.press) F[0].buf[b] = simFrame; return; }
  simFrame++;
  F[0].inp = playerInput();
  F[1].inp = cpuInput(F[1]);
  for (const f of F) {
    if (f.trailWait > 0) f.trailWait--; else if (f.trail > f.life) f.trail = Math.max(f.life, f.trail - 12);
    if (f.trail < f.life) f.trail = f.life;
  }
  updateFighter(F[0]); updateFighter(F[1]);
  resolvePush(); updateFacing();
  if (fight.roundState === 'fight') checkHits();
  roundLogic();
}

/* ---------- Render helpers ---------- */
function outlined(t, x, y, size, fill, align = 'center', font = 'Bungee', stroke = '#140a2e') {
  ctx.font = `${size}px ${font === 'Bungee' ? 'Bungee, Impact, "Arial Black", sans-serif' : font}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size / 7); ctx.strokeStyle = stroke; ctx.strokeText(t, x, y);
  ctx.fillStyle = fill; ctx.fillText(t, x, y); ctx.textBaseline = 'alphabetic';
}
function heavyText(t, x, y, size, fill, align = 'center', shadow = '#ff3fa4') {
  ctx.font = `900 ${size}px "Arial Black", "Russo One", Impact, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(t, x + size * 0.06, y + size * 0.06); }
  ctx.fillStyle = fill; ctx.fillText(t, x, y); ctx.textBaseline = 'alphabetic';
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function drawSprite(ch, anim, idx, x, y, dir, alpha = 1) {
  const img = IMG['c_' + ch]; if (!img) return;
  const g = geom(ch, anim, idx), [ax, ay, aw, ah, sx, sy, sw, sh] = g.fr;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, 0); ctx.scale(dir, 1);
  ctx.drawImage(img, ax, ay, aw, ah, (sx - 256) * DS * g.k, y + (sy - 700) * DS * g.k + g.off, sw * DS * g.k, sh * DS * g.k);
  ctx.restore();
}
function drawPortrait(key, x, y, w, h, mirror = false, contain = false) {
  const im = IMG[key]; if (!im) return;
  const sc = contain ? Math.min(w / im.width, h / im.height) : Math.max(w / im.width, h / im.height) * (im.width / im.height > 1.2 ? 1 : 0.92);
  const dw = im.width * sc, dh = im.height * sc;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x + w / 2, y + h); if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(im, -dw / 2, -dh, dw, dh); ctx.restore();
}
function drawFighter(f) {
  const [anim, idx] = pose(f), air = FLOOR - f.y;
  ctx.save(); ctx.globalAlpha = Math.max(0.12, 0.38 - air / 900); ctx.fillStyle = '#1a1030';
  ctx.beginPath(); ctx.ellipse(f.x, FLOOR + 2, Math.max(30, 74 * SIZE - air / 8), 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  let x = f.x;
  if ((f.state === 'hit' || f.state === 'chit') && hitstop > 0) x += (simFrame + hitstop) % 2 ? 3 : -3;
  drawSprite(f.ch, anim, idx, x, f.y, f.dir);
}
function drawBox(b, stroke, fill) {
  if (!b) return; ctx.fillStyle = fill; ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
}
function drawSparks() {
  for (const s of sparks) {
    const r = (s.big ? 20 : 12) + s.t * (s.big ? 5 : 3.2), a = 1 - s.t / 16;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = s.c; ctx.lineWidth = s.big ? 5 : 3; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + (s.block ? 0.39 : 0);
      ctx.moveTo(s.x + Math.cos(ang) * r * 0.4, s.y + Math.sin(ang) * r * 0.4); ctx.lineTo(s.x + Math.cos(ang) * r, s.y + Math.sin(ang) * r);
    }
    ctx.stroke();
    if (s.t < 4) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, (s.big ? 16 : 9) - s.t * 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
function drawHud() {
  const bw = 500, bh = 24, y = 34;
  for (const f of F) {
    const left = f.i === 0, x = left ? 50 : W - 50 - bw;
    ctx.fillStyle = '#140a2e'; ctx.fillRect(x - 4, y - 4, bw + 8, bh + 8);
    ctx.fillStyle = '#5b0f1f'; ctx.fillRect(x, y, bw, bh);
    const tw = bw * f.trail / 1000, lw = bw * f.life / 1000;
    ctx.fillStyle = '#ff3b4f'; ctx.fillRect(left ? x + bw - tw : x, y, tw, bh);
    const gr = ctx.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, '#fff27a'); gr.addColorStop(1, '#f2a900');
    ctx.fillStyle = gr; ctx.fillRect(left ? x + bw - lw : x, y, lw, bh);
    outlined(RB[f.ch].name, left ? x : x + bw, y + bh + 22, 18, '#ffffff', left ? 'left' : 'right');
    outlined(left ? '1P' : 'CPU', left ? x + ctx.measureText(RB[f.ch].name).width + 14 : x + bw - ctx.measureText(RB[f.ch].name).width - 14, y + bh + 22, 13, left ? '#6ff3ff' : '#ff4df3', left ? 'left' : 'right');
    for (let r = 0; r < 2; r++) {
      const cx = left ? x + bw - 12 - r * 26 : x + 12 + r * 26;
      ctx.beginPath(); ctx.arc(cx, y + bh + 22, 8, 0, Math.PI * 2);
      ctx.fillStyle = fight.wins[f.i] > r ? '#ffd23f' : '#1d2350'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#140a2e'; ctx.stroke();
    }
    const px = left ? 50 : W - 350, py = TOUCH ? 122 : H - 34;
    ctx.fillStyle = '#140a2e'; ctx.fillRect(px - 3, py - 3, 306, 18);
    ctx.fillStyle = '#1d2350'; ctx.fillRect(px, py, 300, 12);
    ctx.fillStyle = f.power >= 100 ? (simFrame % 20 < 10 ? '#ff4df3' : '#7ff6ff') : '#4f8dff';
    const pw = 3 * f.power; ctx.fillRect(left ? px : px + 300 - pw, py, pw, 12);
    outlined(f.power >= 100 ? (left && !TOUCH ? 'POWER MAX · PgDn' : 'POWER MAX') : 'POWER', left ? px : px + 300, py - 12, 13, f.power >= 100 ? '#ffd23f' : '#cfe0ff', left ? 'left' : 'right');
    if (f.combo >= 2 && f.comboT > 0) {
      const cx = f.other.i === 0 ? 70 : W - 70, al = f.other.i === 0 ? 'left' : 'right';
      outlined(f.combo + ' HITS', cx, 170, 34, '#ffd23f', al);
    }
  }
  outlined(String(fight.timer).padStart(2, '0'), W / 2, y + 16, 50, '#ffd23f');
  outlined(STAGES[fight.stage].name, W / 2, y + 52, 12, '#cfe0ff');
  if (msg.t > 0 && msg.text) {
    const k = msg.total - msg.t, s = msg.big ? 84 : 44;
    ctx.font = `${s}px Bungee, Impact, "Arial Black", sans-serif`;
    const fit = Math.min(1, (W - 120) / ctx.measureText(msg.text).width), sc = (k < 6 ? 1.4 - k * 0.066 : 1) * fit;
    ctx.save(); ctx.translate(W / 2, msg.big ? H * 0.42 : H * 0.3); ctx.scale(sc, sc);
    outlined(msg.text, 0, 0, s, msg.big ? '#ffd23f' : '#7ff6ff'); ctx.restore();
  }
}
function renderFight() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.6);
  ctx.drawImage(IMG['s_' + fight.stage], -8, -6, W + 16, H + 12);
  if (flash > 0) { ctx.fillStyle = 'rgba(8,4,30,.6)'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  const order = [...F].sort((a, b) => a.z - b.z);
  if (flash > 0 && flashCh) { order.splice(order.indexOf(flashCh), 1); order.push(flashCh); }
  for (const f of order) drawFighter(f);
  drawSparks();
  if (showBoxes) for (const f of F) {
    drawBox(hurtbox(f), '#39ff88', 'rgba(57,255,136,.14)');
    drawBox(pushbox(f), '#4d8dff', 'rgba(77,141,255,.10)');
    drawBox(hitbox(f), '#ff3b4f', 'rgba(255,59,79,.42)');
  }
  ctx.restore();
  drawHud();
  if (TOUCH) drawTouchControls();
  drawSquareBtn(fsIcon(), FS_FIGHT);
  if (TOUCH) drawSquareBtn('pause', PAUSE_BTN);
  if (fight.paused) {
    ctx.fillStyle = 'rgba(5,8,26,.7)'; ctx.fillRect(0, 0, W, H);
    outlined('PAUSED', W / 2, 220, 70, '#ffffff');
    for (const b of PAUSE_MENU) {
      roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = '#0b1231'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = b.c; ctx.stroke();
      outlined(b.label, b.x + b.w / 2, b.y + b.h / 2, 26, b.c);
    }
    outlined(TOUCH ? 'TAP A BUTTON' : 'ENTER · RESUME   ESC · QUIT   F2 · RESTART   M · SOUND', W / 2, 600, 16, '#cfe0ff');
  }
  if (TOUCH) drawRotateOverlay();
}

const PAUSE_MENU = [
  { id: 'resume', label: 'RESUME', x: W / 2 - 170, y: 290, w: 340, h: 64, c: '#6ff3ff' },
  { id: 'restart', label: 'RESTART ROUND', x: W / 2 - 170, y: 370, w: 340, h: 64, c: '#ffd23f' },
  { id: 'sound', label: 'SOUND ON/OFF', x: W / 2 - 170, y: 450, w: 340, h: 64, c: '#cfe0ff' },
  { id: 'quit', label: 'QUIT TO SELECT', x: W / 2 - 170, y: 530 - 0, w: 340, h: 0, c: '#ff4df3' }
];
PAUSE_MENU[3].y = 530; PAUSE_MENU[3].h = 64;
PAUSE_MENU.forEach((b, i) => { b.y = 270 + i * 76; });
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches; }
const fsIcon = () => (document.fullscreenElement || document.webkitFullscreenElement) ? 'fs_exit' : 'fs_enter';
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { iosHint = 360; return; }
  Promise.resolve(req.call(el, { navigationUI: 'hide' })).then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { iosHint = 360; });
}
function drawSquareBtn(img, b, alpha = 0.9) {
  const im = IMG['t_' + img]; if (!im) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, b.x - b.s / 2, b.y - b.s / 2, b.s, b.s); ctx.restore();
}
const inBtn = (x, y, b) => Math.abs(x - b.x) <= b.s / 2 + 8 && Math.abs(y - b.y) <= b.s / 2 + 8;
function drawTouchControls() {
  if (fight.paused) return;
  const base = IMG.t_stick_base, knob = IMG.t_stick_knob;
  ctx.save(); ctx.globalAlpha = stick.id !== null ? 0.9 : 0.62;
  if (base) ctx.drawImage(base, stick.bx - STICK_R, stick.by - STICK_R, STICK_R * 2, STICK_R * 2);
  if (knob) ctx.drawImage(knob, stick.bx + stick.kx - 52, stick.by + stick.ky - 52, 104, 104);
  ctx.restore();
  for (const t of TBTN) {
    const p = tPressed[t.b] > 0, r = t.r * (p ? 0.9 : 1), im = IMG['t_' + t.img];
    ctx.save(); ctx.globalAlpha = p ? 1 : 0.72;
    if (t.b === 'sp' && F[0] && F[0].power >= 100) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 20 + Math.sin(simFrame / 5) * 10; ctx.globalAlpha = 1; }
    if (t.b === 'sp' && F[0] && F[0].power < 100) ctx.globalAlpha = 0.4;
    if (im) ctx.drawImage(im, t.x - r, t.y - r, r * 2, r * 2);
    ctx.restore();
    if (tPressed[t.b] > 0) tPressed[t.b]--;
  }
}
function drawRotateOverlay() {
  if (innerHeight <= innerWidth) return;
  ctx.fillStyle = 'rgba(3,5,20,.94)'; ctx.fillRect(0, 0, W, H);
  const im = IMG.t_rotate; if (im) ctx.drawImage(im, W / 2 - 210, 170, 420, 311);
  outlined('ROTATE YOUR PHONE', W / 2, 560, 54, '#ffd23f');
}
function drawIosHint() {
  if (iosHint <= 0) return; iosHint--;
  roundRect(W / 2 - 430, 20, 860, 96, 16); ctx.fillStyle = 'rgba(3,6,30,.95)'; ctx.fill(); ctx.strokeStyle = '#46e8ff'; ctx.lineWidth = 3; ctx.stroke();
  outlined('iPHONE: TAP SHARE  →  "ADD TO HOME SCREEN"', W / 2, 52, 24, '#ffd23f');
  outlined('Open Miami Fighter from the home screen to play in full screen', W / 2, 90, 16, '#ffffff');
}
function stickUpdate(x, y) {
  let dx = x - stick.bx, dy = y - stick.by; const d = Math.hypot(dx, dy), max = STICK_R * 0.62;
  if (d > max) { dx *= max / d; dy *= max / d; }
  stick.kx = dx; stick.ky = dy;
  const nx = dx / max, ny = dy / max;
  touchDir.l = nx < -0.38; touchDir.r = nx > 0.38; touchDir.u = ny < -0.55; touchDir.d = ny > 0.5;
}
function stickRelease() { stick.id = null; stick.kx = stick.ky = 0; stick.bx = STICK_HOME.x; stick.by = STICK_HOME.y; touchDir.l = touchDir.r = touchDir.u = touchDir.d = false; }
function fightPointer(id, x, y) {
  if (fight.paused) {
    for (const b of PAUSE_MENU) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { pauseAction(b.id); return; }
    return;
  }
  if (TOUCH && inBtn(x, y, PAUSE_BTN)) { pauseAction('toggle'); return; }
  if (!TOUCH) return;
  let best = null, bd = 1e9;
  for (const t of TBTN) { const d = Math.hypot(x - t.x, y - t.y); if (d <= t.r * 1.25 && d < bd) { bd = d; best = t; } }
  if (best) { pressQueue.push(best.b); tPressed[best.b] = 8; return; }
  if (x < W * 0.45 && stick.id === null) {
    stick.id = id; stick.bx = Math.max(140, Math.min(420, x)); stick.by = Math.max(400, Math.min(600, y)); stickUpdate(x, y);
  }
}
function pauseAction(a) {
  if (a === 'toggle') { fight.paused = !fight.paused; keys.clear(); stickRelease(); Audio2.sfx(fight.paused ? 'back' : 'move'); return; }
  if (a === 'resume') { fight.paused = false; Audio2.sfx('move'); return; }
  if (a === 'restart') { fight.paused = false; resetRound(); return; }
  if (a === 'sound') { Audio2.init(); Audio2.toggleMute(); return; }
  if (a === 'quit') { fight.paused = false; sel.step = 1; sel.cursor = sel.player; sel.player = null; Scene.go('select'); }
}

/* =========================================================
   CENAS
   ========================================================= */
const SEL_SCALE = W / 1920;
const CARD = i => ({ x: 30 + 234 * i, y: 594, w: 222, h: 200 });
const Scene = {
  cur: 'loading', t: 0, fade: 0, fadeDir: 0, nextScene: null,
  go(name) { if (this.fadeDir === 1) return; this.nextScene = name; this.fadeDir = 1; },
  enter(name) {
    this.cur = name; this.t = 0;
    const S = SCENES[name]; if (S.enter) S.enter();
  },
  update() {
    if (this.fadeDir === 1) { this.fade = Math.min(1, this.fade + 1 / 16); if (this.fade >= 1) { this.enter(this.nextScene); this.fadeDir = -1; } }
    else if (this.fadeDir === -1) { this.fade = Math.max(0, this.fade - 1 / 16); if (this.fade <= 0) this.fadeDir = 0; }
    this.t++;
    const S = SCENES[this.cur]; if (S.update) S.update();
  },
  draw() {
    const S = SCENES[this.cur]; S.draw();
    if (!['fight', 'loading', 'studio'].includes(this.cur)) drawSquareBtn(fsIcon(), FS_MENU, 0.85);
    drawIosHint();
    if (TOUCH && this.cur !== 'fight') drawRotateOverlay();
    if (this.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
  },
  key(code) { if (this.fadeDir === 1) return; const S = SCENES[this.cur]; if (S.key) S.key(code); }
};
const sel = { step: 1, cursor: 0, player: null, cpu: null };
const isConfirm = c => c === 'Enter' || c === 'Space' || c === 'NumpadEnter';
const isLeft = c => c === 'ArrowLeft' || c === 'KeyA';
const isRight = c => c === 'ArrowRight' || c === 'KeyD';

const SCENES = {
  loading: {
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1d2350'; ctx.fillRect(W / 2 - 200, H / 2, 400, 10);
      ctx.fillStyle = '#6ff3ff'; ctx.fillRect(W / 2 - 200, H / 2, 400 * (loadProgress || 0), 10);
    }
  },
  studio: {
    update() { if (Scene.t === 190) Scene.go('title'); },
    draw() {
      const t = Scene.t, a = t < 30 ? t / 30 : t > 160 ? Math.max(0, 1 - (t - 160) / 30) : 1;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a; ctx.drawImage(IMG.studio, 0, 0, W, H); ctx.globalAlpha = 1;
    },
    key() { Audio2.init(); Scene.go('title'); }
  },
  title: {
    enter() { if (Audio2.ctx) Music.play('menu'); },
    draw() {
      ctx.drawImage(IMG.title, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, H * 0.55, 0, H); g.addColorStop(0, 'rgba(5,4,25,0)'); g.addColorStop(1, 'rgba(5,4,25,.75)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const lg = IMG.logo, lw = 760, lh = lw * lg.height / lg.width, fy = Math.sin(Scene.t / 40) * 6;
      ctx.drawImage(lg, W / 2 - lw / 2, 150 - lh / 2 + 110 + fy - 60, lw, lh);
      if ((Scene.t % 60) < 42) heavyText('PUSH START', W / 2, 560, 50, '#ffd23f');
      ctx.font = '600 15px "Chakra Petch", sans-serif'; ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER', W / 2, 604);
      ctx.fillText('© 2026 CHINGA TU MADRE STUDIO', W / 2, 690);
    },
    key(c) {
      if (isConfirm(c)) { Audio2.init(); Music.play('menu'); Audio2.file('coin'); sel.step = 1; sel.player = null; sel.cursor = sel.cursor || 0; Scene.go('select'); }
    }
  },
  select: {
    enter() { Music.play('menu'); },
    draw() {
      ctx.drawImage(IMG.select, 0, 0, W, H);
      ctx.save(); ctx.scale(SEL_SCALE, SEL_SCALE);
      // título
      ctx.fillStyle = '#03082a'; ctx.fillRect(520, 8, 900, 78);
      heavyText(sel.step === 1 ? '1/2  ·  CHOOSE YOUR FIGHTER' : '2/2  ·  CHOOSE YOUR OPPONENT', 960, 48, 46, '#ffd23f');
      // fighter focado
      const fr = ROSTER[sel.cursor], st = STAGES[fr.stage];
      // pontos do mapa
      const pulse = 1 + Math.sin(Scene.t / 8) * 0.18;
      const dots = Object.entries(STAGES).map(([k, s]) => [k, s.dot]);
      dots.push(['locked', LOCKED_DOT]);
      for (const [k, [x, y]] of dots) {
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fillStyle = '#141a45'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      }
      {
        const [x, y] = st.dot;
        ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,210,63,.55)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.font = '800 22px "Arial Black", sans-serif'; const tw = ctx.measureText(st.tag).width;
        const lx = x + 30 + tw + 30 > 1890 ? x - 30 - tw - 30 : x + 28;
        roundRect(lx, y - 22, tw + 30, 44, 10); ctx.fillStyle = 'rgba(2,6,30,.92)'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(st.tag, lx + 15, y + 1); ctx.textBaseline = 'alphabetic';
      }
      // caixa de informação
      roundRect(650, 127, 618, 95, 18); ctx.fillStyle = '#020624'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#46e8ff'; ctx.stroke();
      heavyText(st.name, 959, 162, 34, '#ffd23f', 'center', null);
      ctx.font = '800 19px "Arial Black", sans-serif'; ctx.fillStyle = '#6ff3ff'; ctx.textAlign = 'center';
      ctx.fillText(fr.name + '  ·  ' + fr.style.replace(' · ', '  ·  '), 959, 206);
      // cards
      ROSTER.forEach((r, i) => {
        const c = CARD(i), hover = i === sel.cursor, isP = sel.player === i;
        ctx.save(); roundRect(c.x, c.y, c.w, c.h, 10); ctx.fillStyle = '#060a28'; ctx.fill(); ctx.clip();
        const g = ctx.createLinearGradient(0, c.y, 0, c.y + 150); g.addColorStop(0, '#1b2266'); g.addColorStop(1, '#070b2e');
        ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, 152);
        drawPortrait('pv_' + r.id, c.x, c.y, c.w, 150);
        ctx.fillStyle = '#050926'; ctx.fillRect(c.x, c.y + 150, c.w, 50);
        if (sel.step === 2 && isP) { ctx.fillStyle = 'rgba(5,8,30,.45)'; ctx.fillRect(c.x, c.y, c.w, c.h); }
        ctx.restore();
        heavyText(r.name, c.x + c.w / 2, c.y + 176, r.name.length > 9 ? 19 : 23, '#ffd23f', 'center', null);
        roundRect(c.x, c.y, c.w, c.h, 10);
        const col = hover ? (sel.step === 1 ? '#6ff3ff' : '#ff4df3') : isP ? '#6ff3ff' : '#3553b5';
        ctx.lineWidth = hover ? 5 : isP ? 4 : 2; ctx.strokeStyle = col;
        if (hover) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
        ctx.stroke(); ctx.shadowBlur = 0;
        const tag = (lbl, color, dx) => {
          ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(c.x + dx, c.y); ctx.lineTo(c.x + dx + 62, c.y); ctx.lineTo(c.x + dx + 48, c.y + 30); ctx.lineTo(c.x + dx, c.y + 30); ctx.fill();
          ctx.font = '900 20px "Arial Black", sans-serif'; ctx.fillStyle = '#04172a'; ctx.textAlign = 'left'; ctx.fillText(lbl, c.x + dx + 8, c.y + 23);
        };
        if (isP || (sel.step === 1 && hover)) tag('1P', '#6ff3ff', 0);
        if (sel.step === 2 && hover) tag('CPU', '#ff4df3', isP ? 70 : 0);
      });
      // dica inferior
      ctx.fillStyle = '#03072b'; ctx.fillRect(1560, 1002, 340, 32);
      ctx.font = '800 17px "Arial Black", sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd23f';
      ctx.fillText(sel.step === 1 ? 'ENTER · CHOOSE OPPONENT' : 'ENTER · FIGHT!', 1882, 1024);
      ctx.restore();
    },
    key(c) {
      if (isLeft(c) || isRight(c)) { sel.cursor = (sel.cursor + (isRight(c) ? 1 : -1) + ROSTER.length) % ROSTER.length; Audio2.sfx('move'); return; }
      if (c === 'ArrowUp' || c === 'ArrowDown') return;
      if (isConfirm(c)) {
        if (sel.step === 1) { sel.player = sel.cursor; sel.step = 2; sel.cursor = (sel.cursor + 1) % ROSTER.length; Audio2.file('confirm'); return; }
        if (sel.cursor === sel.player) { Audio2.sfx('deny'); return; }
        sel.cpu = sel.cursor; Audio2.file('confirm'); Scene.go('vs'); return;
      }
      if (c === 'Escape' || c === 'Backspace') {
        Audio2.sfx('back');
        if (sel.step === 2) { sel.step = 1; sel.cursor = sel.player; sel.player = null; } else Scene.go('title');
      }
    },
    click(x, y) {
      const sx = x / SEL_SCALE, sy = y / SEL_SCALE;
      if (sy > 990 && sx < 260) { this.key('Escape'); return; }
      for (let i = 0; i < ROSTER.length; i++) {
        const c = CARD(i);
        if (sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h) {
          if (sel.cursor === i) this.key('Enter'); else { sel.cursor = i; Audio2.sfx('move'); }
          return;
        }
      }
    }
  },
  vs: {
    enter() { Audio2.file('jingle', 0.6); Music.play(null); this.ready = false; ensureChars([ROSTER[sel.player].id, ROSTER[sel.cpu].id]).then(() => { this.ready = true; }); },
    update() { if (Scene.t >= 200 && this.ready && Scene.fadeDir === 0) this.key('Enter'); },
    draw() {
      const p = ROSTER[sel.player], c = ROSTER[sel.cpu], t = Scene.t;
      ctx.drawImage(IMG['s_' + c.stage], 0, 0, W, H);
      ctx.fillStyle = 'rgba(6,4,30,.7)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,63,164,.18)'; ctx.beginPath(); ctx.moveTo(W / 2 + 90, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W / 2 - 90, H); ctx.fill();
      ctx.fillStyle = 'rgba(70,232,255,.14)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 90, 0); ctx.lineTo(W / 2 - 90, H); ctx.lineTo(0, H); ctx.fill();
      const e = Math.min(1, t / 22), ease = 1 - Math.pow(1 - e, 3), sz = 520;
      drawPortrait('pv_' + p.id, -sz + (20 + sz) * ease, 150, sz, 450, false, true);
      drawPortrait('pv_' + c.id, W - 20 - sz * ease, 150, sz, 450, true, true);
      outlined(p.name, 60, 640, 40, '#6ff3ff', 'left');
      outlined(c.name, W - 60, 640, 40, '#ff4df3', 'right');
      const vs = t < 20 ? 0 : Math.min(1, (t - 20) / 10), sc = 1 + (1 - vs) * 1.5;
      ctx.save(); ctx.globalAlpha = vs; ctx.translate(W / 2, 330); ctx.scale(sc, sc); outlined('VS', 0, 0, 150, '#ffd23f'); ctx.restore();
      outlined('STAGE · ' + STAGES[c.stage].name, W / 2, 60, 22, '#ffffff');
    },
    key(c) {
      if (isConfirm(c) && Scene.t > 30 && this.ready) { startFight(ROSTER[sel.player].id, ROSTER[sel.cpu].id); Scene.go('fight'); }
    }
  },
  fight: {
    enter() { Music.play('fight'); keys.clear(); pressQueue.length = 0; },
    update() {
      if (fight.paused) { if (stepOnce) { stepOnce = false; fightTick(); } return; }
      fightTick();
    },
    draw: renderFight,
    key(c) {
      if (c === 'Enter') { pauseAction('toggle'); return; }
      if (c === 'Escape' && fight.paused) { fight.paused = false; sel.step = 1; sel.cursor = sel.player; sel.player = null; Scene.go('select'); return; }
      if (c === 'F2') { fight.paused = false; resetRound(); return; }
      if (c === 'F1') { showBoxes = !showBoxes; return; }
      if (c === 'F6' && fight.paused) { stepOnce = true; return; }
    }
  },
  win: {
    enter() { Music.play('win'); Audio2.file('jingle', 0.6); },
    draw() {
      const p = ROSTER[sel.player], c = ROSTER[sel.cpu];
      ctx.drawImage(IMG['s_' + c.stage], 0, 0, W, H); ctx.fillStyle = 'rgba(6,4,30,.72)'; ctx.fillRect(0, 0, W, H);
      drawPortrait('pv_' + p.id, 50, 230, 480, 420, false, true);
      drawPortrait('pd_' + c.id, W - 470, 290, 420, 360, true, true);
      heavyText('YOU WIN!', W / 2, 110, 84, '#ffd23f');
      outlined(p.name + ' DEFEATS ' + c.name, W / 2, 190, 24, '#6ff3ff');
      if (Scene.t % 60 < 42) outlined('PRESS ENTER · NEXT OPPONENT', W / 2, 670, 22, '#ffffff');
      outlined('ESC · TITLE', W / 2, 700, 13, '#cfe0ff');
    },
    key(c) {
      if (isConfirm(c) && Scene.t > 40) { sel.step = 2; sel.cursor = (sel.cpu + 1) % ROSTER.length; if (sel.cursor === sel.player) sel.cursor = (sel.cursor + 1) % ROSTER.length; Audio2.file('confirm'); Scene.go('select'); }
      if (c === 'Escape') Scene.go('title');
    }
  },
  continue: {
    enter() { Music.play(null); this.count = 9; },
    update() {
      if (Scene.t % 60 === 59 && Scene.fadeDir === 0) { this.count--; Audio2.sfx('move'); if (this.count < 0) Scene.go('gameover'); }
    },
    draw() {
      const p = ROSTER[sel.player];
      ctx.fillStyle = '#0a0628'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0730'); g.addColorStop(1, '#1a0b3e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#34d6f2'; ctx.lineWidth = 4; ctx.strokeRect(30, 30, W - 60, H - 60);
      heavyText('CONTINUE?', W / 2, 115, 64, '#ffd23f', 'center', null);
      heavyText(String(Math.max(0, this.count)), W / 2, 300, 150, '#ff4fb0', 'center', null);
      drawPortrait('pv_' + p.id, 80, 300, 400, 330, false, true);
      drawPortrait('pd_' + p.id, W - 480, 300, 400, 330, false, true);
      ctx.font = '900 30px "Arial Black", sans-serif'; ctx.fillStyle = '#6ff3ff'; ctx.textAlign = 'center'; ctx.fillText(p.name, W / 2, 560);
      if (Scene.t % 50 < 34) { ctx.fillStyle = '#ffffff'; ctx.fillText('PRESS START', W / 2, 630); }
    },
    key(c) {
      if (isConfirm(c) && Scene.t > 20) { Audio2.file('coin'); Scene.go('vs'); }
      if (c === 'Escape') Scene.go('gameover');
    }
  },
  gameover: {
    update() { if (Scene.t === 180) Scene.go('title'); },
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      heavyText('GAME OVER', W / 2, H / 2, 90, '#ff3b4f', 'center', '#3a0a18');
    },
    key(c) { if (isConfirm(c) && Scene.t > 30) Scene.go('title'); }
  }
};

/* ---------- Teclado / mouse ---------- */
let stepOnce = false;
addEventListener('keydown', e => {
  const c = e.code;
  if (['F1', 'F2', 'F6', 'Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(c) || KEYMAP[c]) e.preventDefault();
  if (c === 'KeyM' && !e.repeat) { Audio2.init(); Audio2.toggleMute(); return; }
  if (Scene.cur === 'fight') {
    const b = KEYMAP[c];
    if (b) { keys.add(b); if (!e.repeat && BUTTONS.includes(b) && !fight.paused) pressQueue.push(b); }
  }
  if (e.repeat && Scene.cur !== 'select') return;
  if (Scene.cur === 'fight' && KEYMAP[c] && !['Enter'].includes(c)) return;
  Scene.key(c);
});
addEventListener('keyup', e => { const b = KEYMAP[e.code]; if (b) keys.delete(b); });
addEventListener('blur', () => keys.clear());
function toCanvas(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); Audio2.init();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  const [x, y] = toCanvas(e);
  if (Scene.cur === 'fight') {
    if (inBtn(x, y, FS_FIGHT)) { toggleFullscreen(); return; }
    fightPointer(e.pointerId, x, y); return;
  }
  if (!['loading', 'studio'].includes(Scene.cur) && inBtn(x, y, FS_MENU)) { toggleFullscreen(); return; }
  const S = SCENES[Scene.cur];
  if (S.click) S.click(x, y); else Scene.key('Enter');
});
canvas.addEventListener('pointermove', e => { if (e.pointerId === stick.id) { const [x, y] = toCanvas(e); stickUpdate(x, y); } });
const endPtr = e => { if (e.pointerId === stick.id) stickRelease(); };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- Loop ---------- */
let acc = 0, lastT = 0;
function safe(fn) { try { fn(); } catch (err) { console.error(err); } }
function loop(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000 || 0); lastT = t;
  acc += dt; let n = 0;
  while (acc >= 1 / 60 && n < 4) { safe(() => Scene.update()); acc -= 1 / 60; n++; }
  if (n === 4) acc = 0;
  safe(() => Scene.draw());
  requestAnimationFrame(loop);
}

/* ---------- Sprites sob demanda (economiza memória no celular) ---------- */
const charLoads = {};
function ensureChars(ids) {
  for (const k of Object.keys(IMG)) if (k.startsWith('c_') && !ids.includes(k.slice(2))) { delete IMG[k]; delete charLoads[k.slice(2)]; }
  return Promise.all(ids.map(id => charLoads[id] || (charLoads[id] = loadImg('c_' + id, `chars/${id}.webp`))));
}

/* ---------- Boot ---------- */
let loadProgress = 0;
(async function boot() {
  requestAnimationFrame(loop);
  const list = [['studio', 'ui/studio.webp'], ['title', 'ui/title.webp'], ['logo', 'ui/logo.webp'], ['select', 'ui/select.webp']];
  for (const r of ROSTER) {
    list.push(['pv_' + r.id, `portraits/${r.id}_victory.webp`], ['pd_' + r.id, `portraits/${r.id}_defeat.webp`]);
  }
  for (const k of Object.keys(STAGES)) list.push(['s_' + k, `stages/${k}.webp`]);
  for (const t of ['stick_base', 'stick_knob', 'mp', 'hp', 'mk', 'hk', 'grab', 'special', 'pause', 'fs_enter', 'fs_exit', 'rotate']) list.push(['t_' + t, `ui/touch/${t}.webp`]);
  let done = 0;
  await Promise.all(list.map(([k, s]) => loadImg(k, s).then(() => { done++; loadProgress = done / list.length; })));
  try { await Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('600 15px "Chakra Petch"')]); } catch (e) { }
  Scene.enter('studio');
})();
