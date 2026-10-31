#!/usr/bin/env python3
"""Build every version of the game from game/src.html + songs/star-crossed/.

Usage:  python3 tools/build.py

Writes (all in dist/, which is not committed):
  dist/web/                      index.html + songplay.mp3 + below.mp3 — the browser build (tests run against this)
  dist/Star-Crossed-itch.zip     the web build zipped for itch.io (Kind of project: HTML, "played in the browser")
  dist/Star-Crossed.html         one self-contained file with the audio embedded (works opened straight from disk)
  dist/artifact/index.html       the page body for the claude.ai artifact (publish it with every .mp3 in dist/artifact/)
"""
import base64, json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONG = os.path.join(ROOT, 'songs', 'star-crossed')
DIST = os.path.join(ROOT, 'dist')
AUDIO = ['songplay', 'below']

ALBUM_DIR = os.path.join(ROOT, 'album', 'lost-in-you')
THREE = os.path.join(ROOT, 'vendor', 'three.module.min.js')
src = open(os.path.join(ROOT, 'game', 'src.html')).read()
for inc in ['chase.js', 'map.js', 'deflect.js', 'surf.js']: src = src.replace('/*@include ' + inc + '*/', open(os.path.join(ROOT, 'game', inc)).read())
_TRACKS = [t for t in json.load(open(os.path.join(ROOT, 'album', 'lost-in-you', 'album.json')))['tracks'] if t.get('song')]
ALBUM_SONGS = [t['song'] for t in _TRACKS]
# the audio each album song ships: its mp3, or its layers (Void: drums + everything else, mixed live as you ride)
ALBUM_FILES = [(t['song'], f) for t in _TRACKS for f in (t.get('layers') or [t['song']])]
songs = {n: json.load(open(os.path.join(ROOT, 'songs', n, 'chart.json'))) for n in ALBUM_SONGS}   # each album song's chart
chart = json.load(open(os.path.join(SONG, 'chart.json')))
def cut_chart(c):   # the prologue skips part of the recording (meta.cut, in the recording's time): remap every time to the game's
    c0, c1 = c['meta']['cut']; d = c1 - c0
    m = lambda t: t if t < c0 else t - d if t >= c1 else c0
    keep = lambda ns: [[round(m(t), 4), l] for t, l in ns if not c0 <= t < c1]
    c['levels'] = {k: keep(v) for k, v in c['levels'].items()}; c['notes'] = keep(c['notes'])
    for k in ['finale', 'end']: c[k] = round(m(c[k]), 4)
    c['stages'] = [round(m(t), 4) for t in c['stages']]
    c['meta']['heart'] = round(m(c['meta']['heart']), 4)
    c['meta']['sections'] = [[round(m(a), 3), round(m(b), 3), n] for a, b, n in c['meta']['sections'] if m(b) - m(a) > 0.5]
    c['meta']['cutLen'] = round(d, 4)
    return c
if chart['meta'].get('cut'): chart = cut_chart(chart)
album = json.load(open(os.path.join(ALBUM_DIR, 'album.json')))
cover = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ALBUM_DIR, 'cover.jpg'), 'rb').read()).decode()
label = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ALBUM_DIR, 'label.jpg'), 'rb').read()).decode()   # the real record label
body = (src.replace('__CHART__', json.dumps(chart, separators=(',', ':')))
           .replace('__ALBUM__', json.dumps(album, separators=(',', ':')))
           .replace('__COVER__', cover)
           .replace('__LABEL__', label)
           .replace('__SONGS__', json.dumps(songs, separators=(',', ':'))))
for k in ['__CHART__', '__ALBUM__', '__COVER__', '__LABEL__', '__SONGS__', '@include']: assert k not in body, k

# three.js travels inside the page as an ordinary script (no module import), so it also runs in previews and sandboxes
# that block dynamic imports: the module's closing export{a as B,...} becomes window.THREE_MOD = {B: a, ...}
import re
three_mod = open(THREE).read(); i = three_mod.rfind('export{'); j = three_mod.index('}', i)
pairs = [p.strip().split(' as ') for p in three_mod[i + 7:j].split(',')]
three_classic = ("(function(){'use strict';" + three_mod[:i] + "window.THREE_MOD={" + ','.join(f'{b}:{a}' for a, b in pairs) + "};})();")
assert '</script' not in three_classic and 'export{' not in three_classic
main_tag = '<script>\nconst CHART = '
assert body.count(main_tag) == 1
body = body.replace(main_tag, '<script>' + three_classic + '</script>\n' + main_tag)

def page(b, head_extra=''):
    k = b.index('</style>') + len('</style>')
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Star-Crossed</title>\n'
            + b[:k].replace('</style>', 'body { margin: 0; }\n</style>') + '\n</head>\n<body>\n' + head_extra + b[k:] + '\n</body>\n</html>\n')

shutil.rmtree(DIST, ignore_errors=True)
for d in ['web', 'artifact']: os.makedirs(os.path.join(DIST, d))

# browser build + itch zip
open(os.path.join(DIST, 'web', 'index.html'), 'w').write(page(body))
for a in AUDIO:
    for d in ['web', 'artifact']: shutil.copy(os.path.join(SONG, a + '.mp3'), os.path.join(DIST, d, a + '.mp3'))
for n, f in ALBUM_FILES:
    for d in ['web', 'artifact']: shutil.copy(os.path.join(ROOT, 'songs', n, f + '.mp3'), os.path.join(DIST, d, f + '.mp3'))
with zipfile.ZipFile(os.path.join(DIST, 'Star-Crossed-itch.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for f in ['index.html'] + [a + '.mp3' for a in AUDIO] + [f + '.mp3' for n, f in ALBUM_FILES]: z.write(os.path.join(DIST, 'web', f), f)

# artifact body (the claude.ai publisher wraps it in its own page)
open(os.path.join(DIST, 'artifact', 'index.html'), 'w').write(body)

# single file with the audio embedded, so it plays from file:// where fetch() is blocked
old = "async function fetchProg(name){\n  const r = await fetch(name + '.mp3');"
assert body.count(old) == 1
emb = body.replace(old, """async function fetchProg(name){
  if (window.EMBED && EMBED[name]) {
    await new Promise(r => setTimeout(r, 0));
    const bin = atob(EMBED[name]), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    loadP[name] = 1; return out.buffer;
  }
  const r = await fetch(name + '.mp3');""")
embed = '<script>window.EMBED = ' + json.dumps({**{a: base64.b64encode(open(os.path.join(SONG, a + '.mp3'), 'rb').read()).decode() for a in AUDIO}, **{f: base64.b64encode(open(os.path.join(ROOT, 'songs', n, f + '.mp3'), 'rb').read()).decode() for n, f in ALBUM_FILES}}) + ';</script>\n'
open(os.path.join(DIST, 'Star-Crossed.html'), 'w').write(page(emb, embed))

for f in ['web/index.html', 'Star-Crossed-itch.zip', 'Star-Crossed.html', 'artifact/index.html']:
    print(f'{f:28s} {os.path.getsize(os.path.join(DIST, f))/1e6:6.2f} MB')
