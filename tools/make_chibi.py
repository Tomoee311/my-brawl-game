#!/usr/bin/env python3
"""Draws the new fighters' sprite sheets with code (real new chibi designs, not recolours).
   python3 tools/make_chibi.py            -> writes assets/chars/<fighter>_<weapon>.png  (overwrites the placeholder sheets)
   python3 tools/make_chibi.py --preview  -> also writes /tmp/chibi_preview_<fighter>.png for a quick look
When you have hand-drawn art, put the PNGs in assets/chars/ and stop running this script (it would overwrite them).
Needs: pip install pillow numpy
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chibi_engine import build_sheet, preview
import fighters as F
import fighters2 as F2

ATK_STYLES = dict(F.STYLES_NEW, **F2.STYLES_VETS)     # per-fighter attack poses
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'chars')
# name -> (config, dress function, weapons, file prefix used by the game in assets/chars/)
JOBS = {
    'thaung': (F.THAUNG_CFG, F.dress_thaung, ['unarmed', 'axe'], 'thaung'),
    'hla': (F.HLA_CFG, F.dress_hla, ['unarmed', 'spear'], 'hla'),
    'kan': (F.KAN_CFG, F.dress_kan, ['unarmed', 'axe', 'gun'], 'kan'),
    # the six original fighters, redesigned (the file prefix stays the old art name so characters.js needs no path changes)
    'zayar': (F2.CFG_Z, F2.DRESS['zayar'], ['unarmed', 'katana', 'gun'], 'kyaw'),
    'sandar': (F2.CFG_S, F2.DRESS['sandar'], ['unarmed', 'katana', 'spear'], 'thiri'),
    'weikza': (F2.CFG_W, F2.DRESS['weikza'], ['unarmed', 'spear', 'gun'], 'zawgyi'),
    'sithu': (F2.CFG_I, F2.DRESS['sithu'], ['unarmed', 'sword', 'axe'], 'minsitthar'),
    'thura': (F2.CFG_T, F2.DRESS['thura'], ['unarmed', 'sword', 'spear'], 'aung_zeya'),
    'padamya': (F2.CFG_P, F2.DRESS['padamya'], ['unarmed', 'chakram'], 'thazin'),
}
PREVIEW_FRAMES = [0, 1, 8, 10, 16, 17, 18, 19, 24, 33, 40, 41, 42, 43, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 64, 65, 66, 70, 71, 72, 79, 80, 87]

if __name__ == '__main__':
    want = [a for a in sys.argv[1:] if not a.startswith('--')] or list(JOBS)   # no name = redraw everybody
    for name in want:
        cfg, dress, weapons, prefix = JOBS[name]
        for w in weapons:
            sheet = build_sheet(cfg, dress, None if w == 'unarmed' else w, atk_style=ATK_STYLES.get(name, {}).get(w))
            sheet.save(os.path.join(OUT, '%s_%s.png' % (prefix, w)))
            print('wrote', '%s_%s.png' % (prefix, w))
            if '--preview' in sys.argv:
                preview(sheet, PREVIEW_FRAMES, '/tmp/chibi_preview_%s_%s.png' % (name, w), zoom=2, cols=9)
