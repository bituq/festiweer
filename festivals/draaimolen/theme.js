// Festival-eigen tekenwerk voor Draaimolen, naar de 2026-campagne: een
// dennen-skyline over de volle breedte met de zwevende glas-orb, de
// teal-naar-goud gradient en het brede DRAAI/MOLEN-wordmark in outline
// (Archivo Expanded). Geladen vóór poster.js/share.js; die lezen window.FESTIVAL.
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

  // De skyline in een lokaal 760x150-vlak: dennen [cx, hoogte, halve breedte]
  // met de orb erboven zwevend.
  pijnbomen: [[18, 96, 24], [58, 64, 18], [105, 126, 30], [160, 82, 22], [215, 108, 26], [268, 72, 19], [330, 138, 32], [392, 92, 23], [448, 116, 28], [502, 78, 20], [560, 146, 33], [622, 100, 24], [676, 128, 30], [726, 84, 22], [756, 110, 26]],
  orb: { cx: 590, cy: 38, r: 32 },
  denLagen(cx, h, hw) {
    const top = 150 - h;
    return [
      [[cx, top], [cx - hw * 0.55, top + h * 0.5], [cx + hw * 0.55, top + h * 0.5]],
      [[cx, top + h * 0.26], [cx - hw * 0.8, top + h * 0.78], [cx + hw * 0.8, top + h * 0.78]],
      [[cx, top + h * 0.52], [cx - hw, 150], [cx + hw, 150]],
    ];
  },

  silhouetSvg(svg, C, el) {
    const defs = el(svg, 'defs');
    const grad = el(defs, 'radialGradient', { id: 'orbGrad', cx: '38%', cy: '32%', r: '75%' });
    el(grad, 'stop', { offset: '0%', 'stop-color': C('--licht'), 'stop-opacity': 0.95 });
    el(grad, 'stop', { offset: '45%', 'stop-color': C('--accent'), 'stop-opacity': 0.45 });
    el(grad, 'stop', { offset: '100%', 'stop-color': C('--accent'), 'stop-opacity': 0.1 });
    for (const [cx, h, hw] of this.pijnbomen) {
      for (const punten of this.denLagen(cx, h, hw)) {
        el(svg, 'polygon', { points: punten.map((p) => p.join(',')).join(' '), fill: C('--donker') });
      }
    }
    const { cx, cy, r } = this.orb;
    el(svg, 'circle', { cx, cy, r, fill: 'url(#orbGrad)' });
    el(svg, 'circle', { cx, cy, r, fill: 'none', stroke: C('--licht'), 'stroke-opacity': 0.6, 'stroke-width': 1 });
  },

  silhouetCanvas(ctx, C, rechtsX, baseY) {
    const s = (rechtsX + 40) / 760;
    const X = (x) => x * s;
    const Y = (y) => baseY - (150 - y) * s;
    ctx.fillStyle = C('--donker');
    for (const [cx, h, hw] of this.pijnbomen) {
      for (const punten of this.denLagen(cx, h, hw)) {
        ctx.beginPath();
        ctx.moveTo(X(punten[0][0]), Y(punten[0][1]));
        ctx.lineTo(X(punten[1][0]), Y(punten[1][1]));
        ctx.lineTo(X(punten[2][0]), Y(punten[2][1]));
        ctx.fill();
      }
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
