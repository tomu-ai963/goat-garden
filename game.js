/* =========================================================
 *  やぎさん牧場 〜しあわせホルモン農園〜
 *  Canvas 2D + DOM overlay / 外部画像なし
 * ========================================================= */
'use strict';
(() => {

// ---------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const pick = a => a[Math.floor(Math.random() * a.length)];
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif';
const TEXT_FONT = '"Hiragino Maru Gothic ProN","BIZ UDPGothic","Yu Gothic UI","Meiryo",sans-serif';
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------
// ゲームデータ
// ---------------------------------------------------------
const CROPS = {
  grass:   { name: '牧草',     emoji: '🌿', seed: 1,  grow: 12, yield: 3,   unlock: 0,   color: '#7fd36b' },
  flower:  { name: 'お花',     emoji: '🌷', seed: 4,  grow: 20, yield: 9,   unlock: 30,  color: '#ff9ccf' },
  carrot:  { name: 'にんじん', emoji: '🥕', seed: 8,  grow: 32, yield: 18,  unlock: 70,  color: '#ffa94d' },
  berry:   { name: 'いちご',   emoji: '🍓', seed: 15, grow: 45, yield: 34,  unlock: 150, color: '#ff6b81' },
  pumpkin: { name: 'かぼちゃ', emoji: '🎃', seed: 30, grow: 70, yield: 75,  unlock: 300, color: '#ff922b' },
};
const CROP_ORDER = ['grass', 'flower', 'carrot', 'berry', 'pumpkin'];
const MAX_PLOTS = 12, START_PLOTS = 6;
const PLOT_COSTS = [20, 30, 45, 65, 90, 120];
const FENCE_COSTS = [40, 100, 220];
const FENCE_MUL = [1, 1.3, 1.65, 2.1];
const GOAT_COSTS = [40, 100, 200, 350];      // 💖で支払い
const MAX_GOATS = 5;
const GOAT_NAMES = ['メイ', 'ユキ', 'モカ', 'ココ', 'ラテ'];
const GOAT_COLORS = [
  { body: '#fffaf3', leg: '#f1e6da', accent: '#ffd0dc', collar: '#ff7aa8' },
  { body: '#f6e6d2', leg: '#e8d2b8', accent: '#ffcfae', collar: '#5cc8ff' },
  { body: '#dcbc9c', leg: '#c9a582', accent: '#f6c9a6', collar: '#ffcf3b' },
  { body: '#eeeef7', leg: '#dcdcea', accent: '#d9d2ff', collar: '#9b7bff' },
  { body: '#8d7466', leg: '#776055', accent: '#c9a493', collar: '#63e6be' },
];
// ヤギの性格。項目がない倍率は 1（ふつう）
//   esc: 脱走までの時間  walk: 歩く速さ  rush: 作物へ向かう速さ  eat: 食べ終わるまでの時間
//   pet/petMax: なでたときの💖と喜ぶ回数  lonely: かまわれないと脱走が早まるまでの秒数
//   lure: 餌で帰る速さ  flee/fleeT: 逃げる速さと逃げる時間  bonus: 手で戻したときの追加💖  stick: 木の棒の💖減少・拗ね
const PERSONA = [
  { label: 'のんびり屋', icon: '🌼', desc: '脱走しにくく、外でもゆっくり歩く', esc: 1.35, walk: 0.7, rush: 0.75,
    lines: ['ふわぁ〜', 'のんびり〜', 'ぽかぽか〜'] },
  { label: 'あまえんぼう', icon: '🎀', desc: 'なでると💖+2、5回まで喜ぶ。かまわないとすねて脱走が早まる', pet: 2, petMax: 5, lonely: 45,
    lines: ['もっとなでて〜', 'すき〜💕', 'えへへ'] },
  { label: 'くいしんぼう', icon: '🍽️', desc: '熟した作物にまっしぐらで食べるのが速い。餌で釣るとすぐ帰る', rush: 1.4, eat: 0.6, lure: 1.8,
    lines: ['おなかすいた〜', 'にんじん…', 'もぐもぐしたい'] },
  { label: 'おてんば', icon: '⚡', desc: 'よく脱走して逃げ足も速い。手で戻すと💖+5', esc: 0.7, flee: 1.3, bonus: 5,
    lines: ['あそぼ！', 'そと行きたい！', 'かけっこしよ！'] },
  { label: 'こわがり', icon: '💧', desc: '押すと遠くまで逃げる。木の棒で拗ねると💖が2倍減る', fleeT: 1.6, stick: 2,
    lines: ['びくっ…', 'やさしくね…', 'こわくない？'] },
];
const persona = g => PERSONA[g.ci % PERSONA.length];
const pv = (g, k) => persona(g)[k] ?? 1;
const FOOD_PACK_COST = 12, FOOD_LURE_SERO = 8, BELL_CD = 25;
// 💖報酬：やさしく追い込んで戻すのが一番おいしい。なでるは控えめ＆すぐ満足する
const RETURN_OXY = { hand: 12, food: 3, bell: 2, self: 1 };
const FOOD_LURE_OXY = 1;
const PET_OXY = 1, PET_MAX = 3, PET_REST = 25;
const TOOLS = ['auto', 'stick', 'food', 'bell'];
// 脱走の緊張感：食べられた畑はしばらく荒れて使えない／外にヤギがいると他の子もソワソワ
const RUIN_T = 20, CONTAGION = 0.6;
// 追い込みの腕前ボーナス：脱走から早く戻すほど、続けて戻すほどおいしい
const SPEED_BONUS = [{ t: 8, b: 6, label: '⚡はやい！' }, { t: 16, b: 3, label: '⏱️いいね' }];
const COMBO_WIN = 5, COMBO_OXY = 5;
// 両替：💖 OXY_PER_SERO → 🌱1（信頼度の経験値は減らない）
const OXY_PER_SERO = 10;
// ゲート：開けっぱなしだと柵の中の子がゲートから出ていきやすい（脱走タイマーの進む倍率）
const GATE_OPEN_ESC = 2.5;
const SAVE_KEY = 'goatGardenSave_v1';

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas');
const topbar = $('topbar'), bottombar = $('bottombar');

// ---------------------------------------------------------
// 状態
// ---------------------------------------------------------
function defaultState() {
  return {
    sero: 10, oxy: 0, trustXP: 0,
    unlockedCrops: { grass: true },
    plotCount: START_PLOTS,
    plots: Array.from({ length: MAX_PLOTS }, () => ({ crop: null, t: 0, ruin: 0 })),
    fenceLvl: 0, stick: false, bell: false, fert: false,
    food: 1, grassItem: 0,
    goatDefs: [{ name: GOAT_NAMES[0], c: 0 }],
    speed: 1, tool: 'auto', seed: 'grass', bellCD: 0,
    sound: true, seen: {}, gateOpen: false,
  };
}
let S = defaultState();
let isNewGame = true;
try {
  const d = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (d && d.v === 1 && d.s) {
    S = Object.assign(defaultState(), d.s);
    while (S.plots.length < MAX_PLOTS) S.plots.push({ crop: null, t: 0, ruin: 0 });
    S.plots.forEach(p => { if (!(p.ruin > 0)) p.ruin = 0; });
    if (!TOOLS.includes(S.tool)) S.tool = 'auto';   // 旧セーブの seed/pet/hand → おまかせ
    isNewGame = false;
  }
} catch (e) { /* ignore */ }

const L = {};             // レイアウト
let dpr = 1;
let goats = [];
let parts = [];
const plotFx = Array.from({ length: MAX_PLOTS }, () => ({ sq: 0, sqv: 0 }));
let paused = false;
let clock = 0, herdCombo = 0, lastHerdT = -99, outsideN = 0;   // clock はゲーム内時間
let gateK = 0, lastGateHintT = -99;   // gateK: ドアの開き具合（0=閉 1=開）の表示用
const hover = { x: -999, y: -999, show: false };
let clouds = [];

// ---------------------------------------------------------
// サウンド（WebAudio・ごく軽い効果音）
// ---------------------------------------------------------
let actx = null;
function ensureAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function tone(f1, f2, dur, type = 'sine', vol = 0.12, delay = 0) {
  if (!S.sound || !actx) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const SFX = {
  pop:     () => tone(700, 260, 0.1, 'sine', 0.13),
  plant:   () => { tone(420, 520, 0.08, 'triangle', 0.1); },
  harvest: () => { tone(660, 680, 0.09, 'triangle', 0.12); tone(990, 1000, 0.14, 'triangle', 0.12, 0.08); },
  heart:   () => { tone(880, 1100, 0.1, 'sine', 0.08); tone(1320, 1500, 0.12, 'sine', 0.06, 0.07); },
  stick:   () => { tone(180, 80, 0.12, 'square', 0.08); tone(1200, 1500, 0.08, 'sine', 0.06, 0.05); },
  bell:    () => { tone(1320, 1300, 0.7, 'triangle', 0.1); tone(1760, 1740, 0.6, 'sine', 0.06, 0.05); tone(1320, 1300, 0.6, 'triangle', 0.08, 0.25); },
  escape:  () => { tone(300, 760, 0.18, 'sine', 0.1); },
  gate:    open => { tone(open ? 260 : 420, open ? 420 : 220, 0.12, 'triangle', 0.1); tone(140, 120, 0.06, 'square', 0.05, 0.1); },
  home:    () => { tone(523, 530, 0.1, 'triangle', 0.1); tone(659, 660, 0.1, 'triangle', 0.1, 0.09); tone(784, 790, 0.16, 'triangle', 0.1, 0.18); },
  munch:   () => { tone(220, 160, 0.06, 'square', 0.035); },
  buy:     () => { tone(784, 790, 0.08, 'triangle', 0.1); tone(1046, 1050, 0.18, 'triangle', 0.1, 0.07); },
  level:   () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.1, i * 0.09)); },
  nope:    () => { tone(240, 180, 0.15, 'sine', 0.08); },
};

// ---------------------------------------------------------
// 信頼レベル
// ---------------------------------------------------------
const xpFor = l => 8 * (l - 1) * l;
function trustLevel(xp = S.trustXP) { let l = 1; while (l < 10 && xp >= xpFor(l + 1)) l++; return l; }
// ゲーム内タイマーは S.speed 倍で進むので、表示する残り秒は実時間に直す
const realSec = t => Math.ceil(t / S.speed);

function addOxy(n, x, y) {
  const before = trustLevel();
  if (n >= 0) { S.oxy += n; S.trustXP += n; }
  else { S.oxy = Math.max(0, S.oxy + n); S.trustXP = Math.max(0, S.trustXP + n); }
  if (x !== undefined && n !== 0) floatText(x, y, (n > 0 ? '+' : '') + n + '💖', n > 0 ? '#ff5c9a' : '#9a7b8a');
  bumpGauge('oxyGauge');
  const after = trustLevel();
  if (after > before) {
    toast(`💖 信頼度 Lv.${after} にアップ！ヤギがもっとなついた！`, 'good');
    SFX.level();
    goats.forEach(g => { sparkles(g.x, g.y - 30 * L.sc, 5); say(g, '💕', 2); });
  } else if (after < before) {
    toast(`💔 信頼度が Lv.${after} に下がっちゃった…やさしく戻して取り戻そう`, 'warn');
    SFX.nope();
  }
}
function addSero(n, x, y) {
  S.sero = Math.max(0, S.sero + n);
  if (x !== undefined && n !== 0) floatText(x, y, (n > 0 ? '+' : '') + n + '🌱', n > 0 ? '#2fae5a' : '#b0774a');
  bumpGauge('seroGauge');
}

// ---------------------------------------------------------
// レイアウト
// ---------------------------------------------------------
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  L.w = w; L.h = h;
  L.top = topbar.getBoundingClientRect().bottom + 2;
  L.bottom = bottombar.getBoundingClientRect().top - 2;
  const areaH = L.bottom - L.top;
  const sc = L.sc = clamp(Math.min(w, areaH * 1.25) / 640, 0.55, 1.2);
  const m = 14 * sc;
  L.portrait = w / areaH < 1.0;
  if (!L.portrait) {
    const fw = clamp(w * 0.36, 220 * sc, 470 * sc);
    L.fence = { x: m + 6 * sc, y: L.top + m + 8 * sc, w: fw, h: areaH - 2 * m - 16 * sc };
    L.gate = { x: L.fence.x + L.fence.w, y: L.fence.y + L.fence.h * 0.5, nx: 1, ny: 0 };
    const fx = L.fence.x + L.fence.w + 80 * sc;
    L.field = { x: fx, y: L.top + m, w: w - fx - m, h: areaH - 2 * m };
  } else {
    const fh = clamp(areaH * 0.38, 160 * sc, 380 * sc);
    L.fence = { x: m + 6 * sc, y: L.top + m + 4 * sc, w: w - 2 * m - 12 * sc, h: fh };
    L.gate = { x: L.fence.x + L.fence.w * 0.5, y: L.fence.y + L.fence.h, nx: 0, ny: 1 };
    const fy = L.fence.y + L.fence.h + 70 * sc;
    L.field = { x: m, y: fy, w: w - 2 * m, h: L.bottom - fy - m };
  }
  L.gateW = 66 * sc;
  L.gateOut = { x: L.gate.x + L.gate.nx * 34 * sc, y: L.gate.y + L.gate.ny * 34 * sc };
  L.gateIn = { x: L.gate.x - L.gate.nx * 48 * sc, y: L.gate.y - L.gate.ny * 48 * sc };
  L.hut = { x: L.fence.x + 14 * sc, y: L.fence.y + 12 * sc, s: 58 * sc };

  // 畑グリッド
  const f = L.field;
  const cols = f.w >= f.h ? 4 : 3, rows = Math.ceil(MAX_PLOTS / cols);
  const cell = Math.min(f.w / cols, f.h / rows);
  const ps = Math.min(cell * 0.76, 130 * sc);
  const gx0 = f.x + (f.w - cell * cols) / 2, gy0 = f.y + (f.h - cell * rows) / 2;
  L.plots = [];
  for (let i = 0; i < MAX_PLOTS; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    L.plots.push({ x: gx0 + (c + 0.5) * cell, y: gy0 + (r + 0.5) * cell, s: ps });
  }
  L.gridRect = { x: gx0, y: gy0, w: cell * cols, h: cell * rows };

  // ヤギの位置を補正
  goats.forEach(g => {
    g.exit = null;
    if (g.state === 'inside' || g.state === 'toGate') { const p = clampInside(g.x, g.y); g.x = p.x; g.y = p.y; g.target = null; }
    else if (g.state !== 'exiting') clampScreen(g);
  });
  clouds = Array.from({ length: 3 }, (_, i) => ({ x: rand(0, w), y: rand(L.top, L.bottom), r: rand(90, 160) * sc, v: rand(6, 12) * sc, seed: i }));
  buildBg();
}

