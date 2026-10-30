#!/usr/bin/env python3
"""Find every pluck and strum in a song's guitar stems, with its attack time, loudness and pitch.

Usage:  python3 tools/find_guitar_hits.py songs/<song-folder> lead-guitar rhythm-guitar

Writes analysis/guitar_hits.json: per stem, [time of the attack, level in dB under the stem's loudest notes,
rise in dB out of the quiet before it, pitch as a MIDI note number (or 0 when unclear)].
Plucked and strummed strings start softer than drums, so the attack is taken where the 2 ms envelope clears
30 % of its rise, and a hit needs a real jump in level (not just the next ring of the same strum).
"""
import sys, os, json
import numpy as np, librosa
from scipy.ndimage import maximum_filter1d
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/deflect'
STEMS = sys.argv[2:] or ['lead-guitar', 'rhythm-guitar']
SR = 44100; H = 128; fps = SR/H
out = {}
for n in STEMS:
    y, _ = librosa.load(os.path.join(SONG, 'stems', n + '.mp3'), sr=SR, mono=True)
    S = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=2048, hop_length=H, n_mels=96, fmin=70, fmax=12000)
    oe = librosa.onset.onset_strength(S=librosa.power_to_db(S, ref=np.max(S)), sr=SR, hop_length=H, lag=1, max_size=3)
    pk = librosa.util.peak_pick(oe, pre_max=int(.04*fps), post_max=int(.04*fps), pre_avg=int(.12*fps), post_avg=int(.12*fps),
                                delta=np.percentile(oe, 90)*0.25, wait=int(.06*fps))
    a = np.abs(y); env = maximum_filter1d(a, int(.002*SR))
    # pitch track for the whole stem (for the lead, this drives which way the notes come from)
    f0, vf, vp = librosa.pyin(librosa.resample(y, orig_sr=SR, target_sr=22050), sr=22050, fmin=70, fmax=1400, frame_length=2048, hop_length=256)
    f0t = np.arange(len(f0))*256/22050
    hits = []
    for p in pk:
        c = p*H
        if c >= len(a) - SR//10: continue
        peak = a[max(0, c - int(.01*SR)):c + int(.05*SR)].max()
        quiet = env[max(0, c - int(.06*SR)):max(1, c - int(.005*SR))].min()
        lo = max(0, c - int(.04*SR)); seg = env[lo:c + int(.04*SR)]
        k = lo + np.argmax(seg >= quiet + (peak - quiet)*0.3)
        pk2 = a[k:k + int(.04*SR)].max(); q2 = env[max(0, k - int(.04*SR)):k + 1].min()
        t = k/SR
        win = (f0t > t + 0.03) & (f0t < t + 0.18) & vf
        midi = float(np.median(librosa.hz_to_midi(f0[win]))) if win.sum() >= 2 else 0.0
        hits.append((t, 20*np.log10(pk2 + 1e-9), 20*np.log10((pk2 + 1e-9)/(q2 + 1e-9)), midi))
    h = np.array(sorted(hits)); m = []
    for x in h:                                          # one hit per 40 ms (a strum is several strings)
        if m and x[0] - m[-1][0] < 0.04:
            if x[1] > m[-1][1]: m[-1] = x
        else: m.append(x)
    h = np.array(m); h[:, 1] -= np.percentile(h[:, 1], 99)
    out[n] = h.tolist()
    print(f'{n:14s} {len(h):4d} hits; >-12dB {np.sum(h[:,1] > -12)}  >-20dB {np.sum(h[:,1] > -20)}  rise>=6dB {np.sum(h[:,2] >= 6)}  pitched {np.sum(h[:,3] > 0)}')
os.makedirs(os.path.join(SONG, 'analysis'), exist_ok=True)
json.dump(out, open(os.path.join(SONG, 'analysis', 'guitar_hits.json'), 'w'))
print('wrote', os.path.join(SONG, 'analysis', 'guitar_hits.json'))
