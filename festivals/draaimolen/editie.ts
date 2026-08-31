import { maakEditie } from '../../scripts/lib/editie';

// MOB-complex, IJpelareweg, Tilburg. Dagfestival (12:00-00:30), dus een kort
// venster: de dag ervoor en de dag erna als reisrollen, geen opbouw/afbreek.
export const EDITIE = maakEditie({
  slug: 'draaimolen',
  naam: 'Draaimolen',
  jaar: 2026,
  plaats: 'Tilburg',
  periode: 'VR 4 + ZA 5 SEP',
  site: 'https://festiweer.nl/draaimolen',
  siteLabel: 'FESTIWEER.NL/DRAAIMOLEN',
  disclaimer: 'NIET VERBONDEN AAN DRAAIMOLEN',
  ogBeschrijving: 'De verwachting voor het MOB-complex in Tilburg uit 82 weerberekeningen, elke 4 uur ververst.',
  lat: 51.592,
  lon: 5.066,
  start: '2026-09-03',
  end: '2026-09-06',
  festivalIdx: [1, 2],
  kleinRollen: [[0, 'DAG ERVOOR'], [3, 'DE DAG ERNA']],
  normaal: { temp: 20, label: 'normaal begin september' },
  kaart: {
    gradient: 'linear-gradient(135deg, #071110 0%, #1C4A3E 45%, #D2C58B 100%)',
    tekst: '#EEEEEE',
    accent: '#E8C96A',
    naamStijl: "font-family: 'Archivo', sans-serif; font-stretch: 125%; font-weight: 900; font-size: 22px;",
  },
});
