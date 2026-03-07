'use strict';

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const CFG = Object.freeze({
  // Camera
  FOV:    55,
  NEAR:   0.01,
  FAR:    120,

  // Orbit defaults
  THETA:  0.45,
  PHI:    1.08,
  RADIUS: 6,

  // Orbit limits
  PHI_MIN:   0.08,
  PHI_MAX:   Math.PI * 0.82,
  RADIUS_MIN: 1.2,
  RADIUS_MAX: 9.0,

  // Orbit feel
  AUTO_ROTATE_SPEED: 0.002,
  DAMP:              0.10,
  RESTORE_DELAY:     4.0,   // seconds idle before camera recenters

  // Scene
  BG_COLOR:    new THREE.Color(0x06000f),
  FOG_DENSITY: 0.075,

  // Particles
  DUST_COUNT: 300,
  FALL_COUNT:  32,
});


// ─────────────────────────────────────────────
//  MATH HELPERS
// ─────────────────────────────────────────────
const clamp  = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp   = (a, b, t)   => a + (b - a) * clamp(t, 0, 1);
const smstep = (a, b, x)   => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand   = ()           => Math.random();
const randBetween = (a, b)  => a + rand() * (b - a);
const rr     = (a, b)       => a + rand() * (b - a);


// ─────────────────────────────────────────────
//  RENDERER
// ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.38;

Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '0' });
document.body.appendChild(renderer.domElement);


// ─────────────────────────────────────────────
//  SCENE & CAMERA
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = CFG.BG_COLOR;
scene.fog = new THREE.FogExp2(new THREE.Color(0x08001a), CFG.FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(CFG.FOV, innerWidth / innerHeight, CFG.NEAR, CFG.FAR);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});


// ─────────────────────────────────────────────
//  LIGHTS
// ─────────────────────────────────────────────
function setupLights() {
  scene.add(new THREE.AmbientLight('#2a0015', 13));

  // Key light — warm top-down
  const key = new THREE.DirectionalLight('#fff0d8', 3.0);
  key.position.set(4, 10, 3);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(2048);
  Object.assign(key.shadow.camera, { near: 0.1, far: 25, left: -5, right: 5, bottom: -5, top: 5 });
  scene.add(key);

  // Fill — cool blue-purple from the side
  const fill = new THREE.DirectionalLight(0x6040ff, 1.0);
  fill.position.set(-5, 3, -3);
  scene.add(fill);

  // Rim — orange backlight
  const rim = new THREE.DirectionalLight(0xff6020, 1.6);
  rim.position.set(-1, 2, -7);
  scene.add(rim);

  // Top — deep red from above
  const top = new THREE.DirectionalLight(0xff2050, 1.2);
  top.position.set(0, 8, 0);
  scene.add(top);

  // Point lights clustered around the flower
  const pointLights = [
    { color: '#ff1a10', intensity: 3.0, distance: 14, pos: [-2.5,  2.5,  2.0] },
    { color: '#ff4410', intensity: 2.0, distance: 10, pos: [ 2.2,  4.0, -2.5] },
    { color: '#ffcc22', intensity: 1.0, distance:  7, pos: [ 0.0,  0.7,  1.8] },
    { color: '#ff0820', intensity: 2.0, distance: 12, pos: [ 1.5, -0.5,  0.5] },
    { color: '#ff3060', intensity: 1.0, distance:  6, pos: [-1.0,  1.5, -1.2] },
    { color: '#ff7030', intensity: 1.0, distance:  8, pos: [ 0.0, -3.5,  0.5] },
    { color: '#ff0060', intensity: 1.0, distance:  9, pos: [-3.0,  0.5, -1.0] },
    { color: '#ffaa00', intensity: 0.7, distance:  6, pos: [ 3.0,  1.0,  1.5] },
  ];
  pointLights.forEach(({ color, intensity, distance, pos }) => {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(...pos);
    scene.add(light);
  });
}
setupLights();


