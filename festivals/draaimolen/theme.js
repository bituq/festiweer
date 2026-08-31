// Festival-eigen tekenwerk voor Draaimolen, naar de 2026-campagne: dennen
// van het MOB-complex met de zwevende glas-orb, de bosgroen-naar-goud
// gradient en het brede DRAAI/MOLEN-wordmark (Archivo Expanded).
// Geladen vóór poster.js/share.js; die lezen window.FESTIVAL.
window.FESTIVAL = {
  gradient: [[0, '#071110'], [0.11, '#0C201C'], [0.24, '#123129'], [0.35, '#1C4A3E'], [0.42, '#2E6152'], [0.50, '#5D8168'], [0.58, '#93997B'], [0.68, '#B7AF7E'], [0.78, '#D2C58B'], [0.88, '#E1D6A0'], [1, '#EDE4B6']],
  lichtVanaf: 0.56,

  fontLoads: ["900 100px Archivo", "500 40px Archivo", "700 36px Inter", "italic 500 27px Inter"],
  displayFont(ctx, px, gewicht = 700) {
    ctx.font = `${gewicht >= 700 ? 900 : 500} ${px}px Archivo`;
    ctx.fontStretch = 'expanded';
  },
  bodyFont(ctx, px, { gewicht = 700, cursief = false } = {}) {
    ctx.font = `${cursief ? 'italic ' : ''}${gewicht} ${px}px Inter`;
    ctx.fontStretch = 'normal';
  },

  // De scène in een lokaal 180x300-vlak: drie dennen en de orb.
  pijnbomen: [[138, 40, 1.5], [52, 128, 1.0], [92, 190, 0.62]],
  orb: { cx: 62, cy: 84, r: 36 },
  denLagen(cx, top, s) {
    // drie overlappende kruinen [apexY, baseY, halveBreedte] + de stam
    return {
      lagen: [
        [top, top + 78 * s, 27 * s],
        [top + 42 * s, top + 124 * s, 38 * s],
        [top + 86 * s, top + 172 * s, 48 * s],
      ].map(([a, b, w]) => [[cx, a], [cx - w, b], [cx + w, b]]),
      stam: [cx - 3.5 * s, top + 172 * s, 7 * s, 300 - (top + 172 * s)],
    };
  },

  silhouetSvg(svg, C, el) {
    const defs = el(svg, 'defs');
    const grad = el(defs, 'radialGradient', { id: 'orbGrad', cx: '38%', cy: '32%', r: '75%' });
    el(grad, 'stop', { offset: '0%', 'stop-color': C('--licht'), 'stop-opacity': 0.95 });
    el(grad, 'stop', { offset: '45%', 'stop-color': C('--accent'), 'stop-opacity': 0.45 });
    el(grad, 'stop', { offset: '100%', 'stop-color': C('--accent'), 'stop-opacity': 0.1 });
    for (const [cx, top, s] of this.pijnbomen) {
      const { lagen, stam } = this.denLagen(cx, top, s);
      for (const punten of lagen) el(svg, 'polygon', { points: punten.map((p) => p.join(',')).join(' '), fill: C('--donker') });
      el(svg, 'rect', { x: stam[0], y: stam[1], width: stam[2], height: stam[3], fill: C('--donker') });
    }
    const { cx, cy, r } = this.orb;
    el(svg, 'circle', { cx, cy, r, fill: 'url(#orbGrad)' });
    el(svg, 'circle', { cx, cy, r, fill: 'none', stroke: C('--licht'), 'stroke-opacity': 0.6, 'stroke-width': 1 });
  },

  silhouetCanvas(ctx, C, rechtsX, baseY) {
    const s = 1.8;
    const X = (x) => rechtsX - (180 - x) * s;
    const Y = (y) => baseY - (300 - y) * s;
    ctx.fillStyle = C('--donker');
    for (const [cx, top, ds] of this.pijnbomen) {
      const { lagen, stam } = this.denLagen(cx, top, ds);
      for (const punten of lagen) {
        ctx.beginPath();
        ctx.moveTo(X(punten[0][0]), Y(punten[0][1]));
        ctx.lineTo(X(punten[1][0]), Y(punten[1][1]));
        ctx.lineTo(X(punten[2][0]), Y(punten[2][1]));
        ctx.fill();
      }
      ctx.fillRect(X(stam[0]), Y(stam[1]), stam[2] * s, stam[3] * s);
    }
    const { cx, cy, r } = this.orb;
    const gr = ctx.createRadialGradient(X(cx) - r * s * 0.25, Y(cy) - r * s * 0.35, r * s * 0.1, X(cx), Y(cy), r * s);
    gr.addColorStop(0, 'rgba(238,238,238,0.95)');
    gr.addColorStop(0.45, 'rgba(143,208,172,0.45)');
    gr.addColorStop(1, 'rgba(143,208,172,0.1)');
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), r * s, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(238,238,238,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },

  // outline-letters met per-letter jitter, zoals op de campagnebanner
  wordmarkCanvas(ctx, C, x, y) {
    ctx.textAlign = 'left';
    const jitter = [-4, 3, -2, 5, -3];
    const rij = (tekst, y0) => {
      this.displayFont(ctx, 60, 900);
      let cx = x;
      [...tekst].forEach((letter, i) => {
        const dy = jitter[i % jitter.length];
        ctx.fillStyle = 'rgba(238,238,238,0.26)';
        ctx.strokeStyle = C('--licht');
        ctx.lineWidth = 2;
        ctx.fillText(letter, cx, y0 + dy);
        ctx.strokeText(letter, cx, y0 + dy);
        cx += ctx.measureText(letter).width + 3;
      });
    };
    rij('DRAAI', y - 10);
    rij('MOLEN', y + 56);
    ctx.fillStyle = C('--licht');
    this.displayFont(ctx, 38, 900);
    ctx.fillText('2026', x, y + 118);
  },
};
