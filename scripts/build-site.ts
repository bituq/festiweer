#!/usr/bin/env bun
// Genereert index.html (webversie) uit poster.html: viewport-meta + web.css erbij.
const bron = new URL('../poster.html', import.meta.url);
const doel = new URL('../index.html', import.meta.url);

let html = await Bun.file(bron).text();
html = html.replace(
  '<meta charset="utf-8">',
  '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌦</text></svg>">'
);
html = html.replace('</style>', '</style>\n<link rel="stylesheet" href="web.css">');
await Bun.write(doel, html);
console.log('index.html gegenereerd uit poster.html');
