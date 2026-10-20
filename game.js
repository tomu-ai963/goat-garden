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
// 道具は消耗品：1回買うと1回使える（🌱の使いみち）。肥料は使うと FERT_T 秒間、畑すべてが FERT_MUL 倍速
const ITEM_COST = { stick: 50, food: 100, bell: 500, fert: 200 };
const FERT_MUL = 2, FERT_T = 60;
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
// ゲート：外に誰もいないのに GATE_GRACE 秒以上開けたまま＝開けっぱなし。
// 柵の中の子がゲートから出ていきやすくなる（脱走タイマーの進む倍率）。追い込み中は罰なし
const GATE_OPEN_ESC = 4, GATE_GRACE = 5;
// 依頼掲示板：QUEST_SLOTS 枚から1つ受ける（期限なし・いつでも替えられる）。達成で⭐ → ショップの飾り付け
const QUEST_SLOTS = 3;
const HARVEST_N = { grass: 6, flower: 5, carrot: 4, berry: 3, pumpkin: 2 };
// 納品の依頼：作物ごとの使い道（why）と必要数・ごほうび。かぼちゃは大口
const DELIVER = {
  grass:   { why: '冬ごしの干し草', n: 6, stars: 1 },
  flower:  { why: '花束づくり',     n: 4, stars: 1 },
  carrot:  { why: 'となりの牧場のおすそわけ', n: 3, stars: 2 },
  berry:   { why: 'ジャムづくり',   n: 3, stars: 2 },
  pumpkin: { why: '秋のお祭りの飾り', n: 2, stars: 3 },
};
const SCARF_COST = 2;
const SCARF_COLORS = ['#5cb85c', '#ff6fa5', '#ff9f43', '#4dabf7', '#9b7bff'];
// なかよし度：ヤギごとの絆。上がるたびに思い出（MEMORIES）が1つ増えて⭐+1
// 好物（GOAT_NAMES と同じ並び）は、柵の中でおやつとしてあげると見つかる。脱走中はその畑を狙いやすい
const FAVORITE = ['flower', 'berry', 'carrot', 'pumpkin', 'grass'];
const BOND_XP = [0, 8, 25, 50, 90, 140];   // なかよしLv.0〜5 に必要な累計
const BOND_GAIN = { pet: 1, feed: 2, fav: 5, hand: 3, home: 1 };
const FAV_OXY = 5;   // 好物をあげたときに上乗せする💖
const MEMORIES = [
  ['ひなたでいっしょにうとうとした。メイの寝息は「ぷぅ」', 'お花のにおいをかいで、しあわせそうに目を細めていた', 'わたしの足もとを枕にして、お昼寝をはじめた',
   '脱走の途中なのに、立ち止まって雲をながめていた', 'はじめて自分から「めぇ」と呼びに来てくれた'],
  ['なでる手を止めると、鼻でつんつん催促された', 'ずっと後ろをついてくる。ふり向くと、うれしそうにしっぽをふった', '名前を呼ぶと、遠くからでも走ってくるようになった',
   'ほかの子をなでていたら、間にぐいっと割りこんできた', '「いちばんすき」ってユキの顔に書いてある気がした'],
  ['おやつの音だけで、柵のすみからとんできた', 'もぐもぐしながら、もう次のおやつを見つめていた', '畑仕事をじっと見守っている。…たぶん収穫待ち',
   'はじめて、おやつをほかの子にゆずっていた', '何も持っていないのに、そばに来てすり寄ってくれた'],
  ['かけっこを挑まれた。もちろん負けた', '柵を飛び越えたあと、「見てた？」という顔でふり返った', '追い込まれるのも、遊びのひとつだと思っているみたい',
   '走りつかれて、わたしの横にどさっと寝ころんだ', 'ゲートの前で、わたしが来るのを待っていてくれた'],
  ['遠くから、こっそりこっちを見ていた', 'そーっと手を出したら、においをかいでくれた', 'はじめて、自分から近くに寄ってきてくれた',
   '大きな音にびっくりしたとき、わたしの後ろにかくれた', 'もう、なでても耳がぺたんとしない。安心してくれている'],
];
// 昼夜：ゲーム内 DAY_LEN 秒で1日（朝→昼→夕方→夜）。夜はヤギが眠くて脱走しにくい
const DAY_LEN = 300, NIGHT_ESC = 0.5;
// 天気イベント：はれの合間（WEATHER_GAP 秒）にときどき起きる。虹は雨上がりに RAINBOW_CHANCE で出る
//   grow: 作物の育つ速さ  esc: 柵の中の子の脱走タイマーの進む速さ  bonus: 手で戻したときの追加💖
const WEATHER = {
  clear:   { icon: '',   label: 'はれ' },
  rain:    { icon: '🌧️', label: 'あめ', dur: [40, 60], grow: 1.5, esc: 0.7, msg: '🌧️ 雨がふってきた！作物がよく育つよ（ヤギは雨宿りでおとなしい）' },
  wind:    { icon: '🍃', label: 'かぜ', dur: [30, 45], esc: 1.4, msg: '🍃 風が強い…ヤギたちがソワソワしてる！' },
  rainbow: { icon: '🌈', label: 'にじ', dur: [25, 25], bonus: 4, msg: '🌈 にじが出た！いま手で戻すと💖+4' },
};
const WEATHER_GAP = [60, 120], RAINBOW_CHANCE = 0.6;
// 追い込みチャレンジ：選んだ子を🚩の順に通してゲートへ（手だけ）。スコア＝タイム（ゲーム内秒）＋押した回数、小さいほど良い
//   コースの座標は畑エリアの [u, v]：u はゲートから遠ざかる向き（0=ゲート側 1=奥）、v はそれと直交する向き
//   rank: ★3 / ★2 になるスコアの上限。★が増えたぶんだけ⭐
const COURSES = [
  { id: 'first',  name: 'はじめての旗', start: [0.85, 0.5], flags: [[0.45, 0.3]], rank: [15, 25] },
  { id: 'zigzag', name: 'ジグザグ',     start: [0.9, 0.15], flags: [[0.7, 0.75], [0.45, 0.25], [0.2, 0.7]], rank: [35, 55] },
  { id: 'loop',   name: 'ぐるっと一周', start: [0.5, 0.5],  flags: [[0.85, 0.2], [0.85, 0.8], [0.3, 0.85], [0.3, 0.15]], rank: [45, 72] },
];
const CHAL_LIMIT = 120, CHAL_R = 34, CHAL_OXY = 5;
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
    fenceLvl: 0, stickN: 0, bellN: 0, fertN: 0, fertT: 0,
    food: 1, grassItem: 0,
    goatDefs: [{ name: GOAT_NAMES[0], c: 0 }],
    speed: 1, tool: 'auto', seed: 'grass',
    sound: true, bgm: true, vibe: true, seen: {}, gateOpen: false,
    stars: 0, questsDone: 0, quest: { offers: [], active: null }, deco: {},
    snacks: {}, snack: 'grass', bond: {}, favFound: {},
    dayT: DAY_LEN * 0.05, weather: { k: 'clear', t: 0, wait: 90 },   // 新しい牧場は朝のうちから
    chal: {}, chalGoat: 0,   // 追い込みチャレンジの記録 { コースid: { rank, best } } と、走らせる子
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
    if (d.s.bgm === undefined && d.s.sound === false) S.bgm = false;
    // 旧セーブの「解放済み（使い放題）」の道具は、消耗品への切り替えの代わりに回数で渡す
    if (S.stick === true) S.stickN += 3;
    if (S.bell === true) S.bellN += 1;
    if (S.fert === true) S.fertN += 1;
    delete S.stick; delete S.bell; delete S.fert; delete S.bellCD;
    if (!S.chal || typeof S.chal !== 'object') S.chal = {};
    ['stickN', 'bellN', 'fertN', 'fertT', 'food'].forEach(k => { if (!Number.isFinite(S[k]) || S[k] < 0) S[k] = 0; });
    if (!Number.isFinite(S.dayT)) S.dayT = DAY_LEN * 0.05;
    S.dayT = ((S.dayT % DAY_LEN) + DAY_LEN) % DAY_LEN;
    if (!S.weather || !WEATHER[S.weather.k] || !Number.isFinite(S.weather.t) || !Number.isFinite(S.weather.wait)) S.weather = { k: 'clear', t: 0, wait: 90 };   // 音を切っていた人には BGM も鳴らさない
    ['snacks', 'bond', 'favFound'].forEach(k => { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
    if (S.snack !== 'food' && !S.unlockedCrops[S.snack]) S.snack = 'grass';
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
let gateIdleT = 0, gateWarned = false;   // 外に誰もいない状態でゲートが開いている時間／その開け方で注意済みか
const gateLeftOpen = () => gateIdleT > GATE_GRACE;
const hover = { x: -999, y: -999, show: false };
let clouds = [];

// ---------------------------------------------------------
// サウンド（WebAudio・ごく軽い効果音）
// ---------------------------------------------------------
let actx = null;
function ensureAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  bgmSync();
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

// BGM：音源ファイルなしで、その場で鳴らすのんびりした8小節ループ（C→Am→F→G を2小節ずつ）
const BGM_BPM = 92, BGM_VOL = 0.09;
const BGM_CHORDS = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
const BGM_MELODY = [   // 1拍ずつ（MIDIノート番号、0は休み）。C ペンタトニック中心
  72, 76, 79, 76,  74, 72, 74, 0,   69, 72, 76, 72,  74, 76, 72, 0,
  72, 76, 74, 72,  69, 67, 69, 0,   67, 69, 72, 74,  76, 74, 72, 0,
];
let bgmTimer = null, bgmGain = null, bgmStep = 0, bgmNextT = 0;
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
function bgmNote(m, t, dur, type, vol) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = midiHz(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bgmGain);
  o.start(t); o.stop(t + dur + 0.05);
}
// 少し先（0.4秒）までの音を予約していく
function bgmTick() {
  const beat = 60 / BGM_BPM;
  while (bgmNextT < actx.currentTime + 0.4) {
    const i = bgmStep % BGM_MELODY.length, ch = BGM_CHORDS[Math.floor(i / 8) % BGM_CHORDS.length];
    if (i % 4 === 0) { bgmNote(ch[0] - 12, bgmNextT, beat * 1.8, 'sine', 0.9); ch.forEach(m => bgmNote(m, bgmNextT, beat * 3.6, 'triangle', 0.18)); }
    if (i % 4 === 2) bgmNote(ch[1] - 12, bgmNextT, beat * 1.6, 'sine', 0.6);
    if (BGM_MELODY[i]) bgmNote(BGM_MELODY[i], bgmNextT, beat * 0.9, 'triangle', 0.45);
    bgmNextT += beat; bgmStep++;
  }
}
function bgmStart() {
  if (bgmTimer || !actx) return;
  bgmGain = actx.createGain(); bgmGain.gain.value = BGM_VOL; bgmGain.connect(actx.destination);
  bgmNextT = actx.currentTime + 0.1;
  bgmTimer = setInterval(bgmTick, 120);
  bgmTick();
}
function bgmStop() {
  if (!bgmTimer) return;
  clearInterval(bgmTimer); bgmTimer = null;
  const g = bgmGain; bgmGain = null;
  g.gain.setTargetAtTime(0.0001, actx.currentTime, 0.12);   // ぷつっと切らずにすっと消す
  setTimeout(() => g.disconnect(), 800);
}
// 設定・画面の表示状態に合わせて鳴らす／止める（閉じている間は世界ごと止まるので BGM も止める）
function bgmSync() { if (actx && S.bgm && !document.hidden) bgmStart(); else bgmStop(); }

// 振動（対応端末のみ。iPhone の Safari は非対応）
const buzz = p => { if (S.vibe && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } };

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
    SFX.level(); buzz([20, 40, 20, 40, 40]);
    goats.forEach(g => { sparkles(g.x, g.y - 30 * L.sc, 5); say(g, '💕', 2); });
  } else if (after < before) {
    toast(`💔 信頼度が Lv.${after} に下がっちゃった…やさしく戻して取り戻そう`, 'warn');
    SFX.nope();
  }
}
// なかよし度は下がらない（木の棒の罰は💖のほう）
const favOf = g => FAVORITE[g.ci % FAVORITE.length];
function bondLevel(ci) { const x = S.bond[ci] || 0; let l = 0; while (l < BOND_XP.length - 1 && x >= BOND_XP[l + 1]) l++; return l; }
function addBond(g, n) {
  const before = bondLevel(g.ci);
  S.bond[g.ci] = (S.bond[g.ci] || 0) + n;
  const after = bondLevel(g.ci);
  if (after <= before) return;
  S.stars += after - before;
  SFX.level(); buzz([20, 40, 20, 40, 40]);
  hearts(g.x, g.y - 34 * L.sc, 8); sparkles(g.x, g.y - 30 * L.sc, 8);
  toast(`📖 ${g.name}となかよしLv.${after}！思い出が増えた（⭐+${after - before}）`, 'good');
  if (!S.seen.album) { S.seen.album = true; setTimeout(() => toast('思い出は右上の📖なかよし帳で見られるよ', 'good'), 1400); }
}

