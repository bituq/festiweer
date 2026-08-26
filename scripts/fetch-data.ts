#!/usr/bin/env bun
// Haalt de ensemble-runs op (ECMWF + GFS via Open-Meteo), rekent alles door
// en schrijft data.js (window.WEERDATA) waar poster.html en index.html op draaien.
//
// Na de verificatie van 2026 draait de temperatuur op ECMWF alleen, met een
// lopende biascorrectie en KNMI Harmonie binnen 48 uur; GFS liep die editie
// structureel 2-3° te warm en telt alleen nog mee in de regenkans.

const LAT = 52.437, LON = 5.763;
const START = '2026-08-19', END = '2026-08-24';
const DAYS = ['wo 19', 'do 20', 'vr 21', 'za 22', 'zo 23', 'ma 24'];
const DAGNAMEN = ['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag'];

const VARS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max';

// Na afloop van het festival heeft de forecast-API de festivaldagen niet meer;
// dan blijft de laatste data.js staan in plaats van dat de build crasht.
if (new Date().toISOString().slice(0, 10) > END) {
  console.log(`festival voorbij (${END}); bestaande data.js blijft staan`);
  process.exit(0);
}

async function haalModel(model: string) {
  const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&daily=${VARS}&models=${model}&timezone=Europe%2FAmsterdam&start_date=${START}&end_date=${END}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const d = (await res.json()).daily;
  if (!d?.time?.length) throw new Error(`${model}: geen daily data`);
  return d;
}

// KNMI Harmonie was in de 2026-verificatie daags vooraf het scherpst (0,4° fout,
// tegen 1,0° voor ECMWF determinist); binnen 48 uur neemt het de temperatuur over.
async function haalHarmonie(): Promise<Record<string, { max: number; min: number }>> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min&models=knmi_harmonie_arome_netherlands&timezone=Europe%2FAmsterdam&forecast_days=3`;
    const d = (await (await fetch(url)).json()).daily;
    const uit: Record<string, { max: number; min: number }> = {};
    d?.time?.forEach((t: string, i: number) => {
      if (d.temperature_2m_max[i] != null && d.temperature_2m_min[i] != null)
        uit[t] = { max: d.temperature_2m_max[i], min: d.temperature_2m_min[i] };
    });
    return uit;
  } catch {
    return {};
  }
}

// Lopende biascorrectie: gemiddelde maxtemp-fout van ECMWF over de afgelopen week
// (previous-runs op 2 dagen vooraf tegen het ERA5-archief), afgetopt op ±2°.
// In 2026 was de warme drift hiermee al dagen voor het festival weggecorrigeerd.
async function haalBias(): Promise<number> {
  try {
    const dag = (terug: number) => new Date(Date.now() - terug * 86400000).toISOString().slice(0, 10);
    const [prev, arch] = await Promise.all([
      fetch(`https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&start_date=${dag(9)}&end_date=${dag(3)}&hourly=temperature_2m_previous_day2&models=ecmwf_ifs025&timezone=Europe%2FAmsterdam`).then((r) => r.json()),
      fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${dag(9)}&end_date=${dag(3)}&daily=temperature_2m_max&timezone=Europe%2FAmsterdam`).then((r) => r.json()),
    ]);
    const fouten: number[] = [];
    arch.daily?.time?.forEach((d: string, i: number) => {
      const obs = arch.daily.temperature_2m_max[i];
      if (obs == null) return;
      const uren = prev.hourly.time
        .map((t: string, j: number) => (t.startsWith(d) ? prev.hourly.temperature_2m_previous_day2[j] : null))
        .filter((v: number | null): v is number => v != null);
      if (uren.length >= 20) fouten.push(Math.max(...uren) - obs);
    });
    if (fouten.length < 3) return 0;
    const gem = fouten.reduce((s, v) => s + v, 0) / fouten.length;
    return Math.max(-2, Math.min(2, gem));
  } catch {
    return 0;
  }
}

type Stat = { med: number; p10: number; p90: number; n: number; prob1mm?: number };

