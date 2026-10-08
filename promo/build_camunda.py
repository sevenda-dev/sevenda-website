#!/usr/bin/env python3
"""Generatore di promo-camunda.html (e promo-camunda-it.html con --it).

Video LinkedIn di 10 s, 1080×1350 (4:5), sull'integrazione Sevenda × Camunda.
Stessa resa della card animata della pagina Connect (parole "kinetic type" che
entrano da scale 1.28 + blur, card con barra superiore) su sfondo nero pieno e su una
timeline CSS unica e deterministica come promo.html: ogni elemento ha durata
10000 ms, linear, fill both, paused; l'easing è dentro i keyframe e
window.__seek(t) porta tutte le animazioni al tempo t.

Uso:  python3 build_camunda.py        → promo-camunda.html
      python3 build_camunda.py --it   → promo-camunda-it.html
"""
import sys
from pathlib import Path

DUR = 10.0                                   # secondi
W, H = 1080, 1350
IT = '--it' in sys.argv
EXPO = 'cubic-bezier(.16,1,.3,1)'            # stesso easing di fvIn sulla pagina Connect
OUTE = 'cubic-bezier(.4,0,.2,1)'

# Testi on-screen (EN → IT)
IT_MAP = {
    'Every click': 'Ogni click',
    'AI-generated BPMN 2.0': 'BPMN 2.0 generato dall’AI',
    'from a recorded session': 'da una sessione registrata',
    'Add to cart': 'Aggiungi al carrello',
    'Check stock': 'Verifica stock',
    'In stock?': 'Disponibile?',
    'yes': 'sì',
    'no': 'no',
    'Pay': 'Paga',
    'Notify customer': 'Avvisa il cliente',
    'Camunda-ready.': 'Pronto per Camunda.',
    'In one click.': 'In un click.',
    'Export to Camunda': 'Esporta su Camunda',
    'Opens in Camunda Modeler': 'Si apre in Camunda Modeler',
    'Camunda namespace + isExecutable': 'Namespace Camunda + isExecutable',
    'Ready to deploy, zero rework': 'Pronto per il deploy, zero rework',
    'From recorded session': 'Dalla sessione registrata',
    'to Camunda-ready BPMN.': 'al BPMN pronto per Camunda.',
    'Modeler · Platform': 'Modeler · Platform',
}
LANG = 'it' if IT else 'en'


def T(s):
    if not IT:
        return s
    assert s in IT_MAP, f'traduzione mancante: {s!r}'
    return IT_MAP[s]


# ── Keyframe helpers ─────────────────────────────────────────────────────────
KF = []          # blocchi @keyframes generati
_n = [0]


def pct(t):
    return f'{t / DUR * 100:.4f}'.rstrip('0').rstrip('.')


def kf(pts):
    """pts: [(t, css, easing_del_segmento_che_parte_da_qui | None)] → nome animazione."""
    _n[0] += 1
    name = f'k{_n[0]}'
    pts = sorted(pts, key=lambda p: p[0])
    if pts[0][0] > 0:
        pts.insert(0, (0, pts[0][1], None))
    if pts[-1][0] < DUR:
        pts.append((DUR, pts[-1][1], None))
    rows = []
    for t, css, ease in pts:
        e = f' animation-timing-function: {ease};' if ease else ''
        rows.append(f'  {pct(t)}% {{ {css};{e} }}')
    KF.append(f'@keyframes {name} {{\n' + '\n'.join(rows) + '\n}')
    return name


def life(t_in, t_out, a, b, c, din=.6, dout=.35, ein=EXPO, eout=OUTE):
    """Entrata a→b in din secondi, uscita b→c in dout secondi (t_out=None: resta)."""
    pts = [(t_in, a, ein), (t_in + din, b, None)]
    if t_out is not None:
        pts += [(t_out, b, eout), (t_out + dout, c, None)]
    return kf(pts)


def A(name):
    return f'style="animation-name:{name}"'


