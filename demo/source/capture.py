"""Capture crisp 2x stills of the real extension UI for the motion-graphics video.
Usage: python capture.py <extension dist dir> <demo dir>   -> <demo dir>/mg/assets/*.png
"""
import json
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

EXT, DEMO = Path(sys.argv[1]), Path(sys.argv[2])
OUT = DEMO / "mg" / "assets"
OUT.mkdir(parents=True, exist_ok=True)
FAKE_NOW = datetime(2026, 10, 24, 15, 0)
CLAIM = "Drinking coffee every day causes dehydration, because caffeine is a diuretic"

# reuse the sample data and the fake clock from the recording script
src = (DEMO / "record2.py").read_text()
ns = {"datetime": datetime, "time": time, "FAKE_NOW": FAKE_NOW}
exec(src[src.index("def ms(dt)"):src.index("# a drawn cursor")], ns)
history, seed, FAKE_CLOCK, ms = ns["history"], ns["seed"], ns["FAKE_CLOCK"], ns["ms"]
start = src.index('MENU = """')
exec(src[start:src.index('}"""', start) + 4], ns)
MENU = ns["MENU"]

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        tempfile.mkdtemp(), channel="chromium", headless=True, viewport={"width": 1280, "height": 900},
        device_scale_factor=2, args=[f"--disable-extensions-except={EXT}", f"--load-extension={EXT}"])
    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker")
    base = f"chrome-extension://{sw.url.split('/')[2]}"
    sw.evaluate("chrome.alarms.clearAll()")
    ctx.route("https://chatgpt.com/**", lambda r: r.fulfill(path=str(DEMO / "chat.html")))

    # --- popup ---
    seed(sw, ms(FAKE_NOW), lastCompassUse=ms(FAKE_NOW) - 60000)
    page = ctx.new_page()
    page.add_init_script(FAKE_CLOCK)
    page.goto(f"{base}/popup/popup.html")
    page.wait_for_timeout(800)
    page.evaluate("document.documentElement.style.background = 'transparent'")
    page.locator("body").screenshot(path=str(OUT / "popup.png"), omit_background=True)
    page.close()

    # --- dashboard tabs (panel width 400) ---
    page = ctx.new_page()
    page.set_viewport_size({"width": 400, "height": 900})
    page.add_init_script(FAKE_CLOCK)
    page.goto(f"{base}/pages/dashboard/dashboard.html")
    page.wait_for_selector(".companion-card")
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / "dash-today.png"), full_page=True)
    page.locator("details.guide summary").click()
    page.wait_for_timeout(300)
    page.locator("details.guide").screenshot(path=str(OUT / "dash-moodguide.png"))
    for tab in ["WEEK", "COMPASS", "PET"]:
        page.get_by_role("tab", name=tab).click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / f"dash-{tab.lower()}.png"), full_page=True)
    page.close()

    # --- AI site: pet bubble, right-click menu, Compass sidebar with real results ---
    now = int(time.time() * 1000)
    seed(sw, now)
    page = ctx.new_page()
    page.set_viewport_size({"width": 1280, "height": 1000})
    page.goto("https://chatgpt.com/c/demo")
    page.wait_for_selector("#lumio-pet-root", state="attached")
    page.wait_for_timeout(1200)
    page.locator("#lumio-pet-root .pet").dispatch_event("click")
    page.wait_for_timeout(500)
    page.locator("#lumio-pet-root .info").screenshot(path=str(OUT / "pet-bubble.png"))
    page.locator("#lumio-pet-root .pet").dispatch_event("click")
    page.evaluate("document.getElementById('lumio-pet-root').remove()")

    page.evaluate(MENU, [600, 300, f"{base}/assets/icons/icon16.png"])
    page.wait_for_timeout(300)
    page.locator("#__demo_menu").screenshot(path=str(OUT / "context-menu.png"))
    page.evaluate("document.getElementById('__demo_menu').remove()")

    page.evaluate("""base => {
        window.chrome = Object.assign(window.chrome || {}, { runtime: {
          getURL: p => `${base}/${p}`, onMessage: { addListener: f => { window.__compassListener = f; } } } });
    }""", base)
    page.add_script_tag(path=str(EXT / "content-scripts/compass.js"))
    page.evaluate("text => window.__compassListener({ action: 'openCompass', text, requestId: 'demo' }, {}, () => {})", CLAIM)
    page.wait_for_timeout(900)
    results = json.loads((DEMO / "compass-results.json").read_text())
    page.evaluate("msg => window.__compassListener(msg, {}, () => {})", results)
    page.wait_for_timeout(1200)
    page.locator("#lumio-compass-root").screenshot(path=str(OUT / "compass-sidebar.png"))
    ctx.close()

for f in sorted(OUT.glob("*.png")):
    from PIL import Image
    print(f.name, Image.open(f).size)