function stats(dailies: Record<string, unknown>[], variabele: string, dagIndex: number): Stat {
  const vals = dailies
    .flatMap((daily) =>
      Object.keys(daily)
        .filter((k) => k === variabele || k.startsWith(variabele + '_member'))
        .map((k) => (daily[k] as (number | null)[])[dagIndex])
    )
    .filter((v): v is number => v !== null && v !== undefined)
    .sort((a, b) => a - b);
  if (!vals.length) throw new Error(`geen waardes voor ${variabele} dag ${dagIndex}`);
  const n = vals.length;
  const q = (p: number) => vals[Math.min(n - 1, Math.floor(n * p))];
  const med = n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
  return { med, p10: q(0.1), p90: q(0.9), n, prob1mm: (vals.filter((v) => v >= 1).length / n) * 100 };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function iconVoor(kans: number, med: number): string {
  if (med >= 2.5 || (kans >= 80 && med >= 1.5)) return 'rain';
  if (kans >= 72 || (med >= 1.8 && kans >= 60)) return 'drizzle';
  if (kans >= 55) return 'partly-cloudy-day-drizzle';
  if (kans >= 35) return 'partly-cloudy-day';
  return 'clear-day';
}

function druppels(med: number): number {
  if (med >= 5) return 4;
  if (med >= 2.5) return 3;
  if (med >= 1.2) return 2;
  if (med >= 0.5) return 1;
  return 0;
}

function zinGroot(kans: number, med: number): string {
  if (kans >= 80 && med >= 2) return 'reken op een paar buien';
  if (kans >= 70) return 'grote kans op een bui';
  if (kans >= 55) return 'hooguit even schuilen';
  if (kans >= 40) return 'waarschijnlijk droog';
  return 'vrijwel zeker droog';
}

function zinKlein(kans: number, med: number, windstoot: number): string {
  let z =
    kans >= 80 ? 'dikke kans op regen' :
    kans >= 60 ? 'reken op een paar buien' :
    kans >= 40 ? 'kans op een buitje' : 'waarschijnlijk droog';
  if (windstoot >= 40) z += ', en stevige wind: zet alles goed vast';
  return z;
}

// Kalibratie uit de 2026-verificatie: middenkansen bluften (55-69% kwam maar in
// een derde van de gevallen uit), de uiteinden klopten; knikpunten blijven monotoon.
const KNIK: [number, number][] = [[0, 0], [40, 38], [60, 48], [80, 74], [100, 100]];
function kalibreer(kans: number): number {
  let i = 1;
  while (kans > KNIK[i][0]) i++;
  const [x0, y0] = KNIK[i - 1], [x1, y1] = KNIK[i];
  return Math.round(y0 + ((kans - x0) / (x1 - x0)) * (y1 - y0));
}

const ec = await haalModel('ecmwf_ifs025');
const gfs = await haalModel('gfs05');
const [harmonie, bias] = await Promise.all([haalHarmonie(), haalBias()]);
if (bias) console.log(`biascorrectie: ECMWF zat afgelopen week gemiddeld ${r1(bias)}° ernaast, gaat eraf`);
const vandaag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date());

const dagen = DAYS.map((_, i) => {
  const ecT = stats([ec], 'temperature_2m_max', i);
  const gfsT = stats([gfs], 'temperature_2m_max', i);
  const ecMin = stats([ec], 'temperature_2m_min', i);
  const ecR = stats([ec], 'precipitation_sum', i);
  const gfsR = stats([gfs], 'precipitation_sum', i);
  const poolR = stats([ec, gfs], 'precipitation_sum', i);
  const ecW = stats([ec], 'wind_gusts_10m_max', i);
  let best = ecT.med - bias, minT = ecMin.med - bias;
  let lo = ecT.p10 - bias, hi = ecT.p90 - bias;
  const h = harmonie[ec.time[i]];
  const overDagen = Math.round((+new Date(ec.time[i]) - +new Date(vandaag)) / 86400000);
  if (h && overDagen >= 0 && overDagen <= 2) {
    // Harmonie ongecorrigeerd: die zat in de verificatie al vrijwel op nul.
    best = h.max;
    minT = h.min;
  }
  lo = Math.min(lo, best);
  hi = Math.max(hi, best);
  const kans = kalibreer(Math.round(poolR.prob1mm!));
  return {
    best: r1(best),
    lo: r1(lo),
    hi: r1(hi),
    max: Math.round(best),
    min: Math.round(minT),
    regenMed: r1(ecR.med),
    regenP90: r1(ecR.p90),
    kans,
    kansGfs: Math.round(gfsR.prob1mm!),
    windstoot: Math.round(ecW.med),
    leden: ecT.n + gfsT.n,
  };
});

