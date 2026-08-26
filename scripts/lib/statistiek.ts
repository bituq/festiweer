// Ensemble-statistiek en de kanskalibratie: pure functies, geen I/O.

export type Stat = { med: number; p10: number; p90: number; n: number; prob1mm?: number };

// Kwantielen over de leden van één of meer ensembles (pool ze door meerdere
// daily-objecten mee te geven).
export function stats(dailies: Record<string, unknown>[], variabele: string, dagIndex: number): Stat {
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

// Kalibratie uit de 2026-verificatie: middenkansen bluften (55-69% kwam maar in
// een derde van de gevallen uit), de uiteinden klopten; knikpunten blijven monotoon.
export const KNIK: [number, number][] = [[0, 0], [40, 38], [60, 48], [80, 74], [100, 100]];

export function kalibreer(kans: number): number {
  let i = 1;
  while (kans > KNIK[i][0]) i++;
  const [x0, y0] = KNIK[i - 1], [x1, y1] = KNIK[i];
  return Math.round(y0 + ((kans - x0) / (x1 - x0)) * (y1 - y0));
}

export const r1 = (v: number) => Math.round(v * 10) / 10;