# Preset di entrata/uscita
WORD = ('opacity:0; transform:scale(1.28); filter:blur(12px)',
        'opacity:1; transform:scale(1); filter:blur(0px)',
        'opacity:0; transform:scale(.92); filter:blur(8px)')
RISE = ('opacity:0; transform:translateY(28px) scale(.96)',
        'opacity:1; transform:translateY(0px) scale(1)',
        'opacity:0; transform:translateY(-14px) scale(.98)')
POP = ('opacity:0; transform:scale(.6)', 'opacity:1; transform:scale(1)', 'opacity:1; transform:scale(1)')
FADE = ('opacity:0', 'opacity:1', 'opacity:0')


def word(t_in, t_out):
    return A(life(t_in, t_out, *WORD))


def rise(t_in, t_out=None, din=.6):
    return A(life(t_in, t_out, *RISE, din=din))


def pop(t_in, din=.45):
    return A(life(t_in, None, *POP, din=din, ein='cubic-bezier(.34,1.56,.64,1)'))


def draw(t0, t1):
    """Tratto SVG con pathLength=1: stroke-dashoffset 1 → 0."""
    return A(kf([(t0, 'stroke-dashoffset:1; opacity:1', 'cubic-bezier(.45,0,.25,1)'),
                 (t1, 'stroke-dashoffset:0; opacity:1', None)] +
                ([(0, 'stroke-dashoffset:1; opacity:0', None), (t0 - .001, 'stroke-dashoffset:1; opacity:0', None)]
                 if t0 > 0 else [])))


def reveal(t0, t1):
    """Rivelazione da sinistra a destra (riga di codice "digitata", senza steps())."""
    return A(kf([(t0, 'clip-path:inset(0 100% 0 0)', 'cubic-bezier(.3,0,.3,1)'),
                 (t1, 'clip-path:inset(0 0% 0 0)', None)]))


# ── Timeline (secondi) ───────────────────────────────────────────────────────
W1 = (0.10, 1.10)       # "Every click"
W2 = (1.20, 2.20)       # logo + Sevenda
SA = (2.30, 5.35)       # BPMN 2.0 generato
SB = (5.45, 8.05)       # export verso Camunda
SO = 8.15               # outro (resta fino a 10 s)

# ── Diagramma BPMN (coordinate nel viewBox 0 0 920 400) ─────────────────────
def task(x, y, w, label, t, service=False):
    icon = ''
    if service:   # ingranaggio stilizzato dei serviceTask
        icon = (f'<g transform="translate({x + 16},{y + 16})" fill="none" stroke="#E8733A" stroke-width="1.6">'
                f'<circle r="6"/><circle r="2.2"/>'
                + ''.join(f'<line x1="0" y1="-6" x2="0" y2="-9" transform="rotate({a})"/>' for a in range(0, 360, 45))
                + '</g>')
    else:         # omino dei userTask
        icon = (f'<g transform="translate({x + 16},{y + 14})" fill="none" stroke="#E8733A" stroke-width="1.6">'
                f'<circle cx="0" cy="-1" r="3.6"/><path d="M-6.5 9 a6.5 6 0 0 1 13 0"/></g>')
    return (f'<g {pop(t)} class="node"><rect x="{x}" y="{y}" width="{w}" height="78" rx="12" class="tk"/>{icon}'
            f'<text x="{x + w / 2}" y="{y + 46}" class="tl">{label}</text></g>')


def edge(d, t0, t1, head):
    hx, hy, rot = head
    return (f'<path d="{d}" pathLength="1" class="ed" {draw(t0, t1)}/>'
            f'<g transform="translate({hx},{hy}) rotate({rot})"><path d="M0 0 L-11 -6 L-11 6 Z" class="ah" {pop(t1 - .02, .2)}/></g>')


