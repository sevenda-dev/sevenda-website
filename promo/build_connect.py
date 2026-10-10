#!/usr/bin/env python3
"""Generatore di promo-connect.html: video Connect di 45 s esatti, 1920×1080.

Narrazione (vedi README): brand opening su nero puro → ecosistema near-black
con un hub Sevenda da cui partono sottili linee arancioni → le otto integrazioni
della pagina Connect (loghi autentici, 4 disponibili + 4 "coming soon") entrano
una alla volta in profondità → la camera virtuale si avvicina a singole card e
poi si allarga sull'intero ecosistema → tutto converge nell'hub e torna il nero
→ brand closing identico all'apertura.

Stessa tecnica di promo.html: una sola timeline CSS di 45 000 ms, linear, fill
both, paused; l'easing vive nei keyframe; window.__seek(t) porta tutte le
animazioni a t. Profondità vera: perspective sullo stage, mondo in
preserve-3d, card a translateZ diversi, camera = transform del mondo.

Uso:  python3 build_connect.py  →  promo-connect.html
"""
from pathlib import Path

DUR = 45.0
W, H = 1920, 1080
EXPO = 'cubic-bezier(.16,1,.3,1)'       # uscita morbida (stesso easing della card Connect)
INOUT = 'cubic-bezier(.7,0,.3,1)'       # movimenti di camera
SOFT = 'cubic-bezier(.4,0,.2,1)'
EASEIN = 'cubic-bezier(.55,0,.85,.35)'

KF, _n = [], [0]


def pct(t):
    return f'{t / DUR * 100:.4f}'.rstrip('0').rstrip('.')


def kf(pts):
    """pts: [(t, css, easing del segmento che parte da qui | None)] → nome animazione."""
    _n[0] += 1
    name = f'k{_n[0]}'
    pts = sorted(pts, key=lambda p: p[0])
    if pts[0][0] > 0:
        pts.insert(0, (0, pts[0][1], None))
    if pts[-1][0] < DUR:
        pts.append((DUR, pts[-1][1], None))
    rows = [f'  {pct(t)}% {{ {css};{f" animation-timing-function: {e};" if e else ""} }}' for t, css, e in pts]
    KF.append(f'@keyframes {name} {{\n' + '\n'.join(rows) + '\n}')
    return name


def A(name):
    return f'style="animation-name:{name}"'


def opacity(pts):
    """pts: [(t, valore, easing)] → attributo style con keyframe di sola opacità."""
    return A(kf([(t, f'opacity:{v}', e) for t, v, e in pts]))


# ── Integrazioni: esattamente quelle della pagina Connect ───────────────────
# (file logo, nome, categoria, disponibile?, posizione nel mondo x,y,z)
CARDS = [
    ('jira',       'Jira',               'Ticketing',     True,  (-540, -238,  70)),
    ('camunda',    'Camunda',            'Modeling',      True,  ( 540, -228,  90)),
    ('ga4',        'Google Analytics 4', 'Analytics',     True,  (-560,  246,  50)),
    ('confluence', 'Confluence',         'Documentation', True,  ( 545,  252,  70)),
    ('signavio',   'SAP Signavio',       'Modeling',      False, (-178, -376,  22)),
    ('mermaid',    'Mermaid',            'Documentation', False, ( 196, -384,  16)),
    ('notion',     'Notion',             'Documentation', False, (-216,  388,  18)),
    ('bizagi',     'Bizagi',             'Modeling',      False, ( 226,  394,  26)),
]
CW, CH = 300, 196          # card disponibile
SW, SH = 256, 166          # card "coming soon"

NOTION_SVG = ('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>')

# ── Timeline (secondi) ───────────────────────────────────────────────────────
T_LOGO_IN, T_LOGO_OUT = 0.5, 4.0          # scena 1
T_HUB = 5.2                               # scena 2: l'hub emerge
T_LINES = [6.3, 6.9, 7.3, 7.7, 8.1, 8.4, 8.7, 9.0]   # le linee raggiungono i nodi
T_CARDS = [9.4, 10.9, 12.4, 13.9, 15.6, 17.1, 18.6, 20.1]   # scena 3: ingresso card
T_CONV = 35.4                             # scena 5: convergenza
T_CLOSE = 40.4                            # scena 6: brand closing


