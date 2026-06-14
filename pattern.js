/**
 * Sevenda — Generative Isometric Pattern (full-page overlay)
 * Easter egg interattivo per developer e BA
 *
 * Il canvas si inietta automaticamente come sfondo fisso.
 * Hover  → topologia isometrica si illumina + spigoli dashed
 * Click  → spawna nodo-rombo con flussi direzionali
 *          (ignorato su pulsanti / link / input)
 */
(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────── */
  const CFG = {
    /* griglia isometrica 2:1 */
    sX: 40, sY: 20,
    dotR: 1.5,
    dotA0:   0.10,   // opacità base (più visibile)
    dotAmax: 0.68,   // opacità max su hover

    /* prossimità hover */
    hR:      160,    // raggio influenza (px)
    dotLerp: 0.09,

    /* spigoli hover */
    edgeAmax: 0.22,

    /* nodi click */
    nW: 38, nH: 19,  // semi-larghezza/altezza rombo (ratio 2:1)
    nDash: [3.5, 6.5],
    nStroke: 1.0,
    nLife: 3200,
    nFade: 1400,
    nMax: 14,

    /* flussi */
    fMin: 1, fMax: 3,
    fLenMin: 60, fLenMax: 220,
    fSpeed: 70,
    fHead: 30,
    fStroke: 0.8,
  };

  /* ── STATO ───────────────────────────────────────────────── */
  let canvas, ctx, W, H, raf;
  let pts   = [];
  let nodes = [];
  let mx = -9e4, my = -9e4;
  let t0 = 0;

  const DIRS = [
    [ CFG.sX,  CFG.sY ],
    [-CFG.sX,  CFG.sY ],
    [ CFG.sX, -CFG.sY ],
    [-CFG.sX, -CFG.sY ],
  ];
  const ADJ = Math.hypot(CFG.sX, CFG.sY) + 2;

  /* ── AVVIO ───────────────────────────────────────────────── */
  function boot() {
    /* crea canvas overlay fisso sull'intera viewport */
    canvas = document.createElement('canvas');
    canvas.id = 'sp-canvas';
    Object.assign(canvas.style, {
      position:      'fixed',
      inset:         '0',
      width:         '100%',
      height:        '100%',
      zIndex:        '0',
      pointerEvents: 'none',
      display:       'block',
    });
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');

    fit();
    grid();
    addHint();

    window.addEventListener('resize',    () => { fit(); grid(); }, { passive: true });
    window.addEventListener('mousemove', onMove,  { passive: true });
    window.addEventListener('click',     onClick);
    window.addEventListener('touchmove', onTouch, { passive: false });
    window.addEventListener('touchend',  onTouchEnd, { passive: false });

    t0 = performance.now();
    requestAnimationFrame(frame);
  }

  /* hint testuale — compare e svanisce dopo 7s */
  function addHint() {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position:      'fixed',
      bottom:        '20px',
      right:         '26px',
      fontFamily:    "'Geist Mono', 'Fira Code', monospace",
      fontSize:      '10.5px',
      color:         'rgba(255,255,255,0.22)',
      letterSpacing: '.07em',
      pointerEvents: 'none',
      zIndex:        '9',
      transition:    'opacity 2s ease',
      userSelect:    'none',
    });
    el.textContent = '// click to orchestrate';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 7000);
  }

  /* ── RESIZE ──────────────────────────────────────────────── */
  function fit() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── GRIGLIA ─────────────────────────────────────────────── */
  function grid() {
    pts = [];
    const cMax = Math.ceil(W / CFG.sX) + 4;
    const rMax = Math.ceil(H / CFG.sY) + 4;
    for (let c = -2; c <= cMax; c++) {
      for (let r = -2; r <= rMax; r++) {
        if ((c + r) % 2 !== 0) continue;
        pts.push({ x: c * CFG.sX, y: r * CFG.sY, a: 0, ta: 0 });
      }
    }
  }

  /* ── INPUT ───────────────────────────────────────────────── */
  function onMove(e) { mx = e.clientX; my = e.clientY; }

  function onClick(e) {
    /* ignora click su elementi interattivi */
    if (e.target.closest('button,a,input,select,textarea,label,[role="button"],[role="link"]')) return;
    spawn(e.clientX, e.clientY);
  }

  function onTouch(e) {
    e.preventDefault();
    const t = e.touches[0];
    mx = t.clientX; my = t.clientY;
  }

  function onTouchEnd(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    spawn(t.clientX, t.clientY);
    setTimeout(() => { mx = -9e4; my = -9e4; }, 600);
  }

  /* ── SPAWN NODO ──────────────────────────────────────────── */
  function spawn(x, y) {
    if (nodes.length >= CFG.nMax) nodes.shift();
    const nf   = CFG.fMin + Math.floor(Math.random() * (CFG.fMax - CFG.fMin + 1));
    const dirs = shuffle(DIRS.slice()).slice(0, nf);
    nodes.push({
      x, y,
      born: performance.now(),
      a: 0, dead: false,
      flows: dirs.map(([dx, dy]) => {
        const m = Math.hypot(dx, dy);
        return {
          nx: dx / m, ny: dy / m,
          len: CFG.fLenMin + Math.random() * (CFG.fLenMax - CFG.fLenMin),
          p: 0,
        };
      }),
    });
  }

  /* ── LOOP ────────────────────────────────────────────────── */
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    tick(dt, now);
    paint(now);
  }

  /* ── TICK ────────────────────────────────────────────────── */
  function tick(dt, now) {
    const lk = 1 - Math.pow(1 - CFG.dotLerp, dt * 60);
    for (const p of pts) {
      const d = Math.hypot(p.x - mx, p.y - my);
      p.ta = d < CFG.hR
        ? CFG.dotA0 + (CFG.dotAmax - CFG.dotA0) * (1 - d / CFG.hR) ** 2
        : CFG.dotA0;
      p.a += (p.ta - p.a) * lk;
    }

    for (const n of nodes) {
      const age = now - n.born;
      if      (age < 160)                    n.a = age / 160 * 0.92;
      else if (age < CFG.nLife)              n.a = 0.92;
      else if (age < CFG.nLife + CFG.nFade)  n.a = 0.92 * (1 - (age - CFG.nLife) / CFG.nFade);
      else { n.dead = true; continue; }
      for (const f of n.flows) {
        f.p = Math.min(f.p + CFG.fSpeed * dt, f.len + CFG.fHead);
      }
    }
    nodes = nodes.filter(n => !n.dead);
  }

  /* ── PAINT ───────────────────────────────────────────────── */
  function paint(now) {
    ctx.clearRect(0, 0, W, H);
    paintDots();
    paintEdges();
    for (const n of nodes) {
      if (n.a < 0.01) continue;
      paintFlows(n);
      paintDiamond(n, now);
    }
  }

  function paintDots() {
    for (const p of pts) {
      if (p.a < 0.006) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CFG.dotR, 0, 6.283);
      ctx.fillStyle = `rgba(255,255,255,${p.a.toFixed(3)})`;
      ctx.fill();
    }
  }

  function paintEdges() {
    const lit = pts.filter(p => p.a > CFG.dotA0 + 0.04);
    if (lit.length < 2) return;
    ctx.save();
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 8]);
    for (let i = 0; i < lit.length; i++) {
      for (let j = i + 1; j < lit.length; j++) {
        const a = lit[i], b = lit[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > ADJ) continue;
        const alpha = CFG.edgeAmax * (Math.min(a.a, b.a) / CFG.dotAmax);
        if (alpha < 0.012) continue;
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function paintDiamond({ x, y, a }, now) {
    const off = -(now * 0.006) % (CFG.nDash[0] + CFG.nDash[1]);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = CFG.nStroke;
    ctx.setLineDash(CFG.nDash);
    ctx.lineDashOffset = off;
    ctx.beginPath();
    ctx.moveTo(x,           y - CFG.nH);
    ctx.lineTo(x + CFG.nW,  y);
    ctx.lineTo(x,           y + CFG.nH);
    ctx.lineTo(x - CFG.nW,  y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  function paintFlows({ x, y, a, flows }) {
    ctx.save();
    ctx.lineWidth = CFG.fStroke;
    for (const f of flows) {
      const tail  = Math.max(0, f.p - CFG.fHead);
      const head  = Math.min(f.p, f.len);
      const decay = f.p > f.len ? 1 - (f.p - f.len) / CFG.fHead : 1;
      if (tail > 0.5) {
        ctx.setLineDash([2.5, 9]);
        ctx.strokeStyle = `rgba(255,255,255,${(a * 0.09).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + f.nx * tail, y + f.ny * tail);
        ctx.stroke();
      }
      if (head > tail && decay > 0.02) {
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(255,255,255,${(a * decay * 0.82).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x + f.nx * tail, y + f.ny * tail);
        ctx.lineTo(x + f.nx * head, y + f.ny * head);
        ctx.stroke();
        if (f.p >= f.len && decay > 0.08) {
          ctx.fillStyle = `rgba(255,255,255,${(a * decay * 0.75).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x + f.nx * f.len, y + f.ny * f.len, 2.2, 0, 6.283);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /* ── UTILS ───────────────────────────────────────────────── */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
