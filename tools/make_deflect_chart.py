#!/usr/bin/env python3
"""Chart a Beatblock-style "deflect" level: notes fly in from 8 directions and you turn the shield to meet them.

Usage:  python3 tools/make_deflect_chart.py songs/deflect

Reads analysis/guitar_hits.json (tools/find_guitar_hits.py) and writes chart.json with five levels.
  hearts      (kind 0) = the rhythm guitar's strums
  heartbreaks (kind 1) = the lead guitar's notes
Every note sits on the measured attack of its pluck or strum (this song is played live, not to a grid).
Directions: 0 = top, counting clockwise in eighths of a turn. The lead melody steers them (up the neck turns the
shield clockwise, down turns it back); runs of strums spin steadily around; each difficulty caps how far and how
fast you have to turn.
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
LEVELS = {   # loudness floor, min gap between notes, extra weight on the beat, max turn per note (eighths), max turn speed (deg/s), fly-in time
  'easy':       dict(floor=-12, gap=.62, beat=1.2, step=1, speed=150, approach=2.3),
  'normal':     dict(floor=-15, gap=.42, beat=0.8, step=1, speed=260, approach=2.0),
  'hard':       dict(floor=-18, gap=.30, beat=0.5, step=2, speed=380, approach=1.75),
  'expert':     dict(floor=-21, gap=.21, beat=0.25, step=2, speed=540, approach=1.5),
  'expertplus': dict(floor=-24, gap=.15, beat=0.0, step=3, speed=720, approach=1.3),
}
levels = {}
for name, L in LEVELS.items():
    cs = sorted([dict(c, p=c['pr'] + L['beat']*onbeat(c['t'])) for c in cand if c['lvl'] >= L['floor']], key=lambda c: -c['p'])
    out = []
    for c in cs:   # most important first; nothing closer than the gap to a note already taken
        if any(abs(c['t'] - o['t']) < L['gap'] for o in out): continue
        out.append(c)
    out.sort(key=lambda c: c['t'])
    pos, spin, run, last_midi = 0, 1, 0, None
    notes = []
    for i, c in enumerate(out):
        if i == 0: notes.append([round(c['t'], 4), 0, c['kind']]); last_midi = c['midi'] or None; continue
        gap = c['t'] - out[i - 1]['t']
        if gap > 1.6: spin = -spin; run = 0                                  # a new phrase turns the other way
        if c['kind'] == 1 and c['midi'] and last_midi:
            d = c['midi'] - last_midi; step = 0 if abs(d) < 0.5 else (1 if abs(d) <= 4 else 2)*int(np.sign(d))
        elif c['kind'] == 1: step = spin
        else:
            step = spin; run += 1
            if run % 8 == 0: spin = -spin                                     # long runs of strums swing back
        if c['kind'] == 1 and c['midi']: last_midi = c['midi']
        cap = min(L['step'], int(L['speed']*gap/45))                          # can a hand turn that far in time?
        step = int(np.clip(step, -cap, cap))
        pos = (pos + step) % 8
        notes.append([round(c['t'], 4), int(pos), c['kind']])
    levels[name] = notes
    ks = np.array([x[2] for x in notes]); turns = np.array([min(abs(b[1] - a[1]), 8 - abs(b[1] - a[1])) for a, b in zip(notes, notes[1:])])
    print(f'{name:11s} {len(notes):4d} notes {len(notes)/dur:.2f}/s  hearts {np.sum(ks == 0)} heartbreaks {np.sum(ks == 1)}  turns: none {np.mean(turns == 0)*100:.0f}% 1/8 {np.mean(turns == 1)*100:.0f}% bigger {np.mean(turns > 1)*100:.0f}%')
chart = dict(title='Deflect', track=3, duration=round(dur, 3), mode='deflect',
             approach={k: v['approach'] for k, v in LEVELS.items()}, levels=levels)
json.dump(chart, open(os.path.join(SONG, 'chart.json'), 'w'), separators=(',', ':'))
print('wrote', os.path.join(SONG, 'chart.json'))
