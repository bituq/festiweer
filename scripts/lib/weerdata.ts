// Van ruwe modeldata naar window.WEERDATA: dagcijfers, teksten, iconen,
// verdict en kaarten. Pure functies, alle invoer komt als argument binnen.

import { DAYS, DAGNAMEN, DATUMS, FESTIVAL_IDX, KLEIN_ROLLEN } from './editie';
import { stats, kalibreer, r1 } from './statistiek';
import type { EnsembleDaily, HarmonieTemp } from './openmeteo';

export type Dag = {
  best: number; lo: number; hi: number;
  max: number; min: number;
  regenMed: number; regenP90: number;
  kans: number; kansGfs: number;
  windstoot: number; leden: number;
};

// Temperatuur draait op ECMWF (met biascorrectie en Harmonie binnen 48 uur);
// GFS liep in 2026 structureel 2-3° te warm en telt alleen mee in de regenkans.
export function berekenDagen(ec: EnsembleDaily, gfs: EnsembleDaily, harmonie: HarmonieTemp, bias: number, vandaag: string): Dag[] {
  return DATUMS.map((datum, i) => {
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

function verdict(dagen: Dag[]) {
  const maxHi = Math.max(...dagen.map((d) => d.hi));
  const maxRegenP90 = Math.max(...dagen.map((d) => d.regenP90));
  const gemBest = Math.round(dagen.reduce((s, d) => s + d.best, 0) / dagen.length);
  const kop =
    maxHi >= 28 ? 'WARM, DRINK GENOEG WATER' :
    maxRegenP90 >= 20 ? 'HOU DE PONCHO KLAAR' : 'GEEN HITTE, GEEN NOODWEER';

  const natste = dagen.map((d, i) => [d.regenMed, i] as const).sort((a, b) => b[0] - a[0])[0][1];
  const festKans = Math.round(FESTIVAL_IDX.reduce((s, i) => s + dagen[i].kans, 0) / FESTIVAL_IDX.length);
  const laatste = dagen.length - 1;

  const zinnen = [`Overdag rond de ${gemBest} graden, af en toe een bui.`];
  zinnen.push(
    natste < FESTIVAL_IDX[0]
      ? `De meeste regen valt vóór het festival, op ${DAGNAMEN[natste]}.`
      : `De natste dag wordt ${DAGNAMEN[natste]}.`
  );
  zinnen.push(
    festKans < 70
      ? 'De festivaldagen zelf zijn meestal droog, met hooguit een buitje.'
      : 'Ook op de festivaldagen is een bui goed mogelijk.'
  );
  if (dagen[laatste].kans >= 55) {
    const naam = DAGNAMEN[laatste];
    zinnen.push(`${naam[0].toUpperCase()}${naam.slice(1)}, bij het afbreken, kan het weer nat worden.`);
  }
  zinnen.push(`Dit zeggen ${dagen[0].leden} weerberekeningen, en ze zeggen bijna allemaal hetzelfde.`);
  return { kop, tekst: zinnen.join(' ') };
}

export function bouwWeerdata(dagen: Dag[], nu: Date) {
  const groot = FESTIVAL_IDX.map((i) => ({
    dag: DAYS[i].toUpperCase(),
    icon: iconVoor(dagen[i].kans, dagen[i].regenMed),
    max: dagen[i].max, min: dagen[i].min, kans: dagen[i].kans,
    drops: druppels(dagen[i].regenMed),
    zin: zinGroot(dagen[i].kans, dagen[i].regenMed),
  }));
  const klein = KLEIN_ROLLEN.map(([i, rol]) => ({
    rol: `${rol} · ${DAYS[i].toUpperCase()}`,
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
    days: DAYS,
    chartTemp: { best: dagen.map((d) => d.best), lo: dagen.map((d) => d.lo), hi: dagen.map((d) => d.hi) },
    chartRain: { med: dagen.map((d) => d.regenMed), p90: dagen.map((d) => d.regenP90) },
    verdict: verdict(dagen),
    groot, klein,
  };
}