def line_for(i, x, y, w, h):
    """Linea hub → nodo (piano z=0 del mondo) e puntino del nodo.
    Il nodo sta appena dentro il bordo della card, così la linea non la attraversa."""
    import math
    cx, cy = W / 2, H / 2
    d = math.hypot(x, y)
    ux, uy = x / d, y / d
    k = min(w / 2 / abs(ux) if ux else 1e9, h / 2 / abs(uy) if uy else 1e9)   # distanza centro card → bordo lungo la linea
    ex, ey = cx + x - ux * (k - 12), cy + y - uy * (k - 12)
    sx, sy = cx + ux * 78, cy + uy * 78                 # parte dal bordo dell'hub
    t = T_LINES[i]
    tc = T_CARDS[i]
    # tratto base: si disegna in scena 2, si ritrae in scena 5
    base = kf([(t - .55, 'stroke-dashoffset:1; opacity:.0', None),
               (t - .549, 'stroke-dashoffset:1; opacity:.55', 'cubic-bezier(.4,0,.2,1)'),
               (t, 'stroke-dashoffset:0; opacity:.55', None),
               (36.0 + i * .12, 'stroke-dashoffset:0; opacity:.55', SOFT),
               (37.3 + i * .12, 'stroke-dashoffset:1; opacity:.0', None)])
    # tratto "acceso": impulso quando la card atterra, poi resta tenue, picco al 32–34
    lit = opacity([(tc + .3, 0, EXPO), (tc + .75, .95, SOFT), (tc + 1.8, .3, None),
                   (31.3, .3, SOFT), (33.0, .85, SOFT), (35.2, .5, SOFT), (36.6, 0, None)])
    dot = A(kf([(t - .05, 'transform:scale(0); opacity:0', 'cubic-bezier(.34,1.56,.64,1)'),
                (t + .35, 'transform:scale(1); opacity:1', None),
                (36.4, 'transform:scale(1); opacity:1', SOFT), (37.4, 'transform:scale(0); opacity:0', None)]))
    return (f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" pathLength="1" class="ln" {A(base)}/>'
            f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" class="ln lit" {lit}/>'
            f'<circle cx="{ex:.1f}" cy="{ey:.1f}" r="5" class="nd" {dot}/>')


