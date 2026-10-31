# Notes for Claude — Star-Crossed (Jon Vinyl rhythm game)

Read README.md for layout, build and test commands. This file holds the decisions and the person's preferences.

## Who and what
- Fan-made rhythm game for the artist **Jon Vinyl** (J-O-N-V-I-N-Y-L), song "Star-Crossed". The owner wants to show it to
  Jon and publish it on **itch.io** as a browser game. Their one priority: **quality**.
- Plain HTML5 canvas + Web Audio in one file (`game/src.html`). No framework, no bundler. Built by `tools/build.py`.
- A claude.ai artifact of the game exists: https://claude.ai/artifact/5uJ4etxKaX4oRgAR5KNujo — publish
  `dist/artifact/index.html` with `songplay.mp3`, `below.mp3` and each album song's mp3 (`deflect.mp3`, `void.mp3`) as files (read it first from a new conversation).

## Story and look
- Old-Hollywood romance on an ocean liner ("DiCaprio and Winslet on Titanic, classic"). Sepia verses, colour choruses,
  film grain, letterbox. Acts: I The Bluff (poker chips), II Act Like It, III Old Soul, IV No Fool, Finale Star-Crossed.
- **The prologue sets up the story; the score never blocks it.** Score, combo, high score (per difficulty) and a 5-star
  rating are kept; after the pull an end title shows the reviews (stars, line, score, "NEW HIGH SCORE"), tap to go on.
  No pass/fail, no results panel, **nothing is skippable**.
- **Opening, part 1 — their cabin (playable)**: wood-panelled stateroom, brass portholes onto the sunset, bed, framed photo
  of them, turntable on a side table, two stacked suitcases + hatbox, the door. Walk left/right; an action button
  (E / Space / Enter / ↑ on keyboard, an on-screen button on phones) talks or looks. **Tap or click the thing itself**
  (her, the door, turntable, suitcases, either porthole) and Jon walks over and talks/looks (`cabinTap`/`cabinHit`);
  tapping the floor walks there. At the bow a tap sends him to her; holding anywhere slides the record out (phones). Talking to her: they finally got away
  together — "No one knows we're on this ship", "Every time we got close, something pulled us apart" (the unknown force),
  plans for when they dock (his record store, dinner, "the long way home"), then "Let's go up on deck… fresh air". Before
  that the door says "Not without her."; after it the door is the only goal (it glows): open it and they walk out.