function clampInside(x, y) {
  const f = L.fence, pad = 22 * L.sc;
  return { x: clamp(x, f.x + pad, f.x + f.w - pad), y: clamp(y, f.y + pad + 10 * L.sc, f.y + f.h - pad * 0.6) };
}
function clampScreen(g) {
  const m = 16 * L.sc;
  g.x = clamp(g.x, m, L.w - m);
  g.y = clamp(g.y, L.top + 30 * L.sc, L.bottom - 6 * L.sc);
}
function randomInside() {
  const f = L.fence, pad = 28 * L.sc, h = L.hut;
  for (let i = 0; i < 20; i++) {
    const x = rand(f.x + pad, f.x + f.w - pad), y = rand(f.y + pad + 16 * L.sc, f.y + f.h - pad * 0.6);
    if (x < h.x + h.s + 14 * L.sc && y < h.y + h.s + 22 * L.sc) continue;
    return { x, y };
  }
  return { x: f.x + f.w / 2, y: f.y + f.h / 2 };
}
function randomFieldPoint() {
  const f = L.field;
  return { x: rand(f.x + 10, f.x + f.w - 10), y: rand(f.y + 30 * L.sc, f.y + f.h - 10) };
}

// ---------------------------------------------------------
// 背景（静的部分をオフスクリーンに描く）
// ---------------------------------------------------------
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function buildBg() {
  bgCanvas.width = Math.round(L.w * dpr); bgCanvas.height = Math.round(L.h * dpr);
  const b = bgCanvas.getContext('2d');
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = L.sc, rnd = mulberry32(1234);
  // 芝生
  const gr = b.createLinearGradient(0, 0, 0, L.h);
  gr.addColorStop(0, '#c6efae'); gr.addColorStop(1, '#a9df92');
  b.fillStyle = gr; b.fillRect(0, 0, L.w, L.h);
  // 刈り込みストライプ
  b.save(); b.globalAlpha = 0.07; b.fillStyle = '#ffffff';
  for (let x = -L.h; x < L.w; x += 70 * sc) {
    b.beginPath(); b.moveTo(x, 0); b.lineTo(x + 35 * sc, 0); b.lineTo(x + 35 * sc + L.h * 0.6, L.h); b.lineTo(x + L.h * 0.6, L.h); b.closePath(); b.fill();
  }
  b.restore();
  // 草の房
  for (let i = 0; i < (L.w * L.h) / 2600; i++) {
    const x = rnd() * L.w, y = rnd() * L.h, s = (3 + rnd() * 4) * sc;
    b.strokeStyle = rnd() < 0.5 ? 'rgba(90,160,70,.35)' : 'rgba(255,255,255,.35)';
    b.lineWidth = 1.6 * sc; b.lineCap = 'round';
    b.beginPath(); b.moveTo(x - s, y); b.quadraticCurveTo(x - s * 0.6, y - s, x - s * 0.2, y - s * 1.3);
    b.moveTo(x, y); b.lineTo(x, y - s * 1.6);
    b.moveTo(x + s, y); b.quadraticCurveTo(x + s * 0.6, y - s, x + s * 0.2, y - s * 1.3); b.stroke();
  }
  // 小花
  const fc = ['#ffffff', '#ffd1e3', '#fff2a8', '#d8ccff'];
  for (let i = 0; i < (L.w * L.h) / 9000; i++) {
    const x = rnd() * L.w, y = rnd() * L.h;
    if (inRect(x, y, L.fence, 20 * sc) || inRect(x, y, L.gridRect, 10 * sc)) continue;
    const r = (2.2 + rnd() * 1.5) * sc;
    b.fillStyle = fc[Math.floor(rnd() * fc.length)];
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; b.beginPath(); b.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, 0, TAU); b.fill(); }
    b.fillStyle = '#ffcf4d'; b.beginPath(); b.arc(x, y, r * 0.6, 0, TAU); b.fill();
  }
  // 小道（ゲート → 畑）
  b.save();
  b.strokeStyle = 'rgba(241,220,176,.85)'; b.lineCap = 'round'; b.lineWidth = 46 * sc;
  const fc2 = { x: L.gridRect.x + L.gridRect.w / 2, y: L.gridRect.y + L.gridRect.h / 2 };
  b.beginPath(); b.moveTo(L.gate.x, L.gate.y);
  b.quadraticCurveTo(L.gateOut.x + L.gate.nx * 40 * sc, L.gateOut.y + L.gate.ny * 40 * sc, fc2.x, fc2.y); b.stroke();
  b.strokeStyle = 'rgba(255,255,255,.25)'; b.lineWidth = 30 * sc; b.stroke();
  b.restore();
  // 畑エリアの下地
  const g2 = L.gridRect;
  b.fillStyle = 'rgba(236,210,160,.55)'; rr(b, g2.x - 6 * sc, g2.y - 6 * sc, g2.w + 12 * sc, g2.h + 12 * sc, 28 * sc); b.fill();
  b.strokeStyle = 'rgba(255,255,255,.6)'; b.lineWidth = 3 * sc; b.setLineDash([8 * sc, 8 * sc]); b.stroke(); b.setLineDash([]);
  // 柵の中（ヤギの庭）
  const f = L.fence;
  b.fillStyle = '#d9f6c2'; rr(b, f.x, f.y, f.w, f.h, 18 * sc); b.fill();
  b.fillStyle = 'rgba(255,255,255,.35)'; rr(b, f.x + 8 * sc, f.y + 8 * sc, f.w - 16 * sc, f.h - 16 * sc, 14 * sc); b.fill();
  for (let i = 0; i < f.w * f.h / 1800; i++) {
    const x = f.x + rnd() * f.w, y = f.y + rnd() * f.h;
    b.fillStyle = 'rgba(120,190,90,.25)'; b.beginPath(); b.ellipse(x, y, 3 * sc, 1.6 * sc, 0, 0, TAU); b.fill();
  }
  drawHut(b, sc);
  drawYardProps(b, sc);
  drawFence(b, sc);
  // 木（飾り）
  const trees = [];
  for (let i = 0; i < 30 && trees.length < 4; i++) {
    const x = rnd() * L.w, y = L.top + 40 * sc + rnd() * (L.bottom - L.top - 60 * sc);
    if (inRect(x, y, L.fence, 50 * sc) || inRect(x, y, L.gridRect, 50 * sc) || dist(x, y, L.gateOut.x, L.gateOut.y) < 120 * sc) continue;
    trees.push({ x, y });
  }
  trees.forEach(t => drawBush(b, t.x, t.y, sc));
}
function inRect(x, y, r, pad = 0) { return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad; }

function drawBush(b, x, y, sc) {
  b.fillStyle = 'rgba(60,100,40,.2)'; b.beginPath(); b.ellipse(x, y + 4 * sc, 26 * sc, 8 * sc, 0, 0, TAU); b.fill();
  const cs = [[-12, -12, 14], [10, -14, 15], [0, -24, 16], [-2, -8, 15]];
  b.strokeStyle = '#5b8a3e'; b.lineWidth = 2 * sc;
  cs.forEach(([dx, dy, r]) => { b.fillStyle = '#86cf6a'; b.beginPath(); b.arc(x + dx * sc, y + dy * sc, r * sc, 0, TAU); b.fill(); b.stroke(); });
  cs.forEach(([dx, dy, r]) => { b.fillStyle = '#9bdc7c'; b.beginPath(); b.arc(x + dx * sc, y + dy * sc, r * sc - 1.5 * sc, 0, TAU); b.fill(); });
  b.fillStyle = 'rgba(255,255,255,.4)'; b.beginPath(); b.arc(x - 4 * sc, y - 30 * sc, 5 * sc, 0, TAU); b.fill();
  b.fillStyle = '#ff7a8a';[[-10, -16], [8, -22], [2, -10]].forEach(([dx, dy]) => { b.beginPath(); b.arc(x + dx * sc, y + dy * sc, 2.6 * sc, 0, TAU); b.fill(); });
}

