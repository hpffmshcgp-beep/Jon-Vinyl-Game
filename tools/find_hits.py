#!/usr/bin/env python3
"""Find every drum hit in a song's separated drum stems (stems/drums/*.mp3, from drumsep).
Writes analysis/drum_hits.json: per stem, [time of the attack, level in dB under the stem's loudest hits, rise in dB].

Usage:  python3 tools/find_hits.py songs/<song-folder>
"""
import sys, os
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/star-crossed'
import librosa, numpy as np, json
from scipy.ndimage import maximum_filter1d
SR=44100; H=64; fps=SR/H
FR={'kick':(20,8000),'snare':(150,12000),'hh':(4000,20000),'crash':(3000,20000),'toms':(60,8000),'residual':(100,16000)}
out={}
for n,(fmin,fmax) in FR.items():
    y,_=librosa.load(os.path.join(SONG, 'stems', 'drums', n + '.mp3'),sr=SR,mono=True)
    S=librosa.feature.melspectrogram(y=y,sr=SR,n_fft=1024,hop_length=H,n_mels=64,fmin=fmin,fmax=fmax)
    oe=librosa.onset.onset_strength(S=librosa.power_to_db(S,ref=np.max(S)),sr=SR,hop_length=H,lag=1,max_size=1)
    pk=librosa.util.peak_pick(oe,pre_max=int(.03*fps),post_max=int(.03*fps),pre_avg=int(.1*fps),post_avg=int(.1*fps),delta=np.percentile(oe,90)*0.2,wait=int(.05*fps))
    a=np.abs(y); env=maximum_filter1d(a,int(.002*SR))        # 2 ms envelope
    hits=[]
    for p in pk:
        c=p*H
        if c>=len(a)-SR//10: continue
        peak=a[max(0,c-int(.01*SR)):c+int(.04*SR)].max()
        quiet=env[max(0,c-int(.05*SR)):max(1,c-int(.005*SR))].min()
        lo=max(0,c-int(.03*SR)); seg=env[lo:c+int(.03*SR)]
        k=lo+np.argmax(seg>=quiet+(peak-quiet)*0.2)        # where the attack clears 20% of its rise
        pk2=a[k:k+int(.03*SR)].max(); q2=env[max(0,k-int(.03*SR)):k+1].min()
        hits.append((k/SR, 20*np.log10(pk2+1e-9), 20*np.log10((pk2+1e-9)/(q2+1e-9))))
    h=np.array(sorted(hits))
    # merge duplicates within 25 ms (keep loudest)
    m=[]
    for x in h:
        if m and x[0]-m[-1][0]<0.025:
            if x[1]>m[-1][1]: m[-1]=x
        else: m.append(x)
    h=np.array(m); ref=np.percentile(h[:,1],99); h[:,1]-=ref       # level relative to the stem's loudest hits
    out[n]=h.tolist()
    print(f'{n:9s} {len(h):4d} cand; >-12dB {np.sum(h[:,1]>-12)}  >-20dB {np.sum(h[:,1]>-20)}  >-30dB {np.sum(h[:,1]>-30)}')
json.dump(out, open(os.path.join(SONG, 'analysis', 'drum_hits.json'), 'w'))
print('wrote', os.path.join(SONG, 'analysis', 'drum_hits.json'))
