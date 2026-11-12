"""fighters2.py - redesigned look of the six original fighters (new names, new chibi style).
   Zayar (dante) | Sandar (sekiro) | Weikza (zawgyi) | Sithu (minsitthar) | Thura (aung_zeya) | Padamya (thazin)
A generic humanoid builder draws the common parts; each fighter's spec gives colours, sizes and 3 hooks
(back = cape / hair behind the body, head = hair / hat / helmet, front = scarf / armour on top).
"""
import math
from chibi_engine import *
from fighters import face, R


def humanoid(spec):
    t = spec

    def dress(c, cfg, p, J, weapon, wa, style):
        hip, neck, head = J['hip'], J['neck'], J['head']
        ln, sway = p.lean, p.sway
        skin = t['skin']
        # ---- behind the body
        if t.get('back'):
            t['back'](c, cfg, p, J, t)
        # back arm
        c.part(capsule(J['sh_b'], J['hand_b'], t['arm_w']), mix(t.get('sleeve') or skin, 0.8))
        c.part(circle(J['hand_b'], 3.3), mix(t.get('glove') or skin, 0.8))
        # back leg
        hb, fb = J['leg_b']
        legs(c, t, hb, fb, True)
        # ---- torso
        tw0, tw1 = t['tw'][0], t['tw'][1]
        body = [R((-tw0, 0), ln, hip), R((tw0, 0), ln, hip), R((tw1, -cfg['torso'] - 1), ln, hip), R((-tw1, -cfg['torso'] - 1), ln, hip)]
        c.part(poly(body), t['torso'])
        if t.get('torso_fn'):
            t['torso_fn'](c, cfg, p, J, t)
        # belt
        if t.get('belt'):
            c.part(poly([R((-tw0 - .5, -1), ln, hip), R((tw0 + .5, -1), ln, hip), R((tw0 + .5, -4.6), ln, hip), R((-tw0 - .5, -4.6), ln, hip)]), t['belt'])
        # skirt / coat front
        if t.get('skirt'):
            L = t['skirt_len']
            sk = [R((-tw0 - 1, -2), ln, hip), R((tw0 + 1.5, -2), ln, hip), R((tw0 + 4 + sway * 0.25, L), ln, hip), R((-tw0 - 3, L), ln, hip)]
            c.part(poly(sk), t['skirt'])
            if t.get('skirt_trim'):
                c.part(capsule(R((-tw0 - 2, L - 0.8), ln, hip), R((tw0 + 3, L - 0.8), ln, hip), 1.4), t['skirt_trim'], outline=False, flat=True)
        # front leg
        hf, ff = J['leg_f']
        legs(c, t, hf, ff, False)
        # ---- head
        c.part(circle(head, cfg['head_r']), skin)
        if t.get('head_back'):
            t['head_back'](c, cfg, p, J, t)
        face(c, head, p, cfg['head_r'], eye_col=t.get('eye', (30, 20, 40)), dx=t.get('face_dx', 0.5), dy=t.get('face_dy', 0.8), spread=t.get('eye_spread', 5.2),
             size=t.get('eye_size', 1.0))
        if t.get('head'):
            t['head'](c, cfg, p, J, t)
        # ---- front arm + weapon
        c.part(capsule(J['sh_f'], J['hand_f'], t['arm_w']), t.get('sleeve') or skin)
        ang = math.degrees(math.atan2(J['hand_f'][1] - J['sh_f'][1], J['hand_f'][0] - J['sh_f'][0]))
        if t.get('bracer'):
            c.part(capsule(pol(J['hand_f'], ang + 180, 3.4), J['hand_f'], t['arm_w'] + 1.3), t['bracer'])
        c.part(circle(J['hand_f'], 3.4), t.get('glove') or skin)
        if weapon:
            draw_weapon(c, weapon, t.get('wstyle'), J['hand_f'], wa, t['wpal'])
            c.part(circle(J['hand_f'], 3.4), t.get('glove') or skin)
            if p.two_hand and weapon in ('axe', 'sword', 'katana', 'spear'):
                c.part(circle(J['hand_b'], 3.4), t.get('glove') or skin)
        if t.get('front'):
            t['front'](c, cfg, p, J, t)

    return dress


