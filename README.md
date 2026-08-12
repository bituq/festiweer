# lowlands-weer

Weerposter voor Lowlands in de designtaal van het festival (pixel-typo, spikes, oranje/paars/lila). Gebouwd uit de ensemble-runs van ECMWF (51 leden) en GFS (31 leden) via Open-Meteo, plus de KNMI-vooruitzichten.

## Renderen

```sh
bun scripts/render.ts poster.html lowlands-2026-weer.pdf preview.png
```

Levert een full-bleed A4 PDF op. De renderer leunt op de Puppeteer-install van de pdf-generator skill in `~/.claude/skills/pdf-generator`.

## Data verversen

De cijfers staan hardcoded in `poster.html`: de arrays `BEST`/`P10`/`P90` in de grafiek en de `GROOT`/`KLEIN` dagkaarten. Verse cijfers haal je zo op:

```sh
curl "https://ensemble-api.open-meteo.com/v1/ensemble?latitude=52.437&longitude=5.763&daily=temperature_2m_max,precipitation_sum,wind_gusts_10m_max&models=ecmwf_ifs025,gfs05&timezone=Europe%2FAmsterdam&start_date=2026-08-19&end_date=2026-08-24"
```

`BEST` is het gemiddelde van de twee ensemble-medianen, de band is min(p10) t/m max(p90) over beide ensembles. De regenkans per dag is het percentage leden met minstens 1 mm.

## Fonts en kleuren

Silkscreen (pixel, display) + Schibsted Grotesk (lopende tekst), via Google Fonts. Let op: Silkscreen heeft geen `°`-glyph, daarom zit het gradenteken in een aparte `span` met de bodytekst-font. Palet komt van lowlands.nl 2026: oranje sunset, paars, lila, rood, mint, cream.
