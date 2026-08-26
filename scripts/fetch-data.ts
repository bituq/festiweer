#!/usr/bin/env bun
// Orkestratie: haalt de modeldata op, rekent de editie door en schrijft data.js
// (window.WEERDATA) waar poster.html en index.html op draaien.
// De inhoud zit in scripts/lib/: editie (config), openmeteo (API's),
// statistiek (kwantielen + kalibratie) en weerdata (cijfers + teksten).

import { END } from './lib/editie';
import { haalEnsemble, haalHarmonie, haalBias } from './lib/openmeteo';
import { berekenDagen, bouwWeerdata } from './lib/weerdata';
import { r1 } from './lib/statistiek';

// Na afloop van het festival heeft de forecast-API de festivaldagen niet meer;
// dan blijft de laatste data.js staan in plaats van dat de build crasht.
if (new Date().toISOString().slice(0, 10) > END) {
  console.log(`festival voorbij (${END}); bestaande data.js blijft staan`);
  process.exit(0);
}

const ec = await haalEnsemble('ecmwf_ifs025');
const gfs = await haalEnsemble('gfs05');
const [harmonie, bias] = await Promise.all([haalHarmonie(), haalBias()]);
if (bias) console.log(`biascorrectie: ECMWF zat afgelopen week gemiddeld ${r1(bias)}° ernaast, gaat eraf`);

const vandaag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date());
const dagen = berekenDagen(ec, gfs, harmonie, bias, vandaag);
const WEERDATA = bouwWeerdata(dagen, new Date());

await Bun.write(new URL('../data.js', import.meta.url), 'window.WEERDATA = ' + JSON.stringify(WEERDATA, null, 2) + ';\n');
console.log(`data.js geschreven · ${WEERDATA.leden} leden · run ${WEERDATA.runAtText}`);
console.log('temp best:', WEERDATA.chartTemp.best.join(', '));
console.log('regen med:', WEERDATA.chartRain.med.join(', '), '· kans:', dagen.map((d) => d.kans).join(', '));
