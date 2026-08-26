import { describe, it, expect } from 'bun:test';
import { DATUMS } from '../editie';
import { berekenDagen, bouwWeerdata, iconVoor, druppels, zinGroot, zinKlein } from '../weerdata';
import type { EnsembleDaily } from '../openmeteo';

// Fixture: per variabele een lijst leden, elk lid één waarde die voor alle
// zes dagen geldt (of een array van zes voor variatie per dag).
function ensemble(per: Record<string, (number | number[])[]>): EnsembleDaily {
  const d: Record<string, unknown> = { time: DATUMS };
  for (const [naam, leden] of Object.entries(per)) {
    leden.forEach((v, i) => {
      d[i === 0 ? naam : `${naam}_member${String(i).padStart(2, '0')}`] =
        Array.isArray(v) ? v : DATUMS.map(() => v);
    });
  }
  return d as EnsembleDaily;
}

const kalmEc = (over: Record<string, (number | number[])[]> = {}) =>
  ensemble({
    temperature_2m_max: [19, 20, 21],
    temperature_2m_min: [12, 13, 14],
    precipitation_sum: [0, 0, 0],
    wind_gusts_10m_max: [30, 30, 30],
    ...over,
  });
const kalmGfs = (over: Record<string, (number | number[])[]> = {}) =>
  ensemble({ temperature_2m_max: [22, 23], precipitation_sum: [0, 0], ...over });

const GISTER_VER_WEG = '2026-08-01'; // ver vóór alle dagen: geen Harmonie-window actief

describe('berekenDagen', () => {
  it('haalt de temperatuur alleen uit ECMWF en trekt de bias eraf', () => {
    const dagen = berekenDagen(kalmEc(), kalmGfs(), {}, 1, GISTER_VER_WEG);
    expect(dagen[0].best).toBe(19); // EC-mediaan 20 min bias 1; GFS (23) telt niet mee
    expect(dagen[0].min).toBe(12);  // EC-min-mediaan 13 min bias 1
    expect(dagen[0].lo).toBe(18);
    expect(dagen[0].hi).toBe(20);
  });

  it('laat Harmonie de temperatuur overnemen op dag 0 tot en met 2, ongecorrigeerd', () => {
    const harmonie = Object.fromEntries(DATUMS.map((d) => [d, { max: 25, min: 15 }]));
    const dagen = berekenDagen(kalmEc(), kalmGfs(), harmonie, 1, DATUMS[0]);
    expect(dagen[0].best).toBe(25);
    expect(dagen[2].best).toBe(25);
    expect(dagen[2].min).toBe(15);
    expect(dagen[3].best).toBe(19); // buiten het 48-uurswindow: gewoon EC min bias
  });

  it('negeert Harmonie voor dagen die al voorbij zijn', () => {
    const harmonie = { [DATUMS[0]]: { max: 25, min: 15 } };
    const dagen = berekenDagen(kalmEc(), kalmGfs(), harmonie, 0, DATUMS[1]);
    expect(dagen[0].best).toBe(20);
  });

  it('rekt de band op tot om de Harmonie-schatting heen', () => {
    const harmonie = { [DATUMS[0]]: { max: 27, min: 15 } };
    const dagen = berekenDagen(kalmEc(), kalmGfs(), harmonie, 0, DATUMS[0]);
    expect(dagen[0].hi).toBe(27);
    expect(dagen[0].lo).toBeLessThanOrEqual(27);
  });

  it('poolt de regenkans over beide ensembles en kalibreert hem', () => {
    const ec = kalmEc({ precipitation_sum: [0, 0, 0] });
    const gfs = kalmGfs({ precipitation_sum: [2, 2, 2] }); // 3 natte GFS-leden
    const dagen = berekenDagen(ec, gfs, {}, 0, GISTER_VER_WEG);
    expect(dagen[0].kans).toBe(43); // 3 van 6 gepoolde leden nat = 50%, gekalibreerd 43
    expect(dagen[0].kansGfs).toBe(100);
  });

  it('telt de leden van beide ensembles op', () => {
    const dagen = berekenDagen(kalmEc(), kalmGfs(), {}, 0, GISTER_VER_WEG);
    expect(dagen[0].leden).toBe(5);
  });
});

describe('tekstregels', () => {
  it('kiest het icoon langs de kans- en mm-grenzen', () => {
    expect(iconVoor(50, 2.5)).toBe('rain');
    expect(iconVoor(80, 1.5)).toBe('rain');
    expect(iconVoor(80, 1.4)).toBe('drizzle');
    expect(iconVoor(72, 0)).toBe('drizzle');
    expect(iconVoor(71, 0)).toBe('partly-cloudy-day-drizzle');
    expect(iconVoor(60, 1.8)).toBe('drizzle');
    expect(iconVoor(55, 0)).toBe('partly-cloudy-day-drizzle');
    expect(iconVoor(35, 0)).toBe('partly-cloudy-day');
    expect(iconVoor(34, 0)).toBe('clear-day');
  });

  it('geeft druppels langs de mm-grenzen', () => {
    expect(druppels(5)).toBe(4);
    expect(druppels(2.5)).toBe(3);
    expect(druppels(1.2)).toBe(2);
    expect(druppels(0.5)).toBe(1);
    expect(druppels(0.4)).toBe(0);
  });

  it('formuleert de grote kaarten langs de kansgrenzen', () => {
    expect(zinGroot(80, 2)).toBe('reken op een paar buien');
    expect(zinGroot(80, 1.9)).toBe('grote kans op een bui');
    expect(zinGroot(70, 0)).toBe('grote kans op een bui');
    expect(zinGroot(55, 0)).toBe('hooguit even schuilen');
    expect(zinGroot(40, 0)).toBe('waarschijnlijk droog');
    expect(zinGroot(39, 0)).toBe('vrijwel zeker droog');
  });

  it('waarschuwt in de reisrijen voor wind vanaf 40 km/u', () => {
    expect(zinKlein(30, 0, 39)).toBe('waarschijnlijk droog');
    expect(zinKlein(30, 0, 40)).toBe('waarschijnlijk droog, en stevige wind: zet alles goed vast');
  });
});

