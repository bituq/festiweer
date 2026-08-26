import { describe, it, expect } from 'bun:test';
import { DATUMS, DAYS, DAGNAMEN, FESTIVAL_IDX, KLEIN_ROLLEN, START, END } from '../editie';

describe('editie', () => {
  it('leidt de datumreeks inclusief begin en eind af', () => {
    expect(DATUMS[0]).toBe(START);
    expect(DATUMS[DATUMS.length - 1]).toBe(END);
    expect(DATUMS).toEqual(['2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24']);
  });

  it('leidt de daglabels af zoals de poster ze toont', () => {
    expect(DAYS).toEqual(['wo 19', 'do 20', 'vr 21', 'za 22', 'zo 23', 'ma 24']);
    expect(DAGNAMEN).toEqual(['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag']);
  });

  it('houdt alle rol-indices binnen de dagenreeks', () => {
    for (const i of FESTIVAL_IDX) expect(i).toBeLessThan(DATUMS.length);
    for (const [i] of KLEIN_ROLLEN) expect(i).toBeLessThan(DATUMS.length);
  });
});
