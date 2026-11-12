"""fighters.py - the look of each new fighter (parts, colours, silhouette) for chibi_engine.py.
Edit colours / sizes here and run:  python3 tools/make_chibi.py      (needs: pip install pillow numpy)
"""
import math
from chibi_engine import *


def face(c, head, p, R, eye_col=(30, 20, 40), glint=(255, 255, 255), dx=0.0, dy=0.0, spread=5.2, size=1.0, mouth=True):
    hx, hy = head
    ex1, ex2 = hx + 2.0 + dx, hx + 2.0 + spread + dx
    ey = hy + 1.0 + dy
    if p.face == 'hurt':
        for ex in (ex1, ex2):
            c.part(capsule((ex - 1.5, ey - 1.5), (ex + 1.5, ey + 0.5), 1.2), eye_col, outline=False, flat=True)
            c.part(capsule((ex - 1.5, ey + 1.5), (ex + 1.5, ey - 0.5), 1.2), eye_col, outline=False, flat=True)
        c.part(ellipse((hx + 6 + dx, hy + R * 0.55 + dy), 1.8, 1.4), (60, 20, 30), outline=False, flat=True)
        return
    if p.face == 'blink':
        for ex in (ex1, ex2):
            c.part(capsule((ex - 1.5, ey), (ex + 1.5, ey), 1.2), eye_col, outline=False, flat=True)
        return
    for ex in (ex1, ex2):
        c.part(ellipse((ex, ey), 1.5 * size, 2.3 * size), eye_col, outline=False, flat=True)
    c.dots([(ex1 + 0.3, ey - 1.0), (ex2 + 0.3, ey - 1.0)], glint, 0.7)
    if mouth:
        if p.face == 'yell':
            c.part(ellipse((hx + 6 + dx, hy + R * 0.55 + dy), 2.2, 1.9), (70, 24, 36), outline=False, flat=True)
        else:
            c.part(capsule((hx + 5 + dx, hy + R * 0.58 + dy), (hx + 7.5 + dx, hy + R * 0.58 + dy), 1), (90, 40, 50), outline=False, flat=True)


def R(v, lean, about):
    r = rot(v, lean)
    return (about[0] + r[0], about[1] + r[1])


# =============================================================== THAUNG - the Iron Elephant (wide, heavy, elephant head)
THAUNG_CFG = dict(leg=10, torso=15, head_r=12, shoulder=25, hip_w=15, arm=9)
TH = dict(skin=hexc('#8f93a3'), skin_d=hexc('#6f7384'), ear=hexc('#7d8191'), pink=hexc('#d79aa6'), teal=hexc('#176b68'), teal_d=hexc('#0f4c4a'),
          bronze=hexc('#d99b35'), brown=hexc('#49352c'), cream=hexc('#e9d9b5'), red=hexc('#a8242d'), steel=hexc('#c3cad8'), ivory=hexc('#f2ead6'),
          haft=hexc('#6e4a2c'), gold=hexc('#f0c14b'), accent=hexc('#ffb347'))


