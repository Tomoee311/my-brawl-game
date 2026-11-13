"""chibi_engine.py - draws pixel-art chibi fighters with code (no art files needed) in the same sheet layout the game uses.

Sheet = 8 columns x 11 rows of 160x128 frames (88 frames), character faces RIGHT, feet on y = 100:
   idle 0-3, run 8-13, jump 16, fall 17, hurt 18, land 19, dodge-on-spot 24-27, dodge-roll 32-35,
   attacks 40 + 3*k + phase  (phase 0 wind-up / 1 strike / 2 recover) for the 16 attack types in ATTACK_ORDER,
   light combo hit 2 = 88-90, hit 3 (finisher) = 91-93, ledge hang = 94, ledge climb = 95  (96 frames, sheet 1280 x 1536).
Each fighter lives in its own file (make_thaung.py ...) and only has to say how its parts look; this file does the rest.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 160, 128
FRAME_COLS, FRAME_ROWS = 8, 12
FEET_X, FEET_Y = 80, 97
OUTLINE = (27, 18, 36)

ATTACK_ORDER = ['nlight', 'slight', 'dlight', 'ulight', 'nheavy', 'sheavy', 'dheavy', 'uheavy',
                'uf_light', 'ub_light', 'df_light', 'db_light', 'uf_heavy', 'ub_heavy', 'df_heavy', 'db_heavy']
DIR_ANGLE = {'n': 8, 's': 0, 'd': 78, 'u': -80, 'uf': -42, 'ub': -138, 'df': 42, 'db': 138}   # 0 = forward, -90 = up, +90 = down


def hexc(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def mix(c, k):
    """k < 1 darker, k > 1 lighter"""
    if k <= 1:
        return tuple(int(max(0, min(255, v * k))) for v in c)
    return tuple(int(min(255, v + (255 - v) * (k - 1))) for v in c)


def pol(p, ang, l):
    a = math.radians(ang)
    return (p[0] + math.cos(a) * l, p[1] + math.sin(a) * l)


def rot(v, deg):
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


class Canvas:
    """RGBA numpy canvas. Every part gets a 1px dark outline + 3-tone shading, painted back to front."""

    def __init__(self):
        self.px = np.zeros((H, W, 4), np.uint8)

    def mask(self, fn):
        m = Image.new('L', (W, H), 0)
        fn(ImageDraw.Draw(m))
        return np.array(m) > 127

    def part(self, fn, color, shade=0.72, hi=1.18, outline=True, flat=False):
        m = self.mask(fn)
        if not m.any():
            return m
        if outline:
            ol = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
            self.px[ol] = (*OUTLINE, 255)
        self.px[m] = (*color, 255)
        if not flat:
            dark = m & ~np.roll(np.roll(m, -2, 0), -2, 1)      # bottom-right rim
            light = m & ~np.roll(np.roll(m, 1, 0), 1, 1)       # top-left rim
            self.px[dark] = (*mix(color, shade), 255)
            self.px[light & ~dark] = (*mix(color, hi), 255)
        return m

    def hole(self, fn):
        """cut a transparent hole (ring weapons) and give it an outline"""
        m = self.mask(fn)
        ring = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
        solid = self.px[..., 3] > 0
        self.px[m] = 0
        self.px[ring & ~m & solid] = (*OUTLINE, 255)

    def dots(self, pts, color, r=1.0):
        """small detail (eyes, studs...) drawn without outline"""
        def f(d):
            for (x, y) in pts:
                d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        self.part(f, color, outline=False, flat=True)

    def image(self):
        return Image.fromarray(self.px, 'RGBA')


# ------------------------------------------------------------------ shapes
def capsule(p0, p1, w):
    def f(d):
        d.line([p0, p1], fill=255, width=max(1, int(round(w))))
        r = w / 2.0
        for p in (p0, p1):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
    return f


def circle(c, r):
    return lambda d: d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=255)


def ellipse(c, rx, ry):
    return lambda d: d.ellipse([c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry], fill=255)


def poly(pts):
    return lambda d: d.polygon(pts, fill=255)


def curve(pts, w):
    """thick polyline made of capsules (hair tails, sashes, trunks)"""
    def f(d):
        r = w / 2.0
        for a, b in zip(pts, pts[1:]):
            d.line([a, b], fill=255, width=max(1, int(round(w))))
        for p in pts:
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
    return f


def tapered(pts, w0, w1):
    """polyline whose width goes from w0 to w1"""
    def f(d):
        n = max(1, len(pts) - 1)
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            w = w0 + (w1 - w0) * (i / n)
            d.line([a, b], fill=255, width=max(1, int(round(w))))
            r = w / 2.0
            d.ellipse([a[0] - r, a[1] - r, a[0] + r, a[1] + r], fill=255)
        w = w1
        b = pts[-1]
        d.ellipse([b[0] - w / 2.0, b[1] - w / 2.0, b[0] + w / 2.0, b[1] + w / 2.0], fill=255)
    return f


# ------------------------------------------------------------------ pose
class Pose(dict):
    """Default neutral pose; any key can be overridden."""
    DEFAULTS = dict(
        x=0.0, y=0.0,            # whole-body offset
        lean=0.0,                # torso lean (deg, + = forward)
        crouch=0.0,              # hips lowered (knees bent)
        head_dx=0.0, head_dy=0.0, head_tilt=0.0,
        leg_f=0.0, leg_b=0.0,    # leg swing angle from vertical (deg, + = forward)
        lift_f=0.0, lift_b=0.0,  # foot lift (px)
        arm_f=60.0, arm_b=100.0,    # arm angle (deg, 0 = forward, 90 = down)
        weapon=None,             # weapon angle (deg); None = carried pose of the weapon
        two_hand=False,          # back hand also holds the weapon
        face='normal',           # 'normal' | 'hurt' | 'blink' | 'yell'
        sway=0.0,                # secondary motion (hair / sash trailing), + = trails back
        alpha=1.0,
        roll=None,               # whole body rotation (deg), used by the roll dodge
        lines=0,                 # speed lines (roll dodge)
        squash=1.0,              # vertical squash of the whole frame (landing)
        strike=0,                # 1 on the active frame of an attack
        heavy=False,
        kind='idle',
    )

    def __init__(self, **kw):
        super().__init__(self.DEFAULTS)
        self.update(kw)

    def __getattr__(self, k):
        return self[k]


def skeleton(cfg, p):
    """joint positions for a pose. cfg: leg, torso, head_r, shoulder, hip_w"""
    crouch = p.crouch
    hip = (FEET_X + p.x, FEET_Y - cfg['leg'] + p.y + crouch)
    up = rot((0, -cfg['torso']), p.lean)
    neck = (hip[0] + up[0], hip[1] + up[1])
    sh_f = (neck[0] + rot((cfg['shoulder'] * 0.45, 5), p.lean)[0], neck[1] + rot((cfg['shoulder'] * 0.45, 5), p.lean)[1])
    sh_b = (neck[0] + rot((-cfg['shoulder'] * 0.55, 5), p.lean)[0], neck[1] + rot((-cfg['shoulder'] * 0.55, 5), p.lean)[1])
    hd = rot((p.head_dx, -cfg['head_r'] + 3 + p.head_dy), p.lean * 0.5 + p.head_tilt)
    head = (neck[0] + hd[0], neck[1] + hd[1])
    hw = cfg['hip_w']

    def foot(side, ang, lift):
        hx = hip[0] + (hw if side > 0 else -hw) * 0.5
        L = cfg['leg'] - crouch * 0.4
        fx = hx + math.sin(math.radians(ang)) * L + (4 if side > 0 else -4) * min(1.0, crouch / 6.0)
        fy = FEET_Y - lift
        return (hx, hip[1]), (fx, fy)

    return dict(hip=hip, neck=neck, sh_f=sh_f, sh_b=sh_b, head=head,
                leg_f=foot(+1, p.leg_f, p.lift_f), leg_b=foot(-1, p.leg_b, p.lift_b))


# ------------------------------------------------------------------ weapons (drawn at the front hand)
def draw_weapon(c, kind, style, hand, ang, pal):
    d = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
    n = (-d[1], d[0])

    def at(t, s=0.0):
        return (hand[0] + d[0] * t + n[0] * s, hand[1] + d[1] * t + n[1] * s)

    if kind == 'axe':
        haft = pal.get('haft', (110, 72, 44))
        if style == 'gear':          # Kan: spiked cog-wheel blade on a short haft
            c.part(capsule(at(-5), at(15), 3), haft)
            ctr = at(24)
            R = 11
            spikes = []
            for i in range(8):
                a = math.radians(i * 45 + ang)
                p1 = (ctr[0] + math.cos(a - 0.2) * R, ctr[1] + math.sin(a - 0.2) * R)
                p2 = (ctr[0] + math.cos(a) * (R + 4), ctr[1] + math.sin(a) * (R + 4))
                p3 = (ctr[0] + math.cos(a + 0.2) * R, ctr[1] + math.sin(a + 0.2) * R)
                spikes.append([p1, p2, p3])
            c.part(lambda dd: [dd.polygon(s, fill=255) for s in spikes], pal['steel'], shade=0.62)
            c.part(circle(ctr, R), pal['steel'])
            c.part(circle(ctr, 6.5), pal['dark'], outline=True, flat=True)
            c.part(capsule(at(24 - 5, 0), at(24 + 5, 0), 1.5), pal['gold'], outline=False, flat=True)
            c.part(capsule(at(24, -5), at(24, 5), 1.5), pal['gold'], outline=False, flat=True)
            crim = pal['accent']
            c.part(lambda dd: dd.arc([ctr[0] - R - 2, ctr[1] - R - 2, ctr[0] + R + 2, ctr[1] + R + 2], ang - 75, ang + 75, fill=255, width=2), crim, outline=False, flat=True)
        else:                        # Thaung: big double-bit battle axe
            c.part(capsule(at(-7), at(26), 3), haft)
            for sgn in (1, -1):
                pts = [at(15, sgn * 1), at(24, sgn * 2), at(27, sgn * 12), at(19, sgn * 14), at(13, sgn * 8)]
                c.part(poly(pts), pal['steel'])
            c.part(circle(at(20), 3), pal['gold'], flat=True)
    elif kind == 'katana':
        grip = pal.get('grip', (40, 34, 52))
        c.part(capsule(at(-6), at(7), 3.2), grip)
        pts = [at(8 + i * 3.2, -0.011 * (i * 3.2) ** 2) for i in range(0, 11)]
        c.part(tapered(pts, 3.6, 1.6), pal['steel'])
        c.part(capsule(at(8, 0), at(36, -10.5 * 0 - 0.011 * 28 ** 2 * 0.95), 0.9), mix(pal['steel'], 1.5), outline=False, flat=True)
        c.part(ellipse(at(7.5), 1.8, 3.4), pal['gold'])
    elif kind == 'sword':
        c.part(capsule(at(-5), at(7), 3), pal.get('grip', (90, 56, 40)))
        c.part(poly([at(8, -2.8), at(31, -2.6), at(38, 0), at(31, 2.6), at(8, 2.8)]), pal['steel'])
        c.part(capsule(at(18, 0), at(33, 0), 0.9), mix(pal['steel'], 1.5), outline=False, flat=True)
        c.part(capsule(at(7.5, -5.5), at(7.5, 5.5), 2.6), pal['gold'])
        c.dots([at(-6, 0)], pal['gold'], 1.6)
    elif kind == 'chakram':
        ctr = at(11)
        R0 = 10
        spikes = []
        for i in range(8):
            a = math.radians(i * 45 + 22)
            p1 = (ctr[0] + math.cos(a - 0.22) * R0, ctr[1] + math.sin(a - 0.22) * R0)
            p2 = (ctr[0] + math.cos(a) * (R0 + 4.5), ctr[1] + math.sin(a) * (R0 + 4.5))
            p3 = (ctr[0] + math.cos(a + 0.22) * R0, ctr[1] + math.sin(a + 0.22) * R0)
            spikes.append([p1, p2, p3])
        c.part(lambda dd: [dd.polygon(s, fill=255) for s in spikes], pal['steel'], shade=0.62)
        c.part(circle(ctr, R0), pal['steel'])
        c.hole(circle(ctr, 5.4))
        c.part(lambda dd: dd.arc([ctr[0] - R0 + 1.5, ctr[1] - R0 + 1.5, ctr[0] + R0 - 1.5, ctr[1] + R0 - 1.5], 200, 340, fill=255, width=2), pal['gold'], outline=False, flat=True)
    elif kind == 'spear':
        c.part(capsule(at(-14), at(36), 2.4), pal.get('haft', (126, 86, 50)))
        tip = [at(36, 0), at(41, -3.5), at(52, 0), at(41, 3.5)]
        c.part(poly(tip), pal['steel'])
        tas = [at(35, 0), (at(33, 0)[0] - n[0] * 1 + 0, at(33, 0)[1] + 7), (at(34, 0)[0] + 3, at(34, 0)[1] + 8)]
        c.part(poly(tas), pal['accent'], flat=True)
        c.dots([at(31, 0)], pal['gold'], 1.7)
    elif kind == 'gun':
        c.part(poly([at(-3, -3.2), at(14, -3.6), at(14, 3.2), at(-3, 3.2)]), pal['dark'])
        c.part(poly([at(-1, 0), at(4, 0), at(2, 9), at(-4, 8)]), pal.get('grip', (70, 50, 44)))
        c.part(poly([at(4, -3.2), at(12, -3.2), at(12, -1.2), at(4, -1.2)]), pal['steel'], outline=False, flat=True)
        c.dots([at(14, 0)], pal['accent'], 1.3)
        c.dots([at(0, -1.5)], pal['accent'], 0.9)


def carried_angle(kind, p):
    """default weapon angle when not attacking"""
    return {'axe': -62, 'spear': -84, 'gun': 24, 'katana': -38, 'sword': -58, 'chakram': 28}.get(kind, 0)


# ------------------------------------------------------------------ one frame
def render(cfg, dress, weapon, pose, style=None):
    """weapon: None | 'axe' | 'spear' | 'gun'"""
    p = pose
    c = Canvas()
    J = skeleton(cfg, p)
    # ground shadow
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).ellipse([FEET_X - 17 + p.x * 0.5, FEET_Y, FEET_X + 17 + p.x * 0.5, FEET_Y + 6], fill=255)
    shm = np.array(sh) > 127
    c.px[shm] = (20, 14, 30, 110)

    wa = p.weapon if p.weapon is not None else carried_angle(weapon, p)
    arm_len = cfg['arm']
    if weapon:
        hand_f = pol(J['sh_f'], wa + (-8 if p.weapon is None else 0), arm_len * (1.0 if p.strike else 0.85)) if p.weapon is not None else pol(J['sh_f'], p.arm_f, arm_len)
    else:
        hand_f = pol(J['sh_f'], p.arm_f, arm_len)
    if weapon and p.weapon is not None and p.two_hand:
        hand_b = pol(J['sh_b'], wa + 18, arm_len * 0.9)
    else:
        hand_b = pol(J['sh_b'], p.arm_b, arm_len)
    J['hand_f'], J['hand_b'] = hand_f, hand_b

    dress(c, cfg, p, J, weapon, wa, style)

    img = c.image()
    if p.roll is not None:
        pivot = (FEET_X + p.x, FEET_Y - 26)
        img = img.rotate(-p.roll, resample=Image.NEAREST, center=pivot)
        arr = np.array(img)
        if p.lines:
            for i in range(p.lines):
                y = int(pivot[1] - 10 + i * 9)
                x0 = int(pivot[0] - 52 - i * 3)
                arr[y:y + 2, x0:x0 + 22 + i * 4] = (235, 240, 255, 200)
            img = Image.fromarray(arr, 'RGBA')
    if p.squash != 1.0:
        sq = max(1, int(round(H * p.squash)))
        crop = img.resize((W, sq), Image.NEAREST)
        base = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        base.paste(crop, (0, H - sq - (H - FEET_Y - 28)) if False else (0, int((FEET_Y + 1) * (1 - p.squash))))
        img = base
    if p.alpha < 1.0:
        arr = np.array(img)
        arr[..., 3] = (arr[..., 3] * p.alpha).astype(np.uint8)
        img = Image.fromarray(arr, 'RGBA')
    return img


# ------------------------------------------------------------------ pose tables
def pose_idle(i, weapon):
    b = [0, -1, -1, 0][i]
    return Pose(y=0, head_dy=b * -0.0, head_dx=0, arm_f=62 + [0, 4, 4, 0][i], arm_b=108, crouch=[0, 0.5, 0.5, 0][i],
                head_tilt=[0, 1, 1, 0][i], sway=[0, 1.2, 2, 1][i], kind='idle', lean=1)


def pose_run(i, weapon):
    ph = i / 6.0 * 2 * math.pi
    s = math.sin(ph)
    c = math.cos(ph)
    return Pose(lean=9, y=-abs(math.sin(ph)) * 2.0, leg_f=s * 42, leg_b=-s * 42, lift_f=max(0, -c) * 5 + max(0, s) * 1.5,
                lift_b=max(0, c) * 5 + max(0, -s) * 1.5, arm_f=60 - s * 38, arm_b=110 + s * 38, sway=7 + c * 2, kind='run', crouch=1)


def pose_air(rising):
    if rising:
        return Pose(lean=-3, leg_f=22, leg_b=-8, lift_f=7, lift_b=11, arm_f=-40, arm_b=-110, y=-1, kind='jump', sway=-4, crouch=-1)
    return Pose(lean=2, leg_f=14, leg_b=-16, lift_f=3, lift_b=5, arm_f=-12, arm_b=190, y=-1, kind='fall', sway=-8, crouch=-1)


def pose_hurt():
    return Pose(lean=-16, head_dx=-2, head_tilt=-14, leg_f=-18, leg_b=14, lift_f=4, arm_f=-150, arm_b=190, face='hurt', sway=9, kind='hurt', crouch=1, x=-2)


def pose_land():
    return Pose(squash=0.9, crouch=5, lean=3, leg_f=26, leg_b=-26, arm_f=40, arm_b=120, kind='land', sway=2)


def pose_dodge_spot(i):
    return Pose(alpha=0.55, x=[-5, -9, 8, 3][i], lean=-9 + i * 4, crouch=3, arm_f=70, arm_b=100, kind='dodge', sway=5, face='blink')


def pose_dodge_roll(i):
    return Pose(roll=[40, 100, 190, 280][i], y=[0, -2, -3, 0][i], x=[2, 4, 4, 2][i], lines=3, leg_f=-20, leg_b=20, arm_f=-30, arm_b=30, crouch=4,
                kind='roll', face='blink', sway=0)


def style_for(style, kind, token):
    """per-fighter attack look: style = {'light': {...}, 'heavy': {...}, 'heavy_u': {...}}  (general -> specific)"""
    st = {}
    if style:
        st.update(style.get(kind, {}))
        parent = {'uf': 'u', 'ub': 'u', 'df': 'd', 'db': 'd'}.get(token)
        if parent:      # diagonal: start from the straight up / down pose but keep the diagonal's own 45-degree weapon angle
            inh = dict(style.get(kind + '_' + parent, {}))
            inh.pop('a_s', None)
            st.update(inh)
        st.update(style.get(kind + '_' + token, {}))
    return st


def pose_attack(name, phase, weapon, style=None):
    """phase 0 = wind-up, 1 = strike, 2 = recover.  Style keys (all optional):
       wind / after     weapon swing-back / follow-through (degrees)      a_s  absolute weapon angle on the strike
       x_w x_s x_r      body shift (px) in each phase (x_s = lunge)        y_s  hop (negative = up)
       lean_w lean_s lean_r   torso lean   |  crouch_w crouch_s  |  spin_s spin_r  whole-body roll (degrees)
       two (two hands)  face  leg_f_s leg_b_s (stance on the strike)"""
    heavy = 'heavy' in name
    kind = 'heavy' if heavy else 'light'
    token = name.split('_')[0] if '_' in name else name[0]
    st = style_for(style, kind, token)
    a = DIR_ANGLE[token]
    a_use = st.get('a_s', a)
    u = token in ('u', 'uf', 'ub')
    d = token in ('d', 'df', 'db')
    k = 1.0 if not heavy else 1.5
    two = st.get('two', heavy)
    face = st.get('face', 'yell' if heavy else 'normal')
    if phase == 0:      # wind-up
        if 'wind' in st:
            wa = a_use + st['wind'] * 0.9 if token == 'u' else a_use - st['wind']
        else:
            wa = a - (70 if not heavy else 105)
            if token == 'd':
                wa = a - 95
            if token == 'u':
                wa = a + 60
        return Pose(weapon=wa, lean=st.get('lean_w', -8 * k), crouch=st.get('crouch_w', 2 + (3 if heavy else 0) + (2 if d else 0)), x=st.get('x_w', -3 * k),
                    leg_f=6, leg_b=-16, arm_f=a - 80, arm_b=150, two_hand=two, face=face if heavy else st.get('face', 'normal'), sway=-3, heavy=heavy,
                    kind='atk', strike=0, roll=st.get('spin_w'))
    if phase == 1:      # strike
        lunge = st.get('x_s', 7 * k if token not in ('u',) else 2)
        ys = st.get('y_s', 0)
        lift = st.get('lift_s', max(0, -ys * 0.9))          # a hop / rise lifts the feet off the ground too (the shadow stays on the floor)
        return Pose(weapon=a_use, lean=st.get('lean_s', (10 if not u else -4) * k), crouch=st.get('crouch_s', 1 if not d else 4), x=lunge, y=ys,
                    leg_f=st.get('leg_f_s', 26 if not u else 6), leg_b=st.get('leg_b_s', -24 if not u else -6), lift_f=lift, lift_b=(lift * 1.15 if lift else (0 if not u else 2)),
                    arm_f=a_use, arm_b=70 if not two else a_use + 20, two_hand=two, face='yell', sway=9 * k, strike=1, heavy=heavy, kind='atk',
                    roll=st.get('spin_s'))
    yr = st.get('y_r', 0)
    return Pose(weapon=a_use + st.get('after', 28 if not heavy else 44), lean=st.get('lean_r', 3), crouch=2, x=st.get('x_r', 2 * k), y=yr,
                lift_f=max(0, -yr * 0.9), lift_b=max(0, -yr * 1.0), leg_f=14, leg_b=-10, arm_f=a_use + 40, arm_b=100, sway=4, strike=0, heavy=heavy, kind='atk', roll=st.get('spin_r'))


def pose_combo(hit, phase, weapon, style=None):
    """light combo hit 2 / 3.  style may hold 'combo2' / 'combo3' (same keys as pose_attack styles)."""
    if hit == 2:
        st = dict(wind=-50, x_s=8, lean_s=12, after=20, crouch_s=1)
        st.update((style or {}).get('combo2', {}))
        return pose_attack('slight', phase, weapon, {'light': st})
    st = dict(wind=110, crouch_w=3, x_w=-4, x_s=13, lean_s=18, crouch_s=2, after=50)
    st.update((style or {}).get('combo3', {}))
    return pose_attack('sheavy', phase, weapon, {'heavy': st})


def pose_ledge(climb):
    if climb:   # pulling up onto the stage
        return Pose(lean=14, crouch=4, arm_f=-40, arm_b=-70, leg_f=20, leg_b=-10, lift_f=6, lift_b=0, x=3, y=-2, kind='ledge', sway=-4)
    return Pose(arm_f=-95, arm_b=-102, leg_f=4, leg_b=-6, lift_f=12, lift_b=14, lean=0, kind='ledge', sway=1)


# ------------------------------------------------------------------ sheet
def build_sheet(cfg, dress, weapon, style=None, atk_style=None):
    sheet = Image.new('RGBA', (W * FRAME_COLS, H * FRAME_ROWS), (0, 0, 0, 0))

    def put(idx, img):
        sheet.paste(img, ((idx % FRAME_COLS) * W, (idx // FRAME_COLS) * H))

    for i in range(4):
        put(i, render(cfg, dress, weapon, pose_idle(i, weapon), style))
    for i in range(6):
        put(8 + i, render(cfg, dress, weapon, pose_run(i, weapon), style))
    put(16, render(cfg, dress, weapon, pose_air(True), style))
    put(17, render(cfg, dress, weapon, pose_air(False), style))
    put(18, render(cfg, dress, weapon, pose_hurt(), style))
    put(19, render(cfg, dress, weapon, pose_land(), style))
    for i in range(4):
        put(24 + i, render(cfg, dress, weapon, pose_dodge_spot(i), style))
        put(32 + i, render(cfg, dress, weapon, pose_dodge_roll(i), style))
    for k, name in enumerate(ATTACK_ORDER):
        for ph in range(3):
            put(40 + k * 3 + ph, render(cfg, dress, weapon, pose_attack(name, ph, weapon, atk_style), style))
    for hit in (2, 3):                                    # light combo hit 2 (88-90) and hit 3 / finisher (91-93)
        for ph in range(3):
            put(88 + (hit - 2) * 3 + ph, render(cfg, dress, weapon, pose_combo(hit, ph, weapon, atk_style), style))
    put(94, render(cfg, dress, weapon, pose_ledge(False), style))     # hanging on a ledge
    put(95, render(cfg, dress, weapon, pose_ledge(True), style))      # climbing up
    return sheet


def preview(sheet, frames, path, zoom=2, cols=8):
    rows = (len(frames) + cols - 1) // cols
    m = Image.new('RGBA', (W * cols, H * rows), (78, 84, 100, 255))
    for i, fi in enumerate(frames):
        f = sheet.crop(((fi % FRAME_COLS) * W, (fi // FRAME_COLS) * H, (fi % FRAME_COLS) * W + W, (fi // FRAME_COLS) * H + H))
        m.alpha_composite(f, ((i % cols) * W, (i // cols) * H))
    m = m.resize((m.width * zoom // 1, m.height * zoom // 1), Image.NEAREST)
    m.save(path)
