import { describe, it, expect } from 'bun:test';
import { EDITIE as LOWLANDS } from '../../../festivals/lowlands/editie';
import { EDITIE as DRAAIMOLEN } from '../../../festivals/draaimolen/editie';

describe('maakEditie', () => {
  it('leidt de datumreeks inclusief begin en eind af', () => {
    expect(LOWLANDS.datums[0]).toBe(LOWLANDS.start);
    expect(LOWLANDS.datums[LOWLANDS.datums.length - 1]).toBe(LOWLANDS.end);
    expect(LOWLANDS.datums).toEqual(['2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24']);
    expect(DRAAIMOLEN.datums).toEqual(['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
  });

  it('leidt de daglabels af zoals de poster ze toont', () => {
    expect(LOWLANDS.days).toEqual(['wo 19', 'do 20', 'vr 21', 'za 22', 'zo 23', 'ma 24']);
    expect(LOWLANDS.dagnamen).toEqual(['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag']);
    expect(DRAAIMOLEN.days).toEqual(['do 3', 'vr 4', 'za 5', 'zo 6']);
    expect(DRAAIMOLEN.dagnamen).toEqual(['donderdag', 'vrijdag', 'zaterdag', 'zondag']);
  });

  it('houdt alle rol-indices binnen de dagenreeks, voor elk festival', () => {
    for (const e of [LOWLANDS, DRAAIMOLEN]) {
      for (const i of e.festivalIdx) expect(i).toBeLessThan(e.datums.length);
      for (const [i] of e.kleinRollen) expect(i).toBeLessThan(e.datums.length);
    }
  });

  it('legt de Draaimolen-festivaldagen op vrijdag 4 en zaterdag 5 september', () => {
    expect(DRAAIMOLEN.festivalIdx.map((i) => DRAAIMOLEN.datums[i])).toEqual(['2026-09-04', '2026-09-05']);
  });
});