function drawHut(b, sc) {
  const h = L.hut, x = h.x, y = h.y, s = h.s, OL = '#5b4636';
  b.fillStyle = 'rgba(60,100,40,.18)'; b.beginPath(); b.ellipse(x + s / 2, y + s + 2 * sc, s * 0.6, 8 * sc, 0, 0, TAU); b.fill();
  b.lineWidth = 2.2 * sc; b.strokeStyle = OL; b.lineJoin = 'round';
  b.fillStyle = '#fff1dc'; rr(b, x + s * 0.08, y + s * 0.38, s * 0.84, s * 0.6, 6 * sc); b.fill(); b.stroke();
  b.fillStyle = '#ff9aa8'; b.beginPath(); b.moveTo(x - s * 0.04, y + s * 0.45); b.lineTo(x + s / 2, y + s * 0.02); b.lineTo(x + s * 1.04, y + s * 0.45); b.closePath(); b.fill(); b.stroke();
  b.fillStyle = 'rgba(255,255,255,.45)'; b.beginPath(); b.moveTo(x + s * 0.18, y + s * 0.38); b.lineTo(x + s / 2, y + s * 0.12); b.lineTo(x + s * 0.55, y + s * 0.18); b.lineTo(x + s * 0.28, y + s * 0.4); b.fill();
  b.fillStyle = '#c58b5a'; b.beginPath(); b.moveTo(x + s * 0.36, y + s * 0.98); b.lineTo(x + s * 0.36, y + s * 0.7); b.arc(x + s / 2, y + s * 0.7, s * 0.14, Math.PI, 0); b.lineTo(x + s * 0.64, y + s * 0.98); b.closePath(); b.fill(); b.stroke();
  b.font = `${12 * sc}px ${EMOJI_FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('💗', x + s / 2, y + s * 0.3);
}

function drawYardProps(b, sc) {
  const f = L.fence, OL = '#5b4636';
  // 干し草
  const hx = f.x + 40 * sc, hy = f.y + f.h - 30 * sc;
  b.fillStyle = 'rgba(60,100,40,.18)'; b.beginPath(); b.ellipse(hx, hy + 8 * sc, 26 * sc, 7 * sc, 0, 0, TAU); b.fill();
  b.fillStyle = '#ffe08a'; b.strokeStyle = OL; b.lineWidth = 2 * sc;
  b.beginPath(); b.ellipse(hx, hy, 24 * sc, 13 * sc, 0, Math.PI, 0); b.lineTo(hx + 24 * sc, hy + 6 * sc); b.lineTo(hx - 24 * sc, hy + 6 * sc); b.closePath(); b.fill(); b.stroke();
  b.strokeStyle = '#e0b84a'; b.lineWidth = 1.5 * sc;
  for (let i = -3; i <= 3; i++) { b.beginPath(); b.moveTo(hx + i * 6 * sc, hy + 4 * sc); b.lineTo(hx + i * 5 * sc + 3 * sc, hy - 8 * sc); b.stroke(); }
  // 水飲み場
  const tx = f.x + f.w - 50 * sc, ty = f.y + 26 * sc;
  b.fillStyle = 'rgba(60,100,40,.18)'; b.beginPath(); b.ellipse(tx, ty + 10 * sc, 28 * sc, 6 * sc, 0, 0, TAU); b.fill();
  b.fillStyle = '#c58b5a'; b.strokeStyle = OL; b.lineWidth = 2 * sc; rr(b, tx - 26 * sc, ty - 8 * sc, 52 * sc, 18 * sc, 6 * sc); b.fill(); b.stroke();
  b.fillStyle = '#8fd8ff'; rr(b, tx - 21 * sc, ty - 5 * sc, 42 * sc, 9 * sc, 4 * sc); b.fill();
  b.fillStyle = 'rgba(255,255,255,.7)'; rr(b, tx - 16 * sc, ty - 4 * sc, 12 * sc, 3 * sc, 2 * sc); b.fill();
}

function drawFence(b, sc) {
  const f = L.fence, lvl = S.fenceLvl, OL = '#5b4636';
  const railC = ['#d39a62', '#c4834a', '#fff6ea', '#fffaf2'][lvl];
  const postC = ['#b07a45', '#93602f', '#ffb3c8', '#ff9cbc'][lvl];
  const lw = [5, 6.5, 6.5, 7.5][lvl] * sc;
  const gw = L.gateW / 2;
  const segs = [];
  const TL = [f.x, f.y], TR = [f.x + f.w, f.y], BR = [f.x + f.w, f.y + f.h], BL = [f.x, f.y + f.h];
  if (L.gate.nx === 1) {
    segs.push([TL, TR], [TR, [f.x + f.w, L.gate.y - gw]], [[f.x + f.w, L.gate.y + gw], BR], [BR, BL], [BL, TL]);
  } else {
    segs.push([TL, TR], [TR, BR], [BR, [L.gate.x + gw, f.y + f.h]], [[L.gate.x - gw, f.y + f.h], BL], [BL, TL]);
  }
  b.lineCap = 'round'; b.lineJoin = 'round';
  const line = (a, c, w, col, oy = 0) => { b.strokeStyle = col; b.lineWidth = w; b.beginPath(); b.moveTo(a[0], a[1] + oy); b.lineTo(c[0], c[1] + oy); b.stroke(); };
  // 石の土台 (Lv3)
  if (lvl >= 3) segs.forEach(([a, c]) => { line(a, c, 16 * sc, '#8c8279', 2 * sc); line(a, c, 13 * sc, '#d8d0c7', 2 * sc); });
  // 影
  segs.forEach(([a, c]) => line(a, c, lw + 4 * sc, 'rgba(60,90,40,.22)', 5 * sc));
  // レール
  const rails = lvl >= 2 ? [-7 * sc, 0] : [-4 * sc];
  rails.forEach(oy => segs.forEach(([a, c]) => { line(a, c, lw + 3 * sc, OL, oy); line(a, c, lw, railC, oy); line(a, c, lw * 0.3, 'rgba(255,255,255,.5)', oy - lw * 0.2); }));
  // 杭
  const post = (x, y, big = false) => {
    const pw = (big ? 13 : 9) * sc, ph = (big ? 22 : 15) * sc;
    b.fillStyle = 'rgba(60,90,40,.25)'; b.beginPath(); b.ellipse(x, y + 3 * sc, pw * 0.7, 3 * sc, 0, 0, TAU); b.fill();
    b.fillStyle = postC; b.strokeStyle = OL; b.lineWidth = 2 * sc;
    rr(b, x - pw / 2, y - ph, pw, ph + 2 * sc, 3 * sc); b.fill(); b.stroke();
    b.fillStyle = 'rgba(255,255,255,.45)'; rr(b, x - pw / 2 + 2 * sc, y - ph + 2 * sc, 2.5 * sc, ph - 4 * sc, 1 * sc); b.fill();
    if (lvl >= 2) { b.fillStyle = lvl >= 3 ? '#ffd43b' : '#fff'; b.beginPath(); b.arc(x, y - ph, pw * 0.45, 0, TAU); b.fill(); b.stroke(); }
  };
  segs.forEach(([a, c], si) => {
    const len = dist(a[0], a[1], c[0], c[1]), n = Math.max(1, Math.round(len / (32 * sc)));
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (c[0] - a[0]) * i / n, y = a[1] + (c[1] - a[1]) * i / n;
      post(x, y);
      if (lvl >= 3 && (i + si) % 3 === 0) { b.font = `${11 * sc}px ${EMOJI_FONT}`; b.textAlign = 'center'; b.fillText('🌼', x + 8 * sc, y + 6 * sc); }
    }
  });
  // ゲートの大きい杭 + 看板
  const g = L.gate;
  const p1 = g.nx === 1 ? [g.x, g.y - gw] : [g.x - gw, g.y], p2 = g.nx === 1 ? [g.x, g.y + gw] : [g.x + gw, g.y];
  post(p1[0], p1[1], true); post(p2[0], p2[1], true);
  // 旗
  [p1, p2].forEach(p => {
    b.fillStyle = '#ff8fb8'; b.strokeStyle = OL; b.lineWidth = 1.5 * sc;
    b.beginPath(); b.moveTo(p[0], p[1] - 22 * sc); b.lineTo(p[0] + 12 * sc, p[1] - 18 * sc); b.lineTo(p[0], p[1] - 14 * sc); b.closePath(); b.fill(); b.stroke();
  });
  // 看板
  const sx = g.nx === 1 ? g.x + 30 * sc : g.x + gw + 34 * sc, sy = g.nx === 1 ? g.y - gw - 34 * sc : g.y + 26 * sc;
  b.fillStyle = '#b07a45'; b.fillRect(sx - 2 * sc, sy, 4 * sc, 18 * sc);
  b.fillStyle = '#fff6e6'; b.strokeStyle = OL; b.lineWidth = 2 * sc; rr(b, sx - 26 * sc, sy - 12 * sc, 52 * sc, 20 * sc, 6 * sc); b.fill(); b.stroke();
  b.fillStyle = '#c2447a'; b.font = `bold ${11 * sc}px ${TEXT_FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('ゲート', sx, sy - 2 * sc);
}

// ---------------------------------------------------------
// ヤギ
// ---------------------------------------------------------
let goatIdSeq = 0;
function makeGoat(def, x, y) {
  return {
    id: goatIdSeq++, name: def.name, ci: def.c, color: GOAT_COLORS[def.c % GOAT_COLORS.length],
    x, y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 1 : -1,
    state: 'inside', target: null, idle: rand(0.5, 2),
    walkPhase: Math.random() * 6, hop: 0, extraHop: 0, sq: 0, sqv: 0, lastSin: 0,
    escapeT: 0, mood: 'normal', moodT: 0, sulk: 0, bubble: null,
    petCount: 0, petCD: 0, satisfiedT: 0, feedCD: 0, munchT: 0,
    blinkT: rand(1, 4), blink: 0, eatPlot: -1, eatT: 0, fleeT: 0, fleeSpeed: 0,
    returnMode: null, noCropT: 0, outT: 0, fxT: 0, speedNow: 0, stateT: 0, headTilt: 0, exitD0: 1, lonelyT: 0,
  };
}
function nextEscape(g) {
  const lvl = trustLevel();
  let t = rand(26, 48);
  t *= FENCE_MUL[S.fenceLvl];
  t *= 1 + (lvl - 1) * 0.08;
  if (g.sulk > 0) t *= 0.55;
  t *= pv(g, 'esc');
  t *= 1 + (goats.length - 1) * 0.12;
  return t;
}
// 脱走ルート：ゲートが開いていればゲートから歩いて、閉まっていれば柵のどこかを飛び越えて出る
function planEscape(g) {
  if (S.gateOpen) { g.exit = { gate: true, inX: L.gateIn.x, inY: L.gateIn.y, outX: L.gateOut.x, outY: L.gateOut.y }; return; }
  const f = L.fence, sc = L.sc, off = 44 * sc, m = 16 * sc;
  const all = [
    { ax: f.x, ay: f.y, bx: f.x + f.w, by: f.y, nx: 0, ny: -1 },
    { ax: f.x + f.w, ay: f.y, bx: f.x + f.w, by: f.y + f.h, nx: 1, ny: 0 },
    { ax: f.x, ay: f.y + f.h, bx: f.x + f.w, by: f.y + f.h, nx: 0, ny: 1 },
    { ax: f.x, ay: f.y, bx: f.x, by: f.y + f.h, nx: -1, ny: 0 },
  ];
  // 着地点が画面内に収まる辺だけ（画面の端に接している辺からは出られない）
  let sides = all.filter(d => {
    const x = (d.ax + d.bx) / 2 + d.nx * off, y = (d.ay + d.by) / 2 + d.ny * off;
    return x > m && x < L.w - m && y > L.top + 30 * sc && y < L.bottom - 6 * sc;
  });
  if (!sides.length) sides = all.filter(d => d.nx === L.gate.nx && d.ny === L.gate.ny);
  const d = pick(sides), t = rand(0.12, 0.88);
  const ex = d.ax + (d.bx - d.ax) * t, ey = d.ay + (d.by - d.ay) * t;
  const pin = clampInside(ex - d.nx * 30 * sc, ey - d.ny * 30 * sc);
  g.exit = { gate: false, inX: pin.x, inY: pin.y, outX: ex + d.nx * off, outY: ey + d.ny * off };
}
function say(g, e, dur = 1.6) { g.bubble = { e, t: 0, dur }; }
function setState(g, s) { g.state = s; g.stateT = 0; }
const OUTSIDE_STATES = ['roam', 'eating', 'content', 'pause', 'flee', 'scared', 'lured'];
const isOutside = g => OUTSIDE_STATES.includes(g.state);

function steer(g, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { g.vx = g.vy = 0; return 0; }
  const st = Math.min(speed * dt, d);
  g.x += dx / d * st; g.y += dy / d * st;
  g.vx = dx / d * speed; g.vy = dy / d * speed;
  return d - st;
}

function chooseEatTarget(g) {
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < S.plotCount; i++) {
    const pl = S.plots[i];
    if (!pl.crop) continue;
    if (goats.some(o => o !== g && o.eatPlot === i && isOutside(o))) continue;
    const p = L.plots[i];
    const ready = pl.t >= CROPS[pl.crop].grow;
    const score = dist(g.x, g.y, p.x, p.y) - (ready ? 200 * L.sc : 0) - (pl.t / CROPS[pl.crop].grow) * 60 * L.sc;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

function startEnter(g) {
  if (g.state === 'flee') g.returnMode = 'hand';
  else if (g.state === 'scared') g.returnMode = 'stick';
  setState(g, 'entering');
  g.eatPlot = -1;
}

function onReturnHome(g) {
  const s = L.sc * 1.1, hx = g.x, hy = g.y - 50 * s;
  switch (g.returnMode) {
    case 'hand': {
      let gain = RETURN_OXY.hand;
      const tags = [];
      const sp = SPEED_BONUS.find(b => g.outT < b.t);
      if (sp) { gain += sp.b; tags.push(`${sp.label}+${sp.b}`); }
      if (persona(g).bonus) { gain += persona(g).bonus; tags.push(`${persona(g).icon}${persona(g).label}+${persona(g).bonus}`); }
      herdCombo = clock - lastHerdT < COMBO_WIN ? herdCombo + 1 : 1;
      lastHerdT = clock;
      if (herdCombo >= 2) { const b = COMBO_OXY * (herdCombo - 1); gain += b; tags.push(`🎉${herdCombo}匹連続+${b}`); SFX.level(); }
      addOxy(gain, hx, hy);
      if (tags.length) floatText(g.x, hy - 22 * s, tags.join(' '), '#ff7a00', 13 * s);
      say(g, '💖', 2); hearts(g.x, g.y - 30 * s, 7); sparkles(g.x, g.y - 30 * s, 6 + tags.length * 4);
      toast(`${g.name}がおうちに帰った！💖 +${gain}${tags.length ? '（' + tags.join(' ') + '）' : ''}`, 'good');
      break;
    }
    case 'food': addOxy(RETURN_OXY.food, hx, hy); say(g, '😋', 2); hearts(g.x, g.y - 30 * s, 3); toast(`${g.name}「ごちそうさま〜」`, 'good'); break;
    case 'bell': addOxy(RETURN_OXY.bell, hx, hy); say(g, '🎵', 2); toast(`${g.name}が鈴の音で帰ってきた🔔`, 'good'); break;
    case 'self': addOxy(RETURN_OXY.self, hx, hy); say(g, '😌', 2); toast(`${g.name}は満足して自分で帰ってきた（追い込めば💖+${RETURN_OXY.hand}だったのに…）`); break;
    case 'stick': say(g, '💢', 2.5); g.mood = 'sulk'; g.moodT = 6; toast(`${g.name}は戻ったけど…ムスッ💢`, 'warn'); break;
    default: break;
  }
  SFX.home();
  sparkles(g.x, g.y - 20 * s, 4);
  g.sqv -= 3;
  g.returnMode = null;
  g.escapeT = nextEscape(g);
  g.lonelyT = 0;
  setState(g, 'inside');
  g.target = randomInside();
  if (S.gateOpen && !goats.some(o => isOutside(o) || o.state === 'entering')) setTimeout(() => { if (S.gateOpen) toast('みんな戻った！🚪ゲートをタップして閉めよう', 'good'); }, 900);
}

function updateGoat(g, dt, rdt) {
  const s = L.sc * 1.1;
  g.stateT += dt;
  // ばね（スクワッシュ&ストレッチ）
  g.sqv += (-220 * g.sq - 12 * g.sqv) * rdt; g.sq += g.sqv * rdt;
  g.sq = clamp(g.sq, -0.45, 0.45);
  // タイマー
  g.petCD = Math.max(0, g.petCD - dt);
  g.feedCD = Math.max(0, g.feedCD - dt);
  g.satisfiedT = Math.max(0, g.satisfiedT - dt);
  g.sulk = Math.max(0, g.sulk - dt);
  g.munchT = Math.max(0, g.munchT - dt);
  if (g.moodT > 0) { g.moodT -= dt; if (g.moodT <= 0) g.mood = 'normal'; }
  g.blinkT -= rdt; if (g.blinkT <= 0) { g.blink = 0.13; g.blinkT = rand(2, 5); }
  g.blink = Math.max(0, g.blink - rdt);
  if (g.bubble) { g.bubble.t += rdt; if (g.bubble.t > g.bubble.dur) g.bubble = null; }
  g.extraHop = 0;
  const lvl = trustLevel();

  switch (g.state) {
    case 'inside': {
      if (g.target) {
        const d = steer(g, g.target.x, g.target.y, 26 * s * pv(g, 'walk'), dt);
        if (d < 1) { g.target = null; g.idle = rand(1, 4); }
      } else {
        g.vx = g.vy = 0; g.idle -= dt;
        if (g.idle <= 0) g.target = randomInside();
      }
      // 外に仲間がいるとソワソワして脱走が早まる
      // あまえんぼうは、しばらくなでてもらえないとすねて脱走が早まる
      const lonely = persona(g).lonely && (g.lonelyT += dt) > persona(g).lonely;
      if (lonely && !g.bubble && Math.random() < dt * 0.12) say(g, '🥺', 1.4);
      g.escapeT -= dt * (1 + CONTAGION * outsideN) * (S.gateOpen ? GATE_OPEN_ESC : 1) * (lonely ? 1.6 : 1);
      if (outsideN > 0 && !g.bubble && Math.random() < dt * 0.15) say(g, '👀', 1.2);
      if (g.escapeT <= 0) { setState(g, 'toGate'); g.target = null; g.exit = null; say(g, '👀', 1.4); }
      break;
    }
    case 'toGate': {
      // ゲートから出るつもりだったのに閉められたら、飛び越えるルートに変更
      if (!g.exit || (g.exit.gate && !S.gateOpen)) planEscape(g);
      const d = steer(g, g.exit.inX, g.exit.inY, 46 * s, dt);
      if (d < 1) {
        setState(g, 'exiting'); g.exitD0 = dist(g.x, g.y, g.exit.outX, g.exit.outY) || 1;
        g.sqv -= g.exit.gate ? 3 : 6;
        if (!g.exit.gate) SFX.escape();
      }
      break;
    }
    case 'exiting': {
      if (!g.exit) { planEscape(g); g.exitD0 = dist(g.x, g.y, g.exit.outX, g.exit.outY) || 1; }
      const d = steer(g, g.exit.outX, g.exit.outY, (g.exit.gate ? 75 : 90) * s, dt);
      const p = clamp(1 - d / g.exitD0, 0, 1);
      g.extraHop = Math.sin(p * Math.PI) * (g.exit.gate ? 22 : 52) * s;
      if (d < 1) {
        const jumped = !g.exit.gate;
        setState(g, 'roam'); g.eatPlot = -1; g.noCropT = 0; g.outT = 0; g.sqv -= jumped ? 7 : 4; g.exit = null;
        dustPuff(g.x, g.y, jumped ? 6 : 4); emojiPart('💨', g.x - g.dir * 20 * s, g.y - 10 * s, 18 * s);
        say(g, pick(['🎶', '😋', '✨']), 1.4);
        SFX.escape();
        toast(jumped ? `🐐 ${g.name}が柵をピョーンと飛び越えた！畑があぶない！` : `🐐 ${g.name}が開いてたゲートから脱走した！`, 'warn');
        if (!S.seen.herd) { S.seen.herd = true; setTimeout(() => toast('ゲートをタップして開けてから、ヤギの近くをタップして追い込もう！戻したらゲートを閉めてね', 'good'), 900); }
      }
      break;
    }
    case 'roam': {
      if (g.eatPlot < 0 || !S.plots[g.eatPlot] || !S.plots[g.eatPlot].crop) { g.eatPlot = chooseEatTarget(g); g.target = null; }
      if (g.eatPlot >= 0) {
        g.noCropT = 0;
        const p = L.plots[g.eatPlot];
        const side = g.x < p.x ? -1 : 1;
        const tx = p.x + side * p.s * 0.42, ty = p.y + p.s * 0.18;
        const d = steer(g, tx, ty, 38 * s * pv(g, 'rush'), dt);
        if (d < 2) { setState(g, 'eating'); g.eatT = 2.8 * pv(g, 'eat'); g.dir = -side; }
      } else {
        g.noCropT += dt;
        if (!g.target) g.target = randomFieldPoint();
        const d = steer(g, g.target.x, g.target.y, 30 * s * pv(g, 'walk'), dt);
        if (d < 2) g.target = null;
        if (g.noCropT > 14) { setState(g, 'lured'); g.returnMode = 'self'; say(g, '😌', 1.5); }
      }
      break;
    }
    case 'eating': {
      g.vx = g.vy = 0;
      const pl = S.plots[g.eatPlot];
      if (!pl || !pl.crop) { setState(g, 'roam'); g.eatPlot = -1; say(g, '❓', 1); break; }
      g.eatT -= dt; g.fxT -= dt;
      if (g.fxT <= 0) {
        g.fxT = 0.35;
        const p = L.plots[g.eatPlot];
        crumbs(p.x, p.y, CROPS[pl.crop].color);
        floatText(g.x + g.dir * 18 * s, g.y - 40 * s, pick(['もぐ', 'むしゃ', 'もぐもぐ']), '#a0785c', 11 * s);
        SFX.munch();
      }
      if (g.eatT <= 0) eatCrop(g, g.eatPlot);
      break;
    }
    case 'content': {
      g.vx = g.vy = 0;
      if (g.stateT > 1.4) setState(g, 'roam');
      break;
    }
    case 'flee':
    case 'scared': {
      const gx = L.gateOut.x - g.x, gy = L.gateOut.y - g.y, gd = Math.hypot(gx, gy) || 1;
      // 手で押したときのゲート吸い寄せは弱め（押す位置が腕の見せどころ）。棒は強制的に帰る
      const home = g.state === 'scared' ? 3.6 : 0.12 + lvl * 0.05;
      let vx = g.vx / (g.fleeSpeed || 1), vy = g.vy / (g.fleeSpeed || 1);
      const k = Math.min(1, home * dt);
      vx = vx * (1 - k) + gx / gd * k; vy = vy * (1 - k) + gy / gd * k;
      const vl = Math.hypot(vx, vy) || 1;
      g.vx = vx / vl * g.fleeSpeed; g.vy = vy / vl * g.fleeSpeed;
      g.x += g.vx * dt; g.y += g.vy * dt;
      g.fleeT -= dt; g.fxT -= rdt;
      if (g.fxT <= 0) { g.fxT = g.state === 'scared' ? 0.09 : 0.16; dustPuff(g.x - g.vx * 0.05, g.y, 1); if (Math.random() < 0.3) emojiPart('💨', g.x - Math.sign(g.vx) * 22 * s, g.y - 8 * s, 14 * s); }
      if (g.fleeT <= 0) { const wasScared = g.state === 'scared'; setState(g, 'pause'); say(g, wasScared ? '💢' : '❓', 1); }
      break;
    }
    case 'pause': {
      g.vx *= 0.85; g.vy *= 0.85;
      g.x += g.vx * dt; g.y += g.vy * dt;
      if (g.stateT > 0.9) { setState(g, 'roam'); g.eatPlot = -1; }
      break;
    }
    case 'lured': {
      const sp = g.returnMode === 'food' ? 72 * pv(g, 'lure') : g.returnMode === 'bell' ? 54 : 38 * pv(g, 'walk');
      const d = steer(g, L.gateOut.x, L.gateOut.y, sp * s, dt);
      if (g.returnMode === 'food') { g.fxT -= rdt; if (g.fxT <= 0) { g.fxT = 0.5; emojiPart('💗', g.x, g.y - 46 * s, 13 * s, -40); } }
      if (d < 6 * s) {
        if (S.gateOpen) setState(g, 'entering');
        else { g.vx = g.vy = 0; if (!g.bubble && Math.random() < dt * 0.6) say(g, '🚪', 1.2); gateClosedHint(); }
      }
      break;
    }
    case 'entering': {
      const d = steer(g, L.gateIn.x, L.gateIn.y, 62 * s, dt);
      const p = clamp(1 - d / (82 * L.sc), 0, 1);
      g.extraHop = Math.sin(p * Math.PI) * 10 * s;
      if (d < 4 * s) onReturnHome(g);
      break;
    }
  }

  if (isOutside(g)) g.outT += dt;
  // 柵との当たり判定（外にいるヤギ）
  if (isOutside(g)) { fenceCollide(g); if (isOutside(g)) clampScreen(g); }
  else if (g.state === 'inside') { const p = clampInside(g.x, g.y); g.x = p.x; g.y = p.y; }

  // 歩行アニメ（ピョコピョコ）
  g.speedNow = Math.hypot(g.vx, g.vy);
  if (Math.abs(g.vx) > 3 && g.state !== 'eating') g.dir = Math.sign(g.vx);
  const mv = Math.min(1, g.speedNow / (15 * s));
  g.walkPhase += dt * (4 + g.speedNow / (14 * s)) * (mv > 0.05 ? 1 : 0);
  const amp = (3 + Math.min(10, g.speedNow / (12 * s))) * s;
  g.hop = Math.abs(Math.sin(g.walkPhase)) * amp * mv;
  const sn = Math.sin(g.walkPhase);
  if (mv > 0.3 && Math.sign(sn) !== Math.sign(g.lastSin)) g.sqv -= 1.4 * mv;
  g.lastSin = sn;
  // 頭の動き
  const munching = g.state === 'eating' || g.munchT > 0;
  const targetTilt = munching ? 0.4 + Math.sin(g.stateT * 16 + g.munchT * 16) * 0.18 : (g.state === 'scared' ? -0.25 : 0);
  g.headTilt += (targetTilt - g.headTilt) * Math.min(1, rdt * 12);
}

function fenceCollide(g) {
  const f = L.fence, pad = 12 * L.sc;
  const herdable = g.state === 'flee' || g.state === 'scared' || g.state === 'lured';
  // ゲートの受け口は広め（狙って押し込めば入る）
  if (herdable && S.gateOpen && dist(g.x, g.y, L.gateOut.x, L.gateOut.y) < 48 * L.sc) { startEnter(g); return; }
  const x0 = f.x - pad, x1 = f.x + f.w + pad, y0 = f.y - pad, y1 = f.y + f.h + pad;
  if (g.x > x0 && g.x < x1 && g.y > y0 && g.y < y1) {
    if (herdable && dist(g.x, g.y, L.gate.x, L.gate.y) < L.gateW * 1.0) {
      if (S.gateOpen) { startEnter(g); return; }
      gateClosedHint();
    }
    const dl = g.x - x0, dr = x1 - g.x, dtp = g.y - y0, db = y1 - g.y;
    const m = Math.min(dl, dr, dtp, db);
    if (m === dl) { g.x = x0; if (g.vx > 0) g.vx = 0; }
    else if (m === dr) { g.x = x1; if (g.vx < 0) g.vx = 0; }
    else if (m === dtp) { g.y = y0; if (g.vy > 0) g.vy = 0; }
    else { g.y = y1; if (g.vy < 0) g.vy = 0; }
  }
}

function gateClosedHint() {
  if (clock - lastGateHintT < 8) return;
  lastGateHintT = clock;
  toast('🚪 ゲートが閉まってるよ。ゲートをタップして開けよう');
}
const gateHit = (x, y) => dist(x, y, L.gate.x, L.gate.y) < 40 * L.sc;
function toggleGate() {
  S.gateOpen = !S.gateOpen;
  SFX.gate(S.gateOpen);
  ripple(L.gate.x, L.gate.y, 40 * L.sc, S.gateOpen ? '#ffe066' : '#ffffff');
  floatText(L.gate.x, L.gate.y - 34 * L.sc, S.gateOpen ? 'ガチャ！ひらいた' : 'パタン！しめた', '#c2447a', 12 * L.sc);
}

function separateGoats() {
  const r = 30 * L.sc;
  for (let i = 0; i < goats.length; i++) for (let j = i + 1; j < goats.length; j++) {
    const a = goats[i], b = goats[j];
    if (a.state === 'exiting' || a.state === 'entering' || b.state === 'exiting' || b.state === 'entering') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < r) { const push = (r - d) * 0.25; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
}

function eatCrop(g, i) {
  const pl = S.plots[i], cr = CROPS[pl.crop], p = L.plots[i], s = L.sc * 1.1;
  const loss = Math.max(1, Math.round(cr.yield * 0.25));
  addSero(-loss, p.x, p.y - p.s * 0.3);
  pl.crop = null; pl.t = 0; pl.ruin = RUIN_T;
  plotFx[i].sqv -= 3;
  dustPuff(p.x, p.y, 5);
  crumbs(p.x, p.y, cr.color); crumbs(p.x, p.y, '#8fd36b');
  addOxy(1, g.x, g.y - 60 * s);
  hearts(g.x, g.y - 34 * s, 3);
  say(g, '💖', 1.8); g.mood = 'happy'; g.moodT = 2; g.sqv += 3;
  SFX.heart();
  if (!S.seen.eat) { S.seen.eat = true; toast(`もぐもぐ…${cr.name}を食べられた！畑が荒れて${RUIN_T}秒植えられない💦`, 'warn'); }
  g.eatPlot = -1;
  setState(g, 'content');
}

// ---------------------------------------------------------
// プレイヤー操作
// ---------------------------------------------------------
const PUSH_R = 120;
function goatAt(x, y, r) {
  let best = null, bd = r;
  goats.forEach(g => { const d = dist(x, y, g.x, g.y - 20 * L.sc * 1.1); if (d < bd) { bd = d; best = g; } });
  return best;
}
function plotAt(x, y) {
  for (let i = 0; i < MAX_PLOTS; i++) { const p = L.plots[i]; if (Math.abs(x - p.x) < p.s / 2 && Math.abs(y - p.y) < p.s / 2) return i; }
  return -1;
}

function seedAction(i, fromDrag) {
  if (i < 0) return;
  const p = L.plots[i];
  if (i >= S.plotCount) { if (!fromDrag) { toast('🔒 ショップで畑を広げよう！'); openShop(); } return; }
  const pl = S.plots[i];
  if (!pl.crop && pl.ruin > 0) {
    if (!fromDrag) { floatText(p.x, p.y - p.s * 0.45, `荒れてる…あと${realSec(pl.ruin)}秒`, '#b0774a', 12 * L.sc); SFX.nope(); }
    return;
  }
  if (!pl.crop) {
    const cr = CROPS[S.seed];
    if (S.sero < cr.seed) {
      if (!fromDrag) { toast(`セロトニンが足りない…（${cr.name}の種は${cr.seed}🌱）ショップで💖を🌱に両替できるよ`, 'warn'); SFX.nope(); }
      return;
    }
    addSero(-cr.seed, p.x, p.y - p.s * 0.2);
    pl.crop = S.seed; pl.t = 0;
    plotFx[i].sqv = 5;
    dustPuff(p.x, p.y + p.s * 0.1, 3);
    SFX.plant();
  } else {
    const cr = CROPS[pl.crop];
    if (pl.t >= cr.grow) {
      addSero(cr.yield, p.x, p.y - p.s * 0.45);
      if (pl.crop === 'grass') { S.grassItem++; floatText(p.x, p.y - p.s * 0.7, '+1🌿', '#4caf50', 12 * L.sc); }
      parts.push({ type: 'harvest', text: cr.emoji, x: p.x, y: p.y - p.s * 0.2, vx: 0, vy: -120 * L.sc, g: 0, t: 0, life: 0.8, size: p.s * 0.5, rot: 0, vr: 0 });
      sparkles(p.x, p.y - p.s * 0.2, 5);
      plotFx[i].sqv = -5;
      pl.crop = null; pl.t = 0;
      SFX.harvest();
      goats.forEach(g => { if (g.eatPlot === i) { g.eatPlot = -1; if (g.state === 'eating') { setState(g, 'roam'); say(g, '😢', 1.2); } } });
    } else if (!fromDrag) {
      floatText(p.x, p.y - p.s * 0.45, `あと${realSec((cr.grow - pl.t) / (S.fert ? 1.3 : 1))}秒`, '#8b7466', 12 * L.sc);
    }
  }
}

function pet(g) {
  const s = L.sc * 1.1;
  if (g.petCD > 0) return;
  g.petCD = 0.3;
  g.sqv -= 3.2;
  if (g.satisfiedT > 0) { say(g, '☺️', 1); floatText(g.x, g.y - 60 * s, 'まんぞく〜', '#ff8fb8', 12 * s); return; }
  const P = persona(g);
  g.lonelyT = 0;
  addOxy(P.pet ?? PET_OXY, g.x, g.y - 62 * s);
  hearts(g.x, g.y - 36 * s, P.pet ? 3 : 2);
  if (Math.random() < 0.35) floatText(g.x, g.y - 84 * s, pick(P.lines), '#a0785c', 11 * s);
  say(g, pick(['💖', '☺️', '💕']), 1.2);
  g.mood = 'happy'; g.moodT = 1.4;
  SFX.heart();
  if (g.sulk > 0) g.sulk = Math.max(0, g.sulk - 20);
  if (g.state === 'toGate') { setState(g, 'inside'); g.target = randomInside(); g.escapeT = nextEscape(g) * 0.6; floatText(g.x, g.y - 80 * s, '脱走をやめた！', '#ff5c9a', 12 * s); }
  g.petCount++;
  if (g.petCount >= (P.petMax ?? PET_MAX)) {
    g.petCount = 0; g.satisfiedT = PET_REST; say(g, '✨', 1.8); sparkles(g.x, g.y - 30 * s, 6);
    toast(`🥰 ${g.name}「うっとり…まんぞく〜💕」`, 'good');
  }
}

function handPush(x, y, stick) {
  const R = PUSH_R * L.sc, s = L.sc * 1.1;
  if (stick) {
    parts.push({ type: 'stick', x, y, t: 0, life: 0.45, vx: 0, vy: 0, g: 0 });
    ripple(x, y, R * 0.9, '#ffb36b');
    SFX.stick();
  } else {
    ripple(x, y, R * 0.8, '#ffffff');
    floatText(x, y - 14 * L.sc, 'ポンッ', '#ff8fb8', 13 * L.sc);
    SFX.pop();
  }
  let hit = 0;
  goats.forEach(g => {
    const d = dist(g.x, g.y - 14 * s, x, y);
    if (d > R) return;
    if (isOutside(g)) {
      startFlee(g, x, y, stick); hit += stick ? pv(g, 'stick') : 1;
    } else if (g.state === 'toGate' && !stick) {
      setState(g, 'inside'); g.target = randomInside(); g.escapeT = nextEscape(g) * 0.5;
      say(g, '💦', 1.2); g.sqv -= 3; addOxy(1, g.x, g.y - 60 * s);
    } else if ((g.state === 'inside' || g.state === 'toGate') && stick) {
      say(g, '❗', 1.2); g.mood = 'surprise'; g.moodT = 1; g.sqv += 4; g.sulk = 60 * pv(g, 'stick');
      if (g.state === 'toGate') { setState(g, 'inside'); g.target = randomInside(); g.escapeT = nextEscape(g); }
      addOxy(-2 * pv(g, 'stick'), g.x, g.y - 60 * s);
    } else if (g.state === 'inside') {
      g.sqv -= 2; g.target = null; g.idle = 0.6; say(g, '❔', 0.8);
    }
  });
  if (stick && hit) addOxy(-3 * hit, x, y - 30 * L.sc);
  if (stick && hit && !S.seen.stick) { S.seen.stick = true; toast('木の棒は効果バツグン…でもヤギが拗ねちゃう💢', 'warn'); }
}

function startFlee(g, x, y, stick) {
  const s = L.sc * 1.1, lvl = trustLevel();
  let ax = g.x - x, ay = g.y - y; const ad = Math.hypot(ax, ay) || 1; ax /= ad; ay /= ad;
  const gx = L.gateOut.x - g.x, gy = L.gateOut.y - g.y, gd = Math.hypot(gx, gy) || 1;
  const b = stick ? 0.7 : clamp(0.04 + lvl * 0.025, 0, 0.3);
  let vx = ax * (1 - b) + gx / gd * b, vy = ay * (1 - b) + gy / gd * b;
  const vl = Math.hypot(vx, vy) || 1;
  g.fleeSpeed = (stick ? 230 : 115) * s * (1 + lvl * 0.02) * pv(g, 'flee');
  g.vx = vx / vl * g.fleeSpeed; g.vy = vy / vl * g.fleeSpeed;
  g.fleeT = stick ? 1.6 : (1.1 + lvl * 0.04) * pv(g, 'fleeT');
  g.eatPlot = -1; g.fxT = 0;
  setState(g, stick ? 'scared' : 'flee');
  if (stick) { say(g, '❗', 1.2); g.mood = 'surprise'; g.moodT = 1.2; g.sulk = 60 * pv(g, 'stick'); g.sqv += 5; }
  else { say(g, '💦', 0.9); g.sqv -= 2.5; }
  dustPuff(g.x, g.y, 3);
}

function useFood(x, y) {
  const s = L.sc * 1.1;
  const g = goatAt(x, y, 62 * L.sc);
  if (!g) { toast('ヤギの近くで使ってね🥣'); SFX.nope(); return; }
  if (isOutside(g)) {
    if (g.state === 'lured' && g.returnMode === 'food') return;
    if (S.food > 0) { S.food--; }
    else if (S.sero >= FOOD_LURE_SERO) { addSero(-FOOD_LURE_SERO, x, y - 20 * L.sc); }
    else { toast('餌もセロトニンも足りない…', 'warn'); SFX.nope(); return; }
    setState(g, 'lured'); g.returnMode = 'food'; g.eatPlot = -1; g.fxT = 0;
    addOxy(FOOD_LURE_OXY, g.x, g.y - 62 * s);
    hearts(g.x, g.y - 36 * s, 4); say(g, '😍', 1.6); g.mood = 'happy'; g.moodT = 3; g.sqv -= 3;
    SFX.heart();
  } else if (g.state === 'inside' || g.state === 'toGate') {
    if (g.feedCD > 0) { say(g, '😋', 1); toast(`${g.name}はおなかいっぱい（あと${realSec(g.feedCD)}秒）`); return; }
    let gain;
    if (S.grassItem > 0) { S.grassItem--; gain = 3; emojiPart('🌿', g.x + g.dir * 20 * s, g.y - 30 * s, 20 * s, -20); }
    else if (S.food > 0) { S.food--; gain = 5; emojiPart('🥣', g.x + g.dir * 20 * s, g.y - 26 * s, 20 * s, -20); }
    else { toast('牧草🌿（畑で収穫）か餌🥣（ショップ）が必要だよ', 'warn'); SFX.nope(); return; }
    addOxy(gain, g.x, g.y - 62 * s);
    g.feedCD = 12; g.munchT = 1.6; g.sqv -= 3;
    hearts(g.x, g.y - 36 * s, 3); say(g, '😋', 1.6); g.mood = 'happy'; g.moodT = 2;
    if (g.sulk > 0) g.sulk = Math.max(0, g.sulk - 30);
    if (g.state === 'toGate') { setState(g, 'inside'); g.target = null; g.idle = 1.6; g.escapeT = nextEscape(g); }
    SFX.heart();
  }
}

function ringBell(x, y) {
  if (!S.bell) return;
  if (S.bellCD > 0) { toast(`🔔 鈴はあと${realSec(S.bellCD)}秒で使えるよ`); SFX.nope(); return; }
  S.bellCD = BELL_CD;
  ripple(x, y, 220 * L.sc, '#ffe066'); ripple(x, y, 140 * L.sc, '#ffffff');
  parts.push({ type: 'emoji', text: '🔔', x, y: y - 20 * L.sc, vx: 0, vy: -30 * L.sc, g: 0, t: 0, life: 1.2, size: 36 * L.sc, rot: 0, vr: 0, swing: true });
  for (let i = 0; i < 5; i++) emojiPart(pick(['🎵', '🎶']), x + rand(-40, 40) * L.sc, y + rand(-30, 10) * L.sc, 16 * L.sc, -60);
  SFX.bell();
  let n = 0;
  goats.forEach(g => {
    if (isOutside(g)) { if (!(g.state === 'lured' && g.returnMode === 'food')) { setState(g, 'lured'); g.returnMode = 'bell'; g.eatPlot = -1; } say(g, '🎵', 1.5); n++; }
    else say(g, '🎵', 1);
  });
  toast(n ? `🔔 チリリン♪ ${n}匹が帰りはじめた` : '🔔 チリリン♪（みんな柵の中にいるよ）');
}

// おまかせ：タップした場所から行動を決める
//   ヤギ本体 → 柵の中ならなでる／外なら追い込み
//   畑       → 種まき・収穫
//   脱走ヤギの近く → 追い込み
function autoTarget(x, y) {
  const s = L.sc * 1.1;
  if (gateHit(x, y)) return { kind: 'gate' };
  const g = goatAt(x, y, 40 * s);
  if (g) {
    if (g.state === 'inside' || g.state === 'toGate') return { kind: 'pet', goat: g };
    if (isOutside(g)) return { kind: 'push', goat: g };
  }
  // 脱走ヤギのすぐそばなら、畑の上でも追い込みを優先（畑エリアで押せなくなるのを防ぐ）
  const near = (o, r) => (isOutside(o) || o.state === 'toGate') && dist(o.x, o.y - 14 * s, x, y) <= r;
  if (goats.some(o => near(o, 75 * L.sc))) return { kind: 'push' };
  const i = plotAt(x, y);
  if (i >= 0) return { kind: 'plot', plot: i };
  if (goats.some(o => near(o, PUSH_R * L.sc))) return { kind: 'push' };
  return { kind: 'none' };
}

function onTap(x, y) {
  // ゲートはどのツールでもタップで開け閉め
  if (gateHit(x, y)) { toggleGate(); return 'gate'; }
  switch (S.tool) {
    case 'auto': {
      const t = autoTarget(x, y);
      if (t.kind === 'pet') pet(t.goat);
      else if (t.kind === 'plot') seedAction(t.plot, false);
      else if (t.kind === 'push') handPush(x, y, false);
      else ripple(x, y, 24 * L.sc, '#ffffff');
      return t.kind;
    }
    case 'stick': handPush(x, y, true); break;
    case 'food': useFood(x, y); break;
    case 'bell': ringBell(x, y); break;
  }
  return null;
}

// ---------------------------------------------------------
// パーティクル
// ---------------------------------------------------------
function emojiPart(e, x, y, size, vy = -50) {
  parts.push({ type: 'emoji', text: e, x, y, vx: rand(-15, 15) * L.sc, vy: vy * L.sc, g: 0, t: 0, life: 1.1, size, rot: rand(-0.2, 0.2), vr: rand(-0.5, 0.5) });
}
function hearts(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ type: 'emoji', text: pick(['💖', '💗', '💕']), x: x + rand(-14, 14) * L.sc, y, vx: rand(-35, 35) * L.sc, vy: rand(-90, -55) * L.sc, g: 30 * L.sc, t: -i * 0.08, life: 1.2, size: rand(14, 20) * L.sc, rot: rand(-0.3, 0.3), vr: rand(-1, 1) });
}
function sparkles(x, y, n) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(40, 100) * L.sc; parts.push({ type: 'emoji', text: '✨', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30 * L.sc, g: 0, t: -i * 0.03, life: 0.8, size: rand(12, 18) * L.sc, rot: 0, vr: rand(-3, 3), drag: true }); }
}
function floatText(x, y, str, color, size = 15 * L.sc) {
  parts.push({ type: 'text', text: str, x, y, vx: 0, vy: -45 * L.sc, g: 0, t: 0, life: 1.2, size, color });
}
function ripple(x, y, r, color) { parts.push({ type: 'ring', x, y, r, color, t: 0, life: 0.55, vx: 0, vy: 0, g: 0 }); }
function dustPuff(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ type: 'dust', x: x + rand(-8, 8) * L.sc, y: y + rand(-3, 3) * L.sc, vx: rand(-30, 30) * L.sc, vy: rand(-25, -5) * L.sc, g: 0, t: 0, life: rand(0.4, 0.7), size: rand(4, 8) * L.sc });
}
function crumbs(x, y, color) {
  for (let i = 0; i < 4; i++) parts.push({ type: 'crumb', x: x + rand(-10, 10) * L.sc, y: y - 6 * L.sc, vx: rand(-60, 60) * L.sc, vy: rand(-120, -50) * L.sc, g: 320 * L.sc, t: 0, life: 0.6, size: rand(2, 4) * L.sc, color });
}

