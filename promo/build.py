# -*- coding: utf-8 -*-
"""
Genera promo/promo.html: una scena 1920×1080 con TUTTE le animazioni sulla
stessa timeline (45000 ms, linear, both, paused). Ogni scena è un intervallo
di percentuali dentro i 45 s; l'easing sta dentro i keyframe.
Il frame è funzione pura di currentTime: nessun rAF, transition, steps(),
random. window.__seek(t) porta ogni animazione al tempo t.
"""
import os

DUR = 45.0                     # durata totale (s)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'promo.html')

EASE_OUT = 'cubic-bezier(.16,1,.3,1)'
EASE_IO  = 'cubic-bezier(.45,0,.2,1)'
EASE_IN  = 'cubic-bezier(.4,0,1,1)'

KF = []                        # blocchi @keyframes generati
_names = set()

def p(t):
    """secondi → percentuale della timeline"""
    return round(max(0.0, min(DUR, t)) / DUR * 100.0, 4)

def kf(name, stops):
    """stops: lista di (t_s, {prop: val}, easing|None). Aggiunge 0% e 100%."""
    assert name not in _names, name
    _names.add(name)
    stops = sorted(stops, key=lambda s: s[0])
    if stops[0][0] > 0:
        stops.insert(0, (0.0, dict(stops[0][1]), None))
    if stops[-1][0] < DUR:
        stops.append((DUR, dict(stops[-1][1]), None))
    lines = []
    seen = set()
    for t, props, ease in stops:
        pc = p(t)
        if pc in seen:            # due stop allo stesso istante: tieni l'ultimo
            lines = [l for l in lines if not l.startswith(f'  {pc}% ')]
        seen.add(pc)
        body = '; '.join(f'{k}: {v}' for k, v in props.items())
        if ease:
            body += f'; animation-timing-function: {ease}'
        lines.append(f'  {pc}% {{ {body} }}')
    KF.append(f'@keyframes {name} {{\n' + '\n'.join(lines) + '\n}')
    return name

# ── helper di animazione ────────────────────────────────────────────────
def window(name, t_in, t_out, enter=.5, exit=.45, tf_in='scale(1.04) translateY(12px)', tf_out='scale(.98)'):
    """gruppo scena: entra con crossfade+scale, tiene, esce"""
    hidden = {'opacity': 0, 'transform': tf_in}
    shown  = {'opacity': 1, 'transform': 'none'}
    stops = [(t_in, dict(hidden), EASE_OUT), (t_in + enter, dict(shown), None)]
    if t_out < DUR:
        stops += [(t_out - exit, dict(shown), EASE_IN), (t_out, {'opacity': 0, 'transform': tf_out}, None)]
    return kf(name, stops)

def pop(name, t, dur=.45, dy=14, sc=.96):
    return kf(name, [(t, {'opacity': 0, 'transform': f'translateY({dy}px) scale({sc})'}, EASE_OUT),
                     (t + dur, {'opacity': 1, 'transform': 'none'}, None)])

def fade(name, t, dur=.4, a=0, b=1):
    return kf(name, [(t, {'opacity': a}, EASE_IO), (t + dur, {'opacity': b}, None)])

def draw(name, t, dur, length):
    return kf(name, [(t, {'stroke-dashoffset': length}, EASE_IO), (t + dur, {'stroke-dashoffset': 0}, None)])

def grow(name, t, dur=.6):
    return kf(name, [(t, {'transform': 'scaleY(0)'}, EASE_OUT), (t + dur, {'transform': 'scaleY(1)'}, None)])

def reveal(name, t, dur):
    return kf(name, [(t, {'clip-path': 'inset(0 100% 0 0)'}, None), (t + dur, {'clip-path': 'inset(0 0 0 0)'}, None)])

def move(name, t, dur, dx, dy, ease=EASE_IO):
    return kf(name, [(t, {'transform': 'translate(0,0)'}, ease), (t + dur, {'transform': f'translate({dx}px,{dy}px)'}, None)])

def press(name, t, sc=.96):
    return kf(name, [(t, {'transform': 'scale(1)', 'filter': 'brightness(1)'}, None),
                     (t + .08, {'transform': f'scale({sc})', 'filter': 'brightness(.85)'}, None),
                     (t + .22, {'transform': 'scale(1)', 'filter': 'brightness(1)'}, None)])

def blink(name, t_in, t_out, period=.55):
    stops = []
    t = t_in
    on = True
    while t < t_out:
        stops.append((t, {'opacity': 1 if on else .25}, None))
        stops.append((min(t + period - .03, t_out), {'opacity': 1 if on else .25}, None))
        t += period
        on = not on
    stops.insert(0, (0, {'opacity': 1}, None))
    return kf(name, stops)

def cursor_path(name, pts, hide_dur=.35):
    """pts: (t, x, y) in coordinate stage; il polpastrello è nel punto"""
    stops = []
    t0, x0, y0 = pts[0]
    stops.append((t0 - .3, {'opacity': 0, 'transform': f'translate({x0 - 14}px,{y0 - 4}px)'}, EASE_OUT))
    for i, (t, x, y) in enumerate(pts):
        stops.append((t, {'opacity': 1, 'transform': f'translate({x - 14}px,{y - 4}px)'}, EASE_IO))
    tl, xl, yl = pts[-1]
    stops.append((tl + hide_dur, {'opacity': 0, 'transform': f'translate({xl - 14}px,{yl - 4}px)'}, None))
    return kf(name, stops)

def click_scale(name, times):
    stops = [(0, {'transform': 'scale(1)'}, None)]
    for t in times:
        stops += [(t - .02, {'transform': 'scale(1)'}, None), (t + .07, {'transform': 'scale(.9)'}, None), (t + .2, {'transform': 'scale(1)'}, None)]
    return kf(name, stops)

# ── elementi di scena ───────────────────────────────────────────────────
HTML = []
def h(s): HTML.append(s)
def A(name): return f'class="a" style="animation-name:{name}"'

CARD_X, CARD_Y = 160, 110      # offset card nello stage (per il cursore)

# ── SFONDO: mesh gradient (blob che derivano per tutti i 45 s) ─────────
kf('bgA', [(0, {'transform': 'translate(0,0) scale(1)'}, EASE_IO), (22, {'transform': 'translate(340px,180px) scale(1.18)'}, EASE_IO), (45, {'transform': 'translate(-120px,320px) scale(1.05)'}, None)])
kf('bgB', [(0, {'transform': 'translate(0,0) scale(1)'}, EASE_IO), (18, {'transform': 'translate(-300px,-160px) scale(1.12)'}, EASE_IO), (45, {'transform': 'translate(160px,-320px) scale(.95)'}, None)])
kf('bgC', [(0, {'transform': 'translate(0,0)'}, EASE_IO), (25, {'transform': 'translate(-220px,240px)'}, EASE_IO), (45, {'transform': 'translate(260px,-80px)'}, None)])
kf('bgD', [(0, {'transform': 'translate(0,0) rotate(0deg)'}, EASE_IO), (45, {'transform': 'translate(200px,120px) rotate(30deg)'}, None)])

