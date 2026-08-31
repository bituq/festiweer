// Rendert de poster uit window.WEERDATA (data.js): kolommen, kaarten en
// grafieken. Festival-eigen tekenwerk (silhouet, story-wordmark, gradient)
// komt uit window.FESTIVAL (theme.js). Gedeeld door poster.html en de webversie.
const D = window.WEERDATA;
const F = window.FESTIVAL;
document.getElementById('verdictKop').textContent = D.verdict.kop;
document.getElementById('verdictTekst').textContent = D.verdict.tekst;
document.getElementById('ftRun').textContent = D.runAtText;
document.getElementById('ftLeden').textContent = D.leden;

const NS = 'http://www.w3.org/2000/svg';
const CSS = getComputedStyle(document.documentElement);
const C = (n) => CSS.getPropertyValue(n).trim();
const FLABEL = C('--f-label') || C('--f-pix'); // grafiek-annotaties
function el(parent, tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/* ---------- pixel-druppelmeters ---------- */
function pixelDrops(svg, n, max, vol, leeg, leegOpacity) {
  const g = el(svg, 'g', { 'shape-rendering': 'crispEdges' });
  for (let i = 0; i < max; i++) {
    const x = i * 5, fill = i < n ? vol : leeg;
    const dg = el(g, 'g', { fill });
    if (i >= n) dg.setAttribute('opacity', leegOpacity);
    el(dg, 'rect', { x: x + 1, y: 0, width: 1, height: 1 });
    el(dg, 'rect', { x, y: 1, width: 3, height: 2 });
    el(dg, 'rect', { x: x + 1, y: 3, width: 1, height: 1 });
  }
}

/* ---------- dagkolommen ---------- */
const DAGNAAM = { MA: 'MAANDAG', DI: 'DINSDAG', WO: 'WOENSDAG', DO: 'DONDERDAG', VR: 'VRIJDAG', ZA: 'ZATERDAG', ZO: 'ZONDAG' };
const iconImg = (naam) => {
  const img = document.createElement('img');
  img.className = 'icon';
  img.src = 'assets/icons/' + naam + '.svg';
  return img;
};

const groot = document.getElementById('groot');
D.groot.forEach((d) => {
  const [afk] = d.dag.split(' ');
  const k = document.createElement('div');
  k.className = 'kolom';
  k.innerHTML = `<div class="dagnaam">${DAGNAAM[afk] || afk}</div>
    <div class="datum">${d.datum}</div>`;
  k.appendChild(iconImg(d.icon));
  k.insertAdjacentHTML('beforeend', `
    <div class="temp">${d.max}<span class="gr">°</span></div>
    <div class="nacht">'s nachts ${d.min}°</div>
    <div class="conditie">${d.zin.toUpperCase()}</div>
    <div class="kans">${d.kans}% kans op een bui</div>`);
  const dsvg = document.createElementNS(NS, 'svg');
  dsvg.setAttribute('viewBox', '0 0 19 4');
  const wrap = document.createElement('div'); wrap.className = 'drops'; wrap.appendChild(dsvg);
  pixelDrops(dsvg, d.drops, 4, C('--licht'), C('--licht'), 0.3);
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
    pixelDrops(svg, n, 4, C('--donker'), C('--donker'), 0.28);
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

/* ---------- het festival-silhouet ---------- */
F.silhouetSvg(document.getElementById('silhouet'), C, el);

/* ---------- temperatuurgrafiek ---------- */
(function () {
  const svg = document.getElementById('tempChart');
  const DAYS = D.days, n = DAYS.length;
  const BEST = D.chartTemp.best, P10 = D.chartTemp.lo, P90 = D.chartTemp.hi;
  const W = 356, H = 122, m = { l: 26, r: 8, t: 11, b: 15 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const yMin = Math.min(D.normaal.temp - 6, Math.floor(Math.min(...P10)) - 1);
  const yMax = Math.max(D.normaal.temp + 4.5, Math.ceil(Math.max(...P90)) + 0.5);
  const x = (i) => m.l + (i + 0.5) * plotW / n;
  const y = (v) => m.t + (yMax - v) / (yMax - yMin) * plotH;
  const ink = C('--ink');

  const ticks = [];
  for (let t = Math.ceil(yMin / 4) * 4; t < yMax; t += 4) ticks.push(t);
  ticks.forEach((t, ti) => {
    el(svg, 'line', { x1: m.l, y1: y(t), x2: W - m.r, y2: y(t), stroke: ink, opacity: ti === 0 ? 0.45 : 0.16, 'stroke-width': 1 });
    el(svg, 'text', { x: m.l - 5, y: y(t) + 2.5, 'text-anchor': 'end', 'font-size': 7.5, fill: ink, opacity: 0.8 }, t + '°');
  });

  // band waar vrijwel alle berekeningen tussen zitten
  let d = 'M' + P90.map((v, i) => `${x(i)},${y(v)}`).join(' L');
  d += ' L' + P10.slice().reverse().map((v, j) => `${x(n - 1 - j)},${y(v)}`).join(' L') + ' Z';
  el(svg, 'path', { d, fill: C('--band'), opacity: 0.2 });

  // wat is normaal voor de tijd van het jaar
  el(svg, 'line', { x1: m.l, y1: y(D.normaal.temp), x2: W - m.r, y2: y(D.normaal.temp), stroke: ink, opacity: 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' });
  el(svg, 'text', { x: W - m.r - 2, y: y(D.normaal.temp) - 4, 'text-anchor': 'end', 'font-size': 7.5, fill: ink, opacity: 0.75 }, `${D.normaal.label}: ${D.normaal.temp}°`);

  // beste schatting
  el(svg, 'path', { d: 'M' + BEST.map((v, i) => `${x(i)},${y(v)}`).join(' L'), fill: 'none', stroke: C('--signaal'), 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  BEST.forEach((v, i) => el(svg, 'rect', { x: x(i) - 2.5, y: y(v) - 2.5, width: 5, height: 5, fill: C('--signaal'), stroke: C('--licht'), 'stroke-width': 1.2 }));
  const gemiddeld = Math.round(BEST.reduce((s, v) => s + v, 0) / BEST.length);
  // onder het laatste punt, tenzij het label dan op het normaal-label valt
  let besteY = y(BEST[n - 1]) + 15;
  const gekanteld = Math.abs(besteY - (y(D.normaal.temp) - 4)) < 11;
  if (gekanteld) besteY = y(BEST[n - 1]) - 7;
  el(svg, 'text', { x: x(n - 1) - 2, y: besteY, 'text-anchor': 'end', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: C('--signaal') }, `BESTE SCHATTING: ROND ${gemiddeld}°`);

  // bandlabel links van het midden; onder de band als het beste-label bovenlangs gaat
  const li = Math.max(1, Math.floor((n - 1) / 2) - 1);
  const bandLabelY = gekanteld ? y(P10[li]) + 12 : y(P90[li]) - 3;
  el(svg, 'text', { x: x(li), y: bandLabelY, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: C('--band') }, 'VRIJWEL ZEKER HIER TUSSENIN');

  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.85 }, dg));
})();

/* ---------- regengrafiek ---------- */
(function () {
  const svg = document.getElementById('rainChart');
  const DAYS = D.days, n = DAYS.length;
  const MED = D.chartRain.med, P90 = D.chartRain.p90;
  const W = 356, H = 106, m = { l: 10, r: 64, t: 11, b: 15 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const yMax = Math.max(14, Math.ceil(Math.max(...P90)) + 1);
  const x = (i) => m.l + (i + 0.5) * plotW / n;
  const y = (v) => m.t + (yMax - v) / yMax * plotH;
  const base = y(0);
  const ink = C('--ink');

  // referentielijnen gekoppeld aan de mm-legende
  for (const [v, naam] of [[2, 'BUITJE'], [5, 'PONCHO'], [10, 'MODDER']]) {
    el(svg, 'line', { x1: m.l, y1: y(v), x2: W - m.r, y2: y(v), stroke: ink, opacity: 0.32, 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' });
    el(svg, 'text', { x: W - m.r + 6, y: y(v) + 3, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 6.5, fill: ink, opacity: 0.75 }, `${naam} (${v})`);
  }
  el(svg, 'line', { x1: m.l, y1: base, x2: W - m.r, y2: base, stroke: ink, opacity: 0.45, 'stroke-width': 1 });

  const bw = 20;
  MED.forEach((v, i) => {
    const cx = x(i), yt = y(v);
    el(svg, 'rect', { x: cx - bw / 2, y: yt, width: bw, height: base - yt, fill: C('--donker') });
    const yp = y(P90[i]);
    el(svg, 'line', { x1: cx, y1: yt - 2, x2: cx, y2: yp, stroke: C('--signaal'), 'stroke-width': 1.6, opacity: 0.85 });
    el(svg, 'line', { x1: cx - 5, y1: yp, x2: cx + 5, y2: yp, stroke: C('--signaal'), 'stroke-width': 2.2 });
  });
  el(svg, 'text', { x: x(0) + 9, y: y(P90[0]) - 4, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: C('--signaal') }, 'ALS HET TEGENZIT');

  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.85 }, dg));
})();
