// 2035, The City That Thinks: the film's 3D worlds (three.js, classic script; loaded before film.html's own script).
// Every frame is a pure function of film time: WORLD.render(name, t, k, W, H) returns the WebGL canvas for that frame.
(function () {
  const T = window.THREE, TAU = Math.PI * 2;
  const mul = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), mix = (a, b, k) => a + (b - a) * k;
  const ss = (a, b, x) => { const k = cl((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const HASH = 'float sq(float x){ return x * x; }\n' +
    'float sst(float a, float b, float x){ float k = clamp((x - a) / (b - a), 0., 1.); return k * k * (3. - 2. * k); }\n' +
    'float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }\n' +
    'float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }\n';
  const C = { night: new T.Color(0x0a1830), cyan: new T.Color(0x27e0ff), silver: new T.Color(0xc9d6e4), gold: new T.Color(0xffc46b) };

  let R = null, rt = null, post = null, size = [0, 0];
  function init(W, H) {
    if (R && size[0] === W && size[1] === H) return;
    if (!R) {
      R = new T.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      R.setPixelRatio(1); R.toneMapping = T.NoToneMapping; R.outputColorSpace = T.LinearSRGBColorSpace;
    }
    R.setSize(W, H, false); size = [W, H];
    if (rt) rt.dispose();
    rt = new T.WebGLRenderTarget(W, H, { type: T.HalfFloatType, samples: 4, depthTexture: new T.DepthTexture(W, H) });
    post = post || makePost();
    post.mat.uniforms.px.value.set(1 / W, 1 / H);
  }
  function makePost() {
    const mat = new T.ShaderMaterial({
      uniforms: { tC: { value: null }, tD: { value: null }, px: { value: new T.Vector2() }, near: { value: 1 }, far: { value: 1000 },
        focus: { value: 10 }, aperture: { value: 0 }, exposure: { value: 1 }, tint: { value: new T.Vector3(1, 1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `varying vec2 vUv; uniform sampler2D tC, tD; uniform vec2 px; uniform float near, far, focus, aperture, exposure; uniform vec3 tint;
        float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
        float coc(vec2 uv){ float d = lin(texture2D(tD, uv).r); return clamp(abs(d - focus) / max(d, .001) * aperture, 0., 1.); }
        vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
        void main(){
          vec3 c = texture2D(tC, vUv).rgb;
          if (aperture > 0.) {
            float c0 = coc(vUv); vec3 acc = c; float w = 1.;
            for (int i = 1; i < 14; i++) {
              float fi = float(i), r = sqrt(fi / 14.), a = fi * 2.39996;
              vec2 o = vec2(cos(a), sin(a)) * r * c0 * 16. * px * vec2(1., 1.) * (1. / px.y) / 1080.;
              float ci = coc(vUv + o), wi = .15 + step(r * c0, ci + .02);
              acc += texture2D(tC, vUv + o).rgb * wi; w += wi;
            }
            c = acc / w;
          }
          c = aces(c * exposure * tint);
          gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), 1.);
        }`,
      depthTest: false, depthWrite: false });
    const scene = new T.Scene(); scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat));
    return { mat, scene, cam: new T.Camera() };
  }

  // ---------- shared pieces ----------
  function skyDome(o) {
    const mat = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { uHor: { value: new T.Color(o.hor) }, uZen: { value: new T.Color(o.zen) }, uLimb: { value: o.limb ?? 0 }, uSun: { value: (o.sun || new T.Vector3(0, -1, 0)).clone() },
        uSunC: { value: new T.Color(o.sunC ?? 0x000000) }, uStars: { value: o.stars ?? 1 }, uPow: { value: o.pow ?? .42 }, uGlow: { value: o.glow ?? 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.); gl_Position = p.xyww; }',
      fragmentShader: HASH + `varying vec3 vD; uniform vec3 uHor, uZen, uSun, uSunC; uniform float uLimb, uStars, uPow, uGlow;
        void main(){ vec3 d = normalize(vD); float h = d.y;
          vec3 c = mix(uHor, uZen, pow(clamp(h, 0., 1.), uPow));
          c = mix(c, uHor * .55, sst(0., -.12, h));
          c += uHor * uLimb * exp(-h * h * 1400.);
          float sd = max(dot(d, normalize(uSun)), 0.);
          c += uSunC * (pow(sd, 900.) * 40. + pow(sd, 60.) * 1.4 * uGlow + pow(sd, 6.) * .45 * uGlow);
          vec2 sp = d.xz / (abs(d.y) + .25) * 220.; float st = step(.9965, h1(floor(sp))) * sst(.12, .5, h) * uStars;
          c += vec3(.8, .9, 1.) * st * (.4 + .6 * h1(floor(sp) + 3.));
          gl_FragColor = vec4(c, 1.); }` });
    const m = new T.Mesh(new T.SphereGeometry(1, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
  }
  const unitBox = () => { const g = new T.BoxGeometry(1, 1, 1); g.translate(0, .5, 0); return g; };
  function instanced(geo, mat, list) {            // list: [{ p: [x, y, z], s: [x, y, z], seed, ry }]
    const m = new T.InstancedMesh(geo, mat, list.length), o = new T.Object3D(), seeds = new Float32Array(list.length);
    list.forEach((it, i) => { o.position.set(...it.p); o.scale.set(...it.s); o.rotation.set(it.rx || 0, it.ry || 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); seeds[i] = it.seed ?? 0; });
    geo.setAttribute('aSeed', new T.InstancedBufferAttribute(seeds, 1)); m.frustumCulled = false; return m;
  }
  const INST_V = `attribute float aSeed; varying vec3 vW, vN, vL, vS; varying float vSeed; varying vec2 vC;
    void main(){ vS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)); vL = position * vS;
      vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * (normal / vS));
      vC = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xz; vSeed = aSeed; gl_Position = projectionMatrix * viewMatrix * wp; }`;

  // towers with procedural window grids; lights switch on as a wave of radius uWave passes
  function towerMaterial(o = {}) {
    return new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uWave: { value: 1e6 }, uLit: { value: 1 }, uFog: { value: new T.Color(o.fog ?? 0x071a36) }, uFogD: { value: o.fogD ?? 0.00028 },
        uSun: { value: new T.Vector3(.4, .5, .6).normalize() }, uKey: { value: new T.Color(o.key ?? 0x1a3558) }, uSil: { value: o.sil ?? 0 } },
      vertexShader: INST_V,
      fragmentShader: HASH + `varying vec3 vW, vN, vL, vS; varying float vSeed; varying vec2 vC;
        uniform float uT, uWave, uLit, uFogD, uSil; uniform vec3 uFog, uSun, uKey;
        void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float side = 1. - step(.5, abs(n.y));
          bool fx = abs(n.x) > .5; float wd = fx ? vS.z : vS.x, u = (fx ? vL.z : vL.x) + .5 * wd;
          vec2 g = vec2(u / 3.2, vL.y / 3.9), cell = floor(g), f = fract(g);
          float aa = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.6, 0., 1.);
          float win = sst(.18, .22, f.x) * sst(.82, .78, f.x) * sst(.24, .28, f.y) * sst(.74, .70, f.y);
          float fs = vSeed * 91.7 + (fx ? 17. : 0.) + (n.x + n.z > 0. ? 5. : 0.);
          float r = h1(cell + fs), d = length(vC), on = sst(uWave, uWave - 260., d) * uLit;
          float lit = step(r, .24 * on);
          vec3 wc = mix(vec3(1., .80, .52), vec3(.50, .88, 1.), step(.45, h1(cell.yx + fs))) * (.5 + 1.1 * h1(cell * 1.7 + fs));
          vec3 base = mix(vec3(.012, .022, .042), vec3(.04, .062, .095), h1(vec2(vSeed, 2.)));
          float fres = pow(1. - max(dot(n, v), 0.), 3.);
          vec3 col = base * (.3 + .7 * max(dot(n, uSun), 0.)) + uKey * (.1 + fres * 1.2) * side * .5;
          vec3 pat = win * (lit * wc * 1.7 + (1. - lit) * uKey * .12);
          vec3 avg = on * .24 * .3 * vec3(.80, .86, .95) * .75 + uKey * .03;
          col += side * mix(pat, avg, aa * .85);
          float hero = step(.9, vSeed), e = abs(u / wd - .5);
          col += side * hero * on * sst(.455, .47, e) * vec3(.15, .85, 1.) * 3.2;
          col += (1. - side) * step(0., n.y) * hero * on * vec3(.1, .6, .8) * .5 * step(.42, max(abs(vL.x / vS.x), abs(vL.z / vS.z)));
          col += side * win * exp(-sq((d - uWave) / 90.)) * vec3(.3, .9, 1.) * 1.6 * (1. - aa * .5);
          col *= 1. - uSil;
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
  }

  // ---------- world: the city (scenes 1 and 5) ----------
  function buildCity() {
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(50, size[0] / size[1], 5, 60000), r = mul(2035);
    const sky = skyDome({ hor: 0x0c2c5a, zen: 0x01030a, limb: .9, stars: 1, pow: .2 }); scene.add(sky);
    const BL = 64, list = [];
    for (let i = -27; i <= 27; i++) for (let j = -27; j <= 27; j++) {
      const x = i * BL, z = j * BL, d = Math.hypot(x, z);
      if (d > 1700 || r() < .1) continue;
      const core = Math.exp(-d * d / (520 * 520)), n = r() < .35 ? 2 : 1;
      for (let q = 0; q < n; q++) {
        const w = n === 2 ? 17 + r() * 5 : 30 + r() * 14, dp = n === 2 ? 30 + r() * 12 : 30 + r() * 14;
        let h = 18 + r() * 46 + core * (120 + r() * 330) + (r() < .04 ? 120 * r() : 0);
        const hero = d < 620 && h > 250 && r() < .5;
        list.push({ p: [x + (n === 2 ? (q ? 12 : -12) : 0), 0, z], s: [w, h, dp], seed: hero ? .9 + r() * .1 : r() * .88 });
        if (hero) list.push({ p: [x, h, z], s: [w * .45, 30 + r() * 60, dp * .45], seed: .9 + r() * .1 });
      }
    }
    const tm = towerMaterial(); scene.add(instanced(unitBox(), tm, list));
    const gm = new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uWave: { value: 1e6 }, uFog: tm.uniforms.uFog, uFogD: tm.uniforms.uFogD, uNet: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: HASH + `varying vec3 vW; uniform float uT, uWave, uFogD, uNet; uniform vec3 uFog;
        void main(){ vec2 p = vW.xz; float d = length(p), city = sst(1800., 1650., d), on = sst(uWave, uWave - 260., d);
          vec2 m = mod(p + 32., 64.) - 32., a = abs(m); vec2 id = floor((p + 32.) / 64.);
          float road = max(step(24., a.x), step(24., a.y)) * city;
          vec3 col = mix(vec3(.010, .016, .028), vec3(.022, .03, .045), road) + .012 * fbm(p * .05);
          float px = fwidth(p.x) + fwidth(p.y), far = clamp(px / 6., 0., 1.);
          // street lamps along the kerbs
          float lampA = (1. - sst(.0, 1.6 + px, abs(a.x - 24.8))) * (1. - sst(.2, .5, abs(fract(p.y / 16.) - .5) * 2. * (1. - far)));
          float lampB = (1. - sst(.0, 1.6 + px, abs(a.y - 24.8))) * (1. - sst(.2, .5, abs(fract(p.x / 16.) - .5) * 2. * (1. - far)));
          col += on * city * (lampA + lampB) * vec3(1., .78, .5) * 1.2 * (1.6 / (1.6 + px * 3.)) * mix(1., .35, far);
          // traffic: lights running along each lane
          float lx = step(24., a.y), lz = step(24., a.x);
          float sx = p.x / 46. + uT * (m.y > 0. ? .55 : -.55) + h1(vec2(id.y, 3.)) * 9., sz = p.y / 46. + uT * (m.x > 0. ? -.5 : .5) + h1(vec2(id.x, 7.)) * 9.;
          float cx = lx * (1. - sst(.5, 2.2 + px, abs(a.y - 28.5))) * step(.5, h1(vec2(floor(sx), id.y))) * sst(.16, .0, abs(fract(sx) - .5));
          float cz = lz * (1. - sst(.5, 2.2 + px, abs(a.x - 28.5))) * step(.5, h1(vec2(floor(sz), id.x))) * sst(.16, .0, abs(fract(sz) - .5));
          col += on * city * (cx * mix(vec3(1., .25, .15), vec3(.9, .95, 1.), step(0., m.y)) + cz * mix(vec3(1., .25, .15), vec3(.9, .95, 1.), step(0., m.x))) * 2.6;
          // the energy grid: every fifth avenue carries a cyan line with pulses running outward
          vec2 av = abs(mod(p + 160., 320.) - 160.); float ln = min(av.x, av.y);
          float line = (1. - sst(.6, 2.4 + px * 1.5, ln)) * city;
          float along = av.x < av.y ? p.y : p.x, pulse = .45 + .55 * pow(.5 + .5 * sin(abs(along) * .02 - uT * 5.), 6.);
          col += on * line * vec3(.12, .85, 1.) * (2.2 + uNet * 2.) * pulse;
          col += on * city * (1. - road) * step(.72, h1(id + 40.)) * vec3(.05, .16, .2) * .5;
          col += city * exp(-sq((d - uWave) / 110.)) * vec3(.2, .8, 1.) * .5;
          vec2 sc = floor(p / 42.); float sub = sst(7500., 1700., d) * (1. - city) * step(.9, h1(sc)) * sst(.5, .15, length(fract(p / 42.) - .5) * (1. - far));
          col += on * sub * mix(vec3(1., .75, .45), vec3(.5, .85, 1.), step(.6, h1(sc + 9.))) * mix(1.4, .25, far);
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    const ground = new T.Mesh(new T.PlaneGeometry(90000, 90000), gm); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // cloud decks for the dive
    const cm = (y, sc, seed) => { const m = new T.Mesh(new T.PlaneGeometry(90000, 90000), new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide,
      uniforms: { uT: { value: 0 }, uS: { value: sc }, uO: { value: seed }, uA: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: HASH + `varying vec3 vW; uniform float uT, uS, uO, uA;
        void main(){ vec2 p = vW.xz * uS + uO + vec2(uT * .01, 0.); float n = fbm(p) * .65 + fbm(p * 3.1) * .35;
          float a = sst(.42, .72, n), dist = length(cameraPosition - vW);
          vec3 c = mix(vec3(.05, .09, .17), vec3(.36, .47, .66), sst(.45, .9, n));
          a *= uA * exp(-dist * .000035) * sst(60., 500., abs(cameraPosition.y - vW.y));
          gl_FragColor = vec4(c, a * .92); }` }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 5; scene.add(m); return m; };
    const clouds = [cm(2500, .00022, 3.1), cm(3100, .00013, 9.4)];
    // the energy network of the finale: arcs between the sites, with running pulses
    const sites = [[-1150, -700], [1000, -980], [1280, 520], [250, 1420], [-1350, 420], [300, -1450]];
    const nm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: 'attribute float aU; attribute float aI; varying float vU, vI; varying vec2 vUv; void main(){ vU = uv.x; vI = aI; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: HASH + `varying float vU, vI; varying vec2 vUv; uniform float uT, uK;
        void main(){ float grow = sst(0., .02, uK * 1.25 - vI * .06 - vU);
          float p = pow(.5 + .5 * sin(vU * 26. - uT * 7. + vI * 2.1), 10.);
          float core = 1. - abs(vUv.y - .5) * 2.;
          gl_FragColor = vec4(vec3(.1, .8, 1.) * (0.7 + 3.4 * p) * grow * pow(core, 1.5) * 1.3, 1.); }` });
    const net = new T.Group(); let ni = 0;
    const arc = (a, b, lift) => { const A = new T.Vector3(a[0], a[2] ?? 30, a[1]), B = new T.Vector3(b[0], b[2] ?? 30, b[1]), M = A.clone().lerp(B, .5); M.y += lift;
      const g = new T.TubeGeometry(new T.QuadraticBezierCurve3(A, M, B), 80, 7, 6, false); g.setAttribute('aI', new T.BufferAttribute(new Float32Array(g.attributes.position.count).fill(ni++), 1)); net.add(new T.Mesh(g, nm)); };
    sites.forEach((s, i) => { arc(s, [0, 0, 420], 380); arc(s, sites[(i + 1) % sites.length], 240); });
    scene.add(net);
    const bm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'varying vec2 vUv; uniform float uT, uK; void main(){ float a = pow(1. - vUv.y, 2.2) * (.6 + .4 * sin(vUv.y * 30. - uT * 6.)); gl_FragColor = vec4(vec3(.15, .85, 1.) * a * uK * 2.2, 1.); }' });
    const beacons = new T.Group();
    sites.concat([[0, 0]]).forEach((s) => { const c = new T.Mesh(new T.CylinderGeometry(16, 34, 620, 12, 1, true), bm); c.position.set(s[0], 310, s[1]); beacons.add(c); });
    scene.add(beacons);
    const path = new T.CatmullRomCurve3([new T.Vector3(0, 9000, 7600), new T.Vector3(0, 4300, 5000), new T.Vector3(0, 1700, 3000), new T.Vector3(0, 700, 1750), new T.Vector3(0, 360, 1050)]);
    const tgtA = new T.Vector3(0, 2300, -5200), tgtB = new T.Vector3(0, 210, -150), tmp = new T.Vector3();
    return { scene, cam, near: 5, far: 60000, update(t, k, mode) {
      tm.uniforms.uT.value = gm.uniforms.uT.value = nm.uniforms.uT.value = bm.uniforms.uT.value = t; clouds.forEach((c) => (c.material.uniforms.uT.value = t));
      if (mode === 'wake') {                     // the dive from orbit: fastest at the start (ease-out)
        const u = 1 - Math.pow(1 - k, 2.3);
        cam.position.copy(path.getPoint(u)); cam.position.x = Math.sin(u * 1.6) * 160 * u;
        tmp.copy(tgtA).lerp(tgtB, ss(0, .62, u)); cam.up.set(Math.sin((1 - u) * .12), 1, 0); cam.lookAt(tmp); cam.fov = mix(46, 54, u);
        const wave = (t - 1.45) * 1050; tm.uniforms.uWave.value = gm.uniforms.uWave.value = wave < 0 ? -300 : wave;
        nm.uniforms.uK.value = 0; bm.uniforms.uK.value = 0; gm.uniforms.uNet.value = 0; net.visible = beacons.visible = false; clouds.forEach((c) => (c.visible = true));
        tm.uniforms.uFogD.value = .00030;
        cam.updateProjectionMatrix();
        return { exposure: 1.15, aperture: 0, cloud: ss(900, 0, Math.abs(cam.position.y - 2800)) };
      }
      // the finale: crane up and pull back while the network joins the sites
      const u = k * k * (3 - 2 * k) * .55 + k * .45;
      cam.position.set(mix(-520, -1500, u), mix(190, 2150, Math.pow(u, 1.25)), mix(1250, 3300, u)); cam.up.set(0, 1, 0);
      tmp.set(mix(-100, 0, u), mix(230, 60, u), mix(200, -150, u)); cam.lookAt(tmp); cam.fov = 50; cam.updateProjectionMatrix();
      tm.uniforms.uWave.value = gm.uniforms.uWave.value = 1e6; tm.uniforms.uFogD.value = .00022;
      const nk = cl((k - .04) / .55); nm.uniforms.uK.value = nk; bm.uniforms.uK.value = ss(0, .35, k); gm.uniforms.uNet.value = nk;
      net.visible = beacons.visible = true; clouds.forEach((c) => (c.visible = false));
      return { exposure: 1.2, aperture: 0 };
    } };
  }

  // ---------- world: the AI data center (scene 2) ----------
  function buildData() {
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(64, size[0] / size[1], .1, 400), r = mul(77);
    scene.background = new T.Color(0x01030a);
    const fog = new T.Color(0x02081a), racks = [], LEN = 150, PITCH = .64;
    for (const x of [-1.75, 1.75, -4.55, 4.55, -8.05, 8.05, -10.85, 10.85]) for (let i = 0; i < LEN / PITCH; i++) {
      const z = 8 - i * PITCH; if (Math.floor(i / 24) % 2 && i % 24 < 3) continue;       // cross aisles
      racks.push({ p: [x, 0, z], s: [1.1, 2.25, .6], seed: r() });
    }
    const rackMat = (mirror) => new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uFog: { value: fog }, uFogD: { value: .016 }, uM: { value: mirror ? .34 : 1 } },
      vertexShader: INST_V,
      fragmentShader: HASH + `varying vec3 vW, vN, vL, vS; varying float vSeed; uniform float uT, uFogD, uM; uniform vec3 uFog;
        void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float front = step(.5, abs(n.x));
          float u = vL.z + .3, y = abs(vL.y);
          vec3 col = vec3(.016, .022, .034) + vec3(.03, .05, .08) * pow(1. - max(dot(n, v), 0.), 2.);
          col += front * vec3(.02, .034, .055) * (.35 + .65 * y / 2.25) + front * vec3(.05, .2, .28) * exp(-y * 3.) * .5;
          float aa = clamp(fwidth(y) * 26., 0., 1.);
          // perforated door, unit seams
          float seam = sst(.0, .004, abs(fract(y / .0445) - .5) - .44);
          col += front * vec3(.01, .018, .03) * seam * (1. - aa);
          // LED rows: each unit blinks on its own clock
          float uy = floor(y / .0445), ux = floor(u / .022);
          float actv = step(.25, h1(vec2(uy, vSeed * 53.)));
          float rate = 2. + 9. * h1(vec2(uy + 3., vSeed * 11.)), ph = floor(uT * rate + h1(vec2(ux, uy)) * 7.);
          float led = step(u, .5) * step(.04, u) * step(.8, h1(vec2(ux + ph, uy + vSeed * 31.))) * actv;
          vec2 lf = vec2(fract(u / .022), fract(y / .0445)); float dotm = sst(.5, .2, length(lf - .5));
          vec3 lc = mix(vec3(.1, .55, 1.), vec3(.4, 1., .95), h1(vec2(ux, uy + 9.))); lc = mix(lc, vec3(1.), step(.93, h1(vec2(ux + 2., uy))));
          vec3 leds = mix(led * dotm * lc * 2.2, actv * step(u, .5) * step(.04, u) * lc * .16, aa);
          col += front * leds * step(.12, y) * step(y, 2.16);
          // the door's light strip and the top status bar
          col += front * sst(.022, .008, abs(u - .555)) * step(.1, y) * step(y, 2.15) * vec3(.1, .8, 1.) * (1.1 + .5 * sin(uT * 3. + vSeed * 40.));
          col += front * step(2.2, y) * vec3(.5, .8, 1.) * .35;
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col * uM, uFog, fg), 1.); }` });
    const rm = rackMat(false), rm2 = rackMat(true);
    scene.add(instanced(unitBox(), rm, racks));
    const mirror = instanced(unitBox(), rm2, racks.filter((q) => Math.abs(q.p[0]) < 5)); mirror.scale.y = -1; scene.add(mirror);
    // polished floor: tiles, and the light channels along the rack feet
    const fm = new T.ShaderMaterial({ transparent: true, uniforms: { uT: { value: 0 }, uFog: { value: fog }, uFogD: { value: .016 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: HASH + `varying vec3 vW; uniform float uT, uFogD; uniform vec3 uFog;
        void main(){ vec2 p = vW.xz; vec2 tf = abs(fract(p / .6) - .5); float px = fwidth(p.x) + fwidth(p.y);
          float seam = sst(.49 - px, .5, max(tf.x, tf.y)) * (1. - clamp(px * 4., 0., 1.));
          vec3 col = vec3(.012, .018, .03) * (1. - .5 * seam) + .006 * h1(floor(p / .6));
          float ch = 1. - sst(.02, .06 + px, abs(abs(p.x) - 1.12));
          float s = p.y * .16 + uT * 2.6, pulse = pow(.5 + .5 * sin(s * 6.283), 14.);
          col += ch * vec3(.1, .75, 1.) * (.45 + 3.5 * pulse);
          float v = pow(1. - abs(normalize(cameraPosition - vW).y), 3.);
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), mix(.62, .93, 1. - v)); }` });
    const floor = new T.Mesh(new T.PlaneGeometry(60, 400), fm); floor.rotation.x = -Math.PI / 2; floor.position.z = -100; floor.renderOrder = 2; scene.add(floor);
    // overhead: fibre trays with data running along them, cooling pipes on the rack tops, ceiling light bars
    const lm = (kind) => new T.ShaderMaterial({ side: T.DoubleSide, uniforms: { uT: { value: 0 }, uFog: { value: fog }, uFogD: { value: .016 }, uKind: { value: kind } },
      vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: HASH + `varying vec3 vW; varying vec2 vUv; uniform float uT, uFogD, uKind; uniform vec3 uFog;
        void main(){ vec3 col = vec3(.015, .02, .03); float z = vW.z;
          if (uKind < .5) { float li = floor(vUv.x * 12.), lf = abs(fract(vUv.x * 12.) - .5);
            float sp = 3. + 5. * h1(vec2(li, 1.)), s = z * .05 + uT * sp * .35 + h1(vec2(li, 5.)) * 9.;
            float streak = pow(fract(s), 18.) + .5 * pow(fract(s * 1.7 + .3), 30.);
            col += sst(.34, .1, lf) * mix(vec3(.1, .6, 1.), vec3(.6, 1., 1.), h1(vec2(li, 9.))) * (.06 + 5. * streak); }
          else if (uKind < 1.5) { float band = pow(.5 + .5 * sin(z * 1.4 + uT * 5.), 4.); col = vec3(.01, .05, .07) + vec3(.1, .8, 1.) * (.12 + 1.1 * band) * (.4 + .6 * abs(sin(vUv.x * 6.283))); }
          else { col = vec3(.75, .9, 1.) * .8 * step(.3, fract(z / 7.5)); }
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    const mats = [lm(0), lm(1), lm(2)];
    for (const x of [0, -6.3, 6.3]) { const m = new T.Mesh(new T.PlaneGeometry(.9, 320), mats[0]); m.rotation.x = Math.PI / 2; m.position.set(x, 3.05, -100); scene.add(m); }
    for (const x of [-1.75, 1.75, -4.55, 4.55]) for (const dx of [-.28, .28]) { const m = new T.Mesh(new T.CylinderGeometry(.055, .055, 320, 10, 1, true), mats[1]); m.rotation.x = Math.PI / 2; m.position.set(x + dx, 2.4, -100); scene.add(m); }
    for (const x of [-3.15, 3.15, -9.45, 9.45]) { const m = new T.Mesh(new T.PlaneGeometry(.12, 320), mats[2]); m.rotation.x = Math.PI / 2; m.position.set(x, 3.6, -100); scene.add(m); }
    const ceil = new T.Mesh(new T.PlaneGeometry(60, 400), new T.MeshBasicMaterial({ color: 0x010309 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.9, -100); scene.add(ceil);
    // the core at the end of the aisle
    const core = new T.Mesh(new T.PlaneGeometry(14, 3.9), new T.ShaderMaterial({ uniforms: { uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: HASH + `varying vec2 vUv; uniform float uT; void main(){ vec2 g = vUv * vec2(70., 20.), c = floor(g), f = fract(g);
        float on = step(.55, h1(c + floor(uT * (1. + 6. * h1(c.yx))))) * sst(.5, .3, max(abs(f.x - .5), abs(f.y - .5)));
        float ring = exp(-sq((length((vUv - .5) * vec2(3.6, 1.)) - .28 - .04 * sin(uT * 2.)) * 9.));
        gl_FragColor = vec4(vec3(.08, .6, 1.) * on * 1.4 + vec3(.5, .95, 1.) * ring * 3., 1.); }` }));
    core.position.set(0, 1.95, -92); scene.add(core);
    const tmp = new T.Vector3();
    return { scene, cam, near: .1, far: 400, update(t, k) {
      [rm, rm2, fm, ...mats, core.material].forEach((m) => (m.uniforms.uT.value = t));
      const u = 1 - Math.pow(1 - k, 1.7), rise = ss(.55, 1, k);
      cam.position.set(Math.sin(k * 2.2) * .12, mix(1.25, 2.95, rise), mix(7.5, -66, u)); cam.up.set(Math.sin(k * 3.1) * .035, 1, 0);
      tmp.set(0, mix(1.35, 1.7, rise), cam.position.z - 22); cam.lookAt(tmp); cam.fov = mix(70, 58, k); cam.updateProjectionMatrix();
      return { exposure: 1.05, aperture: .22, focus: mix(7, 16, k) };
    } };
  }

  const builders = { city: buildCity, data: buildData }, worlds = {};
  window.WORLD = {
    T, mul, cl, mix, ss, HASH, INST_V, C, skyDome, unitBox, instanced, towerMaterial, builders,
    size: () => size,
    renderer: () => R,
    blob() { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 64, 8, 128, 64, 128);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.55, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.save(); g.translate(128, 64); g.scale(1, .5); g.translate(-128, -64); g.fillStyle = gr; g.fillRect(0, -64, 256, 256); g.restore(); return new T.CanvasTexture(c); },
    render(name, t, k, W, H, mode) {
      init(W, H);
      const w = worlds[name] || (worlds[name] = builders[name]());
      w.cam.aspect = W / H;
      const o = w.update(t, k, mode) || {};
      R.setRenderTarget(rt); R.setClearColor(0x000000, 1); R.clear(); R.render(w.scene, w.cam);
      const u = post.mat.uniforms; u.tC.value = rt.texture; u.tD.value = rt.depthTexture; u.near.value = w.near; u.far.value = w.far;
      u.aperture.value = o.aperture || 0; u.focus.value = o.focus || 10; u.exposure.value = o.exposure || 1; u.tint.value.set(...(o.tint || [1, 1, 1]));
      R.setRenderTarget(null); R.render(post.scene, post.cam);
      WORLD.last = o;
      return R.domElement;
    },
  };
})();