# ── CARD ────────────────────────────────────────────────────────────────
kf('card', [(0, {'opacity': 0, 'transform': 'scale(.97) translateY(18px)'}, EASE_OUT), (.7, {'opacity': 1, 'transform': 'none'}, None),
            (42.7, {'opacity': 1, 'transform': 'none'}, EASE_IN), (43.4, {'opacity': 0, 'transform': 'scale(.96) translateY(-10px)'}, None)])

# ═══════════════ SCENA 1 · INTRO 0–4.5 ═══════════════
window('s1', 0.0, 4.6, enter=.6, exit=.5)
pop('s1logo', .15, .6, dy=20)
pop('s1h', .4, .6, dy=18)
pop('s1chip', .75, .5)

# ═══════════════ SCENA 2 · RECORD 4.5–12 ═══════════════
window('s2', 4.4, 12.2)
pop('s2cap', 4.9)
blink('rec', 5.0, 11.9)
rows2 = [(5.0, 'bn', 'NAV', 'navigate /cart'), (6.15, 'bu', 'UI', 'click button#add-to-cart'),
         (6.4, 'bnt', 'NET', 'POST /api/cart → 200 · 96ms'), (7.45, 'bu', 'UI', 'click button#checkout'),
         (7.7, 'bn', 'NAV', 'navigate /checkout'), (8.55, 'bu', 'UI', 'input #email'),
         (9.95, 'bu', 'UI', 'click button#pay'), (10.2, 'bnt', 'NET', 'POST /api/payments → 201 · 412ms'),
         (10.6, 'bn', 'NAV', 'navigate /order/complete')]
for i, (t, *_r) in enumerate(rows2):
    pop(f'row{i}', t, .3, dy=8, sc=1)
press('btnAdd', 6.0); press('btnCo', 7.3); press('btnPay', 9.8)
kf('inputFocus', [(8.35, {'border-color': 'rgba(0,0,0,.14)'}, None), (8.45, {'border-color': '#E8733A'}, None)])
reveal('typed', 8.5, .8)
pop('toast', 10.45, .4, dy=10)
pop('cartQty', 6.1, .3, dy=0, sc=.6)
# cursore (coordinate stage)
BX, BY = CARD_X + 60, CARD_Y + 120          # origine mock browser nello stage
cursor_path('cur2', [(4.9, BX + 540, BY + 470), (5.9, BX + 835, BY + 132), (7.2, BX + 835, BY + 244),
                     (8.3, BX + 150, BY + 351), (9.7, BX + 140, BY + 422), (11.0, BX + 420, BY + 540)])
click_scale('clk2', [6.0, 7.3, 8.4, 9.8])

# ═══════════════ SCENA 3 · BPMN 12–22 ═══════════════
window('s3', 11.9, 22.2)
pop('s3cap', 12.6)
pop('poolU', 12.25, .5, dy=10, sc=.99); pop('poolS', 12.4, .5, dy=10, sc=.99)
pop('s3tag', 20.0, .4)
# nodi utente
for n, t in [('uStart', 12.8), ('uT1', 13.15), ('uT2', 13.65), ('uT3', 14.15), ('uT4', 14.65), ('uEnd', 15.15)]:
    pop(n, t, .4, dy=6, sc=.7)
for n, t, L in [('uE1', 13.0, 60), ('uE2', 13.5, 70), ('uE3', 14.0, 70), ('uE4', 14.5, 70), ('uE5', 15.0, 90)]:
    draw(n, t, .3, L)
# nodi sistema
for n, t in [('sT1', 15.6), ('sGw', 16.05), ('sT2', 16.55), ('sT3', 16.9), ('sT4', 17.35), ('sEnd', 17.85), ('sEnd2', 18.05)]:
    pop(n, t, .4, dy=6, sc=.7)
for n, t, L in [('sE1', 15.9, 80), ('sEyes', 16.4, 70), ('sEno', 16.6, 190), ('sE2', 17.2, 70), ('sE3', 17.7, 80), ('sE4', 17.9, 70)]:
    draw(n, t, .35, L)
pop('lblYes', 16.5, .3, dy=4, sc=1); pop('lblNo', 16.75, .3, dy=4, sc=1)
draw('mf1', 18.4, .5, 210); draw('mf2', 18.9, .6, 340); draw('mf3', 19.4, .6, 340)
for n, t in [('mf1d', 18.4), ('mf2d', 18.9), ('mf3d', 19.4)]:
    fade(n, t, .2)
for n, t in [('mf1a', 18.8), ('mf2a', 19.4), ('mf3a', 19.9)]:
    fade(n, t, .15)

# ═══════════════ SCENA 4 · INSIGHTS 22–29 ═══════════════
window('s4', 21.9, 29.2)
pop('s4cap', 22.5)
pop('s4hdr', 22.3, .4)
for i, t in enumerate([22.45, 22.6, 22.75, 22.9]):
    pop(f'ic{i}', t, .5, dy=18)
for i, t in enumerate([23.2, 23.35, 23.5, 23.65, 23.8]):
    grow(f'bar{i}', t, .6)
draw('spark', 23.6, 1.1, 720)
fade('sparkDot', 24.6, .2)
for i, t in enumerate([23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 24.0]):
    grow(f'wk{i}', t, .5)
for i, t in enumerate([24.0, 24.3, 24.6]):
    pop(f'tagrow{i}', t, .35, dy=8)
pop('pushchip', 25.2, .4)
for i, t in enumerate([23.0, 23.3, 23.6, 23.9]):
    pop(f'num{i}', t, .5, dy=10, sc=.9)

# ═══════════════ SCENA 5 · GTM PUSH 29–35 ═══════════════
window('s5', 28.9, 35.2)
pop('s5cap', 29.4)
pop('s5l', 29.3, .4); pop('s5box', 29.4, .5, dy=16)
for i, t in enumerate([29.5, 29.62, 29.74]):
    pop(f'tagc{i}', t, .4, dy=12)
for i, t in enumerate([30.3, 31.0, 31.7]):
    move(f'fly{i}', t, .75, 860, 40, ease=EASE_IO)
    kf(f'slot{i}', [(t + .6, {'border-color': 'rgba(255,255,255,.14)', 'background': 'transparent'}, None),
                    (t + .8, {'border-color': 'rgba(232,115,58,.55)', 'background': 'rgba(232,115,58,.08)'}, None)])
draw('okCircle', 32.6, .5, 200); draw('okTick', 33.0, .3, 60)
pop('okText', 33.1, .4, dy=8)
kf('progress', [(30.2, {'transform': 'scaleX(0)'}, EASE_IO), (32.6, {'transform': 'scaleX(1)'}, None)])

