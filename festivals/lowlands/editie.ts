import { maakEditie } from '../../scripts/lib/editie';

export const EDITIE = maakEditie({
  slug: 'lowlands',
  naam: 'Lowlands',
  jaar: 2026,
  plaats: 'Biddinghuizen',
  periode: 'WO 19 T/M MA 24 AUG',
  site: 'https://festiweer.nl/lowlands',
  siteLabel: 'FESTIWEER.NL/LOWLANDS',
  disclaimer: 'NIET VERBONDEN AAN LOWLANDS OF MOJO',
  ogBeschrijving: 'De verwachting voor Biddinghuizen uit 82 weerberekeningen, elke 4 uur ververst.',
  lat: 52.437,
  lon: 5.763,
  start: '2026-08-19',
  end: '2026-08-24',
  festivalIdx: [2, 3, 4],
  kleinRollen: [[0, 'OPBOUW'], [1, 'AANKOMST'], [5, 'NAAR HUIS']],
  laatsteDagZin: 'bij het afbreken',
  normaal: { temp: 22, label: 'normaal eind augustus' },
  kaart: {
    gradient: 'linear-gradient(135deg, #31255F 0%, #41549B 45%, #E5823A 100%)',
    tekst: '#F4EBDA',
    accent: '#F5C531',
    naamStijl: "font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 24px; letter-spacing: 1px;",
  },
});
