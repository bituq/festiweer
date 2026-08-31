# festiweer

Weerposters en -sites voor festivals, elk in de designtaal van het festival zelf. Gebouwd uit de ensemble-runs van ECMWF (51 leden) en GFS (31 leden) via Open-Meteo. Sinds de Lowlands-verificatie van 2026 komt de temperatuur uit de ECMWF-leden met een lopende biascorrectie (previous-runs vs ERA5-archief) en neemt KNMI Harmonie de laatste 48 uur over; de regenkans komt uit alle 82 leden en gaat door een lichte kalibratiecurve. GFS bleek die editie structureel 2-3° te warm en telt daarom niet meer mee in de temperatuur.

## Festivals

- **lowlands** — sunset-gradient van nachtpaars naar oranje, Silkscreen-pixeltypografie, eigen pixel-weericonen, de festivaltorens als silhouet (palet van lowlands.nl 2026).
- **draaimolen** — naar de 2026-campagne op draaimolen.nu: teal-groen dat oplost in olijfgoud, brede vette grotesk in outline met verspringende letters (Archivo Expanded als vrije stand-in voor hun Druk Wide) met Inter, en een eigen indeling: dagbanden, een uurlijks meteogram, een AI-gegenereerd mistig dennenbos (`bos.png`) en de glas-orb als WebGL-shader die de achtergrond echt breekt en spiegelt (met nevel-achtergrondshader; alles met statische fallbacks bij reduced-motion of zonder WebGL).

## Hoe het werkt

- `festivals/<slug>/` is alles wat per festival verschilt:
  - `editie.ts` — de config (coördinaten, datums, rollen, teksten, normaaltemperatuur, landingskaart); daglabels worden uit de datums afgeleid. Nieuw festival = nieuwe map met deze bestanden, plus de slug in `festivals/index.ts`.
  - `poster.html` — de markup (wordmark, kopregels, footer).
  - `theme.css` — het palet als semantische slots (--nacht/--licht/--donker/--accent/--accent2/--signaal/--band/--ink), de gradient en de fonts.
  - `theme.js` — `window.FESTIVAL`: het silhouet (svg + canvas), het story-wordmark en de canvas-fonts.
  - `data.js` — de doorgerekende verwachting (`window.WEERDATA`), gecommit zodat de laatste stand bevroren blijft na afloop van het festival.
  - optioneel `icons/` — een eigen iconenset; anders wordt de gedeelde pixel-set gebruikt.
  - `og.html` + `og.png` — de share-image (eenmalig lokaal gerenderd).
- `shared/` is de engine, festival-agnostisch: `poster.css` (layout op de kleur-slots), `poster.js` (rendert alleen de secties die in de poster.html van het festival staan: kolommen of dagbanden, losse grafieken of één meteogram, reisrijen), `share.js` (deelbalk + Instagram-story), `web.css` (responsive overrides), `icons/` (pixel-set). Met `uurlijks: true` in de editie-config komt er een uurlijkse EC-reeks in data.js voor het meteogram.
- `scripts/fetch-data.ts [slug]` haalt de modeldata op en schrijft `festivals/<slug>/data.js`; zonder argument alle festivals. Na de einddatum van een festival slaat hij dat festival over. De inhoud zit in `scripts/lib/`: `editie` (type), `openmeteo` (API's), `statistiek` (kwantielen + kalibratie), `weerdata` (cijfers + teksten).
- `scripts/build-site.ts` bouwt alles naar `site/`: per festival een map (webversie met OG-tags + alle assets) en op de root een landingspagina uit de configs.
- `scripts/render.ts` rendert PDF's en PNG's (leunt op de Puppeteer-install van de pdf-generator skill in `~/.claude/skills/pdf-generator`).

```sh
bun scripts/fetch-data.ts                # verse cijfers, alle festivals
bun scripts/fetch-data.ts draaimolen     # of één festival
bun scripts/build-site.ts                # site/ (festivals + landing)
bun scripts/render.ts site/draaimolen/poster.html draaimolen-2026-weer.pdf preview.png
bun scripts/render.ts festivals/draaimolen/og.html - festivals/draaimolen/og.png --viewport 1200x630 --scale 1
bun test                                 # unit tests (scripts/lib/__tests__)
```

## Website

GitHub Actions (`.github/workflows/update.yml`) draait elke 4 uur: verse data voor alle lopende festivals, site bouwen, deployen naar GitHub Pages. Ook handmatig te triggeren via workflow_dispatch. De site draait op festiweer.nl met per festival een pad (`festiweer.nl/lowlands`, `festiweer.nl/draaimolen`); GitHub Pages kan maar één custom domain per repo aan, dus subdomeinen per festival kunnen niet vanuit één repo.

## Iconen

De gedeelde weericonen (`shared/icons/*.svg`) zijn pixel-art op een 24x24-grid (rects met `shape-rendering: crispEdges`). Draaimolen heeft een eigen organische set in dezelfde vijf varianten (clear-day, partly-cloudy-day, partly-cloudy-day-drizzle, drizzle, rain); `scripts/lib/weerdata.ts` kiest per dag een variant. Let op bij pixelfonts: Silkscreen heeft geen `°`-glyph, daarom zit het gradenteken in een aparte `span` met de bodytekst-font.
