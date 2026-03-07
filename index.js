'use strict';
const CFG = Object.freeze({
  // ── Scene ─────────────────────────────────────────────────────────
  BG_COLOR:    new THREE.Color(0x04000F),
  FOG_DENSITY: 0.10,

  // ── Camera / Orbit ────────────────────────────────────────────────
  FOV:      55,
  NEAR:     0.01,
  FAR:      120,
  THETA:    0.45,
  PHI:      1.08,
  RADIUS:   6,
  AUTO_ROT: 0.002,
  DAMP:     0.10,
  PHI_MIN:  0.08,
  PHI_MAX:  Math.PI * 0.82,
  R_MIN:    1.2,
  R_MAX:    9.0,

  // ── Ambient FX ────────────────────────────────────────────────────
  DUST_COUNT: 300,
  FALL_COUNT:  32,
});

// ── Math helpers ──────────────────────────────────────────────────
const clamp  = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const smstep = (a, b, x)   => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rnd    = ()           => Math.random();
const rr     = (a, b)       => a + rnd() * (b - a);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.30;
Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '0' });
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = CFG.BG_COLOR;
scene.fog = new THREE.FogExp2(CFG.BG_COLOR, CFG.FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(CFG.FOV, innerWidth / innerHeight, CFG.NEAR, CFG.FAR);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

(function setupLights() {
  scene.add(new THREE.AmbientLight('#1a0005', 10.0));

  const key = new THREE.DirectionalLight('#ffecd8', 5.5);
  key.position.set(4, 10, 3);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(2048);
  Object.assign(key.shadow.camera, { near: 0.1, far: 25, left: -5, right: 5, bottom: -5, top: 5 });
  scene.add(key);

  // Creates subtle blue sheen on petal backs
  const fill = new THREE.DirectionalLight('#bc6b08', 0.75);
  fill.position.set(-5, 3, -3);
  scene.add(fill);

  // Warm amber rim light — catches petal silhouette edges
  const rim = new THREE.DirectionalLight(0xff8030, 1.35);
  rim.position.set(-1, 2, -7);
  scene.add(rim);

  // Red-orange scatter points — simulate light bouncing inside the bloom
  const pointLights = [
    { color: 0xff1a10, intensity: 3.0, distance: 12, x: -2.5, y:  2.5, z:  2.0 },
    { color: 0xff5510, intensity: 2.0, distance:  8, x:  2.2, y:  4.0, z: -2.5 },
    { color: 0xffbb22, intensity: 1.0, distance:  6, x:  0.0, y:  0.7, z:  1.8 },
    { color: 0xff0820, intensity: 1.6, distance: 10, x:  1.5, y: -0.5, z:  0.5 },
    { color: 0xff3040, intensity: 0.9, distance:  5, x: -1.0, y:  1.5, z: -1.2 },
    // Deep below: warm ground-bounce from imagined candlelight
    { color: 0xff6020, intensity: 0.9, distance:  7, x:  0.0, y: -3.5, z:  0.5 },
  ];
  pointLights.forEach(({ color, intensity, distance, x, y, z }) => {
    const l = new THREE.PointLight(color, intensity, distance);
    l.position.set(x, y, z);
    scene.add(l);
  });
})();

const Mat = (() => {
  function petal(layerT) {
    const lightness = 0.2 + layerT * 0.2;
    return new THREE.MeshStandardMaterial({
      color:        new THREE.Color().setHSL(0.97, 0.92, lightness),
      roughness:    0.30 + layerT * 0.3,
      metalness:    0.01,
      side:         THREE.DoubleSide,
      vertexColors: true,
      transparent:  true,
      opacity:      0.975,
      emissive:     new THREE.Color().setHSL(0.97, 0.90, 0.04 + layerT * 0.02),
    });
  }

  const stem  = new THREE.MeshStandardMaterial({ color: 0x1e5012, roughness: 0.76 });
  const leaf  = new THREE.MeshStandardMaterial({ color: 0x1a5510, roughness: 0.68, side: THREE.DoubleSide });
  const sepal = new THREE.MeshStandardMaterial({ color: 0x163a0c, roughness: 0.72, side: THREE.DoubleSide });

  const stamen = new THREE.MeshStandardMaterial({ color: 0xe8c840, roughness: 0.55, emissive: new THREE.Color(0.10, 0.06, 0) });
  const anther = new THREE.MeshStandardMaterial({ color: 0xb08010, roughness: 0.45, emissive: new THREE.Color(0.12, 0.05, 0) });
  const pistil = new THREE.MeshStandardMaterial({ color: 0x7aaa25, roughness: 0.55 });
  const stigma = new THREE.MeshStandardMaterial({ color: 0x9dc040, roughness: 0.40, emissive: new THREE.Color(0.04, 0.08, 0) });

  const fallingPetal = new THREE.MeshStandardMaterial({
    color: 0xcc1122, roughness: 0.48, side: THREE.DoubleSide,
    transparent: true, opacity: 0.72,
    emissive: new THREE.Color(0.06, 0, 0.01),
  });

  return { petal, stem, leaf, sepal, stamen, anther, pistil, stigma, fallingPetal };
})();

function createGeo(indices, positions, uvArr, colors) {
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (colors !== null)
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvArr,     2));
  geo.computeVertexNormals();
  return geo;
}

