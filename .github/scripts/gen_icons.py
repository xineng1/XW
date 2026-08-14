import os
import math
from PIL import Image, ImageDraw

RED = (200, 30, 25, 255)    # 朱红
GOLD = (244, 196, 48, 255)  # 亮金
OUT = "icons"


def pt(cx, cy, angle_deg, r):
    rad = math.radians(angle_deg)
    return (cx + r * math.sin(rad), cy - r * math.cos(rad))


def leaf_points(cx, cy, R):
    tips = [0, 72, 144, 216, 288]
    pts = []
    for a in tips:
        # 每片裂叶用「左肩-叶尖-右肩」做成宽圆裂，谷更深，更像梧桐
        pts.append(pt(cx, cy, a - 17, R * 0.82))
        pts.append(pt(cx, cy, a, R))
        pts.append(pt(cx, cy, a + 17, R * 0.82))
        pts.append(pt(cx, cy, a + 36, R * 0.42))
    return pts


def make(size, maskable=False):
    img = Image.new("RGBA", (size, size), RED)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2.0
    R = size * 0.33 * (0.82 if maskable else 1.0)
    d.polygon(leaf_points(cx, cy, R), fill=GOLD)
    stem_w = max(1, int(size * 0.05))
    d.line([(cx, cy + R * 0.5), (cx, cy + R * 1.05)], fill=GOLD, width=stem_w)
    vein_w = max(1, int(size * 0.014))
    for a in (0, 72, 144, 216, 288):
        d.line([(cx, cy), pt(cx, cy, a, R)], fill=RED, width=vein_w)
        d.line([(cx, cy), pt(cx, cy, a - 17, R * 0.82)], fill=RED, width=vein_w)
        d.line([(cx, cy), pt(cx, cy, a + 17, R * 0.82)], fill=RED, width=vein_w)
    return img


os.makedirs(OUT, exist_ok=True)
for s in (192, 512):
    make(s, False).save(os.path.join(OUT, f"icon-{s}.png"))
make(512, True).save(os.path.join(OUT, "maskable-512.png"))
print("generated icons:", sorted(os.listdir(OUT)))