def bpmn():
    t = SA[0] + .45
    s = []
    # start event
    s.append(f'<g {pop(t)} class="node"><circle cx="46" cy="130" r="22" class="ev"/></g>')
    s.append(edge('M68 130 H108', t + .15, t + .32, (108, 130, 0)))
    s.append(task(110, 91, 170, T('Add to cart'), t + .3))
    s.append(edge('M280 130 H328', t + .48, t + .65, (328, 130, 0)))
    s.append(task(330, 91, 160, T('Check stock'), t + .62, service=True))
    s.append(edge('M490 130 H538', t + .8, t + .95, (538, 130, 0)))
    # gateway esclusivo
    s.append(f'<g {pop(t + .93)} class="node"><path d="M578 92 L616 130 L578 168 L540 130 Z" class="gw"/>'
             f'<path d="M567 119 L589 141 M589 119 L567 141" class="gx"/>'
             f'<text x="578" y="76" class="gl">{T("In stock?")}</text></g>')
    # ramo sì
    s.append(edge('M616 130 H662', t + 1.1, t + 1.25, (662, 130, 0)))
    s.append(f'<text x="640" y="118" class="bl" {A(life(t + 1.15, None, *FADE, din=.3))}>{T("yes")}</text>')
    s.append(task(664, 91, 130, T('Pay'), t + 1.22))
    s.append(edge('M794 130 H856', t + 1.4, t + 1.5, (856, 130, 0)))
    s.append(f'<g {pop(t + 1.48)} class="node"><circle cx="880" cy="130" r="21" class="ee"/></g>')
    # ramo no
    s.append(edge('M578 168 V250 H662', t + 1.1, t + 1.32, (662, 250, 0)))
    s.append(f'<text x="594" y="214" class="bl" {A(life(t + 1.2, None, *FADE, din=.3))}>{T("no")}</text>')
    s.append(task(664, 211, 170, T('Notify customer'), t + 1.3))
    s.append(edge('M834 250 H856', t + 1.48, t + 1.58, (856, 250, 0)))
    s.append(f'<g {pop(t + 1.56)} class="node"><circle cx="880" cy="250" r="21" class="ee"/></g>')
    return '\n'.join(s)


# ── Scene ────────────────────────────────────────────────────────────────────
LOGO = '<img src="logo.svg" alt="">'
CHECK = ('<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#140903" stroke-width="3" '
         'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>')


def scene_a():
    t0, t1 = SA
    code_t = t0 + 2.05
    return f'''
  <div class="scn" {A(life(t0, t1, *FADE, din=.25))}>
    <div class="hd" {rise(t0 + .05, None)}>
      <div class="h1">{T('AI-generated BPMN 2.0')}</div>
      <div class="h2">{T('from a recorded session')}</div>
    </div>
    <div class="win wa" {rise(t0 + .2, None, .7)}>
      <div class="bar"><i></i><i></i><i></i><span class="mono">checkout.bpmn</span><span class="tag mono">BPMN 2.0</span></div>
      <svg class="dg" viewBox="0 52 920 240">{bpmn()}</svg>
      <div class="code mono">
        <div {reveal(code_t, code_t + .45)}><span class="c1">&lt;bpmn:definitions</span> <b>xmlns:camunda</b>=<span class="c2">"http://camunda.org/schema/1.0/bpmn"</span><span class="c1">&gt;</span></div>
        <div {reveal(code_t + .3, code_t + .7)}>&nbsp;&nbsp;<span class="c1">&lt;bpmn:process</span> id=<span class="c2">"checkout"</span> <b>isExecutable</b>=<span class="c2">"true"</span><span class="c1">&gt;</span></div>
      </div>
    </div>
  </div>'''


