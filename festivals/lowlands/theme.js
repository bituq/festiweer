// Festival-eigen tekenwerk voor Lowlands: de torens als silhouet, de
// sunset-gradient en het LOW/LANDS-wordmark voor de story-graphic.
// Geladen vóór poster.js/share.js; die lezen window.FESTIVAL.
window.FESTIVAL = {
  gradient: [[0, '#31255F'], [0.14, '#3B3078'], [0.30, '#41549B'], [0.46, '#6390B0'], [0.57, '#9DBDB4'], [0.68, '#D6C49F'], [0.79, '#ECAF6B'], [0.90, '#E5823A'], [1, '#DF6E28']],
  lichtVanaf: 0.62,

  fontLoads: ["700 100px Silkscreen", "400 40px Silkscreen", "700 36px 'Schibsted Grotesk'", "italic 500 27px 'Schibsted Grotesk'"],
  displayFont(ctx, px, gewicht = 700) { ctx.font = `${gewicht} ${px}px Silkscreen`; },
  bodyFont(ctx, px, { gewicht = 700, cursief = false } = {}) { ctx.font = `${cursief ? 'italic ' : ''}${gewicht} ${px}px 'Schibsted Grotesk'`; },

  // De festivaltorens als gestapelde pixel-rects; rect() abstraheert svg/canvas.
  torens(rect, C, { stap, minW, rond, baseY, lijst }) {
    for (const [cx, topY, baseW, accent] of lijst) {
      const n = Math.ceil((baseY - topY) / stap);
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        let w = minW + (baseW - minW) * f;
        w = Math.max(minW, Math.round(w / rond) * rond);
        let fill = C('--donker');
        if (f < 0.11) fill = C('--accent2');
        else if (f < 0.56) fill = C('--licht');
        else if (accent && f < 0.62) fill = C('--accent2');
        rect(Math.round(cx - w / 2), topY + i * stap, w, stap + 0.5, fill);
      }
    }
  },

  silhouetSvg(svg, C, el) {
    const g = el(svg, 'g', { 'shape-rendering': 'crispEdges' });
    this.torens((x, y, w, h, fill) => el(g, 'rect', { x, y, width: w, height: h, fill }), C,
      { stap: 13, minW: 8, rond: 4, baseY: 300, lijst: [[122, 4, 92, true], [46, 96, 72, false]] });
  },

  silhouetCanvas(ctx, C, rechtsX, baseY) {
    this.torens((x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }, C,
      { stap: 24, minW: 14, rond: 7, baseY, lijst: [[rechtsX - 90, baseY - 430, 150, true], [rechtsX - 250, baseY - 300, 120, false]] });
  },

  wordmarkCanvas(ctx, C, x, y) {
    ctx.fillStyle = C('--licht');
    ctx.textAlign = 'left';
    ctx.font = "700 76px Silkscreen";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.66, 1);
    ctx.fillText('LOW', 0, 0);
    ctx.restore();
    ctx.fillText('LANDS', x, y + 78);
    ctx.font = "700 54px Silkscreen";
    ctx.fillText('2026', x, y + 148);
  },
};