// ─────────────────────────────────────────────
//  ENVIRONMENT
// ─────────────────────────────────────────────
(function buildEnvironment() {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0020, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 14, 64),
    new THREE.MeshBasicMaterial({ color: 0x3a0030, side: THREE.DoubleSide, transparent: true, opacity: 0.18 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -3.18;
  scene.add(ring);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 2.5, 48),
    new THREE.MeshBasicMaterial({ color: '#ff1018', side: THREE.DoubleSide, transparent: true, opacity: 0.10 })
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = -3.17;
  scene.add(glowRing);

  const pCount  = 180;
  const pPos    = new Float32Array(pCount * 3);
  const pCol    = new Float32Array(pCount * 3);
  const palette = [
    [1.0,0.10,0.25],[1.0,0.40,0.10],[1.0,0.70,0.15],
    [0.8,0.05,0.30],[0.6,0.02,0.50],[1.0,0.60,0.80],
  ];
  for (let i = 0; i < pCount; i++) {
    const angle=rand()*Math.PI*2, radius=rr(2.5,12);
    pPos[i*3]=Math.cos(angle)*radius; pPos[i*3+1]=rr(-3.0,5.5); pPos[i*3+2]=Math.sin(angle)*radius;
    const c=palette[Math.floor(rand()*palette.length)];
    pCol[i*3]=c[0]; pCol[i*3+1]=c[1]; pCol[i*3+2]=c[2];
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  bgGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
  scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({
    size: 0.055, vertexColors: true, transparent: true, opacity: 0.45, sizeAttenuation: true,
  })));

  for (let i = 0; i < 12; i++) {
    const angle=i/12*Math.PI*2, r=rr(3.5,7.0);
    const mist = new THREE.Mesh(
      new THREE.SphereGeometry(rr(1.2,2.8), 8, 6),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.82+rand()*0.12, 0.7, 0.08),
        transparent: true, opacity: rr(0.04,0.11)
      })
    );
    mist.position.set(Math.cos(angle)*r, rr(-2.5,1.5), Math.sin(angle)*r);
    scene.add(mist);
  }
})();

// ─────────────────────────────────────────────
//  MATERIALS
// ─────────────────────────────────────────────
// layerT: 0 = innermost petals, 1 = outermost
function makePetalMaterial(layerT) {
  return new THREE.MeshStandardMaterial({
    color:        new THREE.Color().setHSL(0.97, 0.72, 0.20 + layerT * 0.14), // ← less saturated
    roughness:    0.22 + layerT * 0.10,
    metalness:    0.04,
    side:         THREE.DoubleSide,
    vertexColors: true,
    transparent:  true,
    opacity:      0.975,
    emissive:     new THREE.Color().setHSL(0.97, 0.65, 0.04 + layerT * 0.03),
  });
}

const Materials = {
  stem:   new THREE.MeshStandardMaterial({ color: '#1e5012', roughness: 0.76 }),
  leaf:   new THREE.MeshStandardMaterial({ color: '#1a5510', roughness: 0.68, side: THREE.DoubleSide }),
  sepal:  new THREE.MeshStandardMaterial({ color: '#163a0c', roughness: 0.72, side: THREE.DoubleSide }),
  stamen: new THREE.MeshStandardMaterial({ color: '#e8c840', roughness: 0.55, emissive: new THREE.Color(0.10, 0.06, 0) }),
  anther: new THREE.MeshStandardMaterial({ color: '#b08010', roughness: 0.45, emissive: new THREE.Color(0.12, 0.05, 0) }),
  pistil: new THREE.MeshStandardMaterial({ color: '#7aaa25', roughness: 0.55 }),
  stigma: new THREE.MeshStandardMaterial({ color: '#9dc040', roughness: 0.40, emissive: new THREE.Color(0.04, 0.08, 0) }),
  fallingPetal: new THREE.MeshStandardMaterial({
    color:       '#c01030',
    roughness:   0.45,
    side:        THREE.DoubleSide,
    transparent: true,
    opacity:     0.70,
    emissive:    new THREE.Color(0.07, 0, 0.02),
  }),
};

