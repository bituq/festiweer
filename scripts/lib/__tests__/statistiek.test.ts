import { describe, it, expect } from 'bun:test';
import { stats, kalibreer, r1 } from '../statistiek';

const daily = (naam: string, members: (number | null)[][]) => {
  const d: Record<string, unknown> = {};
  members.forEach((vals, i) => { d[i === 0 ? naam : `${naam}_member${String(i).padStart(2, '0')}`] = vals; });
  return d;
};

describe('stats', () => {
  it('neemt de mediaan over de leden, ongesorteerde invoer', () => {
    const d = daily('temperature_2m_max', [[19], [21], [17]]);
    expect(stats([d], 'temperature_2m_max', 0).med).toBe(19);
  });

  it('middelt de twee middelste leden bij een even aantal', () => {
    const d = daily('temperature_2m_max', [[18], [20], [22], [24]]);
    expect(stats([d], 'temperature_2m_max', 0).med).toBe(21);
  });

  it('geeft p10 en p90 uit de gesorteerde leden', () => {
    const d = daily('temperature_2m_max', [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]);
    const s = stats([d], 'temperature_2m_max', 0);
    expect(s.p10).toBe(2);
    expect(s.p90).toBe(10);
    expect(s.n).toBe(10);
  });

  it('poolt de leden van meerdere ensembles', () => {
    const ec = daily('precipitation_sum', [[0], [0]]);
    const gfs = daily('precipitation_sum', [[4], [4]]);
    const s = stats([ec, gfs], 'precipitation_sum', 0);
    expect(s.n).toBe(4);
    expect(s.med).toBe(2);
    expect(s.prob1mm).toBe(50);
  });

  it('pakt alleen de gevraagde variabele, niet de buurvelden', () => {
    const d = { ...daily('temperature_2m_max', [[20]]), ...daily('temperature_2m_min', [[5]]) };
    expect(stats([d], 'temperature_2m_max', 0).med).toBe(20);
  });

  it('filtert null en undefined weg', () => {
    const d = daily('temperature_2m_max', [[null], [20], [null]]);
    const s = stats([d], 'temperature_2m_max', 0);
    expect(s.med).toBe(20);
    expect(s.n).toBe(1);
  });

  it('gooit als geen enkel lid een waarde heeft', () => {
    const d = daily('temperature_2m_max', [[null], [null]]);
    expect(() => stats([d], 'temperature_2m_max', 0)).toThrow('geen waardes voor temperature_2m_max dag 0');
  });

  it('telt voor prob1mm alleen leden vanaf precies 1 mm', () => {
    const d = daily('precipitation_sum', [[0], [0.9], [1], [3]]);
    expect(stats([d], 'precipitation_sum', 0).prob1mm).toBe(50);
  });
});

describe('kalibreer', () => {
  it('laat de knikpunten zelf ongemoeid waar de verificatie klopte', () => {
    expect(kalibreer(0)).toBe(0);
    expect(kalibreer(100)).toBe(100);
  });

  it('drukt de blufferige middenkansen in', () => {
    expect(kalibreer(40)).toBe(38);
    expect(kalibreer(60)).toBe(48);
    expect(kalibreer(80)).toBe(74);
  });

  it('interpoleert lineair tussen de knikpunten', () => {
    expect(kalibreer(50)).toBe(43);
    expect(kalibreer(70)).toBe(61);
    expect(kalibreer(90)).toBe(87);
  });

  it('blijft monotoon over het hele bereik', () => {
    let vorige = -1;
    for (let k = 0; k <= 100; k++) {
      const v = kalibreer(k);
      expect(v).toBeGreaterThanOrEqual(vorige);
      vorige = v;
    }
  });
});

describe('r1', () => {
  it('rondt af op één decimaal', () => {
    expect(r1(19.96)).toBe(20);
    expect(r1(19.94)).toBe(19.9);
    expect(r1(-0.35)).toBe(-0.3);
  });
});
