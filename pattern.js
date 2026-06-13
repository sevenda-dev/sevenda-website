/**
 * Sevenda — Generative Isometric Pattern
 * Easter egg interattivo per developer e BA
 *
 * Meccanica:
 *   Hover  → i punti della topologia si illuminano,
 *             compaiono spigoli isometrici tratteggiati
 *   Click  → spawna un nodo-rombo puntinato con flussi direzionali
 *   Touch  → slide per illuminare, tap per creare nodi
 *
 * Estetica: linee monoline bianche · rombi 2:1 · spazio vuoto · asimmetria
 */
(function () {
  'use strict';

  /* ── CONFIGURAZIONE ─────────────────────────────────────────────────── */
  const CFG = {
    /* griglia isometrica — rapporto 2:1 */
    sX: 40,        // passo orizzontale tra punti adiacenti (px)
    sY: 20,        // passo verticale  tra punti adiacenti (px)
    dotR: 1.35,    // raggio punto topologia
    dotA0: 0.055,  // opacità base del punto a riposo

    /* effetto prossimità (hover / touch) */
    hR: 115,       // raggio di influenza del cursore (px)
    dotAmax: 0.50, // opacità massima punto illuminato
    dotLerp: 0.09, // velocità di lerp (per frame a 60 fps)

    /* spigoli hover */
    edgeAmax: 0.17, // opacità massima spigolo

    /* nodi click */
    nW: 30,        // semi-larghezza rombo nodo (px)
    nH: 15,        // semi-altezza  rombo nodo (px) — ratio 2:1
    nDash: [3.5, 6.5],
    nStroke: 1.0,
    nLife: 3200,   // ms vita del nodo prima del fade
    nFade: 1400,   // ms durata fade-out
    nMax: 10,      // nodi massimi simultanei

    /* flussi (linee animate dal nodo) */
    fMin: 1, fMax: 3,
    fLenMin: 55, fLenMax: 180,
    fSpeed: 68,    // px/s
    fHead: 28,     // lunghezza testa luminosa (px)
    fStroke: 0.75,
  };

  /* ── STATO ──────────────────────────────────────────────────────────── */
  let canvas, ctx, W, H, raf;
  let pts   = [];   // punti topologia griglia
  let nodes = [];   // nodi attivi
  let mx = -9e4, my = -9e4;
  let t0 = 0;

  /* 4 direzioni isometriche (delta dx, dy) */
  const DIRS = [
    [ CFG.sX,  CFG.sY ],   // basso-destra
    [-CFG.sX,  CFG.sY ],   // basso-sinistra
    [ CFG.sX, -CFG.sY ],   // alto-destra
    [-CFG.sX, -CFG.sY ],   // alto-sinistra
  ];
  const ADJ = Math.hypot(CFG.sX, CFG.sY) + 2; // soglia adiacenza ~46.7 px

  /* ── AVVIO ──────────────────────────────────────────────────────────── */
  function boot() {
    canvas = document.getElementById('sp-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    fit(); grid();

    window.addEventListener('resize', () => { fit(); grid(); }, { passive: true });

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    }, { passive: true });

    canvas.addEventListener('mouseleave', () => { mx = -9e4; my = -9e4; });

    canvas.addEventListener('click', e => {
      const r = canvas.getBoundingClientRect();
      spawn(e.clientX - r.left, e.clientY - r.top);
    });

    /* touch — slide per hover, tap per spawn */
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      mx = t.clientX - r.left; my = t.clientY - r.top;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      spawn(t.clientX - r.left, t.clientY - r.top);
      setTimeout(() => { mx = -9e4; my = -9e4; }, 500);
    }, { passive: false });

    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function fit() {
    const p = canvas.parentElement;
    W = canvas.width  = p.offsetWidth;
    H = canvas.height = p.offsetHeight;
  }

  /* ── GRIGLIA ISOMETRICA ─────────────────────────────────────────────── */
  function grid() {
    pts = [];
    const cMax = Math.ceil(W / CFG.sX) + 4;
    const rMax = Math.ceil(H / CFG.sY) + 4;
    for (let c = -2; c <= cMax; c++) {
      for (let r = -2; r <= rMax; r++) {
        if ((c + r) % 2 !== 0) continue; // solo vertici isometrici validi
        pts.push({ x: c * CFG.sX, y: r * CFG.sY, a: 0, ta: 0 });
      }
    }
  }

  /* ── SPAWN NODO ─────────────────────────────────────────────────────── */
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
          p: 0,   // progresso (px percorsi dalla testa)
        };
      }),
    });
  }

  /* ── LOOP PRINCIPALE ────────────────────────────────────────────────── */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    tick(dt, now);
    paint(now);
  }

  /* ── AGGIORNAMENTO STATO ────────────────────────────────────────────── */
  function tick(dt, now) {
    /* punti griglia — lerp verso target opacity */
    const lk = 1 - Math.pow(1 - CFG.dotLerp, dt * 60);
    for (const p of pts) {
      const d = Math.hypot(p.x - mx, p.y - my);
      p.ta = d < CFG.hR
        ? CFG.dotA0 + (CFG.dotAmax - CFG.dotA0) * (1 - d / CFG.hR) ** 2
        : CFG.dotA0;
      p.a += (p.ta - p.a) * lk;
    }

    /* nodi — ciclo di vita + avanzamento flussi */
    for (const n of nodes) {
      const age = now - n.born;
      if      (age < 160)                        n.a = age / 160 * 0.92;
      else if (age < CFG.nLife)                  n.a = 0.92;
      else if (age < CFG.nLife + CFG.nFade)      n.a = 0.92 * (1 - (age - CFG.nLife) / CFG.nFade);
      else { n.dead = true; continue; }

      for (const f of n.flows) {
        f.p = Math.min(f.p + CFG.fSpeed * dt, f.len + CFG.fHead);
      }
    }
    nodes = nodes.filter(n => !n.dead);
  }

  /* ── RENDERING ──────────────────────────────────────────────────────── */
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

  /* punti topologia */
  function paintDots() {
    for (const p of pts) {
      if (p.a < 0.005) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CFG.dotR, 0, 6.283);
      ctx.fillStyle = `rgba(255,255,255,${p.a.toFixed(3)})`;
      ctx.fill();
    }
  }

  /* spigoli isometrici hover — solo tra punti adiacenti illuminati */
  function paintEdges() {
    const lit = pts.filter(p => p.a > CFG.dotA0 + 0.03);
    if (lit.length < 2) return;

    ctx.save();
    ctx.lineWidth = 0.65;
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

  /* rombo nodo (dashed, animato) */
  function paintDiamond({ x, y, a }, now) {
    const offset = -(now * 0.006) % (CFG.nDash[0] + CFG.nDash[1]);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = CFG.nStroke;
    ctx.setLineDash(CFG.nDash);
    ctx.lineDashOffset = offset;

    ctx.beginPath();
    ctx.moveTo(x,           y - CFG.nH); // apice top
    ctx.lineTo(x + CFG.nW,  y);           // destra
    ctx.lineTo(x,           y + CFG.nH); // apice bottom
    ctx.lineTo(x - CFG.nW,  y);           // sinistra
    ctx.closePath();
    ctx.stroke();

    /* punto centrale */
    ctx.setLineDash([]);
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, 6.283);
    ctx.fill();

    ctx.restore();
  }

  /* flussi direzionali dal nodo */
  function paintFlows({ x, y, a, flows }) {
    ctx.save();
    ctx.lineWidth = CFG.fStroke;

    for (const f of flows) {
      const tail  = Math.max(0, f.p - CFG.fHead);
      const head  = Math.min(f.p, f.len);
      const decay = f.p > f.len ? 1 - (f.p - f.len) / CFG.fHead : 1;

      /* traccia — tratto dashed tenue già percorso */
      if (tail > 0.5) {
        ctx.setLineDash([2.5, 9]);
        ctx.strokeStyle = `rgba(255,255,255,${(a * 0.08).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x,              y);
        ctx.lineTo(x + f.nx * tail, y + f.ny * tail);
        ctx.stroke();
      }

      /* testa luminosa — segmento solido che avanza */
      if (head > tail && decay > 0.02) {
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(255,255,255,${(a * decay * 0.80).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x + f.nx * tail, y + f.ny * tail);
        ctx.lineTo(x + f.nx * head, y + f.ny * head);
        ctx.stroke();

        /* pallino terminale quando il flusso raggiunge la fine */
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

  /* ── UTILS ──────────────────────────────────────────────────────────── */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
