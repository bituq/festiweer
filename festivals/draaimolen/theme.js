// Festival-eigen tekenwerk voor Draaimolen, naar de 2026-campagne: een
// AI-gegenereerd mistig dennenbos (bos.png, transparante lucht) met de
// glas-orb als WebGL-shader die de echte achtergrond breekt en spiegelt,
// een levende nevel-achtergrond, en het brede DRAAI/MOLEN-wordmark in
// outline (Archivo Expanded). Geladen vóór poster.js/share.js.
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

  // bos.png is 1088x364; de orb staat in beeld-coördinaten en steekt boven
  // de boomtoppen uit
  BEELD: { b: 1088, h: 364 },
  orb: { cx: 800, cy: 108, r: 110 },

  // kleur van de pagina-gradient op hoogte v (0 = boven, 1 = onder)
  kleurBij(v) {
    const st = this.gradient;
    if (v <= st[0][0]) return st[0][1];
    for (let i = 1; i < st.length; i++) {
      if (v <= st[i][0]) {
        const [v0, k0] = st[i - 1], [v1, k1] = st[i];
        const t = (v - v0) / (v1 - v0);
        const c0 = [1, 3, 5].map((j) => parseInt(k0.slice(j, j + 2), 16));
        const c1 = [1, 3, 5].map((j) => parseInt(k1.slice(j, j + 2), 16));
        return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * t)).join(',')})`;
      }
    }
    return st[st.length - 1][1];
  },

  // het silhouet is het bos-beeld zelf; hier komt alleen de orb bij
  silhouetSvg(imgEl) {
    if (!this.monteerOrb(imgEl)) this.orbFallbackCss(imgEl);
  },

  maakOrbWrap(imgEl) {
    const { b, h } = this.BEELD;
    const wrap = document.createElement('div');
    wrap.className = 'orbwrap';
    wrap.style.cssText = `position:absolute;left:0;right:0;bottom:0;aspect-ratio:${b}/${h};pointer-events:none;`;
    imgEl.parentElement.appendChild(wrap);
    return wrap;
  },
  orbPlaatsing(elt) {
    const { b, h } = this.BEELD;
    const { cx, cy, r } = this.orb;
    const maat = r * 2.3;
    elt.style.cssText += `position:absolute;left:${((cx - maat / 2) / b) * 100}%;top:${((cy - maat / 2) / h) * 100}%;width:${(maat / b) * 100}%;aspect-ratio:1;`;
  },

  orbFallbackCss(imgEl) {
    const wrap = this.maakOrbWrap(imgEl);
    const bol = document.createElement('div');
    this.orbPlaatsing(bol);
    bol.style.cssText += 'border-radius:50%;background:radial-gradient(circle at 35% 30%, rgba(238,238,238,0.9), rgba(143,208,172,0.35) 45%, rgba(143,208,172,0.08) 75%);border:1px solid rgba(238,238,238,0.55);';
    wrap.appendChild(bol);
  },

  /* ---------- de orb als fragmentshader met echte refractie ---------- */
  // De shader krijgt een wereld-texture mee: de pagina-gradient rond de orb
  // met het bos erin getekend. De bol keert dat beeld om (fisheye-refractie
  // met chromatische aberratie per kanaal), spiegelt de wereld op de rand
  // (fresnel) en wiebelt subtiel als vloeibaar glas.
  monteerOrb(imgEl) {
    let wrap = null;
    try {
      if (this.__orbCanvas) return true;
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!gl) return false;

      const fs = `precision mediump float;