function buildBufferGeometry(indices, positions, uvs, colors) {
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Shared quad-grid indexing for grid-based meshes
function buildGridIndices(segsU, segsV) {
  const indices = [];
  for (let j = 0; j < segsV; j++) {
    for (let i = 0; i < segsU; i++) {
      const a = j * (segsU + 1) + i;
      const b = a + 1;
      const c = a + (segsU + 1);
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
}


// ─────────────────────────────────────────────
//  PETAL GEOMETRY
// ─────────────────────────────────────────────
// layerT controls the openness and curvature (0 = bud-like inner, 1 = flat outer)
function buildPetalGeometry(layerT) {
  const segsU = 28, segsV = 36;
  const vertexCount = (segsU + 1) * (segsV + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs       = new Float32Array(vertexCount * 2);
  const colors    = new Float32Array(vertexCount * 3);

  // Muted petal color stops (R, G, B) — toned down from original
  const COLOR_BASE = [0.08, 0.008, 0.010];
  const COLOR_DEEP = [0.42, 0.022, 0.050];
  const COLOR_MID  = [0.70, 0.055, 0.075];  // was 0.85
  const COLOR_TIP  = [0.82, 0.110, 0.110];  // was 1.00
  const COLOR_BOWL = [0.58, 0.068, 0.100];  // was 0.70
  const COLOR_VEIN = [0.25, 0.013, 0.025];

  let pi = 0, ui = 0, ci = 0;

  for (let j = 0; j <= segsV; j++) {
    const v = j / segsV;

    // Width envelope — narrow at base, wide in middle, tapers at tip
    const baseWidth = smstep(0.0, 0.22, v)
      * Math.pow(Math.sin(v * Math.PI), 0.30)
      * (1.0 - smstep(0.82, 1.0, v) * 0.09)
      * 0.56;

    for (let i = 0; i <= segsU; i++) {
      const u   = i / segsU;
      const uc  = u * 2 - 1;       // [-1, 1] centered
      const ucA = Math.abs(uc);

      // --- Shape offsets ---
      const petalWidth  = (baseWidth - smstep(0.83, 1.0, v) * Math.max(0, 1 - ucA * 8) * 0.038) * (1 + layerT * 0.04);
      const cupCurve    = uc * uc * (0.44 - layerT * 0.22) * Math.sin(v * Math.PI * 0.90);
      const archBend    = Math.sin(v * Math.PI) * (0.05 + layerT * 0.17);
      const tipCurlT    = smstep(0.7, 1.0, v);
      const tipCurl     = tipCurlT * tipCurlT * (0.035 + layerT * 0.30);
      const edgeFactor  = Math.max(0, (ucA - 0.50) / 0.50);
      const edgeVel     = Math.sin(Math.max(0, v - 0.12) * Math.PI * 0.78);
      const edgeRoll    = Math.pow(edgeFactor, 1.4) * (0.08 + layerT * 0.52) * edgeVel;
      const veinBlend   = Math.max(0, 1 - ucA * 17);
      const veinRidge   = veinBlend * 0.015 * Math.sin(v * Math.PI * 0.90) * smstep(0.0, 0.22, v);
      const veinTex     = Math.sin(ucA * 13 + v * 8) * 0.0038 * Math.max(0, 1 - ucA * 1.2) * Math.sin(v * Math.PI);
      const ruffle      = ucA > 0.46 ? Math.sin(v * Math.PI * 7.5 + uc * 11.0) * 0.0065 * ucA : 0;
      const wrapAngle   = Math.max(0, 0.36 - layerT) * 2.65 * Math.pow(v, 1.35);

      const pz = cupCurve + archBend - tipCurl + ruffle - edgeRoll - veinRidge + veinTex;

      positions[pi++] = uc * petalWidth;
      positions[pi++] = v * Math.cos(wrapAngle) - pz * Math.sin(wrapAngle);
      positions[pi++] = -(v * Math.sin(wrapAngle) + pz * Math.cos(wrapAngle));

      uvs[ui++] = u;
      uvs[ui++] = v;

      // --- Vertex colors (gradient along petal length) ---
      const t0 = smstep(0.00, 0.26, v);
      const t1 = smstep(0.20, 0.68, v);
      const t2 = smstep(0.60, 0.96, v) * (0.55 + layerT * 0.45);

      let r = lerp(COLOR_BASE[0], COLOR_DEEP[0], t0);
      let g = lerp(COLOR_BASE[1], COLOR_DEEP[1], t0);
      let b = lerp(COLOR_BASE[2], COLOR_DEEP[2], t0);

      r = lerp(r, COLOR_MID[0], t1); g = lerp(g, COLOR_MID[1], t1); b = lerp(b, COLOR_MID[2], t1);
      r = lerp(r, COLOR_TIP[0], t2); g = lerp(g, COLOR_TIP[1], t2); b = lerp(b, COLOR_TIP[2], t2);

      const bowlHighlight = Math.max(0, 1 - ucA * 3.5) * smstep(0.18, 0.65, v) * (1 - layerT * 0.38);
      r = lerp(r, COLOR_BOWL[0], bowlHighlight * 0.55);
      g = lerp(g, COLOR_BOWL[1], bowlHighlight * 0.55);
      b = lerp(b, COLOR_BOWL[2], bowlHighlight * 0.55);

      const veinDark = (veinBlend * 0.55 + Math.max(0, Math.sin(ucA * 10 - 0.5)) * 0.12) * smstep(0.10, 0.42, v);
      r = lerp(r, COLOR_VEIN[0], veinDark * 0.50);
      g = lerp(g, COLOR_VEIN[1], veinDark * 0.50);
      b = lerp(b, COLOR_VEIN[2], veinDark * 0.50);

      const edgeDim = smstep(0.82, 1.0, ucA) * 0.28;
      colors[ci++] = r * (1 - edgeDim);
      colors[ci++] = g * (1 - edgeDim);
      colors[ci++] = b * (1 - edgeDim);
    }
  }

  return buildBufferGeometry(buildGridIndices(segsU, segsV), positions, uvs, colors);
}


// ─────────────────────────────────────────────
//  LEAF GEOMETRY
// ─────────────────────────────────────────────
function buildLeafGeometry() {
  const segsU = 10, segsV = 18;
  const vertexCount = (segsU + 1) * (segsV + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs       = new Float32Array(vertexCount * 2);
  let pi = 0, ui = 0;

  for (let j = 0; j <= segsV; j++) {
    const v  = j / segsV;
    const hw = (0.055 + 0.27 * Math.pow(Math.sin(v * Math.PI), 0.65)) * 0.5;

    for (let i = 0; i <= segsU; i++) {
      const u   = i / segsU;
      const uc  = u * 2 - 1;
      const ucA = Math.abs(uc);

      positions[pi++] = uc * hw;
      positions[pi++] = v * 0.92;
      positions[pi++] = Math.sin(v * Math.PI) * 0.065
        - uc * uc * 0.042 * Math.sin(v * Math.PI * 0.80)
        + Math.max(0, 1 - ucA * 6) * 0.016 * Math.sin(v * Math.PI * 0.85);

      uvs[ui++] = u;
      uvs[ui++] = v;
    }
  }

  return buildBufferGeometry(buildGridIndices(segsU, segsV), positions, uvs, null);
}


// ─────────────────────────────────────────────
//  SEPAL GEOMETRY
// ─────────────────────────────────────────────
function buildSepalGeometry() {
  const segsU = 6, segsV = 14;
  const vertexCount = (segsU + 1) * (segsV + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs       = new Float32Array(vertexCount * 2);
  let pi = 0, ui = 0;

  for (let j = 0; j <= segsV; j++) {
    const v  = j / segsV;
    const hw = (0.022 + 0.14 * Math.pow(Math.sin(v * Math.PI * 0.86), 1.25)) * 0.5;

    for (let i = 0; i <= segsU; i++) {
      const u  = i / segsU;
      const uc = u * 2 - 1;

      positions[pi++] = uc * hw;
      positions[pi++] = v * 0.73;
      positions[pi++] = Math.sin((v + 0.08) * Math.PI * 0.84) * 0.085 - uc * uc * 0.048;

      uvs[ui++] = u;
      uvs[ui++] = v;
    }
  }

  return buildBufferGeometry(buildGridIndices(segsU, segsV), positions, uvs, null);
}


// ─────────────────────────────────────────────
//  STAMENS & PISTIL
// ─────────────────────────────────────────────
function buildStamensAndPistil(parent) {
  const filamentGeo = new THREE.CylinderGeometry(0.0042, 0.0028, 0.20, 4, 1);
  const antherGeo   = new THREE.SphereGeometry(0.011, 6, 4);

  for (let i = 0; i < 40; i++) {
    const angle  = (i / 40) * Math.PI * 2 + rand() * 0.22;
    const r      = randBetween(0.032, 0.092);
    const h      = randBetween(0.12, 0.23);
    const tilt   = randBetween(0.04, 0.16);

    const filament = new THREE.Mesh(filamentGeo, Materials.stamen);
    filament.position.set(Math.cos(angle) * r, h * 0.5, Math.sin(angle) * r);
    filament.rotation.z = Math.cos(angle) * tilt;
    filament.rotation.x = Math.sin(angle) * tilt;
    parent.add(filament);

    const anther = new THREE.Mesh(antherGeo, Materials.anther);
    anther.position.set(Math.cos(angle) * (r + tilt * 0.08), h, Math.sin(angle) * (r + tilt * 0.08));
    parent.add(anther);
  }

  // Central pistil dome
  const pistilDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54),
    Materials.pistil
  );
  pistilDome.position.y = 0.038;
  parent.add(pistilDome);

  // Stigma tips
  const stigmaGeo = new THREE.SphereGeometry(0.010, 5, 4);
  for (let i = 0; i < 5; i++) {
    const a      = (i / 5) * Math.PI * 2;
    const stigma = new THREE.Mesh(stigmaGeo, Materials.stigma);
    stigma.position.set(Math.cos(a) * 0.024, 0.115, Math.sin(a) * 0.024);
    parent.add(stigma);
  }
}


// ─────────────────────────────────────────────
//  FLOWER GROUP
// ─────────────────────────────────────────────
const flowerGroup = new THREE.Group();
scene.add(flowerGroup);

// Breeze animation data, populated while building petals/leaves
const petalBreezeData = [];
const leafBreezeData  = [];

// — Stem —
flowerGroup.add(new THREE.Mesh(
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.00,  0.00,  0.00),
      new THREE.Vector3( 0.06, -0.55,  0.03),
      new THREE.Vector3(-0.05, -1.30, -0.04),
      new THREE.Vector3( 0.04, -2.05,  0.02),
      new THREE.Vector3( 0.00, -2.95,  0.00),
    ]),
    36, 0.038, 10, false
  ),
  Materials.stem
));

