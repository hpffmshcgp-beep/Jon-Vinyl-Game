#!/usr/bin/env python3
"""Chart a surf level (track 4, Void): Jon rides a wave; hold to climb the face, let go to carve down, ride off the top
to fly.

Usage:  python3 tools/make_surf_chart.py songs/void

Reads analysis/drum_hits.json (tools/find_hits.py) and writes chart.json with five levels. Every gem sits on the
measured attack of a drum hit. On the wave its height comes from the drum:
  kick  -> low (the trough)      hi-hat -> in between (harder levels only)      snare -> high on the face
Riding all the way up to the lip (height 1) throws him into the air on a fixed arc (AIR seconds, PEAK high), wherever
he is. The chart puts a launch gem on the lip on a strong hit and an arc of gems on the drum hits while he's up there;
landings are his own (hold in the air to backflip; land flat or wipe out).
Gems are only kept where a rider can actually get from one to the next in time (RISE: seconds for a full climb).
"""
import sys, os, json
import numpy as np
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/void'
H = {k: np.array(v) for k, v in json.load(open(os.path.join(SONG, 'analysis', 'drum_hits.json'))).items()}
BPM = 130.4; BEAT = 60/BPM                    # the owner's figure (F minor, 130.4 BPM); the groove sits in half time
LOW, MID, HIGH, LIP = 0.12, 0.37, 0.62, 1.0
RISE = 0.36                                   # seconds to climb LOW..0.88 (the game uses the same speed)
REACH = (0.88 - LOW)/RISE                     # height per second a rider can cover
AIR = 4*BEAT; PEAK = 0.8                      # time in the air and how high above the lip the arc goes
GRAV = 8*PEAK/AIR**2; V0 = GRAV*AIR/2
arc = lambda tau: LIP + V0*tau - 0.5*GRAV*tau*tau
DUR = 150.02
MUST = [29.6, 80.84, 103.45, 132.85, 140.18]  # kick comes in, crash, kick back after the break, the two big crashes

def hits(name, lvl, rise=8):
    v = H[name]; return v[(v[:, 1] > lvl) & (v[:, 2] >= rise)]

LEVELS = {   # loudness floor, min gap between gems, hi-hats as mid gems?, ground time between airs, scroll time
    'easy':       dict(floor=-10, gap=0.88, hats=False, ground=6.0, approach=2.6),
    'normal':     dict(floor=-12, gap=0.58, hats=False, ground=4.6, approach=2.3),
    'hard':       dict(floor=-14, gap=0.42, hats=True,  ground=3.6, approach=2.0),
    'expert':     dict(floor=-16, gap=0.3,  hats=True,  ground=2.8, approach=1.8),
    'expertplus': dict(floor=-18, gap=0.22, hats=True,  ground=2.2, approach=1.6),
}
strong = np.sort(np.concatenate([hits('kick', -8)[:, 0], hits('snare', -8)[:, 0]]))
strong = strong[(strong > 15.5) & (strong < DUR - AIR - 3)]

def launches(ground):
    must = []
    for m in MUST:   # right on the nearest strong hit
        near = strong[np.argmin(np.abs(strong - m))]; must.append(float(near if abs(near - m) < 0.12 else m))
    out = list(must)
    t = 15.5
    while True:   # fill the gaps: the first strong hit once he's had his ground time, never crowding a must
        c = strong[strong >= t + (ground if t > 15.5 else 0.5)]
        if not len(c): break
        t0 = float(c[0])
        if any(abs(t0 - m) < AIR + ground*0.6 for m in must):
            nxt = [m for m in must if m > t0 - AIR - ground*0.6]
            t = (nxt[0] if nxt else t0) + AIR; continue
        out.append(t0); t = t0 + AIR
    out = sorted(set(round(x, 4) for x in out))
    keep = []
    for x in out:
        if keep and x - keep[-1] < AIR + 1.2: continue
        keep.append(x)
    return keep

levels, info = {}, {}
for name, L in LEVELS.items():
    airs = [[a, round(a + AIR, 4)] for a in launches(L['ground'])]
    in_air = lambda t, pad=0.0: any(a - pad <= t <= b + pad for a, b in airs)
    cand = [(t, lvl, LOW, 0, 3 + lvl/10) for t, lvl, r in hits('kick', L['floor'])]
    cand += [(t, lvl, HIGH, 1, 3 + lvl/10) for t, lvl, r in hits('snare', L['floor'])]
    if L['hats']: cand += [(t, lvl, MID, 2, 1.5 + lvl/10) for t, lvl, r in hits('hh', L['floor'] - 2)]
    cand = [c for c in cand if c[0] > 14.5 and not any(a - 0.3 <= c[0] <= b + 0.25 for a, b in airs)]
    cand += [(a, 99, LIP, 3, 99) for a, b in airs]            # the launch gem, on the lip
    out = []
    for c in sorted(cand, key=lambda c: -c[4]):   # most important first, nothing closer than the gap
        if any(abs(c[0] - o[0]) < L['gap'] for o in out): continue
        out.append(c)
    out.sort()
    gems = []
    after = lambda g: (LIP, g[0] + AIR) if g[2] == 3 else (g[1], g[0])   # a landing leaves him on the lip
    for c in out:   # keep only what a rider can reach from the gem before
        if c[3] == 3:   # a launch always stays: drop what's in the way of the run-up instead
            while gems and abs(LIP - after(gems[-1])[0]) > REACH*(c[0] - after(gems[-1])[1])*0.85: gems.pop()
        else:
            hpos, tpos = after(gems[-1]) if gems else (LOW, 14.5)
            if abs(c[2] - hpos) > REACH*(c[0] - tpos)*0.85: continue
        gems.append([round(c[0], 4), c[2], c[3]])
    # gems along each arc, on the drum hits while he's up
    agap = max(0.2, L['gap']*0.55)
    pool = np.vstack([hits('kick', L['floor']), hits('snare', L['floor']), hits('hh', L['floor'] - 2)])
    kinds = [0]*len(hits('kick', L['floor'])) + [1]*len(hits('snare', L['floor'])) + [2]*len(hits('hh', L['floor'] - 2))
    nair = 0
    for a, b in airs:
        last = a
        for (t, lvl, r), k in sorted(zip(pool.tolist(), kinds)):
            if a + 0.16 <= t <= b - 0.14 and t - last >= agap:
                gems.append([round(t, 4), round(arc(t - a), 4), k]); last = t; nair += 1
    gems.sort()
    levels[name] = dict(gems=gems, airs=airs)
    k = np.array([x[2] for x in gems])
    print(f'{name:11s} {len(gems):4d} gems ({nair} in the air)  {len(airs)} airs  every {np.mean(np.diff([a for a, b in airs])):.1f} s')
chart = dict(title='Void', track=4, duration=DUR, mode='surf', bpm=BPM, rise=RISE, air=round(AIR, 4), peak=PEAK,
             approach={k: v['approach'] for k, v in LEVELS.items()}, levels=levels)
json.dump(chart, open(os.path.join(SONG, 'chart.json'), 'w'), separators=(',', ':'))
print('wrote', os.path.join(SONG, 'chart.json'))
