"""Render motion.html frame by frame (deterministic: renderAt(t) per frame) into an MP4.
Usage: python render.py <motion.html> <out.mp4> [--stills t1,t2,...]   (stills: PNGs for review instead)
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

html, out = Path(sys.argv[1]).resolve(), sys.argv[2]
stills = [float(x) for x in sys.argv[4].split(",")] if len(sys.argv) > 4 and sys.argv[3] == "--stills" else None
FPS = 30

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chromium", headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    page.goto(html.as_uri())
    page.evaluate("document.fonts.ready")
    page.wait_for_function("[...document.images].every(i => i.complete)")
    duration = page.evaluate("window.DURATION")
    if stills:
        for t in stills:
            page.evaluate(f"renderAt({t})")
            page.screenshot(path=f"{out}-{t:05.1f}.png")
        print("stills done; duration", duration)
    else:
        ff = subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg",
                               "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                               "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
        frames = int(duration * FPS)
        for i in range(frames):
            page.evaluate(f"renderAt({i / FPS})")
            ff.stdin.write(page.screenshot(type="jpeg", quality=94))
            if i % 300 == 0:
                print(f"{i}/{frames}", flush=True)
        ff.stdin.close()
        ff.wait()
        print(f"done: {frames / FPS:.1f}s -> {out}")
    browser.close()