function createIndices(indices, segU, segV) {
  for (let j = 0; j < segV; j++) {
  for (let i = 0; i < segU; i++) {
    const a = j * (segU + 1) + i;
    const b = a + 1;
    const c = a + (segU + 1);
    const d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
}
}

//  Parametric surface for a realistic red rose petal.
//
//  Coordinate axes (local petal space before world transform):
//    +X  =  width (left → right)
//    +Y  =  height (base → tip)
//    +Z  =  determined by bowl/arch formulas (see below)
//
//  Key shape features:
//    · Narrow "claw" at the very base where petal attaches to receptacle
//    · Broad ovate body — nearly as wide as tall
//    · Deep concave bowl (cup) on inner petals; shallower on outer
//    · Edge roll-back on outer petals — edges fold BACKWARD revealing inner face
//    · Tip curl on outer petals
//    · Heart-shaped notch at tip apex
//    · Central vein ridge (slight raised midrib)
//    · Fine secondary-vein surface texture
//    · Tight spiral wrap for the innermost bud layers
//
//  Vertex colours (pure red rose — NO bicolor):
//    C_BASE   near-black deep crimson at the claw
//    C_DEEP   rich dark crimson, body interior
//    C_MID    vivid pure red, main face
//    C_TIP    bright warm scarlet near the tip
//    C_BOWL   slightly rosier catch-light inside the cup
//    C_VEIN   darker channels along vein paths

function buildPetalGeo(layerT) {
  const segU = 28, segV = 36;
  const nV   = (segU + 1) * (segV + 1);
  const pos  = new Float32Array(nV * 3);
  const col  = new Float32Array(nV * 3);
  const uvs  = new Float32Array(nV * 2);
  const idx  = [];
  let pi = 0, ci = 0, ui = 0;

  // ── Colour palette ──────────────────────────────────────────────
  const C_BASE = [0.13, 0.010, 0.015];
  const C_DEEP = [0.45, 0.028, 0.055];
  const C_MID  = [0.72, 0.070, 0.088];
  const C_TIP  = [0.86, 0.115, 0.120];
  const C_BOWL = [0.58, 0.085, 0.110];
  const C_VEIN = [0.28, 0.018, 0.032];

  function lc(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  for (let j = 0; j <= segV; j++) {
    const v = j / segV;

    // ── Width profile ──────────────────────────────────────────────
    // Claw: nearly zero at attachment, opens quickly over first 22% of height
    const clawOpen  = smstep(0.0, 0.22, v);
    // Broad sin-body — low exponent keeps the petal wide through most of its height
    const broadBody = Math.pow(Math.sin(v * Math.PI), 0.30);
    // Slight tip narrowing for a natural rounded apex
    const tipNarrow = 1.0 - smstep(0.82, 1.0, v) * 0.09;
    const baseW     = clawOpen * broadBody * tipNarrow * 0.56;

    for (let i = 0; i <= segU; i++) {
      const u   = i / segU;
      const uc  = u * 2 - 1;        // −1 … +1 across width
      const ucA = Math.abs(uc);

      // ── Heart-tip notch (subtle center indent near apex) ──────────
      const notchT = smstep(0.83, 1.0, v) * Math.max(0, 1 - ucA * 8) * 0.038;
      const petalW = (baseW - notchT) * (1 + layerT * 0.04);

      // ── Concave bowl / cup ─────────────────────────────────────────
      // Inner layers very deep; flattens gradually toward outer guard petals
      const bowlAmp = 0.44 - layerT * 0.22;
      const cup     = uc * uc * bowlAmp * Math.sin(v * Math.PI * 0.90);

      // ── Forward arch  (petal surface bows outward / away from center)
      const arch = Math.sin(v * Math.PI) * (0.05 + layerT * 0.17);

      // ── Tip curl (outer petals curl back at tip)  ────────────────
      const tipCurlT = smstep(0.7, 1.0, v);
      const tipCurl  = tipCurlT * tipCurlT * (0.035 + layerT * 0.30);

      // ── Edge roll-back (outer 50% of width folds backward) ────────
      // This is what gives real rose petals their characteristic 3-D silhouette.
      const edgeF    = Math.max(0, (ucA - 0.50) / 0.50);
      const edgeV    = Math.sin(Math.max(0, v - 0.12) * Math.PI * 0.78);
      const edgeRoll = Math.pow(edgeF, 1.4) * (0.08 + layerT * 0.52) * edgeV;

      // ── Central vein ridge (raised midrib) ────────────────────────
      const veinBlend = Math.max(0, 1 - ucA * 17);
      const veinRidge = veinBlend * 0.015 * Math.sin(v * Math.PI * 0.90) * clawOpen;

      // ── Secondary vein micro-texture ─────────────────────────────
      const veinTex = Math.sin(ucA * 13 + v * 8) * 0.0038
                    * Math.max(0, 1 - ucA * 1.2) * Math.sin(v * Math.PI);

      // ── Edge micro-ruffle ─────────────────────────────────────────
      const ruffle = ucA > 0.46
        ? Math.sin(v * Math.PI * 7.5 + uc * 11.0) * 0.0065 * ucA : 0;

      // ── Spiral wrap for innermost bud layers ─────────────────────
      const wrapA = Math.max(0, 0.36 - layerT) * 2.65 * Math.pow(v, 1.35);

      // ── Combine all Z contributions ───────────────────────────────
      //   +cup        → concave opening toward flower centre
      //   +arch       → body bows away from receptacle
      //   −tipCurl    → tip flips back (toward viewer when near upright)
      //   +ruffle     → fine margin waviness
      //   −edgeRoll   → edge folds back (−Z = toward centre after world rotation)
      //   −veinRidge  → central ridge stands proud
      //   +veinTex    → slight surface noise
      const pz = cup + arch - tipCurl + ruffle - edgeRoll - veinRidge + veinTex;

      pos[pi++] = uc * petalW;
      pos[pi++] = v  * Math.cos(wrapA) - pz * Math.sin(wrapA);
      pos[pi++] = -(v * Math.sin(wrapA) + pz * Math.cos(wrapA));

      uvs[ui++] = u;
      uvs[ui++] = v;

      // ── Vertex colour ─────────────────────────────────────────────
      // Graduated dark-base → vivid-mid → bright-tip with added bowl
      // catch-light and vein darkening.

      // Height gradient: 0 at claw → 1 near tip
      const t0 = smstep(0.00, 0.26, v);  // base → deep
      const t1 = smstep(0.20, 0.68, v);  // deep → mid red
      const t2 = smstep(0.60, 0.96, v) * (0.55 + layerT * 0.45); // mid → bright tip

      let r = lc(C_BASE[0], C_DEEP[0], t0);
      let g = lc(C_BASE[1], C_DEEP[1], t0);
      let b = lc(C_BASE[2], C_DEEP[2], t0);
      r = lc(r, C_MID[0], t1);  g = lc(g, C_MID[1], t1);  b = lc(b, C_MID[2], t1);
      r = lc(r, C_TIP[0], t2);  g = lc(g, C_TIP[1], t2);  b = lc(b, C_TIP[2], t2);

      // Bowl catch-light: brighter inside the cup centre
      const bowlHL = Math.max(0, 1 - ucA * 3.5) * smstep(0.18, 0.65, v) * (1 - layerT * 0.38);
      r = lc(r, C_BOWL[0], bowlHL * 0.55);
      g = lc(g, C_BOWL[1], bowlHL * 0.55);
      b = lc(b, C_BOWL[2], bowlHL * 0.55);

      // Vein darkening
      const veinDark = (veinBlend * 0.55 + Math.max(0, Math.sin(ucA * 10 - 0.5)) * 0.12)
                     * smstep(0.10, 0.42, v);
      r = lc(r, C_VEIN[0], veinDark * 0.52);
      g = lc(g, C_VEIN[1], veinDark * 0.52);
      b = lc(b, C_VEIN[2], veinDark * 0.52);

      // Subtle edge darkening at outermost 15% of width
      const edgeDim = smstep(0.82, 1.0, ucA) * 0.28;
      r *= (1 - edgeDim);  g *= (1 - edgeDim);  b *= (1 - edgeDim);

      col[ci++] = r;
      col[ci++] = g;
      col[ci++] = b;
    }
  }

  createIndices(idx, segU, segV);
  return createGeo(idx, pos, uvs, col);
}

function buildLeafGeo() {
  const segU = 10, segV = 18;
  const nV   = (segU + 1) * (segV + 1);
  const pos  = new Float32Array(nV * 3);
  const uvs  = new Float32Array(nV * 2);
  const idx  = [];
  let pi = 0, ui = 0;

  for (let j = 0; j <= segV; j++) {
    const v  = j / segV;
    // Ovate profile: narrow at base and tip, broadest at ~45%
    const hw = (0.055 + 0.27 * Math.pow(Math.sin(v * Math.PI), 0.65)) * 0.5;

    for (let i = 0; i <= segU; i++) {
      const u   = i / segU;
      const uc  = u * 2 - 1;
      const ucA = Math.abs(uc);

      // Midrib: raised central ridge
      const midrib = Math.max(0, 1 - ucA * 6) * 0.016 * Math.sin(v * Math.PI * 0.85);
      // Edge cup (leaf edges droop slightly)
      const cup    = uc * uc * 0.042 * Math.sin(v * Math.PI * 0.80);
      // Overall arch away from stem
      const arch   = Math.sin(v * Math.PI) * 0.065;

      pos[pi++] = uc * hw;
      pos[pi++] = v  * 0.92;
      pos[pi++] = arch - cup + midrib;
      uvs[ui++] = u;  uvs[ui++] = v;
    }
  }

  createGeo(idx, pos, uvs, null);
  return createGeo(idx, pos, uvs, null);
}

function buildSepalGeo() {
  const segU = 6, segV = 14;
  const nV   = (segU + 1) * (segV + 1);
  const pos  = new Float32Array(nV * 3);
  const uvs  = new Float32Array(nV * 2);
  const idx  = [];
  let pi = 0, ui = 0;

  for (let j = 0; j <= segV; j++) {
    const v  = j / segV;
    const hw = (0.022 + 0.14 * Math.pow(Math.sin(v * Math.PI * 0.86), 1.25)) * 0.5;

    for (let i = 0; i <= segU; i++) {
      const u  = i / segU;
      const uc = u * 2 - 1;

      const arch = Math.sin((v + 0.08) * Math.PI * 0.84) * 0.085;
      const cup  = uc * uc * 0.048;

      pos[pi++] = uc * hw;
      pos[pi++] = v  * 0.73;
      pos[pi++] = arch - cup;
      uvs[ui++] = u;  uvs[ui++] = v;
    }
  }

  createIndices(idx, segU, segV);
  return createGeo(idx, pos, uvs, null);
}

function buildStamensAndPistil(parent) {
  const COUNT      = 40;
  const filamentGeo = new THREE.CylinderGeometry(0.0042, 0.0028, 0.20, 4, 1);
  const antherGeo   = new THREE.SphereGeometry(0.011, 6, 4);

  for (let i = 0; i < COUNT; i++) {
    const angle  = (i / COUNT) * Math.PI * 2 + rnd() * 0.22;
    const r      = rr(0.032, 0.092);
    const h      = rr(0.12, 0.23);
    const tiltMag = rr(0.04, 0.16);

    // Filament — slightly tilted outward from centre
    const fil = new THREE.Mesh(filamentGeo, Mat.stamen);
    fil.position.set(Math.cos(angle) * r, h * 0.5, Math.sin(angle) * r);
    fil.rotation.z = Math.cos(angle) * tiltMag;
    fil.rotation.x = Math.sin(angle) * tiltMag;
    parent.add(fil);

    // Anther — small golden sphere at tip
    const anth = new THREE.Mesh(antherGeo, Mat.anther);
    anth.position.set(
      Math.cos(angle) * (r + tiltMag * 0.08),
      h,
      Math.sin(angle) * (r + tiltMag * 0.08)
    );
    parent.add(anth);
  }

  // Pistil — domed green receptacle base
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54),
    Mat.pistil
  );
  dome.position.y = 0.038;
  parent.add(dome);

  // 5 stigma lobes
  const stigmaGeo = new THREE.SphereGeometry(0.010, 5, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.Mesh(stigmaGeo, Mat.stigma);
    s.position.set(Math.cos(a) * 0.024, 0.115, Math.sin(a) * 0.024);
    parent.add(s);
  }
}

