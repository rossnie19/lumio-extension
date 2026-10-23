"""Record the Lumio demo scenes (v2): 2x resolution, a visible cursor driven by real mouse input,
and a timeline of markers so compose.py can line up camera moves and captions.

Each scene is its own page -> its own .webm in OUT, plus OUT/timeline.json.
Usage: python record2.py <extension dist dir> <demo dir>
"""
import json
import shutil
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

EXT = Path(sys.argv[1])
DEMO = Path(sys.argv[2])
OUT = DEMO / "raw2"
VIEW = {"width": 1920, "height": 1080}  # recorded big, output 1280x720: zooms crop real pixels
CLAIM = "Drinking coffee every day causes dehydration, because caffeine is a diuretic"
FAKE_NOW = datetime(2026, 10, 24, 15, 0)  # a Saturday, so the weekly chart has a full week of data

shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True)
timeline = {}


def ms(dt):
    return int(dt.timestamp() * 1000)


# --- sample data (same as the first version) ----------------------------------------------
def history():
    days = {
        "2026-10-05": (60, 2, 1), "2026-10-12": (45, 1, 0), "2026-10-15": (110, 3, 2),
        "2026-10-19": (52, 2, 1), "2026-10-20": (95, 3, 0), "2026-10-21": (40, 1, 2),
        "2026-10-22": (130, 4, 3), "2026-10-23": (75, 2, 1), "2026-10-24": (83, 3, 2),
    }
    out = {}
    for key, (minutes, sessions, claims) in days.items():
        a, b, c = round(minutes * 0.5), round(minutes * 0.25), round(minutes * 0.15)
        out[key] = {"minutes": minutes, "sessions": sessions, "claims": claims,
                    "domainMinutes": {"chatgpt.com": a, "claude.ai": b, "gemini.google.com": c, "perplexity.ai": minutes - a - b - c}}
    return out


def seed(sw, now_ms, **extra):
    data = {
        "petName": "LUMI", "installDate": now_ms - 12 * 86400000, "activeCharacter": {"id": "tikbalang"},
        "showPetOnAISites": True, "dailyHistory": history(), "lastAIViewTime": now_ms - 30000,
        "lastCompassUse": None, "currentSession": {"startedAt": now_ms - 15 * 60000, "activeMs": 15 * 60000},
    }
    data.update(extra)
    sw.evaluate("data => chrome.storage.local.set(data)", data)


FAKE_CLOCK = """(() => {
  const delta = %d - Date.now(); const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { a.length ? super(...a) : super(RealDate.now() + delta); }
    static now() { return RealDate.now() + delta; }
  }
  window.Date = FakeDate;
})();""" % ms(FAKE_NOW)

# a drawn cursor that follows the real (Playwright) mouse, with a ripple on every click
CURSOR = r"""(() => {
  const install = () => {
    if (document.getElementById('__demo_cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #__demo_cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
        transform: translate(-60px, -60px); filter: drop-shadow(1px 2px 2px rgba(0,0,0,.35)); }
      .__demo_ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 34px; height: 34px;
        margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid #F1BC4F; background: rgba(241,188,79,.25);
        animation: __demo_ripple .55s ease-out forwards; }
      @keyframes __demo_ripple { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }`;
    document.documentElement.appendChild(style);
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.innerHTML = '<svg width="24" height="32" viewBox="0 0 24 32"><path d="M3 2 L3 25 L9 19.5 L13.5 29.5 L17.5 27.7 L13 17.8 L21 17.8 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => {
      if (document.documentElement.lastElementChild !== c) document.documentElement.appendChild(c); // stay on top
      c.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`;
    }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div'); r.className = '__demo_ripple';
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();"""


