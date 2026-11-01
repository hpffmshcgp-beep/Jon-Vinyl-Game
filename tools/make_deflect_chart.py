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

Phones play a front-facing version: ten paths fan in from ahead of Jon and a thumb slides the shield across them, so each
note also gets a front lane (4th value, 0 = far left .. 9 = far right). Heartbreaks (lead) take the left five, hearts
(rhythm) the right five. The melody moves the lead along its side (higher = toward the middle), strum runs sweep across
theirs and bounce at the edge; every lane is checked to be reachable by a sliding thumb in time (FRONT below), looking
ahead so a quick change of side can always be met through the middle lanes.
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
  'easy':       dict(floor=-12, gap=.62, beat=1.2, step=1, speed=150, approach=1.9),
  'normal':     dict(floor=-15, gap=.42, beat=0.8, step=1, speed=260, approach=1.6),
  'hard':       dict(floor=-18, gap=.30, beat=0.5, step=2, speed=380, approach=1.4),
  'expert':     dict(floor=-21, gap=.21, beat=0.25, step=2, speed=540, approach=1.2),
  'expertplus': dict(floor=-24, gap=.15, beat=0.0, step=3, speed=720, approach=1.05),
}
FRONT = {   # thumb: most lanes it moves between two notes, and how many lanes a second it can slide
  'easy': (4, 7), 'normal': (5, 9), 'hard': (5, 11), 'expert': (6, 13), 'expertplus': (6, 16)}
SIDE = {1: (0, 4), 0: (5, 9)}
def front_lanes(out, name):
    cap, speed = FRONT[name]; n = len(out)
    reach = lambda i: 0 if i == 0 else max(1, min(cap, int(speed*(out[i]['t'] - out[i - 1]['t']))))
    F = [None]*n   # backward pass: the lanes from which every later note can still be met
    for i in range(n - 1, -1, -1):
        lo, hi = SIDE[out[i]['kind']]
        if i < n - 1: r = reach(i + 1); lo, hi = max(lo, F[i + 1][0] - r), min(hi, F[i + 1][1] + r)
        assert lo <= hi, (name, i)
        F[i] = (lo, hi)
    mids = [(c['t'], c['midi']) for c in out if c['kind'] == 1 and c['midi']]
    def pitch_lane(c):   # where this note sits in the melody around it (±6 s): low = far left, high = the middle
        ws = [m for t, m in mids if abs(t - c['t']) < 6]
        if len(ws) < 4: return None
        lo, hi = np.percentile(ws, 10), np.percentile(ws, 90)
        return int(round(np.clip((c['midi'] - lo)/max(hi - lo, 1), 0, 1)*4))
    mem = {1: 2, 0: 7}; sweep = 1; pos = None; lanes = []
    for i, c in enumerate(out):
        k = c['kind']; lo, hi = SIDE[k]
        if k == 1:
            want = pitch_lane(c) if c['midi'] else None
            if want is None: want = mem[1]
        else:
            if i and c['t'] - out[i - 1]['t'] > 1.6: sweep = -sweep          # a new phrase sweeps the other way
            want = mem[0] + sweep
            if not lo <= want <= hi: sweep = -sweep; want = mem[0] + sweep   # bounce off the edge
        a, b = F[i]
        if pos is not None: r = reach(i); a, b = max(a, pos - r), min(b, pos + r)
        pos = int(min(b, max(a, want))); mem[k] = pos; lanes.append(pos)
    return lanes
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
    for nt, ln in zip(notes, front_lanes(out, name)): nt.append(ln)
    levels[name] = notes
    fl = np.array([x[3] for x in notes]); fj = np.abs(np.diff(fl))
    print(f'{"":11s} front: lanes used {np.bincount(fl, minlength=10).tolist()}  moves none {np.mean(fj == 0)*100:.0f}% 1 {np.mean(fj == 1)*100:.0f}% 2+ {np.mean(fj > 1)*100:.0f}%')
    ks = np.array([x[2] for x in notes]); turns = np.array([min(abs(b[1] - a[1]), 8 - abs(b[1] - a[1])) for a, b in zip(notes, notes[1:])])
    print(f'{name:11s} {len(notes):4d} notes {len(notes)/dur:.2f}/s  hearts {np.sum(ks == 0)} heartbreaks {np.sum(ks == 1)}  turns: none {np.mean(turns == 0)*100:.0f}% 1/8 {np.mean(turns == 1)*100:.0f}% bigger {np.mean(turns > 1)*100:.0f}%')
chart = dict(title='Deflect', track=3, duration=round(dur, 3), mode='deflect',
             approach={k: v['approach'] for k, v in LEVELS.items()}, levels=levels)
json.dump(chart, open(os.path.join(SONG, 'chart.json'), 'w'), separators=(',', ':'))
print('wrote', os.path.join(SONG, 'chart.json'))