def dress_thaung(c, cfg, p, J, weapon, wa, style):
    t = TH
    hip, neck, head = J['hip'], J['neck'], J['head']
    ln = p.lean
    # back arm (muscular, grey)
    c.part(capsule(J['sh_b'], J['hand_b'], 6.5), t['skin_d'])
    c.part(capsule(pol(J['hand_b'], 180 + math.degrees(math.atan2(J['hand_b'][1] - J['sh_b'][1], J['hand_b'][0] - J['sh_b'][0])), 3), J['hand_b'], 7), t['bronze'], outline=True)
    c.part(circle(J['hand_b'], 3.8), t['skin_d'])
    # ears behind the head
    sway = p.sway * 0.35
    c.part(ellipse((head[0] - 10 - sway, head[1] + 0), 6.5, 9.5), t['ear'])
    c.part(ellipse((head[0] - 10 - sway, head[1] + 0.5), 3.4, 6.2), t['pink'], outline=False, flat=True)
    # back leg
    hb, fb = J['leg_b']
    c.part(capsule(hb, fb, 8), t['teal_d'])
    c.part(ellipse((fb[0] + 1.5, fb[1] - 2), 7, 4.2), t['skin_d'])
    # red cloth hanging behind
    c.part(poly([R((-9, -2), ln, hip), R((-5, -2), ln, hip), R((-12 - sway, 9), ln, hip), R((-17 - sway, 8), ln, hip)]), t['red'])
    # torso (wide armour)
    body = [R((-10, 0), ln, hip), R((10, 0), ln, hip), R((13, -16), ln, hip), R((-13, -16), ln, hip)]
    c.part(poly(body), t['teal'])
    c.part(poly([R((-11, -16), ln, hip), R((11, -16), ln, hip), R((13, -13), ln, hip), R((-13, -13), ln, hip)]), t['bronze'])
    # armour plates (lamellar lines)
    for yy in (-9, -5):
        c.part(capsule(R((-8, yy), ln, hip), R((8, yy), ln, hip), 1), t['teal_d'], outline=False, flat=True)
    # belt + buckle
    c.part(poly([R((-10.5, -1), ln, hip), R((10.5, -1), ln, hip), R((10.8, -5.5), ln, hip), R((-10.8, -5.5), ln, hip)]), t['bronze'])
    c.part(circle(R((3, -3.2), ln, hip), 3.6), t['red'])
    c.dots([R((3, -3.2), ln, hip)], t['gold'], 1.4)
    # front red apron
    c.part(poly([R((0, -1), ln, hip), R((11, -1), ln, hip), R((12 + sway * 0.3, 9), ln, hip), R((2, 10), ln, hip)]), t['red'])
    c.part(capsule(R((1, 8.5), ln, hip), R((11.5, 7.5), ln, hip), 1.5), t['bronze'], outline=False, flat=True)
    # front leg
    hf, ff = J['leg_f']
    c.part(capsule(hf, ff, 8), t['teal'])
    c.part(capsule((hf[0] + (ff[0] - hf[0]) * 0.55, hf[1] + (ff[1] - hf[1]) * 0.55), (hf[0] + (ff[0] - hf[0]) * 0.9, hf[1] + (ff[1] - hf[1]) * 0.9), 8.6), t['bronze'])
    c.part(ellipse((ff[0] + 2, ff[1] - 2), 7.5, 4.5), t['skin'])
    c.dots([(ff[0] + 6.5, ff[1] - 2), (ff[0] + 3.5, ff[1] - 0.8)], t['skin_d'], 0.8)
    # head: grey elephant
    c.part(circle(head, cfg['head_r']), t['skin'])
    # forehead crown band + crest
    c.part(lambda d: d.arc([head[0] - 12, head[1] - 12, head[0] + 12, head[1] + 12], 198, 342, fill=255, width=4), t['bronze'], outline=False, flat=True)
    c.part(poly([(head[0] - 3, head[1] - 11), (head[0] + 3, head[1] - 11), (head[0] + 1, head[1] - 18), (head[0] - 1, head[1] - 18)]), t['bronze'])
    c.dots([(head[0], head[1] - 13)], t['red'], 1.3)
    # tusks + trunk (the elephant face)
    tx, ty = head[0] + 8, head[1] + 4
    c.part(capsule((tx + 1, ty + 4), (tx + 9, ty + 3 + 5 * 0), 2.6), t['ivory'])
    c.part(capsule((tx + 2, ty + 6), (tx + 10, ty + 9), 2.4), t['ivory'])
    c.part(tapered([(tx, ty - 1), (tx + 4, ty + 3), (tx + 5, ty + 8), (tx + 8, ty + 11)], 7, 3.6), t['skin'])
    # eyes (small, fierce, orange)
    ex = head[0] + 3.2
    ey = head[1] - 2.5
    c.part(capsule((ex - 1.5, ey), (ex + 1.5, ey + (0.2 if p.face != 'blink' else 0)), 2.2), (40, 28, 40), outline=False, flat=True)
    c.part(capsule((ex + 5.5, ey), (ex + 8.5, ey), 2.2), (40, 28, 40), outline=False, flat=True)
    if p.face not in ('blink', 'hurt'):
        c.dots([(ex + 0.5, ey), (ex + 7, ey)], (255, 150, 40), 0.8)
    c.part(capsule((ex - 3, ey - 3.2), (ex + 2, ey - 2.2), 1.2), t['skin_d'], outline=False, flat=True)   # heavy brow
    c.part(capsule((ex + 4.5, ey - 2.2), (ex + 9.5, ey - 3.2), 1.2), t['skin_d'], outline=False, flat=True)
    # front arm + pauldron + weapon
    c.part(capsule(J['sh_f'], J['hand_f'], 7), t['skin'])
    ang = math.degrees(math.atan2(J['hand_f'][1] - J['sh_f'][1], J['hand_f'][0] - J['sh_f'][0]))
    c.part(capsule(pol(J['hand_f'], ang + 180, 3.6), J['hand_f'], 7.4), t['bronze'])
    c.part(circle(J['hand_f'], 4.2), t['skin'])
    if weapon == 'axe':
        draw_weapon(c, 'axe', style, J['hand_f'], wa, dict(steel=t['steel'], gold=t['gold'], haft=t['haft']))
        c.part(circle(J['hand_f'], 4.2), t['skin'])
    c.part(circle(J['sh_f'], 5.8), t['bronze'])
    c.dots([(J['sh_f'][0] - 0.5, J['sh_f'][1] - 0.5)], t['gold'], 1.4)
    c.part(circle(J['sh_b'], 5.2), t['bronze'], outline=True) if False else None


