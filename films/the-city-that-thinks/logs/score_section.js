// Music: an epic electronic trailer score in D minor at 120 BPM (a bar = 2 s), one chord a bar. It grows by section:
// pad, sub and a soft pulse (intro) · kick and hats (build) · arpeggio and stabs (lift) · snare and the lead (drive) ·
// everything at full weight (peak) · the last chord rings out (tail).
const PROG = ['Dm', 'Dm', 'Bbmaj7', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm'];
const ROOT = { Dm: 'D', Bbmaj7: 'Bb', Bb: 'Bb', F: 'F', C: 'C' };
function score(ctx, out) {
  const room = wet(ctx, out, 0.32), air = wet(ctx, out, 0.5);
  const barOf = (t) => Math.min(PROG.length - 1, Math.floor(t / 2 + 1e-6)), grow = (t) => clamp(t / CUES.panorama);
  for (const t of beats('pad', 2)) pad(ctx, room, t, 2.2, chord(PROG[barOf(t)], 3, { open: true }), 0.09 + 0.05 * grow(t));
  for (const t of beats('sub', 2)) sub808(ctx, out, t, 1.9, hz(ROOT[PROG[barOf(t)]] + '1'), 0.42 + 0.2 * grow(t));
  for (const t of beats('pulse', 0.25)) {
    const on = Math.round(t / 0.25) % 2 === 0;
    bass(ctx, out, t, 0.2, hz(ROOT[PROG[barOf(t)]] + '2'), (on ? 0.2 : 0.13) + 0.14 * grow(t), { cutoff: 260 + 1500 * grow(t) * grow(t), q: 4 });
  }
  for (const t of beats('kick', 0.5)) kick(ctx, out, t, t < CUES.energy ? 0.55 : 0.85);
  for (const t of beats('snare', 1)) snare(ctx, room, t + 0.5, t < CUES.panorama ? 0.4 : 0.55, { tone: 190 });
  for (const t of beats('hat', 0.125)) {
    const s = Math.round(t / 0.125) % 4, lvl = t < CUES.energy ? 0.045 : t < CUES.station ? 0.07 : 0.1;
    hat(ctx, out, t, lvl * (s === 0 ? 0.6 : s === 2 ? 1 : 0.5), { open: s === 2 && t >= CUES.station });
  }
  for (const t of beats('arp', 0.125)) {
    const notes = chord(PROG[barOf(t)], 4), i = Math.round(t / 0.125), f = notes[[0, 1, 2, 1, 2, 0, 2, 1][i % 8] % notes.length] * (i % 16 >= 8 ? 2 : 1);
    pluck(ctx, air, t, f, 0.07 + 0.05 * grow(t));
  }
  for (const t of beats('stab', 2)) stab(ctx, room, t, 0.55, chord(PROG[barOf(t)], 4), 0.16 + 0.08 * grow(t), { cutoff: 1800 + 1400 * grow(t) });
  // the lead: a rising line that lands on the high D as the panorama opens
  const line = [[17, 'D5', 0.9], [18, 'F5', 0.45], [18.5, 'E5', 0.45], [19, 'D5', 0.9], [20, 'A5', 0.9], [21, 'G5', 0.45], [21.5, 'F5', 0.45], [22, 'E5', 0.9], [23, 'G5', 0.45], [23.5, 'A5', 0.45],
    [24, 'D6', 1.4], [25.5, 'C6', 0.45], [26, 'A5', 0.9]];
  const ls = spans('lead');
  for (const [t, n, d] of line) if (ls.some(([a, b]) => t >= a && t < b)) lead(ctx, air, t, hz(n), d, t < CUES.panorama ? 0.16 : 0.22, 2300);
}

