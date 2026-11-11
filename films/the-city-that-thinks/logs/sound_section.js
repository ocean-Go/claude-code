const SFX = [
  { at: 0.0, voice: 'air', dur: 1.9, gain: 0.3, wet: 0.2 },                     // the dive: air rushing past through the cloud deck
  { at: CUES.wave, voice: 'hit', gain: 0.5, wet: 0.4 },                         // the grid switches on
  { at: 1.75, voice: 'tick', gain: 0.1, wet: 0.3 }, { at: 2.0, voice: 'tick', gain: 0.11, wet: 0.3 }, { at: 2.25, voice: 'tick', gain: 0.12, wet: 0.3 },
  { at: 2.5, voice: 'tick', gain: 0.12, wet: 0.3 }, { at: 2.75, voice: 'tick', gain: 0.11, wet: 0.3 }, { at: 3.0, voice: 'tick', gain: 0.1, wet: 0.3 },   // districts lighting up, one tick each
  { at: CUES.data, voice: 'hit', gain: 0.6, wet: 0.35 },                        // the cut into the data hall
  { at: 6.125, voice: 'tick', gain: 0.09, wet: 0.2 }, { at: 6.875, voice: 'tick', gain: 0.08, wet: 0.2 }, { at: 8.125, voice: 'tick', gain: 0.09, wet: 0.2 },
  { at: 8.625, voice: 'tick', gain: 0.08, wet: 0.2 }, { at: 9.375, voice: 'tick', gain: 0.09, wet: 0.2 }, { at: 10.125, voice: 'tick', gain: 0.08, wet: 0.2 },   // data bursts on the fibre
  { at: 13.0, voice: 'air', dur: 2.6, gain: 0.14, wet: 0.2 },                   // wind over the field as the camera rises
  { at: 17.1, voice: 'air', dur: 2.0, gain: 0.22, wet: 0.2 },                   // the car passes close and slows
  { at: 19.3, voice: 'foley', kind: 'cloth', gain: 0.2, wet: 0.2 },             // the cable leaves the holster
  { at: CUES.plug, voice: 'foley', kind: 'tap', gain: 0.5, wet: 0.3 },          // the plug seats
  { at: CUES.plug + 0.02, voice: 'hit', gain: 0.45, wet: 0.4 },                 // energy starts to flow
  { at: CUES.panorama - 2.0, voice: 'riser', dur: 2.0, gain: 0.26, wet: 0.25 }, // into the panorama
  { at: CUES.panorama, voice: 'hit', gain: 0.95, wet: 0.4 },                    // the peak
  { at: CUES.title - 0.4, voice: 'whoosh', dur: 0.8, gain: 0.32, wet: 0.3 },    // the dip to black
  { at: CUES.title + 0.25, voice: 'hit', gain: 0.9, wet: 0.5 },                 // the title lands
];

const ROOM = { secs: 2.6, decay: 3.0, tone: 5200 };

const ARRANGEMENT = [
  { section: 'intro', from: 0, to: CUES.data, parts: ['pad', 'sub', 'pulse'] },
  { section: 'build', from: CUES.data, to: CUES.energy, parts: ['pad', 'sub', 'pulse', 'kick', 'hat'] },
  { section: 'lift', from: CUES.energy, to: CUES.station, parts: ['pad', 'sub', 'pulse', 'kick', 'hat', 'arp', 'stab'] },
  { section: 'drive', from: CUES.station, to: CUES.panorama, parts: ['pad', 'sub', 'pulse', 'kick', 'hat', 'arp', 'stab', 'snare', 'lead'] },
  { section: 'peak', from: CUES.panorama, to: CUES.title, parts: ['pad', 'sub', 'pulse', 'kick', 'hat', 'arp', 'stab', 'snare', 'lead'] },
  { section: 'tail', from: CUES.title, to: CUES.end, parts: ['pad', 'sub'] },
];