// — Stem thorns —
[[-1.02, 1], [-1.55, -1], [-2.05, 1], [-2.52, -1]].forEach(([y, side]) => {
  const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.10, 5), Materials.stem);
  thorn.rotation.z = side * 1.20;
  thorn.position.set(side * 0.047, y, 0);
  flowerGroup.add(thorn);
});

// — Leaves —
const leafGeo = buildLeafGeometry();
const leafConfigs = [
  { y: -0.88, ry:  0.80, rx: -0.50, side:  1 },
  { y: -1.42, ry: -0.60, rx: -0.48, side: -1 },
  { y: -1.88, ry:  1.30, rx: -0.40, side:  1 },
  { y: -2.32, ry: -1.10, rx: -0.42, side: -1 },
];
leafConfigs.forEach(({ y, ry, rx, side }) => {
  const leaf    = new THREE.Mesh(leafGeo, Materials.leaf);
  const baseRX  = rx;
  const baseRZ  = side * 0.28;
  leaf.position.set(side * 0.05, y, 0);
  leaf.rotation.set(baseRX, ry, baseRZ);
  leaf.scale.setScalar(randBetween(0.82, 1.00));
  leaf.castShadow = true;
  flowerGroup.add(leaf);
  leafBreezeData.push({ mesh: leaf, baseRX, baseRZ, phaseX: rand() * Math.PI * 2, phaseZ: rand() * Math.PI * 2 });
});

