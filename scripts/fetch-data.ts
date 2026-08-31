#!/usr/bin/env bun
// Orkestratie: haalt per festival de modeldata op, rekent de editie door en
// schrijft festivals/<slug>/data.js (window.WEERDATA) waar de poster op draait.
// Zonder argument alle festivals; met een slug alleen dat festival.
// De inhoud zit in scripts/lib/: editie (type), openmeteo (API's),
// statistiek (kwantielen + kalibratie) en weerdata (cijfers + teksten).

import { SLUGS, laadEditie } from '../festivals/index';
import type { Editie } from './lib/editie';
import { haalEnsemble, haalHarmonie, haalBias } from './lib/openmeteo';
import { berekenDagen, bouwWeerdata } from './lib/weerdata';
import { r1 } from './lib/statistiek';

async function verwerk(editie: Editie) {
  // Na afloop van het festival heeft de forecast-API de festivaldagen niet meer;
  // dan blijft de laatste data.js staan in plaats van dat de build crasht.
  if (new Date().toISOString().slice(0, 10) > editie.end) {
    console.log(`${editie.slug}: festival voorbij (${editie.end}); bestaande data.js blijft staan`);
    return;
  }

  const ec = await haalEnsemble(editie, 'ecmwf_ifs025');
  const gfs = await haalEnsemble(editie, 'gfs05');
  const [harmonie, bias] = await Promise.all([haalHarmonie(editie), haalBias(editie)]);
  if (bias) console.log(`${editie.slug}: biascorrectie: ECMWF zat afgelopen week gemiddeld ${r1(bias)}° ernaast, gaat eraf`);

  const vandaag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date());
  const dagen = berekenDagen(editie, ec, gfs, harmonie, bias, vandaag);
  const WEERDATA = bouwWeerdata(editie, dagen, new Date());

  await Bun.write(new URL(`../festivals/${editie.slug}/data.js`, import.meta.url), 'window.WEERDATA = ' + JSON.stringify(WEERDATA, null, 2) + ';\n');
  console.log(`${editie.slug}: data.js geschreven · ${WEERDATA.leden} leden · run ${WEERDATA.runAtText}`);
  console.log(`${editie.slug}: temp best:`, WEERDATA.chartTemp.best.join(', '));
  console.log(`${editie.slug}: regen med:`, WEERDATA.chartRain.med.join(', '), '· kans:', dagen.map((d) => d.kans).join(', '));
}

const gekozen = process.argv[2];
const slugs = gekozen ? [gekozen] : [...SLUGS];
for (const slug of slugs) await verwerk(await laadEditie(slug));