def legs(c, t, h, f, back):
    k = 0.8 if back else 1.0
    pc, bc = mix(t['pants'], k), mix(t['boots'], k)
    split = t.get('boot_len', 0.5)
    mid = (h[0] + (f[0] - h[0]) * (1 - split), h[1] + (f[1] - h[1]) * (1 - split))
    c.part(capsule(h, f, t['leg_w']) if split >= 1 else capsule(h, mid, t['leg_w']), pc)
    if split < 1:
        c.part(capsule((h[0] + (f[0] - h[0]) * (1 - split - 0.1), h[1] + (f[1] - h[1]) * (1 - split - 0.1)), f, t['boot_w']), bc)
    fw = t.get('foot', (5.8, 3.0))
    c.part(ellipse((f[0] + 2.2, f[1] - 1.5), fw[0], fw[1]), bc)


def trail(p, base, pts, flex=1.0):
    """list of points that sway backwards with the pose's sway"""
    return [(base[0] + dx - p.sway * k * flex, base[1] + dy + p.sway * 0.12 * k * flex) for dx, dy, k in pts]


# =============================================================== ZAYAR - the Night Duelist (Kyaw's new look)
ZAYAR = dict(skin=hexc('#f0c8a0'), torso=hexc('#23232f'), tw=(6.5, 8), arm_w=5, sleeve=hexc('#23232f'), glove=hexc('#15151c'), bracer=hexc('#36d1ff'),
             pants=hexc('#2c2c3a'), boots=hexc('#15151c'), leg_w=6.8, boot_w=5.6, boot_len=0.55, belt=hexc('#aab4c6'),
             skirt=hexc('#23232f'), skirt_len=8, skirt_trim=hexc('#36d1ff'), eye=hexc('#18a8d8'), eye_spread=5.0,
             wpal=dict(steel=hexc('#dfe9f7'), gold=hexc('#36d1ff'), grip=hexc('#15151c'), dark=hexc('#2a2f3c'), accent=hexc('#36d1ff')))


