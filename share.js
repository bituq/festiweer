// Deelbalk voor de webversie: Twitter-intent + Instagram story-graphic (1080x1920)
// gegenereerd uit window.WEERDATA in de huisstijl. Alleen geladen door index.html.
(function () {
  const D = window.WEERDATA;
  const SITE = 'https://lowlands.festiweer.nl';
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
    const tekst = `Wordt het nat op Lowlands? De verwachting uit ${D.leden} weerberekeningen, elke 4 uur ververst:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tekst)}&url=${encodeURIComponent(SITE)}`;
    window.open(url, '_blank', 'noopener');
  });

  /* ---------- Instagram: story-graphic ---------- */
  async function laadIcoon(naam) {
    const res = await fetch(`assets/icons/line-${naam}.svg`);
    let svg = await res.text();
    // viewBox-only SVG's hebben geen intrinsieke maat; die is nodig voor drawImage
    svg = svg.replace('<svg ', '<svg width="512" height="512" ');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    await new Promise((ok, nee) => { img.onload = ok; img.onerror = nee; img.src = url; });
    URL.revokeObjectURL(url);
    return img;
  }

  function spikeRij(ctx, W, yBasis, hoogte, kleur, n) {
    const w = W / n;
    ctx.fillStyle = kleur;
    for (let i = 0; i < n; i++) {
      const x = i * w, top = (i % 2 === 0) ? 0 : hoogte * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, yBasis);
      ctx.lineTo(x + w / 2, yBasis - hoogte + top);
      ctx.lineTo(x + w, yBasis);
      ctx.closePath(); ctx.fill();
    }
  }

  // sticker: geroteerde rechthoek met harde schaduw en rand, tekent inhoud via callback
  function sticker(ctx, cx, cy, w, h, hoek, vulling, teken) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(hoek * Math.PI / 180);
    ctx.fillStyle = C('--schaduw');
    ctx.fillRect(-w / 2 + 14, -h / 2 + 14, w, h);
    ctx.fillStyle = vulling;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 6;
    ctx.strokeStyle = C('--donkerpaars');
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    teken(ctx, w, h);
    ctx.restore();
  }

  function confetti(ctx) {
    // vaste posities langs de randen, uit de buurt van tekst
    const plus = [[95, 560], [985, 620], [70, 1080], [1010, 1180], [120, 1560], [960, 470]];
    const drup = [[1000, 890], [85, 830], [950, 1500]];
    ctx.font = '700 44px Silkscreen';
    ctx.textAlign = 'center';
    plus.forEach(([x, y], i) => {
      ctx.fillStyle = [C('--mint'), C('--cream'), C('--lila')][i % 3];
      ctx.fillText('+', x, y);
    });
    drup.forEach(([x, y]) => {
      ctx.fillStyle = C('--mint');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 13, y + 18, x, y + 30);
      ctx.quadraticCurveTo(x - 13, y + 18, x, y);
      ctx.fill();
    });
  }

  async function maakStory() {
    await document.fonts.load('700 100px Silkscreen');
    await document.fonts.load('400 40px Silkscreen');
    await document.fonts.load('700 36px "Schibsted Grotesk"');
    const iconen = await Promise.all(D.groot.map((d) => laadIcoon(d.icon)));

    const W = 1080, H = 1920;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const mid = W / 2;

    // sunset-gradient over de volle hoogte
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#E8862F');
    gr.addColorStop(0.45, C('--oranje-diep'));
    gr.addColorStop(1, '#8A3220');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);

    // spikes-landschap onderin (twee dieptes)
    spikeRij(ctx, W, H, 190, C('--lila'), 21);
    spikeRij(ctx, W, H, 110, C('--donkerpaars'), 27);

    confetti(ctx);

    // kop
    ctx.textAlign = 'center';
    ctx.fillStyle = C('--cream');
    ctx.font = '400 46px Silkscreen';
    ctx.fillText('LOWLANDS 2026', mid, 150);
    ctx.font = '700 152px Silkscreen';
    ctx.fillStyle = C('--donkerpaars');
    ctx.fillText('HET WEER', mid + 10, 330);
    ctx.fillStyle = C('--paars');
    ctx.fillText('HET WEER', mid, 320);
    ctx.font = '400 32px Silkscreen';
    ctx.fillStyle = C('--cream');
    ctx.fillText('WO 19 T/M MA 24 AUGUSTUS + BIDDINGHUIZEN', mid, 415);

    // verdict-sticker
    sticker(ctx, mid, 545, 920, 116, -2.2, C('--lila'), (c, w2) => {
      c.textAlign = 'center';
      c.fillStyle = C('--rood');
      c.font = '700 50px Silkscreen';
      c.fillText(D.verdict.kop, 0, 18, w2 - 80);
    });

    // dag-stickers, versprongen en om en om gedraaid
    const vullingen = [C('--cream'), C('--lila-licht'), '#D9F3E4'];
    D.groot.forEach((d, i) => {
      const cy = 810 + i * 300;
      const cx = mid + (i === 1 ? 60 : -40);
      const hoek = [-2, 2.2, -1.6][i];
      sticker(ctx, cx, cy, 850, 250, hoek, vullingen[i], (c, w2, h2) => {
        c.textAlign = 'left';
        c.fillStyle = C('--rood');
        c.font = '700 46px Silkscreen';
        c.fillText(d.dag, -w2 / 2 + 50, -20);
        c.fillStyle = C('--ink');
        c.font = '700 31px "Schibsted Grotesk"';
        c.fillText(`${d.kans}% kans op een bui`, -w2 / 2 + 50, 42);
        c.font = '500 27px "Schibsted Grotesk"';
        c.fillStyle = C('--muted');
        c.fillText(d.zin, -w2 / 2 + 50, 86);
        c.drawImage(iconen[D.groot.indexOf(d)], w2 / 2 - 460, -h2 / 2 + 45, 160, 160);
        c.textAlign = 'right';
        c.fillStyle = C('--paars');
        c.font = '700 100px Silkscreen';
        c.fillText(`${d.max}`, w2 / 2 - 100, 40);
        c.font = '700 62px "Schibsted Grotesk"';
        c.fillText('°', w2 / 2 - 42, -8);
      });
    });

    // link-sticker
    sticker(ctx, mid, 1755, 830, 120, 1.8, C('--rood'), (c, w2) => {
      c.textAlign = 'center';
      c.fillStyle = C('--cream');
      c.font = '700 44px Silkscreen';
      c.fillText('LOWLANDS.FESTIWEER.NL', 0, 16, w2 - 70);
    });
    return new Promise((ok) => cv.toBlob((b) => ok(b), 'image/png'));
  }

  window.__maakStory = maakStory; // voor tests

  document.getElementById('deelInsta').addEventListener('click', async () => {
    const knop = document.getElementById('deelInsta');
    knop.disabled = true;
    try {
      const blob = await maakStory();
      const file = new File([blob], 'lowlands-weer.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Lowlands 2026 · het weer', text: SITE });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'lowlands-weer.png';
        a.click();
        URL.revokeObjectURL(a.href);
        melding('Story-graphic gedownload. Deel hem via de Instagram-app; de link staat op de afbeelding.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') melding('Delen lukte niet, probeer het nog eens.');
    } finally {
      knop.disabled = false;
    }
  });
})();
