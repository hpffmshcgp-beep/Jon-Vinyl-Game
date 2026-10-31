# Publishing to itch.io

1. `npm run build`
2. New project → Kind of project: **HTML** → upload `dist/Star-Crossed-itch.zip` (index.html and the audio).
3. Tick **"This file will be played in the browser"**. Set the embed size to about 960 × 600, and turn on **Mobile friendly** and **Fullscreen button**.
4. Keep the page **Draft / Restricted** until Jon has given his OK.

`dist/Star-Crossed.html` is the same game as one self-contained file (audio and Three.js embedded). It plays offline when opened from disk.

## Re-charting a song

```bash
python3 tools/find_hits.py songs/star-crossed          # drum hits from the drumsep stems
python3 tools/make_charts.py songs/star-crossed        # the prologue's five charts
python3 tools/find_guitar_hits.py songs/deflect <stems…> && python3 tools/make_deflect_chart.py songs/deflect
python3 tools/make_surf_chart.py songs/void
python3 tools/make_layers.py songs/void                 # drums + everything else, mixed live in the level
```
