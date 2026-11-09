#!/usr/bin/env python3
"""Paints two new maps with code (same layer layout as the pagoda / moonlake maps):

   popa    - Mount Popa Embers      (volcanic dusk: lava, basalt islands, bronze shrines, drifting embers)
   aurora  - Frostpeak Aurora       (snow peaks under an aurora, ice islands, silver pagodas, cyan crystals)

   python3 tools/make_maps.py               # paint both
   python3 tools/make_maps.py popa          # only one
Writes assets/maps/<id>/{sky,far,mid,cloud_high,cloud_low,stage_main,stage_plat,thumb}.png.
Needs: pip install pillow numpy.  When you have hand-painted art, replace the PNGs and stop running this script.
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from maplib import *

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'maps')
SKY, FAR, MID, CH, CL, MAIN, PLAT, THUMB = (1920, 1080), (2560, 1080), (2800, 1080), (2400, 1080), (3000, 1080), (2340, 1140), (690, 330), (480, 270)
MAIN_SURFACE, PLAT_SURFACE = 300, 102


def fade_bottom(img, y0, y1):
    """make everything below y1 transparent, fading between y0 and y1"""
    a = np.array(img).astype(np.float32)
    ys = np.arange(img.height)
    k = np.clip((y1 - ys) / max(1, (y1 - y0)), 0, 1)[:, None]
    a[..., 3] *= k
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def sky_from(stops, size):
    a = vgrad_arr(size[0], size[1], stops)
    return Image.fromarray(a.astype(np.uint8), 'RGB').convert('RGBA')


# =================================================================== common stage pieces
def deck(img, cx, top, width, thick, trim_top, band, trim_bot, rune, cap, rune_every=110):
    xl, xr = cx - width / 2, cx + width / 2
    poly(img, [(xl, top), (xr, top), (xr, top + thick), (xl, top + thick)], band)
    poly(img, [(xl, top), (xr, top), (xr, top + thick * 0.17), (xl, top + thick * 0.17)], trim_top)
    poly(img, [(xl, top + thick * 0.84), (xr, top + thick * 0.84), (xr, top + thick), (xl, top + thick)], trim_bot)
    capsule(img, (xl + 6, top + 3), (xr - 6, top + 3), 3, tuple(min(255, int(c * 1.25)) for c in trim_top), 0.8)
    spots = []
    x = xl + rune_every * 0.6
    while x < xr - 40:
        poly(img, [(x, top + thick * 0.33), (x + 9, top + thick * 0.5), (x, top + thick * 0.67), (x - 9, top + thick * 0.5)], rune)
        spots.append((x, top + thick * 0.5, 7, rune))
        x += rune_every
    glow_spots(img, spots, 9, 0.9)
    for x0 in (xl, xr):                       # end caps (cylinders)
        poly(img, [(x0 - 24, top - 4), (x0 + 24, top - 4), (x0 + 24, top + thick + 4), (x0 - 24, top + thick + 4)], cap)
        ellipse(img, x0, top - 4, 24, 8, tuple(min(255, int(c * 1.2)) for c in cap))
        poly(img, [(x0 + 8, top), (x0 + 24, top), (x0 + 24, top + thick), (x0 + 8, top + thick)], tuple(int(c * 0.7) for c in cap), 0.55)


def plat_deck(img, cx, top, width, trim, band, rune, cap):
    deck(img, cx, top, width, 36, trim, band, tuple(int(c * 0.8) for c in trim), rune, cap, rune_every=70)


# =================================================================== POPA - Mount Popa Embers
def popa_sky():
    img = sky_from([(0, hx('#150820')), (.30, hx('#3a1036')), (.55, hx('#8f2638')), (.78, hx('#e5612c')), (1, hx('#ffb24a'))], SKY)
    glow_spots(img, [(1240, 800, 220, (255, 130, 60)), (1240, 800, 120, (255, 205, 120))], 140, 1.0)
    ellipse(img, 1240, 800, 74, 74, (255, 236, 170))
    # streaks of hot haze
    for i, y in enumerate([640, 700, 760, 850, 900]):
        capsule(img, (150 + i * 220, y), (900 + i * 260, y + 6), 9, (255, 170, 90), 0.10)
    specks(img, 280, 11, 30, 880, [(255, 210, 140), (255, 160, 90), (255, 120, 70)], 0.8, 2.2, 0.8)
    return img


def popa_far():
    w, h = FAR
    img = new(w, h)
    haze = hx('#c24a3c')
    # distant ridge
    r1 = ridge(w, h * 0.60, h * 0.075, 5, step=8)
    poly(img, [(0, h * 0.84)] + r1 + [(w, h * 0.84)], gfill([(0, hx('#5a1f40')), (1, haze)], h * 0.45, h * 0.8), 0.92)
    # giant volcano
    cx = 1340
    left = [(cx - 700 + i * 70 + np.random.RandomState(i).uniform(-18, 18), h * 0.80 - (i / 10.0) ** 1.4 * h * 0.47) for i in range(0, 11)]
    right = [(cx + 700 - i * 70 + np.random.RandomState(40 + i).uniform(-18, 18), h * 0.80 - (i / 10.0) ** 1.4 * h * 0.47) for i in range(0, 11)]
    vol = left + [(cx - 70, h * 0.325), (cx - 30, h * 0.34), (cx + 28, h * 0.325), (cx + 75, h * 0.35)] + right[::-1]
    poly(img, vol, gfill([(0, hx('#2e1030')), (.6, hx('#5a2040')), (1, hx('#a03a3c'))], h * 0.32, h * 0.8))
    glow_spots(img, [(cx, h * 0.335, 90, (255, 150, 60))], 40, 1.4)
    ellipse(img, cx, h * 0.337, 62, 10, (255, 190, 90))
    rs = np.random.RandomState(8)
    for k, side in enumerate([-1, -0.35, 0.3, 0.9]):         # glowing lava rivers down the cone
        x, y = cx + side * 40, h * 0.34
        pts = [(x, y)]
        for s in range(14):
            x += side * 16 + rs.uniform(-9, 9)
            y += 28 + rs.uniform(0, 14)
            pts.append((x, y))
        polyline(img, pts, 4.5, (255, 140, 50), 0.95)
        glow_add(img, glow_layer(img.size, lambda d, p=pts: [d.line(p, fill=(255, 120, 40), width=8)], 8), 1.0)
    # Popa rock plug with a golden monastery on top (left)
    px = 560
    poly(img, [(px - 90, h * 0.80), (px - 46, h * 0.52), (px - 40, h * 0.40), (px + 40, h * 0.40), (px + 52, h * 0.52), (px + 100, h * 0.80)],
         gfill([(0, hx('#3a1636')), (1, hx('#8a3040'))], h * 0.4, h * 0.8))
    polyline(img, [(px - 40, h * 0.41), (px - 46, h * 0.55), (px - 80, h * 0.78)], 3, (255, 140, 70), 0.55)
    pagoda(img, px, h * 0.40, 120, hx('#c8863c'), hx('#7a2c2c'), hx('#ffd070'), tiers=4)
    stupa(img, px - 48, h * 0.405, 70, hx('#e8a840'), hx('#ffd070'), hx('#8a4a20'))
    stupa(img, px + 50, h * 0.405, 56, hx('#e8a840'), hx('#ffd070'), hx('#8a4a20'))
    glow_spots(img, [(px, h * 0.36, 26, (255, 170, 80))], 26, 0.6)
    # nearer dark ridge
    r2 = ridge(w, h * 0.70, h * 0.05, 9, step=8)
    poly(img, [(0, h * 0.86)] + r2 + [(w, h * 0.86)], gfill([(0, hx('#2a0e2a')), (1, hx('#7a2a38'))], h * 0.6, h * 0.84))
    # floating shards high up
    for (x, y, s) in [(260, 250, 1.0), (980, 190, 0.7), (1860, 230, 0.9), (2330, 330, 0.8)]:
        island(img, x, y, 90 * s, 70 * s, hx('#4a2040'), hx('#1a0c20'), int(x), rim=(255, 140, 70))
        stupa(img, x, y, 34 * s, hx('#e8a840'), hx('#ffd070'))
    return fade_bottom(img, h * 0.74, h * 0.84)


def popa_mid():
    w, h = MID
    img = new(w, h)
    rock_t, rock_b = hx('#40203a'), hx('#140a1c')
    rim = (255, 130, 60)
    XA, XB, XC = 700, 1790, 2540                      # the middle of the picture stays open so fighters read clearly
    specs = [(XA, 0.48, 520, 330, 21), (XB, 0.34, 660, 420, 22), (XC, 0.50, 460, 300, 23)]
    for (cx, fy, wd, dp, sd) in specs:
        top = h * fy
        island(img, cx, top, wd, dp, rock_t, rock_b, sd, rim=rim, grass=hx('#2a1226'))
        polyline(img, [(cx - wd / 2 + 4, top + 1), (cx + wd / 2 - 4, top + 1)], 3, (255, 150, 70), 0.9)
        glow_spots(img, [(cx, top + dp * 0.92, 40, (255, 110, 40))], 60, 0.9)
    top = h * 0.34
    x = XB + 90
    pts = [(x, top + 180), (x + 4, top + 300), (x - 3, top + 430), (x + 2, top + 560)]       # lava fall
    polyline(img, pts, 6, (255, 150, 60), 0.9)
    glow_add(img, glow_layer(img.size, lambda d: d.line(pts, fill=(255, 110, 40), width=12), 10), 1.0)
    pagoda(img, XA, h * 0.48, 190, hx('#5a2230'), hx('#8a3030'), hx('#f2a845'), tiers=5)
    stupa(img, XA - 130, h * 0.48, 80, hx('#c8863c'), hx('#f2a845'), hx('#6a3018'))
    stupa(img, XB, h * 0.34, 250, hx('#e8a840'), hx('#ffd070'), hx('#8a4a20'))
    stupa(img, XB - 150, h * 0.34, 96, hx('#e8a840'), hx('#ffd070'), hx('#8a4a20'))
    stupa(img, XB + 150, h * 0.34, 96, hx('#e8a840'), hx('#ffd070'), hx('#8a4a20'))
    pagoda(img, XC, h * 0.50, 120, hx('#5a2230'), hx('#8a3030'), hx('#f2a845'), tiers=3)
    for (x, y) in [(XB - 90, h * 0.34 + 40), (XB + 100, h * 0.34 + 40), (XA - 60, h * 0.48 + 34), (XC - 50, h * 0.5 + 34)]:
        lantern(img, x, y, 8, (255, 90, 50), (255, 120, 60))
    glow_spots(img, [(XB, h * 0.28, 70, (255, 190, 100)), (XA, h * 0.42, 50, (255, 170, 80))], 50, 0.5)
    for (x, y, s) in [(260, 330, 0.6), (1250, 450, 0.7), (1320, 250, 0.5), (2230, 270, 0.7), (2700, 430, 0.5), (60, 230, 0.4)]:
        island(img, x, y, 90 * s, 60 * s, rock_t, rock_b, int(x), rim=rim)
    specks(img, 160, 31, 120, 760, [(255, 190, 100), (255, 130, 60)], 0.8, 2.6, 0.8)
    return img


def popa_cloud_high():
    w, h = CH
    img = new(w, h)
    rs = np.random.RandomState(51)
    for i in range(11):
        cx = (i + 0.5) * w / 11 + rs.uniform(-70, 70)
        cy = rs.uniform(0.14, 0.40) * h
        cloud(img, cx, cy, rs.uniform(300, 520), rs.uniform(36, 62), hx('#7a2c52'), hx('#2a1032'), 60 + i, wrap=w, rim=(255, 150, 90))
    return img


def popa_cloud_low():
    w, h = CL
    img = new(w, h)
    poly(img, [(0, h * 0.90), (w, h * 0.90), (w, h), (0, h)], gfill([(0, hx('#3a1230')), (1, hx('#1a0a1c'))], h * 0.9, h))
    rs = np.random.RandomState(70)
    rows = [(0.74, hx('#e0663a'), hx('#7a2440')), (0.80, hx('#b84a3c'), hx('#4a1a3a')), (0.87, hx('#8a3040'), hx('#2e1230')), (0.94, hx('#5a2038'), hx('#1c0c20'))]
    for k, (fy, top, bot) in enumerate(rows):
        n = 9
        for i in range(n):
            cx = (i + 0.5) * w / n + rs.uniform(-80, 80)
            cloud(img, cx, h * fy + rs.uniform(-10, 10), rs.uniform(520, 760), rs.uniform(70, 105), top, bot, 100 + k * 20 + i, rim=(255, 190, 110) if k < 2 else None)
    # lava light coming up through the smoke
    glow_spots(img, [(500, h * 0.82, 120, (255, 90, 40)), (1500, h * 0.85, 160, (255, 110, 50)), (2450, h * 0.8, 120, (255, 90, 40))], 120, 0.55)
    return img


def popa_stage_main(main_w):
    w, h = MAIN
    img = new(w, h)
    cx, W = w // 2, main_w * 3
    xl, xr = cx - W / 2, cx + W / 2
    shape = island(img, cx, MAIN_SURFACE + 96, W * 0.94, 720, hx('#3a2032'), hx('#120a1a'), 77, rim=(255, 130, 60), jag=0.45)
    rs = np.random.RandomState(7)
    for k in range(9):                                       # glowing lava veins in the rock
        x = cx + rs.uniform(-0.4, 0.4) * W
        y = MAIN_SURFACE + 140
        pts = [(x, y)]
        for s in range(rs.randint(4, 8)):
            x += rs.uniform(-34, 34)
            y += rs.uniform(40, 80)
            pts.append((x, y))
        polyline(img, pts, 4, (255, 150, 60), 0.9)
        glow_add(img, glow_layer(img.size, lambda d, p=pts: d.line(p, fill=(255, 100, 40), width=9), 9), 0.9)
    for (x, y, s) in [(cx - 560, 580, 1.0), (cx - 160, 700, 1.25), (cx + 220, 640, 1.1), (cx + 620, 540, 0.9), (cx + 20, 850, 0.8)]:   # ember crystals
        pts = [(x - 16 * s, y), (x, y - 56 * s), (x + 16 * s, y), (x + 6 * s, y + 70 * s), (x - 6 * s, y + 70 * s)]
        poly(img, pts, vfill((255, 190, 90), (230, 90, 40)))
        poly(img, [(x - 4 * s, y - 40 * s), (x, y - 56 * s), (x + 4 * s, y - 36 * s)], (255, 240, 190), 0.8)
        glow_poly(img, pts, (255, 130, 50), 24, 0.85)
    deck(img, cx, MAIN_SURFACE, W, 100, hx('#d6903c'), hx('#241420'), hx('#8a5a28'), (255, 150, 60), hx('#c88438'))
    for sx, sg in ((xl + 130, 1), (xr - 130, -1)):
        stupa(img, sx, MAIN_SURFACE, 250, hx('#e0a040'), hx('#ffd070'), hx('#8a4a20'))
        pagoda(img, sx + sg * 80, MAIN_SURFACE, 90, hx('#5a2230'), hx('#8a3030'), hx('#f2a845'), tiers=2)
    for lx in (xl + 200, xr - 200):
        lantern(img, lx, MAIN_SURFACE + 150, 18, (255, 80, 45), (255, 110, 50))
    return img


def popa_stage_plat():
    w, h = PLAT
    img = new(w, h)
    cx = w // 2
    island(img, cx, PLAT_SURFACE + 30, 420, 150, hx('#3a2032'), hx('#120a1a'), 88, rim=(255, 130, 60), jag=0.5)
    pts = [(cx - 30, PLAT_SURFACE + 60), (cx - 24, PLAT_SURFACE + 100), (cx - 34, PLAT_SURFACE + 135)]
    polyline(img, pts, 3, (255, 150, 60), 0.9)
    glow_add(img, glow_layer(img.size, lambda d: d.line(pts, fill=(255, 100, 40), width=7), 6), 0.9)
    plat_deck(img, cx, PLAT_SURFACE, 510, hx('#d6903c'), hx('#241420'), (255, 150, 60), hx('#c88438'))
    for sx in (cx - 235, cx + 235):
        stupa(img, sx, PLAT_SURFACE, 70, hx('#e0a040'), hx('#ffd070'), hx('#8a4a20'))
    lantern(img, cx, PLAT_SURFACE + 60, 9, (255, 80, 45), (255, 110, 50))
    return img


# =================================================================== AURORA - Frostpeak Aurora
def aurora_ribbons(size, seed):
    w, h = size
    g = np.zeros((h, w, 3), np.float32)
    rs = np.random.RandomState(seed)
    for k in range(3):
        base = h * (0.22 + 0.13 * k)
        A = h * rs.uniform(0.04, 0.08)
        f = rs.uniform(0.0025, 0.0045)
        ph = rs.uniform(0, 6)
        col = [(70, 255, 170), (60, 230, 220), (170, 110, 255)][k]
        col2 = [(40, 160, 255), (80, 255, 170), (255, 120, 220)][k]
        for x in range(0, w, 2):
            yc = base + A * math.sin(x * f + ph) + A * 0.5 * math.sin(x * f * 2.3 + ph * 2)
            L = h * (0.16 + 0.08 * math.sin(x * 0.011 + ph) + 0.05 * rs.rand())
            y0, y1 = int(max(0, yc - L)), int(min(h - 1, yc))
            if y1 <= y0:
                continue
            t = np.linspace(0, 1, y1 - y0)
            inten = (t ** 1.6) * (0.5 + 0.5 * math.sin(x * 0.04 + ph * 3)) * 0.9
            c = np.array(col, np.float32)[None, :] * t[:, None] + np.array(col2, np.float32)[None, :] * (1 - t)[:, None]
            g[y0:y1, x:x + 2, :] += (c * inten[:, None])[:, None, :]
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(5))


def aurora_sky():
    img = sky_from([(0, hx('#040a26')), (.35, hx('#0a2a5c')), (.62, hx('#127a8e')), (.82, hx('#58c8c0')), (1, hx('#c4f0ea'))], SKY)
    specks(img, 520, 3, 10, 700, [(255, 255, 255), (200, 230, 255), (255, 240, 200)], 0.6, 1.9, 0.9)
    glow_add(img, aurora_ribbons(SKY, 4), 0.9)
    glow_spots(img, [(540, 300, 230, (140, 200, 255)), (540, 300, 120, (200, 235, 255))], 120, 0.9)
    ellipse(img, 540, 300, 78, 78, (244, 250, 255))
    for (x, y, r) in [(505, 280, 14), (570, 330, 18), (535, 262, 9), (585, 285, 8)]:
        ellipse(img, x, y, r, r, (206, 224, 242), 0.65)
    return img


def peak(img, cx, base, h, w, seed, lit, shade, snow):
    rs = np.random.RandomState(seed)
    n = 7
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        x = cx - w / 2 + t * (w / 2)
        y = base - (t ** 1.25) * h + (rs.uniform(-1, 1) * h * 0.05 if 0 < i < n else 0)
        left.append((x, y))
    for i in range(n + 1):
        t = i / n
        x = cx + w / 2 - t * (w / 2)
        y = base - (t ** 1.25) * h + (rs.uniform(-1, 1) * h * 0.05 if 0 < i < n else 0)
        right.append((x, y))
    top = (cx + rs.uniform(-0.04, 0.04) * w, base - h)
    L = left[:-1] + [top, (cx, base)]
    Rr = [top] + right[::-1][1:] + [(cx, base)]
    poly(img, L + [(cx - w / 2, base)] if False else [(cx - w / 2, base)] + left[1:-1] + [top, (cx, base)], lit)
    poly(img, [(cx, base), top] + right[::-1][1:-1] + [(cx + w / 2, base)], shade)
    poly(img, [top] + [p for p in left[-3:-1]] + [(cx - w * 0.02, base - h * 0.62), (cx + w * 0.03, base - h * 0.7)], snow, 0.95)
    poly(img, [top, (cx + w * 0.1, base - h * 0.72), (cx + w * 0.04, base - h * 0.6)], snow, 0.55)


def aurora_far():
    w, h = FAR
    img = new(w, h)
    base = h * 0.78
    back = [(260, 340, 520, 1), (760, 420, 640, 2), (1280, 560, 900, 3), (1860, 400, 600, 4), (2300, 330, 540, 5)]
    for (cx, ph, wd, sd) in back:
        peak(img, cx, base, ph, wd, sd, hx('#7fa6e0'), hx('#3b5a9c'), hx('#e6f4ff'))
    poly(img, [(0, base - 70), (w, base - 70), (w, base + 20), (0, base + 20)], gfill([(0, (150, 210, 235, )), (1, (190, 235, 240))], base - 70, base + 20), 0.45)
    front = [(90, 250, 480, 11), (620, 300, 560, 12), (1060, 230, 480, 13), (1560, 330, 600, 14), (2080, 260, 520, 15), (2480, 300, 500, 16)]
    for (cx, ph, wd, sd) in front:
        peak(img, cx, base + 20, ph, wd, sd, hx('#9fc6ee'), hx('#25407c'), hx('#f4fbff'))
    poly(img, [(0, base - 20), (w, base - 20), (w, base + 40), (0, base + 40)], gfill([(0, (170, 225, 240)), (1, (200, 240, 242))], base - 20, base + 40), 0.55)
    # pines along the foot of the peaks
    rs = np.random.RandomState(9)
    for i in range(46):
        x = rs.uniform(0, w)
        pine(img, x, base + 26 + rs.uniform(-6, 10), rs.uniform(48, 84), hx('#1b4658'), (230, 245, 255))
    for (x, y, s) in [(380, 230, 1.0), (1180, 170, 0.8), (1980, 250, 0.9)]:
        island(img, x, y, 90 * s, 64 * s, hx('#6a8ec0'), hx('#24386a'), int(x), rim=(190, 245, 255))
        pagoda(img, x, y, 44 * s, hx('#e8f2ff'), hx('#6aa0d8'), hx('#f6fbff'), tiers=3)
    return fade_bottom(img, h * 0.76, h * 0.86)


def aurora_mid():
    w, h = MID
    img = new(w, h)
    rock_t, rock_b = hx('#6f90c4'), hx('#1e2e60')
    rim = (190, 245, 255)
    XA, XB, XC = 700, 1790, 2540
    specs = [(XA, 0.48, 520, 340, 31), (XB, 0.34, 640, 420, 32), (XC, 0.50, 460, 310, 33)]
    for (cx, fy, wd, dp, sd) in specs:
        top = h * fy
        island(img, cx, top, wd, dp, rock_t, rock_b, sd, rim=rim, grass=hx('#e9f5ff'))
        polyline(img, [(cx - wd / 2 + 4, top + 1), (cx + wd / 2 - 4, top + 1)], 3, (255, 255, 255), 0.9)
        for k in range(7):                                    # icicles
            ix = cx - wd * 0.4 + k * wd * 0.13
            poly(img, [(ix - 7, top + 8), (ix + 7, top + 8), (ix, top + 34 + (k % 3) * 18)], (210, 240, 255), 0.9)
        glow_spots(img, [(cx, top + dp * 0.9, 30, (110, 230, 255))], 50, 0.55)
    pagoda(img, XA, h * 0.48, 190, hx('#e6f1ff'), hx('#6aa0d8'), hx('#f6fbff'), tiers=5)
    for x in (XA - 170, XA + 150):
        pine(img, x, h * 0.48 + 4, 90, hx('#1c4a5c'), (232, 246, 255))
    stupa(img, XB, h * 0.34, 250, hx('#e6f1ff'), hx('#9fd6ff'), hx('#7a9ac8'))
    for x in (XB - 190, XB + 190):
        pine(img, x, h * 0.34 + 4, 100, hx('#1c4a5c'), (232, 246, 255))
    stupa(img, XB - 100, h * 0.34, 86, hx('#e6f1ff'), hx('#9fd6ff'), hx('#7a9ac8'))
    pagoda(img, XC, h * 0.50, 130, hx('#e6f1ff'), hx('#6aa0d8'), hx('#f6fbff'), tiers=3)
    for x in (XC - 130, XC + 120):
        pine(img, x, h * 0.50 + 4, 80, hx('#1c4a5c'), (232, 246, 255))
    glow_spots(img, [(XA, h * 0.42, 24, (160, 235, 255)), (XB, h * 0.28, 30, (160, 235, 255)), (XC, h * 0.46, 20, (160, 235, 255))], 40, 0.7)
    for (x, y, s) in [(260, 340, 0.6), (1250, 460, 0.7), (1320, 250, 0.5), (2230, 270, 0.7), (2700, 440, 0.5), (60, 240, 0.4)]:
        island(img, x, y, 90 * s, 60 * s, rock_t, rock_b, int(x), rim=rim)
    specks(img, 170, 32, 100, 780, [(255, 255, 255), (170, 240, 255)], 0.8, 2.4, 0.85)
    return img


def aurora_cloud_high():
    w, h = CH
    img = new(w, h)
    rs = np.random.RandomState(52)
    for i in range(10):
        cx = (i + 0.5) * w / 10 + rs.uniform(-70, 70)
        cy = rs.uniform(0.14, 0.40) * h
        cloud(img, cx, cy, rs.uniform(300, 560), rs.uniform(30, 54), hx('#e0f6ff'), hx('#7fb4d8'), 80 + i, wrap=w, rim=(255, 255, 255))
    a = np.array(img).astype(np.float32)
    a[..., 3] *= 0.62
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def aurora_cloud_low():
    w, h = CL
    img = new(w, h)
    poly(img, [(0, h * 0.90), (w, h * 0.90), (w, h), (0, h)], gfill([(0, hx('#5aa4bc')), (1, hx('#2f6a88'))], h * 0.9, h))
    rs = np.random.RandomState(71)
    rows = [(0.74, hx('#f6feff'), hx('#9fd2e2')), (0.80, hx('#e2f6fb'), hx('#7cbcd2')), (0.87, hx('#c2e6f0'), hx('#5c9cb8')), (0.94, hx('#9fd0e0'), hx('#3f7ea0'))]
    for k, (fy, top, bot) in enumerate(rows):
        for i in range(9):
            cx = (i + 0.5) * w / 9 + rs.uniform(-80, 80)
            cloud(img, cx, h * fy + rs.uniform(-10, 10), rs.uniform(520, 760), rs.uniform(70, 105), top, bot, 120 + k * 20 + i, rim=(255, 255, 255))
    return img


def aurora_stage_main(main_w):
    w, h = MAIN
    img = new(w, h)
    cx, W = w // 2, main_w * 3
    xl, xr = cx - W / 2, cx + W / 2
    island(img, cx, MAIN_SURFACE + 96, W * 0.94, 720, hx('#6a88bc'), hx('#162450'), 78, rim=(200, 248, 255), jag=0.45)
    rs = np.random.RandomState(17)
    for k in range(14):                                         # frost streaks
        x = cx + rs.uniform(-0.42, 0.42) * W
        y = MAIN_SURFACE + 130 + rs.uniform(0, 200)
        polyline(img, [(x, y), (x + rs.uniform(-20, 20), y + rs.uniform(50, 120))], 3, (200, 235, 255), 0.35)
    for (x, y, s) in [(cx - 560, 580, 1.0), (cx - 160, 700, 1.25), (cx + 220, 640, 1.1), (cx + 620, 540, 0.9), (cx + 20, 850, 0.8)]:   # ice crystals
        pts = [(x - 16 * s, y), (x, y - 56 * s), (x + 16 * s, y), (x + 6 * s, y + 70 * s), (x - 6 * s, y + 70 * s)]
        poly(img, pts, vfill((200, 255, 255), (60, 190, 235)))
        poly(img, [(x - 4 * s, y - 40 * s), (x, y - 56 * s), (x + 4 * s, y - 36 * s)], (255, 255, 255), 0.85)
        glow_poly(img, pts, (80, 230, 255), 24, 0.85)
    deck(img, cx, MAIN_SURFACE, W, 100, hx('#f2f8ff'), hx('#1f3a68'), hx('#9fb8d8'), (90, 255, 235), hx('#d8e6f6'))
    for sx, sg in ((xl + 130, 1), (xr - 130, -1)):
        pagoda(img, sx, MAIN_SURFACE, 260, hx('#e6f1ff'), hx('#6aa0d8'), hx('#f6fbff'), tiers=4)
        pine(img, sx + sg * 90, MAIN_SURFACE, 80, hx('#1c4a5c'), (232, 246, 255))
    for lx in (xl + 200, xr - 200):
        lantern(img, lx, MAIN_SURFACE + 150, 18, (120, 235, 255), (90, 230, 255))
    return img


def aurora_stage_plat():
    w, h = PLAT
    img = new(w, h)
    cx = w // 2
    island(img, cx, PLAT_SURFACE + 30, 420, 150, hx('#6a88bc'), hx('#162450'), 89, rim=(200, 248, 255), jag=0.5)
    plat_deck(img, cx, PLAT_SURFACE, 510, hx('#f2f8ff'), hx('#1f3a68'), (90, 255, 235), hx('#d8e6f6'))
    for sx in (cx - 235, cx + 235):
        pine(img, sx, PLAT_SURFACE, 52, hx('#1c4a5c'), (232, 246, 255))
    lantern(img, cx, PLAT_SURFACE + 60, 9, (120, 235, 255), (90, 230, 255))
    return img


# =================================================================== thumbnails (same framing as the game camera)
def make_thumb(d, main_w, plats):
    """same framing as the game: every layer is scaled like updateBackground() does (parallax slack) and centred"""
    T = Image.new('RGBA', THUMB, (0, 0, 0, 255))
    for name, par in (('sky', 0.10), ('far', 0.25), ('mid', 0.50), ('cloud_high', 0.62), ('cloud_low', 0.80)):
        im = d[name].convert('RGBA')
        k = max(THUMB[0] / im.width, THUMB[1] / im.height) * (1.10 + 0.22 * par)
        r = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
        layer = new(*THUMB)
        layer.paste(r, ((THUMB[0] - r.width) // 2, (THUMB[1] - r.height) // 2))
        T.alpha_composite(layer)
    S = 1 / 6.0                                              # thumbnail pixels per stage-art pixel (stage collider 640 -> 320 px)
    surf_y = 170
    main = d['stage_main']
    m = main.resize((int(main.width * S), int(main.height * S)), Image.LANCZOS)
    lay = new(*THUMB)
    lay.paste(m, (THUMB[0] // 2 - m.width // 2, surf_y - int(MAIN_SURFACE * S)))
    T.alpha_composite(lay)
    pl = d['stage_plat']
    p = pl.resize((int(pl.width * S), int(pl.height * S)), Image.LANCZOS)
    for (px, py) in plats:                                    # world offsets from the stage centre / world y
        lay = new(*THUMB)
        lay.paste(p, (int(THUMB[0] / 2 + px * 0.5 - p.width / 2), int(surf_y - (440 - py) * 0.5 - PLAT_SURFACE * S)))
        T.alpha_composite(lay)
    return T.convert('RGB')


THEMES = {
    'popa': dict(sky=popa_sky, far=popa_far, mid=popa_mid, cloud_high=popa_cloud_high, cloud_low=popa_cloud_low,
                 stage_main=popa_stage_main, stage_plat=popa_stage_plat, main_w=560, plats=[(-215, 335), (215, 335), (0, 225)]),
    'aurora': dict(sky=aurora_sky, far=aurora_far, mid=aurora_mid, cloud_high=aurora_cloud_high, cloud_low=aurora_cloud_low,
                   stage_main=aurora_stage_main, stage_plat=aurora_stage_plat, main_w=700, plats=[(-250, 330), (250, 330)]),
}

if __name__ == '__main__':
    want = [a for a in sys.argv[1:] if not a.startswith('--')] or list(THEMES)
    for tid in want:
        t = THEMES[tid]
        folder = os.path.join(OUT, tid)
        os.makedirs(folder, exist_ok=True)
        d = {}
        for name in ('sky', 'far', 'mid', 'cloud_high', 'cloud_low', 'stage_plat'):
            print(tid, 'painting', name, flush=True)
            d[name] = t[name]()
        print(tid, 'painting stage_main', flush=True)
        d['stage_main'] = t['stage_main'](t['main_w'])
        for name, im in d.items():
            (save_rgb if name == 'sky' else save_rgba)(im, os.path.join(folder, name + '.png'))
        make_thumb(d, t['main_w'], t['plats']).save(os.path.join(folder, 'thumb.png'), optimize=True)
        print('wrote', folder)
