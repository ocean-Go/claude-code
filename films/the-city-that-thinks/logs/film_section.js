// ============================== FILM ==============================
const TITLE = '2035 The City That Thinks';
// Purpose (SKILL.md "First questions"): 'cinematic' or 'ad'.
const PURPOSE = 'ad';
// Look: authored for this film from the cinematic-realistic family: deep blue night, cyan energy, one gold scene.
const LOOKS = {
  'cinematic-realistic': { grade: 'contrast(1.06) saturate(1.06)', bloom: 0.5, texture: null, vignette: 0.42, grain: 0.035, grainHold: 1, hold: 24, line: 0, steps: 0,
    palette: { bg: '#050b16', ink: '#eef4fa', accent: '#27e0ff', dim: '#0d2140', silver: '#c9d6e4', gold: '#ffc46b' } },
};
const LOOK_ID = 'cinematic-realistic';
const LOOK = LOOKS[LOOK_ID];
const FINISH = { shutter: null, weave: 0, tone: null };
const FPS = 24;
const DURATION = 30;                        // seconds; the picture and the sound both follow this
const BPM = 120;                            // a bar = 2 s; the cuts sit on beats 10, 22, 34, 48
const BEAT0 = 0;
const beat = (n) => BEAT0 + n * 60 / BPM, bar = (n) => beat(4 * n);
const OWN_MUSIC = null;
const INSTRUMENTS = [];
const CAST = {};
const FORMULAS = {};
const PALETTE = { ...LOOK.palette };
const TYPE = {
  lang: 'en',
  roles: { display: { family: 'Michroma', files: { 400: 'fonts/michroma-latin-400-normal.woff2' } },
    text: { family: 'Barlow', files: { 500: 'fonts/barlow-latin-500-normal.woff2', 600: 'fonts/barlow-latin-600-normal.woff2' } }, mono: null },
  check: { strings: { display: ['THE FUTURE IS HERE', 'POWERING INTELLIGENCE', 'ENERGY REIMAGINED', 'CONNECTED BY ENERGY', 'POWER THE FUTURE'], text: ['OceanOS | Imagine Beyond'] }, sizes: { text: 0.04 } },
};

// Cues are shared by picture and sound, so a hit on screen and its sound land on the same frame.
const CUES = { dive: 0, wave: 1.5, data: beat(10), energy: beat(22), station: beat(34), plug: 20, panorama: beat(48), title: 27, end: DURATION };

// Narration (Kokoro TTS offline, treated): dur measured from each WAV.
const VO = [
  { id: 'VO1', at: 1.7, dur: 2.24 }, { id: 'VO2', at: 5.8, dur: 2.01 }, { id: 'VO3', at: 11.8, dur: 1.92 }, { id: 'VO4', at: 18.0, dur: 1.71 },
];
const CAPTIONS = null;
const CAPTION_STYLE = { role: 'display', accentRole: 'display', size: 0.062, caps: false, ink: PALETTE.ink, hi: PALETTE.ink, accent: PALETTE.accent, punch: 0.07 };

const SCENES = [
  { chapter: 'C1', from: CUES.dive, to: CUES.data, draw: cityWakes, action: 'the dark city lights up in a wave as we dive from orbit', amb: { kind: 'air', gain: 0.05 } },
  { chapter: 'C1', from: CUES.data, to: CUES.energy, draw: dataCenter, action: 'data runs along the fibre and the racks blink', in: { type: 'cut' }, amb: { kind: 'room', gain: 0.07 } },
  { chapter: 'C1', from: CUES.energy, to: CUES.station, draw: newEnergy, action: 'turbines turn and energy particles flow from the panels to the city', in: { type: 'cut' }, amb: { kind: 'air', gain: 0.06 } },
  { chapter: 'C1', from: CUES.station, to: CUES.panorama, draw: superCharge, action: 'the car arrives, the plug connects and energy flows into it', in: { type: 'cut' }, amb: { kind: 'city', gain: 0.05 } },
  { chapter: 'C1', from: CUES.panorama, to: CUES.title, draw: panorama, action: 'the energy network joins every site of the city', in: { type: 'cut' }, amb: { kind: 'air', gain: 0.05 } },
  { chapter: 'C1', from: CUES.title, to: CUES.end, draw: endCard, action: 'the title rises out of the dark', in: { type: 'dissolve', dur: 0.7 }, amb: { kind: 'room', gain: 0.03 } },
];

const SFX = [];

const ROOM = { secs: 2.6, decay: 3.0, tone: 5200 };

const ARRANGEMENT = [
  { section: 'intro', from: 0, to: CUES.end, parts: [] },
];