def scene_b():
    t0, t1 = SB
    tm = t0 + .55          # click sul bottone
    tf0, tf1 = tm + .25, tm + 1.0   # viaggio del file
    glow = A(kf([(tf1 - .05, 'border-color:rgba(255,255,255,.13); box-shadow:0 30px 70px rgba(0,0,0,.55), 0 0 0 0 rgba(232,115,58,0)', EXPO),
                 (tf1 + .5, 'border-color:rgba(232,115,58,.85); box-shadow:0 30px 70px rgba(0,0,0,.55), 0 0 60px 0 rgba(232,115,58,.35)', None)]))
    press = A(kf([(tm, 'transform:scale(1)', 'ease-out'), (tm + .1, 'transform:scale(.94)', 'ease-out'),
                  (tm + .3, 'transform:scale(1)', None)]))
    file_ = A(kf([(tf0, 'opacity:0; transform:translate(0px,0px) scale(.8)', EXPO),
                  (tf0 + .2, 'opacity:1; transform:translate(20px,0px) scale(1)', 'cubic-bezier(.65,0,.35,1)'),
                  (tf1 - .12, 'opacity:1; transform:translate(285px,0px) scale(1)', 'ease-in'),
                  (tf1, 'opacity:0; transform:translate(305px,0px) scale(.85)', None)]))
    rows = [('Opens in Camunda Modeler', tf1 + .35), ('Camunda namespace + isExecutable', tf1 + .5),
            ('Ready to deploy, zero rework', tf1 + .65)]
    rows_html = '\n'.join(
        f'<div class="row" {rise(t, None, .5)}><span class="ck">{CHECK}</span>{T(s)}</div>' for s, t in rows)
    return f'''
  <div class="scn" {A(life(t0, t1, *FADE, din=.25))}>
    <div class="hd" {rise(t0 + .05, None)}>
      <div class="h1">{T('Camunda-ready.')}</div>
      <div class="h1 dim">{T('In one click.')}</div>
    </div>
    <div class="pair">
      <div class="pc" {rise(t0 + .15, None, .65)}>
        <div class="win pcard"><div class="bar"><i></i><i></i><i></i></div>
          <div class="pbody">{LOGO.replace('<img', '<img class="plogo"')}<div class="pname">Sevenda</div>
            <div class="btn" {press}>{T('Export to Camunda')}</div></div></div>
      </div>
      <div class="track"><div class="dash" {reveal(t0 + .4, t0 + .8)}></div></div>
      <div class="pc" {rise(t0 + .3, None, .65)}>
        <div class="win pcard" {glow}><div class="bar"><i></i><i></i><i></i></div>
          <div class="pbody"><img class="clogo" src="logos/camunda.svg" alt=""><div class="psub">{T('Modeler · Platform')}</div></div>
          <div class="badge" {pop(tf1 + .1)}>{CHECK}</div></div>
      </div>
      <div class="file mono" {file_}><span class="fi"></span>checkout.bpmn</div>
    </div>
    <div class="rows">
{rows_html}
    </div>
  </div>'''


def outro():
    t = SO
    return f'''
  <div class="scn out">
    <div class="ow" {word(t, None)}>{LOGO}Sevenda</div>
    <div class="ox" {rise(t + .3, None)}><span>×</span><img src="logos/camunda.svg" alt=""></div>
    <div class="ot" {rise(t + .55, None)}>{T('From recorded session')}<br>{T('to Camunda-ready BPMN.')}</div>
    <div class="url" {rise(t + .8, None)}>sevenda.dev/connect</div>
  </div>'''


# ── Sfondo: nero pieno (#000), senza luci né griglia ──

body = f'''
<div class="stage">
  <div class="ww" {word(*W1)}>{T('Every click')}</div>
  <div class="ww" {word(*W2)}>{LOGO}Sevenda</div>
  {scene_a()}
  {scene_b()}
  {outro()}
</div>'''

