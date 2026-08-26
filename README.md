# lowlands-weer

Weerposter en -site voor Lowlands in de designtaal van het festival: een sunset-gradient van nachtpaars naar oranje met pixel-typografie, pixel-weericonen, de festivaltorens als silhouet en een vleugje riso-korrel. Gebouwd uit de ensemble-runs van ECMWF (51 leden) en GFS (31 leden) via Open-Meteo. Sinds de verificatie van 2026 komt de temperatuur uit de ECMWF-leden met een lopende biascorrectie (previous-runs vs ERA5-archief) en neemt KNMI Harmonie de laatste 48 uur over; de regenkans komt uit alle 82 leden en gaat door een lichte kalibratiecurve. GFS bleek die editie structureel 2-3° te warm en telt daarom niet meer mee in de temperatuur.

## Hoe het werkt

- `scripts/fetch-data.ts` is de orkestratie: modeldata ophalen, doorrekenen, `data.js` (`window.WEERDATA`) schrijven. De inhoud zit in `scripts/lib/`:
  - `editie.ts` — alle editie-config (coördinaten, datums, rollen); daglabels worden uit de datums afgeleid. Volgende editie = alleen dit bestand aanpassen.
  - `openmeteo.ts` — al het API-verkeer: de ensembles, KNMI Harmonie en de biasmeting.
  - `statistiek.ts` — ensemble-kwantielen en de kanskalibratie (pure functies).
  - `weerdata.ts` — van modeldata naar cijfers, teksten, iconen, verdict en kaarten (pure functies).
- `poster.html` (markup) + `poster.css` (stijl) + `poster.js` (rendert alles uit `data.js`) vormen samen het ontwerp.
- `scripts/build-site.ts` genereert daaruit `index.html` (webversie: viewport-meta, OG-tags, `web.css` responsive overrides, `share.js` deelbalk).
- `scripts/render.ts` rendert de A4-PDF (leunt op de Puppeteer-install van de pdf-generator skill in `~/.claude/skills/pdf-generator`).

```sh
bun scripts/fetch-data.ts                                        # verse cijfers
bun scripts/build-site.ts                                        # index.html
bun scripts/render.ts poster.html lowlands-2026-weer.pdf preview.png  # PDF
bun test                                                         # unit tests (scripts/lib/__tests__)
```

## Website

GitHub Actions (`.github/workflows/update.yml`) draait elke 4 uur: verse data ophalen, site bouwen, deployen naar GitHub Pages. Ook handmatig te triggeren via workflow_dispatch.

## Iconen

De weericonen (`assets/icons/pixel-*.svg`) zijn eigen pixel-art op een 24x24-grid (rects met `shape-rendering: crispEdges`). `scripts/lib/weerdata.ts` kiest per dag een van de vijf varianten (clear-day, partly-cloudy-day, partly-cloudy-day-drizzle, drizzle, rain).

## Fonts en kleuren

Silkscreen (pixel, display) + Schibsted Grotesk (lopende tekst), via Google Fonts. Let op: Silkscreen heeft geen `°`-glyph, daarom zit het gradenteken in een aparte `span` met de bodytekst-font. Palet komt van lowlands.nl 2026 (paars, mint, geel, cream, oranje) op een doorlopende sunset-gradient; de korrel is een SVG-feTurbulence-tile als data-URI en de torens worden in JS als gestapelde pixel-rects opgebouwd.