# ═══════════════ SCENA 6 · DNA NARRATIVE 35–40 ═══════════════
window('s6', 34.9, 40.2)
pop('s6cap', 35.4)
pop('s6lbl', 35.3, .4)
for i in range(7):
    draw(f'arc{i}', 35.3 + i * .22, .9, 1800)
pop('dnaCore', 36.6, .5, dy=0, sc=.5)
for i, t in enumerate([35.8, 36.6, 37.4, 38.2]):
    pop(f'line{i}', t, .6, dy=16, sc=1)
pop('sharechip', 39.0, .4)

# ═══════════════ SCENA 7 · TEAM 40–43 ═══════════════
window('s7', 39.9, 43.2, exit=.4)
pop('s7cap', 40.3)
pop('s7hdr', 40.15, .4)
for i, t in enumerate([40.3, 40.42, 40.54]):
    pop(f'lib{i}', t, .45, dy=14)
for i, t in enumerate([40.5, 40.58, 40.66]):
    pop(f'av{i}', t, .35, dy=0, sc=.5)
press('btnInv', 41.2, sc=.95)
pop('avNew', 41.65, .4, dy=0, sc=.4)
pop('toast2', 41.6, .4, dy=10)
cursor_path('cur7', [(40.3, CARD_X + 1180, CARD_Y + 560), (41.1, CARD_X + 1412, CARD_Y + 146), (42.3, CARD_X + 1300, CARD_Y + 420)], hide_dur=.3)
click_scale('clk7', [41.2])

# ═══════════════ OUTRO 43–45 ═══════════════
window('s8', 43.0, DUR, enter=.7, tf_in='scale(1.08)')
pop('s8logo', 43.1, .6, dy=0, sc=.8)
pop('s8word', 43.3, .6, dy=16)
pop('s8url', 43.7, .5)

# ── HTML ────────────────────────────────────────────────────────────────

def user_icon(x, y):
    return (f'<g transform="translate({x},{y})" class="ti"><circle cx="6" cy="4" r="3.2"/>'
            f'<path d="M0.5 13.5c0-3.3 2.5-5.3 5.5-5.3s5.5 2 5.5 5.3"/></g>')
def gear_icon(x, y):
    ticks = ''.join(f'<line x1="6" y1="0" x2="6" y2="2" transform="rotate({a} 6 6)"/>' for a in range(0, 360, 60))
    return f'<g transform="translate({x},{y})" class="ti"><circle cx="6" cy="6" r="3"/>{ticks}</g>'
def task(name, x, y, label, kind='user', w=180, hh=64):
    icon = user_icon(x + 8, y + 7) if kind == 'user' else gear_icon(x + 8, y + 8)
    return (f'<g class="a" style="animation-name:{name};transform-origin:{x + w/2}px {y + hh/2}px">'
            f'<rect class="task" x="{x}" y="{y}" width="{w}" height="{hh}" rx="12"/>{icon}'
            f'<text class="tl" x="{x + w/2}" y="{y + hh/2 + 6}">{label}</text></g>')
def evt(name, cx, cy, end=False):
    return (f'<g class="a" style="animation-name:{name};transform-origin:{cx}px {cy}px">'
            f'<circle class="{"evt end" if end else "evt"}" cx="{cx}" cy="{cy}" r="18"/></g>')
def edge(name, d, L, cls='e'):
    return f'<path class="{cls} a" style="animation-name:{name};stroke-dasharray:{L}" d="{d}" marker-end="url(#arr)"/>'

def hand_svg():
    return ('<svg class="hand" viewBox="0 0 32 40" width="44" height="55"><path d="M11 3v18l-3-3.5c-1.5-1.5-4-1.2-4.6.8-.4 1.3.1 2.6 1 3.6L11 30c2 2.5 4.5 4 8 4h3c4.5 0 8-3.5 8-8v-9c0-1.5-1.2-2.6-2.6-2.6S25 15.5 25 17v-1.5c0-1.5-1.2-2.7-2.7-2.7S19.7 14 19.7 15.5V14c0-1.5-1.2-2.7-2.7-2.7S14.3 12.5 14.3 14V3c0-1.7-.8-3-1.7-3S11 1.3 11 3z"/></svg>')

