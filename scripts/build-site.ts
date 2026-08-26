#!/usr/bin/env bun
// Genereert index.html (webversie) uit poster.html: viewport-meta + web.css erbij.
const bron = new URL('../poster.html', import.meta.url);
const doel = new URL('../index.html', import.meta.url);

const SITE = 'https://lowlands.festiweer.nl';
const OG = [
  `<meta property="og:title" content="Lowlands 2026 · het weer">`,
  `<meta property="og:description" content="De verwachting voor Biddinghuizen uit 82 weerberekeningen, elke 4 uur ververst.">`,
  `<meta property="og:url" content="${SITE}/">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:image" content="${SITE}/og.png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:image" content="${SITE}/og.png">`,
  `<meta name="description" content="De Lowlands-weersverwachting uit 82 weerberekeningen, elke 4 uur ververst.">`,
].join('\n');

let html = await Bun.file(bron).text();
html = html.replace(
  '<meta charset="utf-8">',
  '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌦</text></svg>">\n' + OG
);
html = html.replace(
  '<link rel="stylesheet" href="poster.css">',
  '<link rel="stylesheet" href="poster.css">\n<link rel="stylesheet" href="web.css">'
);
html = html.replace('</body>', '<script src="share.js" defer></script>\n</body>');
await Bun.write(doel, html);
console.log('index.html gegenereerd uit poster.html');
