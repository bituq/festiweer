#!/usr/bin/env bun
// Bouwt de complete site in site/: per festival een map met de webversie
// (index.html = poster.html + viewport/OG/web.css/share.js) plus alle assets,
// en op de root een landingspagina die de festivals aan elkaar rijgt.
// Alles wordt per festival gekopieerd zodat site/<slug>/ zelfstandig werkt
// (ook voor de lokale poster-render met scripts/render.ts).

import { mkdir, readdir, rm } from 'node:fs/promises';
import { SLUGS, laadEditie } from '../festivals/index';
import type { Editie } from './lib/editie';

const root = (p: string) => new URL(`../${p}`, import.meta.url);
const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌦</text></svg>">`;

function ogTags(editie: Editie): string {
  const titel = `${editie.naam} ${editie.jaar} · het weer`;
  return [
    `<meta property="og:title" content="${titel}">`,
    `<meta property="og:description" content="${editie.ogBeschrijving}">`,
    `<meta property="og:url" content="${editie.site}/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:image" content="${editie.site}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${editie.site}/og.png">`,
    `<meta name="description" content="${editie.ogBeschrijving}">`,
  ].join('\n');
}

async function kopieer(van: URL, naar: URL, hervorm?: (tekst: string) => string) {
  if (hervorm) await Bun.write(naar, hervorm(await Bun.file(van).text()));
  else await Bun.write(naar, Bun.file(van));
}

async function bouwFestival(editie: Editie) {
  const uit = `site/${editie.slug}`;
  await mkdir(root(`${uit}/assets/icons`).pathname, { recursive: true });

  // poster.html → webversie met viewport, OG-tags, web.css en de deelbalk
  let html = await Bun.file(root(`festivals/${editie.slug}/poster.html`)).text();
  await Bun.write(root(`${uit}/poster.html`), html);
  html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${FAVICON}\n${ogTags(editie)}`);
  html = html.replace('<link rel="stylesheet" href="theme.css">', '<link rel="stylesheet" href="theme.css">\n<link rel="stylesheet" href="web.css">');
  html = html.replace('</body>', '<script src="share.js" defer></script>\n</body>');
  await Bun.write(root(`${uit}/index.html`), html);

  // gedeelde engine + festival-eigen bestanden
  for (const f of ['poster.css', 'poster.js', 'share.js', 'web.css']) await kopieer(root(`shared/${f}`), root(`${uit}/${f}`));
  for (const f of ['theme.css', 'theme.js', 'data.js']) await kopieer(root(`festivals/${editie.slug}/${f}`), root(`${uit}/${f}`));
  const og = root(`festivals/${editie.slug}/og.png`);
  if (await Bun.file(og).exists()) await kopieer(og, root(`${uit}/og.png`));

  // weericonen: een festival met een eigen set (festivals/<slug>/icons/)
  // gebruikt die; anders de gedeelde pixel-set
  const eigenIcons = root(`festivals/${editie.slug}/icons`).pathname;
  const iconDir = await Bun.file(`${eigenIcons}/rain.svg`).exists() ? eigenIcons : root('shared/icons').pathname;
  for (const naam of await readdir(iconDir)) {
    await kopieer(new URL(`file://${iconDir}/${naam}`), root(`${uit}/assets/icons/${naam}`));
  }
  console.log(`site/${editie.slug}/ gebouwd`);
}

// De eigen festiweer-identiteit: een meteogram. Kaartpapier met fijn raster,
// mono-labels en een bundel ensemble-lijnen die naar rechts uitwaaiert (de
// onzekerheid groeit) met één blauwe mediaan. De festivalkaarten dragen elk
// de display-font en gradient van het festival zelf.
function ensembleLijnen(): string {
  let seed = 20260905;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const lijn = (dikte: number, kleur: string, alfa: number) => {
    let y = 110, drift = (rnd() - 0.5) * 2;
    let pts = `-4,110`;
    for (let x = 40; x <= 1240; x += 40) {
      drift += (rnd() - 0.5) * 2.4;
      y += drift * (x / 1240) * 2.6;
      y = Math.max(26, Math.min(196, y));
      pts += ` ${x},${Math.round(y * 10) / 10}`;
    }
    return `<polyline points="${pts}" fill="none" stroke="${kleur}" stroke-opacity="${alfa}" stroke-width="${dikte}" stroke-linejoin="round"/>`;
  };
  const lijnen: string[] = [];
  for (let i = 0; i < 19; i++) lijnen.push(lijn(1, '#1C2620', 0.15));
  lijnen.push(lijn(2.2, '#2456D6', 0.85));
  return `<svg class="ensemble" viewBox="0 0 1240 220" preserveAspectRatio="none" aria-hidden="true">${lijnen.join('')}</svg>`;
}

