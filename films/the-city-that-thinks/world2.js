// 2035, The City That Thinks: the energy field (scene 3) and the charging station (scene 4). Loaded after world.js.
(function () {
  const W = window.WORLD, T = W.T, { mul, cl, mix, ss, HASH, INST_V, unitBox, instanced, skyDome, towerMaterial } = W;
  const VERT = 'varying vec3 vW, vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';

  // ---------- world: the new energy field (scene 3) ----------
  function buildEnergy() {
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(46, 16 / 9, .5, 30000), r = mul(11);
    const sun = new T.Vector3(-.80, .15, -.58).normalize(), fog = new T.Color(.26, .19, .14), sunC = new T.Color(1., .70, .36);
    const U = { uT: { value: 0 }, uSun: { value: sun }, uSunC: { value: sunC }, uFog: { value: fog }, uFogD: { value: .00017 } };
    scene.add(skyDome({ hor: 0xd0803c, zen: 0x0c3a6e, limb: .3, stars: 0, pow: .2, sun, sunC: 0xffb866, glow: .35 }));
    // dry ground with tyre tracks between the rows
    const gm = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT,
      fragmentShader: HASH + `varying vec3 vW; uniform vec3 uSun, uSunC, uFog; uniform float uFogD;
        void main(){ vec2 p = vW.xz; float n = fbm(p * .07) * .6 + fbm(p * .9) * .4;
          vec3 col = mix(vec3(.055, .04, .026), vec3(.13, .095, .055), n);
          float tr = sst(.6, .2, abs(fract(p.x / 5.5 + .5) - .5) * 5.5 - .0) * sst(240., 60., abs(p.y + 45.)) ; col *= 1. - .25 * tr * step(-170., p.x) * step(p.x, 66.);
          col = mix(col, vec3(.07, .085, .04), sst(.55, .8, fbm(p * .012)) * .6);
          col *= uSunC * .62 + vec3(.03, .05, .08);
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    const ground = new T.Mesh(new T.PlaneGeometry(40000, 40000), gm); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // matte, sun-lit solids: posts, turbines, battery containers (uStrip: the containers' status light)
    const lit = (color, strip = 0) => new T.ShaderMaterial({ uniforms: { ...U, uCol: { value: new T.Color(color) }, uStrip: { value: strip } }, vertexShader: INST_V,
      fragmentShader: HASH + `varying vec3 vW, vN, vL, vS; varying float vSeed; uniform vec3 uSun, uSunC, uFog, uCol; uniform float uFogD, uStrip, uT;
        void main(){ vec3 n = normalize(vN); float d = max(dot(n, uSun), 0.);
          vec3 col = uCol * (uSunC * d * 2.6 + vec3(.10, .15, .24) * (.6 + .4 * n.y));
          if (uStrip > .5) { float side = step(.5, abs(n.z)), y = vL.y / vS.y, x = vL.x / vS.x + .5;
            col *= 1. - .35 * side * step(.5, fract(x * 14.)) * step(.12, y) * step(y, .9);                   // corrugation
            col += side * step(.44, y) * step(y, .5) * step(.06, x) * step(x, .94) * vec3(.1, .9, 1.) * (1.6 + 1.6 * step(fract(x * 3. - uT * .35 + vSeed), .12));
            col += side * step(.62, y) * step(y, .7) * step(.8, x) * step(x, .9) * vec3(.3, 1., .6) * 1.5; }
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    // single-axis trackers: rows run along z, the tables lean west toward the low sun
    const tables = [], posts = [], TILT = .13;
    for (let i = -30; i <= 12; i++) for (let j = -25; j <= 8; j++) {
      const x = i * 5.5, z = j * 6.3;
      tables.push({ p: [x, 1.55, z], s: [2.5, .05, 6.0], seed: r(), rz: 0 }); posts.push({ p: [x, 0, z], s: [.12, 1.55, .12], seed: r() });
    }
    const pm = new T.ShaderMaterial({ uniforms: U, vertexShader: INST_V,
      fragmentShader: HASH + `varying vec3 vW, vN, vL, vS; varying float vSeed; uniform vec3 uSun, uSunC, uFog; uniform float uFogD;
        void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float top = step(.5, n.y);
          vec2 g = vec2(vL.x / .52, vL.z / 1.0); vec2 f = abs(fract(g) - .5);
          float px = fwidth(g.x) + fwidth(g.y), cellLine = sst(.47 - px, .5, max(f.x, f.y)) * (1. - clamp(px * 1.2, 0., 1.));
          float fine = sst(.46, .5, abs(fract(g.x * 6.) - .5)) * (1. - clamp(px * 6., 0., 1.));
          vec3 cellc = mix(vec3(.008, .022, .07), vec3(.016, .045, .12), h1(floor(g) + vSeed * 7.));
          vec3 col = mix(cellc, vec3(.35, .4, .46), cellLine * .8) + fine * .02;
          float frame = step(1.2, abs(vL.x)) + step(2.95, abs(vL.z)); col = mix(col, vec3(.5, .54, .58), clamp(frame, 0., 1.));
          n = normalize(n + vec3(h1(floor(g) + 3.) - .5, 0., h1(floor(g) + 5.) - .5) * .012);
          vec3 rf = reflect(-v, n); float fr = .05 + .95 * pow(1. - max(dot(n, v), 0.), 5.);
          vec3 skyc = mix(vec3(.85, .46, .18), vec3(.04, .16, .34), pow(clamp(rf.y, 0., 1.), .3));
          float sd = max(dot(rf, uSun), 0.); skyc += uSunC * (pow(sd, 600.) * 60. + pow(sd, 40.) * 2.5 + pow(sd, 5.) * .5);
          col = col * (uSunC * max(dot(n, uSun), 0.) * 2.2 + vec3(.08, .12, .2)) + skyc * fr * 1.1;
          col = mix(vec3(.03, .03, .035), col, top);
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD);
          gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    const tm = instanced(unitBox(), pm, tables), o = new T.Object3D();
    tables.forEach((it, i) => { o.position.set(...it.p); o.scale.set(...it.s); o.rotation.set(0, 0, TILT); o.updateMatrix(); tm.setMatrixAt(i, o.matrix); });
    scene.add(tm); scene.add(instanced(unitBox(), lit(0x6b7078), posts));
    // battery storage: two rows of containers with a running status light
    const packs = []; for (let j = 0; j < 14; j++) for (const x of [84, 100]) packs.push({ p: [x, 0, 58 - j * 7.2], s: [12.2, 2.9, 2.44], seed: r() });
    scene.add(instanced(unitBox(), lit(0xb9c2cc, 1), packs));
    // wind turbines on the ridge toward the sun
    const white = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT,
      fragmentShader: `varying vec3 vW, vN; uniform vec3 uSun, uSunC, uFog; uniform float uFogD;
        void main(){ vec3 n = normalize(vN); vec3 col = vec3(.78, .8, .82) * (uSunC * max(dot(n, uSun), 0.) * 2.4 + vec3(.10, .15, .24) * (.7 + .3 * n.y));
          float fg = 1. - exp(-length(cameraPosition - vW) * uFogD); gl_FragColor = vec4(mix(col, uFog, fg), 1.); }` });
    const rotors = [], bladeG = (() => { const g = new T.BoxGeometry(1, 46, .5, 1, 8, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 23, k = y / 46, w = mix(3.6, .7, Math.pow(k, .8)) * (k < .08 ? .5 + k * 6 : 1); p.setXYZ(i, p.getX(i) * w + w * .18, y + 1.5, p.getZ(i) * mix(1, .3, k)); }
      g.computeVertexNormals(); return g; })();
    [[-330, -300, 0], [-210, -430, 1.3], [-480, -470, 2.2], [-90, -560, .6], [-620, -330, 3.1], [-360, -680, 4.0], [40, -760, 5.2]].forEach(([x, z, ph]) => {
      const g = new T.Group(), tower = new T.Mesh(new T.CylinderGeometry(1.5, 2.6, 96, 16), white); tower.position.y = 48; g.add(tower);
      const nac = new T.Mesh(new T.BoxGeometry(4, 3.6, 9), white); nac.position.set(0, 97, 1.5); g.add(nac);
      const rot = new T.Group(); rot.position.set(0, 97, 6.5); const hub = new T.Mesh(new T.SphereGeometry(2.1, 16, 10), white); hub.scale.z = 1.3; rot.add(hub);
      for (let b = 0; b < 3; b++) { const bl = new T.Mesh(bladeG, white); bl.rotation.z = b * Math.PI * 2 / 3; rot.add(bl); }
      g.add(rot); g.position.set(x, 0, z); g.rotation.y = .5; scene.add(g); rotors.push([rot, ph]);
    });
    // the city on the horizon, where the energy goes
    const CITY = new T.Vector3(950, 0, -1900), towers = [];
    for (let i = 0; i < 150; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 520, h = 40 + r() * 80 + Math.exp(-d * d / 60000) * (120 + r() * 260);
      towers.push({ p: [CITY.x + Math.cos(a) * d, 0, CITY.z + Math.sin(a) * d], s: [26 + r() * 22, h, 26 + r() * 22], seed: r() }); }
    const cm = towerMaterial({ fog: 0x000000, fogD: .00017, key: 0x5a3a20 }); cm.uniforms.uFog.value = fog; cm.uniforms.uSun.value = sun; scene.add(instanced(unitBox(), cm, towers));
    // energy: particles leave the field in streams and run to the city, gold turning cyan on the way
    const N = 3600, seeds = new Float32Array(N * 3), pos = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) seeds[i] = r();
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('aS', new T.BufferAttribute(seeds, 3));
    const ptm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uT: { value: 0 }, uK: { value: 0 }, uCity: { value: CITY }, uH: { value: 540 } },
      vertexShader: `attribute vec3 aS; uniform float uT, uK, uH; uniform vec3 uCity; varying float vU, vA;
        void main(){ float st = floor(aS.y * 16.), u = fract(aS.x + uT * (.11 + .05 * fract(aS.y * 16.)));
          vec2 sh = vec2(fract(sin(st * 12.9) * 43.7), fract(sin(st * 78.2) * 91.3));
          vec3 a = vec3(mix(-150., 55., sh.x), 2.2, mix(-150., 45., sh.y)) + vec3(aS.z - .5, 0., fract(aS.z * 7.) - .5) * 9.;
          vec3 b = uCity + vec3(0., 150. + 120. * sh.x, 0.), m = mix(a, b, .42) + vec3(0., 210. + 150. * sh.y, 0.);
          vec3 p = mix(mix(a, m, u), mix(m, b, u), u); p += vec3(sin(u * 40. + aS.z * 6.28), cos(u * 33. + aS.x * 6.28), sin(u * 27. + aS.y * 9.)) * (1.2 + 9. * u);
          vU = u; vA = sst(0., .04, u) * sst(1., .8, u) * sst(aS.z * .5, aS.z * .5 + .25, uK * 1.5);
          vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uH * (.55 + .9 * fract(aS.x * 31.)) / -mv.z, 1.2, uH * .02); }`.replace('void main', HASH + 'void main'),
      fragmentShader: `varying float vU, vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = max(1. - d, 0.); a = a * a;
        vec3 c = mix(vec3(1., .72, .32), vec3(.25, .9, 1.), clamp((vU - .12) / .5, 0., 1.)); gl_FragColor = vec4(c * a * vA * 2.6, 1.); }` });
    const pts = new T.Points(pg, ptm); pts.frustumCulled = false; scene.add(pts);
    const tmp = new T.Vector3();
    return { scene, cam, near: .5, far: 30000, update(t, k) {
      U.uT.value = t; cm.uniforms.uT.value = t; ptm.uniforms.uT.value = t; ptm.uniforms.uK.value = k; ptm.uniforms.uH.value = W.size()[1];
      rotors.forEach(([rot, ph]) => (rot.rotation.z = -(t * .85 + ph)));
      const e = k * k * (3 - 2 * k), up = ss(.12, 1, k);
      cam.position.set(mix(30, 74, e), mix(2.75, 23, up * up * .6 + up * .4), mix(52, 96, e)); cam.up.set(0, 1, 0);
      tmp.set(mix(-60, -70, e), mix(6, 2, up), mix(-70, -120, e)); cam.lookAt(tmp); cam.fov = mix(52, 46, e); cam.updateProjectionMatrix();
      return { exposure: .95, aperture: 0 };
    } };
  }

  // ---------- world: the liquid-cooled super charging station (scene 4) ----------
  function loft(secs, nA, n) {                    // sections along x: [x, half width, y bottom, y top]; a rounded-box cross-section
    const P = [], I = [], pw = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    secs.forEach(([x, w, y0, y1]) => { for (let j = 0; j < nA; j++) { const a = j / nA * Math.PI * 2; P.push(x, (y0 + y1) / 2 + (y1 - y0) / 2 * pw(Math.sin(a)), w * pw(Math.cos(a))); } });
    for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < nA; j++) { const a = i * nA + j, b = i * nA + (j + 1) % nA, c = a + nA, d = b + nA; I.push(a, c, b, b, c, d); }
    const cap = (i, flip) => { const [x, , y0, y1] = secs[i], ci = P.length / 3; P.push(x, (y0 + y1) / 2, 0);
      for (let j = 0; j < nA; j++) { const a = i * nA + j, b = i * nA + (j + 1) % nA; flip ? I.push(ci, a, b) : I.push(ci, b, a); } };
    cap(0, true); cap(secs.length - 1, false);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
  }
  function densify(secs, per) {                   // smooth the section list with a Catmull-Rom pass
    const cs = [0, 1, 2, 3].map((c) => new T.CatmullRomCurve3(secs.map((s, i) => new T.Vector3(i, s[c], 0)), false, 'catmullrom', .5)), out = [], n = (secs.length - 1) * per;
    for (let i = 0; i <= n; i++) out.push(cs.map((c) => c.getPoint(i / n).y));
    return out;
  }
  function buildStation() {
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 16 / 9, .1, 2000), r = mul(5);
    scene.background = new T.Color(0x01040b); scene.fog = new T.FogExp2(0x030b1a, .011);
    // the light the metal mirrors: long strips over a dark field
    const envS = new T.Scene(); envS.background = new T.Color(0x02060f);
    const strip = (x, y, z, w, d, c) => { const m = new T.Mesh(new T.BoxGeometry(w, .1, d), new T.MeshBasicMaterial({ color: new T.Color(...c) })); m.position.set(x, y, z); envS.add(m); };
    for (const z of [-7, -3.5, 0, 3.5, 7]) strip(0, 6, z, 16, .5, [7, 9.5, 11]);
    strip(-12, 2, 0, .5, 14, [.4, 2.4, 3.2]); strip(12, 3, 0, .5, 14, [1.2, 1.6, 2.2]); strip(0, 1.2, -13, 20, .5, [.2, 1.2, 1.8]);
    const pm = new T.PMREMGenerator(W.renderer()); const env = pm.fromScene(envS, .03).texture; scene.environment = env; scene.environmentIntensity = .9;
    scene.add(new T.HemisphereLight(0x1c3558, 0x04060a, 1.2));
    for (const z of [-5, 0, 5]) { const l = new T.PointLight(0xcfe8ff, 110, 40, 2); l.position.set(-.5, 4.3, z); scene.add(l); }
    const rim = new T.DirectionalLight(0x35d8ff, 1.6); rim.position.set(-8, 5, -9); scene.add(rim);
    const std = (o) => new T.MeshStandardMaterial(o), glow = (c, k = 1) => new T.MeshBasicMaterial({ color: new T.Color(c[0] * k, c[1] * k, c[2] * k) });
    const CY = [.12, 1.0, 1.25], WH = [1.0, 1.25, 1.4];
    const wetTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), q = mul(9), im = g.createImageData(512, 512);
      const v = new Float32Array(512 * 512); for (let o = 0; o < 5; o++) { const sz = 4 << o, gr = Array.from({ length: (sz + 1) * (sz + 1) }, () => q());
        for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const fx = x / 512 * sz, fy = y / 512 * sz, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
          const a = gr[(iy % sz) * (sz + 1) + ix % sz], b = gr[(iy % sz) * (sz + 1) + (ix + 1) % sz], cc = gr[((iy + 1) % sz) * (sz + 1) + ix % sz], d = gr[((iy + 1) % sz) * (sz + 1) + (ix + 1) % sz];
          v[y * 512 + x] += (a + (b - a) * sx + (cc - a + (a - b + d - cc) * sx) * sy) / (1 << o); } }
      for (let i = 0; i < v.length; i++) { const k = cl((v[i] / 1.94 - .42) * 4), n = 40 + 170 * k + 30 * q(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = n; im.data[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(14, 14); return t; })();
    const ground = new T.Mesh(new T.PlaneGeometry(260, 260), std({ color: 0x0a0d12, roughness: .9, roughnessMap: wetTex, metalness: 0, transparent: true, opacity: .74, envMapIntensity: .8 }));
    ground.rotation.x = -Math.PI / 2; ground.renderOrder = 3; scene.add(ground);
    const paint = glow([.5, .62, .7], .55);
    for (let j = -4; j <= 4; j++) { const l = new T.Mesh(new T.BoxGeometry(5.4, .012, .12), paint); l.position.set(.2, .008, j * 3.3 + 1.65); l.renderOrder = 4; scene.add(l); }
    // far skyline
    const sky = []; for (let i = 0; i < 170; i++) { const x = (r() - .5) * 900, z = -150 - r() * 420, h = 30 + r() * 70 + (r() < .25 ? 120 * r() : 0); sky.push({ p: [x, 0, z], s: [22 + r() * 20, h, 22 + r() * 20], seed: r() });
      if (i % 3 === 0) sky.push({ p: [-180 - r() * 300, 0, (r() - .5) * 700], s: [24 + r() * 16, 30 + r() * 110, 24 + r() * 16], seed: r() }); }
    const skm = towerMaterial({ fog: 0x030b1a, fogD: .0042, key: 0x16304f }); skm.uniforms.uLit.value = .42; scene.add(instanced(unitBox(), skm, sky));
    scene.add(skyDome({ hor: 0x0a2850, zen: 0x01030a, limb: .5, stars: 1, pow: .25 }));

    const pulseMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uT: { value: 0 }, uOn: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'varying vec2 vUv; uniform float uT, uOn; void main(){ float p = pow(.5 + .5 * sin(vUv.x * 30. - uT * 9.), 6.); gl_FragColor = vec4(vec3(.12, .85, 1.) * (.35 + 2.6 * p) * uOn, 1.); }' });
    const ringMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uT: { value: 0 }, uOn: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uT, uOn; void main(){ vec2 p = (vUv - .5) * vec2(2., 2.); float d = length(p * vec2(1., 1.9));
        float rg = pow(.5 + .5 * sin(d * 16. - uT * 5.), 8.) * max(1. - d, 0.) + .35 * max(1. - d * 1.3, 0.); gl_FragColor = vec4(vec3(.1, .8, 1.) * rg * uOn * .8, 1.); }` });

    // everything above the ground is built twice: once upright, once mirrored for the wet floor
    function content() {
      const g = new T.Group(), dark = std({ color: 0x0b0f16, roughness: .42, metalness: .85 }), mid = std({ color: 0x232b36, roughness: .5, metalness: .7 });
      const add = (m, x, y, z, par = g) => { m.position.set(x, y, z); par.add(m); return m; };
      // canopy: a slab on two V columns, light strips under it, a cyan trim along its edge
      add(new T.Mesh(new T.BoxGeometry(9.4, .32, 28), dark), .6, 4.75, 0);
      for (const z of [-11.5, -8.2, -4.9, -1.6, 1.7, 5.0, 8.3, 11.6]) add(new T.Mesh(new T.BoxGeometry(7.6, .03, .16), glow(WH, 3.2)), .5, 4.575, z);
      add(new T.Mesh(new T.BoxGeometry(.05, .07, 28), glow(CY, 2.6)), -4.12, 4.66, 0); add(new T.Mesh(new T.BoxGeometry(.05, .07, 28), glow(CY, 2.6)), 5.32, 4.66, 0);
      for (const z of [-9, 9]) for (const s of [-1, 1]) { const c = add(new T.Mesh(new T.BoxGeometry(.34, 5.0, .5), mid), 4.6 + s * .55, 2.35, z); c.rotation.z = s * .23; }
      // charging pylons between the bays: a monolith, its light strip, screen, holster and cooling fins
      for (let j = -4; j <= 3; j++) { if (j === 1) continue; const z = j * 3.3 + 1.65, p = new T.Group(); p.position.set(3.7, 0, z); g.add(p);
        add(new T.Mesh(new T.BoxGeometry(.36, 2.25, .62), dark), 0, 1.125, 0, p); add(new T.Mesh(new T.BoxGeometry(.5, .08, .78), mid), 0, .04, 0, p);
        add(new T.Mesh(new T.BoxGeometry(.012, 1.75, .035), glow(CY, 3)), -.187, 1.2, .22, p); add(new T.Mesh(new T.BoxGeometry(.012, .34, .24), glow([.35, .7, 1.], 1.1)), -.187, 1.5, -.08, p);
        add(new T.Mesh(new T.BoxGeometry(.38, .03, .64), glow(CY, 1.6)), 0, 2.27, 0, p);
        for (let f = 0; f < 7; f++) add(new T.Mesh(new T.BoxGeometry(.03, 1.3, .05), mid), .2, .9, -.24 + f * .08, p); }
      // the car: a lofted body and glass, wheels, light bars
      const car = new T.Group(); g.add(car);
      const paintM = new T.MeshPhysicalMaterial({ color: 0xb4c2d2, metalness: .9, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 2.4 });
      const glass = std({ color: 0x04070b, metalness: 1, roughness: .05, envMapIntensity: 1.7 }), tyre = std({ color: 0x07080a, roughness: .85, metalness: .1 }), rimM = std({ color: 0xa9b6c4, metalness: 1, roughness: .25 });
      const body = densify([[2.42, .50, .40, .50], [2.34, .74, .31, .58], [2.05, .90, .25, .66], [1.45, .955, .22, .74], [.6, .97, .21, .80], [-.5, .975, .21, .84], [-1.4, .97, .22, .88], [-2.0, .93, .25, .90], [-2.32, .84, .31, .87], [-2.44, .62, .42, .80]], 5);
      car.add(new T.Mesh(loft(body, 48, 4.2), paintM));
      const cabin = densify([[1.25, .62, .66, .70], [.95, .72, .68, .92], [.45, .77, .70, 1.16], [-.2, .79, .72, 1.25], [-.9, .78, .74, 1.24], [-1.5, .73, .76, 1.10], [-2.0, .64, .78, .93], [-2.25, .5, .80, .86]], 5);
      car.add(new T.Mesh(loft(cabin, 40, 2.8), glass));
      const wheels = [];
      for (const x of [1.5, -1.47]) for (const z of [.86, -.86]) { const w = new T.Group(); w.position.set(x, .355, z); car.add(w); wheels.push(w);
        const ty = new T.Mesh(new T.CylinderGeometry(.355, .355, .27, 40), tyre); ty.rotation.x = Math.PI / 2; w.add(ty);
        const ri = new T.Mesh(new T.CylinderGeometry(.25, .25, .285, 32), rimM); ri.rotation.x = Math.PI / 2; w.add(ri);
        for (let s = 0; s < 5; s++) { const sp = new T.Mesh(new T.BoxGeometry(.05, .46, .3), tyre); sp.rotation.z = s * Math.PI / 5; w.add(sp); }
        const rg = new T.Mesh(new T.TorusGeometry(.262, .009, 8, 48), glow(CY, 1.8)); rg.position.z = Math.sign(z) * .145; w.add(rg);
        const arch = new T.Mesh(new T.TorusGeometry(.4, .045, 10, 40, Math.PI), std({ color: 0x05070a, roughness: .6, metalness: .3 })); arch.position.set(x, .36, Math.sign(z) * .93); car.add(arch); }
      add(new T.Mesh(new T.BoxGeometry(.03, .028, 1.5), glow(WH, 4)), 2.395, .5, 0, car);
      for (const z of [.62, -.62]) add(new T.Mesh(new T.BoxGeometry(.05, .05, .26), glow(WH, 5)), 2.33, .44, z, car);
      add(new T.Mesh(new T.BoxGeometry(.03, .03, 1.46), glow([1.6, .12, .1], 1.6)), -2.43, .74, 0, car);
      const lines = [.985, -.985].map((z) => add(new T.Mesh(new T.BoxGeometry(3.1, .018, .012), glow(CY, 1)), .02, .3, z, car));
      const port = add(new T.Mesh(new T.TorusGeometry(.065, .012, 8, 28), glow(CY, 1)), 1.95, .68, .915, car); port.rotation.y = .12;
      const shadow = new T.Mesh(new T.PlaneGeometry(5.9, 2.9), new T.MeshBasicMaterial({ map: W.blob(), transparent: true, depthWrite: false, color: 0x000000 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; shadow.renderOrder = 5; car.add(shadow);
      const under = new T.Mesh(new T.PlaneGeometry(7.5, 4.4), ringMat()); under.rotation.x = -Math.PI / 2; under.position.y = .02; under.renderOrder = 6; car.add(under);
      // the cable and its plug: rebuilt each frame as the plug travels from the holster to the port
      const cableM = std({ color: 0x0c0f13, roughness: .6, metalness: .2 }), flow = pulseMat();
      const cable = new T.Mesh(new T.BufferGeometry(), cableM), cflow = new T.Mesh(new T.BufferGeometry(), flow), plug = new T.Mesh(new T.BoxGeometry(.2, .1, .09), mid); g.add(cable, cflow, plug);
      const A = new T.Vector3(3.5, 1.35, 1.72), H = new T.Vector3(3.48, 1.02, 1.5), M = new T.Vector3(), E = new T.Vector3();
      return { g, update(t, carX, wheelA, plugK, on) {
        car.position.x = carX; wheels.forEach((w) => (w.rotation.z = wheelA));
        E.set(1.98 + carX, .68, .99).lerp(H, 1 - plugK); E.y += Math.sin(plugK * Math.PI) * .28; E.z += Math.sin(plugK * Math.PI) * .25;
        M.copy(A).lerp(E, .5); M.y = mix(.42, .5, plugK); M.z += .45;
        const curve = new T.CatmullRomCurve3([A, new T.Vector3(A.x - .1, A.y - .35, A.z + .22), M, new T.Vector3(mix(E.x, M.x, .3) , E.y - .05, E.z + .2), E]);
        cable.geometry.dispose(); cflow.geometry.dispose(); cable.geometry = new T.TubeGeometry(curve, 48, .026, 8, false); cflow.geometry = new T.TubeGeometry(curve, 48, .034, 8, false);
        plug.position.copy(E); plug.rotation.y = mix(.4, .1, plugK);
        flow.uniforms.uT.value = t; flow.uniforms.uOn.value = on; under.material.uniforms.uT.value = t; under.material.uniforms.uOn.value = on;
        const kk = .25 + 3.2 * on * (.75 + .25 * Math.sin(t * 6)); lines.forEach((l) => l.material.color.setRGB(CY[0] * kk, CY[1] * kk, CY[2] * kk)); port.material.color.setRGB(CY[0] * (1 + 4 * on), CY[1] * (1 + 4 * on), CY[2] * (1 + 4 * on));
      } };
    }
    const real = content(), mir = content(); mir.g.scale.y = -1; scene.add(real.g, mir.g);
    const tmp = new T.Vector3();
    return { scene, cam, near: .1, far: 2000, update(t, k) {
      skm.uniforms.uT.value = t;
      const ta = cl((t - 17) / 2.3), e = 1 - Math.pow(1 - ta, 2.6), carX = mix(-15, 0, e), plugK = ss(19.25, 20.0, t), on = ss(20.0, 20.5, t);
      real.update(t, carX, -carX / .355, plugK, on); mir.update(t, carX, -carX / .355, plugK, on);
      const o = k * k * (3 - 2 * k), az = mix(2.5, .9, o), rad = mix(8.6, 6.4, o);
      tmp.set(mix(carX * .55, .35, o), mix(.62, .72, o), 0);
      cam.position.set(tmp.x + Math.cos(az) * rad, mix(1.0, 1.75, o), Math.sin(az) * rad); cam.up.set(0, 1, 0); cam.lookAt(tmp); cam.fov = mix(44, 38, o); cam.updateProjectionMatrix();
      return { exposure: 1.1, aperture: .3, focus: cam.position.distanceTo(new T.Vector3(carX, .7, 0)) };
    } };
  }

  W.builders.energy = buildEnergy; W.builders.station = buildStation;
})();
