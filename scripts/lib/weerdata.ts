// Van ruwe modeldata naar window.WEERDATA: dagcijfers, teksten, iconen,
// verdict en kaarten. Pure functies, de editie en alle invoer komen als argument binnen.

import type { Editie } from './editie';
import { stats, kalibreer, r1 } from './statistiek';
import type { EnsembleDaily, EnsembleHourly, HarmonieTemp } from './openmeteo';

export type Dag = {
  best: number; lo: number; hi: number;
  max: number; min: number;
  regenMed: number; regenP90: number;
  kans: number; kansGfs: number;
  windstoot: number; leden: number;
};

// Temperatuur draait op ECMWF (met biascorrectie en Harmonie binnen 48 uur);
// GFS liep in 2026 structureel 2-3° te warm en telt alleen mee in de regenkans.
export function berekenDagen(editie: Editie, ec: EnsembleDaily, gfs: EnsembleDaily, harmonie: HarmonieTemp, bias: number, vandaag: string): Dag[] {
  return editie.datums.map((datum, i) => {
    const ecT = stats([ec], 'temperature_2m_max', i);
    const gfsT = stats([gfs], 'temperature_2m_max', i);
    const ecMin = stats([ec], 'temperature_2m_min', i);
    const ecR = stats([ec], 'precipitation_sum', i);
    const gfsR = stats([gfs], 'precipitation_sum', i);
    const poolR = stats([ec, gfs], 'precipitation_sum', i);
    const ecW = stats([ec], 'wind_gusts_10m_max', i);
    let best = ecT.med - bias, minT = ecMin.med - bias;
    let lo = ecT.p10 - bias, hi = ecT.p90 - bias;
    const h = harmonie[datum];
    const overDagen = Math.round((+new Date(datum) - +new Date(vandaag)) / 86_400_000);
    if (h && overDagen >= 0 && overDagen <= 2) {
      // Harmonie ongecorrigeerd: die zat in de verificatie al vrijwel op nul.
      best = h.max;
      minT = h.min;
    }
    lo = Math.min(lo, best);
    hi = Math.max(hi, best);
    return {
      best: r1(best),
      lo: r1(lo),
      hi: r1(hi),
      max: Math.round(best),
      min: Math.round(minT),
      regenMed: r1(ecR.med),
      regenP90: r1(ecR.p90),
      kans: kalibreer(Math.round(poolR.prob1mm!)),
      kansGfs: Math.round(gfsR.prob1mm!),
      windstoot: Math.round(ecW.med),
      leden: ecT.n + gfsT.n,
    };
  });
}

export function iconVoor(kans: number, med: number): string {
  if (med >= 2.5 || (kans >= 80 && med >= 1.5)) return 'rain';
  if (kans >= 72 || (med >= 1.8 && kans >= 60)) return 'drizzle';
  if (kans >= 55) return 'partly-cloudy-day-drizzle';
  if (kans >= 35) return 'partly-cloudy-day';
  return 'clear-day';
}

export function druppels(med: number): number {
  if (med >= 5) return 4;
  if (med >= 2.5) return 3;
  if (med >= 1.2) return 2;
  if (med >= 0.5) return 1;
  return 0;
}

export function zinGroot(kans: number, med: number): string {
  if (kans >= 80 && med >= 2) return 'reken op een paar buien';
  if (kans >= 70) return 'grote kans op een bui';
  if (kans >= 55) return 'hooguit even schuilen';
  if (kans >= 40) return 'waarschijnlijk droog';
  return 'vrijwel zeker droog';
}

export function zinKlein(kans: number, med: number, windstoot: number): string {
  let z =
    kans >= 80 ? 'dikke kans op regen' :
    kans >= 60 ? 'reken op een paar buien' :
    kans >= 40 ? 'kans op een buitje' : 'waarschijnlijk droog';
  if (windstoot >= 40) z += ', en stevige wind: zet alles goed vast';
  return z;
}