const petalData  = [];  // breeze animation state per petal
const leafBreeze = [];  // breeze animation state per leaf

const flowerGroup = new THREE.Group();
scene.add(flowerGroup);

// ── Curved stem ───────────────────────────────────────────────────
const stemMesh = new THREE.Mesh(
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
  Mat.stem
);
stemMesh.castShadow = true;
flowerGroup.add(stemMesh);

// ── Thorns ────────────────────────────────────────────────────────
[[-1.02, 1],
 [-1.55, -1],
 [-2.05, 1],
 [-2.52, -1]
].forEach(([y, side]) => {
  const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.10, 5), Mat.stem);
  thorn.rotation.z = side * 1.20;
  thorn.position.set(side * 0.047, y, 0);
  flowerGroup.add(thorn);
});

// ── Leaves ────────────────────────────────────────────────────────
const leafGeo = buildLeafGeo();
[
  { y: -0.88, ry:  0.80, rx: -0.50, side:  1 },
  { y: -1.42, ry: -0.60, rx: -0.48, side: -1 },
  { y: -1.88, ry:  1.30, rx: -0.40, side:  1 },
  { y: -2.32, ry: -1.10, rx: -0.42, side: -1 },
].forEach(({ y, ry, rx, side }) => {
  const leaf    = new THREE.Mesh(leafGeo, Mat.leaf);
  const baseRX  = rx;
  const baseRZ  = side * 0.28;
  leaf.position.set(side * 0.05, y, 0);
  leaf.rotation.set(baseRX, ry, baseRZ);
  leaf.scale.setScalar(rr(0.82, 1.00));
  leaf.castShadow = true;
  flowerGroup.add(leaf);
  leafBreeze.push({ mesh: leaf, baseRX, baseRZ, phaseX: rnd() * Math.PI * 2, phaseZ: rnd() * Math.PI * 2 });
});