h('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Sevenda — promo (45 s, single timeline)</title>')
h('<style>')
h(f'''
@font-face {{ font-family: 'Geist';      src: url('fonts/Geist-Variable.woff2') format('woff2');     font-weight: 100 900; font-display: block; }}
@font-face {{ font-family: 'Geist Mono'; src: url('fonts/GeistMono-Variable.woff2') format('woff2'); font-weight: 100 900; font-display: block; }}
:root {{ --or: #E8733A; --amber: #c8a064; --bg: #0d0d0d; --card: #121212; --text: #f2f2ef; --muted: #8a8a84; --dim: #4a4a46;
        --sans: 'Geist', sans-serif; --mono: 'Geist Mono', monospace; }}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased; }}
/* Timeline unica: ogni elemento animato condivide durata, linear, both, paused */
.a {{ animation-duration: {int(DUR * 1000)}ms; animation-timing-function: linear; animation-fill-mode: both; animation-play-state: paused; }}
.stage {{ position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #140903; isolation: isolate; }}
/* Mesh gradient: blob sfocati su palette arancio/ambra/nero */
.bg {{ position: absolute; inset: 0; z-index: 0; overflow: hidden; background: radial-gradient(ellipse at 50% 120%, #5a220a 0%, #2a1106 50%, #120806 100%); }}
.blob {{ position: absolute; border-radius: 50%; }}
.bA {{ left: -300px; top: -500px; width: 1500px; height: 1300px; background: radial-gradient(circle, rgba(232,115,58,1) 0%, rgba(232,115,58,.45) 45%, transparent 70%); }}
.bB {{ right: -500px; top: -300px; width: 1500px; height: 1400px; background: radial-gradient(circle, rgba(200,160,100,.7) 0%, rgba(200,160,100,.22) 45%, transparent 70%); }}
.bC {{ left: 500px; bottom: -900px; width: 1700px; height: 1300px; background: radial-gradient(circle, rgba(255,140,80,.85) 0%, rgba(232,115,58,.32) 45%, transparent 70%); }}
.bD {{ left: 200px; top: 300px; width: 1100px; height: 800px; background: radial-gradient(ellipse, rgba(13,13,13,.75) 0%, rgba(13,13,13,.3) 50%, transparent 72%); }}
.vig {{ position: absolute; inset: 0; z-index: 1; background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.28) 100%); pointer-events: none; }}

/* Card scura centrale */
.card {{ position: absolute; left: {CARD_X}px; top: {CARD_Y}px; width: 1600px; height: 860px; z-index: 2; border-radius: 36px;
         background: var(--card); border: 1px solid rgba(255,255,255,.09); overflow: hidden;
         box-shadow: 0 60px 140px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05); }}
.brand {{ position: absolute; left: 36px; top: 28px; display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 18px; letter-spacing: -.02em; z-index: 5; }}
.brand img {{ width: 26px; height: 26px; }}
.scene {{ position: absolute; inset: 0; }}
.cap {{ position: absolute; left: 0; right: 0; bottom: 42px; text-align: center; font-size: 26px; font-weight: 500; color: #d9d9d4; letter-spacing: -.01em; }}
.cap b {{ color: var(--or); font-weight: 500; }}
.mono {{ font-family: var(--mono); }}
.chip {{ display: inline-flex; align-items: center; gap: 9px; padding: 9px 16px; border: 1px solid rgba(255,255,255,.14); border-radius: 100px; font-family: var(--mono); font-size: 15px; color: #cfcfc9; background: rgba(255,255,255,.03); }}
.chip::before {{ content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--or); }}
.btn {{ display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 22px; border-radius: 10px; font-weight: 600; font-size: 16px; letter-spacing: -.01em; }}
.btn.or {{ background: var(--or); color: #140903; }}
.btn.wh {{ background: #f2f2ef; color: #121212; }}
.btn.gh {{ border: 1px solid rgba(255,255,255,.16); color: #f2f2ef; }}

/* Cursore a mano (line-art bianco con ombra) */
.cursor {{ position: absolute; left: 0; top: 0; z-index: 10; pointer-events: none; }}
.hand {{ display: block; filter: drop-shadow(0 6px 12px rgba(0,0,0,.55)); }}
.hand path {{ fill: #0d0d0d; stroke: #fff; stroke-width: 1.9; stroke-linejoin: round; }}
.clk {{ transform-origin: 14px 4px; }}

/* ── S1 intro */
.s1 {{ display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; text-align: center; }}
.s1 img {{ width: 120px; height: 120px; }}
.s1 h1 {{ font-size: 64px; font-weight: 600; letter-spacing: -.035em; line-height: 1.08; max-width: 1000px; }}

/* ── S2 record: browser mock + pannello Sevenda */
.brw {{ position: absolute; left: 60px; top: 120px; width: 940px; height: 600px; background: #f5f3ef; border-radius: 16px; overflow: hidden; color: #1a1a1a; box-shadow: 0 30px 60px rgba(0,0,0,.4); }}
.brw-bar {{ height: 48px; background: #e9e6e0; display: flex; align-items: center; gap: 10px; padding: 0 18px; }}
.brw-bar i {{ width: 11px; height: 11px; border-radius: 50%; background: #cfcac2; }}
.brw-url {{ margin-left: 10px; flex: 1; height: 28px; background: #fff; border-radius: 7px; font-family: var(--mono); font-size: 13px; color: #6b6660; display: flex; align-items: center; padding: 0 12px; }}
.prod {{ position: absolute; left: 30px; top: 72px; width: 880px; height: 120px; background: #fff; border-radius: 12px; border: 1px solid #e6e2db; }}
.prod .img {{ position: absolute; left: 10px; top: 10px; width: 100px; height: 100px; border-radius: 10px; background: linear-gradient(135deg, #E8733A, #c8a064); }}
.prod .t {{ position: absolute; left: 130px; top: 22px; font-size: 20px; font-weight: 600; letter-spacing: -.02em; }}
.prod .s {{ position: absolute; left: 130px; top: 54px; font-size: 14px; color: #6b6660; }}
.prod .pr {{ position: absolute; left: 130px; top: 82px; font-size: 18px; font-weight: 600; }}
.prod .btn {{ position: absolute; left: 730px; top: 38px; width: 150px; }}
.cart {{ position: absolute; left: 30px; top: 212px; width: 880px; height: 64px; background: #fff; border-radius: 12px; border: 1px solid #e6e2db; display: flex; align-items: center; padding: 0 20px; font-size: 15px; color: #3a3733; gap: 10px; }}
.cart .qty {{ display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: #E8733A; color: #fff; font-size: 12px; font-weight: 600; }}
.cart .btn {{ position: absolute; left: 730px; top: 10px; width: 150px; }}
.form {{ position: absolute; left: 30px; top: 300px; width: 880px; }}
.form label {{ display: block; font-size: 13px; font-weight: 600; color: #3a3733; margin-bottom: 8px; }}
.inp {{ width: 560px; height: 46px; border: 1.5px solid rgba(0,0,0,.14); border-radius: 9px; background: #fff; display: flex; align-items: center; padding: 0 14px; font-size: 15px; color: #1a1a1a; font-family: var(--mono); }}
.inp .typed {{ white-space: nowrap; display: inline-block; }}
.form .pay {{ position: absolute; left: 0; top: 98px; width: 220px; height: 48px; background: #1a1a1a; color: #fff; }}
.toast {{ position: absolute; left: 30px; top: 470px; display: inline-flex; align-items: center; gap: 10px; padding: 12px 18px; background: #1a1a1a; color: #fff; border-radius: 10px; font-size: 14px; font-weight: 500; }}
.toast i {{ width: 18px; height: 18px; border-radius: 50%; background: var(--or); display: inline-flex; align-items: center; justify-content: center; }}
.toast i::after {{ content: ''; width: 5px; height: 9px; border: solid #140903; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px,-1px); }}
.pnl {{ position: absolute; left: 1040px; top: 120px; width: 500px; height: 600px; background: #0f0f0f; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; overflow: hidden; }}
.pnl-hd {{ height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.08); background: #141414; font-family: var(--mono); font-size: 13px; color: var(--muted); }}
.pnl-hd img {{ width: 18px; height: 18px; }}
.pnl-hd .nm {{ font-family: var(--sans); font-weight: 600; font-size: 14px; color: var(--text); }}
.rec {{ margin-left: auto; width: 10px; height: 10px; border-radius: 50%; background: #e05050; }}
.rec-l {{ color: #e05050; letter-spacing: .08em; }}
.rows {{ padding: 12px 0; }}
.row {{ display: grid; grid-template-columns: 78px 46px 1fr; gap: 10px; align-items: center; padding: 9px 16px; font-family: var(--mono); font-size: 13px; }}
.row .ts {{ color: var(--dim); }}
.row .msg {{ color: #b9b9b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.bd {{ font-size: 10.5px; font-weight: 600; text-align: center; padding: 3px 4px; border-radius: 4px; letter-spacing: .04em; }}
.bn {{ background: rgba(122,175,212,.16); color: #9cc3e2; }} .bu {{ background: rgba(232,115,58,.18); color: var(--or); }} .bnt {{ background: rgba(200,160,100,.18); color: var(--amber); }}
.pnl-ft {{ position: absolute; left: 0; right: 0; bottom: 0; height: 44px; border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; gap: 6px; padding: 0 12px; font-family: var(--mono); font-size: 12px; color: var(--dim); }}
.pnl-ft span {{ padding: 5px 10px; border-radius: 6px; }} .pnl-ft .on {{ background: rgba(255,255,255,.07); color: var(--muted); }}

/* ── S3 BPMN */
.bpmn {{ position: absolute; left: 0; top: 0; width: 1600px; height: 860px; }}
.pool {{ fill: rgba(255,255,255,.025); stroke: rgba(255,255,255,.14); stroke-width: 1.5; }}
.poolL {{ fill: rgba(255,255,255,.05); stroke: rgba(255,255,255,.14); stroke-width: 1.5; }}
.poolT {{ font-family: var(--mono); font-size: 13px; letter-spacing: .14em; fill: var(--muted); text-anchor: middle; }}
.task {{ fill: #191919; stroke: rgba(255,255,255,.7); stroke-width: 1.8; }}
.tl {{ font-size: 15px; font-weight: 500; fill: var(--text); text-anchor: middle; }}
.ti {{ fill: none; stroke: rgba(255,255,255,.55); stroke-width: 1.3; }}
.evt {{ fill: #191919; stroke: rgba(255,255,255,.85); stroke-width: 2; }} .evt.end {{ stroke-width: 5; }}
.gw {{ fill: #191919; stroke: var(--or); stroke-width: 2.2; }}
.gwx {{ stroke: var(--or); stroke-width: 2.2; stroke-linecap: round; }}
.e {{ fill: none; stroke: rgba(255,255,255,.62); stroke-width: 1.8; }}
.mf {{ fill: none; stroke: var(--or); stroke-width: 1.8; stroke-dasharray: 7 6; }}
.mfo {{ fill: #191919; stroke: var(--or); stroke-width: 1.8; }}
.lbl {{ font-family: var(--mono); font-size: 12px; fill: var(--muted); }}
.s3tag {{ position: absolute; right: 60px; top: 30px; }}

/* ── S4 insights */
.s4hdr {{ position: absolute; left: 60px; top: 112px; display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 600; letter-spacing: -.02em; }}
.pill {{ font-family: var(--mono); font-size: 12px; letter-spacing: .08em; padding: 5px 10px; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; color: var(--muted); }}
.ic {{ position: absolute; width: 720px; height: 270px; background: #171717; border: 1px solid rgba(255,255,255,.09); border-radius: 18px; padding: 26px 30px; }}
.ic .k {{ font-family: var(--mono); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }}
.ic .v {{ font-size: 64px; font-weight: 600; letter-spacing: -.04em; color: var(--or); line-height: 1; margin-top: 12px; }}
.ic .v small {{ font-size: 22px; color: var(--muted); font-weight: 500; margin-left: 10px; letter-spacing: 0; }}
.ic .d {{ font-size: 15px; color: var(--muted); margin-top: 12px; }}
.bars {{ position: absolute; right: 30px; bottom: 26px; display: flex; align-items: flex-end; gap: 16px; height: 150px; }}
.bar {{ width: 42px; background: linear-gradient(to top, rgba(232,115,58,.35), var(--or)); border-radius: 6px 6px 2px 2px; transform-origin: bottom; }}
.bar.dimm {{ background: rgba(255,255,255,.14); }}
.barl {{ position: absolute; right: 30px; bottom: 6px; display: flex; gap: 16px; font-family: var(--mono); font-size: 10px; color: var(--dim); }}
.barl span {{ width: 42px; text-align: center; }}
.spark {{ position: absolute; right: 30px; bottom: 30px; width: 340px; height: 150px; }}
.spark path {{ fill: none; stroke: var(--or); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 720; }}
.spark .area {{ fill: rgba(232,115,58,.12); stroke: none; }}
.wk {{ position: absolute; right: 30px; bottom: 30px; display: flex; align-items: flex-end; gap: 10px; height: 120px; }}
.wk i {{ width: 26px; background: rgba(255,255,255,.18); border-radius: 4px; transform-origin: bottom; }}
.wk i.hot {{ background: var(--or); }}
.tagrow {{ display: flex; align-items: center; gap: 12px; margin-top: 14px; font-family: var(--mono); font-size: 15px; color: #d9d9d4; }}
.tagrow i {{ width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--or); display: inline-flex; align-items: center; justify-content: center; }}
.tagrow i::after {{ content: ''; width: 5px; height: 9px; border: solid var(--or); border-width: 0 1.8px 1.8px 0; transform: rotate(45deg) translate(-1px,-1px); }}
.tagrow em {{ font-style: normal; color: var(--dim); margin-left: auto; }}
.pushchip {{ position: absolute; right: 30px; top: 24px; }}

/* ── S5 GTM push */
.s5l {{ position: absolute; left: 80px; top: 130px; font-size: 24px; font-weight: 600; letter-spacing: -.02em; }}
.s5l small {{ display: block; font-family: var(--mono); font-size: 12px; color: var(--muted); letter-spacing: .1em; margin-top: 6px; }}
.tagw {{ position: absolute; left: 80px; width: 520px; height: 76px; z-index: 3; }}
.tagc {{ position: relative; width: 100%; height: 100%; background: #1a1a1a; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; display: flex; align-items: center; gap: 14px; padding: 0 18px; box-shadow: 0 20px 40px rgba(0,0,0,.35); z-index: 3; }}
.tagc .ic2 {{ width: 38px; height: 38px; border-radius: 10px; background: rgba(232,115,58,.16); display: flex; align-items: center; justify-content: center; }}
.tagc .ic2::before {{ content: ''; width: 14px; height: 14px; border: 2px solid var(--or); border-radius: 3px 3px 3px 10px; transform: rotate(-45deg); }}
.tagc .n {{ font-family: var(--mono); font-size: 16px; color: var(--text); }}
.tagc .n small {{ display: block; font-size: 12px; color: var(--muted); margin-top: 3px; }}
.gtm {{ position: absolute; left: 900px; top: 150px; width: 600px; height: 500px; background: #171717; border: 1px solid rgba(255,255,255,.1); border-radius: 22px; padding: 26px 40px; }}
.gtm .hd {{ font-size: 22px; font-weight: 600; letter-spacing: -.02em; }}
.gtm .id {{ font-family: var(--mono); font-size: 12px; color: var(--muted); letter-spacing: .08em; margin-top: 6px; }}
.slot {{ position: absolute; left: 40px; width: 520px; height: 76px; border: 1.5px dashed rgba(255,255,255,.14); border-radius: 14px; }}
.prog {{ position: absolute; left: 40px; right: 40px; bottom: 96px; height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; }}
.prog i {{ display: block; height: 100%; background: var(--or); transform-origin: left; }}
.ok {{ position: absolute; left: 40px; bottom: 30px; display: flex; align-items: center; gap: 14px; font-size: 18px; font-weight: 500; }}
.ok svg {{ width: 40px; height: 40px; }}
.ok circle {{ fill: none; stroke: var(--or); stroke-width: 2.5; stroke-dasharray: 200; }}
.ok path {{ fill: none; stroke: var(--or); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 60; }}

/* ── S6 DNA narrative */
.dna {{ position: absolute; left: 90px; top: 130px; width: 560px; height: 560px; }}
.dna path {{ fill: none; stroke: var(--or); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1800; }}
.dna .core {{ position: absolute; left: 240px; top: 240px; width: 80px; height: 80px; }}
.s6lbl {{ position: absolute; left: 720px; top: 150px; font-family: var(--mono); font-size: 13px; letter-spacing: .14em; color: var(--muted); }}
.nar {{ position: absolute; left: 720px; top: 200px; width: 800px; }}
.line {{ font-size: 30px; font-weight: 500; line-height: 1.35; color: var(--text); letter-spacing: -.015em; margin-bottom: 26px; }}
.line b {{ color: var(--or); font-weight: 500; }}
.sharechip {{ position: absolute; left: 720px; top: 612px; }}

/* ── S7 team */
.s7hdr {{ position: absolute; left: 80px; top: 122px; font-size: 28px; font-weight: 600; letter-spacing: -.02em; }}
.s7hdr small {{ display: block; font-family: var(--mono); font-size: 12px; color: var(--muted); letter-spacing: .1em; margin-top: 6px; }}
.avs {{ position: absolute; left: 1120px; top: 124px; display: flex; }}
.av {{ width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--card); margin-left: -10px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; background: #2a2a2a; color: #e8e8e6; }}
.av.o {{ background: var(--or); color: #140903; }} .av.m {{ background: var(--amber); color: #140903; }} .av.new {{ background: rgba(232,115,58,.18); color: var(--or); border-color: var(--or); }}
.inv {{ position: absolute; left: 1320px; top: 122px; width: 180px; height: 48px; }}
.lib {{ position: absolute; left: 80px; width: 1440px; height: 84px; background: #171717; border: 1px solid rgba(255,255,255,.09); border-radius: 16px; display: flex; align-items: center; gap: 18px; padding: 0 24px; }}
.lib .ico {{ width: 40px; height: 40px; border-radius: 10px; background: rgba(232,115,58,.14); display: flex; align-items: center; justify-content: center; }}
.lib .ico::before {{ content: ''; width: 16px; height: 16px; border: 2px solid var(--or); border-radius: 4px; }}
.lib .n {{ font-size: 19px; font-weight: 600; letter-spacing: -.02em; }}
.lib .n small {{ display: block; font-family: var(--mono); font-size: 12px; color: var(--muted); margin-top: 4px; font-weight: 400; }}
.lib .who {{ margin-left: auto; display: flex; }}
.lib .who .av {{ width: 30px; height: 30px; font-size: 10px; border-color: #171717; }}
.toast2 {{ position: absolute; right: 80px; bottom: 100px; display: inline-flex; align-items: center; gap: 10px; padding: 12px 18px; background: #1f1f1f; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; font-size: 14px; }}
.toast2 i {{ width: 8px; height: 8px; border-radius: 50%; background: var(--or); }}

/* ── S8 outro (sul gradiente) */
.outro {{ position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }}
.outro img {{ width: 150px; height: 150px; }}
.outro .word {{ font-size: 140px; font-weight: 600; letter-spacing: -.045em; line-height: 1; color: #fff; }}
.outro .url {{ font-family: var(--mono); font-size: 26px; letter-spacing: .14em; color: #ffd9c2; }}
''')
h('\n'.join(KF))   # segnaposto: sostituito in fondo (i keyframe sono già tutti definiti sopra)
h('</style>\n</head>\n<body>\n<div class="stage">')

