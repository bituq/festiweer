# lowlands-weer

Weerposter en -site voor Lowlands in de designtaal van het festival: een sunset-gradient van nachtpaars naar oranje met pixel-typografie, pixel-weericonen, de festivaltorens als silhouet en een vleugje riso-korrel. Gebouwd uit de ensemble-runs van ECMWF (51 leden) en GFS (31 leden) via Open-Meteo.

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

De weericonen (`assets/icons/pixel-*.svg`) zijn eigen pixel-art op een 24x24-grid (rects met `shape-rendering: crispEdges`). `fetch-data.ts` kiest per dag een van de vijf varianten (clear-day, partly-cloudy-day, partly-cloudy-day-drizzle, drizzle, rain).

## Fonts en kleuren

Silkscreen (pixel, display) + Schibsted Grotesk (lopende tekst), via Google Fonts. Let op: Silkscreen heeft geen `°`-glyph, daarom zit het gradenteken in een aparte `span` met de bodytekst-font. Palet komt van lowlands.nl 2026 (paars, mint, geel, cream, oranje) op een doorlopende sunset-gradient; de korrel is een SVG-feTurbulence-tile als data-URI en de torens worden in JS als gestapelde pixel-rects opgebouwd.