CSS = f'''
@font-face {{ font-family: 'Geist';      src: url('fonts/Geist-Variable.woff2') format('woff2');     font-weight: 100 900; font-display: block; }}
@font-face {{ font-family: 'Geist Mono'; src: url('fonts/GeistMono-Variable.woff2') format('woff2'); font-weight: 100 900; font-display: block; }}
:root {{ --or: #E8733A; --blue: 122,175,212; --text: #f2f2ef; --muted: #8a8a84; --sans: 'Geist', sans-serif; --mono: 'Geist Mono', monospace; }}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased; }}
/* Timeline unica: ogni elemento animato condivide durata, linear, both, paused */
.a, [style*="animation-name"] {{ animation-duration: {int(DUR * 1000)}ms; animation-timing-function: linear; animation-fill-mode: both; animation-play-state: paused; }}
.mono {{ font-family: var(--mono); }}
.stage {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; background: #000; isolation: isolate; }}

/* Parole a tutto schermo (stile .fv-word) */
.ww, .ow {{ position: absolute; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: center; gap: .26em;
  font-size: 128px; font-weight: 800; letter-spacing: -.045em; line-height: 1; color: #fff; }}
.ww {{ top: 0; bottom: 0; }}
.ww img, .ow img {{ width: 1em; height: 1em; }}

/* Scene */
.scn {{ position: absolute; inset: 0; z-index: 3; }}
.hd {{ position: absolute; left: 80px; right: 80px; top: 250px; text-align: center; }}
.h1 {{ font-size: 64px; font-weight: 800; letter-spacing: -.045em; line-height: 1.08; color: #fff; }}
.h1.dim {{ color: var(--or); }}
.h2 {{ margin-top: 14px; font-size: 28px; font-weight: 600; color: var(--muted); letter-spacing: -.02em; }}

/* Finestra (come .fv-card: barra superiore, puntino arancio) */
.win {{ background: #141414; border: 1px solid rgba(255,255,255,.13); border-radius: 18px; overflow: hidden;
  box-shadow: 0 30px 70px rgba(0,0,0,.55); }}
.bar {{ height: 46px; display: flex; align-items: center; gap: 8px; padding: 0 18px; background: rgba(255,255,255,.045); border-bottom: 1px solid rgba(255,255,255,.07); }}
.bar i {{ width: 11px; height: 11px; border-radius: 50%; background: rgba(255,255,255,.14); }}
.bar i:first-child {{ background: rgba(232,115,58,.75); }}
.bar span {{ margin-left: 10px; font-size: 16px; color: #b9b9b3; }}
.bar .tag {{ margin-left: auto; font-size: 13px; color: var(--or); border: 1px solid rgba(232,115,58,.4); border-radius: 6px; padding: 3px 8px; }}

.wa {{ position: absolute; left: 60px; right: 60px; top: 520px; }}
.dg {{ display: block; width: 100%; height: auto; margin: 30px 0 22px; overflow: visible; }}
.node {{ transform-box: fill-box; transform-origin: center; }}
.tk {{ fill: #1b1b1b; stroke: rgba(255,255,255,.55); stroke-width: 1.6; }}
.tl {{ font-family: var(--sans); font-size: 16px; font-weight: 600; letter-spacing: -.025em; fill: #ecece8; text-anchor: middle; }}
.ev {{ fill: #1b1b1b; stroke: #ecece8; stroke-width: 2; }}
.ee {{ fill: #1b1b1b; stroke: #ecece8; stroke-width: 5; }}
.gw {{ fill: #1b1b1b; stroke: #ecece8; stroke-width: 2; }}
.gx {{ stroke: var(--or); stroke-width: 3; stroke-linecap: round; }}
.gl {{ font-family: var(--sans); font-weight: 600; font-size: 16px; fill: #b9b9b3; text-anchor: middle; }}
.bl {{ font-family: var(--sans); font-weight: 600; font-size: 15px; fill: var(--or); text-anchor: middle; }}
.ed {{ fill: none; stroke: rgba(255,255,255,.6); stroke-width: 2; stroke-dasharray: 1; }}
.ah {{ fill: rgba(255,255,255,.75); transform-box: fill-box; transform-origin: center; }}
.code {{ margin: 0 22px 24px; padding: 18px 20px; background: #0e0e0e; border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
  font-size: 17px; line-height: 1.75; color: #9a9a94; white-space: nowrap; }}
.code .c1 {{ color: #7aafd4; }} .code .c2 {{ color: #c8a064; }} .code b {{ color: var(--or); font-weight: 500; }}

/* Scena export: Sevenda → Camunda */
.pair {{ position: absolute; left: 70px; right: 70px; top: 500px; height: 340px; display: flex; align-items: center; }}
.pc {{ width: 380px; flex-shrink: 0; }}
.pcard {{ position: relative; height: 330px; }}
.pbody {{ height: 284px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }}
.plogo {{ width: 84px; height: 84px; }}
.pname {{ font-size: 34px; font-weight: 800; letter-spacing: -.045em; }}
.btn {{ margin-top: 4px; height: 50px; padding: 0 22px; border-radius: 11px; background: var(--or); color: #140903;
  display: inline-flex; align-items: center; font-weight: 600; font-size: 19px; letter-spacing: -.01em; }}
.clogo {{ width: 210px; height: auto; }}
.psub {{ font-size: 18px; font-weight: 600; letter-spacing: -.01em; color: var(--muted); }}
.badge {{ position: absolute; right: 16px; top: 62px; width: 40px; height: 40px; border-radius: 50%; background: var(--or);
  display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(232,115,58,.5); }}
.track {{ flex: 1; height: 2px; position: relative; }}
.dash {{ position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 8px, transparent 8px 16px); }}
.file {{ position: absolute; left: 280px; top: 145px; z-index: 4; height: 50px; padding: 0 18px 0 14px; display: flex; align-items: center; gap: 10px;
  background: #1d1d1d; border: 1px solid rgba(232,115,58,.6); border-radius: 12px; font-size: 18px; color: #f2f2ef;
  box-shadow: 0 14px 34px rgba(0,0,0,.6), 0 0 26px rgba(232,115,58,.25); }}
.fi {{ width: 18px; height: 22px; border-radius: 3px; border: 2px solid var(--or); position: relative; }}
.rows {{ position: absolute; left: 50%; top: 910px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: flex-start; gap: 18px; }}
.row {{ display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 600; letter-spacing: -.025em; color: #ecece8; white-space: nowrap; }}
.ck {{ width: 34px; height: 34px; border-radius: 50%; background: var(--or); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }}
.ck svg {{ width: 18px; height: 18px; }}

/* Outro */
.out {{ display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.ow {{ position: static; }}
.ox {{ margin-top: 34px; display: flex; align-items: center; gap: 26px; }}
.ox span {{ font-size: 54px; font-weight: 300; color: var(--muted); line-height: 1; }}
.ox img {{ width: 250px; height: auto; }}
.ot {{ margin-top: 56px; text-align: center; font-size: 40px; font-weight: 700; letter-spacing: -.035em; line-height: 1.25; color: #d9d9d4; }}
.url {{ margin-top: 48px; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--or); border: 1px solid rgba(232,115,58,.45); border-radius: 100px; padding: 12px 26px; background: rgba(232,115,58,.08); }}
'''

# Il tratteggio della traccia usa draw() su un div: nessun stroke, quindi lo rivelo con clip-path

SCRIPT = '''
<script>
  // Seek deterministico: porta ogni animazione (tutte pausate, stessa durata) al tempo t
  window.__seek = function (tMs) {
    document.getAnimations().forEach(a => { a.currentTime = tMs; });
  };
  window.__ready = false;
  Promise.all([document.fonts.ready, ...Array.from(document.images, i => i.decode().catch(() => {}))]).then(() => {
    window.__seek(0);
    // primo paint dopo il caricamento di font e immagini
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
  });
</script>'''

html = f'''<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="UTF-8">
<title>Sevenda × Camunda — LinkedIn ({int(DUR)} s, 4:5)</title>
<style>
{CSS}
{chr(10).join(KF)}
</style>
</head>
<body>
{body}
{SCRIPT}
</body>
</html>
'''

out = Path(__file__).with_name('promo-camunda-it.html' if IT else 'promo-camunda.html')
out.write_text(html, encoding='utf-8')
print(f'{out.name}: {len(KF)} keyframes, {len(html) // 1024} KB')