// おやつ：牧草🌿と餌🥣のほか、収穫した作物も1つずつ取っておける
const snackEmoji = k => k === 'food' ? '🥣' : CROPS[k].emoji;
const snackName = k => k === 'food' ? '美味しい餌' : CROPS[k].name;
const snackKinds = () => [...CROP_ORDER.filter(k => S.unlockedCrops[k]), 'food'];
const snackCount = k => k === 'grass' ? S.grassItem : k === 'food' ? S.food : (S.snacks[k] || 0);
function takeSnack(k) { if (k === 'grass') S.grassItem--; else if (k === 'food') S.food--; else S.snacks[k]--; }

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
  drawDecos(b, sc);
  drawFence(b, sc);
  if (S.deco.flags) drawGarland(b, sc);
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
  b.fillStyle = S.deco.roof ? '#7cc8ff' : '#ff9aa8'; b.beginPath(); b.moveTo(x - s * 0.04, y + s * 0.45); b.lineTo(x + s / 2, y + s * 0.02); b.lineTo(x + s * 1.04, y + s * 0.45); b.closePath(); b.fill(); b.stroke();
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

// 飾り付け（⭐で交換）：花壇は柵の右下、ベンチは小屋と水飲み場のあいだ
function drawDecos(b, sc) {
  const f = L.fence, OL = '#5b4636';
  if (S.deco.bed) {
    const x = f.x + f.w - 52 * sc, y = f.y + f.h - 24 * sc;
    b.fillStyle = 'rgba(60,100,40,.18)'; b.beginPath(); b.ellipse(x, y + 8 * sc, 34 * sc, 6 * sc, 0, 0, TAU); b.fill();
    ['#ff8fb8', '#ffd43b', '#ff6b81', '#c49bff', '#ffffff'].forEach((c, i) => {
      const fx = x + (i - 2) * 11 * sc, fy = y - 10 * sc - (i % 2) * 4 * sc;
      b.strokeStyle = '#3f8f3a'; b.lineWidth = 1.6 * sc; b.beginPath(); b.moveTo(fx, y - 2 * sc); b.lineTo(fx, fy); b.stroke();
      b.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; b.beginPath(); b.arc(fx + Math.cos(a) * 2.6 * sc, fy + Math.sin(a) * 2.6 * sc, 2.2 * sc, 0, TAU); b.fill(); }
      b.fillStyle = '#ffcf4d'; b.beginPath(); b.arc(fx, fy, 1.6 * sc, 0, TAU); b.fill();
    });
    b.fillStyle = '#b97c4b'; b.strokeStyle = OL; b.lineWidth = 2 * sc; rr(b, x - 30 * sc, y - 4 * sc, 60 * sc, 12 * sc, 5 * sc); b.fill(); b.stroke();
  }
  if (S.deco.bench) {
    const h = L.hut, x = Math.max(f.x + f.w / 2, h.x + h.s + 40 * sc), y = f.y + 34 * sc;
    b.fillStyle = 'rgba(60,100,40,.18)'; b.beginPath(); b.ellipse(x, y + 6 * sc, 26 * sc, 5 * sc, 0, 0, TAU); b.fill();
    b.strokeStyle = OL; b.lineWidth = 3.5 * sc; b.lineCap = 'round';
    [-16, 16].forEach(dx => { b.beginPath(); b.moveTo(x + dx * sc, y - 22 * sc); b.lineTo(x + dx * sc, y + 5 * sc); b.stroke(); });
    b.fillStyle = '#c58b5a'; b.lineWidth = 2 * sc; rr(b, x - 22 * sc, y - 22 * sc, 44 * sc, 7 * sc, 3 * sc); b.fill(); b.stroke();
    b.fillStyle = '#d9a06a'; rr(b, x - 24 * sc, y - 9 * sc, 48 * sc, 7 * sc, 3 * sc); b.fill(); b.stroke();
    b.fillStyle = 'rgba(255,255,255,.4)'; rr(b, x - 20 * sc, y - 8 * sc, 30 * sc, 2 * sc, 1 * sc); b.fill();
  }
}

