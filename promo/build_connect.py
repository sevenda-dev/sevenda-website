#!/usr/bin/env python3
"""Generatore di promo-connect.html: video Connect di 45 s esatti, 1920×1080.

Montaggio tagliato su una griglia a 124 BPM (musica elettronica a ritmo medio):
ogni ingresso, movimento di camera e passaggio di luce cade su una battuta.

Narrazione: brand opening su nero → near-black, una linea arancione collega
punti sparsi (nessun hub) → le integrazioni della pagina Connect (loghi
autentici: 4 disponibili + 4 "coming soon", più 4 tile delle disponibili)
attraversano il quadro in profondità, una ogni 2 battute → convergono in un
cluster centrale stratificato, primi piani rapidi, campo largo al picco (32–34 s)
→ tutto si allontana nel buio → brand closing identico all'apertura.
Il logo Sevenda compare solo in apertura e chiusura.

Stessa tecnica di promo.html: timeline CSS unica di 45 000 ms, linear, fill
both, paused; easing nei keyframe; window.__seek(t). Profondità vera:
perspective sullo stage, mondo in preserve-3d, camera = transform del mondo.

Uso:  python3 build_connect.py  →  promo-connect.html
"""
import math
from pathlib import Path

DUR = 45.0
W, H = 1920, 1080
BPM = 124
BEAT = 60 / BPM                           # 0.484 s


def b(n):
    """Secondi della battuta n (griglia musicale)."""
    return round(n * BEAT, 3)


EXPO = 'cubic-bezier(.16,1,.3,1)'       # uscita morbida (stesso easing della card Connect)
INOUT = 'cubic-bezier(.7,0,.3,1)'       # movimenti di camera
SOFT = 'cubic-bezier(.4,0,.2,1)'
EASEIN = 'cubic-bezier(.6,0,.9,.3)'
SNAP = 'cubic-bezier(.3,1.25,.4,1)'     # ingressi rapidi, leggero overshoot sulla battuta

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
    return A(kf([(t, f'opacity:{v}', e) for t, v, e in pts]))


# ── Integrazioni: esattamente quelle della pagina Connect ───────────────────
# key, nome, categoria, disponibile, posizione sparsa (scena 3), posizione nel cluster (scena 4)
CARDS = [
    ('jira',       'Jira',               'Ticketing',     True,  (-640, -250, -150), (-330, -150,  40)),
    ('camunda',    'Camunda',            'Modeling',      True,  ( 600, -220,  120), ( 330, -140,  60)),
    ('ga4',        'Google Analytics 4', 'Analytics',     True,  (-560,  260,   80), (-340,  160,  20)),
    ('confluence', 'Confluence',         'Documentation', True,  ( 640,  230, -200), ( 340,  170,  50)),
    ('signavio',   'SAP Signavio',       'Modeling',      False, (-230, -330, -240), (-110, -250, -40)),
    ('mermaid',    'Mermaid',            'Documentation', False, ( 260, -350,  200), ( 120, -260, -60)),
    ('notion',     'Notion',             'Documentation', False, (-260,  330, -220), (-120,  250, -50)),
    ('bizagi',     'Bizagi',             'Modeling',      False, ( 300,  350, -120), ( 130,  260, -30)),
]
# Tile quadrate (solo logo) delle integrazioni disponibili, per infittire il montaggio
TILES = [
    ('jira',       ( -60,  -60, -330), (  70,  -40, 130)),
    ('camunda',    ( 120,   80,  300), (-560,   10, -80)),
    ('ga4',        (-860,   40, -380), ( 560,    0, -90)),
    ('confluence', ( 840,  -30, -300), ( -60,   30, 100)),
]
CW, CH = 300, 196          # card disponibile
SW, SH = 256, 166          # card "coming soon"
TW = 150                   # tile

NOTION_SVG = ('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>')

# ── Timeline (battute → secondi) ─────────────────────────────────────────────
T_LOGO_IN, T_LOGO_OUT = 0.5, 4.0
T_NET = [b(10.5 + i) for i in range(8)]                     # 5.1 → 8.5 s: la linea raggiunge i punti
ORDER = ['jira', 'tile:jira', 'camunda', 'ga4', 'tile:camunda', 'confluence', 'signavio',
         'tile:ga4', 'mermaid', 'notion', 'tile:confluence', 'bizagi']