uniform float t; uniform vec2 res; uniform sampler2D wereld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / (0.46 * res.y);
  uv.y = -uv.y; // beeldruimte: y omlaag, zoals de texture
  float r = length(uv);
  float z = sqrt(max(0.0, 1.0 - r * r));
  // vloeibaar glas: de normaal golft, het sterkst aan de rand
  float w1 = noise(uv * 2.6 + t * 0.35) - 0.5;
  float w2 = noise(uv * 3.4 - t * 0.28 + 7.3) - 0.5;
  vec3 n = normalize(vec3(uv + vec2(w1, w2) * 0.10 * (1.0 - z), max(z, 0.03)));
  vec3 kijk = vec3(0.0, 0.0, -1.0);
  // de gebroken wereld draait langzaam rond in de bol (het is een draaimolen)
  float rot = t * 0.12;
  mat2 R = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
  // refractie per kanaal: de bol keert de wereld om, elk kanaal breekt net anders
  vec3 kleur;
  for (int k = 0; k < 3; k++) {
    vec3 br = refract(kijk, n, 0.60 + float(k) * 0.025);
    vec2 suv = R * (-uv * (0.62 - 0.30 * z)) + br.xy * 0.42;
    vec2 co = clamp(vec2(0.5) + suv * 0.5, 0.01, 0.99);
    vec4 s = texture2D(wereld, co);
    kleur[k] = k == 0 ? s.r : (k == 1 ? s.g : s.b);
  }
  // spiegeling van de wereld op de rand
  vec3 rf = reflect(kijk, n);
  vec2 rco = clamp(vec2(0.5) + rf.xy * 0.5, 0.01, 0.99);
  vec3 refl = texture2D(wereld, rco).rgb;
  float fres = pow(1.0 - z, 3.0);
  kleur = mix(kleur, refl, fres * 0.65);
  // dunne-film regenboogrand die langzaam verloopt
  float fase = 3.0 * (1.0 - z) + t * 0.15;
  kleur += fres * 0.16 * vec3(0.5 + 0.5 * sin(6.2832 * fase), 0.5 + 0.5 * sin(6.2832 * (fase + 0.33)), 0.5 + 0.5 * sin(6.2832 * (fase + 0.67)));
  // glasrand en een spotje dat langzaam om de bol heen wandelt
  kleur += vec3(0.92, 0.93, 0.89) * fres * 0.3;
  float spec = pow(max(dot(n, normalize(vec3(-0.45 + 0.25 * sin(t * 0.3), -0.55 + 0.2 * cos(t * 0.23), 0.7))), 0.0), 90.0);
  kleur += vec3(0.95) * spec;
  float alfa = smoothstep(1.0, 0.985, r) * 0.97;
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

      // de wereld-texture: gradient + bos rond de orb
      const { b, h } = this.BEELD;
      const { cx, cy, r } = this.orb;
      const straal = r * 2.6;
      const tex2d = document.createElement('canvas');
      tex2d.width = tex2d.height = 512;
      const tctx = tex2d.getContext('2d');
      const glTex = gl.createTexture();
      wrap = this.maakOrbWrap(imgEl);
      const vulTexture = () => {
        // verticale band van de pagina-gradient rond de orb (zoom-bestendig via ratio's)
        let v0 = 0.78, v1 = 1.02;
        const page = document.querySelector('.page');
        if (page) {
          const pr = page.getBoundingClientRect();
          const wr = wrap.getBoundingClientRect();
          const sch = wr.width / b;
          const yC = wr.top + cy * sch;
          v0 = (yC - straal * sch - pr.top) / pr.height;
          v1 = (yC + straal * sch - pr.top) / pr.height;
        }
        const g = tctx.createLinearGradient(0, 0, 0, 512);
        for (let i = 0; i <= 24; i++) g.addColorStop(i / 24, this.kleurBij(v0 + ((v1 - v0) * i) / 24));
        tctx.fillStyle = g;
        tctx.fillRect(0, 0, 512, 512);
        // het bos erin, op schaal
        const T = 512 / (2 * straal);
        if (imgEl.complete && imgEl.naturalWidth) {
          tctx.drawImage(imgEl, (0 - (cx - straal)) * T, (0 - (cy - straal)) * T, b * T, h * T);
        }
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex2d);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      };

      this.orbPlaatsing(cv);
      wrap.appendChild(cv);
      const px = 512;
      cv.width = px; cv.height = px;
      gl.viewport(0, 0, px, px);
      gl.uniform1i(gl.getUniformLocation(prog, 'wereld'), 0);
      gl.activeTexture(gl.TEXTURE0);

      vulTexture();
      if (!imgEl.complete) imgEl.addEventListener('load', vulTexture, { once: true });
      addEventListener('resize', vulTexture);

      const teken = (ms) => {
        gl.uniform1f(uT, ms / 1000);
        gl.uniform2f(uR, px, px);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      // adaptief: op trage software-WebGL blijft het één statisch frame
      teken(performance.now());
      // beweging alleen bij voorkeur voor beweging; de meting begint pas na
      // de opwarm-frames zodat de shader-compile niet meetelt
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let frames = 0, som = 0, vorige = performance.now();
        const lus = (ms) => {
          teken(ms);
          cv.style.transform = `translateY(${(Math.sin(ms / 1700) * 3).toFixed(2)}px)`;
          if (frames < 16) {
            if (frames >= 4) som += ms - vorige;
            vorige = ms; frames++;
            if (frames === 16 && som / 12 > 40) return; // software-WebGL: statisch frame laten staan
          }
          requestAnimationFrame(lus);
        };
        requestAnimationFrame(lus);
      }
      this.__orbCanvas = cv;
      return true;
    } catch {
      if (wrap) wrap.remove();
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
  float nev = fbm(vec2(uv.x * 3.0 + t * 0.035, v * 4.5 - t * 0.014));
  float nevMask = ss(0.24, 0.5, v) * ss(1.0, 0.68, v);
  c = mix(c, vec3(0.84, 0.85, 0.77), nev * nev * 0.22 * nevMask);
  // horizontale goudgele streaks, sterk uitgerekt zoals in het campagnebeeld
  float st = fbm(vec2(uv.x * 1.3 - t * 0.05, v * 34.0));
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
        const w = pageEl.clientWidth || 794, hh = pageEl.clientHeight || 1123;
        const sc = Math.min(1, Math.sqrt(700000 / (w * hh))); // nevel heeft geen scherpte nodig
        cv.width = Math.max(2, Math.round(w * sc));
        cv.height = Math.max(2, Math.round(hh * sc));
        gl.viewport(0, 0, cv.width, cv.height);
      };
      maat();
      addEventListener('resize', maat);
      const teken = (ms) => {
        gl.uniform1f(uT, ms / 1000);
        gl.uniform2f(uR, cv.width, cv.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      teken(performance.now());
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let frames = 0, som = 0, vorige = performance.now();
        const lus = (ms) => {
          teken(ms);
          if (frames < 16) {
            if (frames >= 4) som += ms - vorige;
            vorige = ms; frames++;
            if (frames === 16 && som / 12 > 40) return; // software-WebGL: statisch frame laten staan
          }
          requestAnimationFrame(lus);
        };
        requestAnimationFrame(lus);
      }
      this.__bgCanvas = cv;
      return true;
    } catch {
      return false;
    }
  },

  /* ---------- de story-graphic ---------- */
  silhouetCanvas(ctx, C, rechtsX, baseY) {
    const { b, h } = this.BEELD;
    const s = (rechtsX + 40) / b;
    const imgEl = document.getElementById('silhouet');
    if (imgEl && imgEl.complete && imgEl.naturalWidth) {
      ctx.drawImage(imgEl, 0, baseY - h * s, b * s, h * s);
    }
    const { cx, cy, r } = this.orb;
    const X = cx * s, Y = baseY - (h - cy) * s;
    if (this.__orbCanvas) {
      const maat = r * 2.3 * s;
      ctx.drawImage(this.__orbCanvas, X - maat / 2, Y - maat / 2, maat, maat);
      return;
    }
    const gr = ctx.createRadialGradient(X - r * s * 0.25, Y - r * s * 0.35, r * s * 0.1, X, Y, r * s);
    gr.addColorStop(0, 'rgba(238,238,238,0.9)');
    gr.addColorStop(0.45, 'rgba(143,208,172,0.4)');
    gr.addColorStop(1, 'rgba(143,208,172,0.08)');
    ctx.beginPath();
    ctx.arc(X, Y, r * s, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(238,238,238,0.55)';
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