// — Sepals —
const sepalGeo = buildSepalGeometry();
for (let s = 0; s < 5; s++) {
  const sepal = new THREE.Mesh(sepalGeo, Materials.sepal);
  sepal.rotation.order = 'YXZ';
  sepal.rotation.y = (s / 5) * Math.PI * 2 + 0.30;
  sepal.rotation.x = -0.50;
  sepal.position.y  = -0.10;
  flowerGroup.add(sepal);
}

// — Receptacle (green base) —
flowerGroup.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.10, 14, 12),
  new THREE.MeshStandardMaterial({ color: 0x254a14, roughness: 0.65 })
));

// — Petal layers (inner → outer) —
const petalLayerDefs = [
  { count:  5, r: 0.000, h:  0.22, tilt:  0.28, scale: 0.26 },
  { count:  6, r: 0.020, h:  0.17, tilt:  0.06, scale: 0.36 },
  { count:  8, r: 0.040, h:  0.12, tilt: -0.28, scale: 0.50 },
  { count: 10, r: 0.070, h:  0.06, tilt: -0.56, scale: 0.67 },
  { count: 12, r: 0.100, h:  0.01, tilt: -0.86, scale: 0.84 },
  { count: 14, r: 0.140, h: -0.04, tilt: -1.15, scale: 1.00 },
];