function updateParts(rdt) {
  for (const p of parts) {
    p.t += rdt;
    if (p.t < 0) continue;
    p.x += p.vx * rdt; p.y += p.vy * rdt; p.vy += (p.g || 0) * rdt;
    if (p.vr) p.rot += p.vr * rdt;
    if (p.drag) { p.vx *= 0.94; p.vy *= 0.94; }
  }
  parts = parts.filter(p => p.t < p.life);
}

function emoji(e, x, y, size, alpha = 1, sx = 1, sy = 1, rot = 0) {
  if (size < 1) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy);
  ctx.font = `${size}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0); ctx.restore();
}

function drawStick(x, y, ang, len, sc) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 9 * sc; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke();
  ctx.strokeStyle = '#c08a55'; ctx.lineWidth = 5.5 * sc; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke();
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 6 * sc; ctx.beginPath(); ctx.moveTo(0, -len * 0.55); ctx.lineTo(9 * sc, -len * 0.7); ctx.stroke();
  ctx.strokeStyle = '#c08a55'; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(0, -len * 0.55); ctx.lineTo(9 * sc, -len * 0.7); ctx.stroke();
  ctx.fillStyle = '#86d36b'; ctx.beginPath(); ctx.ellipse(11 * sc, -len * 0.73, 5 * sc, 3 * sc, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawParts() {
  for (const p of parts) {
    if (p.t < 0) continue;
    const k = p.t / p.life;
    switch (p.type) {
      case 'emoji': {
        const pop = k < 0.15 ? easeOutBack(k / 0.15) : 1;
        const a = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
        const rot = p.swing ? Math.sin(p.t * 18) * 0.5 * (1 - k) : p.rot;
        emoji(p.text, p.x, p.y, p.size * pop, a, 1, 1, rot);
        break;
      }
      case 'harvest': {
        const st = Math.sin(Math.min(1, k * 1.6) * Math.PI);
        emoji(p.text, p.x, p.y, p.size, 1 - Math.max(0, (k - 0.6) / 0.4), 1 - 0.25 * st, 1 + 0.45 * st);
        break;
      }
      case 'text': {
        const pop = k < 0.15 ? easeOutBack(k / 0.15) : 1;
        ctx.save(); ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.translate(p.x, p.y); ctx.scale(pop, pop);
        ctx.font = `bold ${p.size}px ${TEXT_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
        ctx.restore();
        break;
      }
      case 'ring': {
        ctx.save(); ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = p.color; ctx.lineWidth = 6 * (1 - k) + 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * easeOut(k), 0, TAU); ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.5; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6 * easeOut(k), 0, TAU); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'dust': {
        ctx.fillStyle = `rgba(240,226,200,${0.85 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k), 0, TAU); ctx.fill();
        break;
      }
      case 'crumb': {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        break;
      }
      case 'stick': {
        const ang = -1.5 + 2.1 * easeOut(Math.min(1, k * 1.8));
        ctx.save(); ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        drawStick(p.x + 20 * L.sc, p.y + 30 * L.sc, ang, 60 * L.sc, L.sc);
        ctx.restore();
        if (k < 0.5) emoji('💥', p.x, p.y, 26 * L.sc * easeOutBack(Math.min(1, k * 4)), 1 - k * 2);
        break;
      }
    }
  }
}

// ---------------------------------------------------------
// 描画：畑・作物
// ---------------------------------------------------------
function drawPlotBase(i, time) {
  const p = L.plots[i], s = p.s, fx = plotFx[i], sc = L.sc;
  ctx.save(); ctx.translate(p.x, p.y);
  if (i >= S.plotCount) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#b08968'; ctx.lineWidth = 2.5 * sc; ctx.setLineDash([6 * sc, 6 * sc]);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    rr(ctx, -s / 2, -s / 2, s, s, 14 * sc); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    emoji('🔒', 0, i === S.plotCount ? -8 * sc : 0, 18 * sc, 0.8);
    if (i === S.plotCount && S.plotCount < MAX_PLOTS) {
      ctx.font = `bold ${11 * sc}px ${TEXT_FONT}`; ctx.fillStyle = '#7a5a40'; ctx.textAlign = 'center';
      ctx.fillText(`🌱${PLOT_COSTS[S.plotCount - START_PLOTS]}`, 0, 16 * sc);
    }
    ctx.restore(); return;
  }
  const k = 1 + fx.sq * 0.25;
  ctx.scale(1 / k, k);
  ctx.fillStyle = 'rgba(110,70,30,.2)'; rr(ctx, -s / 2, -s / 2 + 5 * sc, s, s, 16 * sc); ctx.fill();
  ctx.fillStyle = '#c98e5c'; rr(ctx, -s / 2, -s / 2, s, s, 16 * sc); ctx.fill();
  ctx.strokeStyle = '#9c6537'; ctx.lineWidth = 2.5 * sc; ctx.stroke();
  ctx.fillStyle = '#b97c4b'; rr(ctx, -s / 2 + 5 * sc, -s / 2 + 5 * sc, s - 10 * sc, s - 10 * sc, 12 * sc); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,35,.45)'; ctx.lineWidth = 3 * sc; ctx.lineCap = 'round';
  for (let r = -1; r <= 1; r++) { ctx.beginPath(); ctx.moveTo(-s * 0.32, r * s * 0.24); ctx.quadraticCurveTo(0, r * s * 0.24 + 4 * sc, s * 0.32, r * s * 0.24); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ctx, -s / 2 + 6 * sc, -s / 2 + 4 * sc, s * 0.5, 5 * sc, 3 * sc); ctx.fill();
  const pl = S.plots[i];
  if (pl.ruin > 0) {
    // 荒らされた畑：踏み荒らされた土＋足あと＋残り時間リング
    ctx.fillStyle = 'rgba(90,60,35,.35)'; rr(ctx, -s / 2 + 5 * sc, -s / 2 + 5 * sc, s - 10 * sc, s - 10 * sc, 12 * sc); ctx.fill();
    ctx.fillStyle = 'rgba(70,45,25,.55)';
    [[-0.22, -0.18, 0.4], [0.05, -0.05, -0.3], [-0.1, 0.2, 0.2], [0.24, 0.16, -0.5]].forEach(([dx, dy, a]) => {
      ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(-2.6 * sc, 0, 2.2 * sc, 3.6 * sc, 0.2, 0, TAU); ctx.ellipse(2.6 * sc, 0, 2.2 * sc, 3.6 * sc, -0.2, 0, TAU); ctx.fill();
      ctx.restore();
    });
    const k = pl.ruin / RUIN_T, r = Math.max(9, s * 0.16);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(176,119,74,.85)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.closePath(); ctx.fill();
    emoji('💦', 0, 0, r * 1.1, 0.9);
  }
  if (pl.crop && pl.t >= CROPS[pl.crop].grow) {
    const a = 0.35 + Math.sin(time * 4 + i) * 0.15;
    ctx.strokeStyle = `rgba(255,240,150,${a})`; ctx.lineWidth = 4 * sc;
    rr(ctx, -s / 2 - 2 * sc, -s / 2 - 2 * sc, s + 4 * sc, s + 4 * sc, 18 * sc); ctx.stroke();
  }
  ctx.restore();
}

function drawSprout(h, sc, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 3 * sc;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2 * sc, -h * 0.5, 0, -h); ctx.stroke();
  ctx.fillStyle = '#7fd36b'; ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 1.5 * sc;
  ctx.beginPath(); ctx.ellipse(-h * 0.32, -h * 0.85, h * 0.36, h * 0.17, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(h * 0.32, -h * 0.9, h * 0.36, h * 0.17, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
  if (color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -h * 1.05, h * 0.2, 0, TAU); ctx.fill(); ctx.stroke(); }
}

function drawCrop(i, time, eatenBy) {
  const p = L.plots[i], pl = S.plots[i], s = p.s, fx = plotFx[i], sc = L.sc;
  if (!pl.crop) return;
  const cr = CROPS[pl.crop], k = pl.t / cr.grow, ready = k >= 1;
  ctx.save();
  ctx.translate(p.x, p.y + s * 0.14);
  if (eatenBy) { ctx.translate(rand(-1.5, 1.5) * sc, rand(-1, 1) * sc); const e = clamp(eatenBy.eatT / 2.8, 0.3, 1); ctx.scale(e, e); }
  const sy = 1 + fx.sq, sx = 1 - fx.sq * 0.6;
  ctx.rotate(Math.sin(time * 2 + i * 1.7) * (ready ? 0.04 : 0.08));
  ctx.scale(sx, sy);
  if (k < 0.35) drawSprout(s * (0.12 + k / 0.35 * 0.1), sc);
  else if (k < 0.7) drawSprout(s * 0.27, sc, cr.color);
  else if (!ready) {
    const gk = 0.75 + (k - 0.7) / 0.3 * 0.2;
    ctx.fillStyle = 'rgba(60,40,20,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.18, s * 0.06, 0, 0, TAU); ctx.fill();
    emoji(cr.emoji, 0, -s * 0.2, s * 0.42 * gk, 0.95);
  } else {
    const bob = Math.abs(Math.sin(time * 3 + i)) * s * 0.06;
    const gr = ctx.createRadialGradient(0, -s * 0.25, 0, 0, -s * 0.25, s * 0.45);
    gr.addColorStop(0, 'rgba(255,250,200,.75)'); gr.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -s * 0.25, s * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(60,40,20,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2 * (1 - bob / s), s * 0.06, 0, 0, TAU); ctx.fill();
    const st = Math.sin(time * 6 + i) * 0.04;
    emoji(cr.emoji, 0, -s * 0.26 - bob, s * 0.55, 1, 1 - st, 1 + st);
  }
  ctx.restore();
  if (!ready) {
    const cx = p.x + s * 0.36, cy = p.y - s * 0.36, r = Math.max(6, s * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fd36b'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.closePath(); ctx.fill();
  } else if (Math.random() < 0.02) {
    sparkles(p.x + rand(-s * 0.3, s * 0.3), p.y - s * 0.3, 1);
  }
}

// ---------------------------------------------------------
// 描画：ヤギ
// ---------------------------------------------------------
function drawGoat(g, time) {
  const s = L.sc * 1.1, c = g.color, OL = '#5b4636';
  const hop = g.hop + g.extraHop;
  ctx.save();
  ctx.translate(g.x, g.y);
  // 影
  const shK = 1 - Math.min(hop / (40 * s), 0.45);
  ctx.fillStyle = 'rgba(60,95,40,.24)';
  ctx.beginPath(); ctx.ellipse(0, 1.5 * s, 22 * s * shK, 6.5 * s * shK, 0, 0, TAU); ctx.fill();
  ctx.translate(0, -hop);
  const air = Math.min(1, hop / (10 * s)) * 0.08;
  const sy = 1 + g.sq + air, sx = 1 - g.sq * 0.6 - air * 0.5;
  ctx.scale(g.dir * sx * s, sy * s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const mv = Math.min(1, g.speedNow / (30 * s));
  const sw = Math.sin(g.walkPhase * 2) * 5 * mv;
  const leg = (x, a) => {
    ctx.strokeStyle = OL; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x, -11); ctx.lineTo(x + a, -1.5); ctx.stroke();
    ctx.strokeStyle = c.leg; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x, -11); ctx.lineTo(x + a, -1.5); ctx.stroke();
    ctx.fillStyle = '#6d5446'; ctx.beginPath(); ctx.arc(x + a, -1, 2.3, 0, TAU); ctx.fill();
  };
  leg(-11, -sw); leg(9, sw);
  // しっぽ
  const tw = Math.sin(time * 10 + g.id) * 0.35;
  ctx.save(); ctx.translate(-18, -26); ctx.rotate(-0.7 + tw);
  ctx.fillStyle = c.body; ctx.strokeStyle = OL; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(0, -4, 3.2, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  // 胴体
  const look = g.ci % PERSONA.length;   // 0のんびり 1あまえんぼう 2くいしんぼう 3おてんば 4こわがり
  ctx.fillStyle = c.body; ctx.strokeStyle = OL; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, look === 2 ? -20 : -21, look === 2 ? 22.5 : 20, look === 2 ? 14 : 12.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // もこもこ
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-4, -27, 9, 3.6, -0.15, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(91,70,54,.2)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(-8, -18, 3, 0.3, 2.6); ctx.arc(-1, -16, 3, 0.3, 2.6); ctx.stroke();
  leg(-6, sw); leg(13, -sw);
  // 首輪 + 鈴
  ctx.strokeStyle = c.collar; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(11, -32); ctx.quadraticCurveTo(16, -26, 14, -21); ctx.stroke();
  ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(15, -21, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
  // くいしんぼう：よだれかけ
  if (look === 2) {
    ctx.fillStyle = '#fff3b0'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(8, -23); ctx.quadraticCurveTo(8, -9, 17, -10); ctx.quadraticCurveTo(22, -16, 19, -23); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.arc(14.5, -15, 2, 0, TAU); ctx.fill();
  }
  // 頭
  ctx.save();
  ctx.translate(18, -31);
  ctx.rotate(g.headTilt + Math.sin(time * 2 + g.id) * 0.03);
  const earW = Math.sin(time * 3 + g.id * 2) * 0.12 + (g.mood === 'sulk' ? 0.5 : 0) + (g.mood === 'surprise' ? -0.5 : 0) + (look === 4 ? 0.6 : 0);
  const ear = (x, y, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = c.body; ctx.strokeStyle = OL; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(-6, 0, 7.5, 3.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.ellipse(-6, 0, 4.8, 1.8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  ear(-5, -2, -0.5 + earW);
  // 角
  const horn = (x) => {
    ctx.strokeStyle = OL; ctx.lineWidth = 5.2;
    ctx.beginPath(); ctx.moveTo(x, -7); ctx.quadraticCurveTo(x - 3, -15, x - 8, -15); ctx.stroke();
    ctx.strokeStyle = '#f2d7a8'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(x, -7); ctx.quadraticCurveTo(x - 3, -15, x - 8, -15); ctx.stroke();
  };
  horn(-3); horn(2);
  // おてんば：はためくハチマキのしっぽ（頭の後ろ）
  if (look === 3) {
    const fl = Math.sin(time * 9 + g.id) * 2.5 + Math.min(4, g.speedNow / (20 * s));
    ctx.strokeStyle = OL; ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-15, -6 + fl, -20, -3 + fl); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-14, 0 + fl * 0.6, -18, 3 + fl * 0.6); ctx.stroke();
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-15, -6 + fl, -20, -3 + fl); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-14, 0 + fl * 0.6, -18, 3 + fl * 0.6); ctx.stroke();
  }
  ctx.fillStyle = c.body; ctx.strokeStyle = OL; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 9.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // おてんば：ハチマキ
  if (look === 3) {
    ctx.strokeStyle = OL; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(-10, -3); ctx.quadraticCurveTo(0, -8.5, 9, -5.5); ctx.stroke();
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(-10, -3); ctx.quadraticCurveTo(0, -8.5, 9, -5.5); ctx.stroke();
  }
  // 鼻先
  ctx.fillStyle = c.accent; ctx.beginPath(); ctx.ellipse(7, 3.5, 5.6, 4.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(91,70,54,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(10, 2.4, 0.9, 0, TAU); ctx.fill();
  // 口
  ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (g.mood === 'sulk') { ctx.moveTo(6, 6.5); ctx.lineTo(9.5, 6); }
  else if (g.state === 'eating' || g.munchT > 0) { ctx.arc(8, 6, 1.6 + Math.abs(Math.sin(time * 16)) * 1.2, 0, TAU); }
  else { ctx.arc(7.6, 5.4, 1.8, 0.2, Math.PI - 0.2); }
  ctx.stroke();
  ear(-2, -5, -0.15 + earW * 0.6);
  // 目
  const ex = 2.5, ey = -1.8;
  ctx.strokeStyle = OL; ctx.fillStyle = '#3b2a22'; ctx.lineWidth = 1.8;
  if (g.mood === 'happy') { ctx.beginPath(); ctx.arc(ex, ey + 1.6, 2.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (g.mood === 'sulk') {
    ctx.beginPath(); ctx.moveTo(ex - 2.6, ey + 0.6); ctx.lineTo(ex + 2.6, ey + 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 3, ey - 4.2); ctx.lineTo(ex + 3, ey - 2.4); ctx.stroke();
  } else if (g.mood === 'surprise') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2a22'; ctx.beginPath(); ctx.arc(ex + 0.4, ey, 1.5, 0, TAU); ctx.fill();
  } else if (g.blink > 0) { ctx.beginPath(); ctx.moveTo(ex - 2.4, ey + 0.4); ctx.lineTo(ex + 2.4, ey + 0.4); ctx.stroke(); }
  else {
    ctx.beginPath(); ctx.ellipse(ex, ey, 2.4, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.8, ey - 1.1, 0.95, 0, TAU); ctx.fill();
    // のんびり屋：眠そうなまぶた
    if (look === 0) {
      ctx.fillStyle = c.body; ctx.beginPath(); ctx.ellipse(ex, ey, 3, 3.6, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 2.7, ey + 0.2); ctx.lineTo(ex + 2.7, ey + 0.2); ctx.stroke();
    }
  }
  // こわがり：困り眉
  if (look === 4 && g.mood !== 'sulk') {
    ctx.strokeStyle = '#3b2a22'; ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(ex - 3, ey - 4.4); ctx.lineTo(ex + 2.6, ey - 6.4); ctx.stroke();
  }
  // ほっぺ（あまえんぼうは濃いめ）
  ctx.fillStyle = look === 1 ? 'rgba(255,110,150,.7)' : 'rgba(255,130,160,.45)';
  ctx.beginPath(); ctx.ellipse(1.5, 4.5, look === 1 ? 3.4 : 2.8, look === 1 ? 2.1 : 1.7, 0, 0, TAU); ctx.fill();
  // あごひげ
  ctx.fillStyle = c.body; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(3, 8); ctx.quadraticCurveTo(4.5, 14, 5.5, 14.5); ctx.quadraticCurveTo(6.5, 12, 7, 8.5); ctx.fill(); ctx.stroke();
  // のんびり屋：頭の花／あまえんぼう：リボン
  if (look === 0) {
    ctx.save(); ctx.translate(-5, -10);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OL; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 2.2, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 0, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (look === 1) {
    ctx.save(); ctx.translate(-6, -9); ctx.rotate(-0.3);
    ctx.fillStyle = '#ff8fb8'; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5c9a'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore(); // 頭
  ctx.restore();

  // 拗ね中の💢（たまに）
  if (g.sulk > 0 && !g.bubble && Math.sin(time * 2 + g.id) > 0.97) {
    emoji('💢', g.x + g.dir * 22 * s, g.y - 48 * s - hop, 12 * s);
  }
  // 誘導中の餌
  if (g.state === 'lured' && g.returnMode === 'food') {
    const dx = L.gateOut.x - g.x, dy = L.gateOut.y - g.y, d = Math.hypot(dx, dy) || 1;
    emoji('🥣', g.x + dx / d * 34 * s, g.y + dy / d * 34 * s - 14 * s - Math.abs(Math.sin(time * 6)) * 5 * s, 18 * s);
  }
}

function drawBubble(g) {
  if (!g.bubble) return;
  const s = L.sc * 1.1, b = g.bubble;
  const k = b.t / b.dur;
  const pop = b.t < 0.25 ? easeOutBack(b.t / 0.25) : 1;
  const a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
  const x = g.x + g.dir * 8 * s, y = g.y - 64 * s - g.hop - g.extraHop + Math.sin(b.t * 6) * 1.5 * s;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4 * s, 12 * s); ctx.lineTo(-g.dir * 1 * s, 20 * s); ctx.lineTo(4 * s, 12.5 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-4 * s, 13.3 * s); ctx.lineTo(-g.dir * 1 * s, 20 * s); ctx.lineTo(4 * s, 13.6 * s); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 12.8 * s, 0, TAU); ctx.fill();
  ctx.restore();
  emoji(b.e, x, y + 1 * s, 17 * s * pop, a);
}

function drawGateDoor(time) {
  const g = L.gate, sc = L.sc, gw = L.gateW / 2, OL = '#5b4636';
  const hx = g.nx === 1 ? g.x : g.x - gw, hy = g.nx === 1 ? g.y - gw : g.y;   // 蝶番
  const ux = g.nx === 1 ? 0 : 1, uy = g.nx === 1 ? 1 : 0;
  const th = gateK * 1.75;   // 外向きに約100°開く
  const dx = ux * Math.cos(th) + g.nx * Math.sin(th), dy = uy * Math.cos(th) + g.ny * Math.sin(th);
  const len = L.gateW - 4 * sc, t = 9 * sc;
  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(Math.atan2(dy, dx));
  // 閉まっている間に外にヤギがいたら、ドアをふわっと光らせる
  if (!S.gateOpen && goats.some(isOutside)) {
    ctx.strokeStyle = `rgba(255,224,102,${0.45 + Math.sin(time * 6) * 0.3})`; ctx.lineWidth = 8 * sc;
    rr(ctx, 2 * sc, -t / 2 - 3 * sc, len, t + 6 * sc, 6 * sc); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,90,40,.22)'; rr(ctx, 4 * sc, -t / 2 + 4 * sc, len - 2 * sc, t, 4 * sc); ctx.fill();
  ctx.fillStyle = '#ffb3c8'; ctx.strokeStyle = OL; ctx.lineWidth = 2 * sc;
  rr(ctx, 2 * sc, -t / 2, len, t, 4 * sc); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(91,70,54,.55)'; ctx.lineWidth = 1.5 * sc;
  for (let i = 1; i < 4; i++) { const x = 2 * sc + len * i / 4; ctx.beginPath(); ctx.moveTo(x, -t / 2 + 1.5 * sc); ctx.lineTo(x, t / 2 - 1.5 * sc); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(ctx, 4 * sc, -t / 2 + 1.5 * sc, len - 4 * sc, 2 * sc, 1 * sc); ctx.fill();
  ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5 * sc;
  ctx.beginPath(); ctx.arc(len - 5 * sc, 0, 3 * sc, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// 「タップで開ける／閉める」の札（ヤギや畑に隠れないよう最前面に描く）
function drawGateLabel(time) {
  const anyOut = goats.some(isOutside);
  const g = L.gate, sc = L.sc;
  const label = !S.gateOpen ? (anyOut ? 'タップで開ける' : '') : (anyOut ? '' : 'タップで閉める');
  if (label) {
    const lx = g.x + g.nx * 62 * sc, ly = g.y + g.ny * 62 * sc + Math.sin(time * 5) * 2 * sc;
    ctx.save();
    ctx.font = `bold ${13 * sc}px ${TEXT_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + 18 * sc;
    ctx.globalAlpha = 0.9 + Math.sin(time * 6) * 0.1;
    ctx.fillStyle = '#fff6e6'; ctx.strokeStyle = '#c2447a'; ctx.lineWidth = 2 * sc;
    rr(ctx, lx - w / 2, ly - 12 * sc, w, 24 * sc, 12 * sc); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c2447a'; ctx.fillText(label, lx, ly + 0.5 * sc);
    ctx.restore();
  }
}

