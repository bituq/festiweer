// Rendert de poster uit window.WEERDATA (data.js). Elke sectie rendert alleen
// als de poster.html van het festival het element heeft, zodat festivals hun
// eigen indeling kunnen hebben: kolommen (#groot) of banden (#banden), losse
// grafieken (#tempChart/#rainChart) of één meteogram (#meteogram), reisrijen
// (#klein), mm-legende (#mmlegende). Festival-eigen tekenwerk (silhouet,
// story-wordmark, gradient) komt uit window.FESTIVAL (theme.js).
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

const DAGNAAM = { MA: 'MAANDAG', DI: 'DINSDAG', WO: 'WOENSDAG', DO: 'DONDERDAG', VR: 'VRIJDAG', ZA: 'ZATERDAG', ZO: 'ZONDAG' };
const iconImg = (naam) => {
  const img = document.createElement('img');
  img.className = 'icon';
  img.src = 'assets/icons/' + naam + '.svg';
  return img;
};

/* ---------- dagkolommen ---------- */
const groot = document.getElementById('groot');
if (groot) D.groot.forEach((d) => {
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

/* ---------- dagbanden ---------- */
const banden = document.getElementById('banden');
if (banden) D.groot.forEach((d) => {
  const [afk] = d.dag.split(' ');
  const b = document.createElement('div');
  b.className = 'band';
  b.innerHTML = `<div class="band-dag">
      <div class="dagnaam">${DAGNAAM[afk] || afk}</div>
      <div class="datum">${d.datum}</div>
    </div>`;
  b.appendChild(iconImg(d.icon));
  b.insertAdjacentHTML('beforeend', `
    <div class="band-temp">
      <div class="temp">${d.max}<span class="gr">°</span></div>
      <div class="nacht">'s nachts ${d.min}°</div>
    </div>
    <div class="band-rest">
      <div class="kans">${d.kans}% kans op een bui</div>
      <div class="conditie">${d.zin.toUpperCase()}</div>
    </div>`);
  banden.appendChild(b);
});

/* ---------- komen en gaan ---------- */
const klein = document.getElementById('klein');
if (klein) D.klein.forEach((d) => {
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
  if (!wrap) return;
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

/* ---------- gedeelde grafiek-hulpen ---------- */
function tekenTemp(svg, geom) {
  // temperatuurlijn + band + normaal in een gegeven y-bereik van een svg
  const { n, x, yT, xEind, ink } = geom;
  const BEST = D.chartTemp.best, P10 = D.chartTemp.lo, P90 = D.chartTemp.hi;

  let d = 'M' + P90.map((v, i) => `${x(i)},${yT(v)}`).join(' L');
  d += ' L' + P10.slice().reverse().map((v, j) => `${x(n - 1 - j)},${yT(v)}`).join(' L') + ' Z';
  el(svg, 'path', { d, fill: C('--band'), opacity: 0.2 });

  el(svg, 'line', { x1: geom.xBegin, y1: yT(D.normaal.temp), x2: xEind, y2: yT(D.normaal.temp), stroke: ink, opacity: 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 4', 'stroke-linecap': 'round' });
  el(svg, 'text', { x: xEind - 2, y: yT(D.normaal.temp) - 4, 'text-anchor': 'end', 'font-size': 7.5, fill: ink, opacity: 0.75 }, `${D.normaal.label}: ${D.normaal.temp}°`);

  el(svg, 'path', { d: 'M' + BEST.map((v, i) => `${x(i)},${yT(v)}`).join(' L'), fill: 'none', stroke: C('--signaal'), 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  BEST.forEach((v, i) => el(svg, 'rect', { x: x(i) - 2.5, y: yT(v) - 2.5, width: 5, height: 5, fill: C('--signaal'), stroke: C('--licht'), 'stroke-width': 1.2 }));

  const gemiddeld = Math.round(BEST.reduce((s, v) => s + v, 0) / BEST.length);
  // onder het laatste punt, tenzij het label dan op het normaal-label valt
  let besteY = yT(BEST[n - 1]) + 15;
  const gekanteld = Math.abs(besteY - (yT(D.normaal.temp) - 4)) < 11;
  if (gekanteld) besteY = Math.min(yT(BEST[n - 1]) - 7, yT(P90[n - 1]) - 4);
  el(svg, 'text', { x: x(n - 1) - 2, y: besteY, 'text-anchor': 'end', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: C('--signaal') }, `BESTE SCHATTING: ROND ${gemiddeld}°`);

  // bandlabel links van het midden; onder de band als het beste-label bovenlangs gaat
  const li = Math.max(1, Math.floor((n - 1) / 2) - 1);
  const bandLabelY = gekanteld ? yT(P10[li]) + 12 : yT(P90[li]) - 3;
  el(svg, 'text', { x: x(li), y: bandLabelY, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: C('--band') }, 'VRIJWEL ZEKER HIER TUSSENIN');
}

/* ---------- temperatuurgrafiek ---------- */
(function () {
  const svg = document.getElementById('tempChart');
  if (!svg) return;
  const DAYS = D.days, n = DAYS.length;
  const P10 = D.chartTemp.lo, P90 = D.chartTemp.hi;
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

  tekenTemp(svg, { n, x, yT: y, xBegin: m.l, xEind: W - m.r, ink });
  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.85 }, dg));
})();

/* ---------- regengrafiek ---------- */
(function () {
  const svg = document.getElementById('rainChart');
  if (!svg) return;
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

/* ---------- meteogram (uurlijks): temperatuur en regen in één paneel ---------- */
(function () {
  const svg = document.getElementById('meteogram');
  if (!svg || !D.uurlijks) return;
  const U = D.uurlijks, N = U.tijden.length;
  const W = 736, H = 190, m = { l: 30, r: 26, t: 16, b: 26 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const x = (i) => m.l + i * plotW / (N - 1);
  const base = H - m.b;
  const ink = C('--ink');

  // temperatuur in de bovenste ~2/3
  const yMin = Math.floor(Math.min(...U.temp.lo)) - 1;
  const yMax = Math.ceil(Math.max(...U.temp.hi)) + 1;
  const yT = (v) => m.t + (yMax - v) / (yMax - yMin) * (plotH * 0.66);
  for (let t = Math.ceil(yMin / 4) * 4; t <= yMax; t += 4) {
    el(svg, 'line', { x1: m.l, y1: yT(t), x2: W - m.r, y2: yT(t), stroke: ink, opacity: 0.16, 'stroke-width': 1 });
    el(svg, 'text', { x: m.l - 5, y: yT(t) + 2.5, 'text-anchor': 'end', 'font-size': 7.5, fill: ink, opacity: 0.8 }, t + '°');
  }
  el(svg, 'line', { x1: m.l, y1: base, x2: W - m.r, y2: base, stroke: ink, opacity: 0.45, 'stroke-width': 1 });

  // dag-scheidingen op middernacht + daglabels gecentreerd per dag
  U.tijden.forEach((t, i) => {
    if (i > 0 && t.endsWith('T00:00')) el(svg, 'line', { x1: x(i), y1: m.t, x2: x(i), y2: base, stroke: ink, opacity: 0.25, 'stroke-width': 1, 'stroke-dasharray': '2 4' });
  });
  D.days.forEach((dg, d) => {
    const i0 = d * 24, i1 = Math.min(N - 1, i0 + 23);
    if (i0 >= N) return;
    el(svg, 'text', { x: x((i0 + i1) / 2), y: H - 6, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: ink, opacity: 0.85 }, dg);
  });

  // regen als 3-uursblokjes vanaf de basislijn, met mm-as rechts
  const blokken = [];
  for (let b = 0; b * 3 < N; b++) {
    blokken.push(U.regen.slice(b * 3, b * 3 + 3).reduce((s, v) => s + v, 0));
  }
  const regenMax = Math.max(3, Math.ceil(Math.max(...blokken)));
  const yR = (v) => base - (v / regenMax) * (plotH * 0.28);
  const bw = plotW / blokken.length * 0.55;
  blokken.forEach((v, b) => {
    if (v < 0.05) return;
    const cx = x(Math.min(N - 1, b * 3 + 1));
    el(svg, 'rect', { x: cx - bw / 2, y: yR(v), width: bw, height: base - yR(v), fill: C('--donker') });
  });
  for (let v = 1; v <= regenMax; v += Math.ceil(regenMax / 3)) {
    el(svg, 'text', { x: W - m.r + 4, y: yR(v) + 2.5, 'font-size': 7, fill: ink, opacity: 0.8 }, `${v}`);
  }
  el(svg, 'text', { x: W - m.r + 4, y: yR(regenMax) - 7, 'font-size': 6.5, fill: ink, opacity: 0.7 }, 'mm');

  // temperatuurband + mediaan
  let d = 'M' + U.temp.hi.map((v, i) => `${x(i)},${yT(v)}`).join(' L');
  d += ' L' + U.temp.lo.slice().reverse().map((v, j) => `${x(N - 1 - j)},${yT(v)}`).join(' L') + ' Z';
  el(svg, 'path', { d, fill: C('--signaal'), opacity: 0.16 });
  el(svg, 'path', { d: 'M' + U.temp.best.map((v, i) => `${x(i)},${yT(v)}`).join(' L'), fill: 'none', stroke: C('--signaal'), 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  // legenda linksboven
  el(svg, 'line', { x1: m.l + 4, y1: m.t + 4, x2: m.l + 18, y2: m.t + 4, stroke: C('--signaal'), 'stroke-width': 2 });
  el(svg, 'text', { x: m.l + 23, y: m.t + 7, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.85 }, 'TEMPERATUUR, MET DE BAND WAAR VRIJWEL ALLE BEREKENINGEN TUSSEN ZITTEN');
  el(svg, 'rect', { x: m.l + 6, y: m.t + 12, width: 10, height: 6, fill: C('--donker') });
  el(svg, 'text', { x: m.l + 23, y: m.t + 18, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.85 }, 'REGEN (MM PER 3 UUR)');
})();

/* ---------- meteogram (per dag): fallback zonder uurdata ---------- */
(function () {
  const svg = document.getElementById('meteogram');
  if (!svg || D.uurlijks) return;
  const DAYS = D.days, n = DAYS.length;
  const P10 = D.chartTemp.lo, P90 = D.chartTemp.hi;
  const MED = D.chartRain.med, RP90 = D.chartRain.p90;
  const W = 736, H = 170, m = { l: 30, r: 10, t: 14, b: 20 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const x = (i) => m.l + (i + 0.5) * plotW / n;
  const ink = C('--ink');

  // temperatuur in de bovenste ~60%, regenbalkjes vanaf de basislijn omhoog
  const yMin = Math.min(D.normaal.temp - 6, Math.floor(Math.min(...P10)) - 1);
  const yMax = Math.max(D.normaal.temp + 4.5, Math.ceil(Math.max(...P90)) + 0.5);
  const tempH = plotH * 0.60;
  const yT = (v) => m.t + (yMax - v) / (yMax - yMin) * tempH;
  const base = H - m.b;
  const regenMax = Math.max(6, Math.ceil(Math.max(...RP90)) + 1);
  const yR = (v) => base - (v / regenMax) * (plotH * 0.30);

  const ticks = [];
  for (let t = Math.ceil(yMin / 4) * 4; t < yMax; t += 4) ticks.push(t);
  ticks.forEach((t) => {
    el(svg, 'line', { x1: m.l, y1: yT(t), x2: W - m.r, y2: yT(t), stroke: ink, opacity: 0.16, 'stroke-width': 1 });
    el(svg, 'text', { x: m.l - 5, y: yT(t) + 2.5, 'text-anchor': 'end', 'font-size': 7.5, fill: ink, opacity: 0.8 }, t + '°');
  });
  el(svg, 'line', { x1: m.l, y1: base, x2: W - m.r, y2: base, stroke: ink, opacity: 0.45, 'stroke-width': 1 });

  // regen onderin, met de tegenzit-tick erboven
  const bw = Math.min(34, plotW / n * 0.28);
  let natste = 0;
  MED.forEach((v, i) => { if (RP90[i] > RP90[natste]) natste = i; });
  MED.forEach((v, i) => {
    const cx = x(i), yt = yR(v);
    if (v > 0.05) el(svg, 'rect', { x: cx - bw / 2, y: yt, width: bw, height: base - yt, fill: C('--donker') });
    const yp = yR(RP90[i]);
    el(svg, 'line', { x1: cx, y1: Math.min(yt - 2, base - 2), x2: cx, y2: yp, stroke: C('--signaal'), 'stroke-width': 1.6, opacity: 0.85 });
    el(svg, 'line', { x1: cx - 6, y1: yp, x2: cx + 6, y2: yp, stroke: C('--signaal'), 'stroke-width': 2.2 });
    if (v >= 0.3) el(svg, 'text', { x: cx + bw / 2 + 4, y: yt + 6, 'font-size': 7, fill: ink, opacity: 0.8 }, `${v} mm`);
  });
  el(svg, 'text', { x: x(natste) + 10, y: yR(RP90[natste]) - 4, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: C('--signaal') }, 'ALS HET TEGENZIT');
  el(svg, 'text', { x: m.l, y: base - 4, 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7, fill: ink, opacity: 0.7 }, 'REGEN (MM)');

  tekenTemp(svg, { n, x, yT, xBegin: m.l, xEind: W - m.r, ink });
  DAYS.forEach((dg, i) => el(svg, 'text', { x: x(i), y: H - 4, 'text-anchor': 'middle', 'font-family': FLABEL, 'font-weight': 700, 'font-size': 7.5, fill: ink, opacity: 0.85 }, dg));
})();