petalLayerDefs.forEach((layerDef, layerIndex) => {
  const layerT     = layerIndex / (petalLayerDefs.length - 1);
  const petalGeo   = buildPetalGeometry(layerT);
  const petalMat   = makePetalMaterial(layerT);
  const breezeAmp  = 0.0008 + layerT * 0.03;

  for (let i = 0; i < layerDef.count; i++) {
    const angle  = (i / layerDef.count) * Math.PI * 2 + layerIndex * 0.618;
    const petal  = new THREE.Mesh(petalGeo, petalMat);

    petal.castShadow    = true;
    petal.rotation.order = 'YXZ';

    const baseRX = layerDef.tilt + randBetween(-0.044, 0.044);
    const baseRZ = randBetween(-0.024, 0.024);

    petal.rotation.set(baseRX, angle, baseRZ);
    petal.position.set(
      Math.sin(angle) * layerDef.r,
      layerDef.h + randBetween(-0.008, 0.008),
      Math.cos(angle) * layerDef.r
    );
    petal.scale.setScalar(layerDef.scale * randBetween(0.94, 1.08));
    flowerGroup.add(petal);

    petalBreezeData.push({
      mesh:    petal,
      baseRX,
      baseRZ,
      breezeAmp,
      angle,
      phaseX:  rand() * Math.PI * 2,
      phaseZ:  rand() * Math.PI * 2,
      freqX:   randBetween(0.48, 1.06),
      freqZ:   randBetween(0.36, 0.82),
    });
  }
});

buildStamensAndPistil(flowerGroup);


// ─────────────────────────────────────────────
//  DUST PARTICLES
// ─────────────────────────────────────────────
const DUST_COLORS_PALETTE = [
  [1.00, 0.18, 0.22], [1.00, 0.50, 0.12], [1.00, 0.78, 0.18],
  [0.90, 0.08, 0.20], [1.00, 0.55, 0.35], [0.75, 0.04, 0.18],
  [1.00, 0.30, 0.60], [0.85, 0.00, 0.40],
];

const dustPositions = new Float32Array(CFG.DUST_COUNT * 3);
const dustColors    = new Float32Array(CFG.DUST_COUNT * 3);

const dustParticles = Array.from({ length: CFG.DUST_COUNT }, (_, i) => {
  const angle  = rand() * Math.PI * 2;
  const radius = randBetween(0.6, 3.8);
  const y      = randBetween(-2.2, 2.6);
  const c      = DUST_COLORS_PALETTE[Math.floor(rand() * DUST_COLORS_PALETTE.length)];

  dustPositions[i * 3]     = Math.cos(angle) * radius;
  dustPositions[i * 3 + 1] = y;
  dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
  dustColors[i * 3]     = c[0];
  dustColors[i * 3 + 1] = c[1];
  dustColors[i * 3 + 2] = c[2];

  return { angle, radius, y, speed: randBetween(0.00025, 0.00095), drift: randBetween(0.00006, 0.00022) };
});

const dustPositionAttr = new THREE.BufferAttribute(dustPositions, 3);
dustPositionAttr.setUsage(THREE.DynamicDrawUsage);

const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', dustPositionAttr);
dustGeo.setAttribute('color',    new THREE.BufferAttribute(dustColors, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
  size: 0.025, vertexColors: true, transparent: true, opacity: 0.65, sizeAttenuation: true,
})));


// ─────────────────────────────────────────────
//  FALLING PETALS
// ─────────────────────────────────────────────
const fallingPetalGeo = (() => {
  const geo = new THREE.PlaneGeometry(0.13, 0.20, 4, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const curl = Math.sin(pos.getY(i) * 5.5 + pos.getX(i) * 3.5) * 0.022
               + Math.sin(pos.getX(i) * 8) * 0.010;
    pos.setZ(i, curl);
  }
  geo.computeVertexNormals();
  return geo;
})();

const fallingPetals = Array.from({ length: CFG.FALL_COUNT }, () => {
  const mesh = new THREE.Mesh(fallingPetalGeo, Materials.fallingPetal.clone());
  mesh.userData = {
    x:      randBetween(-5.5, 5.5),
    y:      randBetween(2.0, 8.0),
    z:      randBetween(-5.5, 5.5),
    speedY: -randBetween(0.004, 0.009),
    rotX:   rand() * Math.PI * 2,
    rotZ:   rand() * Math.PI * 2,
    rotSpX: randBetween(-0.020, 0.020),
    rotSpZ: randBetween(-0.013, 0.013),
    driftX: randBetween(-0.003, 0.003),
    driftZ: randBetween(-0.002, 0.002),
    phase:  rand() * Math.PI * 2,
  };
  scene.add(mesh);
  return mesh;
});