T_IN = {k: b(19 + 2 * i) for i, k in enumerate(ORDER)}      # 9.2 → 19.8 s, uno ogni 2 battute
T_CLUSTER = b(48)                                            # 23.2 s: convergenza (1 bar)
T_PUSH = [b(51), b(55), b(59)]                               # primi piani
T_WIDE = b(63)                                               # 30.5 s: campo largo
T_COLLAPSE = b(73)                                           # 35.3 s
T_CLOSE = 40.4


def rect_edge(x, y, w, h, tx, ty, inset=10):
    """Punto sul bordo del rettangolo centrato in (x,y) lungo la direzione verso (tx,ty)."""
    dx, dy = tx - x, ty - y
    d = math.hypot(dx, dy) or 1
    ux, uy = dx / d, dy / d
    k = min(w / 2 / abs(ux) if ux else 1e9, h / 2 / abs(uy) if uy else 1e9)
    return x + ux * (k - inset), y + uy * (k - inset)


# ── Scena 2: una linea arancione collega punti sparsi (nessun hub) ─────────
NET = [(-620, -170), (-300, 70), (-80, -230), (210, 130), (470, -130), (720, 170), (-420, 300), (300, -340)]
LINKS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (1, 6), (2, 7), (3, 7)]


def net():
    out = []
    for i, (x, y) in enumerate(NET):
        t = T_NET[i]
        out.append(f'<circle cx="{W / 2 + x}" cy="{H / 2 + y}" r="5" class="nd" '
                   + A(kf([(t - .05, 'transform:scale(0); opacity:0', 'cubic-bezier(.34,1.56,.64,1)'),
                           (t + .3, 'transform:scale(1); opacity:1', None),
                           (b(18), 'transform:scale(1); opacity:1', SOFT), (b(19.5), 'transform:scale(0); opacity:0', None)])) + '/>')
    for a, c in LINKS:
        t0, t1 = T_NET[a], T_NET[c]
        if t1 < t0:
            t0, t1 = t1, t0
        (x1, y1), (x2, y2) = NET[a], NET[c]
        out.append(f'<line x1="{W / 2 + x1}" y1="{H / 2 + y1}" x2="{W / 2 + x2}" y2="{H / 2 + y2}" pathLength="1" class="ln" '
                   + A(kf([(t0, 'stroke-dashoffset:1; opacity:.7', 'cubic-bezier(.4,0,.2,1)'),
                           (t1, 'stroke-dashoffset:0; opacity:.7', None),
                           (b(18), 'stroke-dashoffset:0; opacity:.7', SOFT), (b(19.5), 'stroke-dashoffset:0; opacity:0', None)])) + '/>')
    return '\n'.join(out)


# ── Scena 4: brevi collegamenti fra card vicine nel cluster ──────────────────
RING = [('jira', 'signavio'), ('signavio', 'mermaid'), ('mermaid', 'camunda'), ('camunda', 'confluence'),
        ('confluence', 'bizagi'), ('bizagi', 'notion'), ('notion', 'ga4'), ('ga4', 'jira')]


def ring():
    pos = {k: (c[0], c[1], (CW, CH) if live else (SW, SH)) for k, _, _, live, _, c in CARDS}
    out = []
    for i, (a, c) in enumerate(RING):
        (ax, ay, (aw, ah)), (cx, cy, (cw, ch)) = pos[a], pos[c]
        x1, y1 = rect_edge(ax, ay, aw, ah, cx, cy)
        x2, y2 = rect_edge(cx, cy, cw, ch, ax, ay)
        t = b(64.5 + i * .5)
        out.append(f'<line x1="{W / 2 + x1:.1f}" y1="{H / 2 + y1:.1f}" x2="{W / 2 + x2:.1f}" y2="{H / 2 + y2:.1f}" pathLength="1" class="ln lit" '
                   + A(kf([(t, 'stroke-dashoffset:1; opacity:.0', None), (t + .001, 'stroke-dashoffset:1; opacity:.85', SOFT),
                           (t + .45, 'stroke-dashoffset:0; opacity:.85', None),
                           (T_COLLAPSE, 'stroke-dashoffset:0; opacity:.85', SOFT), (T_COLLAPSE + .7, 'stroke-dashoffset:1; opacity:0', None)])) + '/>')
    return '\n'.join(out)


