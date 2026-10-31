#!/usr/bin/env python3
"""Split a song into two layers the game mixes live: the drums, and everything else (the song minus the drums).

Usage:  python3 tools/make_layers.py songs/void            (writes songs/void/void-drums.mp3 and void-band.mp3)

The band layer is the original master minus the drum stem, so at full drums the two add back up to the real song,
untouched. Then list them in album.json:  "layers": ["void-drums", "void-band"]  (drums first).
"""
import sys, os, subprocess
import numpy as np
SONG = sys.argv[1].rstrip('/'); NAME = os.path.basename(SONG); SR = 44100
def load(f):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).reshape(-1, 2)
orig, drums = load(os.path.join(SONG, 'original.mp3')), load(os.path.join(SONG, 'stems', 'drums', 'drums.mp3'))
n = min(len(orig), len(drums)); orig, drums = orig[:n], drums[:n]
for name, x in [(f'{NAME}-drums', drums), (f'{NAME}-band', orig - drums)]:
    out = os.path.join(SONG, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '160k', out],
                   input=np.clip(x, -1, 1).astype(np.float32).tobytes(), check=True)
    print('wrote', out)
