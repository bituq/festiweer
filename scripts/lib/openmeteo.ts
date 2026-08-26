// Al het Open-Meteo-verkeer: de ensembles, KNMI Harmonie en de biasmeting.

import { LAT, LON, START, END } from './editie';

const VARS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max';

export type EnsembleDaily = Record<string, unknown> & { time: string[] };
export type HarmonieTemp = Record<string, { max: number; min: number }>;

export async function haalEnsemble(model: string): Promise<EnsembleDaily> {
  const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${LAT}&longitude=${LON}&daily=${VARS}&models=${model}&timezone=Europe%2FAmsterdam&start_date=${START}&end_date=${END}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const d = (await res.json()).daily;
  if (!d?.time?.length) throw new Error(`${model}: geen daily data`);
  return d;
}

// KNMI Harmonie was in de 2026-verificatie daags vooraf het scherpst (0,4° fout,
// tegen 1,0° voor ECMWF determinist); binnen 48 uur neemt het de temperatuur over.
export async function haalHarmonie(): Promise<HarmonieTemp> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min&models=knmi_harmonie_arome_netherlands&timezone=Europe%2FAmsterdam&forecast_days=3`;
    const d = (await (await fetch(url)).json()).daily;
    const uit: HarmonieTemp = {};
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
export async function haalBias(): Promise<number> {
  try {
    const dag = (terug: number) => new Date(Date.now() - terug * 86_400_000).toISOString().slice(0, 10);
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
