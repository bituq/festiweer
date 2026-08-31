// Festival-eigen tekenwerk voor Draaimolen, naar de 2026-campagne: een
// procedureel gegenereerde dennen-skyline (mistige achterrij + donkere
// voorgrond) met de glas-orb als echte WebGL-shader (SVG-fallback), de
// teal-naar-goud gradient en het brede DRAAI/MOLEN-wordmark in outline
// (Archivo Expanded). Geladen vóór poster.js/share.js; die lezen window.FESTIVAL.
window.FESTIVAL = {
  gradient: [[0, '#071110'], [0.11, '#0C201C'], [0.24, '#123129'], [0.35, '#1C4A3E'], [0.42, '#2E6152'], [0.50, '#5D8168'], [0.58, '#93997B'], [0.68, '#B7AF7E'], [0.78, '#D2C58B'], [0.88, '#E1D6A0'], [1, '#EDE4B6']],
  lichtVanaf: 0.56,

  fontLoads: ["900 100px Archivo", "500 40px Archivo", "700 36px Inter", "italic 500 27px Inter"],
  displayFont(ctx, px, gewicht = 700) {
    ctx.font = `${gewicht >= 700 ? 900 : 500} ${px}px Archivo`;
    ctx.fontStretch = 'expanded';
  },
  bodyFont(ctx, px, { gewicht = 700, cursief = false } = {}) {
    ctx.font = `${cursief ? 'italic ' : ''}${gewicht} ${px}px Inter`;
    ctx.fontStretch = 'normal';
  },

  /* ---------- het bos: procedureel, in een lokaal 760x150-vlak ---------- */
  orb: { cx: 590, cy: 38, r: 32 },
  bos: (function () {
    let z = 20260905 >>> 0;
    const rnd = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const laag = (hMin, hMax, stapMin, stapMax) => {
      const bomen = [];
      for (let x = -14; x < 776; x += stapMin + rnd() * (stapMax - stapMin)) {
        const h = hMin + rnd() * (hMax - hMin);
        bomen.push([Math.round(x + rnd() * 8), Math.round(h), Math.round(h * 0.2 + 4 + rnd() * 5)]);
      }
      return bomen;
    };
    // achterrij in de nevel, voorgrond vol donker
    return [
      { alpha: 0.3, bomen: laag(46, 98, 20, 38) },
      { alpha: 1, bomen: laag(60, 148, 30, 58) },
    ];
  })(),
  denLagen(cx, h, hw) {
    const top = 150 - h;
    return [
      [[cx, top], [cx - hw * 0.55, top + h * 0.5], [cx + hw * 0.55, top + h * 0.5]],
      [[cx, top + h * 0.26], [cx - hw * 0.8, top + h * 0.78], [cx + hw * 0.8, top + h * 0.78]],
      [[cx, top + h * 0.52], [cx - hw, 150], [cx + hw, 150]],
    ];
  },

  silhouetSvg(svg, C, el) {
    for (const { alpha, bomen } of this.bos) {
      const g = el(svg, 'g', { fill: C('--donker'), opacity: alpha });
      for (const [cx, h, hw] of bomen) {
        for (const punten of this.denLagen(cx, h, hw)) {
          el(g, 'polygon', { points: punten.map((p) => p.join(',')).join(' ') });
        }
      }
    }
    if (!this.monteerOrb(svg.parentElement)) this.orbFallbackSvg(svg, C, el);
  },

  orbFallbackSvg(svg, C, el) {
    const defs = el(svg, 'defs');
    const grad = el(defs, 'radialGradient', { id: 'orbGrad', cx: '38%', cy: '32%', r: '75%' });
    el(grad, 'stop', { offset: '0%', 'stop-color': C('--licht'), 'stop-opacity': 0.95 });
    el(grad, 'stop', { offset: '45%', 'stop-color': C('--accent'), 'stop-opacity': 0.45 });
    el(grad, 'stop', { offset: '100%', 'stop-color': C('--accent'), 'stop-opacity': 0.1 });
    const { cx, cy, r } = this.orb;
    el(svg, 'circle', { cx, cy, r, fill: 'url(#orbGrad)' });
    el(svg, 'circle', { cx, cy, r, fill: 'none', stroke: C('--licht'), 'stroke-opacity': 0.6, 'stroke-width': 1 });
  },

  /* ---------- de orb als fragmentshader ---------- */
  // Raymarched-achtige glasbol in schermruimte: sfeer-normaal uit de cirkel,
  // fbm-swirl in campagnekleuren binnenin, fresnel-rand en een spotje.
  // De wrapper ligt exact over het silhouet (zelfde 760x150-verhouding),
  // dus de positionering is puur procentueel en responsive.
  monteerOrb(container) {
    try {
      if (this.__orbCanvas) return true;
      // reduced-motion (ook de print-render): statische SVG-orb in plaats van de shader
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) return false;

      const fs = `precision mediump float;
uniform float t; uniform vec2 res;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.3; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / (0.44 * res.y);
  float r = length(uv);
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 n = normalize(vec3(uv, max(z, 0.02)));
  // binnenwereld: trage swirl van vervaagde campagnekleuren, brekend naar de rand
  vec2 p = uv * (1.35 - 0.55 * z);
  float a = t * 0.05;
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  float f1 = fbm(p * 2.1 + vec2(0.0, t * 0.04));
  float f2 = fbm(p * 3.2 - vec2(t * 0.03, 1.7));
  vec3 kleur = mix(vec3(0.16, 0.36, 0.29), vec3(0.56, 0.82, 0.67), smoothstep(0.32, 0.72, f1));
  kleur = mix(kleur, vec3(0.70, 0.24, 0.15), smoothstep(0.58, 0.88, f2) * 0.55);
  kleur = mix(kleur, vec3(0.91, 0.79, 0.42), smoothstep(0.62, 0.92, fbm(p * 1.6 + 3.7)) * 0.45);
  kleur *= 0.7 + 0.5 * z;
  // fresnel-rand en spotje linksboven
  float fres = pow(1.0 - z, 2.6);
  kleur += vec3(0.93, 0.93, 0.90) * fres * 0.6;
  float spec = pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.62))), 0.0), 60.0);
  kleur += vec3(1.0) * spec;
  float alfa = smoothstep(1.0, 0.965, r) * (0.55 + 0.45 * fres + 0.5 * z);
  alfa = min(alfa, 1.0);
  gl_FragColor = vec4(kleur * alfa, alfa);
}`;
      const maak = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, maak(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
      gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uT = gl.getUniformLocation(prog, 't');
      const uR = gl.getUniformLocation(prog, 'res');

      const { cx, cy, r } = this.orb;
      const maat = r * 2.5; // beetje lucht voor de rand
      const wrap = document.createElement('div');
      wrap.className = 'orbwrap';
      wrap.style.cssText = 'position:absolute;left:0;right:0;bottom:0;aspect-ratio:760/150;pointer-events:none;';
      cv.style.cssText = `position:absolute;left:${((cx - maat / 2) / 760) * 100}%;top:${((cy - maat / 2) / 150) * 100}%;width:${(maat / 760) * 100}%;aspect-ratio:1;`;
      wrap.appendChild(cv);
      container.appendChild(wrap);

      const px = Math.max(256, Math.round(maat * 1.6 * Math.min(2, window.devicePixelRatio || 1)));
      cv.width = px; cv.height = px;
      gl.viewport(0, 0, px, px);
      const teken = (ms) => {
        gl.uniform1f(uT, ms / 1000);
        gl.uniform2f(uR, px, px);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      // adaptief: bij prefers-reduced-motion (ook de print-render) of trage
      // software-WebGL blijft het één statisch frame
      teken(performance.now());
      const t0 = performance.now();
      teken(t0);
      gl.finish();
      const stil = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!stil && performance.now() - t0 < 40) {
        const lus = (ms) => { teken(ms); requestAnimationFrame(lus); };
        requestAnimationFrame(lus);
      }
      this.__orbCanvas = cv;
      return true;
    } catch {
      return false;
    }
  },

  /* ---------- de achtergrond als fragmentshader ---------- */
  // De campagne-gradient met traag drijvende nevel in het middenstuk en de
  // horizontale goudgele motion-blur-streaks uit het campagnebeeld. Ligt op
  // z-index -1 in .page, dus onder alle inhoud; de CSS-gradient blijft de
  // fallback als WebGL ontbreekt.
  monteerAchtergrond(pageEl) {
    try {
      if (!pageEl || this.__bgCanvas) return false;
      // reduced-motion (ook de print-render): de CSS-gradient blijft staan
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-1;';
      const gl = cv.getContext('webgl', { alpha: false, preserveDrawingBuffer: true });
      if (!gl) return false;

      const fs = `precision mediump float;
uniform float t; uniform vec2 res;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.3; a *= 0.5; }
  return v;
}
float ss(float a, float b, float v){ return clamp((v - a) / (b - a), 0.0, 1.0); }
void main(){
  vec2 uv = gl_FragCoord.xy / res;
  float v = 1.0 - uv.y; // 0 = boven, 1 = onder
  vec3 c = vec3(0.027, 0.067, 0.063);
  c = mix(c, vec3(0.047, 0.125, 0.110), ss(0.00, 0.11, v));
  c = mix(c, vec3(0.071, 0.192, 0.161), ss(0.11, 0.24, v));
  c = mix(c, vec3(0.110, 0.290, 0.243), ss(0.24, 0.35, v));
  c = mix(c, vec3(0.180, 0.380, 0.322), ss(0.35, 0.42, v));
  c = mix(c, vec3(0.365, 0.506, 0.408), ss(0.42, 0.50, v));
  c = mix(c, vec3(0.576, 0.600, 0.482), ss(0.50, 0.58, v));
  c = mix(c, vec3(0.718, 0.686, 0.494), ss(0.58, 0.68, v));
  c = mix(c, vec3(0.824, 0.773, 0.545), ss(0.68, 0.78, v));
  c = mix(c, vec3(0.882, 0.839, 0.627), ss(0.78, 0.88, v));
  c = mix(c, vec3(0.929, 0.894, 0.714), ss(0.88, 1.00, v));
  // nevel die traag door het middenstuk drijft
  float nev = fbm(vec2(uv.x * 3.0 + t * 0.010, v * 4.5 - t * 0.004));
  float nevMask = ss(0.24, 0.5, v) * ss(1.0, 0.68, v);
  c = mix(c, vec3(0.84, 0.85, 0.77), nev * nev * 0.22 * nevMask);
  // horizontale goudgele streaks, sterk uitgerekt zoals in het campagnebeeld
  float st = fbm(vec2(uv.x * 1.3 - t * 0.016, v * 34.0));
  st = ss(0.56, 0.92, st);
  float stMask = ss(0.38, 0.58, v) * ss(0.98, 0.72, v);
  c += vec3(0.91, 0.78, 0.42) * st * 0.10 * stMask;
  gl_FragColor = vec4(c, 1.0);
}`;
      const maak = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, maak(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
      gl.attachShader(prog, maak(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uT = gl.getUniformLocation(prog, 't');
      const uR = gl.getUniformLocation(prog, 'res');

      pageEl.insertBefore(cv, pageEl.firstChild);
      const maat = () => {
        const w = pageEl.clientWidth || 794, h = pageEl.clientHeight || 1123;
        const sc = Math.min(1, Math.sqrt(700000 / (w * h))); // cap ~0,7 Mpx: nevel heeft geen scherpte nodig
        cv.width = Math.max(2, Math.round(w * sc));
        cv.height = Math.max(2, Math.round(h * sc));
        gl.viewport(0, 0, cv.width, cv.height);
      };
      maat();
      addEventListener('resize', maat);
      const teken = (ms) => {
        gl.uniform1f(uT, ms / 1000);
        gl.uniform2f(uR, cv.width, cv.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      // adaptief: bij prefers-reduced-motion (ook de print-render) of trage
      // software-WebGL blijft het één statisch frame
      teken(performance.now());
      const t0 = performance.now();
      teken(t0);
      gl.finish();
      const stil = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!stil && performance.now() - t0 < 40) {
        const lus = (ms) => { teken(ms); requestAnimationFrame(lus); };
        requestAnimationFrame(lus);
      }
      this.__bgCanvas = cv;
      return true;
    } catch {
      return false;
    }
  },

  silhouetCanvas(ctx, C, rechtsX, baseY) {
    const s = (rechtsX + 40) / 760;
    const X = (x) => x * s;
    const Y = (y) => baseY - (150 - y) * s;
    for (const { alpha, bomen } of this.bos) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = C('--donker');
      for (const [cx, h, hw] of bomen) {
        for (const punten of this.denLagen(cx, h, hw)) {
          ctx.beginPath();
          ctx.moveTo(X(punten[0][0]), Y(punten[0][1]));
          ctx.lineTo(X(punten[1][0]), Y(punten[1][1]));
          ctx.lineTo(X(punten[2][0]), Y(punten[2][1]));
          ctx.fill();
        }
      }
      ctx.restore();
    }
    const { cx, cy, r } = this.orb;
    if (this.__orbCanvas) {
      const maat = r * 2.5 * s;
      ctx.drawImage(this.__orbCanvas, X(cx) - maat / 2, Y(cy) - maat / 2, maat, maat);
      return;
    }
    const gr = ctx.createRadialGradient(X(cx) - r * s * 0.25, Y(cy) - r * s * 0.35, r * s * 0.1, X(cx), Y(cy), r * s);
    gr.addColorStop(0, 'rgba(238,238,238,0.95)');
    gr.addColorStop(0.45, 'rgba(143,208,172,0.45)');
    gr.addColorStop(1, 'rgba(143,208,172,0.1)');
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), r * s, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(238,238,238,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },

  // outline-letters met per-letter jitter, zoals op de campagnebanner
  wordmarkCanvas(ctx, C, x, y) {
    ctx.textAlign = 'left';
    const jitter = [-4, 3, -2, 5, -3];
    const rij = (tekst, y0) => {
      this.displayFont(ctx, 60, 900);
      let cx = x;
      [...tekst].forEach((letter, i) => {
        const dy = jitter[i % jitter.length];
        ctx.fillStyle = 'rgba(238,238,238,0.32)';
        ctx.strokeStyle = C('--licht');
        ctx.lineWidth = 2.4;
        ctx.fillText(letter, cx, y0 + dy);
        ctx.strokeText(letter, cx, y0 + dy);
        cx += ctx.measureText(letter).width + 3;
      });
    };
    rij('DRAAI', y - 10);
    rij('MOLEN', y + 56);
    ctx.fillStyle = C('--licht');
    this.displayFont(ctx, 38, 900);
    ctx.fillText('2026', x, y + 118);
  },
};

// De achtergrondshader hoort bij de posterpagina; og.html heeft geen .page
// en houdt zijn CSS-gradient.
try { window.FESTIVAL.monteerAchtergrond(document.querySelector('.page')); } catch { /* CSS-gradient blijft staan */ }