# ── Card e tile ──────────────────────────────────────────────────────────────
def motion(start, cluster, near):
    """Keyframe del wrapper .ci: ingresso rapido, deriva, convergenza nel cluster, uscita nel buio."""
    x, y, z = start
    cx, cy, cz = cluster
    sx = 1 if x >= 0 else -1
    sy = 1 if y >= 0 else -1
    # Ingresso: da vicino (grande, attraversa il quadro) o da lontano (piccolo, emerge)
    if near:
        enter = (f'opacity:0; transform:translate3d({sx * 900:.0f}px,{sy * 260:.0f}px,700px) '
                 f'rotateY({-sx * 24}deg) rotateZ({sx * 5}deg)')
    else:
        enter = (f'opacity:0; transform:translate3d({sx * 480:.0f}px,{sy * 220:.0f}px,-1500px) '
                 f'rotateY({sx * 14}deg) rotateZ({-sx * 3}deg)')
    rest = 'opacity:1; transform:translate3d(0px,0px,0px) rotateY(0deg) rotateZ(0deg)'
    # Deriva lenta fino alla convergenza (parallasse con la camera)
    dx, dy = sx * 64, sy * 30
    drift = f'opacity:1; transform:translate3d({dx}px,{dy}px,0px) rotateY(0deg) rotateZ(0deg)'
    clus = f'opacity:1; transform:translate3d({cx - x}px,{cy - y}px,{cz - z}px) rotateY(0deg) rotateZ(0deg)'
    # Uscita: si allontana nel buio
    gone = f'opacity:0; transform:translate3d({(cx - x) + cx * .6:.0f}px,{(cy - y) + cy * .6:.0f}px,{cz - z - 1700}px) rotateY(0deg) rotateZ(0deg)'
    return enter, rest, drift, clus, gone


def wrap(t_in, t_out, start, cluster, near):
    enter, rest, drift, clus, gone = motion(start, cluster, near)
    return A(kf([(t_in, enter, SNAP), (t_in + .62, rest, 'linear'),
                 (T_CLUSTER, drift, INOUT), (T_CLUSTER + 1.9, clus, None),
                 (t_out, clus, EASEIN), (t_out + .9, gone, None)]))


def glow(t_in):
    base = '0 30px 60px rgba(0,0,0,.6)'
    return A(kf([(t_in + .2, f'box-shadow:{base}, 0 0 0 0 rgba(232,115,58,0)', EXPO),
                 (t_in + .55, f'box-shadow:{base}, 0 0 54px 0 rgba(232,115,58,.4)', SOFT),
                 (t_in + 1.6, f'box-shadow:{base}, 0 0 0 0 rgba(232,115,58,0)', None),
                 (b(66), f'box-shadow:{base}, 0 0 0 0 rgba(232,115,58,0)', SOFT),
                 (b(68.5), f'box-shadow:{base}, 0 0 44px 0 rgba(232,115,58,.26)', SOFT),
                 (T_COLLAPSE, f'box-shadow:{base}, 0 0 0 0 rgba(232,115,58,0)', None)]))


def card(i, key, name, cat, live, start, cluster):
    w, h = (CW, CH) if live else (SW, SH)
    x, y, z = start
    t = T_IN[key]
    t_out = T_COLLAPSE + .3 + (len(ORDER) - 1 - ORDER.index(key)) * .17
    if key == 'notion':
        logo = f'<div class="lrow">{NOTION_SVG}<span>Notion</span></div>'
    elif key == 'mermaid':
        logo = '<div class="lrow"><img src="logos/mermaid.svg" alt="" class="sq"><span>Mermaid</span></div>'
    else:
        logo = f'<img src="logos/{key}.svg" alt="" class="lg {key}">'
    status = '<span class="st live">Available</span>' if live else '<span class="st soon">Coming soon</span>'
    return f'''
    <div class="cp" style="left:{W / 2 + x - w / 2:.0f}px; top:{H / 2 + y - h / 2:.0f}px; width:{w}px; height:{h}px; transform:translateZ({z}px)">
      <div class="ci" {wrap(t, t_out, start, cluster, near=(i % 2 == 1))}>
        <div class="card{'' if live else ' soon'}" {glow(t)}>
          <div class="bar"><i></i>{status}</div>
          <div class="body">{logo}</div>
          <div class="foot"><b>{name}</b><span>{cat}</span></div>
        </div>
      </div>
    </div>'''


