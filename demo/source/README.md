# Demo video source

`../lumio-demo.mp4` is a motion-graphics piece: an HTML/GSAP composition (`motion/motion.html`) using
crisp stills of the real extension UI, rendered frame by frame at 1920x1080, 30 fps.

- `capture.py` loads the built extension in Playwright's Chromium with sample data and saves 2x stills
  (popup, dashboard tabs, mood guide, Compass sidebar with real results, pet bubble, right-click menu)
  into `motion/assets/`. It borrows the sample data and helpers from `record2.py` and serves `chat.html`
  (a neutral stand-in chat page) at chatgpt.com inside the recording browser. `compass-results.json`
  holds real Compass search results.
- `motion/motion.html` is the animation: one paused GSAP timeline plus `renderAt(t)`, which also drives
  the sprite sheets and background pixels. Open it in a browser and call `renderAt(seconds)` to preview.
- `motion/render.py` steps through every frame (`renderAt(i / 30)`), screenshots it, and pipes the frames
  into ffmpeg (H.264).

```bash
python3 -m venv .venv && .venv/bin/pip install playwright imageio-ffmpeg pillow
.venv/bin/python -m playwright install chromium
(cd ../../lumio-extension && npm run build)
mkdir -p motion/assets && .venv/bin/python capture.py ../../lumio-extension/dist .   # re-capture UI stills (writes mg/assets)
.venv/bin/python motion/render.py motion/motion.html silent.mp4                       # render the picture
.venv/bin/pip install numpy scipy && .venv/bin/python motion/audio.py soundtrack.wav    # synthesize the soundtrack + effects
ffmpeg -i silent.mp4 -i soundtrack.wav -map 0:v -map 1:a -vf "scale=out_range=tv,format=yuv420p" -c:v libx264 -crf 18 -c:a aac -b:a 192k -shortest ../lumio-demo.mp4
```

Note: `capture.py` writes to `./mg/assets`; copy those files into `motion/assets` before rendering.
GSAP 3.12.5 (`motion/gsap.min.js`) is included under GreenSock's standard no-charge license.

The soundtrack and sound effects are synthesized by `motion/audio.py` (an original chiptune piece plus
small UI sounds), so there is nothing to license. Its timing constants mirror the `T2`-`T7` values in
`motion.html`; keep them in sync if you change the animation timing.
