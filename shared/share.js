// Deelbalk voor de webversie: Twitter-intent + Instagram story-graphic (1080x1920)
// gegenereerd uit window.WEERDATA in de pixelstijl van de poster. Festival-eigen
// tekenwerk (gradient, wordmark, silhouet) komt uit window.FESTIVAL (theme.js).
// Alleen geladen door index.html.
(function () {
  const D = window.WEERDATA;
  const F = window.FESTIVAL;
  const SITE = D.festival.site + '/';
  const CSS = getComputedStyle(document.documentElement);
  const C = (n) => CSS.getPropertyValue(n).trim();

  const TWITTER_PAD = 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z';
  const INSTA_PAD = 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z';
  const glyph = (pad) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${pad}"/></svg>`;

  /* ---------- UI ---------- */
  const bar = document.createElement('div');
  bar.className = 'deelbar';
  bar.innerHTML = `
    <span class="deel-label">DEEL</span>
    <button class="deel-knop" id="deelTwitter" type="button" aria-label="Deel op Twitter">${glyph(TWITTER_PAD)}</button>
    <button class="deel-knop" id="deelInsta" type="button" aria-label="Deel op Instagram">${glyph(INSTA_PAD)}</button>
  `;
  document.body.appendChild(bar);

  const toast = document.createElement('div');
  toast.className = 'deel-toast';
  document.body.appendChild(toast);
  let toastTimer;
  function melding(tekst) {
    toast.textContent = tekst;
    toast.classList.add('zichtbaar');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('zichtbaar'), 5000);
  }

  /* ---------- Twitter ---------- */
  document.getElementById('deelTwitter').addEventListener('click', () => {
    const tekst = `Wordt het nat op ${D.festival.naam}? De verwachting uit ${D.leden} weerberekeningen, elke 4 uur ververst:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tekst)}&url=${encodeURIComponent(SITE)}`;
    window.open(url, '_blank', 'noopener');
  });

  /* ---------- Instagram: story-graphic ---------- */
  async function laadIcoon(naam) {
    const res = await fetch(`assets/icons/${naam}.svg`);
    let svg = await res.text();
    // viewBox-only SVG's hebben geen intrinsieke maat; die is nodig voor drawImage
    svg = svg.replace('<svg ', '<svg width="512" height="512" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise((ok, nee) => { img.onload = ok; img.onerror = nee; img.src = url; });
    URL.revokeObjectURL(url);
    return img;
  }

  function korrel(ctx, W, H) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = C('--ink');
    for (let i = 0; i < 9000; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
    ctx.restore();
  }

  async function maakStory() {
    await Promise.all((F.fontLoads || []).map((f) => document.fonts.load(f)));
    const iconen = await Promise.all(D.groot.map((d) => laadIcoon(d.icon)));

    const W = 1080, H = 1920;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // de festival-gradient zoals op de poster
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    for (const [stop, kleur] of F.gradient) gr.addColorStop(stop, kleur);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);

    const STRIP = 104; // lichte strip onderin
    F.silhouetCanvas(ctx, C, W - 40, H - STRIP);

    // wordmark linksboven
    F.wordmarkCanvas(ctx, C, 64, 148);

    // rechtsboven
    ctx.textAlign = 'right';
    ctx.fillStyle = C('--accent2');
    F.displayFont(ctx, 40);
    ctx.fillText('HET WEER', W - 64, 120);
    ctx.fillStyle = C('--accent');
    F.displayFont(ctx, 22, 400);
    const regels = [D.festival.periode, D.festival.plaats.toUpperCase(), 'ELKE 4 UUR VERS'];
    regels.forEach((r, i) => ctx.fillText(r, W - 64, 176 + i * 46));

    // verdict
    ctx.textAlign = 'left';
    ctx.fillStyle = C('--accent2');
    F.displayFont(ctx, 42);
    ctx.fillText(D.verdict.kop, 64, 430, W - 128);

    // dag-rijen met scheidingslijnen in de accentkleur
    const n = D.groot.length;
    const rijH = n >= 3 ? 340 : 460;
    const rijY = (i) => (n >= 3 ? 560 : 640) + i * rijH;
    const lichtVanaf = F.lichtVanaf ?? 0.62;
    D.groot.forEach((d, i) => {
      const y = rijY(i);
      if (i > 0) {
        ctx.strokeStyle = C('--accent');
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(64, y - 34); ctx.lineTo(W - 64, y - 34); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // rijen op het lichte deel van de gradient krijgen donkere tekst
      const licht = (y + 110) / H >= lichtVanaf;
      const accent = licht ? C('--donker') : C('--accent');
      const basis = licht ? C('--donker') : C('--licht');
      ctx.drawImage(iconen[i], 56, y + 10, 220, 220);
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      F.displayFont(ctx, 34);
      ctx.fillText(d.dag, 320, y + 70);
      ctx.fillStyle = basis;
      F.bodyFont(ctx, 30);
      ctx.fillText(`${d.kans}% kans op een bui`, 320, y + 130);
      F.bodyFont(ctx, 27, { gewicht: 500, cursief: true });
      ctx.save();
      ctx.fillStyle = basis;
      ctx.globalAlpha = 0.85;
      ctx.fillText(d.zin, 320, y + 178);
      ctx.restore();
      ctx.textAlign = 'right';
      ctx.fillStyle = basis;
      F.displayFont(ctx, 110);
      ctx.fillText(`${d.max}`, W - 120, y + 160);
      F.bodyFont(ctx, 60);
      ctx.fillText('°', W - 84, y + 96);
    });

    // lichte strip onderin
    ctx.fillStyle = C('--licht');
    ctx.fillRect(0, H - STRIP, W, STRIP);
    ctx.textAlign = 'left';
    ctx.fillStyle = C('--donker');
    F.displayFont(ctx, 17, 400);
    ctx.fillText('ONAFHANKELIJK FAN-PROJECT', 56, H - STRIP + 62);
    ctx.textAlign = 'right';
    F.displayFont(ctx, 30);
    ctx.fillText(D.festival.siteLabel, W - 56, H - STRIP + 66);

    korrel(ctx, W, H);
    return new Promise((ok) => cv.toBlob((b) => ok(b), 'image/png'));
  }

  window.__maakStory = maakStory; // voor tests

  document.getElementById('deelInsta').addEventListener('click', async () => {
    const knop = document.getElementById('deelInsta');
    knop.disabled = true;
    try {
      const blob = await maakStory();
      const file = new File([blob], `${D.festival.slug}-weer.png`, { type: 'image/png' });
      try { await navigator.clipboard.writeText(SITE); } catch {}
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        melding('De link staat op je klembord: plak hem in Instagram in de linksticker.');
        await navigator.share({ files: [file], title: `${D.festival.naam} ${D.festival.jaar} · het weer`, text: SITE });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${D.festival.slug}-weer.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        melding('Story-graphic gedownload en de link staat op je klembord: plak hem in Instagram in de linksticker.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') melding('Delen lukte niet, probeer het nog eens.');
    } finally {
      knop.disabled = false;
    }
  });
})();