class Scene:
    """one page = one video; remembers the mouse position and logs markers (seconds since page start)"""

    def __init__(self, ctx, name, fake_clock=False):
        self.name = name
        self.page = ctx.new_page()
        self.t0 = time.time()
        self.marks = {}
        self.pos = (960, 560)
        self.page.add_init_script(CURSOR)
        if fake_clock:
            self.page.add_init_script(FAKE_CLOCK)

    def mark(self, key):
        self.marks[key] = round(time.time() - self.t0, 2)

    def mark_pos(self, key, locator):
        x, y = self.center(locator)
        self.marks[f"{key}_x"], self.marks[f"{key}_y"] = round(x), round(y)

    def wait(self, seconds):
        self.page.wait_for_timeout(int(seconds * 1000))

    def glide(self, x, y, duration=0.8):
        """move the mouse along an eased path so the drawn cursor glides"""
        x0, y0 = self.pos
        steps = max(10, int(duration * 50))
        for i in range(1, steps + 1):
            t = i / steps
            e = t * t * (3 - 2 * t)
            self.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
            time.sleep(duration / steps)
        self.pos = (x, y)

    def center(self, locator):
        box = locator.bounding_box()
        return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

    def click_at(self, locator, duration=0.8):
        x, y = self.center(locator)
        self.glide(x, y, duration)
        self.wait(0.15)
        self.page.mouse.click(x, y)

    def wheel(self, dy, duration=1.2):
        steps = max(10, int(duration * 40))
        for _ in range(steps):
            self.page.mouse.wheel(0, dy / steps)
            time.sleep(duration / steps)

    def finish(self, out_dir):
        video = self.page.video
        self.page.close()
        path = out_dir / f"{len(timeline):02d}-{self.name}.webm"
        video.save_as(path)
        timeline[path.stem] = self.marks