def card(i, key, name, cat, live, pos):
    x, y, z = pos
    w, h = (CW, CH) if live else (SW, SH)
    sx = 1 if x > 0 else -1
    sy = 1 if y > 0 else -1
    t = T_CARDS[i]
    # ingresso: da fuori quadro, in profondità, leggera rotazione prospettica
    enter_from = (f'opacity:0; transform:translate3d({sx * 520 + x * .35:.0f}px,{sy * 160 + y * .25:.0f}px,420px) '
                  f'rotateY({-sx * 16}deg) rotateX({sy * 7}deg) scale(1.02)')
    at_rest = 'opacity:1; transform:translate3d(0px,0px,0px) rotateY(0deg) rotateX(0deg) scale(1)'
    # convergenza: verso l'hub (negativo della posizione), rimpicciolendo
    tc = T_CONV + (0 if not live else .5) + (i % 4) * .13
    gone = f'opacity:0; transform:translate3d({-x}px,{-y}px,{-z - 60}px) rotateY(0deg) rotateX(0deg) scale(.22)'
    enter = kf([(t, enter_from, EXPO), (t + .95, at_rest, None), (tc, at_rest, EASEIN), (tc + 1.15, gone, None)])
    # fluttuazione lenta, sfasata per card
    ph = (i * .7) % 2.4
    fl = [(9.0, 'transform:translateY(0px)', None)]
    tt = 9.0 + ph
    up = True
    while tt < 36:
        fl.append((tt, f'transform:translateY({-9 if up else 0}px)', 'ease-in-out'))
        up = not up
        tt += 2.4
    fl.append((36.2, 'transform:translateY(0px)', None))
    float_ = kf(fl)
    # bagliore della card quando atterra e al picco
    glow = kf([(t + .3, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 0 0 rgba(232,115,58,0)', EXPO),
               (t + .8, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 48px 0 rgba(232,115,58,.35)', SOFT),
               (t + 2.0, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 0 0 rgba(232,115,58,0)', None),
               (31.6, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 0 0 rgba(232,115,58,0)', SOFT),
               (33.2, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 40px 0 rgba(232,115,58,.22)', SOFT),
               (35.4, 'box-shadow:0 30px 60px rgba(0,0,0,.6), 0 0 0 0 rgba(232,115,58,0)', None)])
    if key == 'notion':
        logo = f'<div class="lrow">{NOTION_SVG}<span>Notion</span></div>'
    elif key == 'mermaid':
        logo = '<div class="lrow"><img src="logos/mermaid.svg" alt="" class="sq"><span>Mermaid</span></div>'
    else:
        logo = f'<img src="logos/{key}.svg" alt="" class="lg {key}">'
    status = '<span class="st live">Available</span>' if live else '<span class="st soon">Coming soon</span>'
    return f'''
    <div class="cp" style="left:{W / 2 + x - w / 2:.0f}px; top:{H / 2 + y - h / 2:.0f}px; width:{w}px; height:{h}px; transform:translateZ({z}px)">
      <div class="ci" {A(enter)}><div class="cf" {A(float_)}>
        <div class="card{'' if live else ' soon'}" {A(glow)}>
          <div class="bar"><i></i>{status}</div>
          <div class="body">{logo}</div>
          <div class="foot"><b>{name}</b><span>{cat}</span></div>
        </div>
      </div></div>
    </div>'''


# ── Camera (transform del mondo): (t, x, y, z, easing verso il punto successivo)
def cam_target(key, z):
    x, y, _ = next(p for k, _, _, _, p in CARDS if k == key)
    return (-x, -y, z)


CAM = [
    (0.0,  (0, 0, -140), None),
    (4.6,  (0, 0, -140), SOFT),
    (9.4,  (0, 0, -40), 'linear'),
    (23.0, (-36, 12, 10), INOUT),                      # deriva lenta durante gli ingressi
    (24.4, cam_target('camunda', 640), None),          # primo piano Camunda
    (25.9, cam_target('camunda', 640), INOUT),
    (27.2, cam_target('ga4', 660), None),              # primo piano GA4
    (28.5, cam_target('ga4', 660), INOUT),
    (29.7, cam_target('jira', 640), None),             # primo piano Jira
    (30.6, cam_target('jira', 640), INOUT),
    (32.4, (0, 0, -300), 'linear'),                    # campo largo: tutto l'ecosistema
    (35.3, (0, 0, -340), SOFT),
    (38.5, (0, 0, -120), None),                        # leggero avvicinamento mentre tutto converge
]
cam = kf([(t, f'transform:translate3d({x}px,{y}px,{z}px)', e) for t, (x, y, z), e in CAM])

# ── Elementi di scena ────────────────────────────────────────────────────────
# Logo lockup (apertura e chiusura, identico)
lock = kf([(T_LOGO_IN, 'opacity:0; transform:scale(1.06)', SOFT),
           (T_LOGO_IN + 1.5, 'opacity:1; transform:scale(1)', None),
           (T_LOGO_OUT, 'opacity:1; transform:scale(1)', SOFT),
           (T_LOGO_OUT + .9, 'opacity:0; transform:scale(.94)', None),
           (T_CLOSE, 'opacity:0; transform:scale(1.04)', SOFT),
           (T_CLOSE + 1.3, 'opacity:1; transform:scale(1)', None)])
# Bagliore arancione dietro il logo
halo = opacity([(T_LOGO_IN + .3, 0, SOFT), (T_LOGO_IN + 2.0, .55, None), (T_LOGO_OUT, .55, SOFT),
                (T_LOGO_OUT + .8, 0, None), (T_CLOSE + .2, 0, SOFT), (T_CLOSE + 1.8, .5, None)])
# Velo nero: copre l'ecosistema in apertura e chiusura
blk = opacity([(4.3, 1, SOFT), (5.6, 0, None), (37.4, 0, SOFT), (39.9, 1, None)])
# Luce calda dell'ambiente
warm = opacity([(4.4, 0, SOFT), (6.8, .7, None), (30.5, .7, SOFT), (33.0, 1, None),
                (35.0, .95, SOFT), (39.2, 0, None)])
# Bloom centrale: al picco (32–34) e lampo finale mentre tutto converge
bloom = opacity([(31.6, 0, SOFT), (33.2, .5, SOFT), (35.0, .15, None), (36.3, .15, SOFT),
                 (37.4, .6, SOFT), (39.4, 0, None)])
# Hub Sevenda al centro del mondo
hub = kf([(T_HUB, 'opacity:0; transform:translate(-50%,-50%) scale(.6)', EXPO),
          (T_HUB + 1.0, 'opacity:1; transform:translate(-50%,-50%) scale(1)', None),
          (38.0, 'opacity:1; transform:translate(-50%,-50%) scale(1)', SOFT),
          (39.2, 'opacity:0; transform:translate(-50%,-50%) scale(.5)', None)])
hubring = opacity([(T_HUB + .6, 0, SOFT), (T_HUB + 1.4, .9, SOFT), (T_HUB + 3.5, .35, None),
                   (32.0, .35, SOFT), (33.2, .9, SOFT), (37.8, .6, SOFT), (38.8, 0, None)])

lines = '\n'.join(line_for(i, p[0], p[1], *((CW, CH) if live else (SW, SH))) for i, (_, _, _, live, p) in enumerate(CARDS))
cards = '\n'.join(card(i, *c) for i, c in enumerate(CARDS))

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sevenda — Connect (45 s, single timeline)</title>
<style>
@font-face {{ font-family: 'Geist';      src: url('fonts/Geist-Variable.woff2') format('woff2');     font-weight: 100 900; font-display: block; }}
@font-face {{ font-family: 'Geist Mono'; src: url('fonts/GeistMono-Variable.woff2') format('woff2'); font-weight: 100 900; font-display: block; }}
:root {{ --or: #E8733A; --sans: 'Geist', sans-serif; --mono: 'Geist Mono', monospace; }}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; color: #f2f2ef; font-family: var(--sans); -webkit-font-smoothing: antialiased; }}
/* Timeline unica: ogni elemento animato condivide durata, linear, both, paused */
[style*="animation-name"] {{ animation-duration: {int(DUR * 1000)}ms; animation-timing-function: linear; animation-fill-mode: both; animation-play-state: paused; }}
.stage {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; background: #0A0A0A; perspective: 1800px; perspective-origin: 50% 50%; }}

/* Ambiente near-black: luce calda dal basso + vignetta */
.warm {{ position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 70% 62% at 50% 108%, rgba(232,115,58,.34) 0%, rgba(232,115,58,.10) 42%, transparent 72%),
              radial-gradient(ellipse 45% 40% at 50% 50%, rgba(232,115,58,.07) 0%, transparent 70%); }}
.vig {{ position: absolute; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,.55) 100%); }}
.bloom {{ position: absolute; left: 50%; top: 50%; width: 1100px; height: 1100px; transform: translate(-50%,-50%); z-index: 1; pointer-events: none;
  background: radial-gradient(circle, rgba(232,115,58,.55) 0%, rgba(232,115,58,.18) 30%, transparent 62%); }}

/* Mondo 3D: la camera è il transform di .world */
.world {{ position: absolute; inset: 0; z-index: 2; transform-style: preserve-3d; }}
.net {{ position: absolute; left: 0; top: 0; width: {W}px; height: {H}px; overflow: visible; }}
.ln {{ stroke: var(--or); stroke-width: 1.5; stroke-dasharray: 1; stroke-linecap: round; }}
.ln.lit {{ stroke: #ffb27a; stroke-width: 2.2; stroke-dasharray: none; }}
.nd {{ fill: var(--or); transform-box: fill-box; transform-origin: center; }}
.hub {{ position: absolute; left: 50%; top: 50%; width: 132px; height: 132px; border-radius: 28px; background: #141414;
  border: 1px solid rgba(255,255,255,.14); box-shadow: 0 30px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06);
  display: flex; align-items: center; justify-content: center; }}
.hub img {{ width: 78px; height: 78px; }}
.hubring {{ position: absolute; left: 50%; top: 50%; width: 164px; height: 164px; transform: translate(-50%,-50%); border-radius: 50%;
  border: 1px solid rgba(232,115,58,.7); box-shadow: 0 0 40px rgba(232,115,58,.35), inset 0 0 24px rgba(232,115,58,.18); }}

/* Card integrazione */
.cp, .ci, .cf {{ transform-style: preserve-3d; }}
.cp {{ position: absolute; }}
.ci, .cf {{ width: 100%; height: 100%; }}
.card {{ width: 100%; height: 100%; border-radius: 18px; background: #141414; border: 1px solid rgba(255,255,255,.13);
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,.6); }}
.card.soon {{ opacity: .82; }}
.bar {{ height: 40px; flex-shrink: 0; display: flex; align-items: center; padding: 0 14px; gap: 10px;
  background: rgba(255,255,255,.045); border-bottom: 1px solid rgba(255,255,255,.07); }}
.bar i {{ width: 9px; height: 9px; border-radius: 50%; background: var(--or); }}
.st {{ margin-left: auto; font-family: var(--mono); font-size: 11px; letter-spacing: .04em; padding: 3px 8px; border-radius: 100px; display: inline-flex; align-items: center; gap: 6px; }}
.st::before {{ content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }}
.st.live {{ color: #9ec97a; border: 1px solid rgba(158,201,122,.3); }}
.st.soon {{ color: var(--or); border: 1px solid rgba(232,115,58,.35); }}
.body {{ flex: 1; display: flex; align-items: center; justify-content: center; padding: 6px 20px 0; }}
.lg {{ max-width: 76%; max-height: 46px; width: auto; height: auto; display: block; }}
.lg.camunda {{ max-height: 40px; }}
.lg.ga4 {{ max-height: 52px; }}
.lg.confluence {{ max-width: 80%; }}
.lg.bizagi {{ max-height: 50px; }}
.lrow {{ display: flex; align-items: center; gap: 12px; color: #f2f2ef; font-size: 26px; font-weight: 600; letter-spacing: -.02em; }}
.lrow svg {{ width: 40px; height: 40px; }}
.lrow .sq {{ width: 42px; height: 42px; border-radius: 10px; }}
.foot {{ height: 50px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
  border-top: 1px solid rgba(255,255,255,.07); }}
.foot b {{ font-size: 15px; font-weight: 600; letter-spacing: -.01em; color: #ecece8; }}
.foot span {{ font-family: var(--mono); font-size: 11px; color: #8a8a84; letter-spacing: .03em; }}
.card.soon .foot b {{ color: #c9c9c4; }}

/* Velo nero e logo (apertura / chiusura) */
.blk {{ position: absolute; inset: 0; z-index: 5; background: #000; }}
.halo {{ position: absolute; left: 50%; top: 50%; width: 1400px; height: 900px; transform: translate(-50%,-50%); z-index: 6; pointer-events: none;
  background: radial-gradient(ellipse, rgba(232,115,58,.30) 0%, rgba(232,115,58,.08) 38%, transparent 64%); }}
.lock {{ position: absolute; inset: 0; z-index: 7; display: flex; align-items: center; justify-content: center; gap: 36px; }}
.lock img {{ width: 150px; height: 150px; }}
.lock span {{ font-size: 136px; font-weight: 800; letter-spacing: -.045em; line-height: 1; color: #fff; }}
</style>
<style>
{chr(10).join(KF)}
</style>
</head>
<body>
<div class="stage">
  <div class="warm" {warm}></div>
  <div class="vig"></div>
  <div class="bloom" {bloom}></div>
  <div class="world" {A(cam)}>
    <svg class="net" viewBox="0 0 {W} {H}">
{lines}
    </svg>
    <div class="hubring" {hubring}></div>
    <div class="hub" {A(hub)}><img src="logo.svg" alt=""></div>
{cards}
  </div>
  <div class="blk" {blk}></div>
  <div class="halo" {halo}></div>
  <div class="lock" {A(lock)}><img src="logo.svg" alt=""><span>Sevenda</span></div>
</div>
<script>
  // Seek deterministico: porta ogni animazione (tutte pausate, stessa durata) al tempo t
  window.__seek = function (tMs) {{
    document.getAnimations().forEach(a => {{ a.currentTime = tMs; }});
  }};
  window.__ready = false;
  Promise.all([document.fonts.ready, ...Array.from(document.images, i => i.decode().catch(() => {{}}))]).then(() => {{
    window.__seek(0);
    // primo paint dopo il caricamento di font e immagini
    requestAnimationFrame(() => requestAnimationFrame(() => {{ window.__ready = true; }}));
  }});
</script>
</body>
</html>
'''
out = Path(__file__).with_name('promo-connect.html')
out.write_text(html, encoding='utf-8')
print(f'{out.name}: {len(KF)} keyframes, {len(html) // 1024} KB')