# =============================================================== HLA - the Storm Bell (tall, lean, straw hat, long robe)
HLA_CFG = dict(leg=12, torso=15, head_r=9, shoulder=17, hip_w=10, arm=9)
HL = dict(skin=hexc('#e6b88a'), hair=hexc('#dcd8d0'), hat=hexc('#d9ac5a'), hat_d=hexc('#b78a3c'), robe=hexc('#e87932'), robe_d=hexc('#b9561c'), sash=hexc('#ffd447'),
          pants=hexc('#4a4d5a'), wrap=hexc('#efe7d0'), bronze=hexc('#c58b3a'), brown=hexc('#5a3b2a'), steel=hexc('#dfe6f2'), gold=hexc('#ffd447'), accent=hexc('#ffcf4a'),
          haft=hexc('#7e5632'), straw=hexc('#c99c4a'))


def dress_hla(c, cfg, p, J, weapon, wa, style):
    t = HL
    hip, neck, head = J['hip'], J['neck'], J['head']
    ln = p.lean
    sway = p.sway
    # long robe tails + bells trailing behind
    tails = [R((-4, -3), ln, hip), R((-9 - sway, 4), ln, hip), R((-14 - sway * 1.3, 11), ln, hip)]
    c.part(tapered(tails, 6, 3.5), t['robe_d'])
    sash_t = [R((-5, -5), ln, hip), R((-11 - sway, -1), ln, hip), R((-17 - sway * 1.4, 4 + sway * 0.2), ln, hip)]
    c.part(tapered(sash_t, 4.2, 2.6), t['sash'])
    c.dots([sash_t[-1]], t['gold'], 2.0)
    # back arm
    c.part(capsule(J['sh_b'], J['hand_b'], 5), mix(t['skin'], 0.82))
    c.part(circle(J['hand_b'], 3), mix(t['skin'], 0.82))
    # back leg
    hb, fb = J['leg_b']
    c.part(capsule(hb, fb, 7), mix(t['pants'], 0.85))
    c.part(capsule((hb[0] + (fb[0] - hb[0]) * 0.6, hb[1] + (fb[1] - hb[1]) * 0.6), fb, 5.4), t['wrap'])
    c.part(ellipse((fb[0] + 2, fb[1] - 1.5), 5.5, 3), t['straw'])
    # torso: orange robe
    body = [R((-6.5, 0), ln, hip), R((6.5, 0), ln, hip), R((8, -16), ln, hip), R((-8, -16), ln, hip)]
    c.part(poly(body), t['robe'])
    # crossing strap + chest mark
    c.part(capsule(R((-6, -15), ln, hip), R((6, -3), ln, hip), 1.8), t['brown'], outline=False, flat=True)
    c.part(poly([R((2.5, -11), ln, hip), R((5, -11), ln, hip), R((3.6, -8), ln, hip), R((5.4, -8), ln, hip), R((2.5, -3.5), ln, hip), R((3, -7), ln, hip), R((1.6, -7), ln, hip)]), t['sash'], outline=False, flat=True)
    # skirt (long robe front flaring)
    skirt = [R((-7, -2), ln, hip), R((7.5, -2), ln, hip), R((11 + sway * 0.2, 9), ln, hip), R((-10, 9), ln, hip)]
    c.part(poly(skirt), t['robe'])
    c.part(capsule(R((-9.5, 8), ln, hip), R((10, 8), ln, hip), 1.6), t['sash'], outline=False, flat=True)
    # sash around the waist
    c.part(poly([R((-7.5, -1), ln, hip), R((7.8, -1), ln, hip), R((7.8, -5), ln, hip), R((-7.5, -5), ln, hip)]), t['sash'])
    c.dots([R((5, -3), ln, hip)], t['bronze'], 1.7)      # bell on the sash
    # front leg
    hf, ff = J['leg_f']
    c.part(capsule(hf, ff, 7), t['pants'])
    c.part(capsule((hf[0] + (ff[0] - hf[0]) * 0.6, hf[1] + (ff[1] - hf[1]) * 0.6), ff, 5.6), t['wrap'])
    c.part(ellipse((ff[0] + 2, ff[1] - 1.5), 5.8, 3.2), t['straw'])
    # head + silver hair
    c.part(ellipse((head[0] - 3, head[1] + 1), 8, 8), t['hair'])
    c.part(circle(head, cfg['head_r']), t['skin'])
    face(c, head, p, cfg['head_r'], dx=-0.5, dy=2.0, spread=4.6, size=0.9)
    # straw hat (cone + rim)
    hx, hy = head
    c.part(ellipse((hx + 1, hy - 5), 20, 4.2), t['hat_d'])
    c.part(poly([(hx - 17, hy - 5), (hx + 19, hy - 5), (hx + 1, hy - 21)]), t['hat'])
    for k in (-10, -4, 2, 8, 14):
        c.part(capsule((hx + 1 + k * 0.15, hy - 20 + abs(k) * 0.05), (hx + k, hy - 6), 1), t['hat_d'], outline=False, flat=True)
    c.part(capsule((hx - 7, hy - 3), (hx + 9, hy - 3), 1.4), (60, 40, 30), outline=False, flat=True)   # shadow under the brim
    # front arm
    c.part(capsule(J['sh_f'], J['hand_f'], 5.4), t['skin'])
    ang = math.degrees(math.atan2(J['hand_f'][1] - J['sh_f'][1], J['hand_f'][0] - J['sh_f'][0]))
    c.part(capsule(pol(J['hand_f'], ang + 180, 3.4), J['hand_f'], 6.2), t['bronze'])
    c.part(circle(J['hand_f'], 3.2), t['skin'])
    if weapon == 'spear':
        draw_weapon(c, 'spear', style, J['hand_f'], wa, dict(steel=t['steel'], accent=t['robe'], gold=t['gold'], haft=t['haft']))
        c.part(circle(J['hand_f'], 3.2), t['skin'])
        if p.two_hand:
            c.part(circle(J['hand_b'], 3.2), mix(t['skin'], 0.9))


