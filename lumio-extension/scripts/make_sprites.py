"""Generate simple sprite sheets from the still companion portraits.

Each sheet is one row of 4 square frames:
  0 = eyes open, 1 = eyes closed (blink / sleep), 2 + 3 = movement frames (character-specific)
The walking pet (public/content-scripts/pet.js) plays these frames.

Needs Pillow (pip install pillow). Regenerate after changing a portrait, from lumio-extension/:
  python scripts/make_sprites.py public/assets/companion public/assets/companion/sprites
"""
import sys
from collections import Counter
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
FRAME = 256  # square frame size; portraits are ~236-255px

EYE_COLORS = {
    "mangkukulam": (0x05, 0x68, 0x39),
    "tikbalang": (0xBA, 0x33, 0x26),
    "manananggal": (0xEF, 0x48, 0x23),
}
# keep only eye-sized blobs inside this area (excludes the manananggal's red mouth, the cigarette tip...)
EYE_AREA = {
    "mangkukulam": (100, 130, 180, 175),
    "tikbalang": (80, 75, 150, 110),
    "manananggal": (95, 50, 145, 80),
}
LID_COLOR = (40, 24, 20, 255)


def close(c, ref, tol=45):
    return c[3] >= 128 and all(abs(a - b) <= tol for a, b in zip(c[:3], ref))


def components(im, pred, area):
    w, h = im.size
    px = im.load()
    x0, y0, x1, y1 = area
    seen, comps = set(), []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if (x, y) in seen or not pred(px[x, y]):
                continue
            stack, pts = [(x, y)], []
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in seen and pred(px[nx, ny]):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            comps.append(pts)
    return [c for c in comps if len(c) >= 20]


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def skin_around(im, box, exclude):
    """most common opaque colour in a ring just outside the eye box = the skin colour to paint over it"""
    px = im.load()
    x0, y0, x1, y1 = box
    ring = Counter()
    for y in range(y0 - 6, y1 + 7):
        for x in range(x0 - 6, x1 + 7):
            if x0 <= x <= x1 and y0 <= y <= y1:
                continue
            if 0 <= x < im.width and 0 <= y < im.height:
                c = px[x, y]
                if c[3] >= 200 and not exclude(c) and sum(c[:3]) > 120:
                    ring[c] += 1
    return ring.most_common(1)[0][0]


EDGE = 3  # the eyes have soft (anti-aliased) edges: paint this far past the eye box


def eye_boxes(im, name):
    is_eye = lambda c: close(c, EYE_COLORS[name])
    comps = components(im, is_eye, EYE_AREA[name])
    # eye blobs that sit side by side (brow + pupil pieces) are merged into one box per eye
    boxes = sorted(bbox(c) for c in comps)
    merged = []
    for b in boxes:
        if merged and b[0] <= merged[-1][2] + 8:
            m = merged[-1]
            merged[-1] = (min(m[0], b[0]), min(m[1], b[1]), max(m[2], b[2]), max(m[3], b[3]))
        else:
            merged.append(b)
    return merged, is_eye


def paint_box(im, box, colour, margin):
    px = im.load()
    x0, y0, x1, y1 = box
    for y in range(y0 - margin, y1 + margin + 1):
        for x in range(x0 - margin, x1 + margin + 1):
            px[x, y] = colour


def close_eyes(im, name):
    im = im.copy()
    boxes, is_eye = eye_boxes(im, name)
    draw = ImageDraw.Draw(im)
    for box in boxes:
        x0, y0, x1, y1 = box
        paint_box(im, box, skin_around(im, (x0 - EDGE, y0 - EDGE, x1 + EDGE, y1 + EDGE), is_eye), EDGE)
        # closed eyelid: a short dark line across the lower half of where the eye was
        lid_y = y0 + (y1 - y0) * 2 // 3
        draw.rectangle((x0, lid_y, x1, lid_y + 3), fill=LID_COLOR)
    return im


def move_pixels(im, select, dx, dy):
    """cut the pixels for which select(x, y, colour) is true and paste them shifted by (dx, dy)"""
    src = im.copy()
    out = im.copy()
    spx, opx = src.load(), out.load()
    moved = []
    for y in range(im.height):
        for x in range(im.width):
            c = spx[x, y]
            if c[3] > 0 and select(x, y, c):
                opx[x, y] = (0, 0, 0, 0)
                moved.append((x, y, c))
    for x, y, c in moved:
        nx, ny = x + dx, y + dy
        if 0 <= nx < im.width and 0 <= ny < im.height:
            opx[nx, ny] = c
    return out


def glance(im, name, dx):
    """move each eye (with a bit of the skin around it) sideways by dx pixels"""
    out = im.copy()
    boxes, is_eye = eye_boxes(im, name)
    for box in boxes:
        x0, y0, x1, y1 = box
        patch = im.crop((x0 - EDGE, y0 - EDGE, x1 + EDGE + 1, y1 + EDGE + 1))
        skin = skin_around(im, (x0 - EDGE, y0 - EDGE, x1 + EDGE, y1 + EDGE), is_eye)
        paint_box(out, box, skin, EDGE + abs(dx))
        out.paste(patch, (x0 - EDGE + dx, y0 - EDGE))
    return out


def motion_frames(im, name):
    if name == "manananggal":
        # wings = black pixels at the far left/right, away from the hair around the face
        wing = lambda x, y, c: c[3] > 0 and max(c[:3]) < 40 and (x < 70 or x > 185) and y > 60
        return move_pixels(im, wing, 0, -10), move_pixels(im, wing, 0, 6)
    if name == "tikbalang":
        # cigarette smoke = light grey puffs in the top-left corner
        smoke = lambda x, y, c: close(c, (0xDA, 0xD4, 0xD6), 30) and x < 70 and y < 150
        return move_pixels(im, smoke, -2, -8), move_pixels(im, smoke, 2, -16)
    if name == "mangkukulam":
        # looks around: the eyes glance left, then right
        return glance(im, name, -5), glance(im, name, 5)
    return im, im


def to_frame(im):
    """centre the portrait horizontally, bottom-aligned, on a square transparent frame"""
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    frame.alpha_composite(im, ((FRAME - im.width) // 2, FRAME - im.height))
    return frame


for name in EYE_COLORS:
    base = Image.open(f"{SRC}/{name}.png").convert("RGBA")
    open_eyes = base
    closed = close_eyes(base, name)
    move_a, move_b = motion_frames(base, name)
    frames = [to_frame(f) for f in (open_eyes, closed, move_a, move_b)]
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * FRAME, 0))
    sheet.save(f"{OUT}/{name}-sheet.png")
    print("wrote", f"{OUT}/{name}-sheet.png", sheet.size)
