// Render 3D (three.js): maqueta low-poly del mapa sobre un manto tejido.
(function (PC) {
  'use strict';
  const SQ3 = Math.sqrt(3);
  const R = PC.R = {
    ready: false, showRegions: false, sel: null, reach: null, targets: null, hover: null, path: null,
    preview: false, quality: 'alta'
  };
  let THREE = globalThis.THREE, renderer, scene, camera, raycaster, sun, clock;
  let mapRef = null, tileList = [], orderOf = new Map();
  let tileMesh, borderMesh, regionMesh, roadMesh, decoMeshes = [], cloudMesh, overlayGroup, unitGroup, cityGroup, featGroup;
  let mat, matBasic;
  const cam = { tx: 0, tz: 0, dist: 20, az: 0.35, minD: 5, maxD: 46 };
  const camGoal = { tx: 0, tz: 0, active: false };
  const unitViews = new Map(), cityViews = new Map(), featViews = new Map();
  const geoCache = {}, texCache = {};
  let labelLayer = null;
  const labels = new Map();

  // ---------------------------------------------------------------- utilidades
  const HEIGHT = { oceano: 0.04, lago: 0.1, desierto: 0.24, valle: 0.2, sierra: 0.55, puna: 0.78, cordillera: 0.95, ceja: 0.42, selva: 0.28,
    llanura: 0.22, pampa: 0.2, estepa: 0.26, bosque: 0.32, pradera: 0.2, taiga: 0.3, tundra: 0.22 };
  R.tileXZ = (t) => [(t.c + 0.5 * (t.r & 1)) * SQ3, t.r * 1.5];
  R.tileTop = (t) => HEIGHT[t.terrain] + (t.terrain === 'oceano' ? 0 : (PC.hash2(t.c, t.r, 11) - 0.5) * 0.06);
  const C = (hex) => new THREE.Color(hex);

  function baseGeo(kind) {
    if (geoCache['b_' + kind]) return geoCache['b_' + kind];
    let g;
    switch (kind) {
      case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
      case 'cyl': g = new THREE.CylinderGeometry(1, 1, 1, 7); break;
      case 'cyl6': g = new THREE.CylinderGeometry(1, 1, 1, 6); break;
      case 'cyl12': g = new THREE.CylinderGeometry(1, 1, 1, 12); break;
      case 'cone': g = new THREE.ConeGeometry(1, 1, 6); break;
      case 'cone4': g = new THREE.ConeGeometry(1, 1, 4); break;
      case 'sph': g = new THREE.SphereGeometry(1, 7, 5); break;
      case 'ico': g = new THREE.IcosahedronGeometry(1, 0); break;
      case 'dodec': g = new THREE.DodecahedronGeometry(1, 0); break;
      case 'torus': g = new THREE.TorusGeometry(1, 0.18, 4, 10); break;
      case 'halftorus': g = new THREE.TorusGeometry(1, 0.12, 4, 8, Math.PI); break;
      case 'prism': { g = new THREE.CylinderGeometry(1, 1, 1, 3); break; }
      default: g = new THREE.BoxGeometry(1, 1, 1);
    }
    geoCache['b_' + kind] = g;
    return g;
  }
  // Pieza: [tipo, color, x, y, z, sx, sy, sz, rx, ry, rz]
  function merge(parts) {
    const pos = [], nor = [], col = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const vp = new THREE.Vector3(), vs = new THREE.Vector3();
    parts.forEach((p) => {
      const [kind, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0] = p;
      const src = baseGeo(kind);
      const g = src.index ? src.toNonIndexed() : src.clone();
      e.set(rx, ry, rz); q.setFromEuler(e); vp.set(x, y, z); vs.set(sx, sy, sz);
      m.compose(vp, q, vs);
      g.applyMatrix4(m);
      g.computeVertexNormals();
      const c = C(color);
      const pa = g.attributes.position.array, na = g.attributes.normal.array;
      for (let i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      for (let i = 0; i < pa.length / 3; i++) col.push(c.r, c.g, c.b);
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }
  function cachedGeo(key, build) {
    if (!geoCache[key]) geoCache[key] = merge(build());
    return geoCache[key];
  }
  function shadeHex(hex, f) { const c = C(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

  // ---------------------------------------------------------------- texturas tejidas
  function clothTexture() {
    if (texCache.cloth) return texCache.cloth;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = '#141b33'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 2) { x.fillStyle = i % 4 ? '#172042' : '#131a30'; x.fillRect(0, i, 128, 1); }
    // cenefa escalonada
    x.fillStyle = '#3a1c34';
    for (let k = 0; k < 8; k++) for (let s = 0; s < 8; s++) x.fillRect(k * 16 + s * 2, 58 + Math.abs(s - 4) * 2, 2, 2);
    PC.drawGrid(x, PC.ICONS.cohesion, 46, 10, 4, '#2a2550', '#3b2140');
    PC.drawGrid(x, PC.ICONS.oro, 46, 82, 4, '#2a2550', '#3b2140');
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 36); t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    texCache.cloth = t;
    return t;
  }
  function emblemTexture(civ) {
    const key = 'em_' + civ.key + civ.color;
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = 72; cv.height = 54;
    const x = cv.getContext('2d');
    x.fillStyle = civ.color; x.fillRect(0, 0, 72, 54);
    x.fillStyle = '#efe4cc'; x.fillRect(0, 48, 72, 6);
    for (let i = 0; i < 72; i += 6) { x.fillStyle = '#1a1426'; x.fillRect(i, 50, 3, 2); }
    PC.drawGrid(x, PC.emblemGrid(civ.key), 18, 3, 4, '#1a1426', '#efe4cc');
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    texCache[key] = t;
    return t;
  }

  // ---------------------------------------------------------------- inicialización
  R.init = function (container, overlay) {
    THREE = window.THREE;
    if (!THREE) throw new Error('three.js no está disponible');
    FOG_TOP = C('#1c2445');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.id = 'map3d';
    scene = new THREE.Scene();
    scene.background = C('#10162b');
    scene.fog = new THREE.Fog(0x10162b, 30, 75);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    raycaster = new THREE.Raycaster();
    const hemi = new THREE.HemisphereLight(0xf6e7c8, 0x253056, 1.35);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0008;
    scene.add(sun); scene.add(sun.target);
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0.04 });
    matBasic = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 1 }));
    cloth.rotation.x = -Math.PI / 2; cloth.position.y = -0.03; cloth.receiveShadow = true;
    scene.add(cloth);
    overlayGroup = new THREE.Group(); unitGroup = new THREE.Group(); cityGroup = new THREE.Group(); featGroup = new THREE.Group();
    scene.add(overlayGroup, unitGroup, cityGroup, featGroup);
    labelLayer = overlay;
    clock = new THREE.Clock();
    R.ready = true;
    R.resize();
    requestAnimationFrame(loop);
  };
  R.resize = function () {
    if (!renderer) return;
    const el = renderer.domElement.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    R.w = w; R.h = h;
  };
  R.setQuality = function (q) {
    R.quality = q;
    renderer.shadowMap.enabled = q === 'alta';
    renderer.setPixelRatio(q === 'alta' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    R.resize();
  };

  // ---------------------------------------------------------------- cámara
  function updateCamera() {
    if (camGoal.active) {
      cam.tx += (camGoal.tx - cam.tx) * 0.14; cam.tz += (camGoal.tz - cam.tz) * 0.14;
      if (Math.abs(camGoal.tx - cam.tx) + Math.abs(camGoal.tz - cam.tz) < 0.01) camGoal.active = false;
    }
    const k = (cam.dist - cam.minD) / (cam.maxD - cam.minD);
    const tilt = 0.95 - 0.45 * k; // más inclinada de cerca
    camera.position.set(cam.tx + Math.sin(cam.az) * Math.sin(tilt) * cam.dist, Math.cos(tilt) * cam.dist, cam.tz + Math.cos(cam.az) * Math.sin(tilt) * cam.dist);
    camera.lookAt(cam.tx, 0, cam.tz);
    sun.position.set(cam.tx - 9, 16, cam.tz + 7); sun.target.position.set(cam.tx, 0, cam.tz);
  }
  R.pan = function (dx, dy) {
    const f = cam.dist / 600;
    const ca = Math.cos(cam.az), sa = Math.sin(cam.az);
    cam.tx += (-dx * ca - dy * sa) * f; cam.tz += (dx * sa - dy * ca) * f;
    camGoal.active = false;
  };
  R.rotate = function (d) { cam.az += d; };
  R.zoom = function (f) { cam.dist = PC.clamp(cam.dist * f, cam.minD, cam.maxD); };
  R.centerOn = function (t, instant) {
    const [x, z] = R.tileXZ(t);
    camGoal.tx = x; camGoal.tz = z; camGoal.active = true;
    if (instant) { cam.tx = x; cam.tz = z; camGoal.active = false; }
  };
  R.pick = function (mx, my) {
    if (!tileMesh) return null;
    const v = new THREE.Vector2((mx / R.w) * 2 - 1, -(my / R.h) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    const hit = raycaster.intersectObject(tileMesh, false)[0];
    if (!hit) return null;
    return tileList[Math.floor(hit.faceIndex / 18)] || null;
  };

  // ---------------------------------------------------------------- mapa base
  const TOP_FACES = 6;
  function hexCorner(cx, cz, k, s) { const a = Math.PI / 180 * (60 * k - 30); return [cx + s * Math.cos(a), cz + s * Math.sin(a)]; }
  function buildTiles() {
    const g = PC.G;
    tileList = g.map.tiles.filter(Boolean);
    orderOf = new Map(tileList.map((t, k) => [t.i, k]));
    const pos = new Float32Array(tileList.length * 54 * 3);
    let p = 0;
    const push = (x, y, z) => { pos[p++] = x; pos[p++] = y; pos[p++] = z; };
    tileList.forEach((t) => {
      const [cx, cz] = R.tileXZ(t);
      const h = R.tileTop(t);
      const S = 1.0;
      for (let k = 0; k < TOP_FACES; k++) {
        const [ax, az] = hexCorner(cx, cz, k, S), [bx, bz] = hexCorner(cx, cz, k + 1, S);
        push(cx, h, cz); push(bx, h, bz); push(ax, h, az);
      }
      for (let k = 0; k < 6; k++) {
        const [ax, az] = hexCorner(cx, cz, k, S), [bx, bz] = hexCorner(cx, cz, k + 1, S);
        push(ax, h, az); push(bx, h, bz); push(ax, -0.02, az);
        push(bx, h, bz); push(bx, -0.02, bz); push(ax, -0.02, az);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    geo.computeVertexNormals();
    if (tileMesh) { scene.remove(tileMesh); tileMesh.geometry.dispose(); }
    if (!R.matTile) R.matTile = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide });
    tileMesh = new THREE.Mesh(geo, R.matTile);
    tileMesh.receiveShadow = true;
    scene.add(tileMesh);
  }
  let FOG_TOP = null;
  function tileColors() {
    const col = tileMesh.geometry.attributes.color;
    const c = new THREE.Color(), side = new THREE.Color(), tint = new THREE.Color();
    tileList.forEach((t, k) => {
      const explored = PC.isExplored(t.i), visible = PC.isVisible(t.i);
      if (!explored) c.copy(FOG_TOP);
      else {
        c.set(PC.TERRAIN[t.terrain].color).multiplyScalar(0.9 + PC.hash2(t.c, t.r, 3) * 0.2);
        if (t.owner && t.terrain !== 'oceano') { tint.set(PC.civ(t.owner).color); c.lerp(tint, 0.1); }
        if (!visible && t.terrain !== 'oceano') c.multiplyScalar(0.58);
      }
      side.copy(c).multiplyScalar(0.62);
      const base = k * 54;
      for (let v = 0; v < 18; v++) col.setXYZ(base + v, c.r, c.g, c.b);
      for (let v = 18; v < 54; v++) col.setXYZ(base + v, side.r, side.g, side.b);
    });
    col.needsUpdate = true;
  }

  // Decoración por terreno con InstancedMesh (árboles, nevados, colinas, dunas, chacras, nubes).
  function decoGeo(kind) {
    return cachedGeo('deco_' + kind, () => {
      switch (kind) {
        case 'arbol': return [['cyl', '#4a3020', 0, 0.08, 0, 0.025, 0.16, 0.025], ['cone', '#245a2e', 0, 0.26, 0, 0.13, 0.26, 0.13], ['cone', '#2c6a35', 0, 0.38, 0, 0.09, 0.18, 0.09]];
        case 'arbol_ceja': return [['cyl', '#4a3020', 0, 0.08, 0, 0.022, 0.16, 0.022], ['dodec', '#3f7d3a', 0, 0.27, 0, 0.14, 0.13, 0.14], ['dodec', '#4f8c42', 0.05, 0.36, 0.02, 0.08, 0.08, 0.08]];
        case 'palmera': return [['cyl', '#6b5030', 0, 0.16, 0, 0.02, 0.32, 0.02], ['cone', '#3d7a33', 0, 0.34, 0, 0.16, 0.06, 0.16]];
        case 'nevado': return [['cone', '#7d7770', 0, 0.3, 0, 0.36, 0.6, 0.36], ['cone', '#f2f2f4', 0, 0.52, 0, 0.15, 0.17, 0.15]];
        case 'colina': return [['dodec', '#8f7f52', 0, 0.02, 0, 0.26, 0.12, 0.22]];
        case 'ichu': return [['cone', '#c9b46a', 0, 0.05, 0, 0.05, 0.1, 0.05], ['cone', '#bfa85c', 0.06, 0.04, 0.03, 0.04, 0.08, 0.04]];
        case 'duna': return [['sph', '#e3cc94', 0, 0, 0, 0.3, 0.07, 0.18]];
        case 'surco': return [['box', '#6f9a3f', 0, 0.015, 0, 0.5, 0.03, 0.06], ['box', '#9db24f', 0, 0.015, 0.12, 0.5, 0.03, 0.06], ['box', '#6f9a3f', 0, 0.015, -0.12, 0.5, 0.03, 0.06]];
        case 'pasto': return [['cone', '#8fae5a', 0, 0.04, 0, 0.04, 0.08, 0.04]];
        case 'nube': return [['ico', '#aaa6c4', 0, 0, 0, 0.5, 0.22, 0.42], ['ico', '#bdb9d4', 0.32, 0.08, 0.12, 0.36, 0.2, 0.3], ['ico', '#9e9aba', -0.3, 0.04, -0.14, 0.34, 0.18, 0.3], ['ico', '#b3afcc', 0.05, 0.14, -0.25, 0.3, 0.16, 0.26]];
        default: return [['box', '#ff00ff']];
      }
    });
  }
  const DECO_RULES = {
    selva: [['arbol', 4], ['palmera', 1]], ceja: [['arbol_ceja', 3]], bosque: [['arbol', 3]],
    cordillera: [['nevado', 2]], sierra: [['colina', 2], ['pasto', 2]], puna: [['ichu', 4]], estepa: [['ichu', 3]],
    desierto: [['duna', 2]], valle: [['surco', 1], ['arbol_ceja', 1]], llanura: [['pasto', 3]], pampa: [['pasto', 4]],
    pradera: [['pasto', 4]], taiga: [['arbol_ceja', 4]], tundra: [['ichu', 2]]
  };
  let decoBase = []; // {mesh, items:[{tile, matrix}]}
  function buildDeco() {
    decoMeshes.forEach((m) => { scene.remove(m); });
    decoMeshes = []; decoBase = [];
    const per = {};
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3();
    tileList.forEach((t) => {
      let rules = DECO_RULES[t.terrain] || [];
      if (t.terrain === 'cordillera' && t.feature === 'abra') rules = [['nevado', 2]];
      const [cx, cz] = R.tileXZ(t);
      const h = R.tileTop(t);
      let n = 0;
      rules.forEach(([kind, count]) => {
        for (let j = 0; j < count; j++, n++) {
          const r1 = PC.hash2(t.c * 3 + j, t.r * 5 + n, 21), r2 = PC.hash2(t.c * 7 + n, t.r * 3 + j, 22);
          let ang = r1 * Math.PI * 2, rad = 0.25 + r2 * 0.5;
          if (t.terrain === 'cordillera') { ang = (n / 2) * Math.PI * 2 + (t.feature === 'abra' ? 0 : r1); rad = t.feature === 'abra' ? 0.55 : 0.32; }
          const s = kind === 'nevado' ? (0.85 + r2 * 0.5) : (0.75 + r2 * 0.5);
          e.set(0, r1 * 6.28, 0); q.setFromEuler(e);
          vp.set(cx + Math.cos(ang) * rad, h, cz + Math.sin(ang) * rad); vs.set(s, s, s);
          m4.compose(vp, q, vs);
          (per[kind] = per[kind] || []).push({ tile: t, matrix: m4.clone() });
        }
      });

    });
    Object.keys(per).forEach((kind) => {
      const items = per[kind];
      const mesh = new THREE.InstancedMesh(decoGeo(kind), mat, items.length);
      mesh.castShadow = kind !== 'nube' && kind !== 'surco'; mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      scene.add(mesh); decoMeshes.push(mesh); decoBase.push({ mesh, items, kind });
    });
  }
  let ZERO = null;
  function decoVisibility() {
    if (!ZERO) ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    decoBase.forEach(({ mesh, items, kind }) => {
      items.forEach((it, k) => {
        const ex = PC.isExplored(it.tile.i);
        const show = ex && !(it.tile.cityId && ['arbol', 'arbol_ceja', 'palmera', 'surco', 'colina'].includes(kind));
        mesh.setMatrixAt(k, show ? it.matrix : ZERO);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Niebla de guerra: un manto continuo (no piezas sueltas) cuya máscara se pinta en un canvas
  // con las casillas inexploradas y se difumina; una textura de nubes se desliza despacio encima.
  let fog = null;
  function noiseTexture() {
    if (texCache.noise) return texCache.noise;
    const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d');
    const img = x.createImageData(n, n);
    for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) {
      let v = 0, amp = 1, tot = 0;
      for (let o = 0; o < 4; o++) { const f = 4 << o; v += amp * (PC.noise2(xx * f / n, yy * f / n, 77 + o) * 0.5 + PC.noise2(((xx + n / 2) % n) * f / n, yy * f / n, 77 + o) * 0.5); tot += amp; amp *= 0.5; }
      v /= tot;
      const c = 150 + v * 105;
      const k = (yy * n + xx) * 4;
      img.data[k] = c * 0.86; img.data[k + 1] = c * 0.85; img.data[k + 2] = c; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    texCache.noise = t;
    return t;
  }
  function buildFog() {
    if (fog) { fog.layers.forEach((m) => { scene.remove(m); m.geometry.dispose(); }); }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    tileList.forEach((t) => { const [x, z] = R.tileXZ(t); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
    x0 -= 3; x1 += 3; z0 -= 3; z1 += 3;
    const scale = 12;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * scale); cv.height = Math.ceil((z1 - z0) * scale);
    const work = document.createElement('canvas'); work.width = cv.width; work.height = cv.height;
    const mask = new THREE.CanvasTexture(cv);
    const layers = [0, 1].map((k) => {
      const tex = noiseTexture().clone(); tex.needsUpdate = true; tex.repeat.set((x1 - x0) / (k ? 9 : 14), (z1 - z0) / (k ? 9 : 14));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({
        color: k ? 0xc9c4e0 : 0x8e8ab0, map: tex, alphaMap: mask, transparent: true, depthWrite: false, roughness: 1, opacity: k ? 0.55 : 1 }));
      m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, k ? 1.32 : 1.12, (z0 + z1) / 2); m.renderOrder = 6 + k;
      scene.add(m);
      return m;
    });
    fog = { cv, work, mask, layers, x0, z0, scale };
  }
  function updateFog() {
    if (!fog) return;
    const { cv, work, scale, x0, z0 } = fog;
    const w = work.getContext('2d');
    w.clearRect(0, 0, work.width, work.height);
    w.fillStyle = '#fff';
    tileList.forEach((t) => {
      if (PC.isExplored(t.i)) return;
      const [cx, cz] = R.tileXZ(t);
      w.beginPath();
      for (let k = 0; k < 6; k++) { const [a, b] = hexCorner(cx, cz, k, 1.12); const px = (a - x0) * scale, py = (b - z0) * scale; if (k) w.lineTo(px, py); else w.moveTo(px, py); }
      w.closePath(); w.fill();
    });
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.filter = 'blur(7px)';
    c.drawImage(work, 0, 0);
    c.filter = 'none';
    fog.mask.needsUpdate = true;
    fog.layers.forEach((m) => { m.visible = !PC.G.revealAll; });
  }

  // Ríos, abras y lagos: piezas fijas por casilla.
  function buildFeatures() {
    while (featGroup.children.length) featGroup.remove(featGroup.children[0]);
    const parts = [];
    tileList.forEach((t) => {
      const [cx, cz] = R.tileXZ(t);
      const h = R.tileTop(t);
      if (t.feature === 'rio' || t.terrain === 'valle') {
        const a = PC.hash2(t.c, t.r, 41) * Math.PI;
        parts.push(['box', '#3f8fc4', cx, h + 0.012, cz, 1.7, 0.02, 0.13, 0, a, 0]);
      }
      if (t.feature === 'abra') {
        parts.push(['box', '#d9a441', cx, h + 0.02, cz, 1.5, 0.03, 0.12, 0, 0.5, 0]);
        parts.push(['cone4', '#8a7a5a', cx, h + 0.15, cz, 0.06, 0.3, 0.06]);
      }
      if (t.terrain === 'lago') parts.push(['cyl12', '#3a85b5', cx, h + 0.01, cz, 0.85, 0.02, 0.85]);
    });
    if (parts.length) {
      const m = new THREE.Mesh(merge(parts), mat);
      m.receiveShadow = true;
      featGroup.add(m);
    }
  }

  // Fronteras de territorio y de provincias.
  function edgeQuad(parts, t, k, h, color, w, inset) {
    const [cx, cz] = R.tileXZ(t);
    const [ax, az] = hexCorner(cx, cz, k, 1 - inset), [bx, bz] = hexCorner(cx, cz, k + 1, 1 - inset);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const len = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bz - az, bx - ax);
    parts.push(['box', color, mx, h, mz, len, 0.035, w, 0, -ang, 0]);
  }
  const EDGE_DIR = [0, 5, 4, 3, 2, 1]; // índice de vecino → lado del hexágono
  function buildBorders() {
    if (borderMesh) { scene.remove(borderMesh); borderMesh.geometry.dispose(); borderMesh = null; }
    if (regionMesh) { scene.remove(regionMesh); regionMesh.geometry.dispose(); regionMesh = null; }
    const parts = [], rparts = [];
    tileList.forEach((t) => {
      if (!PC.isExplored(t.i)) return;
      const nb = PC.hexNeighborsCR(t.c, t.r);
      const h = R.tileTop(t) + 0.03;
      nb.forEach(([c, r], j) => {
        const n = PC.tileCR(c, r);
        const side = (EDGE_DIR[j] + 6 - 0) % 6;
        if (t.owner && (!n || n.owner !== t.owner)) edgeQuad(parts, t, side, h, PC.civ(t.owner).color, 0.09, 0.07);
        if (R.showRegions && n && t.region && n.region && n.region !== t.region) edgeQuad(rparts, t, side, h + 0.01, '#efe4cc', 0.035, 0.0);
      });
    });
    if (parts.length) { borderMesh = new THREE.Mesh(merge(parts), matBasic); borderMesh.renderOrder = 2; scene.add(borderMesh); }
    if (rparts.length) { regionMesh = new THREE.Mesh(merge(rparts), matBasic); regionMesh.renderOrder = 3; scene.add(regionMesh); }
  }
  function buildRoads() {
    if (roadMesh) { scene.remove(roadMesh); roadMesh.geometry.dispose(); roadMesh = null; }
    const parts = [];
    tileList.forEach((t) => {
      if (!t.road || !PC.isExplored(t.i)) return;
      const [x1, z1] = R.tileXZ(t), h1 = R.tileTop(t);
      PC.neighbors(t).forEach((n) => {
        if (!n.road || n.i < t.i || !PC.isExplored(n.i)) return;
        const [x2, z2] = R.tileXZ(n), h2 = R.tileTop(n);
        const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, my = (h1 + h2) / 2 + 0.03;
        const len = Math.hypot(x2 - x1, z2 - z1);
        const ang = Math.atan2(z2 - z1, x2 - x1);
        const slope = Math.atan2(h2 - h1, len);
        parts.push(['box', '#8a6a44', mx, my, mz, len, 0.035, 0.11, 0, -ang, slope]);
        parts.push(['box', '#b39264', mx, my + 0.012, mz, len, 0.02, 0.05, 0, -ang, slope]);
      });
    });
    if (parts.length) { roadMesh = new THREE.Mesh(merge(parts), mat); roadMesh.receiveShadow = true; scene.add(roadMesh); }
  }

  // ---------------------------------------------------------------- recursos, mejoras y fauna
  const RES_COLOR = { oro: '#e6b422', plata: '#dadbe3', cobre: '#c8743a', estano: '#9aa0a8', hierro: '#7a4a35', carbon: '#232323', mercurio: '#b5162b', salitre: '#f1eee2' };
  function resParts(res) {
    if (RES_COLOR[res]) {
      const c = RES_COLOR[res];
      return [['dodec', '#5d5248', 0, 0.06, 0, 0.13, 0.08, 0.12], ['ico', c, -0.05, 0.12, 0.02, 0.06, 0.06, 0.06], ['ico', c, 0.06, 0.11, -0.03, 0.05, 0.05, 0.05], ['ico', c, 0.0, 0.16, 0.05, 0.045, 0.045, 0.045]];
    }
    switch (res) {
      case 'guano': return [['sph', '#ece7da', 0, 0.03, 0, 0.18, 0.08, 0.14], ['sph', '#f7f7f7', 0.04, 0.12, 0, 0.04, 0.03, 0.06], ['box', '#f7f7f7', 0.04, 0.13, 0, 0.12, 0.01, 0.03]];
      case 'petroleo': return [['cyl12', '#111111', 0, 0.01, 0, 0.16, 0.02, 0.16], ['cone4', '#3c3c3c', 0.08, 0.16, 0, 0.06, 0.32, 0.06], ['box', '#555555', 0.08, 0.3, 0, 0.16, 0.02, 0.02]];
      case 'caucho': return [['cyl', '#5a4030', 0, 0.16, 0, 0.03, 0.32, 0.03], ['dodec', '#2f6b35', 0, 0.38, 0, 0.16, 0.12, 0.16], ['cyl', '#efe4cc', 0.04, 0.1, 0, 0.025, 0.04, 0.025]];
      case 'castana': return [['cyl', '#5a4030', 0, 0.2, 0, 0.035, 0.4, 0.035], ['dodec', '#356e2c', 0, 0.46, 0, 0.2, 0.12, 0.2], ['ico', '#7a4a25', 0.08, 0.04, 0.05, 0.04, 0.04, 0.04]];
      case 'alpacas': return quadruped('#efe4cc', 0, 0).concat(quadruped('#8a6040', 0.14, 0.1));
      case 'coca': return [['dodec', '#3caa3c', -0.05, 0.05, 0, 0.07, 0.06, 0.07], ['dodec', '#4cbf45', 0.07, 0.05, 0.03, 0.06, 0.05, 0.06], ['dodec', '#3caa3c', 0.01, 0.05, -0.07, 0.06, 0.05, 0.06]];
      case 'cacao': return [['cyl', '#5a4030', 0, 0.08, 0, 0.02, 0.16, 0.02], ['dodec', '#3f7d3a', 0, 0.2, 0, 0.1, 0.08, 0.1], ['sph', '#a0522d', 0.05, 0.12, 0.03, 0.03, 0.05, 0.03], ['sph', '#c27a2c', -0.04, 0.13, 0.03, 0.03, 0.05, 0.03]];
      case 'maiz': return [0, 1, 2].flatMap((k) => [['cyl', '#7a9a3a', -0.08 + k * 0.08, 0.1, 0, 0.012, 0.2, 0.012], ['sph', '#e8c13a', -0.08 + k * 0.08, 0.15, 0.015, 0.02, 0.045, 0.02]]);
      case 'papa': return [['dodec', '#8a6a44', 0, 0.02, 0, 0.08, 0.04, 0.08], ['dodec', '#8a6a44', 0.1, 0.02, 0.04, 0.07, 0.035, 0.07], ['pasto', '#5f8f3a']].filter((p) => p[0] !== 'pasto');
      case 'quinua': return [0, 1, 2].map((k) => ['cone', ['#c0392b', '#e67e22', '#d35400'][k], -0.07 + k * 0.07, 0.08, 0, 0.03, 0.16, 0.03]);
      case 'vid': return [['box', '#6b4a2f', 0, 0.07, 0, 0.24, 0.02, 0.02], ['sph', '#6c2a6a', -0.06, 0.05, 0.01, 0.03, 0.04, 0.03], ['sph', '#6c2a6a', 0.05, 0.05, 0.01, 0.03, 0.04, 0.03]];
      case 'algodon': return [['dodec', '#5f7f3a', 0, 0.04, 0, 0.08, 0.05, 0.08], ['sph', '#ffffff', 0.03, 0.09, 0, 0.035, 0.03, 0.035], ['sph', '#ffffff', -0.04, 0.08, 0.03, 0.03, 0.03, 0.03]];
      case 'spondylus': return [['sph', '#d4553a', 0, 0.04, 0, 0.09, 0.05, 0.08], ['cone', '#e8806a', 0.04, 0.08, 0, 0.02, 0.05, 0.02], ['cone', '#e8806a', -0.04, 0.08, 0.02, 0.02, 0.05, 0.02]];
      case 'sal': return [['box', '#f4f2ec', -0.06, 0.01, 0, 0.1, 0.02, 0.1], ['box', '#e8e4da', 0.06, 0.01, 0.04, 0.1, 0.02, 0.1], ['cone4', '#ffffff', 0, 0.05, -0.06, 0.04, 0.08, 0.04]];
      case 'pesca': return [['sph', '#c0c8d0', -0.05, 0.05, 0, 0.08, 0.035, 0.03, 0, 0, 0.3], ['cone4', '#a0a8b0', 0.04, 0.07, 0, 0.03, 0.05, 0.015, 0, 0, -1.2], ['sph', '#c0c8d0', 0.08, 0.03, 0.1, 0.06, 0.025, 0.025, 0, 0.6, -0.3]];
      default: return [['ico', '#ffffff', 0, 0.06, 0, 0.06, 0.06, 0.06]];
    }
  }
  function quadruped(color, x, z) {
    return [['box', color, x, 0.12, z, 0.18, 0.08, 0.08], ['box', color, x + 0.08, 0.2, z, 0.04, 0.14, 0.04], ['box', color, x + 0.11, 0.27, z, 0.07, 0.04, 0.04],
      ['box', '#3a2a20', x - 0.06, 0.04, z - 0.025, 0.025, 0.08, 0.025], ['box', '#3a2a20', x + 0.06, 0.04, z - 0.025, 0.025, 0.08, 0.025],
      ['box', '#3a2a20', x - 0.06, 0.04, z + 0.025, 0.025, 0.08, 0.025], ['box', '#3a2a20', x + 0.06, 0.04, z + 0.025, 0.025, 0.08, 0.025]];
  }
  function impParts(imp) {
    switch (imp) {
      case 'chacra': return [-0.12, 0, 0.12].map((z) => ['box', '#7a5a35', 0, 0.015, z, 0.45, 0.03, 0.07]).concat([-0.12, 0, 0.12].map((z) => ['box', '#8fb04a', 0, 0.035, z, 0.4, 0.02, 0.035]));
      case 'andenes': return [0, 1, 2].flatMap((k) => [['box', '#8a7f6a', 0, 0.03 + k * 0.06, -0.12 + k * 0.1, 0.5 - k * 0.06, 0.06, 0.16], ['box', '#6f9a3f', 0, 0.065 + k * 0.06, -0.12 + k * 0.1, 0.48 - k * 0.06, 0.012, 0.14]]);
      case 'canal': return [['box', '#7a6a50', 0, 0.02, 0, 0.6, 0.04, 0.1], ['box', '#4aa3d9', 0, 0.045, 0, 0.6, 0.012, 0.06], ['box', '#6f9a3f', 0, 0.02, 0.14, 0.45, 0.025, 0.12]];
      case 'mina': return [['box', '#5a4a3a', 0, 0.08, 0, 0.22, 0.16, 0.16], ['box', '#1a1410', 0, 0.06, 0.081, 0.08, 0.1, 0.01], ['box', '#7a5a35', 0.0, 0.17, 0.07, 0.12, 0.02, 0.04], ['box', '#4a4a4a', 0.16, 0.04, 0.12, 0.08, 0.05, 0.05]];
      case 'corral': return [0, 1, 2, 3, 4, 5].map((k) => ['box', '#7a5a35', Math.cos(k * 1.047) * 0.2, 0.04, Math.sin(k * 1.047) * 0.2, 0.2, 0.06, 0.015, 0, -k * 1.047 - Math.PI / 2, 0]);
      case 'plantacion': return [-0.12, 0, 0.12].flatMap((x) => [-0.1, 0.1].map((z) => ['dodec', '#3f8f3a', x, 0.05, z, 0.06, 0.06, 0.06]));
      case 'pozo': return [['cone4', '#2a2a2a', 0, 0.2, 0, 0.1, 0.4, 0.1], ['box', '#555', 0, 0.38, 0, 0.22, 0.025, 0.025], ['cyl', '#111', 0.1, 0.03, 0, 0.06, 0.06, 0.06]];
      default: return [];
    }
  }
  const FAUNA_PARTS = {
    jaguar: () => quadruped('#d9a236', 0, 0).concat([['box', '#1a1410', 0.0, 0.165, 0, 0.06, 0.012, 0.085], ['box', '#d9a236', -0.13, 0.15, 0, 0.12, 0.02, 0.02, 0, 0, 0.5]]),
    caiman: () => [['box', '#2f3f25', 0, 0.04, 0, 0.32, 0.05, 0.08], ['box', '#2f3f25', 0.2, 0.035, 0, 0.12, 0.03, 0.05], ['box', '#2f3f25', -0.2, 0.03, 0, 0.14, 0.025, 0.035]],
    serpiente: () => [['halftorus', '#3f8f3a', 0, 0.025, 0, 0.12, 0.12, 0.25, Math.PI / 2, 0, 0], ['halftorus', '#3f8f3a', 0.22, 0.025, 0, 0.1, 0.1, 0.22, Math.PI / 2, Math.PI, 0], ['sph', '#2f6f2a', 0.33, 0.03, 0, 0.035, 0.025, 0.03]],
    pirana: () => [['sph', '#b04a3a', 0, 0.06, 0, 0.07, 0.05, 0.025], ['cone4', '#8a8a8a', -0.08, 0.06, 0, 0.03, 0.05, 0.012, 0, 0, 1.5]],
    mosquitos: () => [0, 1, 2, 3, 4, 5, 6].map((k) => ['sph', '#1a1410', Math.cos(k * 2.4) * 0.09, 0.22 + (k % 3) * 0.05, Math.sin(k * 2.4) * 0.09, 0.012, 0.012, 0.012])
  };
  function buildFeatViews() {
    // Recursos, mejoras y fauna visibles; se reconstruye en cada refresco (pocas piezas).
    featViews.forEach((m) => { scene.remove(m); });
    featViews.clear();
    const player = PC.player();
    const group = new THREE.Group();
    tileList.forEach((t) => {
      if (!PC.isExplored(t.i)) return;
      const [cx, cz] = R.tileXZ(t);
      const h = R.tileTop(t);
      const add = (key, build, dx, dz, rot) => {
        const g = cachedGeo(key, build);
        const m = new THREE.Mesh(g, mat);
        m.position.set(cx + dx, h, cz + dz); m.rotation.y = rot || 0;
        m.castShadow = true; m.receiveShadow = true;
        group.add(m);
      };
      if (t.imp) add('imp_' + t.imp, () => impParts(t.imp), 0.18, 0.28, 0.3);
      if (t.res && PC.resVisible(player, t.res)) add('res_' + t.res, () => resParts(t.res), -0.38, -0.3, PC.hash2(t.c, t.r, 51) * 6);
      if (t.fauna && !t.cityId) add('fauna_' + t.fauna, FAUNA_PARTS[t.fauna], 0.42, -0.2, PC.hash2(t.c, t.r, 52) * 6);
    });
    scene.add(group);
    featViews.set('all', group);
  }

  // ---------------------------------------------------------------- ciudades
  function eraOfCity(city) { return PC.eraOf(PC.civ(city.civ)); }
  function housePart(era, x, z, rot, s, parts) {
    const r = rot;
    if (era <= 1) {
      parts.push(['cyl', '#b89060', x, 0.07 * s, z, 0.07 * s, 0.14 * s, 0.07 * s]);
      parts.push(['cone', '#c9a84a', x, 0.18 * s, z, 0.09 * s, 0.1 * s, 0.09 * s]);
    } else if (era <= 3) {
      parts.push(['box', '#a29a8a', x, 0.06 * s, z, 0.16 * s, 0.12 * s, 0.11 * s, 0, r, 0]);
      parts.push(['prism', '#b8913e', x, 0.15 * s, z, 0.1 * s, 0.17 * s, 0.065 * s, Math.PI / 2, r + Math.PI / 2, 0]);
    } else if (era <= 5) {
      parts.push(['box', '#efe9dc', x, 0.07 * s, z, 0.16 * s, 0.14 * s, 0.12 * s, 0, r, 0]);
      parts.push(['prism', '#b5452b', x, 0.17 * s, z, 0.1 * s, 0.17 * s, 0.07 * s, Math.PI / 2, r + Math.PI / 2, 0]);
    } else if (era <= 7) {
      parts.push(['box', '#a5573a', x, 0.1 * s, z, 0.15 * s, 0.2 * s, 0.13 * s, 0, r, 0]);
      parts.push(['box', '#5a3a2a', x, 0.205 * s, z, 0.16 * s, 0.015 * s, 0.14 * s, 0, r, 0]);
    } else {
      parts.push(['box', '#8fa3b8', x, 0.2 * s, z, 0.13 * s, 0.4 * s, 0.13 * s, 0, r, 0]);
      parts.push(['box', '#c8d4e0', x, 0.41 * s, z, 0.1 * s, 0.02 * s, 0.1 * s, 0, r, 0]);
    }
  }
  function wonderParts(id, parts, x, z) {
    const P = (p) => { p[2] += x; p[4] += z; parts.push(p); };
    switch (id) {
      case 'caral': [0, 1, 2].forEach((k) => P(['box', '#d8c08a', 0, 0.04 + k * 0.08, 0, 0.42 - k * 0.12, 0.08, 0.36 - k * 0.1])); P(['cyl12', '#8a7550', 0, 0.01, 0.3, 0.12, 0.02, 0.12]); break;
      case 'chavin': P(['box', '#8f8a80', 0, 0.09, 0, 0.42, 0.18, 0.3]); P(['box', '#7a756c', 0, 0.21, 0, 0.32, 0.06, 0.22]); P(['box', '#1a1410', 0, 0.07, 0.151, 0.07, 0.1, 0.01]); break;
      case 'nasca': [0, 1, 2, 3].forEach((k) => P(['box', '#efe4cc', 0, 0.012, 0, 0.5, 0.012, 0.018, 0, k * 0.8, 0])); P(['torus', '#efe4cc', 0.15, 0.012, 0.1, 0.08, 0.08, 0.08, Math.PI / 2, 0, 0]); break;
      case 'huacas_moche': P(['box', '#9a5a3a', -0.14, 0.08, 0, 0.26, 0.16, 0.24]); P(['box', '#a8684a', -0.14, 0.19, 0, 0.16, 0.06, 0.14]); P(['box', '#9a5a3a', 0.18, 0.06, 0.05, 0.18, 0.12, 0.18]); break;
      case 'chan_chan': [[0, -0.18, 0.46, 0.03], [0, 0.18, 0.46, 0.03], [-0.22, 0, 0.03, 0.36], [0.22, 0, 0.03, 0.36], [0, 0, 0.03, 0.36]].forEach(([a, b, w, d]) => P(['box', '#c9a77a', a, 0.06, b, w, 0.12, d])); break;
      case 'kuelap': P(['cyl12', '#8f8a7a', 0, 0.09, 0, 0.32, 0.18, 0.22]); [[-0.1, 0], [0.1, 0.05]].forEach(([a, b]) => { P(['cyl', '#a29a8a', a, 0.22, b, 0.05, 0.08, 0.05]); P(['cone', '#c9a84a', a, 0.3, b, 0.07, 0.08, 0.07]); }); break;
      case 'sacsayhuaman': [0, 1, 2].forEach((k) => { for (let j = -2; j <= 2; j++) P(['box', '#8a8580', j * 0.09, 0.05 + k * 0.08, -0.1 + k * 0.08, 0.1, 0.09, 0.08, 0, (j % 2) * 0.5, 0]); }); break;
      case 'machu_picchu': P(['cone', '#3f7d3a', 0.12, 0.3, -0.12, 0.16, 0.6, 0.16]); [0, 1, 2].forEach((k) => P(['box', '#6f9a3f', -0.1, 0.03 + k * 0.05, 0.06 - k * 0.06, 0.32, 0.05, 0.1])); P(['box', '#a29a8a', -0.12, 0.2, -0.08, 0.1, 0.06, 0.08]); break;
      case 'qhapaq_nan': P(['box', '#9a9488', 0, 0.05, 0, 0.26, 0.1, 0.26]); P(['box', '#8a6a44', 0, 0.015, 0.25, 0.08, 0.02, 0.3]); P(['cyl', '#efe4cc', 0, 0.16, 0, 0.03, 0.14, 0.03]); break;
      case 'coricancha': P(['box', '#8f8a80', 0, 0.08, 0, 0.36, 0.16, 0.26]); P(['box', '#e6b422', 0, 0.17, 0, 0.3, 0.03, 0.2]); P(['cyl12', '#f0c040', 0, 0.28, 0, 0.08, 0.015, 0.08, Math.PI / 2, 0, 0]); break;
      case 'san_marcos': P(['box', '#efe9dc', 0, 0.08, 0, 0.36, 0.16, 0.2]); P(['box', '#efe9dc', 0.14, 0.2, 0, 0.08, 0.24, 0.08]); P(['cone4', '#b5452b', 0.14, 0.36, 0, 0.07, 0.1, 0.07]); P(['sph', '#d8cfb8', -0.06, 0.18, 0, 0.08, 0.06, 0.08]); break;
      case 'ferrocarril_central': P(['box', '#5a4a3a', 0, 0.01, 0, 0.6, 0.02, 0.08]); P(['cyl', '#1a1a1a', -0.04, 0.08, 0, 0.05, 0.22, 0.05, 0, 0, Math.PI / 2]); P(['box', '#2a2a2a', 0.1, 0.1, 0, 0.1, 0.12, 0.1]); P(['cyl', '#b5452b', -0.12, 0.15, 0, 0.02, 0.08, 0.02]); break;
      // Maravillas continentales (v0.1.2), modelos low-poly sencillos.
      case 'puerta_sol': P(['box', '#7f8a8c', 0, 0.02, 0, 0.44, 0.04, 0.3]); P(['box', '#8f9698', -0.11, 0.14, 0, 0.06, 0.2, 0.06]); P(['box', '#8f9698', 0.11, 0.14, 0, 0.06, 0.2, 0.06]); P(['box', '#8f9698', 0, 0.27, 0, 0.3, 0.07, 0.06]); P(['box', '#e6b422', 0, 0.27, 0.031, 0.06, 0.05, 0.005]); break;
      case 'cerro_rico': P(['cone', '#a0523a', 0, 0.22, 0, 0.3, 0.44, 0.3]); P(['box', '#d8d8d0', 0.12, 0.05, 0.18, 0.08, 0.05, 0.06]); P(['box', '#3a2a20', -0.06, 0.08, 0.2, 0.05, 0.05, 0.02]); break;
      case 'teotihuacan': [0, 1, 2, 3].forEach((k) => P(['box', '#b09a7a', 0, 0.04 + k * 0.07, -0.05, 0.4 - k * 0.09, 0.07, 0.36 - k * 0.08])); P(['box', '#a08a6a', 0.24, 0.05, 0.22, 0.14, 0.1, 0.14]); P(['box', '#8a7a5a', 0, 0.01, 0.24, 0.06, 0.02, 0.3]); break;
      case 'tenochtitlan': P(['cyl12', '#3a7aa8', 0, 0.01, 0, 0.4, 0.02, 0.4]); [0, 1, 2].forEach((k) => P(['box', '#c9b48a', 0, 0.05 + k * 0.07, 0, 0.3 - k * 0.07, 0.07, 0.26 - k * 0.06])); P(['box', '#b5452b', -0.04, 0.29, 0, 0.06, 0.06, 0.06]); P(['box', '#2f5f8f', 0.04, 0.29, 0, 0.06, 0.06, 0.06]); break;
      case 'chichen_itza': [0, 1, 2, 3, 4].forEach((k) => P(['box', '#cfc4a8', 0, 0.03 + k * 0.055, 0, 0.42 - k * 0.07, 0.055, 0.42 - k * 0.07])); P(['box', '#b8ab8a', 0, 0.33, 0, 0.1, 0.06, 0.1]); break;
      case 'tikal': [0, 1, 2, 3].forEach((k) => P(['box', '#a8a090', 0, 0.04 + k * 0.08, 0, 0.26 - k * 0.04, 0.08, 0.22 - k * 0.04])); P(['box', '#9a9282', 0, 0.38, 0, 0.08, 0.1, 0.06]); P(['cone', '#2f6a2f', 0.25, 0.12, 0.15, 0.08, 0.24, 0.08]); break;
      case 'cahokia': P(['box', '#7a5a35', 0, 0.06, 0, 0.44, 0.12, 0.36]); P(['box', '#86643c', -0.05, 0.15, 0, 0.26, 0.06, 0.2]); P(['box', '#9a7a4a', -0.05, 0.22, 0, 0.1, 0.08, 0.08]); P(['cyl', '#6a4a2a', 0.24, 0.1, 0.2, 0.012, 0.2, 0.012]); break;
      case 'canal_panama': P(['box', '#3a7aa8', 0, 0.012, 0, 0.12, 0.012, 0.62]); P(['box', '#8f8a80', -0.1, 0.04, 0, 0.06, 0.08, 0.5]); P(['box', '#8f8a80', 0.1, 0.04, 0, 0.06, 0.08, 0.5]); P(['box', '#5a5a5a', 0, 0.06, 0.08, 0.14, 0.04, 0.02]); P(['box', '#c0392b', 0, 0.05, -0.12, 0.06, 0.04, 0.12]); break;
      case 'cristo_redentor': P(['cone', '#5a7a4a', 0, 0.16, 0, 0.26, 0.32, 0.26]); P(['box', '#efe9dc', 0, 0.42, 0, 0.05, 0.22, 0.05]); P(['box', '#efe9dc', 0, 0.48, 0, 0.3, 0.035, 0.035]); P(['sph', '#efe9dc', 0, 0.56, 0, 0.03, 0.03, 0.03]); break;
      default: P(['box', '#e6b422', 0, 0.1, 0, 0.2, 0.2, 0.2]);
    }
  }
  function cityParts(city) {
    const era = eraOfCity(city);
    const civ = PC.civ(city.civ);
    const parts = [];
    const stone = era <= 1 ? '#b89a6e' : era <= 3 ? '#9a9488' : era <= 5 ? '#c9c0ae' : '#8d8a84';
    parts.push(['cyl6', civ.color, 0, 0.015, 0, 0.7, 0.03, 0.7]);
    parts.push(['cyl6', stone, 0, 0.04, 0, 0.64, 0.05, 0.64]);
    const n = PC.clamp(2 + Math.floor(city.pop * 0.8), 2, 10);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + 0.3, rad = k % 2 ? 0.42 : 0.33;
      housePart(era, Math.cos(a) * rad, Math.sin(a) * rad, -a, 1, parts);
    }
    const wonders = city.buildings.filter((b) => PC.WONDERS[b]);
    const has = (b) => city.buildings.includes(b);
    const isCap = civ.capitalId === city.id;
    if (wonders.length) wonderParts(wonders[wonders.length - 1], parts, 0, 0);
    else if (has('huaca') || has('oraculo') || isCap) {
      const lv = isCap ? 3 : 2;
      for (let k = 0; k < lv; k++) parts.push(['box', era <= 1 ? '#c9a77a' : stone, 0, 0.08 + k * 0.07, 0, 0.26 - k * 0.07, 0.07, 0.22 - k * 0.06]);
      if (era >= 4 && isCap) { parts.push(['box', '#efe9dc', 0.0, 0.32, 0, 0.06, 0.14, 0.06]); parts.push(['cone4', '#b5452b', 0, 0.44, 0, 0.05, 0.08, 0.05]); }
    } else parts.push(['cyl6', '#8a7a5a', 0, 0.09, 0, 0.1, 0.06, 0.1]);
    if (has('muralla')) for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k), rad = 0.6;
      parts.push(['box', stone, Math.cos(a) * rad, 0.1, Math.sin(a) * rad, 0.58, 0.12, 0.05, 0, -a + Math.PI / 2, 0]);
    }
    if (has('fabrica') || has('central') || has('refineria')) { parts.push(['cyl', '#6a4a3a', 0.3, 0.25, -0.25, 0.035, 0.5, 0.035]); parts.push(['cyl', '#5a5a5a', 0.3, 0.52, -0.25, 0.045, 0.04, 0.045]); }
    if (has('puerto')) { parts.push(['box', '#7a5a35', 0.62, 0.05, 0.1, 0.24, 0.02, 0.08]); parts.push(['box', '#9a6a3a', 0.7, 0.06, 0.25, 0.18, 0.04, 0.07]); parts.push(['cone4', '#efe4cc', 0.7, 0.16, 0.25, 0.04, 0.16, 0.04]); }
    if (wonders.length > 1) wonders.slice(0, -1).slice(-2).forEach((w, k) => { const sub = []; wonderParts(w, sub, 0, 0); sub.forEach((p) => { p[2] = p[2] * 0.55 + (k ? -0.45 : 0.45); p[3] *= 0.55; p[4] = p[4] * 0.55 + 0.42; p[5] *= 0.55; p[6] *= 0.55; p[7] *= 0.55; parts.push(p); }); });
    return parts;
  }
  function syncCities() {
    const g = PC.G;
    const seen = new Set();
    g.cities.forEach((city) => {
      const t = PC.tile(city.t);
      if (!PC.isExplored(t.i)) return;
      seen.add(city.id);
      const civ = PC.civ(city.civ);
      const key = [city.civ, eraOfCity(city), Math.min(10, 2 + Math.floor(city.pop * 0.8)), city.buildings.join(','), civ.capitalId === city.id].join('|');
      let v = cityViews.get(city.id);
      if (!v || v.key !== key) {
        if (v) cityGroup.remove(v.mesh);
        const mesh = new THREE.Mesh(cachedGeo('city_' + key, () => cityParts(city)), mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        const [x, z] = R.tileXZ(t);
        mesh.position.set(x, R.tileTop(t), z);
        cityGroup.add(mesh);
        v = { mesh, key };
        cityViews.set(city.id, v);
      }
    });
    cityViews.forEach((v, id) => { if (!seen.has(id)) { cityGroup.remove(v.mesh); cityViews.delete(id); } });
  }

  // ---------------------------------------------------------------- unidades
  const SKIN = '#9a6440', HAIR = '#1a1410', DARK = '#3a2a20', CREAM = '#efe4cc', WOOD = '#7a5030', COPPER = '#c8743a', IRON = '#8a8f96';
  function person(parts, x, z, o) {
    const s = 1;
    const tunic = o.tunic, legs = o.legs || DARK;
    parts.push(['box', legs, x - 0.028, 0.06 * s, z, 0.035, 0.12, 0.045]);
    parts.push(['box', legs, x + 0.028, 0.06 * s, z, 0.035, 0.12, 0.045]);
    parts.push(['cyl', tunic, x, 0.2, z, 0.075, 0.17, 0.075]);
    parts.push(['cyl', o.band || CREAM, x, 0.2, z, 0.079, 0.03, 0.079]);
    parts.push(['box', o.arm || SKIN, x - 0.09, 0.2, z, 0.03, 0.13, 0.035]);
    parts.push(['box', o.arm || SKIN, x + 0.09, 0.2, z, 0.03, 0.13, 0.035]);
    parts.push(['sph', SKIN, x, 0.33, z, 0.055, 0.06, 0.055]);
    if (o.helmet === 'cobre') parts.push(['sph', COPPER, x, 0.36, z, 0.062, 0.04, 0.062]);
    else if (o.helmet === 'hierro') parts.push(['cone', IRON, x, 0.4, z, 0.065, 0.1, 0.065]);
    else if (o.helmet === 'morion') { parts.push(['cone', '#c4c8d0', x, 0.4, z, 0.06, 0.1, 0.06]); parts.push(['cyl12', '#c4c8d0', x, 0.36, z, 0.1, 0.012, 0.1]); }
    else if (o.helmet === 'sombrero') { parts.push(['cyl12', '#3a2a20', x, 0.37, z, 0.1, 0.012, 0.1]); parts.push(['cyl', '#3a2a20', x, 0.4, z, 0.05, 0.05, 0.05]); }
    else if (o.helmet === 'kepi') parts.push(['cyl', o.cap || '#2a2f4a', x, 0.38, z, 0.05, 0.05, 0.055]);
    else if (o.helmet === 'casco') parts.push(['sph', '#4f5a3a', x, 0.36, z, 0.066, 0.045, 0.066]);
    else { parts.push(['sph', HAIR, x, 0.35, z - 0.005, 0.058, 0.04, 0.058]); if (o.headband) parts.push(['cyl', o.headband, x, 0.345, z, 0.06, 0.015, 0.06]); }
    if (o.feather) parts.push(['box', o.feather, x, 0.42, z - 0.03, 0.015, 0.1, 0.01, 0.3, 0, 0]);
    if (o.armor) parts.push(['box', o.armor, x, 0.23, z + 0.02, 0.13, 0.1, 0.06]);
    if (o.belts) { parts.push(['box', CREAM, x, 0.22, z + 0.045, 0.012, 0.16, 0.01, 0, 0, 0.6]); parts.push(['box', CREAM, x, 0.22, z + 0.045, 0.012, 0.16, 0.01, 0, 0, -0.6]); }
    const hx = x + 0.11;
    switch (o.weapon) {
      case 'porra': parts.push(['cyl', WOOD, hx, 0.24, z, 0.012, 0.2, 0.012]); parts.push(['ico', '#6f6a66', hx, 0.35, z, 0.035, 0.035, 0.035]); break;
      case 'estrella': parts.push(['cyl', WOOD, hx, 0.24, z, 0.012, 0.22, 0.012]); parts.push(['ico', COPPER, hx, 0.36, z, 0.045, 0.045, 0.045]); break;
      case 'honda': parts.push(['halftorus', '#c9b46a', hx, 0.26, z, 0.05, 0.05, 0.05, 0, 0, Math.PI]); break;
      case 'macana': parts.push(['box', WOOD, hx, 0.27, z, 0.025, 0.24, 0.05]); break;
      case 'lanza': parts.push(['cyl', WOOD, hx, 0.3, z, 0.01, 0.52, 0.01]); parts.push(['cone', COPPER, hx, 0.58, z, 0.02, 0.06, 0.02]); break;
      case 'arco': parts.push(['halftorus', WOOD, hx, 0.24, z, 0.12, 0.12, 0.12, 0, Math.PI / 2, Math.PI / 2]); break;
      case 'espada': parts.push(['box', '#c4c8d0', hx, 0.28, z, 0.015, 0.2, 0.03]); parts.push(['box', '#6a5a3a', hx, 0.17, z, 0.05, 0.015, 0.015]); break;
      case 'arcabuz': parts.push(['cyl', '#2a2420', hx - 0.02, 0.26, z + 0.04, 0.012, 0.42, 0.012, 0.9, 0, 0]); break;
      case 'fusil': parts.push(['cyl', '#2a2420', hx - 0.02, 0.26, z + 0.04, 0.012, 0.4, 0.012, 0.9, 0, 0]); parts.push(['cone', '#c4c8d0', hx - 0.02, 0.4, z + 0.21, 0.008, 0.06, 0.008, 0.9, 0, 0]); break;
      case 'taclla': parts.push(['cyl', WOOD, hx, 0.2, z, 0.01, 0.34, 0.01, 0, 0, 0.2]); parts.push(['box', '#5a4a3a', hx + 0.02, 0.04, z, 0.05, 0.02, 0.03]); break;
      case 'baston': parts.push(['cyl', WOOD, hx, 0.22, z, 0.01, 0.4, 0.01]); parts.push(['cone', '#efe4cc', x - 0.1, 0.27, z, 0.025, 0.07, 0.025, 0, 0, 1.4]); break;
      default: break;
    }
    if (o.shield === 'redondo') parts.push(['cyl12', o.shieldColor || shadeHex(tunic, 0.7), x - 0.11, 0.22, z + 0.02, 0.07, 0.015, 0.07, Math.PI / 2, 0, 0.2]);
    if (o.shield === 'cuadrado') { parts.push(['box', o.shieldColor || shadeHex(tunic, 0.7), x - 0.11, 0.22, z + 0.02, 0.015, 0.14, 0.12]); parts.push(['box', CREAM, x - 0.118, 0.22, z + 0.02, 0.005, 0.04, 0.04]); }
    if (o.shield === 'grande') { parts.push(['box', o.shieldColor || tunic, x - 0.11, 0.21, z + 0.02, 0.018, 0.2, 0.14]); parts.push(['box', IRON, x - 0.121, 0.21, z + 0.02, 0.005, 0.2, 0.02]); }
  }
  function horse(parts, x, z, color, armored) {
    const c = color || '#6b4a2f';
    parts.push(['box', c, x, 0.2, z, 0.3, 0.13, 0.11]);
    [[-0.11, -0.04], [0.11, -0.04], [-0.11, 0.04], [0.11, 0.04]].forEach(([a, b]) => parts.push(['box', DARK, x + a, 0.07, z + b, 0.035, 0.14, 0.035]));
    parts.push(['box', c, x + 0.16, 0.3, z, 0.07, 0.17, 0.07, 0, 0, -0.5]);
    parts.push(['box', c, x + 0.23, 0.36, z, 0.12, 0.06, 0.06]);
    parts.push(['box', '#1a1410', x + 0.14, 0.33, z, 0.04, 0.12, 0.03, 0, 0, -0.5]);
    if (armored) parts.push(['box', '#a0a4ac', x, 0.21, z, 0.31, 0.06, 0.12]);
  }
  const FORMATION = { 3: [[-0.17, 0.08], [0.17, 0.08], [0, -0.14]], 2: [[-0.14, 0.04], [0.16, -0.06]], 1: [[0, 0]] };
  function unitParts(type, civColor) {
    const parts = [];
    const tunic = civColor;
    const many = (n, o) => FORMATION[n].forEach(([x, z]) => person(parts, x, z, Object.assign({ tunic }, o)));
    switch (type) {
      case 'guerrero': many(3, { weapon: 'porra', headband: '#a3243b' }); break;
      case 'aliado': many(3, { weapon: 'porra', feather: '#2f8f4f', tunic: shadeHex(civColor, 0.6) }); break;
      case 'hondero': many(3, { weapon: 'honda', headband: CREAM }); break;
      case 'macanero': many(3, { weapon: 'macana', shield: 'redondo' }); break;
      case 'lancero': many(3, { weapon: 'lanza', shield: 'redondo', helmet: 'cobre' }); break;
      case 'awqa': many(3, { weapon: 'estrella', shield: 'cuadrado', helmet: 'cobre', band: '#e2a72e', armor: shadeHex(civColor, 0.55) }); break;
      case 'arquero': many(3, { weapon: 'arco', feather: '#e2a72e', headband: '#2f8f4f' }); break;
      case 'infante_hierro': many(3, { weapon: 'espada', shield: 'grande', helmet: 'hierro', armor: IRON }); break;
      case 'arcabucero': many(3, { weapon: 'arcabuz', helmet: 'sombrero', belts: true }); break;
      case 'fusilero': many(3, { weapon: 'fusil', helmet: 'kepi', cap: shadeHex(civColor, 0.5), belts: true, legs: '#2a2f4a' }); break;
      case 'infanteria': many(3, { weapon: 'fusil', helmet: 'casco', tunic: '#5a6a42', band: civColor, legs: '#4a5236', arm: '#5a6a42' }); break;
      case 'conquistador': many(3, { weapon: 'espada', helmet: 'morion', armor: '#c4c8d0', shield: 'redondo', shieldColor: '#c4c8d0' }); break;
      case 'jinete': FORMATION[2].forEach(([x, z]) => { horse(parts, x, z, '#6b4a2f'); const sub = []; person(sub, 0, 0, { tunic, weapon: 'lanza', helmet: 'sombrero' }); sub.forEach((p) => { p[2] = p[2] * 0.8 + x - 0.02; p[3] = p[3] * 0.8 + 0.22; p[4] = p[4] * 0.8 + z; p[5] *= 0.8; p[6] *= 0.8; p[7] *= 0.8; parts.push(p); }); }); break;
      case 'caballero': FORMATION[2].forEach(([x, z]) => { horse(parts, x, z, '#4a3a2a', true); const sub = []; person(sub, 0, 0, { tunic, weapon: 'lanza', helmet: 'morion', armor: '#c4c8d0' }); sub.forEach((p) => { p[2] = p[2] * 0.8 + x - 0.02; p[3] = p[3] * 0.8 + 0.22; p[4] = p[4] * 0.8 + z; p[5] *= 0.8; p[6] *= 0.8; p[7] *= 0.8; parts.push(p); }); }); break;
      case 'canon':
        parts.push(['cyl', '#4a3f35', 0.02, 0.14, 0, 0.05, 0.4, 0.05, 0, 0, 1.35]);
        parts.push(['cyl12', WOOD, -0.06, 0.08, 0.09, 0.08, 0.025, 0.08, Math.PI / 2, 0, 0]); parts.push(['cyl12', WOOD, -0.06, 0.08, -0.09, 0.08, 0.025, 0.08, Math.PI / 2, 0, 0]);
        parts.push(['box', WOOD, -0.18, 0.05, 0, 0.2, 0.03, 0.05]);
        person(parts, -0.25, 0.18, { tunic, helmet: 'kepi', cap: shadeHex(civColor, 0.5) });
        break;
      case 'blindado':
        parts.push(['box', '#4f5a3a', 0, 0.09, 0, 0.42, 0.1, 0.26]);
        parts.push(['box', '#2a2a2a', 0, 0.04, 0.14, 0.44, 0.07, 0.05]); parts.push(['box', '#2a2a2a', 0, 0.04, -0.14, 0.44, 0.07, 0.05]);
        parts.push(['box', '#5a6a42', -0.03, 0.19, 0, 0.2, 0.09, 0.18]);
        parts.push(['cyl', '#3a4230', 0.17, 0.2, 0, 0.02, 0.28, 0.02, 0, 0, Math.PI / 2]);
        parts.push(['box', civColor, -0.03, 0.235, 0, 0.21, 0.012, 0.19]);
        break;
      case 'colono': person(parts, -0.12, 0, { tunic, weapon: 'baston' }); quadruped(CREAM, 0.12, 0.02).forEach((p) => parts.push(p)); parts.push(['box', civColor, 0.12, 0.18, 0.02, 0.12, 0.05, 0.12]); break;
      case 'trabajador': person(parts, 0, 0, { tunic, weapon: 'taclla', headband: CREAM }); parts.push(['cyl', '#b8913e', -0.1, 0.25, -0.05, 0.05, 0.08, 0.05]); break;
      case 'explorador': person(parts, 0, 0, { tunic, weapon: 'baston', feather: '#e2a72e' }); break;
      case 'apu':
        person(parts, 0, 0, { tunic, weapon: 'estrella', helmet: 'cobre', band: '#e2a72e', armor: shadeHex(civColor, 0.5), feather: '#c23a50' });
        parts.push(['cyl12', '#e2a72e', 0, 0.48, -0.02, 0.05, 0.012, 0.05, Math.PI / 2, 0, 0]);
        person(parts, -0.22, 0.12, { tunic: shadeHex(civColor, 0.8), weapon: 'lanza' });
        parts.push(['cyl12', '#efe4cc', 0.22, 0.012, 0.12, 0.12, 0.02, 0.12]);
        break;
      case 'caravana':
        person(parts, -0.2, 0.05, { tunic, weapon: 'baston', headband: CREAM });
        quadruped(CREAM, 0.05, 0.08).forEach((p) => parts.push(p)); parts.push(['box', '#a3243b', 0.05, 0.18, 0.08, 0.12, 0.05, 0.11]);
        quadruped('#8a6040', 0.22, -0.1).forEach((p) => parts.push(p)); parts.push(['box', '#e2a72e', 0.22, 0.18, -0.1, 0.12, 0.05, 0.11]);
        break;
      default: many(1, { weapon: 'porra' });
    }
    // Asta del estandarte
    parts.push(['cyl', '#2a1f18', 0.0, 0.42, -0.3, 0.012, 0.84, 0.012]);
    return parts;
  }
  // Embarcaciones según la época del dueño: caballito de totora, balsa con vela, galeón, vapor y buque moderno.
  function boatKind(u) {
    const civ = PC.civ(u.civ);
    if (civ.key === 'espana') return 'galeon';
    const e = PC.eraOf(civ);
    return e <= 2 ? 'totora' : e <= 4 ? 'balsa' : e <= 6 ? 'galeon' : e <= 7 ? 'vapor' : 'moderno';
  }
  function boatParts(kind, civColor) {
    const parts = [];
    const crew = (n, dx) => { for (let k = 0; k < n; k++) { const sub = []; person(sub, 0, 0, { tunic: civColor }); sub.forEach((p) => { p[2] = p[2] * 0.7 + dx + k * 0.14; p[3] = p[3] * 0.7 + 0.1; p[4] *= 0.7; p[5] *= 0.7; p[6] *= 0.7; p[7] *= 0.7; parts.push(p); }); } };
    if (kind === 'totora') {
      parts.push(['cyl', '#c9b46a', 0, 0.06, 0, 0.07, 0.62, 0.07, 0, 0, Math.PI / 2]);
      parts.push(['cyl', '#b8a35a', 0, 0.06, 0.09, 0.06, 0.56, 0.06, 0, 0, Math.PI / 2]);
      parts.push(['cone', '#c9b46a', 0.36, 0.12, 0.045, 0.06, 0.2, 0.06, 0, 0, -0.9]);
      parts.push(['cone', '#c9b46a', -0.34, 0.11, 0.045, 0.05, 0.16, 0.05, 0, 0, 0.9]);
      crew(1, -0.05);
      parts.push(['cyl', WOOD, 0.1, 0.18, 0.05, 0.008, 0.36, 0.008, 0.6, 0, 0]);
    } else if (kind === 'balsa') {
      for (let k = -2; k <= 2; k++) parts.push(['cyl', '#8a6a44', 0, 0.04, k * 0.07, 0.035, 0.7 - Math.abs(k) * 0.08, 0.035, 0, 0, Math.PI / 2]);
      parts.push(['cyl', WOOD, 0, 0.4, 0, 0.015, 0.7, 0.015]);
      parts.push(['box', CREAM, 0, 0.45, 0.01, 0.02, 0.4, 0.38]);
      parts.push(['box', civColor, 0, 0.32, 0.011, 0.021, 0.06, 0.38]);
      crew(2, -0.24);
    } else if (kind === 'galeon') {
      parts.push(['box', '#6a4a2f', 0, 0.1, 0, 0.7, 0.14, 0.24]);
      parts.push(['box', '#5a3a22', -0.28, 0.22, 0, 0.16, 0.12, 0.22]);
      parts.push(['prism', '#6a4a2f', 0.4, 0.1, 0, 0.12, 0.24, 0.14, Math.PI / 2, 0, -Math.PI / 2]);
      [[-0.05, 0.75], [0.2, 0.6]].forEach(([x, h]) => { parts.push(['cyl', WOOD, x, 0.17 + h / 2, 0, 0.015, h, 0.015]); parts.push(['box', '#efe9dc', x + 0.01, 0.2 + h * 0.6, 0, 0.02, h * 0.5, 0.3]); });
      parts.push(['box', '#a3243b', -0.05, 0.62, 0.0, 0.021, 0.05, 0.3]);
      crew(2, -0.1);
    } else if (kind === 'vapor') {
      parts.push(['box', '#2f3236', 0, 0.09, 0, 0.72, 0.13, 0.24]);
      parts.push(['box', '#b5452b', 0, 0.035, 0, 0.73, 0.03, 0.245]);
      parts.push(['box', '#e8e4da', -0.08, 0.2, 0, 0.26, 0.1, 0.18]);
      parts.push(['cyl', '#1a1a1a', 0.06, 0.34, 0, 0.045, 0.24, 0.045]); parts.push(['cyl', '#b5452b', 0.06, 0.44, 0, 0.047, 0.04, 0.047]);
      parts.push(['cyl', WOOD, -0.26, 0.4, 0, 0.012, 0.5, 0.012]);
      crew(1, 0.2);
    } else {
      parts.push(['box', '#7d868f', 0, 0.09, 0, 0.78, 0.13, 0.24]);
      parts.push(['prism', '#7d868f', 0.44, 0.09, 0, 0.12, 0.2, 0.13, Math.PI / 2, 0, -Math.PI / 2]);
      parts.push(['box', '#9aa3ab', -0.06, 0.21, 0, 0.3, 0.12, 0.17]); parts.push(['box', '#9aa3ab', -0.08, 0.31, 0, 0.14, 0.1, 0.12]);
      parts.push(['cyl', '#5a6168', 0.18, 0.2, 0, 0.03, 0.12, 0.03, 0, 0, Math.PI / 2]);
      parts.push(['cyl', '#3a3f45', -0.12, 0.48, 0, 0.008, 0.3, 0.008]);
      parts.push(['box', civColor, 0, 0.16, 0.121, 0.4, 0.03, 0.005]);
    }
    return parts;
  }
  const BOAT_FLAG = { totora: [0.1, 0.42, 0.18], balsa: [0.17, 0.82, 0.02], galeon: [-0.05, 1.0, 0], vapor: [-0.26, 0.72, 0], moderno: [-0.12, 0.66, 0] };
  function makeUnitView(u) {
    const civ = PC.civ(u.civ);
    const group = new THREE.Group();
    const boat = PC.tile(u.t).terrain === 'oceano' ? boatKind(u) : null;
    const body = new THREE.Mesh(boat ? cachedGeo('boat_' + boat + civ.color, () => boatParts(boat, civ.color)) : cachedGeo('unit_' + u.type + civ.color, () => unitParts(u.type, civ.color)), mat);
    body.castShadow = true;
    group.add(body);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.255), new THREE.MeshStandardMaterial({ map: emblemTexture(civ), side: THREE.DoubleSide, roughness: 1 }));
    flag.position.set(0.17, 0.72, -0.3);
    if (boat) { const fp = BOAT_FLAG[boat]; flag.position.set(fp[0] + 0.17, fp[1], fp[2]); }
    flag.castShadow = true;
    group.add(flag);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012;
    group.add(ring);
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x1a1426, depthTest: false }));
    const hpFg = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x6fa35a, depthTest: false }));
    const hp = new THREE.Group(); hp.add(hpBg); hp.add(hpFg); hpFg.position.z = 0.001;
    hp.position.set(0, 0.98, -0.3); hp.renderOrder = 10; hpBg.renderOrder = 10; hpFg.renderOrder = 11;
    group.add(hp);
    unitGroup.add(group);
    if (boat) { ring.scale.set(1.25, 1.25, 1.25); hp.position.y = 1.2; }
    return { group, body, flag, ring, hp, hpFg, type: u.type, civ: u.civ, boat, pos: null };
  }
  function unitSpot(u) {
    const t = PC.tile(u.t);
    const [x, z] = R.tileXZ(t);
    let dx = 0, dz = 0;
    const others = PC.G.units.filter((o) => o.t === u.t);
    if (t.cityId) { dx = -0.42; dz = 0.32; }
    if (others.length > 1) { const k = others.indexOf(u); if (!PC.isMil(u) && others.some(PC.isMil)) { dx += 0.45; dz -= 0.15; } else if (k > 0) { dx += 0.3 * k; } }
    return new THREE.Vector3(x + dx, R.tileTop(t), z + dz);
  }
  function syncUnits() {
    const g = PC.G;
    const seen = new Set();
    const player = PC.player();
    g.units.forEach((u) => {
      if (!PC.isVisible(u.t)) return;
      seen.add(u.id);
      let v = unitViews.get(u.id);
      const boatNow = PC.tile(u.t).terrain === 'oceano' ? boatKind(u) : null;
      if (v && (v.type !== u.type || v.civ !== u.civ || v.boat !== boatNow)) { const keep = v.group.position.clone(); unitGroup.remove(v.group); v = makeUnitView(u); unitViews.set(u.id, v); v.group.position.copy(keep); }
      if (!v) { v = makeUnitView(u); unitViews.set(u.id, v); v.group.position.copy(unitSpot(u)); }
      v.target = unitSpot(u);
      if (!v.pos) v.pos = v.group.position.clone();
      const own = u.civ === player.id, war = !own && PC.atWar(player.id, u.civ);
      v.ring.material.color.set(own ? '#e2a72e' : war ? '#e0533a' : PC.civ(u.civ).color);
      v.war = war; v.own = own;
      v.hpFg.scale.x = Math.max(0.02, u.hp / 100); v.hpFg.position.x = -0.2 * (1 - u.hp / 100);
      v.hpFg.material.color.set(u.hp > 60 ? '#6fa35a' : u.hp > 30 ? '#e2a72e' : '#e0533a');
      v.hp.visible = u.hp < 100;
      v.selected = R.sel && R.sel.unit === u;
      v.ready = own && u.moves > 0 && !u.fort && !u.task && !u.auto && !u.path;
      v.group.rotation.y = 0;
    });
    unitViews.forEach((v, id) => { if (!seen.has(id)) { unitGroup.remove(v.group); unitViews.delete(id); } });
  }

  // ---------------------------------------------------------------- resaltados
  let hoverLine = null;
  function buildOverlays() {
    while (overlayGroup.children.length) { const o = overlayGroup.children[0]; overlayGroup.remove(o); if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }
    const disc = (t, color, op, rIn) => {
      const [x, z] = R.tileXZ(t);
      const geo = rIn ? new THREE.RingGeometry(rIn, 0.92, 6) : new THREE.CircleGeometry(0.9, 6);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 6;
      m.position.set(x, R.tileTop(t) + 0.025, z);
      m.renderOrder = 4;
      overlayGroup.add(m);
    };
    if (R.reach) R.reach.forEach((left, i) => disc(PC.tile(i), '#efe4cc', 0.2));
    if (R.targets) R.targets.forEach((i) => disc(PC.tile(i), '#e0533a', 0.85, 0.72));
    if (R.sel && R.sel.regionHL) {
      const rg = PC.G.map.regions.find((r) => r.id === R.sel.regionHL);
      if (rg) rg.tiles.forEach((i) => { disc(PC.tile(i), '#e2a72e', 0.35); disc(PC.tile(i), '#f3c85e', 0.95, 0.84); });
    }
    if (R.sel && R.sel.city) disc(PC.tile(R.sel.city.t), '#e2a72e', 0.9, 0.82);
    if (R.sel && R.sel.tile) disc(R.sel.tile, '#e2a72e', 0.9, 0.82);
    if (R.path && R.sel && R.sel.unit) {
      R.path.forEach((i, k) => {
        const t = PC.tile(i); const [x, z] = R.tileXZ(t);
        const m = new THREE.Mesh(baseGeo('cyl6'), new THREE.MeshBasicMaterial({ color: k === R.path.length - 1 ? '#e2a72e' : '#efe4cc' }));
        m.scale.set(0.09, 0.03, 0.09); m.position.set(x, R.tileTop(t) + 0.05, z);
        overlayGroup.add(m);
      });
    }
    if (R.hover) {
      const t = R.hover; const [x, z] = R.tileXZ(t);
      const pts = [];
      for (let k = 0; k <= 6; k++) { const [a, b] = hexCorner(x, z, k, 0.97); pts.push(new THREE.Vector3(a, R.tileTop(t) + 0.04, b)); }
      hoverLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xefe4cc }));
      overlayGroup.add(hoverLine);
    }
  }

  // ---------------------------------------------------------------- etiquetas HTML (ciudades)
  function syncLabels() {
    if (!labelLayer) return;
    const g = PC.G;
    const seen = new Set();
    g.cities.forEach((city) => {
      if (!PC.isExplored(city.t)) return;
      seen.add(city.id);
      let el = labels.get(city.id);
      if (!el) { el = document.createElement('button'); el.className = 'citylabel'; el.type = 'button'; labelLayer.appendChild(el); labels.set(city.id, el); el.addEventListener('click', (e) => { e.stopPropagation(); if (PC.UI && PC.UI.selectCity) PC.UI.selectCity(city.id); }); }
      const civ = PC.civ(city.civ);
      const cap = civ.capitalId === city.id;
      const own = civ.isPlayer;
      const war = !own && PC.atWar(PC.G.playerId, civ.id);
      const b = city.build;
      let prod = '';
      if (own && b && b.kind !== 'riqueza') { const cost = PC.buildCost(b.kind, b.id); prod = `<i class="cl-prod" style="--p:${Math.min(1, city.prod / cost)}"></i>`; }
      const html = `${PC.emblem(civ.key, civ.color, 'cl-em')}<b class="cl-pop">${city.pop}</b><span class="cl-name">${cap ? '<i class="cl-cap"></i>' : ''}${city.name}</span>${prod}`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
      el.style.setProperty('--civ', civ.color);
      el.classList.toggle('own', own); el.classList.toggle('war', war);
      el._t = PC.tile(city.t);
      el.setAttribute('aria-label', `${city.name}, ${civ.name}, población ${city.pop}`);
    });
    labels.forEach((el, id) => { if (!seen.has(id)) { el.remove(); labels.delete(id); } });
  }
  const tmpV = { v: null };
  function placeLabels() {
    if (!tmpV.v) tmpV.v = new THREE.Vector3();
    labels.forEach((el) => {
      const t = el._t; if (!t) return;
      const [x, z] = R.tileXZ(t);
      tmpV.v.set(x, R.tileTop(t) + 0.7, z + 0.55).project(camera);
      const sx = (tmpV.v.x + 1) / 2 * R.w, sy = (1 - tmpV.v.y) / 2 * R.h;
      const vis = tmpV.v.z < 1 && sx > -80 && sx < R.w + 80 && sy > -40 && sy < R.h + 40 && cam.dist < 40;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
    });
  }

  // ---------------------------------------------------------------- ciclo
  function loop() {
    requestAnimationFrame(loop);
    if (!R.ready || !PC.G || !tileMesh) { if (renderer && scene && camera) { updateCamera(); renderer.render(scene, camera); } return; }
    const dt = Math.min(0.05, clock.getDelta());
    const time = clock.elapsedTime;
    if (R.preview) cam.az += dt * 0.05;
    if (fog) { fog.layers[0].material.map.offset.x += dt * 0.004; fog.layers[1].material.map.offset.x -= dt * 0.007; fog.layers[1].material.map.offset.y += dt * 0.003; }
    updateCamera();
    unitViews.forEach((v) => {
      if (v.target) {
        v.group.position.lerp(v.target, Math.min(1, dt * 7));
      }
      const bob = v.selected ? Math.abs(Math.sin(time * 4)) * 0.05 : 0;
      v.body.position.y = bob;
      v.flag.rotation.y = Math.sin(time * 2.2 + v.group.position.x) * 0.25;
      const s = v.war ? 1 + Math.sin(time * 5) * 0.06 : v.selected ? 1.12 : 1;
      v.ring.scale.set(s, s, s);
      v.ring.material.opacity = v.ready ? 0.95 : v.own ? 0.55 : 0.85;
      v.hp.quaternion.copy(camera.quaternion);
    });
    renderer.render(scene, camera);
    placeLabels();
  }

  // ---------------------------------------------------------------- líderes (modelos low-poly y retratos)
  const GOLD = '#e6b422', RED = '#a3243b', BLACK = '#1a1410', WHITE = '#efe9dc', TURQ = '#2fa39a', SILVER = '#c9ccd4';
  function leaderBody(P, o) {
    const skin = o.skin || '#9a6440';
    // piernas y sandalias (ojotas)
    if (!o.longDress) {
      P.push(['box', skin, -0.1, 0.18, 0, 0.11, 0.36, 0.12]); P.push(['box', skin, 0.1, 0.18, 0, 0.11, 0.36, 0.12]);
      P.push(['box', '#5a3a22', -0.1, 0.02, 0.03, 0.13, 0.04, 0.2]); P.push(['box', '#5a3a22', 0.1, 0.02, 0.03, 0.13, 0.04, 0.2]);
    }
    // túnica (unku) o vestido largo (anaku)
    if (o.longDress) P.push(['cyl', o.tunic, 0, 0.42, 0, 0.36, 0.84, 0.3]);
    else P.push(['cyl', o.tunic, 0, 0.66, 0, 0.27, 0.62, 0.21]);
    // franja de tocapus al frente
    if (o.tocapu !== false) {
      const tc = o.tocapuColors || [WHITE, RED, GOLD, BLACK];
      for (let r = 0; r < 2; r++) for (let c = -2; c <= 2; c++) P.push(['box', tc[(r * 5 + c + 10) % tc.length], c * 0.075, 0.62 + r * 0.075, 0.215, 0.065, 0.065, 0.02]);
    }
    P.push(['cyl', o.belt || WHITE, 0, o.longDress ? 0.84 : 0.5, 0, o.longDress ? 0.3 : 0.28, 0.05, 0.22]);
    // torso superior y brazos
    P.push(['cyl', o.tunic, 0, 1.05, 0, 0.22, 0.26, 0.17]);
    P.push(['box', o.sleeve || skin, -0.31, 0.86, 0, 0.1, 0.42, 0.11, 0, 0, 0.12]);
    P.push(['box', o.sleeve || skin, 0.31, 0.86, 0, 0.1, 0.42, 0.11, 0, 0, -0.12]);
    P.push(['sph', skin, -0.34, 0.62, 0.02, 0.06, 0.06, 0.06]); P.push(['sph', skin, 0.34, 0.62, 0.02, 0.06, 0.06, 0.06]);
    // cabeza y rostro
    P.push(['cyl', skin, 0, 1.22, 0, 0.07, 0.08, 0.07]);
    P.push(['sph', skin, 0, 1.38, 0, 0.17, 0.2, 0.17]);
    P.push(['box', BLACK, -0.06, 1.41, 0.155, 0.04, 0.02, 0.01]); P.push(['box', BLACK, 0.06, 1.41, 0.155, 0.04, 0.02, 0.01]);
    P.push(['box', skin, 0, 1.36, 0.165, 0.04, 0.07, 0.04]);
    P.push(['box', '#5a2a22', 0, 1.29, 0.155, 0.07, 0.015, 0.01]);
    if (o.beard) P.push(['box', o.beard, 0, 1.25, 0.12, 0.2, 0.12, 0.1]);
    if (o.hair !== false) P.push(['sph', o.hair || BLACK, 0, 1.45, -0.03, 0.18, 0.15, 0.18]);
    if (o.cloak) P.push(['box', o.cloak, 0, 0.82, -0.2, 0.62, 0.7, 0.04, 0.08, 0, 0]);
  }
  function incaCrown(P, o) {
    // llautu (trenza multicolor), mascapaicha (borla roja) y plumas de corequenque
    P.push(['cyl', o.band || '#c23a50', 0, 1.47, 0, 0.18, 0.05, 0.18]);
    for (let k = -2; k <= 2; k++) P.push(['box', RED, k * 0.035, 1.39, 0.17, 0.03, 0.08, 0.01]);
    P.push(['box', GOLD, 0, 1.5, 0.16, 0.08, 0.06, 0.02]);
    P.push(['box', WHITE, -0.03, 1.66, 0.12, 0.035, 0.24, 0.01, 0.15, 0, 0.1]); P.push(['box', BLACK, 0.03, 1.66, 0.12, 0.035, 0.24, 0.01, 0.15, 0, -0.1]);
    // orejeras de oro
    P.push(['cyl12', GOLD, -0.17, 1.37, 0, 0.06, 0.025, 0.06, 0, 0, Math.PI / 2]); P.push(['cyl12', GOLD, 0.17, 1.37, 0, 0.06, 0.025, 0.06, 0, 0, Math.PI / 2]);
  }
  function staff(P, x, top, topColor, h) {
    P.push(['cyl', '#6b4a2f', x, (h || 1.3) / 2, 0.08, 0.02, h || 1.3, 0.02]);
    if (top === 'estrella') P.push(['ico', topColor || GOLD, x, (h || 1.3) + 0.04, 0.08, 0.08, 0.08, 0.08]);
    if (top === 'sol') P.push(['cyl12', topColor || GOLD, x, (h || 1.3) + 0.06, 0.08, 0.11, 0.02, 0.11, Math.PI / 2, 0, 0]);
    if (top === 'remo') P.push(['box', '#8a6a44', x, (h || 1.3) - 0.05, 0.08, 0.1, 0.32, 0.02]);
  }
  // Uniforme republicano: casaca, charreteras de oro, botones y botas.
  function uniform(P, o) {
    leaderBody(P, { tunic: o.coat, tocapu: false, sleeve: o.coat, skin: o.skin || '#b07850', beard: o.beard, hair: o.hair || '#2a1e16', belt: o.belt || GOLD, cloak: o.cloak || false });
    P.push(['box', o.trousers || '#e8e2d2', -0.1, 0.2, 0, 0.12, 0.38, 0.13]); P.push(['box', o.trousers || '#e8e2d2', 0.1, 0.2, 0, 0.12, 0.38, 0.13]);
    P.push(['box', BLACK, -0.1, 0.08, 0.02, 0.13, 0.16, 0.16]); P.push(['box', BLACK, 0.1, 0.08, 0.02, 0.13, 0.16, 0.16]);
    P.push(['box', GOLD, -0.27, 1.17, 0, 0.14, 0.04, 0.14]); P.push(['box', GOLD, 0.27, 1.17, 0, 0.14, 0.04, 0.14]);
    for (let k = 0; k < 4; k++) P.push(['sph', GOLD, 0, 0.98 - k * 0.1, 0.205, 0.018, 0.018, 0.018]);
    P.push(['box', WHITE, 0, 1.15, 0.15, 0.1, 0.08, 0.04]);
  }
  function sword(P, x) { P.push(['box', SILVER, x, 0.5, 0.12, 0.025, 0.6, 0.03, 0, 0, 0.12]); P.push(['box', GOLD, x - 0.04, 0.82, 0.12, 0.12, 0.025, 0.04, 0, 0, 0.12]); }
  function bicorne(P, color, trim) {
    // prisma triangular tumbado de lado a lado, con la arista hacia arriba
    P.push(['prism', color, 0, 1.6, 0, 0.09, 0.48, 0.12, -Math.PI / 2, 0, Math.PI / 2]);
    P.push(['box', trim || GOLD, 0, 1.56, 0.05, 0.48, 0.025, 0.02]);
    P.push(['cyl12', '#c23a50', 0.06, 1.62, 0.06, 0.035, 0.015, 0.035, Math.PI / 2, 0, 0]);
  }
  function kepi(P, color) {
    P.push(['cyl12', color, 0, 1.58, 0, 0.16, 0.14, 0.16]); P.push(['cyl12', '#c23a50', 0, 1.53, 0, 0.165, 0.03, 0.165]);
    P.push(['box', BLACK, 0, 1.52, 0.15, 0.2, 0.02, 0.1, -0.3, 0, 0]);
  }
  PC.LEADER_MODELS = {
    pachacutec: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: RED }); incaCrown(P, {}); staff(P, 0.42, 'estrella'); return P; },
    tupac_yupanqui: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#2f5f8f' }); incaCrown(P, { band: '#2fa39a' }); staff(P, 0.42, 'remo', null, 1.4);
      for (let k = -1; k <= 1; k++) P.push(['cyl', '#8a6a44', -0.45, 0.04, k * 0.06 + 0.25, 0.03, 0.5, 0.03, 0, 0, Math.PI / 2]); P.push(['box', WHITE, -0.45, 0.22, 0.25, 0.01, 0.25, 0.22]); return P; },
    huayna_capac: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: GOLD, tocapuColors: [GOLD, RED, WHITE] }); incaCrown(P, { band: GOLD });
      P.push(['cyl12', GOLD, 0, 1.02, 0.18, 0.13, 0.02, 0.13, Math.PI / 2, 0, 0]); staff(P, 0.42, 'sol'); return P; },
    mama_ocllo: (c) => { const P = []; leaderBody(P, { tunic: c, longDress: true, belt: GOLD, hair: BLACK });
      P.push(['box', RED, 0, 1.08, 0.02, 0.56, 0.24, 0.3]); P.push(['sph', GOLD, -0.14, 1.1, 0.19, 0.035, 0.035, 0.035]); P.push(['sph', GOLD, 0.14, 1.1, 0.19, 0.035, 0.035, 0.035]);
      P.push(['cyl', BLACK, -0.1, 1.05, -0.16, 0.03, 0.55, 0.03]); P.push(['cyl', BLACK, 0.1, 1.05, -0.16, 0.03, 0.55, 0.03]);
      P.push(['cyl', WHITE, 0, 1.47, 0, 0.18, 0.04, 0.18]);
      P.push(['cyl', '#6b4a2f', 0.36, 0.72, 0.08, 0.012, 0.36, 0.012]); P.push(['cyl12', '#efe4cc', 0.36, 0.62, 0.08, 0.05, 0.03, 0.05]); return P; },
    senor_sipan: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#7a2a1f', tocapuColors: [GOLD, TURQ, RED] });
      P.push(['halftorus', GOLD, 0, 1.6, 0, 0.34, 0.3, 0.12, 0, 0, 0]); P.push(['box', GOLD, 0, 1.5, 0.12, 0.3, 0.1, 0.04]);
      P.push(['box', GOLD, 0, 1.31, 0.17, 0.12, 0.05, 0.015]);
      P.push(['torus', GOLD, 0, 1.18, 0, 0.2, 0.2, 0.2, Math.PI / 2, 0, 0]);
      P.push(['cyl12', TURQ, -0.17, 1.37, 0, 0.065, 0.025, 0.065, 0, 0, Math.PI / 2]); P.push(['cyl12', TURQ, 0.17, 1.37, 0, 0.065, 0.025, 0.065, 0, 0, Math.PI / 2]);
      staff(P, 0.42, 'estrella', GOLD, 1.2); return P; },
    taycanamo: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#1f6f6a', tocapuColors: [SILVER, TURQ, WHITE] });
      P.push(['cyl', SILVER, 0, 1.56, 0, 0.17, 0.16, 0.17]); P.push(['cone', SILVER, 0, 1.72, 0, 0.26, 0.14, 0.26, Math.PI, 0, 0]);
      for (let k = -3; k <= 3; k++) P.push(['box', k % 2 ? GOLD : WHITE, k * 0.07, 1.86, -0.02, 0.05, 0.2, 0.01, 0, 0, k * 0.12]);
      staff(P, 0.42, 'remo', null, 1.35); return P; },
    sacerdote_chavin: (c) => { const P = []; leaderBody(P, { tunic: '#6f6a5f', cloak: c, tocapu: false, hair: false, sleeve: '#6f6a5f' });
      P.push(['box', '#8a7a5a', 0, 1.38, 0.13, 0.32, 0.3, 0.1]);
      P.push(['cone', WHITE, -0.07, 1.27, 0.19, 0.025, 0.08, 0.025, Math.PI, 0, 0]); P.push(['cone', WHITE, 0.07, 1.27, 0.19, 0.025, 0.08, 0.025, Math.PI, 0, 0]);
      P.push(['box', '#e2a72e', -0.07, 1.43, 0.185, 0.05, 0.03, 0.01]); P.push(['box', '#e2a72e', 0.07, 1.43, 0.185, 0.05, 0.03, 0.01]);
      for (let k = 0; k < 6; k++) P.push(['cyl', '#4f7a3a', Math.cos(k) * 0.16, 1.62, Math.sin(k) * 0.1 - 0.02, 0.025, 0.24, 0.025, Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5]);
      P.push(['cone', WHITE, -0.38, 0.85, 0.1, 0.06, 0.2, 0.06, 0, 0, 1.4]);
      P.push(['cyl', '#4f8a3a', 0.42, 0.75, 0.08, 0.05, 1.5, 0.05]); return P; },
    manco_inca: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#3a2f2a' }); incaCrown(P, {});
      P.push(['sph', '#c8743a', 0, 1.5, 0, 0.19, 0.08, 0.19]);
      P.push(['box', c, -0.44, 0.85, 0.05, 0.03, 0.4, 0.34]); P.push(['box', WHITE, -0.46, 0.85, 0.05, 0.01, 0.12, 0.12]);
      P.push(['box', SILVER, 0.42, 0.8, 0.1, 0.03, 0.55, 0.05]); P.push(['box', '#6a5a3a', 0.42, 0.52, 0.1, 0.12, 0.03, 0.03]); return P; },
    micaela_bastidas: (c) => { const P = []; leaderBody(P, { tunic: c, longDress: true, tocapu: false, belt: '#1a1410', sleeve: WHITE });
      P.push(['cone', c, 0, 0.36, 0, 0.5, 0.72, 0.42]);
      P.push(['box', '#5a2a22', 0, 1.09, 0.02, 0.6, 0.2, 0.32]);
      P.push(['cyl12', BLACK, 0, 1.55, 0, 0.3, 0.03, 0.3]); P.push(['cyl', BLACK, 0, 1.6, 0, 0.16, 0.1, 0.16]); P.push(['cyl', RED, 0, 1.57, 0, 0.165, 0.025, 0.165]);
      P.push(['cyl', BLACK, 0.1, 1.08, -0.15, 0.035, 0.5, 0.035]);
      P.push(['cyl', '#efe4cc', 0.36, 0.66, 0.1, 0.03, 0.22, 0.03, 0, 0, Math.PI / 2]); return P; },
    tupac_amaru_ii: (c) => { const P = []; leaderBody(P, { tunic: c, tocapu: true, sleeve: BLACK });
      P.push(['box', BLACK, 0, 0.82, -0.02, 0.6, 0.72, 0.46]); P.push(['box', c, 0, 0.82, 0.215, 0.24, 0.66, 0.02]);
      P.push(['box', WHITE, 0, 1.18, 0.12, 0.2, 0.06, 0.06]);
      P.push(['cyl', BLACK, 0, 1.1, -0.16, 0.13, 0.5, 0.06]);
      P.push(['prism', BLACK, 0, 1.58, 0, 0.3, 0.12, 0.3, 0, 0, 0]); P.push(['cyl12', BLACK, 0, 1.53, 0, 0.27, 0.03, 0.27]);
      staff(P, 0.42, 'sol', SILVER, 1.25); return P; },
    juan_santos: (c) => { const P = []; leaderBody(P, { tunic: '#7a5a3a', longDress: true, tocapu: false, cloak: false, sleeve: '#7a5a3a', skin: '#8a5a35' });
      for (let k = 0; k < 6; k++) P.push(['box', c, 0, 0.2 + k * 0.12, 0.31 - k * 0.012, 0.42, 0.025, 0.02]);
      for (let k = -4; k <= 4; k++) P.push(['box', [RED, GOLD, '#2f8f4f', WHITE][(k + 8) % 4], k * 0.045, 1.62, -0.05, 0.035, 0.26, 0.01, 0, 0, k * 0.15]);
      P.push(['cyl', c, 0, 1.47, 0, 0.18, 0.05, 0.18]); P.push(['box', RED, -0.07, 1.35, 0.165, 0.04, 0.015, 0.01]); P.push(['box', RED, 0.07, 1.35, 0.165, 0.04, 0.015, 0.01]);
      P.push(['box', '#efe4cc', 0, 1.12, 0.2, 0.08, 0.08, 0.02]);
      P.push(['halftorus', '#6b4a2f', 0.42, 0.85, 0.08, 0.38, 0.38, 0.38, 0, Math.PI / 2, Math.PI / 2]); return P; },
    parado_bellido: (c) => { const P = []; leaderBody(P, { tunic: c, longDress: true, tocapu: false, belt: GOLD, sleeve: WHITE, skin: '#a87048' });
      P.push(['cone', c, 0, 0.36, 0, 0.48, 0.72, 0.4]);
      for (let k = 0; k < 3; k++) P.push(['cyl', [GOLD, WHITE, '#2f8f4f'][k], 0, 0.06 + k * 0.05, 0, 0.47 - k * 0.012, 0.02, 0.39 - k * 0.01]);
      P.push(['box', '#3a2a5a', 0, 1.09, 0.02, 0.58, 0.22, 0.32]); P.push(['sph', GOLD, 0, 1.12, 0.19, 0.035, 0.035, 0.035]);
      P.push(['cyl12', '#efe4cc', 0, 1.55, 0, 0.28, 0.03, 0.28]); P.push(['cyl', '#efe4cc', 0, 1.62, 0, 0.15, 0.13, 0.15]); P.push(['cyl', BLACK, 0, 1.57, 0, 0.155, 0.025, 0.155]);
      P.push(['cyl', BLACK, -0.1, 1.08, -0.15, 0.035, 0.5, 0.035]); P.push(['cyl', BLACK, 0.1, 1.08, -0.15, 0.035, 0.5, 0.035]);
      P.push(['box', WHITE, 0.36, 0.64, 0.12, 0.14, 0.1, 0.01, 0, 0, 0.2]); return P; },
    jose_olaya: (c) => { const P = []; leaderBody(P, { tunic: WHITE, tocapu: false, sleeve: WHITE, skin: '#9a6440', belt: c });
      P.push(['box', c, -0.1, 0.28, 0, 0.12, 0.2, 0.13]); P.push(['box', c, 0.1, 0.28, 0, 0.12, 0.2, 0.13]);
      P.push(['cyl12', '#d9b86a', 0, 1.55, 0, 0.3, 0.02, 0.3]); P.push(['cyl', '#d9b86a', 0, 1.6, 0, 0.15, 0.1, 0.15]); P.push(['cyl', c, 0, 1.57, 0, 0.155, 0.02, 0.155]);
      P.push(['box', '#8a6a44', 0.36, 0.7, 0.12, 0.08, 0.16, 0.02, 0, 0, 0.2]); P.push(['box', '#efe4cc', 0.37, 0.73, 0.135, 0.05, 0.06, 0.005, 0, 0, 0.2]);
      P.push(['halftorus', '#c8b48a', -0.4, 0.62, 0.05, 0.2, 0.2, 0.2, 0, Math.PI / 2, 0]); return P; },
    ramon_castilla: (c) => { const P = []; uniform(P, { coat: BLACK, beard: false, cloak: c });
      P.push(['box', '#c23a50', 0, 0.98, 0.21, 0.07, 0.5, 0.02, 0, 0, 0.6]); P.push(['box', WHITE, 0.03, 0.98, 0.212, 0.03, 0.5, 0.02, 0, 0, 0.6]);
      P.push(['box', '#2a1e16', 0, 1.3, 0.16, 0.14, 0.03, 0.02]);
      bicorne(P, BLACK); P.push(['cyl', '#6b4a2f', 0.42, 0.55, 0.1, 0.02, 1.1, 0.02]); P.push(['sph', GOLD, 0.42, 1.1, 0.1, 0.04, 0.04, 0.04]); return P; },
    miguel_grau: (c) => { const P = []; uniform(P, { coat: c, trousers: c, beard: '#2a1e16' });
      for (let k = 0; k < 3; k++) P.push(['box', GOLD, k % 2 ? 0.31 : -0.31, 0.68, 0.06, 0.11, 0.02, 0.12]);
      bicorne(P, BLACK); sword(P, 0.36);
      P.push(['torus', '#3a2a1a', -0.4, 0.75, 0.1, 0.12, 0.12, 0.12]); for (let k = 0; k < 4; k++) P.push(['box', '#3a2a1a', -0.4, 0.75, 0.1, 0.02, 0.24, 0.02, 0, 0, k * Math.PI / 4]);
      return P; },
    francisco_bolognesi: (c) => { const P = []; uniform(P, { coat: '#2a3048', trousers: '#c23a50', beard: '#e8e2d2', hair: '#e8e2d2' });
      P.push(['box', c, 0, 0.5, 0, 0.58, 0.06, 0.44]); kepi(P, '#2a3048'); sword(P, 0.36);
      P.push(['cyl', BLACK, -0.42, 0.45, 0.15, 0.08, 0.5, 0.08, 0.3, 0, 0.6]); P.push(['cyl12', '#6b4a2f', -0.42, 0.18, 0.05, 0.16, 0.04, 0.16, 0, 0, Math.PI / 2]); return P; },
    andres_caceres: (c) => { const P = []; uniform(P, { coat: '#3a3a30', trousers: '#5a4a3a', beard: '#2a1e16' });
      P.push(['box', c, 0, 0.95, 0.01, 0.62, 0.5, 0.48]);
      for (let r = 0; r < 3; r++) P.push(['box', [RED, GOLD, WHITE][r], 0, 0.78 + r * 0.06, 0.245, 0.6, 0.025, 0.01]);
      P.push(['box', '#2a1e16', 0, 1.3, 0.17, 0.26, 0.04, 0.03]);
      kepi(P, '#3a3a30'); sword(P, 0.36); return P; },
    // Arquetipos para los líderes de la IA
    curaca: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#5a3a22' }); P.push(['cyl', c, 0, 1.47, 0, 0.18, 0.05, 0.18]);
      P.push(['cyl12', SILVER, -0.17, 1.37, 0, 0.05, 0.02, 0.05, 0, 0, Math.PI / 2]); P.push(['cyl12', SILVER, 0.17, 1.37, 0, 0.05, 0.02, 0.05, 0, 0, Math.PI / 2]); staff(P, 0.42, 'estrella', SILVER); return P; },
    sacerdote: (c) => { const P = []; leaderBody(P, { tunic: '#7a6a55', cloak: c, tocapu: false });
      P.push(['box', '#e2a72e', 0, 1.58, 0, 0.36, 0.14, 0.05]); P.push(['cone', '#e2a72e', 0, 1.72, 0, 0.12, 0.2, 0.04]);
      P.push(['cone', WHITE, -0.38, 0.85, 0.1, 0.06, 0.2, 0.06, 0, 0, 1.4]); staff(P, 0.42, 'sol', '#e2a72e'); return P; },
    senor_costa: (c) => { const P = []; leaderBody(P, { tunic: c, cloak: '#1f6f6a', tocapuColors: [GOLD, TURQ, WHITE] });
      P.push(['cyl', GOLD, 0, 1.56, 0, 0.17, 0.14, 0.17]); for (let k = -2; k <= 2; k++) P.push(['box', GOLD, k * 0.08, 1.74, 0, 0.05, 0.22, 0.01, 0, 0, k * 0.15]);
      P.push(['cyl12', GOLD, -0.17, 1.37, 0, 0.06, 0.025, 0.06, 0, 0, Math.PI / 2]); P.push(['cyl12', GOLD, 0.17, 1.37, 0, 0.06, 0.025, 0.06, 0, 0, Math.PI / 2]); staff(P, 0.42, 'estrella'); return P; },
    amazonico: (c) => { const P = []; leaderBody(P, { tunic: '#7a5a3a', tocapu: false, cloak: false, skin: '#8a5a35' });
      for (let k = -4; k <= 4; k++) P.push(['box', [RED, GOLD, c, '#2f8f4f'][(k + 8) % 4], k * 0.05, 1.62, -0.05, 0.04, 0.28, 0.01, 0, 0, k * 0.16]);
      P.push(['cyl', c, 0, 1.47, 0, 0.18, 0.05, 0.18]); P.push(['box', RED, -0.07, 1.35, 0.165, 0.04, 0.015, 0.01]); P.push(['box', RED, 0.07, 1.35, 0.165, 0.04, 0.015, 0.01]);
      P.push(['halftorus', '#6b4a2f', 0.42, 0.85, 0.08, 0.38, 0.38, 0.38, 0, Math.PI / 2, Math.PI / 2]); return P; },
    conquistador: (c) => { const P = []; leaderBody(P, { tunic: c, tocapu: false, sleeve: SILVER, beard: '#4a3020', skin: '#d8a888', cloak: RED });
      P.push(['box', SILVER, 0, 0.98, 0.02, 0.48, 0.42, 0.38]); P.push(['cone', SILVER, 0, 1.62, 0, 0.17, 0.22, 0.17]); P.push(['cyl12', SILVER, 0, 1.5, 0, 0.3, 0.02, 0.24]);
      P.push(['box', SILVER, 0.42, 0.8, 0.1, 0.03, 0.6, 0.05]); P.push(['box', '#6a5a3a', 0.42, 0.5, 0.1, 0.14, 0.03, 0.03]); return P; },
    republicano: (c) => { const P = []; leaderBody(P, { tunic: '#1f2433', tocapu: false, sleeve: '#1f2433', skin: '#d8a888', beard: '#4a3a2a' });
      P.push(['box', WHITE, 0, 1.08, 0.17, 0.12, 0.2, 0.02]); P.push(['box', c, 0, 0.9, 0.2, 0.5, 0.06, 0.02, 0, 0, 0.5]); return P; },
    // Mesoamérica: corona de turquesa (xiuhuitzolli) y penacho de quetzal
    tlatoani: (c) => { const P = []; leaderBody(P, { tunic: c, tocapu: false, cloak: TURQ, skin: '#9a6440' });
      P.push(['box', WHITE, 0, 0.82, 0.2, 0.3, 0.42, 0.02]);
      P.push(['cyl', TURQ, 0, 1.5, 0, 0.18, 0.08, 0.18]); P.push(['prism', TURQ, 0, 1.6, 0.1, 0.08, 0.14, 0.04, 0, 0, 0]);
      for (let k = -5; k <= 5; k++) P.push(['box', k % 2 ? '#2f8f4f' : '#3fbf6f', k * 0.05, 1.78, -0.1, 0.035, 0.42, 0.01, -0.25, 0, k * 0.11]);
      P.push(['cyl12', GOLD, -0.17, 1.37, 0, 0.05, 0.02, 0.05, 0, 0, Math.PI / 2]); P.push(['cyl12', GOLD, 0.17, 1.37, 0, 0.05, 0.02, 0.05, 0, 0, Math.PI / 2]);
      P.push(['cyl12', '#c8743a', -0.42, 0.85, 0.12, 0.16, 0.03, 0.16, Math.PI / 2, 0, 0]); P.push(['cyl12', TURQ, -0.42, 0.85, 0.14, 0.1, 0.02, 0.1, Math.PI / 2, 0, 0]);
      P.push(['box', '#6b4a2f', 0.42, 0.8, 0.1, 0.04, 0.6, 0.06]); for (let k = 0; k < 4; k++) P.push(['box', BLACK, 0.45, 0.6 + k * 0.12, 0.1, 0.03, 0.06, 0.04]); return P; },
    maya: (c) => { const P = []; leaderBody(P, { tunic: c, tocapu: false, cloak: '#2f6b3a', tocapuColors: [TURQ, GOLD, RED] });
      P.push(['torus', '#2fa39a', 0, 1.15, 0, 0.2, 0.2, 0.2, Math.PI / 2, 0, 0]);
      P.push(['box', '#8a3a1f', 0, 1.62, 0, 0.3, 0.22, 0.28]); P.push(['box', GOLD, 0, 1.64, 0.15, 0.22, 0.14, 0.02]);
      for (let k = -4; k <= 4; k++) P.push(['box', k % 2 ? '#2f8f4f' : '#1f6f6a', k * 0.045, 1.95, -0.08, 0.03, 0.5, 0.01, -0.4, 0, k * 0.1]);
      staff(P, 0.42, 'sol', TURQ, 1.3); return P; },
    // Norteamérica: tocado de plumas de águila
    jefe_plumas: (c) => { const P = []; leaderBody(P, { tunic: '#9a7a52', tocapu: false, cloak: false, sleeve: '#9a7a52', skin: '#9a6440' });
      P.push(['box', c, 0, 0.8, 0.2, 0.36, 0.06, 0.02]); P.push(['box', c, 0, 0.98, 0.2, 0.36, 0.06, 0.02]);
      P.push(['cyl', c, 0, 1.47, 0, 0.18, 0.05, 0.18]);
      for (let k = 0; k < 11; k++) { const a = -1.3 + k * 0.26; P.push(['box', WHITE, Math.sin(a) * 0.2, 1.62 + Math.cos(a) * 0.14, -0.05, 0.035, 0.3, 0.01, -0.2, 0, -a]); P.push(['box', BLACK, Math.sin(a) * 0.32, 1.62 + Math.cos(a) * 0.24, -0.06, 0.035, 0.07, 0.012, -0.2, 0, -a]); }
      P.push(['cyl', BLACK, -0.17, 1.1, 0.06, 0.03, 0.42, 0.03]); P.push(['cyl', BLACK, 0.17, 1.1, 0.06, 0.03, 0.42, 0.03]);
      P.push(['cyl', '#6b4a2f', 0.42, 0.75, 0.08, 0.02, 1.2, 0.02]); P.push(['box', RED, 0.42, 1.22, 0.08, 0.06, 0.18, 0.02]); return P; },
    lonko: (c) => { const P = []; leaderBody(P, { tunic: '#2a2a3a', tocapu: false, cloak: false, sleeve: '#2a2a3a' });
      P.push(['prism', c, 0, 0.98, 0, 0.62, 0.3, 0.46, 0, 0, 0]); for (let k = -2; k <= 2; k++) P.push(['box', k % 2 ? RED : WHITE, k * 0.1, 0.95, 0.2, 0.06, 0.05, 0.02]);
      P.push(['cyl', SILVER, 0, 1.47, 0, 0.18, 0.04, 0.18]); P.push(['box', SILVER, 0, 1.47, 0.18, 0.06, 0.06, 0.01]);
      P.push(['cyl', '#6b4a2f', 0.42, 0.85, 0.08, 0.015, 1.7, 0.015]); P.push(['cone', SILVER, 0.42, 1.75, 0.08, 0.03, 0.12, 0.03]); return P; },
    // Colonia: sombrero de ala ancha, golilla y bastón de mando
    virrey: (c) => { const P = []; leaderBody(P, { tunic: BLACK, tocapu: false, sleeve: BLACK, skin: '#d8a888', beard: '#5a4030', cloak: c });
      P.push(['cyl12', WHITE, 0, 1.2, 0, 0.17, 0.05, 0.17]); P.push(['box', GOLD, 0, 0.9, 0.2, 0.06, 0.06, 0.02]);
      P.push(['cyl12', BLACK, 0, 1.56, 0, 0.3, 0.02, 0.3]); P.push(['cyl', BLACK, 0, 1.63, 0, 0.15, 0.14, 0.15]); P.push(['box', WHITE, 0.12, 1.7, -0.05, 0.04, 0.16, 0.02, 0, 0, -0.4]);
      P.push(['cyl', BLACK, 0.42, 0.65, 0.08, 0.02, 1.3, 0.02]); P.push(['sph', GOLD, 0.42, 1.32, 0.08, 0.04, 0.04, 0.04]); return P; },
    monarca: (c) => { const P = []; leaderBody(P, { tunic: '#1f2433', tocapu: false, sleeve: '#1f2433', skin: '#d8a888', beard: '#4a3a2a', cloak: '#8a1f2a' });
      P.push(['box', WHITE, 0, 0.82, -0.18, 0.64, 0.12, 0.05]); P.push(['box', c, 0, 0.95, 0.2, 0.5, 0.06, 0.02, 0, 0, 0.5]);
      P.push(['cyl', GOLD, 0, 1.53, 0, 0.16, 0.08, 0.16]); for (let k = 0; k < 5; k++) P.push(['cone', GOLD, Math.cos(k * 1.256) * 0.14, 1.62, Math.sin(k * 1.256) * 0.14, 0.03, 0.08, 0.03]);
      P.push(['sph', RED, 0, 1.53, 0.16, 0.03, 0.03, 0.02]);
      P.push(['cyl', GOLD, 0.42, 0.75, 0.08, 0.02, 1.0, 0.02]); P.push(['ico', GOLD, 0.42, 1.28, 0.08, 0.06, 0.06, 0.06]); return P; },
    // Independencia y república: uniforme con charreteras y bicornio
    militar: (c) => { const P = []; leaderBody(P, { tunic: '#1f2a4a', tocapu: false, sleeve: '#1f2a4a', skin: '#c89070', beard: false, belt: WHITE });
      P.push(['box', GOLD, -0.27, 1.17, 0, 0.14, 0.03, 0.14]); P.push(['box', GOLD, 0.27, 1.17, 0, 0.14, 0.03, 0.14]);
      for (let k = 0; k < 3; k++) P.push(['sph', GOLD, 0, 0.8 + k * 0.12, 0.215, 0.02, 0.02, 0.01]);
      P.push(['box', c, 0, 0.98, 0.2, 0.5, 0.06, 0.02, 0, 0, -0.5]);
      P.push(['prism', BLACK, 0, 1.6, 0, 0.42, 0.14, 0.14, 0, Math.PI / 2, 0]); P.push(['sph', c, 0.1, 1.62, 0.07, 0.04, 0.04, 0.02]);
      P.push(['box', SILVER, 0.4, 0.62, 0.1, 0.03, 0.55, 0.04, 0, 0, 0.15]); return P; },
    moderno: (c) => { const P = []; leaderBody(P, { tunic: '#2a2f3a', tocapu: false, sleeve: '#2a2f3a', skin: '#c89070', hair: '#3a2a20' });
      P.push(['box', WHITE, 0, 1.08, 0.17, 0.12, 0.2, 0.02]); P.push(['box', c, 0, 1.02, 0.18, 0.04, 0.2, 0.02]);
      P.push(['box', c, 0, 0.9, 0.2, 0.5, 0.06, 0.02, 0, 0, 0.5]); return P; },
    presidenta: (c) => { const P = []; leaderBody(P, { tunic: '#2a2f3a', longDress: true, tocapu: false, sleeve: '#2a2f3a', skin: '#c89070', hair: '#3a2a20', belt: '#2a2f3a' });
      P.push(['sph', '#3a2a20', 0, 1.32, -0.08, 0.17, 0.2, 0.12]); P.push(['box', c, 0, 0.98, 0.2, 0.5, 0.06, 0.02, 0, 0, 0.5]); return P; }
  };
  function leaderGeo(model, color) {
    const build = PC.LEADER_MODELS[model] || PC.LEADER_MODELS.curaca;
    return cachedGeo('leader_' + model + color, () => {
      const P = build(color);
      // Pedestal tejido
      P.push(['cyl12', '#1d2646', 0, -0.06, 0, 0.62, 0.12, 0.62]);
      P.push(['cyl12', '#2a3360', 0, -0.004, 0, 0.6, 0.012, 0.6]);
      for (let k = 0; k < 12; k++) P.push(['box', k % 2 ? '#a3243b' : '#e2a72e', Math.cos(k / 12 * Math.PI * 2) * 0.61, -0.06, Math.sin(k / 12 * Math.PI * 2) * 0.61, 0.08, 0.06, 0.03, 0, -k / 12 * Math.PI * 2 + Math.PI / 2, 0]);
      return P;
    });
  }
  // Renderizador de retratos (un único contexto WebGL extra): miniaturas en caché y un escenario animado.
  const portrait = { r: null, scene: null, cam: null, mesh: null, stage: null, key: null, thumbs: {} };
  function ensurePortrait() {
    if (portrait.r) return portrait;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xf6e7c8, 0x253056, 1.6));
    const key = new THREE.DirectionalLight(0xfff0d6, 2.6); key.position.set(2, 4, 3); sc.add(key);
    const rim = new THREE.DirectionalLight(0xe2a72e, 1.4); rim.position.set(-3, 2, -2); sc.add(rim);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    portrait.r = r; portrait.scene = sc; portrait.cam = cam;
    r.domElement.className = 'leader-canvas';
    return portrait;
  }
  function setPortraitModel(model, color) {
    const pt = ensurePortrait();
    const k = model + color;
    if (pt.key === k && pt.mesh) return;
    if (pt.mesh) pt.scene.remove(pt.mesh);
    pt.mesh = new THREE.Mesh(leaderGeo(model, color), mat);
    pt.scene.add(pt.mesh); pt.key = k; pt.cur = { model, color };
  }
  function framePortrait(bust) {
    const pt = portrait;
    if (bust) { pt.cam.position.set(0, 1.42, 2.2); pt.cam.lookAt(0, 1.3, 0); }
    else { pt.cam.position.set(0, 1.25, 4.6); pt.cam.lookAt(0, 0.85, 0); }
  }
  R.leaderThumb = function (model, color) {
    const k = model + color;
    if (portrait.thumbs[k]) return portrait.thumbs[k];
    if (!THREE) return '';
    const pt = ensurePortrait();
    const prev = pt.cur;
    setPortraitModel(model, color);
    pt.r.setSize(160, 160, false); pt.cam.aspect = 1; pt.cam.updateProjectionMatrix();
    pt.mesh.rotation.y = -0.35;
    framePortrait(true);
    pt.r.render(pt.scene, pt.cam);
    portrait.thumbs[k] = pt.r.domElement.toDataURL('image/png');
    pt.mesh.rotation.y = 0;
    if (prev) setPortraitModel(prev.model, prev.color);
    return portrait.thumbs[k];
  };
  // Monta un escenario animado (modelo de cuerpo entero girando) dentro de un elemento.
  R.mountLeader = function (el, model, color) {
    if (!THREE || !el) return;
    const pt = ensurePortrait();
    setPortraitModel(model, color);
    if (pt.r.domElement.parentElement !== el) el.appendChild(pt.r.domElement);
    pt.stage = el; pt.t0 = performance.now();
    const fit = () => { const w = el.clientWidth || 300, h = el.clientHeight || 360; pt.r.setSize(w, h, false); pt.r.domElement.style.width = w + 'px'; pt.r.domElement.style.height = h + 'px'; pt.cam.aspect = w / h; pt.cam.updateProjectionMatrix(); };
    fit();
    framePortrait(false);
    if (!pt.loop) {
      pt.loop = true;
      const tick = () => {
        if (!pt.stage || !document.body.contains(pt.stage) || pt.stage.offsetParent === null) { pt.loop = false; return; }
        const t = (performance.now() - pt.t0) / 1000;
        if (pt.mesh) { pt.mesh.rotation.y = Math.sin(t * 0.5) * 0.6; pt.mesh.position.y = Math.sin(t * 1.6) * 0.015; }
        fit(); framePortrait(false);
        pt.r.render(pt.scene, pt.cam);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  // ---------------------------------------------------------------- API
  R.draw = function () {
    // Compatibilidad: redibujar resaltados y unidades.
    if (!R.ready || !PC.G) return;
    if (mapRef !== PC.G.map) return R.rebuild();
    syncUnits(); buildOverlays();
  };
  R.rebuild = function () {
    if (!R.ready || !PC.G) return;
    mapRef = PC.G.map;
    unitViews.forEach((v) => unitGroup.remove(v.group)); unitViews.clear();
    cityViews.forEach((v) => cityGroup.remove(v.mesh)); cityViews.clear();
    labels.forEach((el) => el.remove()); labels.clear();
    Object.keys(geoCache).forEach((k) => { if (k.startsWith('city_')) { geoCache[k].dispose(); delete geoCache[k]; } });
    buildTiles(); buildDeco(); buildFeatures(); buildFog();
    R.refresh();
  };
  R.refresh = function () {
    if (!R.ready || !PC.G) return;
    if (mapRef !== PC.G.map) return R.rebuild();
    tileColors(); decoVisibility(); updateFog(); buildBorders(); buildRoads(); buildFeatViews(); syncCities(); syncUnits(); syncLabels(); buildOverlays();
  };
  R.setHover = function (t) { if (t !== R.hover) { R.hover = t; buildOverlays(); } };
  R.screenOf = function (t) {
    const [x, z] = R.tileXZ(t);
    const v = new THREE.Vector3(x, R.tileTop(t), z).project(camera);
    return [(v.x + 1) / 2 * R.w, (1 - v.y) / 2 * R.h];
  };
  R.mapCenter = function () {
    const ts = PC.G.map.tiles.filter((t) => t && t.terrain !== 'oceano');
    const xs = ts.map((t) => R.tileXZ(t)[0]), zs = ts.map((t) => R.tileXZ(t)[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  };
  R.overview = function () {
    const [x, z] = R.mapCenter();
    cam.tx = x; cam.tz = z; cam.dist = PC.G.map.kind === 'peru' ? 40 : 46; camGoal.active = false;
  };
  R.setZoom = function (d) { cam.dist = PC.clamp(d, cam.minD, cam.maxD); };
})(globalThis.PC = globalThis.PC || {});