// ─────────────────────────────────────────────
//  WIND SYSTEM
// ─────────────────────────────────────────────
const Wind = {
  strength:  0,
  target:    0.12,
  nextGust:  3.0,
  direction: 0.8,

  update(dt) {
    this.strength += (this.target - this.strength) * 0.008;
    this.nextGust  -= dt;

    if (this.nextGust <= 0) {
      const isCalm = rand() < 0.42;
      this.target   = isCalm ? randBetween(0.04, 0.10) : randBetween(0.45, 1.0);
      this.nextGust = randBetween(2.5, 6.5);
      if (this.target > 0.30) this.direction += randBetween(-0.55, 0.55);
    }
  },
};


// ─────────────────────────────────────────────
//  ORBIT CONTROLS
// ─────────────────────────────────────────────
const orbit = {
  theta:  CFG.THETA,
  phi:    CFG.PHI,
  radius: CFG.RADIUS,

  // Targets (lerped toward each frame)
  targetTheta:  CFG.THETA,
  targetPhi:    CFG.PHI,
  targetRadius: CFG.RADIUS,

  isDragging:   false,
  lastX: 0,
  lastY: 0,
  lastActivity: -999,
};

function markCameraActivity() { orbit.lastActivity = performance.now() / 1000; }

// Mouse
renderer.domElement.addEventListener('mousedown', e => {
  orbit.isDragging = true;
  orbit.lastX = e.clientX;
  orbit.lastY = e.clientY;
  document.body.style.cursor = 'grabbing';
  markCameraActivity();
});
window.addEventListener('mouseup', () => {
  orbit.isDragging = false;
  document.body.style.cursor = '';
});
window.addEventListener('mousemove', e => {
  if (!orbit.isDragging) return;
  orbit.targetTheta -= (e.clientX - orbit.lastX) * 0.007;
  orbit.targetPhi    = clamp(orbit.targetPhi - (e.clientY - orbit.lastY) * 0.007, CFG.PHI_MIN, CFG.PHI_MAX);
  orbit.lastX = e.clientX;
  orbit.lastY = e.clientY;
  markCameraActivity();
});

// Scroll zoom
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  orbit.targetRadius = clamp(orbit.targetRadius + e.deltaY * 0.04, CFG.RADIUS_MIN, CFG.RADIUS_MAX);
  markCameraActivity();
}, { passive: false });

// Touch
let lastPinchDistance = 0;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    orbit.isDragging = true;
    orbit.lastX = e.touches[0].clientX;
    orbit.lastY = e.touches[0].clientY;
  } else {
    orbit.isDragging  = false;
    lastPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
  markCameraActivity();
}, { passive: true });

renderer.domElement.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && orbit.isDragging) {
    orbit.targetTheta -= (e.touches[0].clientX - orbit.lastX) * 0.007;
    orbit.targetPhi    = clamp(orbit.targetPhi - (e.touches[0].clientY - orbit.lastY) * 0.007, CFG.PHI_MIN, CFG.PHI_MAX);
    orbit.lastX = e.touches[0].clientX;
    orbit.lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    orbit.targetRadius = clamp(orbit.targetRadius * (lastPinchDistance / d), CFG.RADIUS_MIN, CFG.RADIUS_MAX);
    lastPinchDistance  = d;
  }
  markCameraActivity();
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => { orbit.isDragging = false; });