# =============================================================== KAN - the Crimson Ronin (sharp, spiky white hair, ponytail, cog axe)
KAN_CFG = dict(leg=13, torso=14, head_r=10, shoulder=17, hip_w=10, arm=9)
KN = dict(skin=hexc('#c58352'), hair=hexc('#eceae6'), hair_d=hexc('#bdbbc6'), black=hexc('#25252d'), black_l=hexc('#3a3a46'), crim=hexc('#b52c3b'), bone=hexc('#f0e5d0'),
          steel=hexc('#8b92a2'), gold=hexc('#d9b45a'), pants=hexc('#2b2b36'), dark=hexc('#202027'), accent=hexc('#c22d41'))


def dress_kan(c, cfg, p, J, weapon, wa, style):
    t = KN
    hip, neck, head = J['hip'], J['neck'], J['head']
    ln = p.lean
    sway = p.sway
    hx, hy = head
    # long white ponytail + red ribbon tails (trail with movement)
    tail = [(hx - 7, hy - 3), (hx - 13 - sway * 0.7, hy + 3), (hx - 17 - sway * 1.1, hy + 13), (hx - 15 - sway * 0.9, hy + 25)]
    c.part(tapered(tail, 6.5, 2.2), t['hair'])
    rib = [(hx - 8, hy - 7), (hx - 17 - sway * 1.2, hy - 7 + sway * 0.1), (hx - 25 - sway * 1.6, hy - 3 + sway * 0.3)]
    c.part(tapered(rib, 2.6, 1.6), t['crim'])
    # crimson sash tail behind the hip
    sash = [R((-3, -3), ln, hip), R((-9 - sway, 2), ln, hip), R((-15 - sway * 1.4, 9), ln, hip)]
    c.part(tapered(sash, 4.4, 2.8), t['crim'])
    # back arm (bare + black gauntlet)
    c.part(capsule(J['sh_b'], J['hand_b'], 5), mix(t['skin'], 0.82))
    c.part(circle(J['hand_b'], 3.5), t['black'])
    # back leg
    hb, fb = J['leg_b']
    c.part(capsule(hb, (hb[0] + (fb[0] - hb[0]) * 0.65, hb[1] + (fb[1] - hb[1]) * 0.65), 8.2), mix(t['pants'], 0.9))
    c.part(capsule((hb[0] + (fb[0] - hb[0]) * 0.55, hb[1] + (fb[1] - hb[1]) * 0.55), fb, 5.4), t['black'])
    c.part(ellipse((fb[0] + 2.5, fb[1] - 1.5), 5.8, 3), t['black'])
    # torso: bare chest with red tattoo + black harness
    body = [R((-6.5, 0), ln, hip), R((6.5, 0), ln, hip), R((8, -15), ln, hip), R((-8, -15), ln, hip)]
    c.part(poly(body), t['skin'])
    for k in (-1, 1):
        c.part(capsule(R((k * 2, -13), ln, hip), R((k * 4.5, -6), ln, hip), 1.2), t['crim'], outline=False, flat=True)
    c.part(capsule(R((0, -13), ln, hip), R((0, -4), ln, hip), 1.2), t['crim'], outline=False, flat=True)
    c.part(poly([R((-8, -16), ln, hip), R((8.5, -16), ln, hip), R((9, -11), ln, hip), R((5, -9), ln, hip), R((-5, -9), ln, hip), R((-8.5, -11), ln, hip)]), t['black'])
    # belt (steel studs) + crimson sash
    c.part(poly([R((-8, -1), ln, hip), R((8, -1), ln, hip), R((8, -5), ln, hip), R((-8, -5), ln, hip)]), t['steel'])
    c.dots([R((-5, -3), ln, hip), R((-1.5, -3), ln, hip), R((2, -3), ln, hip), R((5.5, -3), ln, hip)], t['bone'], 0.9)
    c.part(poly([R((-4, -5), ln, hip), R((4, -5), ln, hip), R((5 + sway * 0.2, 6), ln, hip), R((-2, 7), ln, hip)]), t['crim'])
    c.dots([R((1.5, 7.5), ln, hip)], t['gold'], 1.6)
    # front leg: baggy pants + tall boots
    hf, ff = J['leg_f']
    c.part(capsule(hf, (hf[0] + (ff[0] - hf[0]) * 0.65, hf[1] + (ff[1] - hf[1]) * 0.65), 8.6), t['pants'])
    c.part(capsule((hf[0] + (ff[0] - hf[0]) * 0.55, hf[1] + (ff[1] - hf[1]) * 0.55), ff, 5.8), t['black_l'])
    c.dots([(ff[0] + (hf[0] - ff[0]) * 0.28, ff[1] + (hf[1] - ff[1]) * 0.28)], t['gold'], 1.0)
    c.part(ellipse((ff[0] + 2.5, ff[1] - 1.5), 6.2, 3.2), t['black_l'])
    # head
    c.part(circle(head, cfg['head_r']), t['skin'])
    # spiky white hair
    spikes = [[(hx - 9, hy - 5), (hx - 12, hy - 16), (hx - 3, hy - 10)], [(hx - 4, hy - 9), (hx - 4, hy - 20), (hx + 3, hy - 10)],
              [(hx + 1, hy - 9), (hx + 7, hy - 19), (hx + 9, hy - 8)], [(hx + 6, hy - 8), (hx + 14, hy - 14), (hx + 10, hy - 4)]]
    c.part(lambda d: [d.polygon(s, fill=255) for s in spikes], t['hair'])
    c.part(lambda d: d.pieslice([hx - 10, hy - 10, hx + 10, hy + 10], 195, 345, fill=255), t['hair'], outline=False)
    # black headband + red ribbon knot
    c.part(capsule((hx - 9, hy - 5.5), (hx + 9.5, hy - 5), 3.2), t['black'])
    c.dots([(hx - 8, hy - 5.5)], t['crim'], 1.6)
    face(c, head, p, cfg['head_r'], eye_col=hexc('#7a1020'), dx=0.5, dy=0.5, spread=5.4, mouth=True)
    c.part(capsule((hx + 3, hy + 4), (hx + 5, hy + 7), 0.9), t['crim'], outline=False, flat=True)       # face mark
    # front arm + oversized shoulder guard
    c.part(capsule(J['sh_f'], J['hand_f'], 5.2), t['skin'])
    ang = math.degrees(math.atan2(J['hand_f'][1] - J['sh_f'][1], J['hand_f'][0] - J['sh_f'][0]))
    c.part(capsule(pol(J['hand_f'], ang + 180, 3.4), J['hand_f'], 6.4), t['black'])
    c.part(capsule(pol(J['hand_f'], ang + 180, 4.6), pol(J['hand_f'], ang + 180, 3.8), 6.8), t['gold'], outline=False, flat=True)
    c.part(circle(J['hand_f'], 3.4), t['black'])
    if weapon in ('axe', 'gun'):
        draw_weapon(c, weapon, 'gear' if weapon == 'axe' else None, J['hand_f'], wa, dict(steel=t['steel'], dark=t['dark'], gold=t['gold'], accent=t['accent'], haft=hexc('#5c3a28')))
        c.part(circle(J['hand_f'], 3.4), t['black'])
        if p.two_hand and weapon == 'axe':
            c.part(circle(J['hand_b'], 3.4), t['black'])
    sg = (J['sh_f'][0] + 1.5, J['sh_f'][1] - 1.5)
    c.part(ellipse(sg, 4.6, 3.6), t['black'])
    c.dots([(sg[0] + 0.5, sg[1])], t['gold'], 1.0)