# sfondo
h('<div class="bg"><div class="blob bA a" style="animation-name:bgA"></div><div class="blob bB a" style="animation-name:bgB"></div>'
  '<div class="blob bC a" style="animation-name:bgC"></div><div class="blob bD a" style="animation-name:bgD"></div></div><div class="vig"></div>')

# card
h('<div class="card a" style="animation-name:card">')
h('<div class="brand"><img src="logo.svg" alt="">Sevenda</div>')

# S1
h('<div class="scene s1 a" style="animation-name:s1">'
  '<img src="logo.svg" alt="" class="a" style="animation-name:s1logo">'
  '<h1 class="a" style="animation-name:s1h">Turn any browser session<br>into a clear process.</h1>'
  '<span class="chip a" style="animation-name:s1chip">Powered by Claude · BYOK</span></div>')

# S2
rows_html = ''.join(
    f'<div class="row a" style="animation-name:row{i}"><span class="ts">{ts}</span><span class="bd {cls}">{k}</span><span class="msg">{m}</span></div>'
    for i, ((t, cls, k, m), ts) in enumerate(zip(rows2, ['00:00.12', '00:01.04', '00:01.31', '00:02.36', '00:02.60', '00:03.45', '00:04.88', '00:05.12', '00:05.62'])))
h(f'''<div class="scene a" style="animation-name:s2">
  <div class="brw">
    <div class="brw-bar"><i></i><i></i><i></i><div class="brw-url">shop.example.com/cart</div></div>
    <div class="prod"><div class="img"></div><div class="t">Trail Runner X</div><div class="s">Lightweight · size 42 · in stock</div><div class="pr">€129</div>
      <span class="btn or a" style="animation-name:btnAdd">Add to cart</span></div>
    <div class="cart">Cart <span class="qty a" style="animation-name:cartQty">1</span> item · €129 <span class="btn wh a" style="animation-name:btnCo">Checkout</span></div>
    <div class="form"><label>Email</label><div class="inp a" style="animation-name:inputFocus"><span class="typed a" style="animation-name:typed">anna@example.com</span></div>
      <span class="btn pay a" style="animation-name:btnPay">Pay €129</span></div>
    <div class="toast a" style="animation-name:toast"><i></i>Order confirmed · #A1042</div>
  </div>
  <div class="pnl">
    <div class="pnl-hd"><img src="logo.svg" alt=""><span class="nm">Sevenda</span><span>checkout-flow</span><span class="rec a" style="animation-name:rec"></span><span class="rec-l">REC</span></div>
    <div class="rows">{rows_html}</div>
    <div class="pnl-ft"><span class="on">Events</span><span>BPMN</span><span>Insights</span><span>Narrative</span></div>
  </div>
  <div class="cap a" style="animation-name:s2cap">Record a <b>real</b> user session.</div>
</div>''')

