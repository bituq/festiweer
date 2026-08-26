// Alle editie-specifieke instellingen op één plek: voor een volgende editie
// hoeft alleen dit bestand aangepast (datums, rollen rond het festival).

export const LAT = 52.437;
export const LON = 5.763;
export const START = '2026-08-19';
export const END = '2026-08-24';

// Indices in het dagen-array: welke dagen zijn het festival zelf,
// en welke dagen eromheen krijgen een reisrol in "komen en gaan".
export const FESTIVAL_IDX = [2, 3, 4];
export const KLEIN_ROLLEN: [number, string][] = [[0, 'OPBOUW'], [1, 'AANKOMST'], [5, 'NAAR HUIS']];

const DAG_MS = 86_400_000;
export const DATUMS: string[] = (() => {
  const uit: string[] = [];
  for (let t = Date.parse(START); t <= Date.parse(END); t += DAG_MS) {
    uit.push(new Date(t).toISOString().slice(0, 10));
  }
  return uit;
})();

// Daglabels afgeleid uit de datums, zodat ze nooit uit de pas lopen: 'wo 19' / 'woensdag'.
const kort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', timeZone: 'UTC' });
const lang = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', timeZone: 'UTC' });
export const DAYS = DATUMS.map((d) => `${kort.format(new Date(d)).replace('.', '')} ${Number(d.slice(8))}`);
export const DAGNAMEN = DATUMS.map((d) => lang.format(new Date(d)));