function drawGateHint(time) {
  const anyOut = goats.some(isOutside);
  const g = L.gate, sc = L.sc;
  if (!S.gateOpen) return;
  const a = anyOut ? 0.55 + Math.sin(time * 6) * 0.3 : 0.18;
  ctx.save();
  ctx.strokeStyle = `rgba(255,120,170,${a})`; ctx.lineWidth = 5 * sc; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const off = (34 + i * 16 - ((time * 20) % 16)) * sc;
    const cx = g.x + g.nx * off, cy = g.y + g.ny * off;
    const px = -g.ny, py = g.nx, w = 10 * sc, d = 6 * sc;
    ctx.beginPath();
    ctx.moveTo(cx + px * w + g.nx * d, cy + py * w + g.ny * d);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - px * w + g.nx * d, cy - py * w + g.ny * d);
    ctx.stroke();
  }
  ctx.restore();
}

function drawClouds(time, dt) {
  ctx.save();
  clouds.forEach(c => {
    c.x += c.v * dt; if (c.x - c.r * 2 > L.w) { c.x = -c.r * 2; c.y = rand(L.top, L.bottom); }
    ctx.fillStyle = 'rgba(50,90,40,0.05)';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(c.x + (k - 1.5) * c.r * 0.55, c.y + Math.sin(k * 2 + c.seed) * c.r * 0.15, c.r * 0.55, c.r * 0.35, 0, 0, TAU); ctx.fill(); }
  });
  ctx.restore();
}

