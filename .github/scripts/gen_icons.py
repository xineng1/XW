import os
from PIL import Image, ImageDraw, ImageFont

GOLD = (212, 175, 55, 255)
DARK = (26, 23, 20, 255)
OUT = "icons"


def find_cjk_font():
    candidates = [
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    for root, dirs, files in os.walk("/usr/share/fonts"):
        for f in files:
            if f.lower().endswith((".ttc", ".ttf")):
                return os.path.join(root, f)
    raise FileNotFoundError("No usable font found")


FONT = find_cjk_font()
os.makedirs(OUT, exist_ok=True)


def make(size, maskable=False):
    img = Image.new("RGBA", (size, size), DARK)
    d = ImageDraw.Draw(img)
    cx = cy = size / 2.0
    r = size * 0.40 * (0.82 if maskable else 1.0)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD)
    fs = int(r * 1.5)
    font = ImageFont.truetype(FONT, fs)
    text = "栖"
    bb = d.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x = cx - tw / 2 - bb[0]
    y = cy - th / 2 - bb[1]
    d.text((x, y), text, font=font, fill=DARK)
    return img


for s in (192, 512):
    make(s, False).save(os.path.join(OUT, f"icon-{s}.png"))
make(512, True).save(os.path.join(OUT, "maskable-512.png"))
print("generated icons:", sorted(os.listdir(OUT)))