function landing(edities: Editie[]): string {
  const kaarten = edities.map((e) => `
  <a class="kaart kaart-${e.slug}" href="${e.slug}/">
    <span class="naam">${e.naam.toUpperCase()}</span>
    <span class="meta">${e.periode} · ${e.plaats.toUpperCase()}</span>
    <span class="pijl">NAAR DE VERWACHTING &gt;</span>
  </a>`).join('\n');
  const kaartStijlen = edities.map((e) => `
  .kaart-${e.slug} { background: ${e.kaart.gradient}; color: ${e.kaart.tekst}; }
  .kaart-${e.slug} .naam { ${e.kaart.naamStijl} }
  .kaart-${e.slug} .pijl { color: ${e.kaart.accent}; }`).join('\n');

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${FAVICON}
<title>festiweer · festivalweer uit de ensembles</title>
<meta name="description" content="Onafhankelijke festival-weersverwachtingen uit tientallen weerberekeningen, elke 4 uur ververst.">
<meta property="og:title" content="festiweer">
<meta property="og:description" content="Onafhankelijke festival-weersverwachtingen uit tientallen weerberekeningen, elke 4 uur ververst.">
<meta property="og:url" content="https://festiweer.nl/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=IBM+Plex+Mono:wght@400;600&family=Silkscreen:wght@700&family=Archivo:wdth,wght@125,900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: #F3F0E6; color: #1C2620;
    font-family: 'IBM Plex Mono', monospace;
    background-image:
      linear-gradient(rgba(28,38,32,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(28,38,32,0.05) 1px, transparent 1px);
    background-size: 44px 44px;
    display: flex; flex-direction: column; align-items: center; padding: 0 20px 44px;
  }
  header { position: relative; width: 100%; max-width: 640px; padding: 12vh 0 30px; }
  .ensemble { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 120vw; max-width: 1240px; height: 220px; pointer-events: none; }
  h1 { position: relative; margin: 0; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: clamp(44px, 9vw, 72px); letter-spacing: -0.02em; line-height: 1; }
  h1 b { font-weight: 700; color: #2456D6; }
  .sub { position: relative; margin-top: 14px; font-size: 13px; line-height: 1.7; color: rgba(28,38,32,0.78); max-width: 46ch; }
  .kaarten { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 640px; }
  .kaart { display: flex; flex-direction: column; gap: 8px; padding: 24px 24px 20px; text-decoration: none; border: 1px solid rgba(28,38,32,0.3); box-shadow: 4px 4px 0 rgba(28,38,32,0.18); }
  .kaart .meta { font-size: 11px; letter-spacing: 0.5px; opacity: 0.92; }
  .kaart .pijl { margin-top: 14px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
  .kaart:hover .pijl { text-decoration: underline; }
${kaartStijlen}
  footer { margin-top: auto; padding-top: 9vh; font-size: 11px; color: rgba(28,38,32,0.55); text-align: center; line-height: 1.8; max-width: 640px; }
</style>
</head>
<body>
  <header>
    ${ensembleLijnen()}
    <h1>festi<b>weer</b></h1>
    <div class="sub">Festivalweer uit de ensembles: tientallen weerberekeningen per festival, elke 4 uur ververst, in de designtaal van het festival zelf.</div>
  </header>
  <div class="kaarten">${kaarten}
  </div>
  <footer>Onafhankelijk fan-project, niet verbonden aan de festivals of hun organisaties.<br>Modeldata via Open-Meteo (ECMWF, GFS, KNMI Harmonie).</footer>
</body>
</html>
`;
}

await rm(root('site').pathname, { recursive: true, force: true });
const edities = await Promise.all(SLUGS.map((s) => laadEditie(s)));
for (const e of edities) await bouwFestival(e);
await Bun.write(root('site/index.html'), landing(edities));
console.log('site/index.html (landing) gebouwd');