# S3 BPMN
svg = []
svg.append('<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,.75)"/></marker>'
           '<marker id="arrO" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="none" stroke="#E8733A" stroke-width="1.2"/></marker></defs>')
# pool
for name, y, label in [('poolU', 125, 'USER'), ('poolS', 425, 'SYSTEM')]:
    svg.append(f'<g class="a" style="animation-name:{name};transform-origin:800px {y + 135}px"><rect class="pool" x="100" y="{y}" width="1400" height="270" rx="14"/>'
               f'<rect class="poolL" x="100" y="{y}" width="44" height="270" rx="14"/><text class="poolT" transform="translate(122,{y + 135}) rotate(-90)">{label}</text></g>')
# user pool
svg.append(evt('uStart', 185, 260))
svg.append(edge('uE1', 'M203,260 H250', 60))
svg.append(task('uT1', 250, 228, 'Browse products'))
svg.append(edge('uE2', 'M430,260 H490', 70))
svg.append(task('uT2', 490, 228, 'Add to cart'))
svg.append(edge('uE3', 'M670,260 H730', 70))
svg.append(task('uT3', 730, 228, 'Checkout'))
svg.append(edge('uE4', 'M910,260 H970', 70))
svg.append(task('uT4', 970, 228, 'Pay'))
svg.append(edge('uE5', 'M1150,260 H1230', 90))
svg.append(evt('uEnd', 1250, 260, end=True))
# system pool
svg.append(task('sT1', 490, 498, 'Validate cart', 'service'))
svg.append(edge('sE1', 'M670,530 H740', 80))
svg.append(f'<g class="a" style="animation-name:sGw;transform-origin:770px 530px"><polygon class="gw" points="770,502 798,530 770,558 742,530"/>'
           f'<path class="gwx" d="M761,521 L779,539 M779,521 L761,539"/></g>')