// ── Sepals ────────────────────────────────────────────────────────
const sepalGeo = buildSepalGeo();
for (let s = 0; s < 5; s++) {
  const sepal = new THREE.Mesh(sepalGeo, Mat.sepal);
  sepal.rotation.order = 'YXZ';
  sepal.rotation.y = (s / 5) * Math.PI * 2 + 0.30;
  sepal.rotation.x = -0.50;
  sepal.position.y  = -0.10;
  flowerGroup.add(sepal);
}

// ── Receptacle ────────────────────────────────────────────────────
flowerGroup.add(new THREE.Mesh(
  new THREE.SphereGeometry(0.10, 14, 12),
  new THREE.MeshStandardMaterial({ color: 0x254a14, roughness: 0.65 })
));

// ── Petal layers ──────────────────────────────────────────────────
const LAYER_DEFS = [
  { count:  5, r: 0.000, h:  0.22, tilt:  0.28, scale: 0.26 },
  { count:  6, r: 0.020, h:  0.17, tilt:  0.06, scale: 0.36 },
  { count:  8, r: 0.040, h:  0.12, tilt: -0.28, scale: 0.50 },
  { count: 10, r: 0.070, h:  0.06, tilt: -0.56, scale: 0.67 },
  { count: 12, r: 0.100, h:  0.01, tilt: -0.86, scale: 0.84 },
  { count: 14, r: 0.140, h: -0.04, tilt: -1.15, scale: 1.00 },
];

