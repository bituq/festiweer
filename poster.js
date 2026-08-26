// Rendert de poster uit window.WEERDATA (data.js): kolommen, kaarten,
// grafieken en torens. Gedeeld door poster.html en de webversie.
const D = window.WEERDATA;
document.getElementById('verdictKop').textContent = D.verdict.kop;
document.getElementById('verdictTekst').textContent = D.verdict.tekst;
document.getElementById('ftRun').textContent = D.runAtText;
document.getElementById('ftLeden').textContent = D.leden;

const NS = 'http://www.w3.org/2000/svg';
const CSS = getComputedStyle(document.documentElement);
const C = (n) => CSS.getPropertyValue(n).trim();
function el(parent, tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/* ---------- pixel-druppelmeters ---------- */
function pixelDrops(svg, n, max, vol, leeg) {
  const g = el(svg, 'g', { 'shape-rendering': 'crispEdges' });
  for (let i = 0; i < max; i++) {
    const x = i * 5, fill = i < n ? vol : leeg;
    el(g, 'rect', { x: x + 1, y: 0, width: 1, height: 1, fill });
    el(g, 'rect', { x, y: 1, width: 3, height: 2, fill });
    el(g, 'rect', { x: x + 1, y: 3, width: 1, height: 1, fill });
  }
}

/* ---------- dagkolommen ---------- */
const DAGNAAM = { WO: 'WOENSDAG', DO: 'DONDERDAG', VR: 'VRIJDAG', ZA: 'ZATERDAG', ZO: 'ZONDAG', MA: 'MAANDAG' };
const iconImg = (naam) => {
  const img = document.createElement('img');
  img.className = 'icon';
  img.src = 'assets/icons/pixel-' + naam + '.svg';
  return img;
};

const groot = document.getElementById('groot');
D.groot.forEach((d) => {
  const [afk, num] = d.dag.split(' ');
  const k = document.createElement('div');
  k.className = 'kolom';
  k.innerHTML = `<div class="dagnaam">${DAGNAAM[afk] || afk}</div>
    <div class="datum">${num} AUG</div>`;
  k.appendChild(iconImg(d.icon));
  k.insertAdjacentHTML('beforeend', `
    <div class="temp">${d.max}<span class="gr">°</span></div>
    <div class="nacht">'s nachts ${d.min}°</div>
    <div class="conditie">${d.zin.toUpperCase()}</div>
    <div class="kans">${d.kans}% kans op een bui</div>`);
  const dsvg = document.createElementNS(NS, 'svg');
  dsvg.setAttribute('viewBox', '0 0 19 4');
  const wrap = document.createElement('div'); wrap.className = 'drops'; wrap.appendChild(dsvg);
  pixelDrops(dsvg, d.drops, 4, C('--cream'), 'rgba(244,235,218,0.3)');
  k.appendChild(wrap);
  groot.appendChild(k);
});

/* ---------- komen en gaan ---------- */
const klein = document.getElementById('klein');
D.klein.forEach((d) => {
  const r = document.createElement('div');
  r.className = 'reisrij';
  r.appendChild(iconImg(d.icon));
  r.insertAdjacentHTML('beforeend', `<div>
    <div class="rol">${d.rol}</div>
    <div class="feiten">${d.max}° &middot; ${d.kans}% kans op regen</div>
    <div class="zin">${d.zin}</div>
  </div>`);
  klein.appendChild(r);
});

/* ---------- mm-legende ---------- */
(function () {
  const wrap = document.getElementById('mmlegende');
  const items = [[1, '1 mm · een spatje'], [2, '2 mm · een buitje'], [3, '5 mm · poncho aan'], [4, '10+ mm · modder']];
  items.forEach(([n, txt]) => {
    const it = document.createElement('div');
    it.className = 'item';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 19 4'); svg.setAttribute('class', 'dr');
    pixelDrops(svg, n, 4, C('--donkerpaars'), 'rgba(46,26,94,0.28)');
    it.appendChild(svg);
    const sp = document.createElement('span'); sp.textContent = txt;
    it.appendChild(sp);
    wrap.appendChild(it);
  });
  const noot = document.createElement('div');
  noot.className = 'uitleg-mm';
  noot.textContent = '1 millimeter = 1 liter water op elke vierkante meter';
  wrap.appendChild(noot);
})();

/* ---------- de torens ---------- */
(function () {
  const svg = document.getElementById('torens');
  const g = el(svg, 'g', { 'shape-rendering': 'crispEdges' });
  function toren(cx, topY, baseY, baseW, accent) {
    const stap = 13, n = Math.ceil((baseY - topY) / stap);
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      let w = 8 + (baseW - 8) * f;
      w = Math.max(8, Math.round(w / 4) * 4);
      let fill = C('--donkerpaars');
      if (f < 0.11) fill = C('--geel');
      else if (f < 0.56) fill = C('--cream');
      else if (accent && f < 0.62) fill = C('--geel');
      el(g, 'rect', { x: Math.round(cx - w / 2), y: topY + i * stap, width: w, height: stap + 0.5, fill });
    }
  }
  toren(122, 4, 300, 92, true);
  toren(46, 96, 300, 72, false);
})();