def tile(i, key, start, cluster):
    x, y, z = start
    t = T_IN['tile:' + key]
    t_out = T_COLLAPSE + .3 + (len(ORDER) - 1 - ORDER.index('tile:' + key)) * .17
    return f'''
    <div class="cp" style="left:{W / 2 + x - TW / 2:.0f}px; top:{H / 2 + y - TW / 2:.0f}px; width:{TW}px; height:{TW}px; transform:translateZ({z}px)">
      <div class="ci" {wrap(t, t_out, start, cluster, near=(i % 2 == 0))}>
        <div class="card tile" {glow(t)}><div class="body"><img src="logos/{key}.svg" alt="" class="lg {key}"></div></div>
      </div>
    </div>'''


# ── Camera (transform del mondo) ─────────────────────────────────────────────
def target(key, z):
    cx, cy, _ = next(c for k, _, _, _, _, c in CARDS if k == key)
    return (-cx, -cy, z)


CAM = [
    (0.0,           (0, 0, -220), None),
    (b(18),         (0, 0, -220), 'ease-in-out'),
    (b(30),         (80, -40, -130), 'ease-in-out'),       # oscillazione laterale durante gli ingressi
    (b(42),         (-80, 30, -70), 'ease-in-out'),
    (T_CLUSTER,     (24, -12, -90), INOUT),
    (T_CLUSTER + 1.9, (0, 0, -160), None),
    (T_PUSH[0] - .55, (0, 0, -160), INOUT),
    (T_PUSH[0],     target('camunda', 640), None),        # primo piano Camunda
    (T_PUSH[1] - .55, target('camunda', 640), INOUT),
    (T_PUSH[1],     target('ga4', 660), None),            # primo piano GA4
    (T_PUSH[2] - .55, target('ga4', 660), INOUT),
    (T_PUSH[2],     target('jira', 640), None),           # primo piano Jira
    (T_WIDE - .6,   target('jira', 640), INOUT),
    (T_WIDE + 1.3,  (0, 0, -200), 'linear'),              # campo largo sull'ecosistema
    (T_COLLAPSE,    (0, 0, -170), INOUT),
    (T_COLLAPSE + 3.3, (0, 0, 180), None),                # la camera avanza mentre tutto si allontana
]
cam = kf([(t, f'transform:translate3d({x}px,{y}px,{z}px)', e) for t, (x, y, z), e in CAM])
# Leggera rotazione del mondo al picco: dà volume al cluster
tilt = kf([(T_WIDE, 'transform:rotateY(0deg) rotateX(0deg)', 'ease-in-out'),
           (b(68), 'transform:rotateY(-5deg) rotateX(2deg)', 'ease-in-out'),
           (b(72), 'transform:rotateY(4deg) rotateX(-1.5deg)', 'ease-in-out'),
           (T_COLLAPSE + 1.5, 'transform:rotateY(0deg) rotateX(0deg)', None)])

# ── Luci e veli ──────────────────────────────────────────────────────────────
lock = kf([(T_LOGO_IN, 'opacity:0; transform:scale(1.06)', SOFT),
           (T_LOGO_IN + 1.5, 'opacity:1; transform:scale(1)', None),
           (T_LOGO_OUT, 'opacity:1; transform:scale(1)', SOFT),
           (T_LOGO_OUT + .9, 'opacity:0; transform:scale(.94)', None),
           (T_CLOSE, 'opacity:0; transform:scale(1.04)', SOFT),
           (T_CLOSE + 1.3, 'opacity:1; transform:scale(1)', None)])
halo = opacity([(T_LOGO_IN + .3, 0, SOFT), (T_LOGO_IN + 2.0, .55, None), (T_LOGO_OUT, .55, SOFT),
                (T_LOGO_OUT + .8, 0, None), (38.4, 0, SOFT), (39.2, .4, SOFT), (40.1, 0, SOFT), (T_CLOSE + 1.8, .5, None)])
blk = opacity([(4.3, 1, SOFT), (5.4, 0, None), (38.0, 0, SOFT), (40.0, 1, None)])
warm = kf([(4.4, 'opacity:0; transform:translateX(-120px)', SOFT), (6.8, 'opacity:.75; transform:translateX(-120px)', 'linear'),
           (b(66), 'opacity:.75; transform:translateX(120px)', SOFT), (b(69), 'opacity:1; transform:translateX(0px)', 'linear'),
           (T_COLLAPSE, 'opacity:.9; transform:translateX(0px)', SOFT), (39.6, 'opacity:0; transform:translateX(0px)', None)])