// ---- verdict uit regels ----
const maxHi = Math.max(...dagen.map((d) => d.hi));
const maxRegenP90 = Math.max(...dagen.map((d) => d.regenP90));
const gemBest = Math.round(dagen.reduce((s, d) => s + d.best, 0) / dagen.length);
const kop =
  maxHi >= 28 ? 'WARM, DRINK GENOEG WATER' :
  maxRegenP90 >= 20 ? 'HOU DE PONCHO KLAAR' : 'GEEN HITTE, GEEN NOODWEER';

const natste = dagen.map((d, i) => [d.regenMed, i] as const).sort((a, b) => b[0] - a[0])[0][1];
const festKans = Math.round((dagen[2].kans + dagen[3].kans + dagen[4].kans) / 3);
const zinnen = [`Overdag rond de ${gemBest} graden, af en toe een bui.`];
zinnen.push(
  natste <= 1
    ? `De meeste regen valt vóór het festival, op ${DAGNAMEN[natste]}.`
    : `De natste dag wordt ${DAGNAMEN[natste]}.`
);
zinnen.push(
  festKans < 70
    ? 'De festivaldagen zelf zijn meestal droog, met hooguit een buitje.'
    : 'Ook op de festivaldagen is een bui goed mogelijk.'
);
if (dagen[5].kans >= 55) zinnen.push('Maandag, bij het afbreken, kan het weer nat worden.');
const totaalLeden = dagen[0].leden;
zinnen.push(`Dit zeggen ${totaalLeden} weerberekeningen, en ze zeggen bijna allemaal hetzelfde.`);

// ---- kaarten ----
const grootIdx = [2, 3, 4];
const kleinIdx: [number, string][] = [[0, 'OPBOUW · WO 19'], [1, 'AANKOMST · DO 20'], [5, 'NAAR HUIS · MA 24']];
const groot = grootIdx.map((i) => ({
  dag: DAYS[i].toUpperCase(),
  icon: iconVoor(dagen[i].kans, dagen[i].regenMed),
  max: dagen[i].max, min: dagen[i].min, kans: dagen[i].kans,
  drops: druppels(dagen[i].regenMed),
  zin: zinGroot(dagen[i].kans, dagen[i].regenMed),
}));
const klein = kleinIdx.map(([i, rol]) => ({
  rol,
  icon: iconVoor(dagen[i].kans, dagen[i].regenMed),
  max: dagen[i].max, kans: dagen[i].kans,
  zin: zinKlein(dagen[i].kans, dagen[i].regenMed, dagen[i].windstoot),
}));

const nu = new Date();
const runAtText = new Intl.DateTimeFormat('nl-NL', {
  timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(nu).replace(' om ', ', ');

const WEERDATA = {
  runAt: nu.toISOString(),
  runAtText,
  leden: totaalLeden,
  days: DAYS,
  chartTemp: { best: dagen.map((d) => d.best), lo: dagen.map((d) => d.lo), hi: dagen.map((d) => d.hi) },
  chartRain: { med: dagen.map((d) => d.regenMed), p90: dagen.map((d) => d.regenP90) },
  verdict: { kop, tekst: zinnen.join(' ') },
  groot, klein,
};

await Bun.write(new URL('../data.js', import.meta.url), 'window.WEERDATA = ' + JSON.stringify(WEERDATA, null, 2) + ';\n');
console.log(`data.js geschreven · ${totaalLeden} leden · run ${runAtText}`);
console.log('temp best:', WEERDATA.chartTemp.best.join(', '));
console.log('regen med:', WEERDATA.chartRain.med.join(', '), '· kans:', dagen.map((d) => d.kans).join(', '));