// ---- picture helpers of this film ----
// one 3D frame from world.js, laid on the film's canvas
function world3d(g, S, name, t, k, mode) {
  const c = WORLD.render(name, t, k, S.W, S.H, mode);
  g.drawImage(c, 0, 0, S.W, S.H);
  return WORLD.last || {};
}
// a lower title card: rises in by letter, holds, leaves; a soft shade under it keeps it readable on any picture
function card(g, S, str, t, from, to, y = 0.355, size = 0.043) {
  if (t < from || t > to) return;
  const a = Math.min(MOTION.at(t, from, 0.5), 1 - MOTION.at(t, to - 0.45, 0.45)), k = EASE.out(MOTION.at(t, from, 0.9));
  const sh = g.createLinearGradient(0, S.H * 0.62, 0, S.H);
  sh.addColorStop(0, 'rgba(2,6,14,0)'); sh.addColorStop(0.6, `rgba(2,6,14,${0.55 * a})`); sh.addColorStop(1, `rgba(2,6,14,${0.7 * a})`);
  g.fillStyle = sh; g.fillRect(0, S.H * 0.62, S.W, S.H * 0.38);
  const cam = CAM.base();
  plane(g, S, cam, 0, (g) => {
    const w = 0.34 * k;
    g.fillStyle = PALETTE.accent; g.globalAlpha = a; g.fillRect(-w / 2, y - 0.062, w, 0.0028); g.globalAlpha = 1;
    text(g, S, str, 0, y, size, PALETTE.ink, a, 0.2, { reveal: k, spread: 0.6, by: 'char' });
  });
}

function cityWakes(g, k, t, S) {
  // crane down and dolly in, 5 s, fast ease-out, from orbit through the cloud deck toward the city core
  const o = world3d(g, S, 'city', t, k, 'wake');
  if (o.cloud > 0.01) { g.fillStyle = `rgba(150,172,205,${0.82 * o.cloud})`; g.fillRect(0, 0, S.W, S.H); }
  card(g, S, 'THE FUTURE IS HERE', t, 2.7, 4.85);
}

function dataCenter(g, k, t, S) {
  // dolly in, 6 s, fast ease-out, down the aisle toward the core, rising over the racks at the end
  world3d(g, S, 'data', t, k);
  card(g, S, 'POWERING INTELLIGENCE', t, 7.3, 10.75);
}

function newEnergy(g, k, t, S) {
  // truck right then crane up, 6 s, ease-in-out, over the panel rows toward the turbines and the city
  if (WORLD.builders.energy) world3d(g, S, 'energy', t, k); else { g.fillStyle = '#000'; g.fillRect(0, 0, S.W, S.H); }
  card(g, S, 'ENERGY REIMAGINED', t, 13.3, 16.75);
}

function superCharge(g, k, t, S) {
  // orbit, 7 s, ease-in-out, 100 degrees around the car as it arrives and charges
  if (WORLD.builders.station) world3d(g, S, 'station', t, k); else { g.fillStyle = '#000'; g.fillRect(0, 0, S.W, S.H); }
  card(g, S, 'CONNECTED BY ENERGY', t, 20.5, 23.75);
}

function panorama(g, k, t, S) {
  // crane up and pull back, 3 s, ease-in-out, from the rooftops to the whole city
  world3d(g, S, 'city', t, k, 'finale');
}

function endCard(g, k, t, S) {
  // locked off, 3 s, the title on black
  g.fillStyle = '#01030a'; g.fillRect(0, 0, S.W, S.H);
  const glow = g.createRadialGradient(S.W / 2, S.H * 0.5, 0, S.W / 2, S.H * 0.5, S.W * 0.55);
  glow.addColorStop(0, `rgba(20,70,120,${0.34 * EASE.out(Math.min(1, k * 2))})`); glow.addColorStop(1, 'rgba(1,3,10,0)');
  g.fillStyle = glow; g.fillRect(0, 0, S.W, S.H);
  const cam = CAM.base(); CAM.dolly(cam, EASE.out(k), 1.04, 1);
  plane(g, S, cam, 0, (g) => {
    const a = MOTION.at(t, CUES.title + 0.25, 0.6), r = EASE.out(MOTION.at(t, CUES.title + 0.25, 1.1));
    text(g, S, 'POWER THE FUTURE', 0, -0.035, 0.074, PALETTE.ink, a, 0.16, { reveal: r, spread: 0.6, by: 'char' });
    const l = EASE.out(MOTION.at(t, CUES.title + 0.9, 0.8)), w = 0.5 * l;
    g.fillStyle = PALETTE.accent; g.globalAlpha = l; g.fillRect(-w / 2, 0.052, w, 0.003); g.globalAlpha = 1;
    text(g, S, 'OceanOS | Imagine Beyond', 0, 0.115, 0.034, PALETTE.silver, MOTION.at(t, CUES.title + 1.1, 0.7), 0.08, { role: 'text', weight: 500 });
  });
}

// Music, in the same timeline: one continuous track following ARRANGEMENT.
function score(ctx, out) {
}

