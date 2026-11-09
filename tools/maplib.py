"""maplib.py - small drawing toolkit used by make_maps.py to paint the background layers and stage pieces with code.
All shapes are anti-aliased (drawn 3x bigger, then shrunk). Needs: pip install pillow numpy
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SS = 3


def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(len(a)))


def vgrad_arr(w, h, stops):
    """stops = [(pos 0..1, (r,g,b)), ...] -> float array (h, w, 3)"""
    ys = np.linspace(0, 1, h)
    out = np.zeros((h, 3))
    pos = [s[0] for s in stops]
    for c in range(3):
        out[:, c] = np.interp(ys, pos, [s[1][c] for s in stops])
    return np.repeat(out[:, None, :], w, axis=1)


def new(w, h, color=(0, 0, 0, 0)):
    return Image.new('RGBA', (w, h), color)


def _comp(img, layer, x0, y0):
    """alpha-composite layer onto img at (x0,y0) with clipping"""
    W, H = img.size
    lw, lh = layer.size
    cx0, cy0 = max(0, x0), max(0, y0)
    cx1, cy1 = min(W, x0 + lw), min(H, y0 + lh)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    crop = layer.crop((cx0 - x0, cy0 - y0, cx1 - x0, cy1 - y0))
    img.alpha_composite(crop, (cx0, cy0))


def vfill(top, bot):
    """fill callable: vertical gradient inside the shape's bounding box"""
    def f(bw, bh, x0, y0, y_top=None, y_bot=None):
        a = vgrad_arr(bw, bh, [(0, top), (1, bot)])
        out = np.dstack([a, np.full((bh, bw), 255.0)]).astype(np.uint8)
        return Image.fromarray(out, 'RGBA')
    return f


def gfill(stops, y0, y1):
    """vertical gradient in WORLD coordinates (y0..y1 of the image), so several shapes share one gradient"""
    def f(bw, bh, bx, by):
        ys = np.clip((np.arange(bh) + by - y0) / max(1, (y1 - y0)), 0, 1)
        out = np.zeros((bh, 3))
        pos = [s[0] for s in stops]
        for c in range(3):
            out[:, c] = np.interp(ys, pos, [s[1][c] for s in stops])
        arr = np.dstack([np.repeat(out[:, None, :], bw, axis=1), np.full((bh, bw), 255.0)]).astype(np.uint8)
        return Image.fromarray(arr, 'RGBA')
    return f


def poly(img, pts, fill, alpha=1.0):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = int(math.floor(min(xs))) - 2, int(math.floor(min(ys))) - 2
    x1, y1 = int(math.ceil(max(xs))) + 2, int(math.ceil(max(ys))) + 2
    bw, bh = x1 - x0, y1 - y0
    if bw <= 0 or bh <= 0 or bw * bh > 40_000_000:
        return
    area = bw * bh
    ss = SS if area < 1_000_000 else (2 if area < 3_500_000 else 1)     # big shapes use less supersampling (speed)
    m = Image.new('L', (bw * ss, bh * ss), 0)
    ImageDraw.Draw(m).polygon([((x - x0) * ss, (y - y0) * ss) for x, y in pts], fill=255)
    if ss > 1:
        m = m.resize((bw, bh), Image.LANCZOS)
    if callable(fill):
        layer = fill(bw, bh, x0, y0)
    else:
        layer = Image.new('RGBA', (bw, bh), tuple(int(v) for v in fill) + ((255,) if len(fill) == 3 else ()))
    a = ImageChops.multiply(layer.getchannel('A'), m)
    if alpha < 1.0:
        a = a.point(lambda v: int(v * alpha))
    layer.putalpha(a)
    _comp(img, layer, x0, y0)


def ellipse(img, cx, cy, rx, ry, fill, alpha=1.0):
    n = 40
    pts = [(cx + math.cos(i / n * 2 * math.pi) * rx, cy + math.sin(i / n * 2 * math.pi) * ry) for i in range(n)]
    poly(img, pts, fill, alpha)


def capsule(img, p0, p1, w, fill, alpha=1.0):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    poly(img, [(p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny), (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny)], fill, alpha)
    ellipse(img, p0[0], p0[1], w / 2, w / 2, fill, alpha)
    ellipse(img, p1[0], p1[1], w / 2, w / 2, fill, alpha)


def polyline(img, pts, w, fill, alpha=1.0):
    for a, b in zip(pts, pts[1:]):
        capsule(img, a, b, w, fill, alpha)


