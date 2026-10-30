#!/usr/bin/env python3
"""Build the five Beat Saber-style difficulty levels (easy, normal, hard, expert, expertplus) for a song
from analysis/drum_hits.json, and write them into chart.json. Times are the real attack of each hit:
nothing is snapped to a grid (Star-Crossed is swung, with triplet kicks).

Usage:  python3 tools/make_charts.py songs/<song-folder>
"""
import sys, os
SONG = sys.argv[1] if len(sys.argv) > 1 else 'songs/star-crossed'
import librosa, numpy as np, json
# Five Beat Saber-style levels charted from the separated drum kit (kick / snare / hi-hat / crash / toms / residual).
# Times are the real attack of each hit (the groove is swung, so nothing is snapped to a grid).
CHART=os.path.join(SONG, 'chart.json')
c=json.load(open(CHART)); M=c['meta']
SR=44100; H=64; fps=SR/H; ph=c['phase']; ib=60/c['bpm']
HITS={k:np.array(v) for k,v in json.load(open(os.path.join(SONG, 'analysis', 'drum_hits.json'))).items()}
last_t=M['heart']; T0=M['chartStart']          # the final heart note, and where the charted part begins
RISE={'kick':14}               # a real kick jumps >= 14 dB out of the quiet before it (808 body retriggers reach ~11)
def stem(n, lvl):
    h=HITS[n]; m=(h[:,1]>lvl)&(h[:,2]>=RISE.get(n,10))&(h[:,0]>=T0)&(h[:,0]<last_t-0.25); return h[m]
kickT=stem('kick',-24)[:,0]; anyT=np.sort(np.concatenate([stem(n,-24)[:,0] for n in ['kick','snare','hh']]))
def bleed(n,t):
    if n=='toms': return np.any(abs(kickT-t)<0.02)          # tom stem copies of the kick
    if n=='residual': return np.any(abs(anyT-t)<0.025)       # leftovers of a hit already charted
    return False
def beatpos(t):
    x=(t-ph)/ib; f=abs(x-round(x)); return 1.0 if f*ib<0.04 else 0.5 if abs(f-0.5)*ib<0.05 else 0.0
LANE={'kick':1,'toms':1,'snare':0,'hh':0,'crash':0,'residual':0}
BASE={'kick':3.0,'snare':3.2,'hh':2.0,'toms':1.9,'crash':1.6,'residual':1.3}
# drumless stretches (intro pads, the breakdown, the outro) borrow vocal syllables and the band
v,_=librosa.load(os.path.join(SONG, 'stems', 'vocals.mp3'),sr=SR,mono=True)
oe=librosa.onset.onset_strength(y=v,sr=SR,hop_length=H)
on=librosa.onset.onset_detect(onset_envelope=oe,sr=SR,hop_length=H,delta=0.05,wait=int(.16*fps))
vr=librosa.feature.rms(y=v,frame_length=512,hop_length=H)[0]
drumless=lambda t: not np.any(abs(anyT-t)<ib*0.9)
fill=[]
for f in on:
    lo=max(0,f-int(.04*fps)); seg=vr[lo:f+int(.04*fps)]; p=np.argmax(seg); base=seg[:max(1,p)].min(); top=seg[p]
    if top < np.percentile(vr,40) or top < base*1.2: continue
    t=(lo+np.argmax(seg[:p+1]>=base+(top-base)*.5))/fps
    if T0<=t<last_t-0.25 and drumless(t): fill.append((t,0,1.0+0.5*beatpos(t)))
O=np.load(os.path.join(SONG, 'analysis', 'other_hits.npy'))   # [time, level] hits in the band (Demucs 'other') stem
for t,l in O:
    if T0<=t<last_t-0.25 and drumless(t) and l>np.percentile(O[:,1],30): fill.append((t,1,1.1+0.5*beatpos(t)))

ALL=lambda lv: {n:lv+o for n,o in dict(kick=0,snare=0,hh=0,residual=2,crash=2,toms=4).items()}
LEVELS={  # every stem, louder-than floor (dB under the stem's loudest hits); gap same lane / any lane; on-beat bonus
 'easy':      dict(stems=ALL(-12), same=1.25, any=.8, beat=2.0),
 'normal':    dict(stems=ALL(-16), same=.40, any=.27, beat=1.0),
 'hard':      dict(stems=ALL(-18), same=.30, any=.21, beat=0.5),
 'expert':    dict(stems=ALL(-24), same=.165, any=.12, beat=0.15),
 'expertplus':dict(stems=ALL(-30), same=.115, any=.085, beat=0.0),
}
SECT=[tuple(x) for x in M['sections']]
allhits=np.sort(np.concatenate([stem(n,-24)[:,0] for n in ['kick','snare','hh']]))
levels={}
for name,L in LEVELS.items():
    cand=[]
    for n,lvl in L['stems'].items():
        for t,l,r in stem(n,lvl):
            if bleed(n,t): continue
            cand.append((t, LANE[n], BASE[n] + l/20 + L['beat']*beatpos(t)))
    cand += [(t,ln,p - (0 if name in ('easy','normal') else 0.3)) for t,ln,p in fill]
    cand.sort(key=lambda x:-x[2]); out=[]; T=np.array([]); Ln=np.array([])
    for t,ln,p in cand:          # most important hits first; anything too close to an accepted note is skipped
        if len(T):
            d=abs(T-t)
            if np.any(d<L['any']) or np.any((d<L['same'])&(Ln==ln)): continue
        out.append((t,ln)); T=np.append(T,t); Ln=np.append(Ln,ln)
    out.sort(); res=[[round(float(t),4),int(l)] for t,l in out]+[[last_t,2]]
    tt=np.array([x[0] for x in res]); levels[name]=res
    cov=np.mean([np.min(abs(tt-t))<0.03 for t in allhits])
    print(f'{name:11s} {len(res):4d} notes {len(res)/(last_t-T0):.2f}/s  drum-hit coverage {cov*100:3.0f}%  |',
          ' '.join(f'{nm.split()[0][:5]}{nm.split()[-1][0] if nm[-1].isdigit() else ""} {np.sum((tt>=a)&(tt<b))/(b-a):.1f}' for a,b,nm in SECT))
c['levels']=levels; c['notes']=levels['normal']; c.pop('hard',None)
json.dump(c, open(CHART, 'w'))
print('wrote', CHART)