// ─────────────────────────────────────────────
//  ANIMATION LOOP
// ─────────────────────────────────────────────
flowerGroup.position.y = -5;   // start below, rises into frame
let hasRisen = false;
let previousTime = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const dt   = time - previousTime;
  previousTime = time;

  // — Flower rise-in on load —
  if (!hasRisen) {
    flowerGroup.position.y += (0 - flowerGroup.position.y) * 0.025;
    if (Math.abs(flowerGroup.position.y) < 0.002) {
      flowerGroup.position.y = 0;
      hasRisen = true;
    }
  }

  // — Gentle ambient sway —
  const swayScale = 1.0 + Wind.strength * 1.6;
  flowerGroup.rotation.z = (Math.sin(time * 0.37) * 0.015 + Math.sin(time * 0.71) * 0.006) * swayScale;
  flowerGroup.rotation.x =  Math.sin(time * 0.26) * 0.007 * swayScale;
  flowerGroup.scale.setScalar(1 + Math.sin(time * 1.20) * 0.003 + Math.sin(time * 2.40) * 0.001);

  // — Camera orbit auto-rotate + restore —
  const now         = performance.now() / 1000;
  const idleSeconds = now - orbit.lastActivity;
  const restoring   = !orbit.isDragging && idleSeconds > CFG.RESTORE_DELAY;
  const restoreK    = restoring ? clamp((idleSeconds - CFG.RESTORE_DELAY) / 2.0, 0, 1) : 0;

  if (!orbit.isDragging) {
    orbit.targetTheta += CFG.AUTO_ROTATE_SPEED;
    if (restoreK > 0) {
      orbit.targetPhi    += (CFG.PHI    - orbit.targetPhi)    * restoreK * 0.04;
      orbit.targetRadius += (CFG.RADIUS - orbit.targetRadius) * restoreK * 0.04;
    }
  }

  orbit.theta  += (orbit.targetTheta  - orbit.theta)  * CFG.DAMP;
  orbit.phi    += (orbit.targetPhi    - orbit.phi)    * CFG.DAMP;
  orbit.radius += (orbit.targetRadius - orbit.radius) * CFG.DAMP;

  camera.position.set(
    orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    orbit.radius * Math.cos(orbit.phi),
    orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
  );
  camera.lookAt(0, 0.25, 0);

  Wind.update(dt);

  // — Petal breeze —
  petalBreezeData.forEach(pd => {
    const gustFactor = Wind.strength * (0.55 + 0.45 * Math.cos(pd.angle - Wind.direction));
    const wobbleX = Math.sin(time * pd.freqX * 2.1 + pd.phaseX) * 0.50
                  + Math.sin(time * pd.freqX * 3.7 + pd.phaseX * 1.3) * 0.25
                  + Math.sin(time * pd.freqX * 0.8 + pd.phaseX * 0.7) * 0.25;
    const wobbleZ = Math.sin(time * pd.freqZ * 1.9 + pd.phaseZ) * 0.50
                  + Math.sin(time * pd.freqZ * 3.1 + pd.phaseZ * 1.5) * 0.50;
    pd.mesh.rotation.x = pd.baseRX + wobbleX * pd.breezeAmp * gustFactor;
    pd.mesh.rotation.z = pd.baseRZ + wobbleZ * pd.breezeAmp * gustFactor * 0.6;
  });

  // — Leaf breeze —
  leafBreezeData.forEach(lb => {
    lb.mesh.rotation.x = lb.baseRX + Math.sin(time * 0.88 + lb.phaseX) * 0.026 * Wind.strength;
    lb.mesh.rotation.z = lb.baseRZ + Math.sin(time * 0.68 + lb.phaseZ) * 0.042 * Wind.strength;
  });

  // — Dust orbit —
  dustParticles.forEach((d, i) => {
    d.angle += d.speed;
    d.y     += d.drift;
    if (d.y > 2.9) d.y = -2.2;
    dustPositions[i * 3]     = Math.cos(d.angle) * d.radius;
    dustPositions[i * 3 + 1] = d.y;
    dustPositions[i * 3 + 2] = Math.sin(d.angle) * d.radius;
  });
  dustPositionAttr.needsUpdate = true;

  // — Falling petals —
  fallingPetals.forEach(mesh => {
    const d = mesh.userData;
    d.y    += d.speedY;
    d.x    += d.driftX + Math.sin(time * 0.38 + d.phase) * 0.0018;
    d.z    += d.driftZ;
    d.rotX += d.rotSpX;
    d.rotZ += d.rotSpZ;

    // Respawn above when they fall off the bottom
    if (d.y < -4.5) {
      d.y = randBetween(5, 9);
      d.x = randBetween(-5.5, 5.5);
      d.z = randBetween(-5.5, 5.5);
    }

    mesh.position.set(d.x, d.y, d.z);
    mesh.rotation.set(d.rotX, 0, d.rotZ);
    mesh.material.opacity = clamp((d.y + 4.5) * 0.20, 0, 0.70);
  });

  renderer.render(scene, camera);
}

animate();

setTimeout(() => {
  let message = document.getElementById('message');
  if (message) {
    message.style.animation = 'fadeOut 1.5s ease-out';
  }

  let hint = document.getElementById('hint');
  if (hint) {
    hint.style.animation = 'fadeOut 1.5s ease-out';
  }
}, 15000);