describe('bouwWeerdata', () => {
  const NU = new Date('2026-08-22T04:46:26.921Z');

  it('schrijft de run-tijd in Amsterdamse tijd, zoals de poster hem toont', () => {
    const dagen = berekenDagen(kalmEc(), kalmGfs(), {}, 0, GISTER_VER_WEG);
    const w = bouwWeerdata(dagen, NU);
    expect(w.runAt).toBe('2026-08-22T04:46:26.921Z');
    expect(w.runAtText).toBe('22 augustus 2026, 06:46');
  });

  it('bouwt de festivalkaarten en reisrijen op de juiste dagen', () => {
    const dagen = berekenDagen(kalmEc(), kalmGfs(), {}, 0, GISTER_VER_WEG);
    const w = bouwWeerdata(dagen, NU);
    expect(w.groot.map((g) => g.dag)).toEqual(['VR 21', 'ZA 22', 'ZO 23']);
    expect(w.klein.map((k) => k.rol)).toEqual(['OPBOUW · WO 19', 'AANKOMST · DO 20', 'NAAR HUIS · MA 24']);
    expect(w.days).toEqual(['wo 19', 'do 20', 'vr 21', 'za 22', 'zo 23', 'ma 24']);
  });

  it('kopt op hitte zodra de bovenkant van de band 28 raakt', () => {
    const dagen = berekenDagen(kalmEc({ temperature_2m_max: [27, 28, 29] }), kalmGfs(), {}, 0, GISTER_VER_WEG);
    expect(bouwWeerdata(dagen, NU).verdict.kop).toBe('WARM, DRINK GENOEG WATER');
  });

  it('kopt op de poncho zodra p90 van de regen 20 mm raakt', () => {
    const ec = kalmEc({ precipitation_sum: [0, 4, [20, 0, 0, 0, 0, 0]] });
    const dagen = berekenDagen(ec, kalmGfs(), {}, 0, GISTER_VER_WEG);
    const w = bouwWeerdata(dagen, NU);
    expect(w.verdict.kop).toBe('HOU DE PONCHO KLAAR');
  });

  it('kopt geruststellend zonder hitte of noodweer', () => {
    const dagen = berekenDagen(kalmEc(), kalmGfs(), {}, 0, GISTER_VER_WEG);
    expect(bouwWeerdata(dagen, NU).verdict.kop).toBe('GEEN HITTE, GEEN NOODWEER');
  });

  it('benoemt de natste dag vóór het festival apart', () => {
    const ec = kalmEc({ precipitation_sum: [[0, 6, 0, 0, 0, 0], [0, 6, 0, 0, 0, 0], [0, 6, 0, 0, 0, 0]] });
    const w = bouwWeerdata(berekenDagen(ec, kalmGfs(), {}, 0, GISTER_VER_WEG), NU);
    expect(w.verdict.tekst).toContain('De meeste regen valt vóór het festival, op donderdag.');
  });

  it('benoemt een natte festivaldag gewoon als natste dag', () => {
    const ec = kalmEc({ precipitation_sum: [[0, 0, 0, 6, 0, 0], [0, 0, 0, 6, 0, 0], [0, 0, 0, 6, 0, 0]] });
    const w = bouwWeerdata(berekenDagen(ec, kalmGfs(), {}, 0, GISTER_VER_WEG), NU);
    expect(w.verdict.tekst).toContain('De natste dag wordt zaterdag.');
  });

  it('waarschuwt voor het afbreken zodra de laatste dag nat oogt', () => {
    const nat = [0, 0, 0, 0, 0, 6];
    const ec = kalmEc({ precipitation_sum: [nat, nat, nat] });
    const gfs = kalmGfs({ precipitation_sum: [nat, nat] });
    const w = bouwWeerdata(berekenDagen(ec, gfs, {}, 0, GISTER_VER_WEG), NU);
    expect(w.verdict.tekst).toContain('Maandag, bij het afbreken, kan het weer nat worden.');
  });

  it('houdt de festivaldagen-zin droog onder de 70% gemiddelde kans', () => {
    const w = bouwWeerdata(berekenDagen(kalmEc(), kalmGfs(), {}, 0, GISTER_VER_WEG), NU);
    expect(w.verdict.tekst).toContain('De festivaldagen zelf zijn meestal droog, met hooguit een buitje.');
  });

  it('waarschuwt op de festivaldagen vanaf 70% gemiddelde kans', () => {
    const nat = [0, 0, 6, 6, 6, 0];
    const ec = kalmEc({ precipitation_sum: [nat, nat, nat] });
    const gfs = kalmGfs({ precipitation_sum: [nat, nat] });
    const w = bouwWeerdata(berekenDagen(ec, gfs, {}, 0, GISTER_VER_WEG), NU);
    expect(w.verdict.tekst).toContain('Ook op de festivaldagen is een bui goed mogelijk.');
  });
});