bloom = opacity([(b(65), 0, SOFT), (b(68.5), .55, SOFT), (b(72), .2, None), (T_COLLAPSE, .2, SOFT),
                 (T_COLLAPSE + 2.0, .7, SOFT), (39.6, 0, None)])


def sweep(t):
    """Passaggio di luce arancione sul cambio scena (una battuta)."""
    return A(kf([(t - .01, 'opacity:0; transform:translateX(-700px) skewX(-18deg)', None),
                 (t, 'opacity:.9; transform:translateX(-700px) skewX(-18deg)', 'cubic-bezier(.3,0,.2,1)'),
                 (t + BEAT * 1.5, 'opacity:0; transform:translateX(2300px) skewX(-18deg)', None)]))


# Tutto il markup animato va generato PRIMA del template: i @keyframes vengono raccolti in KF
cards = '\n'.join(card(i, *c) for i, c in enumerate(CARDS))
tiles = '\n'.join(tile(i, *t) for i, t in enumerate(TILES))
net_svg, ring_svg = net(), ring()
sweep1, sweep2 = sweep(T_CLUSTER), sweep(T_COLLAPSE)

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
.warm {{ position: absolute; inset: -200px 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 55% at 50% 100%, rgba(232,115,58,.36) 0%, rgba(232,115,58,.10) 42%, transparent 72%),
              radial-gradient(ellipse 50% 42% at 50% 50%, rgba(232,115,58,.06) 0%, transparent 70%); }}
.vig {{ position: absolute; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,.55) 100%); }}
.bloom {{ position: absolute; left: 50%; top: 50%; width: 1300px; height: 1100px; transform: translate(-50%,-50%); z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse, rgba(232,115,58,.5) 0%, rgba(232,115,58,.16) 32%, transparent 64%); }}
.sweep {{ position: absolute; left: 0; top: -200px; width: 420px; height: {H + 400}px; z-index: 4; pointer-events: none; mix-blend-mode: screen;
  background: linear-gradient(90deg, transparent 0%, rgba(232,115,58,.28) 45%, rgba(255,200,160,.42) 50%, rgba(232,115,58,.28) 55%, transparent 100%); }}

/* Mondo 3D: la camera è il transform di .world */
.world {{ position: absolute; inset: 0; z-index: 2; transform-style: preserve-3d; }}
.tilt {{ position: absolute; inset: 0; transform-style: preserve-3d; transform-origin: 50% 50%; }}
.net {{ position: absolute; left: 0; top: 0; width: {W}px; height: {H}px; overflow: visible; }}
.ln {{ stroke: var(--or); stroke-width: 1.5; stroke-dasharray: 1; stroke-linecap: round; }}
.ln.lit {{ stroke: #ffb27a; stroke-width: 2; }}
.nd {{ fill: var(--or); transform-box: fill-box; transform-origin: center; }}

/* Card integrazione */
.cp, .ci {{ transform-style: preserve-3d; }}
.cp {{ position: absolute; }}
.ci {{ width: 100%; height: 100%; }}
.card {{ width: 100%; height: 100%; border-radius: 18px; background: #141414; border: 1px solid rgba(255,255,255,.13);
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,.6); }}
.card.soon {{ opacity: .84; }}
.card.tile {{ border-radius: 22px; background: #121212; }}
.card.tile .body {{ padding: 0 18px; }}
.card.tile .lg {{ max-width: 80%; max-height: 54px; }}
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
  <div class="warm" {A(warm)}></div>
  <div class="vig"></div>
  <div class="bloom" {bloom}></div>
  <div class="world" {A(cam)}><div class="tilt" {A(tilt)}>
    <svg class="net" viewBox="0 0 {W} {H}">
{net_svg}
{ring_svg}
    </svg>
{cards}
{tiles}
  </div></div>
  <div class="sweep" {sweep1}></div>
  <div class="sweep" {sweep2}></div>
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
print(f'{out.name}: {len(KF)} keyframes, {len(html) // 1024} KB, beat={BEAT:.3f}s')