function drawCursor(time) {
  if (!hover.show || paused) return;
  const sc = L.sc, x = hover.x, y = hover.y;
  const t = S.tool === 'auto' ? autoTarget(x, y) : null;
  ctx.save();
  if ((t && t.kind === 'push') || S.tool === 'stick') {
    ctx.strokeStyle = S.tool === 'stick' ? 'rgba(255,170,90,.7)' : 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 20;
    ctx.beginPath(); ctx.arc(x, y, PUSH_R * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  } else if (S.tool === 'food') {
    ctx.strokeStyle = 'rgba(255,150,190,.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(x, y, 62 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  } else if (gateHit(x, y)) {
    ctx.strokeStyle = 'rgba(255,224,102,.95)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(L.gate.x, L.gate.y, 40 * sc, 0, TAU); ctx.stroke();
  } else if (t && t.kind === 'pet') {
    const g = t.goat, s = sc * 1.1;
    ctx.strokeStyle = 'rgba(255,140,190,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(g.x, g.y - 20 * s, 30 * s, 28 * s, 0, 0, TAU); ctx.stroke();
  } else if (t && t.kind === 'plot' && t.plot < S.plotCount) {
    const p = L.plots[t.plot];
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    rr(ctx, p.x - p.s / 2 - 3, p.y - p.s / 2 - 3, p.s + 6, p.s + 6, 18 * sc); ctx.stroke();
  }
  ctx.restore();
  const bob = Math.sin(time * 6) * 2;
  if (S.tool === 'stick') drawStick(x + 6 * sc, y + 26 * sc, 0.5, 42 * sc, sc * 0.8);
  else {
    let e;
    if (t) {
      if (t.kind === 'pet') e = t.goat.satisfiedT > 0 ? '☺️' : '🥰';
      else if (t.kind === 'push') e = '✋';
      else if (t.kind === 'plot') {
        const pl = S.plots[t.plot];
        e = t.plot >= S.plotCount ? '🔒' : !pl.crop ? (pl.ruin > 0 ? '💦' : CROPS[S.seed].emoji) : pl.t >= CROPS[pl.crop].grow ? '🧺' : '⏳';
      } else e = '👆';
    } else e = { food: '🥣', bell: '🔔' }[S.tool];
    emoji(e, x + 14 * sc, y + 14 * sc + bob, 26 * sc);
  }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); ctx.stroke();
}