svg.append(edge('sEyes', 'M798,530 H860', 70))
svg.append(f'<text class="lbl a" style="animation-name:lblYes" x="812" y="520">yes</text>')
svg.append(edge('sEno', 'M770,558 V650 H860', 190))
svg.append(f'<text class="lbl a" style="animation-name:lblNo" x="780" y="612">no</text>')
svg.append(task('sT2', 860, 498, 'Reserve items', 'service'))
svg.append(task('sT3', 860, 618, 'Notify out of stock', 'service'))
svg.append(edge('sE2', 'M1040,530 H1100', 70))
svg.append(task('sT4', 1100, 498, 'Process payment', 'service'))
svg.append(edge('sE3', 'M1280,530 H1350', 80))
svg.append(evt('sEnd', 1370, 530, end=True))
svg.append(edge('sE4', 'M1040,650 H1100', 70))
svg.append(evt('sEnd2', 1120, 650, end=True))
# message flows: la linea tratteggiata è rivelata da una <mask> il cui path
# solido si disegna progressivamente (stroke-dashoffset); cerchio vuoto
# all'origine e freccia vuota alla destinazione appaiono in dissolvenza.
for n, d, L, (ox, oy), (ax, ay, rot) in [
        ('mf1', 'M580,292 V498', 210, (580, 292), (580, 490, 90)),
        ('mf2', 'M950,498 V410 H820 V292', 340, (950, 498), (820, 300, -90)),
        ('mf3', 'M1060,292 V410 H1190 V498', 340, (1060, 292), (1190, 490, 90))]:
    svg.append(f'<mask id="{n}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="860">'
               f'<path class="a" style="animation-name:{n};stroke-dasharray:{L}" d="{d}" fill="none" stroke="#fff" stroke-width="8"/></mask>'
               f'<path class="mf" mask="url(#{n}m)" d="{d}"/>'
               f'<circle class="mfo a" style="animation-name:{n}d" cx="{ox}" cy="{oy}" r="5"/>'
               f'<path class="a" style="animation-name:{n}a" d="M-7,-6 L1,0 L-7,6" fill="none" stroke="#E8733A" stroke-width="1.8" transform="translate({ax},{ay}) rotate({rot})"/>')
h(f'''<div class="scene a" style="animation-name:s3">
  <svg class="bpmn" viewBox="0 0 1600 860">{''.join(svg)}</svg>
  <span class="chip s3tag a" style="animation-name:s3tag">checkout-flow.bpmn · 2 pools · 3 message flows</span>
  <div class="cap a" style="animation-name:s3cap">AI-generated <b>BPMN 2.0</b> — with isolated pools &amp; message flows.</div>
</div>''')

# S4 insights
bars = ''.join(f'<i class="bar{" dimm" if k < 4 else ""} a" style="animation-name:bar{k};height:{hgt}%"></i>' for k, hgt in enumerate([100, 78, 62, 45, 38]))
wk = ''.join(f'<i class="{"hot" if k == 6 else ""} a" style="animation-name:wk{k};height:{hh}%"></i>' for k, hh in enumerate([40, 55, 48, 70, 62, 84, 100]))
h(f'''<div class="scene a" style="animation-name:s4">
  <div class="s4hdr a" style="animation-name:s4hdr">Insights <span class="pill">GA4</span><span class="pill">GTM</span></div>
  <div class="ic a" style="animation-name:ic0;left:60px;top:180px"><div class="k">Checkout drop-off</div><div class="v a" style="animation-name:num0">38%</div><div class="d">of sessions leave at the payment step</div>
    <div class="bars">{bars}</div><div class="barl"><span>cart</span><span>checkout</span><span>email</span><span>pay</span><span>done</span></div></div>
  <div class="ic a" style="animation-name:ic1;left:820px;top:180px"><div class="k">Add-to-cart rate</div><div class="v a" style="animation-name:num1">12.4%<small>+2.1% vs last week</small></div><div class="d">product page → cart</div>
    <svg class="spark" viewBox="0 0 340 150"><path class="area" d="M0,120 L48,104 L96,112 L144,80 L192,86 L240,58 L288,46 L340,22 L340,150 L0,150 Z"/>
      <path class="a" style="animation-name:spark" d="M0,120 L48,104 L96,112 L144,80 L192,86 L240,58 L288,46 L340,22"/>
      <circle class="a" style="animation-name:sparkDot" cx="340" cy="22" r="6" fill="#E8733A"/></svg></div>
  <div class="ic a" style="animation-name:ic2;left:60px;top:480px"><div class="k">Sessions recorded</div><div class="v a" style="animation-name:num2">1,284</div><div class="d">avg. 4m 12s from first click to purchase</div>
    <div class="wk">{wk}</div></div>
  <div class="ic a" style="animation-name:ic3;left:820px;top:480px"><div class="k">Suggested GTM tags</div><div class="v a" style="animation-name:num3">3<small>ready to push</small></div>
    <div class="tagrow a" style="animation-name:tagrow0"><i></i>add_to_cart<em>GA4 event</em></div>
    <div class="tagrow a" style="animation-name:tagrow1"><i></i>begin_checkout<em>GA4 event</em></div>
    <div class="tagrow a" style="animation-name:tagrow2"><i></i>purchase<em>GA4 event</em></div>
    <span class="chip pushchip a" style="animation-name:pushchip">Push to GTM →</span></div>
  <div class="cap a" style="animation-name:s4cap">Instant <b>GA4 &amp; GTM</b> analytics insights.</div>
</div>''')