// ガーランド：柵の上の辺に、杭から杭へたるませた旗飾り
function drawGarland(b, sc) {
  const f = L.fence, cols = ['#ff8fb8', '#ffd43b', '#7fd36b', '#6ec6ff'];
  const y0 = f.y - 12 * sc, sag = 9 * sc, n = Math.max(1, Math.round(f.w / (64 * sc))), seg = f.w / n;
  let ci = 0;
  for (let i = 0; i < n; i++) {
    const ax = f.x + i * seg, bx = ax + seg;
    b.strokeStyle = '#8c6b52'; b.lineWidth = 1.4 * sc; b.beginPath(); b.moveTo(ax, y0); b.quadraticCurveTo((ax + bx) / 2, y0 + sag * 2, bx, y0); b.stroke();
    for (let k = 1; k <= 4; k++) {
      const t = k / 5, x = ax + seg * t, y = y0 + 4 * sag * t * (1 - t);
      b.fillStyle = cols[ci++ % cols.length]; b.strokeStyle = '#5b4636'; b.lineWidth = 1 * sc;
      b.beginPath(); b.moveTo(x - 4 * sc, y); b.lineTo(x + 4 * sc, y); b.lineTo(x, y + 9 * sc); b.closePath(); b.fill(); b.stroke();
    }
  }
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
    const score = dist(g.x, g.y, p.x, p.y) - (ready ? 200 * L.sc : 0) - (pl.t / CROPS[pl.crop].grow) * 60 * L.sc
      - (pl.crop === favOf(g) ? 150 * L.sc : 0);   // 好物の畑を狙いやすい（好物さがしのヒント）
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
  if (g.chal) finishChallenge(g);   // チャレンジのゴールは、ふだんの帰宅ごほうびの代わりに結果を出す
  else switch (g.returnMode) {
    case 'hand': {
      let gain = RETURN_OXY.hand;
      const tags = [];
      const sp = SPEED_BONUS.find(b => g.outT < b.t);
      if (sp) { gain += sp.b; tags.push(`${sp.label}+${sp.b}`); }
      if (persona(g).bonus) { gain += persona(g).bonus; tags.push(`${persona(g).icon}${persona(g).label}+${persona(g).bonus}`); }
      const wb = weatherOf().bonus;
      if (wb) { gain += wb; tags.push(`${weatherOf().icon}+${wb}`); }
      herdCombo = clock - lastHerdT < COMBO_WIN ? herdCombo + 1 : 1;
      lastHerdT = clock;
      if (herdCombo >= 2) { const b = COMBO_OXY * (herdCombo - 1); gain += b; tags.push(`🎉${herdCombo}匹連続+${b}`); SFX.level(); }
      addOxy(gain, hx, hy);
      buzz([25, 40, 35]);
      if (tags.length) floatText(g.x, hy - 22 * s, tags.join(' '), '#ff7a00', 13 * s);
      say(g, '💖', 2); hearts(g.x, g.y - 30 * s, 7); sparkles(g.x, g.y - 30 * s, 6 + tags.length * 4);
      toast(`${g.name}がおうちに帰った！💖 +${gain}${tags.length ? '（' + tags.join(' ') + '）' : ''}`, 'good');
      questEvent({ type: 'herd', ci: g.ci, fast: sp === SPEED_BONUS[0], combo: herdCombo }, g.x, hy - 44 * s);
      addBond(g, BOND_GAIN.hand);
      break;
    }
    case 'food': addOxy(RETURN_OXY.food, hx, hy); addBond(g, BOND_GAIN.home); say(g, '😋', 2); hearts(g.x, g.y - 30 * s, 3); toast(`${g.name}「ごちそうさま〜」`, 'good'); break;
    case 'bell': addOxy(RETURN_OXY.bell, hx, hy); addBond(g, BOND_GAIN.home); say(g, '🎵', 2); toast(`${g.name}が鈴の音で帰ってきた🔔`, 'good'); break;
    case 'self': addOxy(RETURN_OXY.self, hx, hy); addBond(g, BOND_GAIN.home); say(g, '😌', 2); toast(`${g.name}は満足して自分で帰ってきた（追い込めば💖+${RETURN_OXY.hand}だったのに…）`); break;
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
      // ときどき好物を思い浮かべる（好物さがしのヒント）
      if (!g.bubble && Math.random() < dt * 0.02) say(g, CROPS[favOf(g)].emoji, 1.4);
      g.escapeT -= dt * (1 + CONTAGION * outsideN) * (gateLeftOpen() ? GATE_OPEN_ESC : 1) * (lonely ? 1.6 : 1) * envEsc() * (chal ? 0 : 1);   // チャレンジ中はほかの子は脱走しない
      if (isNight() && !g.bubble && Math.random() < dt * 0.08) say(g, '💤', 1.6);
      // 開けっぱなしのゲートが気になってチラチラ見る
      if (gateLeftOpen() && !g.bubble && Math.random() < dt * 0.25) { say(g, '👀', 1.2); g.dir = Math.sign(L.gate.x - g.x) || g.dir; }
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
        SFX.escape(); buzz(jumped ? 40 : 25);
        toast(jumped ? `🐐 ${g.name}が柵をピョーンと飛び越えた！畑があぶない！` : `🐐 ${g.name}が開いてたゲートから脱走した！`, 'warn');
        if (!S.seen.herd) { S.seen.herd = true; setTimeout(() => toast('ゲートをタップして開けてから、ヤギの近くをタップして追い込もう！戻したらゲートを閉めてね', 'good'), 900); }
      }
      break;
    }
    case 'roam': {
      // チャレンジ中の子は作物を食べず、自分からも帰らない。ゆっくりうろうろするだけ
      if (g.chal) {
        if (!g.target) g.target = randomFieldPoint();
        if (steer(g, g.target.x, g.target.y, 22 * s * pv(g, 'walk'), dt) < 2) g.target = null;
        break;
      }
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
      // チャレンジで旗が残っている間はゲートに吸い寄せない（押し方だけが勝負）
      const home = g.state === 'scared' ? 3.6 : g.chal && !chalFlagsDone() ? 0 : 0.12 + lvl * 0.05;
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
  // チャレンジ中の子は、旗を全部通るまでゲートから入れない
  const early = g.chal && !chalFlagsDone();
  if (herdable && S.gateOpen && !early && dist(g.x, g.y, L.gateOut.x, L.gateOut.y) < 48 * L.sc) { startEnter(g); return; }
  const x0 = f.x - pad, x1 = f.x + f.w + pad, y0 = f.y - pad, y1 = f.y + f.h + pad;
  if (g.x > x0 && g.x < x1 && g.y > y0 && g.y < y1) {
    if (herdable && dist(g.x, g.y, L.gate.x, L.gate.y) < L.gateW * 1.0) {
      if (early) chalEarlyHint();
      else if (S.gateOpen) { startEnter(g); return; }
      else gateClosedHint();
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
  gateIdleT = 0; gateWarned = false;
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
      if (pl.crop === 'grass') S.grassItem++;
      else S.snacks[pl.crop] = (S.snacks[pl.crop] || 0) + 1;
      floatText(p.x, p.y - p.s * 0.7, `+1${cr.emoji}`, '#4caf50', 12 * L.sc);
      questEvent({ type: 'harvest', crop: pl.crop }, p.x, p.y - p.s * 0.9);
      parts.push({ type: 'harvest', text: cr.emoji, x: p.x, y: p.y - p.s * 0.2, vx: 0, vy: -120 * L.sc, g: 0, t: 0, life: 0.8, size: p.s * 0.5, rot: 0, vr: 0 });
      sparkles(p.x, p.y - p.s * 0.2, 5);
      plotFx[i].sqv = -5;
      pl.crop = null; pl.t = 0;
      SFX.harvest(); buzz(12);
      goats.forEach(g => { if (g.eatPlot === i) { g.eatPlot = -1; if (g.state === 'eating') { setState(g, 'roam'); say(g, '😢', 1.2); } } });
    } else if (!fromDrag) {
      floatText(p.x, p.y - p.s * 0.45, `あと${realSec((cr.grow - pl.t) / growRate())}秒`, '#8b7466', 12 * L.sc);
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
  questEvent({ type: 'pet', ci: g.ci }, g.x, g.y - 100 * s);
  addBond(g, BOND_GAIN.pet);
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
  let hit = 0, used = false;   // used: 木の棒がどれかのヤギに届いた（届かなければ消費しない）
  goats.forEach(g => {
    const d = dist(g.x, g.y - 14 * s, x, y);
    if (d > R) return;
    if (stick && (isOutside(g) || g.state === 'inside' || g.state === 'toGate')) used = true;
    if (isOutside(g)) {
      startFlee(g, x, y, stick); hit += stick ? pv(g, 'stick') : 1;
      if (g.chal) chal.pushes++;
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
  if (stick && hit) { addOxy(-3 * hit, x, y - 30 * L.sc); buzz(60); }
  if (stick && hit && !S.seen.stick) { S.seen.stick = true; toast('木の棒は効果バツグン…でもヤギが拗ねちゃう💢', 'warn'); }
  if (used) useItem('stick');
}

function startFlee(g, x, y, stick) {
  const s = L.sc * 1.1, lvl = trustLevel();
  let ax = g.x - x, ay = g.y - y; const ad = Math.hypot(ax, ay) || 1; ax /= ad; ay /= ad;
  const gx = L.gateOut.x - g.x, gy = L.gateOut.y - g.y, gd = Math.hypot(gx, gy) || 1;
  const b = stick ? 0.7 : g.chal && !chalFlagsDone() ? 0 : clamp(0.04 + lvl * 0.025, 0, 0.3);
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
    if (S.food <= 0) { toast(`🥣 美味しい餌がない…（ショップで🌱${ITEM_COST.food}）`, 'warn'); SFX.nope(); return; }
    S.food--;
    setState(g, 'lured'); g.returnMode = 'food'; g.eatPlot = -1; g.fxT = 0;
    addOxy(FOOD_LURE_OXY, g.x, g.y - 62 * s);
    hearts(g.x, g.y - 36 * s, 4); say(g, '😍', 1.6); g.mood = 'happy'; g.moodT = 3; g.sqv -= 3;
    SFX.heart();
  } else if (g.state === 'inside' || g.state === 'toGate') {
    if (g.feedCD > 0) { say(g, '😋', 1); toast(`${g.name}はおなかいっぱい（あと${realSec(g.feedCD)}秒）`); return; }
    const k = S.snack;
    if (snackCount(k) <= 0) { toast(`${snackEmoji(k)}${snackName(k)}がない…（${k === 'food' ? 'ショップで買えるよ' : '畑で収穫するとたまるよ'}）`, 'warn'); SFX.nope(); return; }
    takeSnack(k);
    const fav = k === favOf(g);
    const gain = (k === 'food' ? 5 : 3) + (fav ? FAV_OXY : 0);
    emojiPart(snackEmoji(k), g.x + g.dir * 20 * s, g.y - 28 * s, 20 * s, -20);
    addOxy(gain, g.x, g.y - 62 * s);
    questEvent({ type: 'feed', ci: g.ci }, g.x, g.y - 100 * s);
    if (fav) {
      floatText(g.x, g.y - 84 * s, '大好物！', '#ff5c9a', 13 * s); hearts(g.x, g.y - 36 * s, 4);
      if (!S.favFound[g.ci]) { S.favFound[g.ci] = true; toast(`💡 ${g.name}の好物は${snackEmoji(k)}${snackName(k)}だった！`, 'good'); }
    }
    addBond(g, fav ? BOND_GAIN.fav : BOND_GAIN.feed);
    g.feedCD = 12; g.munchT = 1.6; g.sqv -= 3;
    hearts(g.x, g.y - 36 * s, 3); say(g, fav ? '😍' : '😋', 1.6); g.mood = 'happy'; g.moodT = 2;
    if (g.sulk > 0) g.sulk = Math.max(0, g.sulk - 30);
    if (g.state === 'toGate') { setState(g, 'inside'); g.target = null; g.idle = 1.6; g.escapeT = nextEscape(g); }
    SFX.heart();
  }
}

function ringBell(x, y) {
  if (S.bellN <= 0) return;
  // みんな柵の中にいるときは鳴らさない（高いので、むだに使わせない）
  if (!goats.some(isOutside)) { toast('🔔 みんな柵の中にいるよ（鈴はとっておいたよ）'); SFX.nope(); return; }
  useItem('bell');
  ripple(x, y, 220 * L.sc, '#ffe066'); ripple(x, y, 140 * L.sc, '#ffffff');
  parts.push({ type: 'emoji', text: '🔔', x, y: y - 20 * L.sc, vx: 0, vy: -30 * L.sc, g: 0, t: 0, life: 1.2, size: 36 * L.sc, rot: 0, vr: 0, swing: true });
  for (let i = 0; i < 5; i++) emojiPart(pick(['🎵', '🎶']), x + rand(-40, 40) * L.sc, y + rand(-30, 10) * L.sc, 16 * L.sc, -60);
  SFX.bell();
  let n = 0;
  goats.forEach(g => {
    if (isOutside(g)) { if (!(g.state === 'lured' && g.returnMode === 'food')) { setState(g, 'lured'); g.returnMode = 'bell'; g.eatPlot = -1; } say(g, '🎵', 1.5); n++; }
    else say(g, '🎵', 1);
  });
  toast(`🔔 チリリン♪ ${n}匹が帰りはじめた`);
}

// 消耗品の残り数。使いきったら、その道具からおまかせに戻す
const ITEM_KEY = { stick: 'stickN', food: 'food', bell: 'bellN', fert: 'fertN' };
const ITEM_NAME = { stick: '木の棒', food: '美味しい餌', bell: '鈴', fert: 'ふかふか肥料' };
const itemCount = k => S[ITEM_KEY[k]];
function useItem(k) {
  S[ITEM_KEY[k]] = Math.max(0, S[ITEM_KEY[k]] - 1);
  if (S[ITEM_KEY[k]] === 0 && S.tool === k) { S.tool = 'auto'; toast(`${ITEM_NAME[k]}を使いきった（ショップで買えるよ）`); }
}
// ふかふか肥料：使うと FERT_T 秒間、畑すべてが FERT_MUL 倍速で育つ（使っている間に使うと時間がのびる）
function useFert() {
  if (S.fertN <= 0) { toast(`🧪 ふかふか肥料がない…（ショップで🌱${ITEM_COST.fert}）`); openShop(); return; }
  useItem('fert');
  S.fertT += FERT_T;
  SFX.level(); buzz([20, 30, 20]);
  for (let i = 0; i < S.plotCount; i++) { const p = L.plots[i]; plotFx[i].sqv = 4; sparkles(p.x, p.y - p.s * 0.2, 3); }
  toast(`🧪 畑がふかふかに！${FERT_T}秒間 成長${FERT_MUL}倍`, 'good');
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
      case 'firefly': {
        const a = Math.min(1, k * 4, (1 - k) * 3) * (0.55 + Math.sin(p.t * 6 + p.ph) * 0.45);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gr.addColorStop(0, `rgba(255,250,170,${a})`); gr.addColorStop(1, 'rgba(255,250,170,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, TAU); ctx.fill();
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
  // 首輪 + 鈴（スカーフをもらった子は、よだれかけの上にスカーフ）
  const scarf = S.deco['scarf' + g.ci];
  if (!scarf) {
    ctx.strokeStyle = c.collar; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(11, -32); ctx.quadraticCurveTo(16, -26, 14, -21); ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(15, -21, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // くいしんぼう：よだれかけ
  if (look === 2) {
    ctx.fillStyle = '#fff3b0'; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(8, -23); ctx.quadraticCurveTo(8, -9, 17, -10); ctx.quadraticCurveTo(22, -16, 19, -23); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.arc(14.5, -15, 2, 0, TAU); ctx.fill();
  }
  if (scarf) {
    ctx.fillStyle = SCARF_COLORS[g.ci % SCARF_COLORS.length]; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
    // 頭に隠れないよう、首の付け根に巻いて胸元へ三角を垂らす
    ctx.beginPath(); ctx.moveTo(10, -19); ctx.lineTo(21, -18); ctx.lineTo(14.5, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -27); ctx.quadraticCurveTo(14, -20, 23, -24); ctx.lineTo(23.5, -18.5); ctx.quadraticCurveTo(14, -14, 5.5, -21.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    [[13, -14], [17, -15], [14.6, -10.5], [10, -21], [18, -19.5]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, TAU); ctx.fill(); });
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
// 昼夜・天気
// ---------------------------------------------------------
const PHASES = [   // [始まり(1日の割合), 名前, アイコン, 切り替わりのお知らせ]
  [0,    'morning', '🌅', '🌅 朝だよ！ヤギたちが起きてきた'],
  [0.1,  'day',     '☀️', ''],
  [0.6,  'evening', '🌇', '🌇 夕方。そろそろ日が暮れるよ'],
  [0.72, 'night',   '🌙', '🌙 夜になった。ヤギたちはおねむ…脱走しにくいよ'],
];
function phaseAt(k = S.dayT / DAY_LEN) { let p = PHASES[0]; for (const q of PHASES) if (k >= q[0]) p = q; return p; }
const isNight = () => phaseAt()[1] === 'night';
const weatherOf = () => WEATHER[S.weather.k];
// 作物の育つ速さ（肥料×天気）と、柵の中の子の脱走タイマーの進む速さ（夜×天気）
const growRate = () => (S.fertT > 0 ? FERT_MUL : 1) * (weatherOf().grow ?? 1);
const envEsc = () => (isNight() ? NIGHT_ESC : 1) * (weatherOf().esc ?? 1);

// 空の色：1日の割合 k ごとの重ね色 [k, r, g, b, a]。夜は青く暗く、朝と夕方は暖色
const SKY = [[0, 30, 40, 100, 0.34], [0.05, 255, 190, 140, 0.12], [0.12, 255, 255, 255, 0], [0.58, 255, 255, 255, 0],
  [0.65, 255, 140, 70, 0.16], [0.74, 30, 40, 100, 0.4], [0.97, 30, 40, 100, 0.4], [1, 30, 40, 100, 0.34]];
function skyTint(k) {
  let i = 0; while (i < SKY.length - 2 && k >= SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1], u = clamp((k - a[0]) / (b[0] - a[0]), 0, 1);
  return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * u);
}

let lastPhase = null;
function updateEnv(dt) {
  S.dayT = (S.dayT + dt) % DAY_LEN;
  const ph = phaseAt();
  if (lastPhase && ph[1] !== lastPhase && ph[3]) toast(ph[3], ph[1] === 'night' ? '' : 'good');
  lastPhase = ph[1];
  // 天気：はれの間は次のイベントまで待ち、イベント中は残り時間を減らす
  const w = S.weather;
  if (w.k === 'clear') {
    w.wait -= dt;
    if (w.wait <= 0) setWeather(Math.random() < 0.55 ? 'rain' : 'wind');
  } else {
    w.t -= dt;
    if (w.t <= 0) {
      if (w.k === 'rain' && Math.random() < RAINBOW_CHANCE) setWeather('rainbow');
      else { setWeather('clear'); toast('☀️ いいお天気にもどった', 'good'); }
    }
  }
  // 夜はホタル、風の日は葉っぱが舞う
  if (isNight() && Math.random() < dt * 1.2) parts.push({ type: 'firefly', x: rand(0, L.w), y: rand(L.top + 20, L.bottom - 20), vx: rand(-12, 12) * L.sc, vy: rand(-10, 4) * L.sc, g: 0, t: 0, life: rand(3, 5), size: rand(2.2, 3.4) * L.sc, ph: rand(0, TAU) });
  if (w.k === 'wind' && Math.random() < dt * 2.5) parts.push({ type: 'emoji', text: '🍃', x: -20, y: rand(L.top + 20, L.bottom - 40), vx: rand(160, 260) * L.sc, vy: rand(-20, 30) * L.sc, g: 0, t: 0, life: 4, size: rand(14, 20) * L.sc, rot: rand(0, TAU), vr: rand(2, 5) });
}
function setWeather(k) {
  const d = WEATHER[k];
  S.weather = { k, t: d.dur ? rand(d.dur[0], d.dur[1]) : 0, wait: k === 'clear' ? rand(WEATHER_GAP[0], WEATHER_GAP[1]) : 0 };
  if (d.msg) toast(d.msg, k === 'wind' ? 'warn' : 'good');
}

// 虹：世界の奥（畑やヤギより先）に描く
function drawRainbow() {
  if (S.weather.k !== 'rainbow') return;
  const t = S.weather.t, fade = clamp(Math.min(t, WEATHER.rainbow.dur[0] - t) / 3, 0, 1);
  // 弧のてっぺんがプレイエリアの上から2割あたりに来るように
  const cx = L.w * 0.5, cy = L.bottom + L.h * 0.15, r = cy - (L.top + (L.bottom - L.top) * 0.2), bw = 9 * L.sc;
  ctx.save(); ctx.globalAlpha = 0.28 * fade;
  ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'].forEach((c, i) => {
    ctx.strokeStyle = c; ctx.lineWidth = bw; ctx.beginPath(); ctx.arc(cx, cy, r - i * bw, Math.PI, TAU); ctx.stroke();
  });
  ctx.restore();
}
// 空の色＋雨＋夜の小屋の明かり（世界の上、吹き出しや文字の下）
function drawSky(time) {
  const [r, g, b, a] = skyTint(S.dayT / DAY_LEN);
  if (a > 0.005) { ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`; ctx.fillRect(0, 0, L.w, L.h); }
  if (isNight()) {
    const h = L.hut, x = h.x + h.s / 2, y = h.y + h.s * 0.82;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, h.s * 0.6);
    gr.addColorStop(0, `rgba(255,220,120,${0.55 + Math.sin(time * 3) * 0.05})`); gr.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, h.s * 0.6, 0, TAU); ctx.fill();
  }
  if (S.weather.k === 'rain') {
    ctx.fillStyle = 'rgba(70,90,120,.12)'; ctx.fillRect(0, 0, L.w, L.h);
    ctx.save(); ctx.strokeStyle = 'rgba(80,115,170,.45)'; ctx.lineWidth = 2.2 * L.sc; ctx.lineCap = 'round';   // 明るい芝の上でも見える濃さ
    const n = Math.round(L.w * L.h / 5000), len = 14 * L.sc, H = L.h + len;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {   // 決まった並びを時間でずらして降らせる（毎フレーム乱数を引かない）
      const x = (i * 0.6180339 % 1) * (L.w + 40) - (time * 60) % 40;
      const y = ((i * 0.7548776 % 1) * H + time * 520 * L.sc) % H - len;
      ctx.moveTo(x, y); ctx.lineTo(x - 3 * L.sc, y + len);
    }
    ctx.stroke(); ctx.restore();
  }
}
// 小屋の横に、いまの時間帯と天気のアイコン
function drawEnvBadge(time) {
  const h = L.hut, sc = Math.max(L.sc, 0.75), w = weatherOf();   // スマホでも読める大きさに
  const x = h.x + h.s + 22 * sc, y = h.y + h.s * 0.2 + Math.sin(time * 2) * 1.5 * sc;
  const n = w.icon ? 2 : 1, bw = (n * 22 + 8) * sc, bh = 26 * sc;
  ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(ctx, x - 15 * sc, y - bh / 2, bw, bh, bh / 2); ctx.fill();
  emoji(phaseAt()[2], x, y, 18 * sc);
  if (w.icon) emoji(w.icon, x + 22 * sc, y, 17 * sc);
}

// ---------------------------------------------------------
// 追い込みチャレンジ
// ---------------------------------------------------------
let chal = null;   // 挑戦中：{ c: コース, g: ヤギ, i: 次の旗, t: 経過秒, pushes: 押した回数 }。保存しない
let lastChalHintT = -99;
// コース座標 [u, v] → 画面座標（縦画面はゲートが上・畑が下、横画面はゲートが左・畑が右）
function coursePt([u, v]) { const f = L.field; return L.portrait ? { x: f.x + v * f.w, y: f.y + u * f.h } : { x: f.x + u * f.w, y: f.y + v * f.h }; }
const chalFlagsDone = () => !!chal && chal.i >= chal.c.flags.length;
const chalScore = (t, pushes) => +(t + pushes).toFixed(1);
const rankOf = (c, score) => score < c.rank[0] ? 3 : score < c.rank[1] ? 2 : 1;
const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const courseOpen = i => i === 0 || !!(S.chal[COURSES[i - 1].id] && S.chal[COURSES[i - 1].id].rank > 0);
// みんなが柵の中にいるときだけ挑戦できる
const canStartChallenge = () => !chal && goats.every(g => g.state === 'inside' || g.state === 'toGate');
function chalEarlyHint() {
  if (clock - lastChalHintT < 4) return;
  lastChalHintT = clock;
  toast(`🚩 先に旗を全部通ろう！（あと${chal.c.flags.length - chal.i}本）`);
}

function startChallenge(id, ci) {
  const c = COURSES.find(x => x.id === id), g = goats.find(x => x.ci === ci);
  if (!c || !g || !canStartChallenge()) return;
  closeModal('questModal');
  goats.forEach(o => { if (o.state === 'toGate') { setState(o, 'inside'); o.target = null; } });
  const p = coursePt(c.start);
  g.x = p.x; g.y = p.y; g.vx = g.vy = 0; g.exit = null; g.eatPlot = -1; g.target = null; g.outT = 0; g.returnMode = null;
  g.chal = true; setState(g, 'pause');
  dustPuff(g.x, g.y, 6); say(g, '🏁', 1.6); g.sqv -= 5;
  S.tool = 'auto';
  if (!S.gateOpen) toggleGate();   // ゲートは開けておく（旗を通るまでは入れない）
  chal = { c, g, i: 0, t: 0, pushes: 0 };
  lastSub = ''; updateUI();
  SFX.level();
  toast(`🏁 ${c.name} スタート！🚩を順番に通してゲートへ（手だけで）`, 'good');
}
function updateChallenge(dt) {
  if (!chal) return;
  const { c, g } = chal;
  chal.t += dt;
  if (!chalFlagsDone()) {
    const p = coursePt(c.flags[chal.i]);
    if (dist(g.x, g.y, p.x, p.y) < CHAL_R * L.sc) {
      chal.i++;
      SFX.harvest(); buzz(20); sparkles(p.x, p.y - 30 * L.sc, 6);
      floatText(p.x, p.y - 52 * L.sc, `🚩${chal.i}/${c.flags.length}`, '#ff5c8a', 14 * L.sc);
      if (chalFlagsDone()) toast('🚩 旗を全部通った！ゲートへ追い込もう', 'good');
    }
  }
  if (chal.t >= CHAL_LIMIT) cancelChallenge('⏱ 時間切れ…また挑戦してね（なにもなくならないよ）');
}
function finishChallenge(g) {
  const { c, t, pushes } = chal, s = L.sc * 1.1;
  const score = chalScore(t, pushes), rank = rankOf(c, score);
  const rec = S.chal[c.id] || { rank: 0, best: null };
  const gain = Math.max(0, rank - rec.rank), best = rec.best === null || score < rec.best;
  S.chal[c.id] = { rank: Math.max(rank, rec.rank), best: best ? score : rec.best };
  S.stars += gain;
  addOxy(CHAL_OXY, g.x, g.y - 50 * s);
  addBond(g, BOND_GAIN.hand);
  g.chal = false; chal = null; lastSub = ''; updateUI();
  hearts(g.x, g.y - 30 * s, 8); sparkles(g.x, g.y - 30 * s, 12);
  SFX.level(); buzz([30, 60, 30, 60, 60]);
  toast(`🏁 ゴール！${c.name} ${t.toFixed(1)}秒＋${pushes}回＝${score} → ${starsText(rank)}${gain ? `（⭐+${gain}）` : ''}${best && rec.best !== null ? ' 自己ベスト更新！' : ''}`, 'good');
}
function cancelChallenge(msg) {
  if (!chal) return;
  const g = chal.g;
  g.chal = false; chal = null; lastSub = ''; updateUI();
  // その子は柵の中に戻るだけ（ごほうびも罰もなし）
  g.x = L.gateIn.x; g.y = L.gateIn.y; g.vx = g.vy = 0; g.returnMode = null; g.eatPlot = -1;
  setState(g, 'inside'); g.target = randomInside(); g.escapeT = nextEscape(g);
  dustPuff(g.x, g.y, 4);
  toast(msg);
}

// コースの旗（地面に描く。ヤギは手前に重なる）
function drawCourse(time) {
  if (!chal) return;
  const sc = L.sc;
  chal.c.flags.forEach((f, i) => {
    const p = coursePt(f), done = i < chal.i, next = i === chal.i;
    ctx.save();
    if (next) {
      ctx.strokeStyle = `rgba(255,92,138,${0.55 + Math.sin(time * 6) * 0.3})`; ctx.lineWidth = 3 * sc; ctx.setLineDash([6 * sc, 5 * sc]);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, CHAL_R * sc, CHAL_R * sc * 0.45, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(60,90,40,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2 * sc, 7 * sc, 3 * sc, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 3 * sc; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 42 * sc); ctx.stroke();
    const wave = next ? Math.sin(time * 8) * 2 * sc : 0;
    ctx.fillStyle = done ? '#cfc6be' : next ? '#ff5c8a' : '#ffb3c8'; ctx.lineWidth = 1.5 * sc;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 42 * sc); ctx.lineTo(p.x + 24 * sc, p.y - 34 * sc + wave); ctx.lineTo(p.x, p.y - 26 * sc); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * sc}px ${TEXT_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(done ? '✓' : String(i + 1), p.x + 8 * sc, p.y - 34 * sc + wave * 0.5);
    ctx.restore();
  });
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
  updateEnv(dt);
  updateChallenge(dt);
  const growMul = growRate();
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
  if (S.fertT > 0) {
    S.fertT = Math.max(0, S.fertT - dt);
    if (S.fertT === 0) toast('🧪 ふかふか肥料の効果がおわった');
    else if (Math.random() < dt * 2) { const i = Math.floor(Math.random() * S.plotCount), p = L.plots[i]; if (S.plots[i].crop) sparkles(p.x + rand(-0.3, 0.3) * p.s, p.y - p.s * 0.2, 1); }
  }
  gateK += ((S.gateOpen ? 1 : 0) - gateK) * Math.min(1, rdt * 10);
  // 開けっぱなし判定：追い込み中（外に誰かいる・帰宅中）はゲートが要るので数えない
  const needGate = goats.some(g => isOutside(g) || g.state === 'entering');
  gateIdleT = S.gateOpen && !needGate ? gateIdleT + dt : 0;
  if (gateLeftOpen() && !gateWarned) { gateWarned = true; toast('🚪 ゲートが開けっぱなし！中の子が出ていっちゃうよ', 'warn'); }
}

function render(time, rdt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(bgCanvas, 0, 0, L.w, L.h);
  drawRainbow();
  drawGateDoor(time);
  drawGateHint(time);
  for (let i = 0; i < MAX_PLOTS; i++) drawPlotBase(i, time);
  drawCourse(time);
  const eaten = {};
  goats.forEach(g => { if (g.state === 'eating') eaten[g.eatPlot] = g; });
  const list = [];
  for (let i = 0; i < S.plotCount; i++) if (S.plots[i].crop) list.push({ y: L.plots[i].y + L.plots[i].s * 0.14, f: () => drawCrop(i, time, eaten[i]) });
  goats.forEach(g => list.push({ y: g.y, f: () => drawGoat(g, time) }));
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  drawSky(time);
  drawEnvBadge(time);
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
  const above = costs.filter(c => c > S.sero);
  return above.length ? Math.min(...above) : (costs.length ? Math.min(...costs) : 500);
}

let lastSub = '';
function updateUI() {
  $('seroVal').textContent = Math.floor(S.sero);
  $('oxyVal').textContent = Math.floor(S.oxy);
  const lvl = trustLevel();
  const tl = `<span class="gname">信頼</span>Lv.${lvl}`;   // 狭い画面では「信頼」を省く
  if ($('trustLv').innerHTML !== tl) $('trustLv').innerHTML = tl;
  $('seroBar').style.width = Math.min(100, S.sero / nextSeroGoal() * 100) + '%';
  $('oxyBar').style.width = (lvl >= 10 ? 100 : (S.trustXP - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100) + '%';
  document.querySelectorAll('.tool[data-tool]').forEach(b => {
    const t = b.dataset.tool;
    b.classList.toggle('active', t === S.tool);
    b.classList.toggle('locked', (t === 'stick' || t === 'bell') && itemCount(t) <= 0);
  });
  $('foodBadge').textContent = S.food;
  $('stickBadge').textContent = S.stickN; $('bellBadge').textContent = S.bellN;
  const qa = S.quest && S.quest.active, qb = $('questBadge'), ready = deliverReady(qa);
  qb.textContent = ready ? '📦' : qa ? `${qa.prog}/${qa.n}` : '!';
  qb.classList.toggle('idle', !qa || ready);   // 受けていない／届けられる ときは跳ねて知らせる
  const sb = $('speedBtn');
  const spHtml = S.speed === 1 ? '▶ 1x<span class="sp-label"> のんびり</span>' : '⏩ 2x<span class="sp-label"> サクサク</span>';
  if (sb.dataset.h !== spHtml) { sb.dataset.h = spHtml; sb.innerHTML = spHtml; }
  sb.classList.toggle('fast', S.speed === 2);
  $('soundBtn').textContent = S.sound || S.bgm ? '🔊' : '🔇';
  renderSubrow();
  if (!$('shopModal').classList.contains('hidden')) { $('shopSero').textContent = Math.floor(S.sero); $('shopOxy').textContent = Math.floor(S.oxy); $('shopStars').textContent = S.stars; }
}

function renderSubrow() {
  // チャレンジ中：枠は一度だけ作り、数字だけ書きかえる（やめるボタンを毎回作り直さない）
  if (chal) {
    if (lastSub !== 'chal') {
      lastSub = 'chal';
      $('subrow').innerHTML = '<div class="hint chal-bar">🏁 <b id="chalName"></b>　🚩<span id="chalFlag"></span>　⏱<span id="chalTime"></span>秒　✋<span id="chalPush"></span>回 <button class="chal-quit" data-chal="quit">やめる</button></div>';
    }
    $('chalName').textContent = chal.c.name;
    $('chalFlag').textContent = `${chal.i}/${chal.c.flags.length}`;
    $('chalTime').textContent = chal.t.toFixed(1);
    $('chalPush').textContent = chal.pushes;
    return;
  }
  let html;
  if (S.tool === 'auto') {
    html = '<span class="seedlabel">植える種</span>' + CROP_ORDER.filter(k => S.unlockedCrops[k]).map(k =>
      `<button class="seedbtn ${S.seed === k ? 'active' : ''}" data-seed="${k}"><span class="se">${CROPS[k].emoji}</span><small>${CROPS[k].seed}🌱</small></button>`).join('')
      // 肥料：持っているか効いている間だけ出す（効いている間は残り秒）
      + (S.fertN > 0 || S.fertT > 0 ? `<button class="seedbtn fert ${S.fertT > 0 ? 'active' : ''}" data-fert="1"><span class="se">🧪</span><small>${S.fertT > 0 ? `${realSec(S.fertT)}秒` : `×${S.fertN}`}</small></button>` : '');
  } else if (S.tool === 'food') {
    // 柵の中の子にあげるおやつを選ぶ（脱走ヤギには🥣餌）
    html = '<span class="seedlabel">おやつ</span>' + snackKinds().map(k =>
      `<button class="seedbtn ${S.snack === k ? 'active' : ''}" data-snack="${k}"><span class="se">${snackEmoji(k)}</span><small>×${snackCount(k)}</small></button>`).join('');
  } else {
    const hints = {
      stick: `近くで使うと❗ビックリして2倍速で柵へ！でもムスッ💢として💖が減る（残り${S.stickN}本）`,
      bell: `どこかをタップで鈴を鳴らす → 脱走中のヤギ全員がおうちへ（残り${S.bellN}回）`,
    };
    html = `<div class="hint">${hints[S.tool]}</div>`;
  }
  if (html !== lastSub) { lastSub = html; $('subrow').innerHTML = html; }
}

function setTool(t) {
  if (chal && t !== 'auto') { toast('🏁 チャレンジ中は手（おまかせ）だけで！'); SFX.nope(); return; }
  if ((t === 'stick' || t === 'bell') && itemCount(t) <= 0) { toast(`${ITEM_NAME[t]}を持っていないよ。ショップで🌱${ITEM_COST[t]}`); openShop(); return; }
  S.tool = t; SFX.pop(); updateUI();
}

// ---------------------------------------------------------
// 依頼掲示板
// ---------------------------------------------------------
// make: 内容を決める（n=必要回数, stars=ごほうび）  on: そのできごとで1つ進むか  need: 出せる条件
const goatName = ci => GOAT_NAMES[ci % GOAT_NAMES.length];
const QUESTS = {
  harvest:  { icon: q => CROPS[q.crop].emoji, make: q => { q.crop = pick(CROP_ORDER.filter(k => S.unlockedCrops[k])); q.n = HARVEST_N[q.crop]; q.stars = q.crop === 'grass' || q.crop === 'flower' ? 1 : 2; },
              text: q => `${CROPS[q.crop].name}を${q.n}回収穫する`, on: (q, e) => e.type === 'harvest' && e.crop === q.crop },
  pet:      { icon: () => '🥰', make: q => { q.ci = pick(goats).ci; q.n = 3; q.stars = 1; },
              text: q => `${goatName(q.ci)}を${q.n}回なでる`, on: (q, e) => e.type === 'pet' && e.ci === q.ci },
  feed:     { icon: () => '🌿', make: q => { q.ci = pick(goats).ci; q.n = 2; q.stars = 1; },
              text: q => `柵の中の${goatName(q.ci)}におやつを${q.n}回あげる`, on: (q, e) => e.type === 'feed' && e.ci === q.ci },
  herd:     { icon: () => '✋', make: q => { q.n = 2; q.stars = 2; },
              text: q => `脱走した子を手で${q.n}回追い込んで戻す`, on: (q, e) => e.type === 'herd' },
  herdGoat: { icon: () => '🐐', make: q => { q.ci = pick(goats).ci; q.n = 1; q.stars = 2; },
              text: q => `脱走した${goatName(q.ci)}を手で追い込んで戻す`, on: (q, e) => e.type === 'herd' && e.ci === q.ci },
  fast:     { icon: () => '⚡', make: q => { q.n = 1; q.stars = 2; },
              text: () => `脱走から${SPEED_BONUS[0].t}秒以内に手で戻す（⚡はやい！）`, on: (q, e) => e.type === 'herd' && e.fast },
  combo:    { icon: () => '🎉', make: q => { q.n = 1; q.stars = 3; }, need: () => goats.length >= 2,
              text: () => '🎉2匹連続で手で戻す', on: (q, e) => e.type === 'herd' && e.combo >= 2 },
  // 納品：たまった作物（おやつと共通の在庫）を掲示板の「届ける」で渡す
  deliver:  { icon: () => '📦', make: q => { q.crop = pick(CROP_ORDER.filter(k => S.unlockedCrops[k])); Object.assign(q, DELIVER[q.crop]); delete q.why; },
              text: q => `${DELIVER[q.crop].why}に${CROPS[q.crop].emoji}${CROPS[q.crop].name}を${q.n}つ届ける`, on: () => false },
};
function completeQuest(q) {
  S.stars += q.stars; S.questsDone++;
  S.quest.active = null;
  SFX.level(); buzz([30, 60, 30, 60, 60]);
  toast(`📋 依頼達成！⭐+${q.stars}（${QUESTS[q.k].text(q)}）`, 'good');
  if (!S.seen.star) { S.seen.star = true; setTimeout(() => toast('⭐はショップの🎀飾り付けで使えるよ', 'good'), 1200); }
}
// 届けられるだけ届ける（足りなければ途中まで）
function deliverQuest() {
  const q = S.quest.active;
  if (!q || q.k !== 'deliver') return;
  const give = Math.min(snackCount(q.crop), q.n - q.prog);
  if (give <= 0) { toast(`${CROPS[q.crop].emoji}${CROPS[q.crop].name}がまだないよ。畑で収穫しよう`, 'warn'); SFX.nope(); return; }
  for (let i = 0; i < give; i++) takeSnack(q.crop);
  q.prog += give;
  SFX.harvest();
  if (q.prog >= q.n) completeQuest(q);
  else toast(`📦 ${CROPS[q.crop].emoji}を${give}つ届けた（${q.prog}/${q.n}）`, 'good');
}
function returnDelivered(q) {
  if (q.crop === 'grass') S.grassItem += q.prog; else S.snacks[q.crop] = (S.snacks[q.crop] || 0) + q.prog;
  toast(`📦 届けた${CROPS[q.crop].emoji}×${q.prog}は手元にもどしたよ`);
}
const deliverReady = q => q && q.k === 'deliver' && snackCount(q.crop) >= q.n - q.prog;
// 系統：掲示板に同じ系統が並ばないようにする（3枚が追い込みばかり、を防ぐ）
const QUEST_FAMILY = { harvest: 'farm', deliver: 'deliver', pet: 'care', feed: 'care', herd: 'herd', herdGoat: 'herd', fast: 'herd', combo: 'herd' };
function makeQuest(avoid) {
  const ok = Object.keys(QUESTS).filter(k => !QUESTS[k].need || QUESTS[k].need());
  const fams = avoid.map(k => QUEST_FAMILY[k]);
  let pool = ok.filter(k => !fams.includes(QUEST_FAMILY[k]));
  if (!pool.length) pool = ok.filter(k => !avoid.includes(k));
  if (!pool.length) pool = ok;
  // 系統を先に選ぶ（種類の多い追い込み系ばかり出ないように）
  const fam = pick([...new Set(pool.map(k => QUEST_FAMILY[k]))]);
  const q = { k: pick(pool.filter(k => QUEST_FAMILY[k] === fam)) };
  QUESTS[q.k].make(q);
  return q;
}
const questKindsInUse = () => [...S.quest.offers, S.quest.active].filter(Boolean).map(q => q.k);
function validQuest(q) {
  const d = q && QUESTS[q.k];
  return !!d && (!d.need || d.need()) && q.n > 0 && q.stars > 0
    && (q.ci === undefined || goats.some(g => g.ci === q.ci)) && (q.crop === undefined || !!S.unlockedCrops[q.crop]);
}
// 掲示板を3枚にそろえる（壊れたセーブの依頼は捨てる）
function fillQuests() {
  if (!S.quest || !Array.isArray(S.quest.offers)) S.quest = { offers: [], active: null };
  S.quest.offers = S.quest.offers.filter(validQuest).slice(0, QUEST_SLOTS);
  if (S.quest.active && !validQuest(S.quest.active)) S.quest.active = null;
  if (S.quest.active) S.quest.active.prog = Math.max(0, S.quest.active.prog | 0);
  while (S.quest.offers.length < QUEST_SLOTS) S.quest.offers.push(makeQuest(questKindsInUse()));
}
function questEvent(e, x, y) {
  const q = S.quest.active;
  if (!q || !QUESTS[q.k].on(q, e)) return;
  q.prog++;
  floatText(x, y, `📋${Math.min(q.prog, q.n)}/${q.n}`, '#7a5af8', 12 * L.sc);
  if (q.prog >= q.n) completeQuest(q);
}
const haveText = q => q.k === 'deliver' ? `　いま ${CROPS[q.crop].emoji}×${snackCount(q.crop)}` : '';

function renderQuests() {
  const a = S.quest.active;
  let html = '<div class="shop-sec">受けている依頼</div>';
  if (a) {
    html += `<div class="shop-row quest-now"><div class="si">${QUESTS[a.k].icon(a)}</div><div class="sb"><div class="sn">${QUESTS[a.k].text(a)}</div>`
      + `<div class="qbar"><i style="width:${Math.min(100, a.prog / a.n * 100)}%"></i></div><div class="sd">${a.prog}/${a.n}　ごほうび ⭐${a.stars}${haveText(a)}</div></div>`
      + '<div class="qbtns">' + (a.k === 'deliver' ? `<button class="buy star" data-q="deliver" ${snackCount(a.crop) > 0 ? '' : 'disabled'}>📦 届ける</button>` : '')
      + '<button class="buy danger" data-q="quit">やめる</button></div></div>';
  } else html += '<div class="quest-empty">下からひとつ選んで受けよう（期限なし・いつでも替えられるよ）</div>';
  html += '<div class="shop-sec">依頼をえらぶ</div>';
  S.quest.offers.forEach((q, i) => {
    html += `<div class="shop-row"><div class="si">${QUESTS[q.k].icon(q)}</div><div class="sb"><div class="sn">${QUESTS[q.k].text(q)}</div><div class="sd">ごほうび ⭐${q.stars}${haveText(q)}</div></div>`
      + `<button class="buy star" data-q="${i}">${a ? '替える' : '受ける'}</button></div>`;
  });
  html += '<button class="reroll" data-q="reroll">🔄 ほかの依頼を見る</button><div class="quest-note">⭐はショップの🎀飾り付けで、牧場やヤギを飾るのに使えるよ</div>';
  html += renderChallengeSection();
  $('questBody').innerHTML = html;
  $('questStars').textContent = S.stars; $('questDone').textContent = S.questsDone;
}
// 掲示板の下：追い込みチャレンジ（走らせる子を選んでコースに挑戦）
function renderChallengeSection() {
  if (!goats.some(g => g.ci === S.chalGoat)) S.chalGoat = goats[0].ci;
  const ok = canStartChallenge();
  let html = '<div class="shop-sec">🏁 追い込みチャレンジ（腕だめし・失敗してもなにもなくならない）</div>'
    + '<div class="chal-goats"><span class="seedlabel">走る子</span>' + goats.map(g =>
      `<button class="setbtn ${g.ci === S.chalGoat ? 'on' : ''}" data-q="cgoat:${g.ci}">${persona(g).icon} ${g.name}</button>`).join('') + '</div>';
  COURSES.forEach((c, i) => {
    const rec = S.chal[c.id], open = courseOpen(i);
    const recText = rec && rec.rank ? `${starsText(rec.rank)}　ベスト ${rec.best}` : 'まだ記録なし';
    html += `<div class="shop-row"><div class="si">🏁</div><div class="sb"><div class="sn">${c.name}（🚩${c.flags.length}本）</div>`
      + `<div class="sd">${open ? recText : '🔒 前のコースをクリアすると挑戦できる'}　★3は${c.rank[0]}未満</div></div>`
      + `<button class="buy star" data-q="chal:${c.id}" ${open && ok ? '' : 'disabled'}>挑戦</button></div>`;
  });
  html += `<div class="quest-note">${ok ? 'スコア＝タイム（秒）＋押した回数。小さいほど★が増えて、増えたぶん⭐がもらえるよ' : 'みんなが柵の中にいるときに挑戦できるよ'}</div>`;
  return html;
}

function openQuests() { renderQuests(); $('questModal').classList.remove('hidden'); paused = true; }

$('questBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-q]'); if (!b) return;
  const v = b.dataset.q, a = S.quest.active;
  // 進み具合があるときだけ確認する（替える・やめる自体に罰はない。届けた作物は手元に返す）
  const letGo = () => {
    if (!a || a.prog === 0) return true;
    if (a.k === 'deliver') { returnDelivered(a); return true; }
    return confirm(`今の依頼の進み具合（${a.prog}/${a.n}）はなくなるけど、いい？`);
  };
  if (v.startsWith('chal:')) { SFX.pop(); startChallenge(v.slice(5), S.chalGoat); return; }
  if (v.startsWith('cgoat:')) { S.chalGoat = +v.slice(6); SFX.pop(); renderQuests(); return; }
  if (v === 'reroll') { S.quest.offers = []; fillQuests(); }
  else if (v === 'deliver') deliverQuest();
  else if (v === 'quit') { if (!letGo()) return; S.quest.active = null; }
  else {
    const i = +v, q = S.quest.offers[i];
    if (!q || !letGo()) return;
    S.quest.active = { ...q, prog: 0 };
    S.quest.offers[i] = makeQuest(questKindsInUse());
    toast(`📋 依頼を受けた：${QUESTS[q.k].text(q)}`, 'good');
  }
  SFX.pop(); renderQuests(); updateUI(); save();
});

// ---------------------------------------------------------
// ショップ
// ---------------------------------------------------------
const STICK_ICON = $('tools').querySelector('[data-tool="stick"] .ti').innerHTML;
const BENCH_ICON = '<svg viewBox="0 0 32 32" width="28" height="28"><path d="M8 9v19M24 9v19" stroke="#5b4636" stroke-width="3" stroke-linecap="round"/><rect x="5" y="8" width="22" height="6" rx="2" fill="#c58b5a" stroke="#5b4636" stroke-width="1.5"/><rect x="4" y="17" width="24" height="5" rx="2" fill="#d9a06a" stroke="#5b4636" stroke-width="1.5"/></svg>';
const DECOS = [
  { k: 'bed',   icon: '🌷',       name: '花壇',               desc: '柵の中に花壇ができる', cost: 3 },
  { k: 'bench', icon: BENCH_ICON, name: 'ベンチ',             desc: '柵の中にひと休みできるベンチを置く', cost: 4 },
  { k: 'roof',  icon: '🏠',       name: '小屋の屋根の塗り替え', desc: '小屋の屋根をピンクから空色に', cost: 4 },
  { k: 'flags', icon: '🎏',       name: 'ガーランド',          desc: '柵の上に旗飾りをつける', cost: 5 },
];
const CUR_ICON = { sero: '🌱', oxy: '💖', star: '⭐' };
const wallet = cur => cur === 'sero' ? S.sero : cur === 'oxy' ? S.oxy : S.stars;
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
  it.push({ sec: '🧱 柵の補強', icon: '🧱', name: S.fenceLvl < 3 ? `柵の補強 Lv.${S.fenceLvl + 1}` : '柵の補強（MAX）', desc: `脱走の間隔が長くなる（現在 ×${FENCE_MUL[S.fenceLvl]}）`, cost: S.fenceLvl < 3 ? FENCE_COSTS[S.fenceLvl] : 0, cur: 'sero', done: S.fenceLvl >= 3,
    buy: () => { S.fenceLvl++; buildBg(); toast(`🧱 柵が Lv.${S.fenceLvl} になった！`, 'good'); } });
  // 消耗品：1回買うと1回使える
  const SEC_ITEM = '🎒 道具（1回買うと1回使える）';
  it.push({ sec: SEC_ITEM, icon: STICK_ICON, name: '木の棒', desc: `ビックリさせて2倍速で柵へ。ただしヤギが拗ねる（所持 ${S.stickN}）`, cost: ITEM_COST.stick, cur: 'sero', done: false, buy: () => { S.stickN++; } });
  it.push({ sec: SEC_ITEM, icon: '🥣', name: '美味しい餌', desc: `脱走ヤギを呼び戻す／柵の中でプレゼント（所持 ${S.food}）`, cost: ITEM_COST.food, cur: 'sero', done: false, buy: () => { S.food++; } });
  it.push({ sec: SEC_ITEM, icon: '🔔', name: '鈴', desc: `鳴らすと脱走中の全ヤギが帰ってくる（所持 ${S.bellN}）`, cost: ITEM_COST.bell, cur: 'sero', done: false, buy: () => { S.bellN++; } });
  it.push({ sec: SEC_ITEM, icon: '🧪', name: 'ふかふか肥料', desc: `使うと${FERT_T}秒間、畑すべてが成長${FERT_MUL}倍。植える種の右の🧪で使う（所持 ${S.fertN}）`, cost: ITEM_COST.fert, cur: 'sero', done: false, buy: () => { S.fertN++; } });
  const n = goats.length;
  it.push({ sec: '🐐 ヤギのお迎え（💖で交換）', icon: '🐐', name: n < MAX_GOATS ? `${GOAT_NAMES[n]}（${PERSONA[n].icon}${PERSONA[n].label}）をお迎え` : 'ヤギがいっぱい！', desc: n < MAX_GOATS ? `${n + 1}匹目。${PERSONA[n].desc}` : 'これ以上はお迎えできないよ', cost: n < MAX_GOATS ? GOAT_COSTS[n - 1] : 0, cur: 'oxy', done: n >= MAX_GOATS,
    buy: () => addGoat() });
  const DSEC = '🎀 飾り付け（📋依頼の⭐で交換）';
  DECOS.forEach(d => it.push({ sec: DSEC, icon: d.icon, name: d.name, desc: d.desc, cost: d.cost, cur: 'star', done: !!S.deco[d.k],
    buy: () => { S.deco[d.k] = true; buildBg(); toast(`🎀 ${d.name}を飾った！`, 'good'); } }));
  goats.forEach(g => it.push({ sec: DSEC, icon: '🧣', name: `${g.name}のスカーフ`, desc: '首輪のかわりに、おそろいのスカーフを巻いてあげる', cost: SCARF_COST, cur: 'star', done: !!S.deco['scarf' + g.ci],
    buy: () => { S.deco['scarf' + g.ci] = true; say(g, '💕', 2); sparkles(g.x, g.y - 30 * L.sc, 6); toast(`🧣 ${g.name}「にあう？えへへ」`, 'good'); } }));
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
    else btn = `<button class="buy ${it.cur === 'sero' ? '' : it.cur}" data-i="${i}" ${wallet(it.cur) < it.cost ? 'disabled' : ''}>${CUR_ICON[it.cur]} ${it.cost}</button>`;
    html += `<div class="shop-row"><div class="si">${it.icon}</div><div class="sb"><div class="sn">${it.name}</div><div class="sd">${it.desc}</div></div>${btn}</div>`;
  });
  $('shopList').innerHTML = html;
  $('shopSero').textContent = Math.floor(S.sero); $('shopOxy').textContent = Math.floor(S.oxy); $('shopStars').textContent = S.stars;
}
function openShop() { renderShop(); $('shopModal').classList.remove('hidden'); paused = true; }
const MODALS = ['shopModal', 'helpModal', 'questModal', 'albumModal'];

// なかよし帳：ヤギごとのなかよし度・好物・思い出
function renderAlbum() {
  let html = '';
  goats.forEach(g => {
    const P = persona(g), lv = bondLevel(g.ci), xp = S.bond[g.ci] || 0, max = BOND_XP.length - 1;
    const pct = lv >= max ? 100 : (xp - BOND_XP[lv]) / (BOND_XP[lv + 1] - BOND_XP[lv]) * 100;
    const fav = favOf(g);
    html += `<div class="bond-card"><div class="bond-head"><b>${P.icon} ${g.name}</b><small>${P.label}</small>`
      + `<span class="hearts">${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}">♥</i>`).join('')}</span></div>`
      + `<div class="qbar bond"><i style="width:${pct}%"></i></div>`
      + `<div class="sd">なかよしLv.${lv}${lv >= max ? '（いちばんなかよし！）' : `　つぎまで あと${BOND_XP[lv + 1] - xp}`}</div>`
      + `<div class="sd">好物：${S.favFound[g.ci] ? `${snackEmoji(fav)}${snackName(fav)}` : '？？？（柵の中でおやつをあげて見つけよう）'}</div>`
      + '<ul class="memories">' + MEMORIES[g.ci % MEMORIES.length].map((m, i) => i < lv ? `<li>${m}</li>` : `<li class="locked">🔒 なかよしLv.${i + 1}で思い出が増える</li>`).join('') + '</ul></div>';
  });
  const rest = MAX_GOATS - goats.length;
  if (rest > 0) html += `<div class="quest-empty">まだ会っていない子が ${rest}匹 いるよ（ショップでお迎え）</div>`;
  html += '<div class="quest-note">なでる・おやつ・手で戻すと、その子となかよしになれるよ。なかよしLvが上がるたびに⭐+1</div>';
  $('albumBody').innerHTML = html;
}
function openAlbum() { renderAlbum(); $('albumModal').classList.remove('hidden'); paused = true; }
function closeModal(id) { $(id).classList.add('hidden'); paused = MODALS.some(m => !$(m).classList.contains('hidden')); }

$('shopList').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]'); if (!b) return;
  const it = shopCache[+b.dataset.i]; if (!it) return;
  if (it.cur === 'reset') {
    if (confirm('本当にデータをリセットしますか？')) { localStorage.removeItem(SAVE_KEY); resetting = true; location.reload(); }
    return;
  }
  if (it.done) return;
  if (wallet(it.cur) < it.cost) return;
  if (it.cur === 'sero') { S.sero -= it.cost; bumpGauge('seroGauge'); }
  else if (it.cur === 'oxy') { S.oxy -= it.cost; bumpGauge('oxyGauge'); }
  else S.stars -= it.cost;
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
  // チャレンジは保存しない（閉じたら柵の中から再開）
  if (g.chal) { GOAT_TIMERS.forEach(k => { sn[k] = 0; }); sn.escapeT = 30; return Object.assign(sn, { st: 'inside', returnMode: null, fx: 0.5, fy: 0.6 }); }
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
  if (b.id === 'questBtn') { SFX.pop(); openQuests(); return; }
  if (b.dataset.tool) setTool(b.dataset.tool);
});
$('subrow').addEventListener('click', e => {
  const b = e.target.closest('.seedbtn');
  if (e.target.closest('[data-chal]')) { cancelChallenge('🏁 チャレンジをやめた（なにもなくならないよ）'); return; }
  if (!b) return;
  if (b.dataset.fert) { useFert(); lastSub = ''; renderSubrow(); save(); return; }
  if (b.dataset.snack) S.snack = b.dataset.snack; else S.seed = b.dataset.seed;
  SFX.pop(); lastSub = ''; renderSubrow();
});
$('speedBtn').addEventListener('click', () => { ensureAudio(); S.speed = S.speed === 1 ? 2 : 1; SFX.pop(); updateUI(); toast(S.speed === 2 ? '⏩ 2x サクサクモード' : '▶ 1x のんびりモード'); });
// 🔊（PC）は効果音と BGM をまとめて切り替える。個別の設定は「？」の中
$('soundBtn').addEventListener('click', () => { const on = !(S.sound || S.bgm); S.sound = S.bgm = on; ensureAudio(); SFX.pop(); updateUI(); renderSettings(); });
const SETTINGS = [
  { k: 'sound', label: '効果音', on: '🔊', off: '🔇' },
  { k: 'bgm',   label: 'BGM',   on: '🎵', off: '🔕' },
  { k: 'vibe',  label: '振動',  on: '📳', off: '📴', need: () => 'vibrate' in navigator },
];
function renderSettings() {
  $('settings').innerHTML = '<span class="seedlabel">⚙️ 設定</span>' + SETTINGS.filter(s => !s.need || s.need()).map(s =>
    `<button class="setbtn ${S[s.k] ? 'on' : ''}" data-set="${s.k}">${S[s.k] ? s.on : s.off} ${s.label} ${S[s.k] ? 'ON' : 'OFF'}</button>`).join('');
}
$('settings').addEventListener('click', e => {
  const b = e.target.closest('button[data-set]'); if (!b) return;
  const k = b.dataset.set;
  S[k] = !S[k];
  ensureAudio(); SFX.pop();
  if (k === 'vibe') buzz(40);   // オンにしたら試しにブルッ
  renderSettings(); updateUI(); save();
});
renderSettings();
$('albumBtn').addEventListener('click', () => { ensureAudio(); SFX.pop(); openAlbum(); });
$('helpBtn').addEventListener('click', () => { $('helpModal').classList.remove('hidden'); paused = true; });
$('startBtn').addEventListener('click', () => { ensureAudio(); if (actx && actx.state === 'suspended') actx.resume(); closeModal('helpModal'); SFX.home(); });
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(m.id); }));

window.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= String(TOOLS.length)) setTool(TOOLS[+e.key - 1]);
  else if (e.key === ' ') { e.preventDefault(); $('speedBtn').click(); }
  else if (e.key === 'Escape') MODALS.forEach(closeModal);
  else if (e.key === 's' || e.key === 'S') { if ($('shopModal').classList.contains('hidden')) openShop(); else closeModal('shopModal'); }
  else if (e.key === 'q' || e.key === 'Q') { if ($('questModal').classList.contains('hidden')) openQuests(); else closeModal('questModal'); }
  else if (e.key === 'a' || e.key === 'A') { if ($('albumModal').classList.contains('hidden')) openAlbum(); else closeModal('albumModal'); }
});
window.addEventListener('resize', () => { resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); last = performance.now(); bgmSync(); });
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
fillQuests();
updateUI();
if (isNewGame) { $('helpModal').classList.remove('hidden'); paused = true; }
else {
  const out = goats.filter(isOutside);
  if (out.length) toast(`おかえりなさい！${out.map(g => g.name).join('・')}は脱走したままだよ🐐💦`, 'warn');
  else toast('おかえりなさい！ヤギたちが待ってたよ🐐💖', 'good');
}
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });

})();