// ---------------------------------------------------------
// メインループ
// ---------------------------------------------------------
let last = performance.now(), uiTimer = 0, saveTimer = 0;
function frame(now) {
  const rdtRaw = Math.min(0.05, (now - last) / 1000); last = now;
  const rdt = paused ? 0 : rdtRaw;
  const dt = rdt * S.speed;
  update(dt, rdt);
  render(now / 1000, rdt);
  uiTimer -= rdtRaw; if (uiTimer <= 0) { uiTimer = 0.1; updateUI(); }
  saveTimer -= rdtRaw; if (saveTimer <= 0) { saveTimer = 5; save(); }
  requestAnimationFrame(frame);
}

function update(dt, rdt) {
  const growMul = S.fert ? 1.3 : 1;
  clock += dt;
  outsideN = goats.filter(isOutside).length;
  for (let i = 0; i < S.plotCount; i++) {
    const pl = S.plots[i];
    if (pl.ruin > 0) { pl.ruin = Math.max(0, pl.ruin - dt); if (pl.ruin === 0) plotFx[i].sqv = 3; }
    if (pl.crop) {
      const cr = CROPS[pl.crop], wasReady = pl.t >= cr.grow;
      pl.t = Math.min(cr.grow, pl.t + dt * growMul);
      if (!wasReady && pl.t >= cr.grow) { plotFx[i].sqv = 4; const p = L.plots[i]; sparkles(p.x, p.y - p.s * 0.3, 3); }
    }
  }
  for (const fx of plotFx) { fx.sqv += (-200 * fx.sq - 10 * fx.sqv) * rdt; fx.sq += fx.sqv * rdt; fx.sq = clamp(fx.sq, -0.4, 0.4); }
  goats.forEach(g => updateGoat(g, dt, rdt));
  separateGoats();
  updateParts(rdt);
  S.bellCD = Math.max(0, S.bellCD - dt);
  gateK += ((S.gateOpen ? 1 : 0) - gateK) * Math.min(1, rdt * 10);
}

function render(time, rdt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(bgCanvas, 0, 0, L.w, L.h);
  drawGateDoor(time);
  drawGateHint(time);
  for (let i = 0; i < MAX_PLOTS; i++) drawPlotBase(i, time);
  const eaten = {};
  goats.forEach(g => { if (g.state === 'eating') eaten[g.eatPlot] = g; });
  const list = [];
  for (let i = 0; i < S.plotCount; i++) if (S.plots[i].crop) list.push({ y: L.plots[i].y + L.plots[i].s * 0.14, f: () => drawCrop(i, time, eaten[i]) });
  goats.forEach(g => list.push({ y: g.y, f: () => drawGoat(g, time) }));
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  drawParts();
  goats.forEach(drawBubble);
  drawGateLabel(time);
  drawClouds(time, rdt);
  drawCursor(time);
}