# S5 GTM push
tags5 = [('add_to_cart', 'GA4 event · trigger: click #add-to-cart'), ('begin_checkout', 'GA4 event · trigger: click #checkout'), ('purchase', 'GA4 event · trigger: page /order/complete')]
tagc = ''.join(f'<div class="tagw a" style="animation-name:tagc{i};top:{200 + i * 100}px"><div class="tagc a" style="animation-name:fly{i}">'
               f'<div class="ic2"></div><div class="n">{n}<small>{sub}</small></div></div></div>' for i, (n, sub) in enumerate(tags5))
slots = ''.join(f'<div class="slot a" style="animation-name:slot{i};top:{90 + i * 100}px"></div>' for i in range(3))
h(f'''<div class="scene a" style="animation-name:s5">
  <div class="s5l a" style="animation-name:s5l">Suggested tags<small>FROM THIS SESSION · 3</small></div>
  {tagc}
  <div class="gtm a" style="animation-name:s5box"><div class="hd">GTM container</div><div class="id">GTM-K7Q2X · workspace: sevenda-checkout</div>{slots}
    <div class="prog"><i class="a" style="animation-name:progress"></i></div>
    <div class="ok"><svg viewBox="0 0 40 40"><circle class="a" style="animation-name:okCircle" cx="20" cy="20" r="17"/><path class="a" style="animation-name:okTick" d="M12,21 L18,27 L29,14"/></svg><span class="a" style="animation-name:okText">3 tags pushed to your workspace</span></div>
  </div>
  <div class="cap a" style="animation-name:s5cap">Push tags <b>live</b> to your GTM container.</div>
</div>''')

# S6 DNA narrative: motivo "fingerprint" = archi concentrici
import math
arcs = []
for i in range(7):
    r = 60 + i * 34
    a0 = math.radians(120 + i * 9); a1 = math.radians(120 + i * 9 + 300)
    x0, y0 = 280 + r * math.cos(a0), 280 + r * math.sin(a0)
    x1, y1 = 280 + r * math.cos(a1), 280 + r * math.sin(a1)
    arcs.append(f'<path class="a" style="animation-name:arc{i};opacity:{1 - i * .09:.2f}" d="M{x0:.1f},{y0:.1f} A{r},{r} 0 1 1 {x1:.1f},{y1:.1f}"/>')
lines6 = ['The user browses the catalogue and adds <b>Trail Runner X</b> to the cart.',
          'The system validates stock and <b>reserves the items</b> before checkout.',
          'Payment is processed and the order is confirmed in <b>4.2 s</b>.',
          'One retry on <b>/api/payments/confirm</b> (503) — worth a look.']
nar = ''.join(f'<div class="line a" style="animation-name:line{i}">{txt}</div>' for i, txt in enumerate(lines6))
h(f'''<div class="scene a" style="animation-name:s6">
  <div class="dna"><svg viewBox="0 0 560 560" width="560" height="560">{''.join(arcs)}</svg><img class="core a" style="animation-name:dnaCore" src="logo.svg" alt=""></div>
  <div class="s6lbl a" style="animation-name:s6lbl">DNA NARRATIVE · CHECKOUT-FLOW</div>
  <div class="nar">{nar}</div>
  <span class="chip sharechip a" style="animation-name:sharechip">Share narrative →</span>
  <div class="cap a" style="animation-name:s6cap">Turn flows into a <b>shareable narrative</b>.</div>
</div>''')

# S7 team
libs = [('Checkout flow', 'BPMN · Insights · Narrative · updated 2 days ago', ['AR', 'MK']),
        ('Onboarding', 'BPMN · Narrative · updated 5 days ago', ['LP', 'AR', 'MK']),
        ('Refund request', 'BPMN · Insights · updated last week', ['MK'])]
def who_html(who):
    return ''.join(f'<span class="av {c}">{a}</span>' for a, c in zip(who, ['o', 'm', '']))
lib_html = ''.join(f'<div class="lib a" style="animation-name:lib{i};top:{210 + i * 100}px"><div class="ico"></div><div class="n">{n}<small>{m}</small></div>'
                   f'<div class="who">{who_html(who)}</div></div>' for i, (n, m, who) in enumerate(libs))
h(f'''<div class="scene a" style="animation-name:s7">
  <div class="s7hdr a" style="animation-name:s7hdr">Shared library<small>TEAM · ACME DIGITAL · 3 PROCESSES</small></div>
  <div class="avs"><span class="av o a" style="animation-name:av0">AR</span><span class="av m a" style="animation-name:av1">MK</span><span class="av a" style="animation-name:av2">LP</span><span class="av new a" style="animation-name:avNew">+1</span></div>
  <span class="btn gh inv a" style="animation-name:btnInv">Invite</span>
  {lib_html}
  <div class="toast2 a" style="animation-name:toast2"><i></i>Invitation sent to dario@acme.digital</div>
  <div class="cap a" style="animation-name:s7cap">Share with your <b>team</b>.</div>
</div>''')

h('</div>')   # /card

# cursore (stage-level): due tracce, una per scena 2 e una per scena 7
h(f'<div class="cursor a" style="animation-name:cur2"><div class="clk a" style="animation-name:clk2">{hand_svg()}</div></div>')
h(f'<div class="cursor a" style="animation-name:cur7"><div class="clk a" style="animation-name:clk7">{hand_svg()}</div></div>')

# outro
h('<div class="outro a" style="animation-name:s8"><img src="logo.svg" alt="" class="a" style="animation-name:s8logo">'
  '<div class="word a" style="animation-name:s8word">Sevenda</div><div class="url a" style="animation-name:s8url">sevenda.dev</div></div>')

h('</div>')   # /stage

h(f'''<script>
  // Seek deterministico: porta ogni animazione (tutte pausate, stessa durata) al tempo t
  window.__seek = function (tMs) {{
    document.getAnimations().forEach(a => {{ a.currentTime = tMs; }});
  }};
  window.__ready = false;
  document.fonts.ready.then(() => {{
    window.__seek(0);
    // primo paint dopo il caricamento dei font
    requestAnimationFrame(() => requestAnimationFrame(() => {{ window.__ready = true; }}));
  }});
</script>
</body>
</html>''')

# ── scrittura: i keyframe vanno inseriti nello <style> (sono definiti tutti prima dell'HTML) ──
out = '\n'.join(HTML)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
print('written', OUT, len(out), 'bytes,', len(KF), 'keyframes')