# =============================================================== attack looks (sprite poses) - see pose_attack() in chibi_engine.py
# u = rising (recovery boost): weapon up, body lifted; d = dive: weapon down, body tilted; s = dash-in; n = signature neutral
STYLES_NEW = {
    'thaung': {
        'axe': {
            'light': dict(wind=20, after=10, lean_w=-4, lean_s=28, x_s=12, crouch_s=4, x_w=-6, face='yell', a_s=60),
            'heavy_n': dict(wind=165, a_s=82, crouch_w=6, lean_w=-12, x_w=-5, crouch_s=8, lean_s=22, x_s=3, after=-6, two=True),
            'heavy_s': dict(wind=30, a_s=40, x_w=-8, crouch_w=6, lean_w=-14, x_s=20, lean_s=30, crouch_s=5, after=10, two=True),
            'heavy_u': dict(a_s=-85, wind=-80, crouch_w=8, lean_w=-6, y_s=-6, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-3, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
    },
    'hla': {
        'spear': {
            'light': dict(wind=22, x_s=10, lean_s=10, after=14, x_w=-4),
            'heavy_s': dict(wind=28, crouch_w=3, lean_w=-10, x_w=-9, x_s=18, lean_s=20, crouch_s=2, after=10, leg_f_s=34, leg_b_s=-30),
            'heavy_n': dict(wind=160, after=160, spin_s=18, x_s=2, lean_s=8, two=True),
            'heavy_u': dict(a_s=-88, wind=-70, crouch_w=7, lean_w=-6, y_s=-11, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2),
            'heavy_d': dict(a_s=88, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=18, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
    },
    'kan': {
        'axe': {
            'light': dict(wind=45, x_s=9, lean_s=14, after=20),
            'heavy_n': dict(wind=170, after=170, spin_s=28, lean_s=10, y_s=-2, x_s=2, crouch_w=4, two=True),
            'heavy_s': dict(wind=170, after=170, spin_s=28, lean_s=14, y_s=-2, x_s=18, crouch_w=4, two=True),
            'heavy_u': dict(a_s=-85, wind=-100, crouch_w=7, lean_w=-6, y_s=-9, lean_s=-8, x_s=3, leg_f_s=16, leg_b_s=-14, after=-20, y_r=-5, x_w=-2, spin_s=-30, two=True),
            'heavy_d': dict(a_s=82, wind=170, crouch_w=2, lean_w=-4, y_s=-6, lean_s=22, spin_s=30, x_s=5, leg_f_s=-10, leg_b_s=10, after=-8, two=True, y_r=-2),
        },
        'gun': {
            'light': dict(wind=18, x_s=4, lean_s=6, after=10),
            'heavy': dict(wind=25, lean_s=-4, x_s=-3, crouch_s=2, x_r=-4),
            'heavy_u': dict(wind=10, a_s=-80, lean_s=-14, y_s=-7, x_s=-3, crouch_w=4, after=-8, two=False),
        },
    },
}