def glow_add(img, G, strength=1.0):
    """add a black-background RGB glow image G (PIL RGB) onto img (RGBA), also raising alpha where the glow is"""
    base = np.array(img).astype(np.float32)
    g = np.array(G.convert('RGB')).astype(np.float32) * strength
    a = base[..., 3:4] / 255.0
    rgb = base[..., :3] * a + g
    lum = np.clip(g.max(axis=2, keepdims=True) / 255.0, 0, 1)
    na = np.clip(a + lum * (1 - a), 0, 1)
    out_rgb = np.where(na > 0, rgb / np.maximum(na, 1e-4), 0)
    out = np.concatenate([np.clip(out_rgb, 0, 255), na * 255], axis=2).astype(np.uint8)
    img.paste(Image.fromarray(out, 'RGBA'), (0, 0))


def glow_layer(size, draw_fn, radius):
    g = Image.new('RGB', size, (0, 0, 0))
    draw_fn(ImageDraw.Draw(g))
    return g.filter(ImageFilter.GaussianBlur(radius))


def glow_poly(img, pts, color, radius, strength=1.0):
    def d(dr):
        dr.polygon(pts, fill=color)
    glow_add(img, glow_layer(img.size, d, radius), strength)


def glow_spots(img, spots, radius, strength=1.0):
    """spots = [(x, y, r, color)]"""
    def d(dr):
        for x, y, r, c in spots:
            dr.ellipse([x - r, y - r, x + r, y + r], fill=c)
    glow_add(img, glow_layer(img.size, d, radius), strength)


# ------------------------------------------------------------------ noise / shapes
def ridge(w, base, amp, seed, rough=0.58, octaves=7, step=1):
    """1D fractal ridge heights (list of y) across width w"""
    rs = np.random.RandomState(seed)
    n = w // step + 2
    y = np.zeros(n)
    a = 1.0
    for o in range(octaves):
        cells = 2 ** (o + 2)
        pts = rs.uniform(-1, 1, cells + 2)
        xs = np.linspace(0, cells, n)
        i = np.floor(xs).astype(int)
        t = xs - i
        t = t * t * (3 - 2 * t)
        y += (pts[i] * (1 - t) + pts[i + 1] * t) * a
        a *= rough
    y = y / (np.abs(y).max() + 1e-6)
    return [(i * step, base + y[i] * amp) for i in range(n)]


def specks(img, n, seed, ymin, ymax, colors, rmin=0.8, rmax=2.2, alpha=0.9):
    rs = np.random.RandomState(seed)
    W, H = img.size
    for _ in range(n):
        x = rs.uniform(0, W)
        y = rs.uniform(ymin, ymax)
        r = rs.uniform(rmin, rmax)
        c = colors[rs.randint(len(colors))]
        ellipse(img, x, y, r, r, c, alpha * rs.uniform(0.4, 1))


def cloud(img, cx, cy, w, h, top, bot, seed, wrap=0, rim=None, flat=True):
    """soft cumulus: many circles, vertical gradient top->bottom, flat-ish bottom"""
    rs = np.random.RandomState(seed)
    W = img.size[0]
    shifts = [0] if not wrap else [-wrap, 0, wrap]
    for sh in shifts:
        n = max(5, int(w / 40))
        circles = []
        for i in range(n):
            t = (i + 0.5) / n
            r = h * (0.35 + 0.65 * math.sin(math.pi * t) ** 0.8) * rs.uniform(0.7, 1.05)
            circles.append((cx - w / 2 + t * w + sh, cy - r * 0.35 * rs.uniform(0.5, 1.2), r))
        grad = vfill(top, bot)
        for (x, y, r) in circles:
            pts = [(x + math.cos(a / 24 * 2 * math.pi) * r, y + math.sin(a / 24 * 2 * math.pi) * r * 0.82) for a in range(24)]
            if flat:
                pts = [(px, min(py, cy + h * 0.18)) for px, py in pts]
            poly(img, pts, gfill([(0, top), (1, bot)], cy - h * 1.1, cy + h * 0.2))
        if rim:
            for (x, y, r) in circles[::2]:
                ellipse(img, x - r * 0.15, y - r * 0.48, r * 0.55, r * 0.2, rim, 0.28)


def island(img, cx, top, w, depth, rock_top, rock_bot, seed, rim=None, jag=0.32, grass=None):
    """floating rock island: flat top at y=top, jagged inverted-cone underside"""
    rs = np.random.RandomState(seed)
    xl, xr = cx - w / 2, cx + w / 2
    n = 9
    under = []
    for i in range(n + 1):
        t = i / n
        env = (1 - abs(2 * t - 1) ** 1.6)
        d = depth * env * (1 - jag * rs.uniform(0, 1))
        under.append((xr - t * w, top + 4 + d))
    tip = (cx + rs.uniform(-0.1, 0.1) * w, top + depth * 1.02)
    pts = [(xl, top), (xr, top)] + under[1:-1][::1] + [tip] + [(xl, top)]
    # make a zig-zag tip
    zz = []
    for (x, y) in under:
        zz.append((x, y))
        zz.append((x - w * 0.02, y + depth * 0.1 * rs.uniform(0, 1)))
    shape = [(xl, top), (xr, top)] + zz
    poly(img, shape, gfill([(0, rock_top), (1, rock_bot)], top, top + depth))
    if grass:
        poly(img, [(xl - 2, top - 1), (xr + 2, top - 1), (xr, top + 7), (xl, top + 7)], grass)
    if rim:
        polyline(img, [(xl, top + 3), (xl + w * 0.05, top + depth * 0.25), (cx - w * 0.2, top + depth * 0.62)], 2.2, rim, 0.75)
    return shape


