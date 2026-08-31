// Het editie-type: alles wat per festival(-editie) verschilt zit in één
// config-object in festivals/<slug>/editie.ts. De daglabels worden hier
// uit de datums afgeleid, zodat ze nooit uit de pas lopen: 'wo 19' / 'woensdag'.

export type EditieBasis = {
  slug: string;
  naam: string;                        // 'Lowlands'
  jaar: number;
  plaats: string;                      // 'Biddinghuizen'
  periode: string;                     // kopregel op de poster: 'WO 19 T/M MA 24 AUG'
  site: string;                        // canonieke URL, zonder slash op het eind
  siteLabel: string;                   // zoals hij op de poster staat
  disclaimer: string;                  // 'NIET VERBONDEN AAN LOWLANDS OF MOJO'
  ogBeschrijving: string;
  lat: number;
  lon: number;
  start: string;                       // eerste dag van het venster (YYYY-MM-DD)
  end: string;                         // laatste dag van het venster
  festivalIdx: number[];               // indices in het dagen-array: de festivaldagen zelf
  kleinRollen: [number, string][];     // reisrollen in "komen en gaan": [index, 'OPBOUW']
  laatsteDagZin?: string;              // bijzin voor een natte laatste dag ('bij het afbreken'); weglaten = geen zin
  normaal: { temp: number; label: string }; // referentielijn in de temperatuurgrafiek
  kaart: { gradient: string; tekst: string; accent: string }; // festivalkaart op de landingspagina
};

export type Editie = EditieBasis & { datums: string[]; days: string[]; dagnamen: string[] };

const DAG_MS = 86_400_000;
const kort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', timeZone: 'UTC' });
const lang = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', timeZone: 'UTC' });

export function maakEditie(basis: EditieBasis): Editie {
  const datums: string[] = [];
  for (let t = Date.parse(basis.start); t <= Date.parse(basis.end); t += DAG_MS) {
    datums.push(new Date(t).toISOString().slice(0, 10));
  }
  return {
    ...basis,
    datums,
    days: datums.map((d) => `${kort.format(new Date(d)).replace('.', '')} ${Number(d.slice(8))}`),
    dagnamen: datums.map((d) => lang.format(new Date(d))),
  };
}
