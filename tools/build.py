#!/usr/bin/env python3
"""Build every version of the game from game/src.html + songs/star-crossed/.

Usage:  python3 tools/build.py

Writes (all in dist/, which is not committed):
  dist/web/                      index.html + songplay.mp3 + below.mp3 — the browser build (tests run against this)
  dist/Star-Crossed-itch.zip     the web build zipped for itch.io (Kind of project: HTML, "played in the browser")
  dist/Star-Crossed.html         one self-contained file with the audio embedded (works opened straight from disk)
  dist/artifact/index.html       the page body for the claude.ai artifact (publish it with songplay.mp3 + below.mp3)
"""
import base64, json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONG = os.path.join(ROOT, 'songs', 'star-crossed')
DIST = os.path.join(ROOT, 'dist')
AUDIO = ['songplay', 'below']

ALBUM_DIR = os.path.join(ROOT, 'album', 'lost-in-you')
THREE = os.path.join(ROOT, 'vendor', 'three.module.min.js')
src = open(os.path.join(ROOT, 'game', 'src.html')).read()
for inc in ['map.js', 'deflect.js']: src = src.replace('/*@include ' + inc + '*/', open(os.path.join(ROOT, 'game', inc)).read())
ALBUM_SONGS = [t['song'] for t in json.load(open(os.path.join(ROOT, 'album', 'lost-in-you', 'album.json')))['tracks'] if t.get('song')]
songs = {n: json.load(open(os.path.join(ROOT, 'songs', n, 'chart.json'))) for n in ALBUM_SONGS}   # each album song's chart
chart = json.load(open(os.path.join(SONG, 'chart.json')))
album = json.load(open(os.path.join(ALBUM_DIR, 'album.json')))
cover = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ALBUM_DIR, 'cover.jpg'), 'rb').read()).decode()
label = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ALBUM_DIR, 'label.jpg'), 'rb').read()).decode()   # the real record label
body = (src.replace('__CHART__', json.dumps(chart, separators=(',', ':')))
           .replace('__ALBUM__', json.dumps(album, separators=(',', ':')))
           .replace('__COVER__', cover)
           .replace('__LABEL__', label)
           .replace('__SONGS__', json.dumps(songs, separators=(',', ':'))))
for k in ['__CHART__', '__ALBUM__', '__COVER__', '__LABEL__', '__SONGS__', '@include']: assert k not in body, k

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
for d in ['web', 'artifact']: shutil.copy(THREE, os.path.join(DIST, d, 'three.module.min.js'))   # 3D for the record map
for n in ALBUM_SONGS:
    for d in ['web', 'artifact']: shutil.copy(os.path.join(ROOT, 'songs', n, n + '.mp3'), os.path.join(DIST, d, n + '.mp3'))
with zipfile.ZipFile(os.path.join(DIST, 'Star-Crossed-itch.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for f in ['index.html', 'three.module.min.js'] + [a + '.mp3' for a in AUDIO + ALBUM_SONGS]: z.write(os.path.join(DIST, 'web', f), f)

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
three_src = open(THREE).read(); assert '</script' not in three_src
embed = '<script type="text/plain" id="three-src">' + three_src + '</script>\n' + '<script>window.EMBED = ' + json.dumps({**{a: base64.b64encode(open(os.path.join(SONG, a + '.mp3'), 'rb').read()).decode() for a in AUDIO}, **{n: base64.b64encode(open(os.path.join(ROOT, 'songs', n, n + '.mp3'), 'rb').read()).decode() for n in ALBUM_SONGS}}) + ';</script>\n'
open(os.path.join(DIST, 'Star-Crossed.html'), 'w').write(page(emb, embed))

for f in ['web/index.html', 'Star-Crossed-itch.zip', 'Star-Crossed.html', 'artifact/index.html']:
    print(f'{f:28s} {os.path.getsize(os.path.join(DIST, f))/1e6:6.2f} MB')