/* ---------- temperatuurgrafiek ---------- */
(function () {
  const svg = document.getElementById('tempChart');
  const DAYS = D.days;
  const BEST = D.chartTemp.best, P10 = D.chartTemp.lo, P90 = D.chartTemp.hi;
  const W = 356, H = 122, m = { l: 26, r: 8, t: 11, b: 15 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const yMin = Math.min(16, Math.floor(Math.min(...P10)) - 1);
  const yMax = Math.max(26.5, Math.ceil(Math.max(...P90)) + 0.5);
  const x = (i) => m.l + (i + 0.5) * plotW / 6;
  const y = (v) => m.t + (yMax - v) / (yMax - yMin) * plotH;

  const ticks = [];
  for (let t = Math.ceil(yMin / 4) * 4; t < yMax; t += 4) ticks.push(t);
  ticks.forEach((t, ti) => {
    el(svg, 'line', { x1: m.l, y1: y(t), x2: W - m.r, y2: y(t), stroke: ti === 0 ? 'rgba(42,24,80,0.45)' : 'rgba(42,24,80,0.16)', 'stroke-width': 1 });
    el(svg, 'text', { x: m.l - 5, y: y(t) + 2.5, 'text-anchor': 'end', 'font-size': 7.5, fill: 'rgba(42,24,80,0.8)' }, t + '°');
  });

  // band waar vrijwel alle berekeningen tussen zitten
  let d = 'M' + P90.map((v, i) => `${x(i)},${y(v)}`).join(' L');
  d += ' L' + P10.slice().reverse().map((v, i) => `${x(5 - i)},${y(v)}`).join(' L') + ' Z';
  el(svg, 'path', { d, fill: 'rgba(74,44,143,0.20)' });
  el(svg, 'text', { x: x(2.1), y: y((P90[2] + P90[3]) / 2) + 9, 'text-anchor': 'middle', 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 7.5, fill: C('--paars') }, 'VRIJWEL ZEKER HIER TUSSENIN');

  // normaal eind augustus
  el(svg, 'line', { x1: m.l, y1: y(22), x2: W - m.r, y2: y(22), stroke: C('--ink'), opacity: 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' });
  el(svg, 'text', { x: W - m.r - 2, y: y(22) - 4, 'text-anchor': 'end', 'font-size': 7.5, fill: 'rgba(42,24,80,0.75)' }, 'normaal eind augustus: 22°');

  // beste schatting
  el(svg, 'path', { d: 'M' + BEST.map((v, i) => `${x(i)},${y(v)}`).join(' L'), fill: 'none', stroke: C('--rood'), 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  BEST.forEach((v, i) => el(svg, 'rect', { x: x(i) - 2.5, y: y(v) - 2.5, width: 5, height: 5, fill: C('--rood'), stroke: C('--cream'), 'stroke-width': 1.2 }));
  const gemiddeld = Math.round(BEST.reduce((s, v) => s + v, 0) / BEST.length);
  el(svg, 'text', { x: x(5) - 2, y: y(BEST[5]) + 15, 'text-anchor': 'end', 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 7.5, fill: C('--rood') }, `BESTE SCHATTING: ROND ${gemiddeld}°`);

  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 7, fill: 'rgba(42,24,80,0.85)' }, dg));
})();

/* ---------- regengrafiek ---------- */
(function () {
  const svg = document.getElementById('rainChart');
  const DAYS = D.days;
  const MED = D.chartRain.med, P90 = D.chartRain.p90;
  const W = 356, H = 106, m = { l: 10, r: 64, t: 11, b: 15 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const yMax = Math.max(14, Math.ceil(Math.max(...P90)) + 1);
  const x = (i) => m.l + (i + 0.5) * plotW / 6;
  const y = (v) => m.t + (yMax - v) / yMax * plotH;
  const base = y(0);

  // referentielijnen gekoppeld aan de mm-legende
  for (const [v, naam] of [[2, 'BUITJE'], [5, 'PONCHO'], [10, 'MODDER']]) {
    el(svg, 'line', { x1: m.l, y1: y(v), x2: W - m.r, y2: y(v), stroke: C('--ink'), opacity: 0.32, 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' });
    el(svg, 'text', { x: W - m.r + 6, y: y(v) + 3, 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 6.5, fill: 'rgba(42,24,80,0.75)' }, `${naam} (${v})`);
  }
  el(svg, 'line', { x1: m.l, y1: base, x2: W - m.r, y2: base, stroke: 'rgba(42,24,80,0.45)', 'stroke-width': 1 });

  const bw = 20;
  MED.forEach((v, i) => {
    const cx = x(i), yt = y(v);
    el(svg, 'rect', { x: cx - bw / 2, y: yt, width: bw, height: base - yt, fill: C('--donkerpaars') });
    const yp = y(P90[i]);
    el(svg, 'line', { x1: cx, y1: yt - 2, x2: cx, y2: yp, stroke: C('--rood'), 'stroke-width': 1.6, opacity: 0.85 });
    el(svg, 'line', { x1: cx - 5, y1: yp, x2: cx + 5, y2: yp, stroke: C('--rood'), 'stroke-width': 2.2 });
  });
  el(svg, 'text', { x: x(0) + 9, y: y(P90[0]) - 4, 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 7, fill: C('--rood') }, 'ALS HET TEGENZIT');

  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': 'Silkscreen', 'font-weight': 700, 'font-size': 7, fill: 'rgba(42,24,80,0.85)' }, dg));
})();
