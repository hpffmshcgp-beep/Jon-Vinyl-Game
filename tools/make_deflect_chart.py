#!/usr/bin/env python3
"""Chart Deflect: Jon jumps between the two walls of a record groove, dodging what falls down the wall he is on.

Usage:  python3 tools/make_deflect_chart.py songs/deflect

Reads analysis/guitar_hits.json (tools/find_guitar_hits.py) and writes chart.json with five levels.
Every note sits on the measured attack of a pluck or strum (this song is played live, not to a grid): the rhythm
guitar's strums and the lead guitar's notes (kind 0 / 1, kept for reference). Each note is one jump, so they alternate
walls: hearts on the left wall (side 0), heartbreaks on the right (side 1). The gap per level keeps every jump playable.
"""
import sys, os, json
import numpy as np, librosa
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/deflect'
H = {k: np.array(v) for k, v in json.load(open(os.path.join(SONG, 'analysis', 'guitar_hits.json'))).items()}
y, sr = librosa.load(os.path.join(SONG, 'deflect.mp3'), sr=22050, mono=True)
dur = len(y)/sr
_, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=256, units='time', start_bpm=91)
onbeat = lambda t: 1.0 if np.min(np.abs(beats - t)) < 0.05 else 0.0

KIND = {'rhythm-guitar': 0, 'lead-guitar': 1}
cand = []
for n, h in H.items():
    for t, lvl, rise, midi in h:
        if rise < 6 or lvl < -24 or t < 0.3: continue
        cand.append(dict(t=t, kind=KIND[n], lvl=lvl, midi=midi, pr=2 + lvl/20 + (0.25 if n == 'lead-guitar' else 0)))
LEVELS = {   # loudness floor, min gap between jumps, extra weight on the beat, (unused), (unused), fall time
  'easy':       dict(floor=-12, gap=.62, beat=1.2, step=1, speed=150, approach=1.9),
  'normal':     dict(floor=-15, gap=.42, beat=0.8, step=1, speed=260, approach=1.6),
  'hard':       dict(floor=-18, gap=.30, beat=0.5, step=2, speed=380, approach=1.4),
  'expert':     dict(floor=-21, gap=.21, beat=0.25, step=2, speed=540, approach=1.2),
  'expertplus': dict(floor=-24, gap=.15, beat=0.0, step=3, speed=720, approach=1.05),
}
levels = {}
for name, L in LEVELS.items():
    cs = sorted([dict(c, p=c['pr'] + L['beat']*onbeat(c['t'])) for c in cand if c['lvl'] >= L['floor']], key=lambda c: -c['p'])
    out = []
    for c in cs:   # most important first; nothing closer than the gap to a note already taken
        if any(abs(c['t'] - o['t']) < L['gap'] for o in out): continue
        out.append(c)
    out.sort(key=lambda c: c['t'])
    notes = [[round(c['t'], 4), i % 2, c['kind']] for i, c in enumerate(out)]
    levels[name] = notes
    gaps = np.diff([x[0] for x in notes])
    print(f'{name:11s} {len(notes):4d} jumps {len(notes)/dur:.2f}/s  shortest gap {gaps.min():.3f}s  median {np.median(gaps):.3f}s')
chart = dict(title='Deflect', track=3, duration=round(dur, 3), mode='deflect',
             approach={k: v['approach'] for k, v in LEVELS.items()}, levels=levels)
json.dump(chart, open(os.path.join(SONG, 'chart.json'), 'w'), separators=(',', ':'))
print('wrote', os.path.join(SONG, 'chart.json'))