LAYER_DEFS.forEach((ld, li) => {
  const layerT    = li / (LAYER_DEFS.length - 1);
  const mat       = Mat.petal(layerT);
  const geo       = buildPetalGeo(layerT);
  // Outer petals exposed more to breeze; inner are sheltered by surrounding layers
  const breezeAmp = 0.0008 + layerT * 0.03;

  for (let i = 0; i < ld.count; i++) {
    // Golden-ratio phyllotaxis offset per layer for natural petal stacking
    const angle  = (i / ld.count) * Math.PI * 2 + li * 0.618;
    const petal  = new THREE.Mesh(geo, mat);
    petal.castShadow     = true;
    petal.rotation.order = 'YXZ';

    const baseRX = ld.tilt + rr(-0.044, 0.044);
    const baseRZ = rr(-0.024, 0.024);

    petal.rotation.set(baseRX, angle, baseRZ);
    petal.position.set(
      Math.sin(angle) * ld.r,
      ld.h + rr(-0.008, 0.008),
      Math.cos(angle) * ld.r
    );
    petal.scale.setScalar(ld.scale * rr(0.94, 1.08));
    flowerGroup.add(petal);

    petalData.push({
      mesh: petal, baseRX, baseRZ, breezeAmp, angle,
      phaseX: rnd() * Math.PI * 2,
      phaseZ: rnd() * Math.PI * 2,
      freqX:  rr(0.48, 1.06),
      freqZ:  rr(0.36, 0.82),
    });
  }
});