// ---------------------------------------------------------
// UI
// ---------------------------------------------------------
function bumpGauge(id) {
  const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function toast(msg, cls = '') {
  const box = $('toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg;
  box.appendChild(d);
  setTimeout(() => d.remove(), 2500);
}

function nextSeroGoal() {
  const costs = [];
  CROP_ORDER.forEach(k => { if (!S.unlockedCrops[k]) costs.push(CROPS[k].unlock); });
  if (S.plotCount < MAX_PLOTS) costs.push(PLOT_COSTS[S.plotCount - START_PLOTS]);
  if (S.fenceLvl < 3) costs.push(FENCE_COSTS[S.fenceLvl]);
  if (!S.stick) costs.push(15);
  if (!S.bell) costs.push(120);
  if (!S.fert) costs.push(80);
  const above = costs.filter(c => c > S.sero);
  return above.length ? Math.min(...above) : (costs.length ? Math.min(...costs) : 500);
}

let lastSub = '';
function updateUI() {
  $('seroVal').textContent = Math.floor(S.sero);
  $('oxyVal').textContent = Math.floor(S.oxy);
  const lvl = trustLevel();
  $('trustLv').textContent = `信頼Lv.${lvl}`;
  $('seroBar').style.width = Math.min(100, S.sero / nextSeroGoal() * 100) + '%';
  $('oxyBar').style.width = (lvl >= 10 ? 100 : (S.trustXP - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100) + '%';
  document.querySelectorAll('.tool[data-tool]').forEach(b => {
    const t = b.dataset.tool;
    b.classList.toggle('active', t === S.tool);
    b.classList.toggle('locked', (t === 'stick' && !S.stick) || (t === 'bell' && !S.bell));
  });
  $('foodBadge').textContent = S.food;
  const cd = $('bellCd');
  cd.classList.toggle('on', S.bell && S.bellCD > 0);
  cd.textContent = S.bellCD > 0 ? Math.ceil(S.bellCD) : '';
  const sb = $('speedBtn');
  const spHtml = S.speed === 1 ? '▶ 1x<span class="sp-label"> のんびり</span>' : '⏩ 2x<span class="sp-label"> サクサク</span>';
  if (sb.dataset.h !== spHtml) { sb.dataset.h = spHtml; sb.innerHTML = spHtml; }
  sb.classList.toggle('fast', S.speed === 2);
  $('soundBtn').textContent = S.sound ? '🔊' : '🔇';
  renderSubrow();
  if (!$('shopModal').classList.contains('hidden')) { $('shopSero').textContent = Math.floor(S.sero); $('shopOxy').textContent = Math.floor(S.oxy); }
}

function renderSubrow() {
  let html;
  if (S.tool === 'auto') {
    html = '<span class="seedlabel">植える種</span>' + CROP_ORDER.filter(k => S.unlockedCrops[k]).map(k =>
      `<button class="seedbtn ${S.seed === k ? 'active' : ''}" data-seed="${k}"><span class="se">${CROPS[k].emoji}</span><small>${CROPS[k].seed}🌱</small></button>`).join('');
  } else {
    const hints = {
      stick: '近くで使うと❗ビックリして2倍速で柵へ！でもムスッ💢として💖が減る',
      food: `脱走ヤギ→自分から柵へ帰る(餌 or 🌱${FOOD_LURE_SERO}) ／ 柵の中→プレゼント　🥣${S.food}　🌿${S.grassItem}`,
      bell: S.bellCD > 0 ? `🔔 クールダウン中… あと${realSec(S.bellCD)}秒` : 'どこかをタップで鈴を鳴らす → 脱走中のヤギ全員がおうちへ',
    };
    html = `<div class="hint">${hints[S.tool]}</div>`;
  }
  if (html !== lastSub) { lastSub = html; $('subrow').innerHTML = html; }
}

function setTool(t) {
  if (t === 'stick' && !S.stick) { toast('🔒 木の棒はショップで解放できるよ'); openShop(); return; }
  if (t === 'bell' && !S.bell) { toast('🔒 鈴はショップで解放できるよ'); openShop(); return; }
  S.tool = t; SFX.pop(); updateUI();
}

// ---------------------------------------------------------
// ショップ
// ---------------------------------------------------------
const STICK_ICON = $('tools').querySelector('[data-tool="stick"] .ti').innerHTML;
function shopItems() {
  const it = [];
  CROP_ORDER.slice(1).forEach(k => {
    const c = CROPS[k];
    it.push({ sec: '🌱 種のアンロック', icon: c.emoji, name: `${c.name}の種`, desc: `種 ${c.seed}🌱 ／ ${c.grow}秒で育つ ／ 収穫 +${c.yield}🌱`, cost: c.unlock, cur: 'sero', done: !!S.unlockedCrops[k],
      buy: () => { S.unlockedCrops[k] = true; S.seed = k; toast(`${c.emoji} ${c.name}の種を解放！`, 'good'); } });
  });
  const pc = S.plotCount < MAX_PLOTS ? PLOT_COSTS[S.plotCount - START_PLOTS] : 0;
  it.push({ sec: '🟫 畑', icon: '🟫', name: `畑を広げる（${S.plotCount}/${MAX_PLOTS}）`, desc: '作物を植えられる区画が1つ増える', cost: pc, cur: 'sero', done: S.plotCount >= MAX_PLOTS,
    buy: () => { S.plotCount++; plotFx[S.plotCount - 1].sqv = 5; toast('畑が広がった！', 'good'); } });
  it.push({ sec: '🟫 畑', icon: '🧪', name: 'ふかふか肥料', desc: '作物の成長スピードが1.3倍に', cost: 80, cur: 'sero', done: S.fert, buy: () => { S.fert = true; toast('🧪 畑がふかふかになった！', 'good'); } });
  it.push({ sec: '🧱 柵の補強', icon: '🧱', name: S.fenceLvl < 3 ? `柵の補強 Lv.${S.fenceLvl + 1}` : '柵の補強（MAX）', desc: `脱走の間隔が長くなる（現在 ×${FENCE_MUL[S.fenceLvl]}）`, cost: S.fenceLvl < 3 ? FENCE_COSTS[S.fenceLvl] : 0, cur: 'sero', done: S.fenceLvl >= 3,
    buy: () => { S.fenceLvl++; buildBg(); toast(`🧱 柵が Lv.${S.fenceLvl} になった！`, 'good'); } });
  it.push({ sec: '🎒 誘導アイテム', icon: STICK_ICON, name: '木の棒（解放）', desc: 'ビックリさせて2倍速で柵へ。ただしヤギが拗ねる', cost: 15, cur: 'sero', done: S.stick, buy: () => { S.stick = true; S.tool = 'stick'; } });
  it.push({ sec: '🎒 誘導アイテム', icon: '🥣', name: '美味しい餌 ×3', desc: `脱走ヤギを呼び戻す／柵の中でプレゼント（所持 ${S.food}）`, cost: FOOD_PACK_COST, cur: 'sero', done: false, buy: () => { S.food += 3; } });
  it.push({ sec: '🎒 誘導アイテム', icon: '🔔', name: '鈴（解放）', desc: `鳴らすと脱走中の全ヤギが帰ってくる（CT ${BELL_CD}秒）`, cost: 120, cur: 'sero', done: S.bell, buy: () => { S.bell = true; S.tool = 'bell'; } });
  const n = goats.length;
  it.push({ sec: '🐐 ヤギのお迎え（💖で交換）', icon: '🐐', name: n < MAX_GOATS ? `${GOAT_NAMES[n]}（${PERSONA[n].icon}${PERSONA[n].label}）をお迎え` : 'ヤギがいっぱい！', desc: n < MAX_GOATS ? `${n + 1}匹目。${PERSONA[n].desc}` : 'これ以上はお迎えできないよ', cost: n < MAX_GOATS ? GOAT_COSTS[n - 1] : 0, cur: 'oxy', done: n >= MAX_GOATS,
    buy: () => addGoat() });
  [1, 10].forEach(k => it.push({ sec: '💱 両替（💖→🌱）', icon: '💱', name: `セロトニン ${k}🌱 に両替`, desc: `💖${OXY_PER_SERO * k} を 🌱${k} に交換（信頼Lvは下がらない）`, cost: OXY_PER_SERO * k, cur: 'oxy', done: false,
    buy: () => { addSero(k); toast(`💱 💖${OXY_PER_SERO * k} → 🌱${k} に両替した`, 'good'); } }));
  it.push({ sec: '⚙️ その他', icon: '🗑️', name: 'データをリセット', desc: '最初からやり直す', cost: 0, cur: 'reset', done: false, buy: () => {} });
  return it;
}
let shopCache = [];
function renderShop() {
  shopCache = shopItems();
  let html = '', sec = '';
  shopCache.forEach((it, i) => {
    if (it.sec !== sec) { sec = it.sec; html += `<div class="shop-sec">${sec}</div>`; }
    let btn;
    if (it.cur === 'reset') btn = `<button class="buy danger" data-i="${i}">リセット</button>`;
    else if (it.done) btn = `<button class="buy done" disabled>✔ 済み</button>`;
    else {
      const have = it.cur === 'sero' ? S.sero : S.oxy;
      btn = `<button class="buy ${it.cur === 'oxy' ? 'oxy' : ''}" data-i="${i}" ${have < it.cost ? 'disabled' : ''}>${it.cur === 'sero' ? '🌱' : '💖'} ${it.cost}</button>`;
    }
    html += `<div class="shop-row"><div class="si">${it.icon}</div><div class="sb"><div class="sn">${it.name}</div><div class="sd">${it.desc}</div></div>${btn}</div>`;
  });
  $('shopList').innerHTML = html;
  $('shopSero').textContent = Math.floor(S.sero); $('shopOxy').textContent = Math.floor(S.oxy);
}
function openShop() { renderShop(); $('shopModal').classList.remove('hidden'); paused = true; }
function closeModal(id) { $(id).classList.add('hidden'); paused = !$('shopModal').classList.contains('hidden') || !$('helpModal').classList.contains('hidden'); }

$('shopList').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]'); if (!b) return;
  const it = shopCache[+b.dataset.i]; if (!it) return;
  if (it.cur === 'reset') {
    if (confirm('本当にデータをリセットしますか？')) { localStorage.removeItem(SAVE_KEY); resetting = true; location.reload(); }
    return;
  }
  if (it.done) return;
  if (it.cur === 'sero') { if (S.sero < it.cost) return; S.sero -= it.cost; bumpGauge('seroGauge'); }
  else { if (S.oxy < it.cost) return; S.oxy -= it.cost; bumpGauge('oxyGauge'); }
  it.buy();
  SFX.buy();
  renderShop(); updateUI(); save();
});

function addGoat() {
  const n = goats.length;
  const def = { name: GOAT_NAMES[n], c: n };
  const g = makeGoat(def, L.gateIn.x, L.gateIn.y);
  g.escapeT = 30 + nextEscape(g);
  g.sqv = 6; g.target = randomInside();
  goats.push(g);
  say(g, '💖', 2.5); hearts(g.x, g.y - 30 * L.sc, 6); sparkles(g.x, g.y - 30 * L.sc, 6);
  toast(`🐐 ${def.name}がやってきた！よろしくね💖`, 'good');
}

// ---------------------------------------------------------
// 保存
// ---------------------------------------------------------
let resetting = false;
function save() {
  if (resetting) return;
  try {
    S.goatDefs = goats.map(g => ({ name: g.name, c: g.ci, snap: snapGoat(g) }));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, s: S }));
  } catch (e) { /* ignore */ }
}

// 閉じている間は世界ごと止まる。ヤギも閉じた瞬間の居場所・状態から再開する
// 位置は画面サイズが変わっても破綻しないよう、柵の中は柵基準・外はプレイエリア基準の比率で持つ
const GOAT_TIMERS = ['escapeT', 'outT', 'sulk', 'satisfiedT', 'feedCD', 'lonelyT'];
function snapGoat(g) {
  const f = L.fence, sn = { st: g.state, dir: g.dir, returnMode: g.returnMode };
  GOAT_TIMERS.forEach(k => { sn[k] = +g[k].toFixed(2); });
  if (g.state === 'inside' || g.state === 'toGate') { sn.fx = +((g.x - f.x) / f.w).toFixed(4); sn.fy = +((g.y - f.y) / f.h).toFixed(4); }
  else { sn.sx = +(g.x / L.w).toFixed(4); sn.sy = +((g.y - L.top) / (L.bottom - L.top)).toFixed(4); }
  return sn;
}
function restoreGoat(g, sn) {
  GOAT_TIMERS.forEach(k => { if (Number.isFinite(sn[k])) g[k] = sn[k]; });
  if (sn.dir === 1 || sn.dir === -1) g.dir = sn.dir;
  const f = L.fence;
  if (sn.st === 'inside' || sn.st === 'toGate') {
    if (Number.isFinite(sn.fx) && Number.isFinite(sn.fy)) { const p = clampInside(f.x + sn.fx * f.w, f.y + sn.fy * f.h); g.x = p.x; g.y = p.y; }
    if (sn.st === 'toGate') setState(g, 'toGate');
    return;
  }
  // 外にいた（または出入りの途中だった）ヤギ
  if (sn.st === 'exiting' || !Number.isFinite(sn.sx) || !Number.isFinite(sn.sy)) { g.x = L.gateOut.x; g.y = L.gateOut.y; g.outT = 0; }
  else { g.x = sn.sx * L.w; g.y = L.top + sn.sy * (L.bottom - L.top); clampScreen(g); }
  g.vx = g.vy = 0; g.eatPlot = -1; g.target = null;
  if (sn.st === 'lured' || sn.st === 'entering') {
    // 餌・鈴・追い込みで帰る途中だった子は、そのまま帰宅を続ける
    setState(g, 'lured'); g.returnMode = sn.returnMode || 'self';
  } else {
    // 逃げている最中の勢いは復元せず、キョロキョロしてから動き出す
    setState(g, 'pause'); g.returnMode = null; say(g, '❓', 1.4);
  }
}

// ---------------------------------------------------------
// 入力
// ---------------------------------------------------------
let downId = null, lastDragPlot = -1, dragSeed = false;
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  ensureAudio(); if (actx && actx.state === 'suspended') actx.resume();
  if (paused) return;
  downId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  hover.x = e.clientX; hover.y = e.clientY; hover.show = e.pointerType === 'mouse';
  const kind = onTap(e.clientX, e.clientY);
  // ヤギに触れたタップからはなぞり収穫を始めない
  dragSeed = kind === 'plot' || kind === 'none';
  lastDragPlot = dragSeed ? plotAt(e.clientX, e.clientY) : -1;
});
canvas.addEventListener('pointermove', e => {
  hover.x = e.clientX; hover.y = e.clientY; hover.show = e.pointerType === 'mouse';
  if (downId === e.pointerId && dragSeed && S.tool === 'auto' && !paused) {
    const i = plotAt(e.clientX, e.clientY);
    if (i >= 0 && i !== lastDragPlot) { lastDragPlot = i; seedAction(i, true); }
  }
});
const endPtr = e => { if (e.pointerId === downId) { downId = null; lastDragPlot = -1; dragSeed = false; } };
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', () => { hover.show = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

$('tools').addEventListener('click', e => {
  ensureAudio();
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'shopBtn') { SFX.pop(); openShop(); return; }
  if (b.dataset.tool) setTool(b.dataset.tool);
});
$('subrow').addEventListener('click', e => {
  const b = e.target.closest('.seedbtn'); if (!b) return;
  S.seed = b.dataset.seed; SFX.pop(); lastSub = ''; renderSubrow();
});
$('speedBtn').addEventListener('click', () => { ensureAudio(); S.speed = S.speed === 1 ? 2 : 1; SFX.pop(); updateUI(); toast(S.speed === 2 ? '⏩ 2x サクサクモード' : '▶ 1x のんびりモード'); });
$('soundBtn').addEventListener('click', () => { ensureAudio(); S.sound = !S.sound; SFX.pop(); updateUI(); });
$('helpBtn').addEventListener('click', () => { $('helpModal').classList.remove('hidden'); paused = true; });
$('startBtn').addEventListener('click', () => { ensureAudio(); if (actx && actx.state === 'suspended') actx.resume(); closeModal('helpModal'); SFX.home(); });
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(m.id); }));

window.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= String(TOOLS.length)) setTool(TOOLS[+e.key - 1]);
  else if (e.key === ' ') { e.preventDefault(); $('speedBtn').click(); }
  else if (e.key === 'Escape') { closeModal('shopModal'); closeModal('helpModal'); }
  else if (e.key === 's' || e.key === 'S') { if ($('shopModal').classList.contains('hidden')) openShop(); else closeModal('shopModal'); }
});
window.addEventListener('resize', () => { resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); last = performance.now(); });
window.addEventListener('beforeunload', save);
window.addEventListener('pagehide', save);   // スマホのタブ破棄・bfcache でも保存

// ---------------------------------------------------------
// 起動
// ---------------------------------------------------------
updateUI();
resize();
S.goatDefs.forEach((d, i) => {
  const p = randomInside();
  const g = makeGoat(d, p.x, p.y);
  if (d.snap) restoreGoat(g, d.snap);   // 旧セーブ（snapなし）は従来どおり柵の中から
  else g.escapeT = (isNewGame && i === 0) ? 14 : nextEscape(g) * 0.6 + i * 5;
  goats.push(g);
});
if (isNewGame) { $('helpModal').classList.remove('hidden'); paused = true; }
else {
  const out = goats.filter(isOutside);
  if (out.length) toast(`おかえりなさい！${out.map(g => g.name).join('・')}は脱走したままだよ🐐💦`, 'warn');
  else toast('おかえりなさい！ヤギたちが待ってたよ🐐💖', 'good');
}
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });

})();