- **Opening, part 2 — the deck (cutscene, auto)**: they step out to the rail at sunset ("Look at that sky." / "Worth every
  mile."), then **the stranger** (faceless: long coat, fedora, face a void; speaker "???", purple box) steps out of the
  casino door: "I'm afraid she can't be with you," and drags her away ("Jon—!"); Jon runs after them; fade.
- **How-to pop-up** (the three bubbles: Catch left / Kick right / Find her) → "Start the chase" → the song starts
  (title cards over Jon alone, "She's somewhere on this ship."). The lobby panel now just picks difficulty and timing.
- **The chase** (Star-Crossed): glimpses (`GLIMPSE`) show him dragging her by the wrist while she pulls back toward Jon
  (Bowser/Peach). At the end he holds her at the bow.
- **The bow**: hold right to walk up; she breaks free and runs to Jon; reunion lines call back the plans; the stranger
  strolls over all smiles ("Alright, you win. Fair and square." / "No hard feelings?") and gives the album **Lost in
  You** (real cover, `album/lost-in-you/cover.jpg`); close-up, hold right to slide the record out, it spins up, a vortex
  pulls Jon in  **No Sterling and no queen-of-hearts card — both removed.**
- **The record map** (`game/map.js`, Three.js): made to match the real pressing — black vinyl, the real orange label
  (`album/lost-in-you/label.jpg`, cut from the owner's photo: "Jon Vinyl" signature, LOST IN YOU, VINYL RECORDINGS, INC.,
  33⅓ RPM, the tracklist, the legal text round the rim) turned to read upright toward the camera, and visible smooth gaps
  between songs. Ring widths follow each song's length (`seconds` in album.json; estimates until measured). Jon is the
  painted 2D figure on a billboard; one band per track (7 songs + Outro), locked bands under a dark veil, only the next band revealed; dotted spiral path,
  a stop per track with its stars, tonearm swinging over your band, heart over the label (home), amber void like the cover.
  Camera: high and pulled back so the **whole record is in view** with Jon on the near side (owner: not zoomed in); the
  tonearm's stand follows the camera round to the back right so it never blocks the view; the tag of the stop Jon is
  on floats over his head.
- **Stars**: any difficulty; 1★ clear, 2★ ≥ 85 % accuracy, 3★ ≥ 95 % (`starsFor`). Beating a song (1★) reveals the next
  band; the **Outro** is an escape cutscene, unlocked by 3★ on all 7 songs. Progress in localStorage `jv-progress`.
- Tracklist (from the label): 1 Chrome Hearts, 2 Stacy, 3 Deflect, 4 Void, 5 Always, 6 Told You, 7 All Bad, 8 Outro (54 s).
  Album ~16 min (Apple Music). Measure each song's length when it arrives and set `seconds`, `measured: true`.
- Jon: one cohesive two-pass painted figure (ink silhouette, then fills). Photo-like ribbed V-neck sweater vest (coral
  blobs, pale blue patches), coil-textured hair, shades, jeans, chunky retro sand high-top sneakers. No watch.

## Album levels
- **Track 3 · Deflect** (`songs/deflect`, `game/deflect.js`): Beatblock-style. Jon stands on the record's label; a golden
  shield circles him; **hearts = rhythm guitar strums, heartbreaks = lead guitar notes**, both deflected; they fly in from
  8 directions and land on the measured attack. Aim: mouse (points), arrows/WASD (8 dirs), or on phones **tap where it's
  coming from** — snaps to the nearest of the 8 directions; hold and slide to follow; taps on Jon ignored (`levelTouch`).
  Owner tried and rejected: drag-around-Jon (unsnapped), slide-like-a-dial, and a wall-jumping redesign (reverted).
  Centre of the shield (±14°) = PERFECT, edge (±34°) = GOOD, 70 ms grace. Directions follow the lead melody (up the neck →
  clockwise) and strum runs spin around; each level caps turn size/speed (`tools/make_deflect_chart.py`).
  Charts: easy 92, normal 135, hard 207, expert 278, expertplus 388; fly-in 1.9/1.6/1.4/1.2/1.05 s (owner: not slower —
  the small centre alone gives them more screen time). Small centre (shield radius ~15 % of the screen). The level ends 2.4 s after the last note (guitars stop
  ~105 s; the rest is vocals) with a music fade, then results. The song is played live (no strict grid).
  Owner's files: full song + lead and rhythm guitar stems (mvsep); background vocals are only in the full song.
- **Track 4 · Void** (`songs/void`, `game/surf.js`, `tools/make_surf_chart.py`): a surf level, the owner's pick of
  three ideas ("hold to ride"). Owner: F minor, 130.4 BPM (half-time groove, relaxed); vibe = sunset surfing, *no lyric
  text in the game*. Side view: Jon on a board riding a long wave that curls behind him; over the song the sun sets
  ahead and the moon rises behind (stars come out), a liner sails the horizon. **Hold anywhere / any key to climb the
  face, let go to carve down** (`rise` 0.36 s for 0.12→0.88, 50 ms ease). Ground gems on the measured drum attacks:
  kick = low 0.12 (teal), hi-hat = 0.37 (rose, hard+ only), snare = 0.62 (gold). **Riding up to the lip (1.0) launches
  him himself, anywhere** (owner asked: "go in the air all by himself", "a lot more" air): always the same arc (4 beats,
  0.8 above the lip), so the chart puts a launch star on the lip on a strong hit and an arc of gems on the drum hits
  (airs every ~9.5/7.3/6.2/5.6/5.1 s by level, the 5 big moments always included). In the air **a new press = backflip
  while held** (2π per 0.7 s; a hold carried over from the climb doesn't flip, a hold from the air doesn't climb after
  landing); let go and the board settles into the jump's line if within 0.9 rad. **Land within ±0.78 rad or the board
  catches and he wipes out**; 3 boards (lives) — owner's pick — then the song is over ("wiped out", no stars, Try again).
  Flips score 1000 each × multiplier, not accuracy. Gems ±0.10 PERFECT, ±0.21 GOOD (height). Gems: easy 99, normal 133,
  hard 196, expert 251, expertplus 343; scroll 2.6/2.3/2.0/1.8/1.6 s. Physics runs on the song clock. Intro 0–14.5 s has
  no gems. Ends ~2 s after the last note with a fade. Surf stance: `drawJon(..., {surf:true})`.
  Owner's files: full song, drumsep stems (kick/snare/hh/crash/toms/ride/residual), Demucs bass/music/vocals.
- Results (album songs): 3 stars from accuracy (perfect 1, good 0.7), score, high score per track+difficulty; "Back to
  the record" / "Play again". Songs not added yet don't block the way on the map; ◀ ▶ walk between reached stops.
- Pipeline for a guitar song: `find_guitar_hits.py songs/<s> <stems…>` → `make_deflect_chart.py songs/<s>`; set
  `song`, `seconds`, `measured` in album.json; the build ships `songs/<s>/<s>.mp3` (160 kbps) and the chart.

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

## The pull-in (end of the prologue)
- `PULL` timeline (~8.4 s): the record rises behind Jon and sucks in petals and sparks; he leans away and reaches for her;
  she grabs his hand (a glow where they hold on), it slips ("Jon—!"), he's lifted, spun and shrunk into the label;
  the stranger: "Enjoy the album."; white flash; a fall through rushing rings of groove with Jon tumbling; then the
  reviews end title and the map (where he drops onto the record).

## Gotchas
- three.js is built INTO every page as a plain script (`window.THREE_MOD`), never a dynamic `import()`: the Claude
  app's file preview and other sandboxes block blob/module imports ("Failed to fetch dynamically imported module").

## Working rules
- After a change: `python3 tools/build.py`, serve the repo root on 8765, run the tests in `tests/`, look at screenshots in
  `test-output/` before calling it done. Check both desktop and phone sizes.
- Commit with a clear message and push to `main` when a piece of work is finished.