// ── Stamens & pistil (nestled inside innermost petal layer) ───────
buildStamensAndPistil(flowerGroup);

// ── Orbiting dust sparkles ────────────────────────────────────────
const dustPositions = new Float32Array(CFG.DUST_COUNT * 3);
const dustColors    = new Float32Array(CFG.DUST_COUNT * 3);

// Warm palette: reds, oranges, golds — matching the rose's atmosphere
const DUST_PALETTE = [
  [1.00, 0.20, 0.24],   // bright red
  [1.00, 0.48, 0.14],   // warm orange
  [1.00, 0.76, 0.20],   // gold
  [0.90, 0.10, 0.18],   // deep red
  [1.00, 0.55, 0.35],   // salmon
  [0.75, 0.05, 0.15],   // crimson
];

const dustData = Array.from({ length: CFG.DUST_COUNT }, (_, i) => {
  const angle  = rnd() * Math.PI * 2;
  const radius = rr(0.6, 3.8);
  const y      = rr(-2.2, 2.6);
  const speed  = rr(0.00025, 0.00095);
  const drift  = rr(0.00006, 0.00022);

  const c = DUST_PALETTE[Math.floor(rnd() * DUST_PALETTE.length)];
  dustColors[i * 3]     = c[0];
  dustColors[i * 3 + 1] = c[1];
  dustColors[i * 3 + 2] = c[2];

  // Heart-shaped path in XZ plane
  const a = angle;
  const x = radius * Math.sin(a) * Math.cos(a);       // x = sin(a)*cos(a) for heart-like curve
  const z = radius * (0.5 * Math.sin(a) - 0.2 * Math.sin(2*a)); // tweak z for lobes

  dustPositions[i * 3]     = x;
  dustPositions[i * 3 + 1] = y;
  dustPositions[i * 3 + 2] = z;

  return { angle, radius, y, speed, drift };
});

const dustPosAttr = new THREE.BufferAttribute(dustPositions, 3);
dustPosAttr.setUsage(THREE.DynamicDrawUsage);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', dustPosAttr);
dustGeo.setAttribute('color',    new THREE.BufferAttribute(dustColors, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
  size: 0.023, vertexColors: true,
  transparent: true, opacity: 0.58,
  sizeAttenuation: true,
})));

// ── Falling 3D petals ─────────────────────────────────────────────
// Shared warped-plane geometry that approximates a petal silhouette
const fallingPetalGeo = (() => {
  const g = new THREE.PlaneGeometry(0.13, 0.20, 4, 4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 5.5 + x * 3.5) * 0.022 + Math.sin(x * 8) * 0.010);
  }
  g.computeVertexNormals();
  return g;
})();