def card_html(title, subtitle):
    heading = f"<h1>{title}</h1>" if title else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face {{ font-family: 'Lumio Pixel'; src: url('/fonts/press-start-2p.woff2'); }}
      @font-face {{ font-family: 'Lumio Text'; src: url('/fonts/vt323.woff2'); }}
      body {{ margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
             gap: 28px; background: #EAE3D2; color: #2E2219; font-family: 'Lumio Text', monospace; }}
      img {{ height: 150px; image-rendering: pixelated; animation: rise .9s ease-out both; }}
      h1 {{ margin: 0; font: 22px/1.4 'Lumio Pixel', monospace; animation: rise .9s .25s ease-out both; }}
      p {{ margin: 0; font-size: 36px; color: #6B5847; animation: rise .9s .45s ease-out both; }}
      @keyframes rise {{ from {{ opacity: 0; transform: translateY(16px); }} to {{ opacity: 1; transform: none; }} }}
    </style></head><body><img src="/assets/lumio-logo.png">{heading}<p>{subtitle}</p></body></html>"""


# right-click menu stand-in (the real one is browser UI, which isn't part of the page or the recording)
MENU = """([x, y, icon]) => {
  const short = 'Drinking coffee every day causes…';
  const m = document.createElement('div'); m.id = '__demo_menu';
  m.innerHTML = `<style>
    #__demo_menu { position: fixed; z-index: 2147483645; min-width: 300px; padding: 6px 0; background: #fff;
      border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.22), 0 0 0 1px rgba(0,0,0,.06);
      font: 13px/1 -apple-system, "Segoe UI", Roboto, sans-serif; color: #1f1f1f; animation: __m .12s ease-out; }
    @keyframes __m { from { opacity: 0; transform: scale(.97); } }
    #__demo_menu .i { display: flex; align-items: center; gap: 10px; padding: 8px 18px 8px 34px; }
    #__demo_menu .i:hover { background: #e8eaed; }
    #__demo_menu .i img { width: 16px; height: 16px; margin-left: -26px; image-rendering: pixelated; }
    #__demo_menu hr { border: 0; border-top: 1px solid #e3e3e3; margin: 5px 0; }</style>
    <div class="i">Copy</div><div class="i">Search the web for “${short}”</div><div class="i">Print…</div><hr>
    <div class="i" id="__demo_compass"><img src="${icon}">Check “${short}” with Compass</div><hr><div class="i">Inspect</div>`;
  m.style.left = x + 'px'; m.style.top = y + 'px';
  document.documentElement.appendChild(m);
}"""

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        tempfile.mkdtemp(), channel="chromium", headless=True, viewport=VIEW, device_scale_factor=1,
        record_video_dir=str(OUT / "tmp"), record_video_size=VIEW,
        args=[f"--disable-extensions-except={EXT}", f"--load-extension={EXT}"],
    )
    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker")
    ext_id = sw.url.split("/")[2]
    base = f"chrome-extension://{ext_id}"
    sw.evaluate("chrome.alarms.clearAll()")  # no background ticks changing the mood mid-scene

    ctx.route("https://chatgpt.com/**", lambda r: r.fulfill(path=str(DEMO / "chat.html")))
    ctx.route("https://lumio-demo.test/fonts/*", lambda r: r.fulfill(path=str(EXT / "assets/fonts" / r.request.url.split("/")[-1])))
    ctx.route("https://lumio-demo.test/assets/*", lambda r: r.fulfill(path=str(EXT / "assets" / r.request.url.split("/assets/")[-1])))
    cards = {}
    ctx.route("https://lumio-demo.test/card/*", lambda r: r.fulfill(body=cards[r.request.url.split("/")[-1]], content_type="text/html"))
    for page in ctx.pages:
        page.close()

    # 1. title card
    cards["title"] = card_html("", "A companion for smarter AI use")
    s = Scene(ctx, "title")
    s.page.goto("https://lumio-demo.test/card/title")
    s.mark("start")
    s.wait(4.2)
    s.finish(OUT)

    # 2. on an AI site: the walking pet, moods, Compass
    now = int(time.time() * 1000)
    seed(sw, now)
    s = Scene(ctx, "ai-site")
    page = s.page
    page.goto("https://chatgpt.com/c/demo")
    page.wait_for_selector("#lumio-pet-root", state="attached")
    page.mouse.move(*s.pos)
    s.mark("start")
    s.wait(2.4)
    pet = page.locator("#lumio-pet-root .pet")
    s.mark("to_pet")
    s.glide(*s.center(pet), duration=1.1)
    s.click_at(pet, duration=0.25)  # re-aim at the walking pet, then click
    s.mark("pet_click")
    s.mark_pos("pet", pet)
    s.wait(3.8)
    s.click_at(pet, duration=0.3)  # close the bubble
    s.glide(1400, 800, 0.6)

    s.mark("concerned")
    now = int(time.time() * 1000)
    sw.evaluate("t => chrome.storage.local.set({ lastAIViewTime: t, currentSession: { startedAt: t - 50*60000, activeMs: 50*60000 } })", now)
    s.wait(3.6)
    s.mark("idle")
    sw.evaluate("t => chrome.storage.local.set({ lastAIViewTime: t - 40*60000 })", now)
    s.wait(0.4)
    s.mark_pos("idle_pet", pet)
    s.wait(2.8)
    sw.evaluate("t => chrome.storage.local.set({ lastAIViewTime: t, currentSession: { startedAt: t, activeMs: 0 } })", now)

    # select the claim by dragging, then right-click -> Check with Compass
    rects = page.evaluate("""claim => {
        const node = document.getElementById('claim').firstChild;
        const start = node.textContent.indexOf('Drinking'), end = start + claim.length;
        const r = document.createRange();
        r.setStart(node, start); r.setEnd(node, start + 1); const a = r.getBoundingClientRect();
        r.setStart(node, end - 1); r.setEnd(node, end); const b = r.getBoundingClientRect();
        return [a.left, a.top + a.height / 2, b.right, b.top + b.height / 2];
    }""", CLAIM)
    s.mark("to_claim")
    s.glide(rects[0] - 1, rects[1], 0.9)
    page.mouse.down()
    s.glide(rects[2] + 1, rects[3], 1.3)
    page.mouse.up()
    s.mark("selected")
    s.wait(0.6)
    page.mouse.click(*s.pos, button="right")
    page.evaluate(MENU, [s.pos[0] + 2, s.pos[1] + 2, f"{base}/assets/icons/icon16.png"])
    s.mark("menu")
    s.wait(0.7)
    item = page.locator("#__demo_compass")
    s.click_at(item, duration=0.7)
    page.evaluate("document.getElementById('__demo_menu').remove()")
    # the real sidebar script with the real search results (the background normally injects it on the menu click)
    page.evaluate("""base => {
        window.chrome = Object.assign(window.chrome || {}, { runtime: {
          getURL: p => `${base}/${p}`, onMessage: { addListener: f => { window.__compassListener = f; } } } });
    }""", base)
    page.add_script_tag(path=str(EXT / "content-scripts/compass.js"))
    page.evaluate("text => window.__compassListener({ action: 'openCompass', text, requestId: 'demo' }, {}, () => {})", CLAIM)
    sw.evaluate("t => chrome.storage.local.set({ lastCompassUse: t })", int(time.time() * 1000))
    s.mark("sidebar")
    s.glide(1620, 420, 1.0)
    s.wait(1.0)
    results = json.loads((DEMO / "compass-results.json").read_text())
    page.evaluate("msg => window.__compassListener(msg, {}, () => {})", results)
    s.mark("results")
    s.wait(0.8)
    s.glide(1700, 560, 0.8)  # hover a paper card
    s.wait(1.3)
    s.mark("scroll")
    s.wheel(430, 1.6)
    s.wait(1.8)
    s.finish(OUT)

    # 3. toolbar popup, staged like a popup window over a dark browser backdrop
    seed(sw, ms(FAKE_NOW), lastCompassUse=ms(FAKE_NOW) - 60000)
    s = Scene(ctx, "popup", fake_clock=True)
    page = s.page
    page.goto(f"{base}/popup/popup.html")
    page.evaluate("""() => {
        document.documentElement.style.cssText = 'min-height:100vh; background:#2b2a33; display:flex; align-items:center; justify-content:center;';
        document.body.style.cssText += 'zoom:2; border-radius:8px; box-shadow:0 18px 50px rgba(0,0,0,.55);';
    }""")
    s.pos = (1650, 900)
    page.mouse.move(*s.pos)
    s.mark("start")
    s.wait(1.0)
    s.glide(*s.center(page.locator(".tile.bg-orange")), 0.9)
    s.mark("tiles")
    s.wait(1.3)
    s.glide(*s.center(page.locator("#open-dashboard")), 0.9)  # hover only: clicking would close this page
    s.mark("button")
    s.wait(1.5)
    s.finish(OUT)

    # 4. dashboard, staged as a side panel
    s = Scene(ctx, "dashboard", fake_clock=True)
    page = s.page
    page.goto(f"{base}/pages/dashboard/dashboard.html")
    page.evaluate("""() => {
        document.documentElement.style.cssText = 'background:#2b2a33; height:100vh; overflow:hidden;';
        document.body.style.cssText += 'zoom:2; width:400px; margin:0 170px 0 auto; height:calc(100vh / 2); overflow-y:auto; box-shadow:-10px 0 40px rgba(0,0,0,.5); scrollbar-width:none;';
    }""")
    page.wait_for_selector(".companion-card")
    s.pos = (600, 600)
    page.mouse.move(*s.pos)
    s.mark("start")
    s.wait(2.0)
    s.click_at(page.locator("details.guide summary"), 0.9)
    s.mark("guide")
    s.wait(0.6)
    s.wheel(420, 1.4)
    s.wait(1.8)
    s.click_at(page.get_by_role("tab", name="WEEK"), 0.9)
    page.evaluate("document.body.scrollTo({ top: 0 })")
    s.mark("week")
    s.wait(1.0)
    s.glide(*s.center(page.locator(".weekly-row").nth(3)), 0.8)
    s.wait(1.0)
    s.wheel(330, 1.3)
    s.wait(1.2)
    page.evaluate("document.body.scrollTo({ top: 0 })")
    s.click_at(page.get_by_role("tab", name="COMPASS"), 0.9)
    s.mark("compass")
    s.wait(1.4)
    s.wheel(300, 1.3)
    s.wait(1.5)
    page.evaluate("document.body.scrollTo({ top: 0 })")
    s.click_at(page.get_by_role("tab", name="PET"), 0.9)
    s.mark("pet")
    s.wait(1.0)
    nxt = page.get_by_role("button", name=">", exact=True)
    s.click_at(nxt, 0.8)
    s.wait(1.3)
    s.click_at(nxt, 0.4)
    s.wait(1.6)
    s.mark("end")
    s.finish(OUT)

    # 5. end card
    cards["end"] = card_html("STAY CURIOUS.", "Check your sources.")
    s = Scene(ctx, "end")
    s.page.goto("https://lumio-demo.test/card/end")
    s.mark("start")
    s.wait(4.2)
    s.finish(OUT)

    ctx.close()

shutil.rmtree(OUT / "tmp", ignore_errors=True)
(OUT / "timeline.json").write_text(json.dumps(timeline, indent=1))
print(json.dumps(timeline, indent=1))
