#!/usr/bin/env python3
"""Chart a surf level (track 4, Void): Jon rides a wave; hold to climb the face, let go to carve down.

Usage:  python3 tools/make_surf_chart.py songs/void

Reads analysis/drum_hits.json (tools/find_hits.py) and writes chart.json with five levels. Every gem sits on the
measured attack of a drum hit, and its height on the wave comes from the drum:
  kick  -> low  (the trough)      snare -> high (the lip)      hi-hat -> in between (harder levels only)
Gems are only kept where a rider can actually get from one to the next in time (RISE: seconds for a full climb).
At the song's big moments the wave throws him into the air for four beats; while he's up, the hi-hats and snares become
spin cues: tap on each one to spin.
"""
import sys, os, json
import numpy as np
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/void'
H = {k: np.array(v) for k, v in json.load(open(os.path.join(SONG, 'analysis', 'drum_hits.json'))).items()}
BPM = 130.4; BEAT = 60/BPM                    # the owner's figure (F minor, 130.4 BPM); the groove sits in half time
LOW, MID, HIGH = 0.12, 0.5, 0.88
RISE = 0.36                                   # seconds to climb from trough to lip (the game uses the same number)
REACH = (HIGH - LOW)/RISE                     # height per second a rider can cover
DUR = 150.02
LAUNCH = [29.6, 80.84, 103.45, 132.85, 140.18]   # kick comes in, crash, kick back after the break, the two big crashes
AIR = 4*BEAT

def hits(name, lvl, rise=8):
    v = H[name]; return v[(v[:, 1] > lvl) & (v[:, 2] >= rise)]

LEVELS = {   # loudness floor, min gap between gems, hi-hats as mid gems?, min gap between spin cues, scroll time
    'easy':       dict(floor=-10, gap=0.88, hats=False, spin=0.9,  approach=2.6),
    'normal':     dict(floor=-12, gap=0.58, hats=False, spin=0.45, approach=2.3),
    'hard':       dict(floor=-14, gap=0.42, hats=True,  spin=0.45, approach=2.0),
    'expert':     dict(floor=-16, gap=0.3,  hats=True,  spin=0.22, approach=1.8),
    'expertplus': dict(floor=-18, gap=0.22, hats=True,  spin=0.22, approach=1.6),
}
kicks = hits('kick', -14)[:, 0]
airs = []
for t in LAUNCH:   # launch right on the nearest strong kick (or the crash itself)
    near = kicks[np.argmin(np.abs(kicks - t))]
    t0 = float(near if abs(near - t) < 0.12 else t); airs.append([round(t0, 4), round(t0 + AIR, 4)])
in_air = lambda t, pad=0.0: any(a - pad <= t <= b + pad for a, b in airs)

levels = {}
for name, L in LEVELS.items():
    cand = [(t, lvl, LOW, 0, 3 + lvl/10) for t, lvl, r in hits('kick', L['floor'])]
    cand += [(t, lvl, HIGH, 1, 3 + lvl/10) for t, lvl, r in hits('snare', L['floor'])]
    if L['hats']: cand += [(t, lvl, MID, 2, 1.5 + lvl/10) for t, lvl, r in hits('hh', L['floor'] - 2)]
    cand = [c for c in cand if c[0] > 14.5 and not in_air(c[0], 0.45)]
    out = []
    for c in sorted(cand, key=lambda c: -c[4]):   # most important first, nothing closer than the gap
        if any(abs(c[0] - o[0]) < L['gap'] for o in out): continue
        out.append(c)
    out.sort()
    gems = []
    for c in out:   # keep only what a rider can reach from the gem before
        if gems:
            g = c[0] - gems[-1][0]
            if abs(c[2] - gems[-1][1]) > REACH*g*0.85: continue
        gems.append([round(c[0], 4), c[2], c[3]])
    spins = []
    for a, b in airs:
        cues = sorted(t for t, lvl, r in np.vstack([hits('hh', L['floor'] - 2), hits('snare', L['floor'])]) if a + 0.3 <= t <= b - 0.3)
        for t in cues:
            if not spins or t - spins[-1] >= L['spin']: spins.append(round(float(t), 4))
        if not any(a < s < b for s in spins): spins.append(round(a + 2*BEAT, 4))   # at least one spin per jump
    levels[name] = dict(gems=gems, spins=spins)
    k = np.array([x[2] for x in gems])
    print(f'{name:11s} {len(gems):4d} gems (low {np.sum(k == 0)} high {np.sum(k == 1)} mid {np.sum(k == 2)})  {len(spins)} spins  {len(airs)} jumps')
chart = dict(title='Void', track=4, duration=DUR, mode='surf', bpm=BPM, rise=RISE, airs=airs,
             approach={k: v['approach'] for k, v in LEVELS.items()}, levels=levels)
json.dump(chart, open(os.path.join(SONG, 'chart.json'), 'w'), separators=(',', ':'))
print('wrote', os.path.join(SONG, 'chart.json'), ' jumps at', [a for a, b in airs])