const fallingPetals = Array.from({ length: CFG.FALL_COUNT }, () => {
  const m = new THREE.Mesh(fallingPetalGeo, Mat.fallingPetal.clone());
  m.userData = {
    x:      rr(-5.5, 5.5),
    y:      rr(2.0, 8.0),
    z:      rr(-5.5, 5.5),
    speedY: -rr(0.004, 0.009),
    rotX:   rnd() * Math.PI * 2,
    rotZ:   rnd() * Math.PI * 2,
    rotSpX: rr(-0.020, 0.020),
    rotSpZ: rr(-0.013, 0.013),
    driftX: rr(-0.003, 0.003),
    driftZ: rr(-0.002, 0.002),
    phase:  rnd() * Math.PI * 2,
  };
  scene.add(m);
  return m;
});

const Wind = {
  strength:  0,
  target:    0.12,
  nextGust:  3.0,
  dir:       0.8,        // angle in XZ plane

  update(dt) {
    // Ease strength toward target
    this.strength += (this.target - this.strength) * 0.008;

    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      // Alternate calm breezes with proper gusts
      this.target   = rnd() < 0.42 ? rr(0.04, 0.10) : rr(0.45, 1.0);
      this.nextGust = rr(2.5, 6.5);
      if (this.target > 0.30) this.dir += rr(-0.55, 0.55);
    }
  },
};

const orbit = {
  theta:   CFG.THETA,   phi:   CFG.PHI,   radius:  CFG.RADIUS,
  tTheta:  CFG.THETA,   tPhi:  CFG.PHI,   tRadius: CFG.RADIUS,
  drag:    false,       lx:    0,          ly:      0,
};

renderer.domElement.addEventListener('mousedown', e => {
  orbit.drag = true;
  orbit.lx = e.clientX;  orbit.ly = e.clientY;
  document.body.style.cursor = 'grabbing';
});
window.addEventListener('mouseup', () => {
  orbit.drag = false;
  document.body.style.cursor = '';
});
window.addEventListener('mousemove', e => {
  if (!orbit.drag) return;
  orbit.tTheta -= (e.clientX - orbit.lx) * 0.007;
  orbit.tPhi    = clamp(orbit.tPhi - (e.clientY - orbit.ly) * 0.007, CFG.PHI_MIN, CFG.PHI_MAX);
  orbit.lx = e.clientX;  orbit.ly = e.clientY;
});
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  orbit.tRadius = clamp(orbit.tRadius + e.deltaY * 0.04, CFG.R_MIN, CFG.R_MAX);
}, { passive: false });

// Touch support
let lastPinch = 0;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    orbit.drag = true;
    orbit.lx = e.touches[0].clientX;  orbit.ly = e.touches[0].clientY;
  }
  else {
    orbit.drag = false;
    lastPinch  = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });
renderer.domElement.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && orbit.drag) {
    orbit.tTheta -= (e.touches[0].clientX - orbit.lx) * 0.007;
    orbit.tPhi    = clamp(orbit.tPhi - (e.touches[0].clientY - orbit.ly) * 0.007, CFG.PHI_MIN, CFG.PHI_MAX);
    orbit.lx = e.touches[0].clientX;  orbit.ly = e.touches[0].clientY;
  }
  else if (e.touches.length === 2) {
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    orbit.tRadius = clamp(orbit.tRadius * (lastPinch / d), CFG.R_MIN, CFG.R_MAX);
    lastPinch = d;
  }
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => { orbit.drag = false; });

