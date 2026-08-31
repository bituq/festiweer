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

function landing(edities: Editie[]): string {
  const kaarten = edities.map((e) => `
  <a class="kaart" href="${e.slug}/" style="--kaart-gradient: ${e.kaart.gradient}; --kaart-tekst: ${e.kaart.tekst}; --kaart-accent: ${e.kaart.accent};">
    <span class="naam">${e.naam.toUpperCase()}</span>
    <span class="meta">${e.periode} · ${e.plaats.toUpperCase()}</span>
    <span class="pijl">NAAR DE VERWACHTING &gt;</span>
  </a>`).join('\n');

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
<link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Schibsted+Grotesk:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #14101F; color: #F4EBDA; font-family: 'Schibsted Grotesk', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 9vh 20px 40px; }
  .merk { font-family: 'Silkscreen', monospace; font-weight: 700; font-size: clamp(30px, 6.5vw, 54px); letter-spacing: 2px; }
  .sub { margin-top: 10px; font-size: 15px; color: rgba(244,235,218,0.75); text-align: center; }
  .kaarten { margin-top: 7vh; display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 560px; }
  .kaart { display: flex; flex-direction: column; gap: 7px; padding: 26px 26px 22px; text-decoration: none; box-shadow: 0 10px 34px rgba(0,0,0,0.4); background: var(--kaart-gradient); color: var(--kaart-tekst); }
  .kaart .naam { font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 26px; letter-spacing: 1px; }
  .kaart .meta { font-family: 'Silkscreen', monospace; font-weight: 400; font-size: 10px; letter-spacing: 1px; opacity: 0.9; }
  .kaart .pijl { margin-top: 12px; font-family: 'Silkscreen', monospace; font-weight: 700; font-size: 10px; color: var(--kaart-accent); }
  .kaart:hover .pijl { text-decoration: underline; }
  footer { margin-top: auto; padding-top: 8vh; font-size: 12px; color: rgba(244,235,218,0.55); text-align: center; line-height: 1.7; max-width: 560px; }
</style>
</head>
<body>
  <div class="merk">FESTIWEER</div>
  <div class="sub">Festivalweer uit de ensembles: tientallen weerberekeningen, elke 4 uur ververst.</div>
  <div class="kaarten">${kaarten}
  </div>
  <footer>Onafhankelijk fan-project, niet verbonden aan de festivals of hun organisaties. Modeldata via Open-Meteo (ECMWF, GFS, KNMI Harmonie).</footer>
</body>
</html>
`;
}

await rm(root('site').pathname, { recursive: true, force: true });
const edities = await Promise.all(SLUGS.map((s) => laadEditie(s)));
for (const e of edities) await bouwFestival(e);
await Bun.write(root('site/index.html'), landing(edities));
console.log('site/index.html (landing) gebouwd');
