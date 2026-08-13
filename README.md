# lowlands-weer

Weerposter en -site voor Lowlands in de designtaal van het festival (pixel-typo, spikes, oranje/paars/lila). Gebouwd uit de ensemble-runs van ECMWF (51 leden) en GFS (31 leden) via Open-Meteo.

## Hoe het werkt

- `scripts/fetch-data.ts` haalt de ensembles op, rekent alles door (medianen, p10/p90-band, regenkansen) en leidt de teksten, iconen en druppelmeters af via regels. Output: `data.js` (`window.WEERDATA`).
- `poster.html` is de enige bron voor het ontwerp; hij leest alles uit `data.js`.
- `scripts/build-site.ts` genereert daaruit `index.html` (webversie: viewport-meta + `web.css` responsive overrides).
- `scripts/render.ts` rendert de A4-PDF (leunt op de Puppeteer-install van de pdf-generator skill in `~/.claude/skills/pdf-generator`).

```sh
bun scripts/fetch-data.ts                                        # verse cijfers
bun scripts/build-site.ts                                        # index.html
bun scripts/render.ts poster.html lowlands-2026-weer.pdf preview.png  # PDF
```

## Website

GitHub Actions (`.github/workflows/update.yml`) draait elke 4 uur: verse data ophalen, site bouwen, deployen naar GitHub Pages. Ook handmatig te triggeren via workflow_dispatch.

## Iconen

De weericonen zijn [Meteocons](https://github.com/basmilius/weather-icons) van Bas Milius (MIT), lokaal in `assets/icons/`.

## Fonts en kleuren

Silkscreen (pixel, display) + Schibsted Grotesk (lopende tekst), via Google Fonts. Let op: Silkscreen heeft geen `°`-glyph, daarom zit het gradenteken in een aparte `span` met de bodytekst-font. Palet komt van lowlands.nl 2026: oranje sunset, paars, lila, rood, mint, cream.