flowerGroup.position.y = -5;   // start below frame — rises in on load
let risen   = false;
let prevT   = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t  = clock.getElapsedTime();
  const dt = t - prevT;
  prevT    = t;

  // ── Rise-in entrance (ease flower up from below) ──────────────────
  if (!risen) {
    flowerGroup.position.y += (0 - flowerGroup.position.y) * 0.025;
    if (Math.abs(flowerGroup.position.y) < 0.002) { flowerGroup.position.y = 0; risen = true; }
  }

  // ── Gentle romantic sway on entire flower ─────────────────────────
  const swayScale = 1.0 + Wind.strength * 1.6;
  flowerGroup.rotation.z = (Math.sin(t * 0.37) * 0.015 + Math.sin(t * 0.71) * 0.006) * swayScale;
  flowerGroup.rotation.x =  Math.sin(t * 0.26) * 0.007 * swayScale;

  // Subtle heartbeat-like living pulse (very subtle scale breath)
  const pulse = 1 + Math.sin(t * 1.20) * 0.003 + Math.sin(t * 2.40) * 0.001;
  flowerGroup.scale.setScalar(pulse);

  // ── Camera orbit ──────────────────────────────────────────────────
  if (!orbit.drag) orbit.tTheta += CFG.AUTO_ROT;
  orbit.theta  += (orbit.tTheta  - orbit.theta)  * CFG.DAMP;
  orbit.phi    += (orbit.tPhi    - orbit.phi)     * CFG.DAMP;
  orbit.radius += (orbit.tRadius - orbit.radius)  * CFG.DAMP;

  const sinP = Math.sin(orbit.phi);
  const cosP = Math.cos(orbit.phi);
  camera.position.set(
    orbit.radius * sinP * Math.sin(orbit.theta),
    orbit.radius * cosP,
    orbit.radius * sinP * Math.cos(orbit.theta)
  );
  camera.lookAt(0, 0.25, 0);

  // ── Wind update ───────────────────────────────────────────────────
  Wind.update(dt);

  // ── Individual petal breeze ───────────────────────────────────────
  // Each petal uses layered sine waves at slightly different frequencies
  // for organic, non-repetitive flutter. Wind exposure is directional —
  // petals facing the wind gust more than sheltered ones.
  petalData.forEach(pd => {
    const exposure  = 0.55 + 0.45 * Math.cos(pd.angle - Wind.dir);
    const gust      = Wind.strength * exposure;

    // Three overlapping sine waves per axis for complex flutter envelope
    const wX = Math.sin(t * pd.freqX * 2.1 + pd.phaseX) * 0.50
              + Math.sin(t * pd.freqX * 3.7 + pd.phaseX * 1.3) * 0.25
              + Math.sin(t * pd.freqX * 0.8 + pd.phaseX * 0.7) * 0.25;
    const wZ = Math.sin(t * pd.freqZ * 1.9 + pd.phaseZ) * 0.50
              + Math.sin(t * pd.freqZ * 3.1 + pd.phaseZ * 1.5) * 0.50;

    pd.mesh.rotation.x = pd.baseRX + wX * pd.breezeAmp * gust;
    pd.mesh.rotation.z = pd.baseRZ + wZ * pd.breezeAmp * gust * 0.6;
  });

  // ── Leaf sway ─────────────────────────────────────────────────────
  leafBreeze.forEach(lb => {
    lb.mesh.rotation.x = lb.baseRX + Math.sin(t * 0.88 + lb.phaseX) * 0.026 * Wind.strength;
    lb.mesh.rotation.z = lb.baseRZ + Math.sin(t * 0.68 + lb.phaseZ) * 0.042 * Wind.strength;
  });

  // ── Dust orbit ────────────────────────────────────────────────────
  dustData.forEach((d, i) => {
    d.angle += d.speed;
    d.y     += d.drift;
    if (d.y > 2.9) d.y = -2.2;

    // Heart-shaped XZ orbit
    const a = d.angle;
    const x = d.radius * Math.sin(a) * Math.cos(a);
    const z = d.radius * (0.5 * Math.sin(a) - 0.2 * Math.sin(2*a));

    dustPositions[i * 3]     = x;
    dustPositions[i * 3 + 1] = d.y;
    dustPositions[i * 3 + 2] = z;
  });
  dustPosAttr.needsUpdate = true;

  // ── Falling petals ────────────────────────────────────────────────
  fallingPetals.forEach(m => {
    const d = m.userData;
    d.y    += d.speedY;
    d.x    += d.driftX + Math.sin(t * 0.38 + d.phase) * 0.0018;
    d.z    += d.driftZ;
    d.rotX += d.rotSpX;
    d.rotZ += d.rotSpZ;

    if (d.y < -4.5) {
      d.y = rr(5, 9);
      d.x = rr(-5.5, 5.5);
      d.z = rr(-5.5, 5.5);
    }

    m.position.set(d.x, d.y, d.z);
    m.rotation.set(d.rotX, 0, d.rotZ);
    // Fade near the floor
    m.material.opacity = clamp((d.y + 4.5) * 0.20, 0, 0.72);
  });

  renderer.render(scene, camera);
}

animate();