def stupa(img, cx, base, h, body, trim, shade=None):
    """golden bell-shaped stupa"""
    w = h * 0.5
    poly(img, [(cx - w * 0.5, base), (cx + w * 0.5, base), (cx + w * 0.42, base - h * 0.1), (cx - w * 0.42, base - h * 0.1)], trim)
    poly(img, [(cx - w * 0.36, base - h * 0.1), (cx + w * 0.36, base - h * 0.1), (cx + w * 0.3, base - h * 0.2), (cx - w * 0.3, base - h * 0.2)], body)
    bell = []
    for i in range(21):
        t = i / 20
        yy = base - h * (0.2 + 0.45 * t)
        xx = w * 0.3 * math.sin(math.pi * (0.5 + 0.5 * (1 - t))) * (1 - 0.55 * t) + w * 0.05
        bell.append((cx - xx, yy))
    bell2 = [(2 * cx - x, y) for x, y in reversed(bell)]
    poly(img, bell + bell2, body)
    if shade:
        poly(img, [(cx + 1, base - h * 0.2)] + [(x, y) for (x, y) in bell2] + [(cx + 1, base - h * 0.65)], shade, 0.5)
    for k in range(4):
        ww = w * (0.2 - k * 0.035)
        yy = base - h * (0.66 + k * 0.055)
        poly(img, [(cx - ww, yy), (cx + ww, yy), (cx + ww * 0.8, yy - h * 0.04), (cx - ww * 0.8, yy - h * 0.04)], trim)
    poly(img, [(cx - 1.2, base - h * 0.88), (cx + 1.2, base - h * 0.88), (cx, base - h)], trim)


def pagoda(img, cx, base, h, wall, roof, trim, tiers=4, shade=None):
    """multi-tier roofed pagoda (Meru style)"""
    tw = h * 0.46
    th = h / (tiers + 1.3)
    y = base
    for i in range(tiers):
        w = tw * (1 - i * 0.17)
        poly(img, [(cx - w * 0.4, y), (cx + w * 0.4, y), (cx + w * 0.36, y - th * 0.55), (cx - w * 0.36, y - th * 0.55)], wall)
        # roof with upturned eaves
        poly(img, [(cx - w * 0.62, y - th * 0.5), (cx - w * 0.5, y - th * 0.58), (cx - w * 0.3, y - th * 0.95), (cx + w * 0.3, y - th * 0.95),
                   (cx + w * 0.5, y - th * 0.58), (cx + w * 0.62, y - th * 0.5), (cx + w * 0.4, y - th * 0.43), (cx - w * 0.4, y - th * 0.43)], roof)
        capsule(img, (cx - w * 0.6, y - th * 0.46), (cx + w * 0.6, y - th * 0.46), 2.0, trim, 0.9)
        y -= th * 0.88
    poly(img, [(cx - 1.4, y), (cx + 1.4, y), (cx, y - h * 0.22)], trim)
    ellipse(img, cx, y - h * 0.06, 2.6, 2.6, trim)


def pine(img, cx, base, h, col, snow=None):
    w = h * 0.34
    for k in range(4):
        yy = base - k * h * 0.2
        ww = w * (1 - k * 0.2)
        poly(img, [(cx - ww, yy), (cx + ww, yy), (cx, yy - h * 0.34)], col)
        if snow:
            poly(img, [(cx - ww * 0.55, yy - h * 0.15), (cx + ww * 0.55, yy - h * 0.15), (cx, yy - h * 0.34)], snow, 0.9)
    poly(img, [(cx - 1.5, base), (cx + 1.5, base), (cx + 1.5, base + 7), (cx - 1.5, base + 7)], col)


def lantern(img, x, y, r, col, glow_col):
    capsule(img, (x, y - r * 2.4), (x, y - r * 0.9), 1.2, (40, 24, 30))
    ellipse(img, x, y, r * 0.8, r, col)
    capsule(img, (x - r * 0.45, y - r * 0.9), (x + r * 0.45, y - r * 0.9), 2.0, (70, 40, 30))
    capsule(img, (x, y + r * 0.9), (x, y + r * 1.9), 1.2, (60, 30, 30))
    glow_spots(img, [(x, y, r * 1.2, glow_col)], r * 2.2, 0.8)


def save_rgb(img, path):
    img.convert('RGB').save(path, optimize=True)


def save_rgba(img, path):
    img.save(path, optimize=True)
