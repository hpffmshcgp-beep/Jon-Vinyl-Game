# Star-Crossed — a Jon Vinyl rhythm game

A fan-made, old-Hollywood rhythm picture set to Jon Vinyl's music. Unofficial — music by Jon Vinyl.

**The story.** *Prologue — Star-Crossed:* Jon and the girl he loves have finally got away together on an ocean liner.
You start in their cabin — walk around, talk to her, make plans — then head up on deck for some air, where a faceless
stranger steps out of the casino and takes her. Jon chases them
across the ship on the beat (your score earns a rating and a high score, but the story always goes on) and gets her back at the bow. The stranger plays
the gracious loser and hands over a gift: the album *Lost in You*. Jon slides the record out, it starts to spin, and it
pulls him in. *The record:* a 3D map of the vinyl, one ring of grooves per song, only the next ring revealed.

**Play:** open `dist/Star-Crossed.html` after building, or upload `dist/Star-Crossed-itch.zip` to itch.io.

## How to play
- **Phone:** tap the **left** side for stars (snare and hi-hats), the **right** side for the kick drum.
- **Computer:** left hand **A S D F / ←**, right hand **J K L ; / →**.
- Five levels, like Beat Saber: Easy, Normal, Hard, Expert, Expert+.
- In the cabin, tap (or click) her, the door or anything in the room and Jon walks over.
- Play the chase on the beat; whatever you score, you reach the bow. Then walk to her and see what the stranger brings.
- Deflect: hearts fall down the left wall, heartbreaks down the right. Tap the other side (or ← →) to jump across right as one lands.

## Project layout
| Path | What it is |
|---|---|
| `game/src.html` | The whole game: code, drawing, audio, story. `__CHART__`, `__ALBUM__`, `__COVER__` are filled in at build time. |
| `game/map.js` | The 3D record map (Three.js), pulled into the page by the build. |
| `album/lost-in-you/` | `album.json` (tracklist and song lengths), `cover.jpg`, and `label.jpg` (the real record label). |
| `vendor/three.module.min.js` | Three.js 0.169.0 (MIT); the build turns it into a plain script inside every page. |
| `songs/star-crossed/chart.json` | Tempo, story timings and the five difficulty charts. |
| `songs/star-crossed/songplay.mp3`, `below.mp3` | The song, and the muffled band heard on the title screen. |
| `songs/star-crossed/stems/` | Separated drums (drumsep: kick, snare, hh, crash, toms, ride, residual), Demucs stems, vocals. |
| `songs/star-crossed/analysis/` | Every detected drum hit, used to make the charts. |
| `tools/` | `find_hits.py` → `make_charts.py` → `build.py`. |
| `songs/deflect/` | Track 3, Deflect: the song, guitar stems, guitar-hit analysis and its chart. |
| `game/deflect.js` | The Deflect level: Jon jumps between the two walls of a groove, dodging love and heartbreak. |
| `tests/` | Automated play-tests (Playwright). |

## Building
```bash
python3 tools/build.py            # makes dist/ (web build, itch zip, single-file HTML, artifact page)
```
Re-chart a song after changing its stems or the charting rules:
```bash
python3 tools/find_hits.py songs/star-crossed
python3 tools/make_charts.py songs/star-crossed
```
Needs Python 3 with `librosa`, `numpy`, `scipy`; `ffmpeg`.

## Testing
```bash
python3 -m http.server 8765 &     # from the repo root
cd tests && node left-right.test.js && node cold-open.test.js && node prologue.test.js && node map.test.js && node three-inline.test.js && node deflect.test.js && node levels.test.js
python3 ../tools/build.py && node standalone-file.test.js
```
Screenshots land in `test-output/`.

## Publishing to itch.io
New project → Kind of project: **HTML** → upload `dist/Star-Crossed-itch.zip` (index.html and the audio) → tick **"This file will be played in the
browser"** → embed size about 960 × 600, **Mobile friendly** and **Fullscreen button** on. Keep the page Draft/Restricted
until Jon has given his OK.