function verdict(editie: Editie, dagen: Dag[]) {
  const maxHi = Math.max(...dagen.map((d) => d.hi));
  const maxRegenP90 = Math.max(...dagen.map((d) => d.regenP90));
  const gemBest = Math.round(dagen.reduce((s, d) => s + d.best, 0) / dagen.length);
  const kop =
    maxHi >= 28 ? 'WARM, DRINK GENOEG WATER' :
    maxRegenP90 >= 20 ? 'HOU DE PONCHO KLAAR' : 'GEEN HITTE, GEEN NOODWEER';

  const natste = dagen.map((d, i) => [d.regenMed, i] as const).sort((a, b) => b[0] - a[0])[0][1];
  const festKans = Math.round(editie.festivalIdx.reduce((s, i) => s + dagen[i].kans, 0) / editie.festivalIdx.length);
  const laatste = dagen.length - 1;

  const zinnen = [`Overdag rond de ${gemBest} graden, af en toe een bui.`];
  zinnen.push(
    natste < editie.festivalIdx[0]
      ? `De meeste regen valt vóór het festival, op ${editie.dagnamen[natste]}.`
      : `De natste dag wordt ${editie.dagnamen[natste]}.`
  );
  zinnen.push(
    festKans < 70
      ? 'De festivaldagen zelf zijn meestal droog, met hooguit een buitje.'
      : 'Ook op de festivaldagen is een bui goed mogelijk.'
  );
  if (editie.laatsteDagZin && dagen[laatste].kans >= 55) {
    const naam = editie.dagnamen[laatste];
    zinnen.push(`${naam[0].toUpperCase()}${naam.slice(1)}, ${editie.laatsteDagZin}, kan het weer nat worden.`);
  }
  zinnen.push(`Dit zeggen ${dagen[0].leden} weerberekeningen, en ze zeggen bijna allemaal hetzelfde.`);
  return { kop, tekst: zinnen.join(' ') };
}

// Uurreeks voor het meteogram: per uur de temperatuur-kwantielen over de
// EC-leden (met dezelfde biascorrectie als de dagcijfers) en de regen als
// ensemblegemiddelde (de mediaan van uurlijkse neerslag is vrijwel altijd 0).
export function bouwUurlijks(uur: EnsembleHourly, bias: number) {
  const best: number[] = [], lo: number[] = [], hi: number[] = [], regen: number[] = [];
  uur.time.forEach((_, i) => {
    const t = stats([uur], 'temperature_2m', i);
    best.push(r1(t.med - bias));
    lo.push(r1(t.p10 - bias));
    hi.push(r1(t.p90 - bias));
    const leden = Object.keys(uur)
      .filter((k) => k === 'precipitation' || k.startsWith('precipitation_member'))
      .map((k) => (uur[k] as (number | null)[])[i])
      .filter((v): v is number => v != null);
    regen.push(r1(leden.reduce((s, v) => s + v, 0) / (leden.length || 1)));
  });
  return { tijden: uur.time, temp: { best, lo, hi }, regen };
}

// Datumregel onder de dagnaam op de grote kaarten: '21 AUG'.
const maandKort = new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: 'UTC' });
const datumLabel = (d: string) => `${Number(d.slice(8))} ${maandKort.format(new Date(d)).replace('.', '').toUpperCase()}`;

export function bouwWeerdata(editie: Editie, dagen: Dag[], nu: Date) {
  const groot = editie.festivalIdx.map((i) => ({
    dag: editie.days[i].toUpperCase(),
    datum: datumLabel(editie.datums[i]),
    icon: iconVoor(dagen[i].kans, dagen[i].regenMed),
    max: dagen[i].max, min: dagen[i].min, kans: dagen[i].kans,
    drops: druppels(dagen[i].regenMed),
    zin: zinGroot(dagen[i].kans, dagen[i].regenMed),
  }));
  const klein = editie.kleinRollen.map(([i, rol]) => ({
    rol: `${rol} · ${editie.days[i].toUpperCase()}`,
    icon: iconVoor(dagen[i].kans, dagen[i].regenMed),
    max: dagen[i].max, kans: dagen[i].kans,
    zin: zinKlein(dagen[i].kans, dagen[i].regenMed, dagen[i].windstoot),
  }));

  const runAtText = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(nu).replace(' om ', ', ');

  return {
    runAt: nu.toISOString(),
    runAtText,
    leden: dagen[0].leden,
    festival: {
      slug: editie.slug, naam: editie.naam, jaar: editie.jaar, plaats: editie.plaats,
      periode: editie.periode, site: editie.site, siteLabel: editie.siteLabel, disclaimer: editie.disclaimer,
    },
    normaal: editie.normaal,
    days: editie.days,
    chartTemp: { best: dagen.map((d) => d.best), lo: dagen.map((d) => d.lo), hi: dagen.map((d) => d.hi) },
    chartRain: { med: dagen.map((d) => d.regenMed), p90: dagen.map((d) => d.regenP90) },
    verdict: verdict(editie, dagen),
    groot, klein,
  };
}
