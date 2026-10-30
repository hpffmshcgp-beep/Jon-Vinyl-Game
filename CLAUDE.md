# Notes for Claude — Star-Crossed (Jon Vinyl rhythm game)

Read README.md for layout, build and test commands. This file holds the decisions and the person's preferences.

## Who and what
- Fan-made rhythm game for the artist **Jon Vinyl** (J-O-N-V-I-N-Y-L), song "Star-Crossed". The owner wants to show it to
  Jon and publish it on **itch.io** as a browser game. Their one priority: **quality**.
- Plain HTML5 canvas + Web Audio in one file (`game/src.html`). No framework, no bundler. Built by `tools/build.py`.
- A claude.ai artifact of the game exists: https://claude.ai/artifact/5uJ4etxKaX4oRgAR5KNujo — publish
  `dist/artifact/index.html` with `songplay.mp3`, `below.mp3`, `three.module.min.js` as files (read it first from a new conversation).

## Story and look
- Old-Hollywood romance on an ocean liner ("DiCaprio and Winslet on Titanic, classic"). Sepia verses, colour choruses,
  film grain, letterbox. Acts: I The Bluff (poker chips), II Act Like It, III Old Soul, IV No Fool, Finale Star-Crossed.
- **The prologue only sets up the story: no score, no pass/fail, no results card — whatever you hit, you move on.**
  The HUD shows combo, difficulty, the act, and a chase line (time, not points) toward a heart.
- **Opening** (playable, before the music, sea + band ambience, Skip button): Jon walks over to her at the rail (hold
  right); they already know and like each other and make plans for when the ship docks (his record store, dinner, "the
  long way home" — no "date" said outright); a heart, colour blooms. Then **the stranger** (faceless: long coat, fedora,
  face a void; speaker "???", purple box) steps out of the casino door: "I'm afraid she can't be with you," and drags her
  away; "Jon—!"; Jon runs after them; fade → the song starts (title cards over Jon alone, "She's somewhere on this ship.").
- **The chase** (Star-Crossed): glimpses (`GLIMPSE`) show him dragging her by the wrist while she pulls back toward Jon
  (Bowser/Peach). At the end he holds her at the bow.
- **The bow**: hold right to walk up; she breaks free and runs to Jon; reunion lines call back the plans; the stranger
  strolls over all smiles ("Alright, you win. Fair and square." / "No hard feelings?") and gives the album **Lost in
  You** (real cover, `album/lost-in-you/cover.jpg`); close-up, hold right to slide the record out, it spins up, a vortex
  pulls Jon in (her: "Jon—!"), whiteout → straight to the map. **No Sterling and no queen-of-hearts card — both removed.**
- **The record map** (`game/map.js`, Three.js): made to match the real pressing — black vinyl, the real orange label
  (`album/lost-in-you/label.jpg`, cut from the owner's photo: "Jon Vinyl" signature, LOST IN YOU, VINYL RECORDINGS, INC.,
  33⅓ RPM, the tracklist, the legal text round the rim) turned to read upright toward the camera, and visible smooth gaps
  between songs. Ring widths follow each song's length (`seconds` in album.json; estimates until measured). Jon is the
  painted 2D figure on a billboard; one band per track (7 songs + Outro), locked bands under a dark veil, only the next band revealed; dotted spiral path,
  a stop per track with its stars, tonearm swinging over your band, heart over the label (home), amber void like the cover.
- **Stars**: any difficulty; 1★ clear, 2★ ≥ 85 % accuracy, 3★ ≥ 95 % (`starsFor`). Beating a song (1★) reveals the next
  band; the **Outro** is an escape cutscene, unlocked by 3★ on all 7 songs. Progress in localStorage `jv-progress`.
- Tracklist (from the label): 1 Chrome Hearts, 2 Stacy, 3 Deflect, 4 Void, 5 Always, 6 Told You, 7 All Bad, 8 Outro (54 s).
  Album ~16 min (Apple Music). Measure each song's length when it arrives and set `seconds`, `measured: true`.
- Jon: one cohesive two-pass painted figure (ink silhouette, then fills). Photo-like ribbed V-neck sweater vest (coral
  blobs, pale blue patches), coil-textured hair, shades, jeans, chunky retro sand high-top sneakers. No watch.

## Things the owner asked for / against (keep honouring these)
- No intermission, no 3-2-1 film leader. No "the house wins" ending text. No sunglasses power-up (he still wears shades).
- Sound effects are tuned to E♭ minor; reuse the existing ones rather than adding new sounds unless asked.
- Shoes: generic retro high-top — do not copy the Jordan 4 design 1:1 (Nike's design).
- Title/how-to screens: few words, three bubbles, silent-mode reminder as an icon on phones.
- Controls: **left side / left hand = stars (lane 0: snare, hi-hats); right side / right hand = kick (lane 1)**.
  Final heart note (lane 2) takes either side.

## Timing and charts (hard-won — don't regress)
- Tempo 94.5 BPM, phase 0.077 s. The groove is **swung with triplet kicks**: never snap notes to a 16th grid.
  Notes sit on the measured attack of each hit in the drumsep stems (`tools/find_hits.py`), 20 % of the rise on a 2 ms
  envelope; kick needs a ≥14 dB rise (808 body retriggers reach ~11 dB).
- Five levels from `tools/make_charts.py`: easy 123, normal 215, hard 295, expert 403, expertplus 507 notes.
- Audio clock: `heardCtx()` uses `getOutputTimestamp()` with latency fallback; per-player calibration (`sc-delay`),
  results screen offers "Fix my timing".
- The game plays the original song file (`songplay.mp3`); `below.mp3` is the band stem used muffled on the title screen.

## Roadmap the owner described
- Built in parts. Part 1 (done): story beats, gift, pull-in, map, progress. Part 2: a general album-song level engine
  + the first album song (its own setting), results with 3 stars. Part 3: map polish (walking between stops, unlock
  animations). Then one song at a time; finally the Outro escape.
- A longer game (~16 more minutes of songs, ~5–6 tracks) in the browser for itch.io: the stranger gives Jon an album as a fake
  gift, Jon is pulled into the vinyl as he slides it out, and must beat each song to escape. A 3D level map across the
  record (Three.js, Mario 3D World-style camera); records play outside-in, so Jon walks the groove from the rim toward the
  label, one song per band, forward only.
- For each new song we need: the MP3, its drumsep stems (kick/snare/hh/crash/toms/ride/residual), ideally Demucs
  vocals/other, and a line about what the song means.

## Working rules
- After a change: `python3 tools/build.py`, serve the repo root on 8765, run the tests in `tests/`, look at screenshots in
  `test-output/` before calling it done. Check both desktop and phone sizes.
- Commit with a clear message and push to `main` when a piece of work is finished.