def zayar_back(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    # long coat tails flying behind
    tails = trail(p, R((-3, -4), ln, hip), [(0, 0, 0), (-7, 5, 1.0), (-14, 10, 1.7)])
    c.part(tapered(tails, 8, 4), hexc('#23232f'))
    c.part(capsule(tails[1], tails[2], 1.3), t['bracer'], outline=False, flat=True)


def zayar_head(c, cfg, p, J, t):
    hx, hy = J['head']
    hair = hexc('#1b2133')
    sp = [[(hx - 10, hy - 3), (hx - 15 - p.sway * .4, hy - 9), (hx - 5, hy - 9)], [(hx - 7, hy - 8), (hx - 10, hy - 19), (hx - 1, hy - 11)],
          [(hx - 2, hy - 10), (hx + 2, hy - 21), (hx + 6, hy - 10)], [(hx + 4, hy - 10), (hx + 12, hy - 17), (hx + 10, hy - 4)]]
    c.part(lambda d: [d.polygon(s, fill=255) for s in sp], hair)
    c.part(lambda d: d.pieslice([hx - 10.5, hy - 10.5, hx + 10.5, hy + 10.5], 200, 340, fill=255), hair, outline=False)
    c.part(capsule((hx - 2, hy - 18), (hx + 1, hy - 9), 1.6), hexc('#36d1ff'), outline=False, flat=True)      # cyan streak
    c.part(capsule((hx + 7.5, hy - 8), (hx + 4.5, hy - 5.8), 1.8), hair, outline=False, flat=True)                    # fringe over the eye


def zayar_front(c, cfg, p, J, t):
    hip, neck = J['hip'], J['neck']
    ln = p.lean
    c.part(poly([R((-7, -cfg['torso'] - 1), ln, hip), R((7.5, -cfg['torso'] - 1), ln, hip), R((6, -cfg['torso'] + 3), ln, hip), R((-6, -cfg['torso'] + 3), ln, hip)]), hexc('#23232f'))
    c.part(capsule(R((-6, -cfg['torso'] + 3), ln, hip), R((6.5, -cfg['torso'] + 3), ln, hip), 1.2), t['bracer'], outline=False, flat=True)
    c.dots([R((2, -3), ln, hip)], hexc('#dfe9f7'), 1.5)


ZAYAR['back'], ZAYAR['head'], ZAYAR['front'] = zayar_back, zayar_head, zayar_front


# =============================================================== SANDAR - the Moon Reaper (Thiri's new look)
SANDAR = dict(skin=hexc('#f6d8c2'), torso=hexc('#f1eef8'), tw=(6, 7.5), arm_w=4.8, sleeve=hexc('#f1eef8'), bracer=hexc('#2c3f8f'),
              pants=hexc('#2c3f8f'), boots=hexc('#1b1f3a'), leg_w=8.2, boot_w=5, boot_len=0.3, belt=hexc('#1fb8a8'),
              skirt=hexc('#2c3f8f'), skirt_len=10, skirt_trim=hexc('#e8c15a'), eye=hexc('#d99a1c'), eye_spread=5.0,
              wpal=dict(steel=hexc('#e6ecff'), gold=hexc('#e8c15a'), grip=hexc('#2c3f8f'), accent=hexc('#1fb8a8'), haft=hexc('#4a2f5c'), dark=hexc('#2c3f8f')))


def sandar_back(c, cfg, p, J, t):
    hx, hy = J['head']
    hip = J['hip']
    ln = p.lean
    hair = hexc('#a99bff')
    tail = [(hx - 7, hy - 4), (hx - 13 - p.sway * 0.7, hy + 2), (hx - 18 - p.sway * 1.1, hy + 12), (hx - 17 - p.sway * 0.9, hy + 25)]
    c.part(tapered(tail, 8, 2.4), hair)
    obi = [R((-4, -4), ln, hip), R((-10 - p.sway, -1), ln, hip), R((-15 - p.sway * 1.3, 5), ln, hip)]
    c.part(tapered(obi, 5, 3), t['belt'])


def sandar_head(c, cfg, p, J, t):
    hx, hy = J['head']
    hair = hexc('#a99bff')
    c.part(lambda d: d.pieslice([hx - 11, hy - 11, hx + 11, hy + 11], 196, 344, fill=255), hair, outline=True)
    c.part(poly([(hx - 3, hy - 9), (hx + 10, hy - 8), (hx + 8.5, hy - 3.5), (hx + 5, hy - 6), (hx + 1.5, hy - 3.5)]), hair, outline=False)
    c.part(capsule((hx - 9, hy - 1), (hx - 10, hy + 5), 2.6), hair)                                    # side lock
    c.part(lambda d: d.pieslice([hx - 2, hy - 20, hx + 8, hy - 10], 40, 320, fill=255), hexc('#e8c15a'))   # crescent moon ornament
    c.part(circle((hx + 3.5, hy - 14.6), 3.4), hair, outline=False, flat=True)


SANDAR['back'], SANDAR['head'] = sandar_back, sandar_head


def sandar_front(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    c.part(poly([R((0, -cfg['torso'] - 1), ln, hip), R((5, -cfg['torso'] - 1), ln, hip), R((1.5, -4), ln, hip), R((-1.5, -4), ln, hip)]), t['bracer'], outline=False, flat=True)   # V lapel
    c.part(poly([R((-6.5, -1), ln, hip), R((6.5, -1), ln, hip), R((6.5, -5), ln, hip), R((-6.5, -5), ln, hip)]), t['belt'])


SANDAR['front'] = sandar_front


# =============================================================== WEIKZA - the Mist Alchemist (Zaw Gyi's new look)
WEIKZA = dict(skin=hexc('#d9a778'), torso=hexc('#6a3fb0'), tw=(6.8, 8), arm_w=5, sleeve=hexc('#6a3fb0'), bracer=hexc('#e8c15a'),
              pants=hexc('#4a2a80'), boots=hexc('#5a3a28'), leg_w=7, boot_w=5.6, boot_len=0.6, belt=hexc('#e8c15a'),
              skirt=hexc('#6a3fb0'), skirt_len=11, skirt_trim=hexc('#e8c15a'), eye=hexc('#2a2a44'), eye_spread=5.0, face_dy=1.6,
              wpal=dict(steel=hexc('#d8f2ff'), gold=hexc('#e8c15a'), accent=hexc('#7de0ff'), haft=hexc('#6a4a2a'), dark=hexc('#3a2a20'), grip=hexc('#6a4a2a')))


def weikza_back(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    cape = trail(p, R((-4, -14), ln, hip), [(0, 0, 0), (-6, 8, 0.9), (-10, 17, 1.4), (-9, 24, 1.1)])
    c.part(tapered(cape, 9, 6), hexc('#8a2f9e'))
    # floating mist orbs
    hx, hy = J['head']
    for i, (ox, oy) in enumerate([(-17, -6), (-21, 8)]):
        o = (hx + ox - p.sway * 0.4, hy + oy + math.sin(p.x * 0.3 + i * 2) * 1.0)
        c.part(circle(o, 3.2), hexc('#7de0ff'), flat=True)
        c.dots([(o[0] - 0.8, o[1] - 0.8)], (255, 255, 255), 0.9)


def weikza_head(c, cfg, p, J, t):
    hx, hy = J['head']
    # long white beard + moustache
    c.part(poly([(hx - 2, hy + 3), (hx + 8, hy + 3), (hx + 6 + p.sway * -0.1, hy + 17), (hx + 1, hy + 21), (hx - 3, hy + 14)]), hexc('#f2f0f4'))
    c.part(capsule((hx + 1, hy + 4), (hx + 9, hy + 4.5), 2.2), hexc('#f2f0f4'), outline=False)
    # bushy brows
    c.part(capsule((hx + 0, hy - 2.5), (hx + 4, hy - 3.2), 1.6), hexc('#f2f0f4'), outline=False, flat=True)
    c.part(capsule((hx + 5.5, hy - 3.2), (hx + 9.5, hy - 2.4), 1.6), hexc('#f2f0f4'), outline=False, flat=True)
    # pointed hat (bent tip) + gold band
    c.part(ellipse((hx + 1, hy - 7), 15, 3.4), hexc('#4a2a80'))
    tip = (hx - 8 - p.sway * 0.7, hy - 22)
    c.part(poly([(hx - 10, hy - 7), (hx + 11, hy - 7), (hx + 6, hy - 16), tip]), hexc('#6a3fb0'))
    c.part(capsule((hx - 9, hy - 8), (hx + 10, hy - 8), 2.6), hexc('#e8c15a'))
    c.dots([(hx + 1, hy - 14)], hexc('#7de0ff'), 1.4)


WEIKZA['back'], WEIKZA['head'] = weikza_back, weikza_head


# =============================================================== SITHU - the Golden Guard (Min Sit Thar's new look)
SITHU = dict(skin=hexc('#d9a070'), torso=hexc('#e0ad2c'), tw=(7.5, 9), arm_w=5.4, sleeve=hexc('#2a4fa8'), bracer=hexc('#e0ad2c'), glove=hexc('#8a6a2a'),
             pants=hexc('#2a4fa8'), boots=hexc('#6a4a2a'), leg_w=7.4, boot_w=6, boot_len=0.5, belt=hexc('#8a2030'),
             skirt=hexc('#2a4fa8'), skirt_len=7, skirt_trim=hexc('#e0ad2c'), eye=hexc('#2a1a10'), eye_spread=5.0, foot=(6.2, 3.2),
             wpal=dict(steel=hexc('#dfe6f2'), gold=hexc('#e0ad2c'), haft=hexc('#6e4a2c'), grip=hexc('#8a2030'), dark=hexc('#3a2a20'), accent=hexc('#e0ad2c')))


def sithu_back(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    cape = trail(p, R((-4, -13), ln, hip), [(0, 0, 0), (-7, 8, 1.0), (-12, 17, 1.5), (-11, 23, 1.2)])
    c.part(tapered(cape, 10, 7), hexc('#8a2030'))
    c.part(capsule(cape[1], cape[3], 1.2), hexc('#e0ad2c'), outline=False, flat=True)


def sithu_head(c, cfg, p, J, t):
    hx, hy = J['head']
    gold = hexc('#e0ad2c')
    # golden spire helmet with cheek guard and red plume
    c.part(lambda d: d.pieslice([hx - 11.5, hy - 12, hx + 11.5, hy + 11], 180, 360, fill=255), gold)
    c.part(poly([(hx - 11, hy - 4), (hx - 6, hy - 4), (hx - 6, hy + 8), (hx - 11, hy + 3)]), gold)
    c.part(poly([(hx - 3, hy - 12), (hx + 3, hy - 12), (hx + 0.5, hy - 24)]), gold)
    c.part(capsule((hx - 10, hy - 4.5), (hx + 10.5, hy - 4.5), 2.4), hexc('#8a2030'))
    plume = trail(p, (hx - 5, hy - 12), [(0, 0, 0), (-6, -5, 0.8), (-12, -3, 1.5), (-17, 2, 1.8)])
    c.part(tapered(plume, 4.5, 1.8), hexc('#d4262e'))
    c.part(capsule((hx + 3, hy + 5), (hx + 9, hy + 5), 1.6), hexc('#2a1a10'), outline=False, flat=True)       # moustache


def sithu_front(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    c.part(circle(R((0, -9), ln, hip), 3.4), hexc('#8a2030'))
    c.dots([R((0, -9), ln, hip)], hexc('#f4d27a'), 1.3)
    c.part(circle(J['sh_f'], 5.2), hexc('#e0ad2c'))


SITHU['back'], SITHU['head'], SITHU['front'] = sithu_back, sithu_head, sithu_front


# =============================================================== THURA - the Dragonfire Monk (Oak Soe's new look)
THURA = dict(skin=hexc('#d89a68'), torso=hexc('#b0202c'), tw=(6.5, 8.2), arm_w=5.2, sleeve=None, bracer=hexc('#f0b030'), glove=None,
             pants=hexc('#3a2a2a'), boots=hexc('#8a6a3a'), leg_w=7, boot_w=5.2, boot_len=0.35, belt=hexc('#f0b030'),
             skirt=hexc('#b0202c'), skirt_len=9, skirt_trim=hexc('#f0b030'), eye=hexc('#3a1a10'), eye_spread=5.0, face_dy=1.0,
             wpal=dict(steel=hexc('#ffd7a8'), gold=hexc('#ff8a1e'), grip=hexc('#5a2a1a'), accent=hexc('#ff4a1e'), haft=hexc('#7a3a22'), dark=hexc('#3a1a10')))


def thura_back(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    fl = trail(p, R((-4, -5), ln, hip), [(0, 0, 0), (-7, 0, 1.0), (-13, 3, 1.6)])
    c.part(tapered(fl, 5, 2), hexc('#ff8a1e'))                    # flame-coloured scarf tail
    fl2 = trail(p, R((-4, -8), ln, hip), [(0, 0, 0), (-7, -3, 1.3), (-12, -1, 1.9)])
    c.part(tapered(fl2, 4, 1.5), hexc('#ffd24a'))


def thura_head(c, cfg, p, J, t):
    hx, hy = J['head']
    c.part(capsule((hx - 1, hy - 3.6), (hx + 4, hy - 4.3), 1.4), hexc('#3a1a10'), outline=False, flat=True)      # strong brows
    c.part(capsule((hx + 5.5, hy - 4.3), (hx + 10, hy - 3.6), 1.4), hexc('#3a1a10'), outline=False, flat=True)
    c.part(poly([(hx + 3.5, hy - 9.5), (hx + 5.5, hy - 9.5), (hx + 4.5, hy - 5.2)]), hexc('#ff8a1e'), outline=False, flat=True)   # forehead flame mark
    c.part(ellipse((hx - 9.5, hy + 1), 2, 3), mix(t['skin'], 1.0))                                                # ear
    c.part(capsule((hx + 3, hy + 6), (hx + 8, hy + 6), 1.3), hexc('#5a3a2a'), outline=False, flat=True)          # calm mouth


def thura_front(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    # bare shoulder panel + prayer beads
    c.part(poly([R((1, -cfg['torso'] - 1), ln, hip), R((8.5, -cfg['torso'] - 1), ln, hip), R((6.5, -3), ln, hip), R((-1, -9), ln, hip)]), hexc('#d89a68'))
    beads = [R((-5 + i * 2.2, -cfg['torso'] + 1 + (4 - abs(i - 2.5) * 1.1)), ln, hip) for i in range(6)]
    c.dots(beads, hexc('#4a2a1a'), 1.2)
    c.part(circle(J['sh_f'], 4.6), hexc('#d89a68'))


THURA['back'], THURA['head'], THURA['front'] = thura_back, thura_head, thura_front


# =============================================================== PADAMYA - the Violet Lotus Dancer (Thazin's new look)
PADAMYA = dict(skin=hexc('#f0c8a4'), torso=hexc('#8b4fd8'), tw=(5.8, 7), arm_w=4.4, sleeve=None, bracer=hexc('#f3d27a'), glove=None,
               pants=hexc('#6b36b8'), boots=hexc('#f3d27a'), leg_w=7.6, boot_w=4.4, boot_len=0.2, belt=hexc('#f3d27a'),
               skirt=hexc('#8b4fd8'), skirt_len=8, skirt_trim=hexc('#f3d27a'), eye=hexc('#5a2aa0'), eye_spread=5.0, foot=(5, 2.6),
               wpal=dict(steel=hexc('#e7ddff'), gold=hexc('#f3d27a'), accent=hexc('#ff9ed6'), haft=hexc('#6b36b8'), dark=hexc('#6b36b8')))


def padamya_back(c, cfg, p, J, t):
    hx, hy = J['head']
    hip = J['hip']
    ln = p.lean
    braid = [(hx - 7, hy - 2), (hx - 13 - p.sway * 0.7, hy + 5), (hx - 16 - p.sway * 1.0, hy + 16), (hx - 13 - p.sway * 0.8, hy + 27)]
    c.part(tapered(braid, 6, 3), hexc('#3a2058'))
    c.dots([braid[-1]], hexc('#ff9ed6'), 2.0)
    sc = trail(p, R((-5, -12), ln, hip), [(0, 0, 0), (-8, -2, 1.1), (-15, 2, 1.7), (-21, 0, 2.2)])
    c.part(tapered(sc, 4.5, 2.4), hexc('#f4eaff'))                      # long flowing scarf


def padamya_head(c, cfg, p, J, t):
    hx, hy = J['head']
    hair = hexc('#3a2058')
    c.part(lambda d: d.pieslice([hx - 11, hy - 11, hx + 11, hy + 11], 196, 344, fill=255), hair)
    c.part(poly([(hx - 2, hy - 9), (hx + 10.5, hy - 7), (hx + 7.5, hy - 3.5), (hx + 3, hy - 6), (hx - 0.5, hy - 3.5)]), hair, outline=False)
    c.part(circle((hx - 7, hy - 9), 4.2), hair)                                    # bun
    # lotus ornament
    lc = (hx + 6.5, hy - 10)
    for k in range(5):
        a = math.radians(-90 + k * 36 - 72)
        c.part(ellipse((lc[0] + math.cos(a) * 3.4, lc[1] + math.sin(a) * 3.4), 2.2, 2.6), hexc('#ff9ed6'), shade=0.82, hi=1.1)
    c.part(circle(lc, 1.8), hexc('#f3d27a'), outline=False, flat=True)


def padamya_front(c, cfg, p, J, t):
    hip = J['hip']
    ln = p.lean
    c.part(poly([R((-6, -2), ln, hip), R((6.5, -2), ln, hip), R((6.5, -cfg['torso'] * 0.45), ln, hip), R((-6, -cfg['torso'] * 0.45), ln, hip)]), t['skin'])   # bare midriff
    c.part(poly([R((-6.5, -cfg['torso'] * 0.45), ln, hip), R((7, -cfg['torso'] * 0.45), ln, hip), R((7, -cfg['torso'] + 0.5), ln, hip), R((-6.5, -cfg['torso'] + 0.5), ln, hip)]), t['torso'])
    c.part(capsule(R((-6.5, -cfg['torso'] * 0.45), ln, hip), R((7, -cfg['torso'] * 0.45), ln, hip), 1.6), hexc('#f3d27a'), outline=False, flat=True)
    c.dots([R((0.5, -cfg['torso'] * 0.7), ln, hip)], hexc('#ff9ed6'), 1.3)


PADAMYA['back'], PADAMYA['head'], PADAMYA['front'] = padamya_back, padamya_head, padamya_front

CFG_Z = dict(leg=12, torso=14, head_r=10, shoulder=17, hip_w=10, arm=9)
CFG_S = dict(leg=12, torso=14, head_r=10, shoulder=16, hip_w=10, arm=9)
CFG_W = dict(leg=11, torso=15, head_r=10, shoulder=17, hip_w=10, arm=9)
CFG_I = dict(leg=11, torso=15, head_r=10.5, shoulder=20, hip_w=12, arm=9)
CFG_T = dict(leg=12, torso=14, head_r=10, shoulder=18, hip_w=10, arm=9)
CFG_P = dict(leg=12, torso=13, head_r=10, shoulder=15, hip_w=9, arm=9)

DRESS = {name: humanoid(spec) for name, spec in dict(zayar=ZAYAR, sandar=SANDAR, weikza=WEIKZA, sithu=SITHU, thura=THURA, padamya=PADAMYA).items()}


# =============================================================== attack looks (sprite poses) - see pose_attack() in chibi_engine.py
STYLES_VETS = {
    'zayar': {
        'katana': {
            'light': dict(wind=40, after=15, x_w=-1, x_s=4, lean_s=12, crouch_s=1),
            'heavy_s': dict(wind=150, x_w=-9, crouch_w=5, lean_w=-14, x_s=16, lean_s=20, after=10, two=False),
            'heavy_n': dict(wind=60, x_s=6, lean_s=12, after=20),
            'heavy_u': dict(a_s=-80, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2),
            'heavy_d': dict(a_s=75, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=14, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
        'gun': {
            'light': dict(wind=20, after=10, x_s=1),
            'heavy': dict(wind=50, lean_s=-6, x_s=-2, x_r=-4),
            'heavy_u': dict(wind=10, a_s=-80, lean_s=-14, y_s=-7, x_s=-3, crouch_w=4, after=-8),
        },
    },
    'sandar': {
        'katana': {
            'light': dict(wind=90, after=70, lean_s=14, x_s=6),
            'heavy_s': dict(wind=120, x_w=-8, crouch_w=5, x_s=16, lean_s=18, after=40, spin_s=12),
            'heavy_n': dict(wind=160, after=160, spin_s=25, x_s=0, y_s=-4, lean_s=8, two=True),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-28, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=32, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
        'spear': {
            'light': dict(wind=40, x_s=8),
            'heavy_s': dict(wind=30, x_w=-6, lean_w=-10, x_s=6, lean_s=12, crouch_s=3, after=20, leg_f_s=30),
            'heavy_n': dict(wind=160, after=160, spin_s=25, x_s=0, y_s=-4, lean_s=8, two=True),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-28, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=32, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
    },
    'weikza': {
        'spear': {
            'light': dict(wind=30, x_s=5, lean_s=8, after=25),
            'heavy_s': dict(wind=40, lean_w=-12, x_w=-6, x_s=4, lean_s=-6, crouch_s=3, after=-10, y_s=-2, two=True),
            'heavy_n': dict(wind=60, lean_w=-12, crouch_w=4, x_s=3, after=40, y_s=-3, two=True),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-12, lean_s=-8, x_s=3, leg_f_s=4, leg_b_s=-4, after=-20, y_r=-5, x_w=-2),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
        'gun': {
            'light': dict(wind=15, x_s=0, after=10),
            'heavy': dict(wind=40, lean_s=-8, x_s=-4, crouch_s=3, two=True, x_r=-5),
        },
    },
    'sithu': {
        'sword': {
            'light': dict(wind=55, after=35, crouch_s=2, x_s=4),
            'heavy_n': dict(wind=140, x_w=-4, crouch_w=4, lean_w=-4, crouch_s=4, lean_s=10, x_s=5, two=True, after=55),
            'heavy_s': dict(wind=60, x_w=-6, crouch_w=5, lean_w=-10, x_s=18, lean_s=22, crouch_s=3, two=True, after=20),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2, crouch_s=4),
        },
        'axe': {
            'light': dict(wind=60, after=35, crouch_s=2, x_s=4),
            'heavy_n': dict(wind=150, crouch_w=6, x_s=4, lean_s=14, two=True, after=50),
            'heavy_s': dict(wind=70, x_w=-6, crouch_w=6, lean_w=-10, x_s=16, lean_s=22, crouch_s=3, two=True, after=24),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-24, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
    },
    'thura': {
        'sword': {
            'light': dict(wind=35, x_s=6, lean_s=12, after=15),
            'heavy_n': dict(a_s=-62, wind=-95, crouch_w=6, lean_w=-10, y_s=-6, lean_s=6, after=-22, x_s=5, two=False),
            'heavy_s': dict(wind=50, x_w=-7, lean_w=-12, x_s=20, lean_s=24, after=14),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-12, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-30, y_r=-5, x_w=-2),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=False, y_r=-2),
        },
        'spear': {
            'light': dict(wind=150, after=150, spin_s=-20, x_s=0, lean_s=6),
            'heavy_n': dict(wind=60, x_s=10, lean_s=12),
            'heavy_s': dict(wind=40, x_w=-6, lean_w=-10, x_s=18, lean_s=20, after=12),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-26),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
    },
    'padamya': {
        'chakram': {
            'light': dict(wind=45, after=40, y_s=-3, x_s=3, two=False),
            'heavy_n': dict(wind=80, after=80, y_s=-5, x_s=8, lean_s=12, two=False),
            'heavy_s': dict(wind=60, after=30, y_s=-3, x_s=18, lean_s=14, two=False),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-30, two=False),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=26, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=False, y_r=-2),
        },
    },
}
