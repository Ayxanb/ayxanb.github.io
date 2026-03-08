'use strict';

// ═══════════════════════════════════════════════════════════════════
//  CONFIG — all tuneable parameters in one place
// ═══════════════════════════════════════════════════════════════════
const CFG = Object.freeze({
  // Camera
  FOV:    55,
  NEAR:   0.01,
  FAR:    180,

  // Orbit defaults
  THETA:  0.45,
  PHI:    1.08,
  RADIUS: 6,

  // Orbit limits
  PHI_MIN:    0.08,
  PHI_MAX:    Math.PI * 0.82,
  RADIUS_MIN: 1.2,
  RADIUS_MAX: 9.0,

  // Feel
  AUTO_ROTATE_SPEED: 0.0015,
  DAMP:              0.09,
  RESTORE_DELAY:     5.0,

  // Scene
  BG_COLOR:    new THREE.Color(0x020008),
  FOG_DENSITY: 0.055,

  // Particles
  DUST_COUNT:   360,
  FALL_COUNT:   40,
  STAR_COUNT:  1200,
  NEBULA_COUNT:  22,

  // Spotlights — 3 lights equally spaced around the flower
  SPOT_RADIUS:  4.5,
  SPOT_HEIGHT:  5.5,
  SPOT_ANGLE:   0.28,
  SPOT_PENUMBRA:0.45,
  SPOT_DISTANCE:18,

  // Wind
  WIND_CALM_TARGET_MIN:  0.04,
  WIND_CALM_TARGET_MAX:  0.12,
  WIND_GUST_TARGET_MIN:  0.50,
  WIND_GUST_TARGET_MAX:  1.20,
  WIND_GUST_INTERVAL_MIN: 2.5,
  WIND_GUST_INTERVAL_MAX: 7.0,
});

// ═══════════════════════════════════════════════════════════════════
//  SCENE SETTINGS — runtime-togglable flags & values
// ═══════════════════════════════════════════════════════════════════
const Settings = {
  // Camera
  autoRotate:       true,
  restoreCamera:    true,
  // Visuals
  showDust:         true,
  showFallingPetals:true,
  showStars:        true,
  showNebula:       true,
  showGlow:         true,
  showFloor:        true,
  shadows:          true,
  // Atmosphere
  fogDensity:       CFG.FOG_DENSITY,   // 0 – 0.15
  exposure:         0.55,              // 0.1 – 1.5
  glowIntensity:    1.0,               // 0 – 2
  // Particles
  dustSize:         0.025,             // 0.01 – 0.08
  dustOpacity:      0.65,              // 0 – 1
  fallingOpacity:   0.70,              // 0 – 1
  starSize:         0.08,              // 0.02 – 0.25
  // Lighting
  keyIntensity:     3.2,               // 0 – 8
  ambientIntensity: 10,                // 0 – 30
  spotIntensity:    2.8,               // 0 – 8
  // Wind
  windScale:        1.0,               // 0 – 2
};

// ═══════════════════════════════════════════════════════════════════
//  THEME PRESETS
// ═══════════════════════════════════════════════════════════════════
const themeAccents = { crimson:'#cc1030', gold:'#cc8800', blush:'#f43f5e', ivory:'#f8e7c4', peach:'#fb923c' };
const THEMES = {
  crimson: {
    label:      'Crimson',
    petalHue:   0.95,
    petalSat:   0.65,
    keyLight:   '#fef5e7',
    rimLight:   0xd4623a,
    topLight:   0xe63946,
    spotColor:  0xc1121f,
    points:     ['#d9534f','#e8786f','#f4a46d','#c1121f','#e63946','#d4623a','#a4161a','#c9ada7'],
    fog:        new THREE.Color(0x1a0f0e),
    nebulaHue:  0.92,
    dustPalette:[
      [0.85,0.15,0.18],[0.95,0.35,0.20],[0.90,0.55,0.35],
      [0.70,0.10,0.15],[0.88,0.40,0.30],[0.65,0.08,0.12],
      [0.92,0.30,0.45],[0.78,0.05,0.25],
    ],
    fallingColor:    '#a4161a',
    fallingEmissive: new THREE.Color(0.15, 0.05, 0.08),
  },
  gold: {
    label:      'Gold',
    petalHue:   0.10,
    petalSat:   0.80,
    keyLight:   '#fef3c7',
    rimLight:   0xb45309,
    topLight:   0xd97706,
    spotColor:  0xa16207,
    points:     ['#ca8a04','#d97706','#f59e0b','#b45309','#dc2626','#a16207','#ea580c','#d97706'],
    fog:        new THREE.Color(0x1a0f00),
    nebulaHue:  0.09,
    dustPalette:[
      [0.95,0.60,0.10],[0.90,0.50,0.15],[0.98,0.75,0.25],
      [0.85,0.40,0.08],[0.92,0.65,0.30],[0.78,0.38,0.10],
      [0.95,0.55,0.20],[0.88,0.70,0.15],
    ],
    fallingColor:    '#a16207',
    fallingEmissive: new THREE.Color(0.25, 0.15, 0.05),
  },
  blush: {
    label:      'Blush Pink',
    petalHue:   0.97,
    petalSat:   0.45,
    keyLight:   '#fff1f2',
    rimLight:   0xf472b6,
    topLight:   0xfb7185,
    spotColor:  0xe11d48,
    points:     ['#fda4af','#fb7185','#f472b6','#ec4899','#f9a8d4','#fda4af','#e11d48','#f472b6'],
    fog:        new THREE.Color(0x1a0f14),
    nebulaHue:  0.97,
    dustPalette:[
      [0.95,0.35,0.55],[0.92,0.25,0.60],[0.90,0.40,0.50],
      [0.85,0.30,0.65],[0.88,0.20,0.70],[0.80,0.15,0.60],
      [0.93,0.45,0.55],[0.87,0.30,0.70],
    ],
    fallingColor:'#ec4899',
    fallingEmissive:new THREE.Color(0.15,0.05,0.08),
  },
  ivory: {
    label:      'Ivory',
    petalHue:   0.12,
    petalSat:   0.15,
    keyLight:   '#ffffff',
    rimLight:   0xe7d8b1,
    topLight:   0xf5e6c8,
    spotColor:  0xd6c4a1,
    points:     ['#f8f4e6','#f1ead7','#ede3c6','#e7d8b1','#f5e6c8','#efe2b8','#f1ead7','#ede3c6'],
    fog:        new THREE.Color(0x181512),
    nebulaHue:  0.12,
    dustPalette:[
      [0.95,0.15,0.80],[0.90,0.10,0.85],[0.92,0.12,0.78],
      [0.88,0.08,0.88],[0.96,0.18,0.75],[0.89,0.10,0.82],
      [0.94,0.15,0.80],[0.90,0.12,0.86],
    ],
    fallingColor:'#e7d8b1',
    fallingEmissive:new THREE.Color(0.12,0.10,0.08),
  },
  peach: {
    label:      'Peach',
    petalHue:   0.06,
    petalSat:   0.65,
    keyLight:   '#f0914e',
    rimLight:   0xfb923c,
    topLight:   0xf97316,
    spotColor:  0xea580c,
    points:     ['#fdba74','#fb923c','#f97316','#f59e0b','#fb923c','#fdba74','#ea580c','#f97316'],
    fog:        new THREE.Color(0x1a120e),
    nebulaHue:  0.06,
    dustPalette:[
      [0.95,0.55,0.30],[0.90,0.45,0.25],[0.92,0.60,0.35],
      [0.88,0.40,0.20],[0.94,0.65,0.40],[0.85,0.38,0.18],
      [0.96,0.50,0.28],[0.90,0.60,0.35],
    ],
    fallingColor:'#ea580c',
    fallingEmissive:new THREE.Color(0.20,0.10,0.05),
  },
};
let activeTheme = 'crimson';

// ═══════════════════════════════════════════════════════════════════
//  MATH HELPERS
// ═══════════════════════════════════════════════════════════════════
const clamp       = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp        = (a, b, t)   => a + (b - a) * clamp(t, 0, 1);
const smstep      = (a, b, x)   => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const rand        = ()           => Math.random();
const randBetween = (a, b)       => a + rand() * (b - a);

// ═══════════════════════════════════════════════════════════════════
//  RENDERER
// ═══════════════════════════════════════════════════════════════════
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled   = Settings.shadows;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = Settings.exposure;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ═══════════════════════════════════════════════════════════════════
//  SCENE & CAMERA
// ═══════════════════════════════════════════════════════════════════
const scene  = new THREE.Scene();
scene.background = CFG.BG_COLOR;
scene.fog        = new THREE.FogExp2(new THREE.Color(0x08001a), Settings.fogDensity);

const camera = new THREE.PerspectiveCamera(CFG.FOV, innerWidth / innerHeight, CFG.NEAR, CFG.FAR);

// ═══════════════════════════════════════════════════════════════════
//  LIGHTS
// ═══════════════════════════════════════════════════════════════════
const lights = {};

function setupLights() {
  const theme = THEMES[activeTheme];

  lights.ambient = new THREE.AmbientLight('#100008', Settings.ambientIntensity);
  scene.add(lights.ambient);

  lights.key = new THREE.DirectionalLight(theme.keyLight, Settings.keyIntensity);
  lights.key.position.set(4, 10, 3);
  lights.key.castShadow = true;
  lights.key.shadow.mapSize.setScalar(2048);
  lights.key.shadow.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 25);
  scene.add(lights.key);

  lights.fill = new THREE.DirectionalLight(0x6040ff, 1.1);
  lights.fill.position.set(-5, 3, -3);
  scene.add(lights.fill);

  lights.rim = new THREE.DirectionalLight(theme.rimLight, 3.2);
  lights.rim.position.set(-1, 2, -7);
  scene.add(lights.rim);

  lights.top = new THREE.DirectionalLight(theme.topLight, 1.4);
  lights.top.position.set(0, 8, 0);
  scene.add(lights.top);

  lights.bounce = new THREE.PointLight(theme.topLight, 1.2, 8);
  lights.bounce.position.set(0, -3, 0);
  scene.add(lights.bounce);

  const ptDefs = [
    { i:0, dist:14, pos:[-2.5, 2.5, 2.0] },
    { i:1, dist:10, pos:[ 2.2, 4.0,-2.5] },
    { i:2, dist: 7, pos:[ 0.0, 0.7, 1.8] },
    { i:3, dist:12, pos:[ 1.5,-0.5, 0.5] },
    { i:4, dist: 6, pos:[-1.0, 1.5,-1.2] },
    { i:5, dist: 8, pos:[ 0.0,-3.5, 0.5] },
    { i:6, dist: 9, pos:[-3.0, 0.5,-1.0] },
    { i:7, dist: 6, pos:[ 3.0, 1.0, 1.5] },
  ];
  const intensities = [3.0, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 0.7];

  lights.points = ptDefs.map(({ i, dist, pos }) => {
    const pl = new THREE.PointLight(theme.points[i], intensities[i], dist);
    pl.position.set(...pos);
    scene.add(pl);
    return pl;
  });

  setupSpotlights();
}

function setupSpotlights() {
  const theme = THEMES[activeTheme];
  lights.spots = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const spot  = new THREE.SpotLight(
      theme.spotColor, Settings.spotIntensity,
      CFG.SPOT_DISTANCE, CFG.SPOT_ANGLE, CFG.SPOT_PENUMBRA, 1.4
    );
    spot.position.set(
      Math.sin(angle) * CFG.SPOT_RADIUS,
      CFG.SPOT_HEIGHT,
      Math.cos(angle) * CFG.SPOT_RADIUS
    );
    spot.target.position.set(0, 0.25, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.setScalar(512);
    scene.add(spot);
    scene.add(spot.target);
    lights.spots.push(spot);
  }
}

setupLights();

function updateLightTheme() {
  const theme = THEMES[activeTheme];
  lights.key.color.set(theme.keyLight);
  lights.rim.color.set(theme.rimLight);
  lights.top.color.set(theme.topLight);
  lights.bounce.color.set(theme.topLight);
  lights.points.forEach((pl, i) => pl.color.set(theme.points[i]));
  lights.spots.forEach(s => s.color.set(theme.spotColor));
  scene.fog.color.copy(theme.fog);
}

// ═══════════════════════════════════════════════════════════════════
//  ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════
const envGroup    = new THREE.Group();
const nebulaGroup = new THREE.Group();
scene.add(envGroup);
scene.add(nebulaGroup);

// Keep references to things we need to toggle
const envRefs = { floor: null, starPoints: null, twinklePoints: null };

function buildEnvironment() {
  const theme = THEMES[activeTheme];

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 80),
    new THREE.MeshStandardMaterial({ color: 0x070015, roughness: 0.96, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = -3.2;
  floor.receiveShadow = true;
  envGroup.add(floor);
  envRefs.floor = floor;

  const sheen = new THREE.Mesh(
    new THREE.RingGeometry(0.0, 3.5, 64),
    new THREE.MeshBasicMaterial({
      color: theme.topLight, side: THREE.DoubleSide,
      transparent: true, opacity: 0.07,
    })
  );
  sheen.rotation.x = -Math.PI * 0.5;
  sheen.position.y = -3.19;
  envGroup.add(sheen);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.5, 18, 72),
    new THREE.MeshBasicMaterial({
      color: 0x1a0018, side: THREE.DoubleSide, transparent: true, opacity: 0.15,
    })
  );
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = -3.18;
  envGroup.add(ring);

  // Starfield
  const starPos = new Float32Array(CFG.STAR_COUNT * 3);
  const starCol = new Float32Array(CFG.STAR_COUNT * 3);
  for (let i = 0; i < CFG.STAR_COUNT; i++) {
    const theta = rand() * Math.PI * 2;
    const phi   = Math.acos(2 * rand() - 1);
    const r     = randBetween(28, 70);
    starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3+1] = r * Math.cos(phi);
    starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    const hue = rand() < 0.15 ? randBetween(0.07, 0.12) : randBetween(0.55, 0.75);
    const sat = rand() < 0.4  ? 0 : randBetween(0.3, 0.8);
    const lum = randBetween(0.6, 1.5);
    const c   = new THREE.Color().setHSL(hue, sat, lum);
    starCol[i*3] = c.r; starCol[i*3+1] = c.g; starCol[i*3+2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: Settings.starSize, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  envGroup.add(starPoints);
  envRefs.starPoints = starPoints;
  envRefs.starMat    = starMat;

  // Twinkling layer
  const twinklePos = new Float32Array(400 * 3);
  const twinkleCol = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const theta = rand() * Math.PI * 2;
    const phi   = Math.acos(2 * rand() - 1);
    const r     = randBetween(18, 28);
    twinklePos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    twinklePos[i*3+1] = r * Math.cos(phi);
    twinklePos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    twinkleCol[i*3] = 1; twinkleCol[i*3+1] = 0.95; twinkleCol[i*3+2] = 0.85;
  }
  const twinkleGeo = new THREE.BufferGeometry();
  twinkleGeo.setAttribute('position', new THREE.BufferAttribute(twinklePos, 3));
  twinkleGeo.setAttribute('color',    new THREE.BufferAttribute(twinkleCol, 3));
  const twinkleMat    = new THREE.PointsMaterial({
    size: 0.22, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true,
  });
  const twinklePoints = new THREE.Points(twinkleGeo, twinkleMat);
  envGroup.add(twinklePoints);
  envGroup.userData.twinkleMat    = twinkleMat;
  envGroup.userData.twinklePoints = twinklePoints;
  envRefs.twinklePoints = twinklePoints;

  // Mid-field colour cloud
  const pCount = 200;
  const pPos   = new Float32Array(pCount * 3);
  const pCol   = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const angle  = rand() * Math.PI * 2;
    const radius = randBetween(3.5, 14);
    pPos[i*3]   = Math.cos(angle) * radius;
    pPos[i*3+1] = randBetween(-4.0, 6.5);
    pPos[i*3+2] = Math.sin(angle) * radius;
    const c = new THREE.Color().setHSL(theme.nebulaHue + rand() * 0.10, 0.80, randBetween(0.35, 0.65));
    pCol[i*3] = c.r; pCol[i*3+1] = c.g; pCol[i*3+2] = c.b;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  bgGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
  envGroup.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({
    size: 0.055, vertexColors: true, transparent: true, opacity: 0.40, sizeAttenuation: true,
  })));

  buildNebula(theme);

  // Apply initial visibility
  applyStarVisibility();
  applyFloorVisibility();
}

function buildNebula(theme) {
  while (nebulaGroup.children.length) nebulaGroup.remove(nebulaGroup.children[0]);
  for (let i = 0; i < CFG.NEBULA_COUNT; i++) {
    const angle   = (i / CFG.NEBULA_COUNT) * Math.PI * 2 + rand() * 0.4;
    const dist    = randBetween(8, 22);
    const hOffset = randBetween(-0.06, 0.06);
    const lum     = randBetween(0.06, 0.16);
    const size    = randBetween(2.5, 7.0);
    const opacity = randBetween(0.025, 0.075);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(theme.nebulaHue + hOffset, 0.75, lum),
        transparent: true, opacity, depthWrite: false,
      })
    );
    mesh.position.set(Math.cos(angle) * dist, randBetween(-5, 4), Math.sin(angle) * dist);
    nebulaGroup.add(mesh);
  }
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 12, 10),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(theme.nebulaHue, 0.8, 0.18),
      transparent: true, opacity: 0.06, depthWrite: false,
    })
  );
  halo.position.set(0, 0.3, -1.5);
  nebulaGroup.add(halo);
  nebulaGroup.visible = Settings.showNebula;
}

buildEnvironment();

// ─── Visibility helpers ─────────────────────────────────────────────
function applyStarVisibility() {
  if (envRefs.starPoints)   envRefs.starPoints.visible   = Settings.showStars;
  if (envRefs.twinklePoints) envRefs.twinklePoints.visible = Settings.showStars;
}

function applyFloorVisibility() {
  if (envRefs.floor) envRefs.floor.visible = Settings.showFloor;
}

// ═══════════════════════════════════════════════════════════════════
//  MATERIALS
// ═══════════════════════════════════════════════════════════════════
function makePetalMaterial(layerT) {
  const theme = THEMES[activeTheme];
  return new THREE.MeshStandardMaterial({
    color:        new THREE.Color().setHSL(theme.petalHue, theme.petalSat, 0.20 + layerT * 0.14),
    roughness:    0.22 + layerT * 0.10,
    metalness:    0.04,
    side:         THREE.DoubleSide,
    vertexColors: true,
    transparent:  true,
    opacity:      0.975,
    emissive:     new THREE.Color().setHSL(theme.petalHue, 0.65, 0.04 + layerT * 0.03),
  });
}

const Materials = {
  stem:   new THREE.MeshStandardMaterial({ color: '#1e5012', roughness: 0.76 }),
  leaf:   new THREE.MeshStandardMaterial({ color: '#1a5510', roughness: 0.68, side: THREE.DoubleSide }),
  sepal:  new THREE.MeshStandardMaterial({ color: '#163a0c', roughness: 0.72, side: THREE.DoubleSide }),
  stamen: new THREE.MeshStandardMaterial({ color: '#e8c840', roughness: 0.55, emissive: new THREE.Color(0.10,0.06,0) }),
  anther: new THREE.MeshStandardMaterial({ color: '#b08010', roughness: 0.45, emissive: new THREE.Color(0.12,0.05,0) }),
  pistil: new THREE.MeshStandardMaterial({ color: '#7aaa25', roughness: 0.55 }),
  stigma: new THREE.MeshStandardMaterial({ color: '#9dc040', roughness: 0.40, emissive: new THREE.Color(0.04,0.08,0) }),
};

const petalMaterials = [];

function makeFallingMaterial() {
  const theme = THEMES[activeTheme];
  return new THREE.MeshStandardMaterial({
    color:       theme.fallingColor,
    roughness:   0.45,
    side:        THREE.DoubleSide,
    transparent: true,
    opacity:     Settings.fallingOpacity,
    emissive:    theme.fallingEmissive,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════════
function buildBufferGeometry(indices, positions, uvs, colors) {
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildGridIndices(segsU, segsV) {
  const indices = [];
  for (let j = 0; j < segsV; j++) {
    for (let i = 0; i < segsU; i++) {
      const a = j*(segsU+1)+i, b=a+1, c=a+(segsU+1), d=c+1;
      indices.push(a,b,c, b,d,c);
    }
  }
  return indices;
}

// ═══════════════════════════════════════════════════════════════════
//  PETAL GEOMETRY
// ═══════════════════════════════════════════════════════════════════
function buildPetalGeometry(layerT) {
  const segsU = 28, segsV = 36;
  const vCount = (segsU+1)*(segsV+1);
  const positions = new Float32Array(vCount*3);
  const uvs       = new Float32Array(vCount*2);
  const colors    = new Float32Array(vCount*3);

  const COLOR_BASE = [0.08,0.008,0.010];
  const COLOR_DEEP = [0.42,0.022,0.050];
  const COLOR_MID  = [0.70,0.055,0.075];
  const COLOR_TIP  = [0.82,0.110,0.110];
  const COLOR_BOWL = [0.58,0.068,0.100];
  const COLOR_VEIN = [0.25,0.013,0.025];

  let pi=0, ui=0, ci=0;

  for (let j=0; j<=segsV; j++) {
    const v = j/segsV;
    const baseWidth = smstep(0.0,0.22,v)
      * Math.pow(Math.sin(v*Math.PI),0.30)
      * (1.0 - smstep(0.82,1.0,v)*0.09)
      * 0.56;

    for (let i=0; i<=segsU; i++) {
      const u  = i/segsU;
      const uc = u*2-1;
      const ucA = Math.abs(uc);

      const petalWidth = (baseWidth - smstep(0.83,1.0,v)*Math.max(0,1-ucA*8)*0.038)*(1+layerT*0.04);
      const cupCurve   = uc*uc*(0.44-layerT*0.22)*Math.sin(v*Math.PI*0.90);
      const archBend   = Math.sin(v*Math.PI)*(0.05+layerT*0.17);
      const tipCurlT   = smstep(0.7,1.0,v);
      const tipCurl    = tipCurlT*tipCurlT*(0.035+layerT*0.30);
      const edgeFactor = Math.max(0,(ucA-0.50)/0.50);
      const edgeVel    = Math.sin(Math.max(0,v-0.12)*Math.PI*0.78);
      const edgeRoll   = Math.pow(edgeFactor,1.4)*(0.08+layerT*0.52)*edgeVel;
      const veinBlend  = Math.max(0,1-ucA*17);
      const veinRidge  = veinBlend*0.015*Math.sin(v*Math.PI*0.90)*smstep(0.0,0.22,v);
      const veinTex    = Math.sin(ucA*13+v*8)*0.0038*Math.max(0,1-ucA*1.2)*Math.sin(v*Math.PI);
      const ruffle     = ucA>0.46 ? Math.sin(v*Math.PI*7.5+uc*11.0)*0.0065*ucA : 0;
      const wrapAngle  = Math.max(0,0.36-layerT)*2.65*Math.pow(v,1.35);
      const pz         = cupCurve+archBend-tipCurl+ruffle-edgeRoll-veinRidge+veinTex;

      positions[pi++] = uc*petalWidth;
      positions[pi++] = v*Math.cos(wrapAngle)-pz*Math.sin(wrapAngle);
      positions[pi++] = -(v*Math.sin(wrapAngle)+pz*Math.cos(wrapAngle));

      uvs[ui++] = u; uvs[ui++] = v;

      const t0 = smstep(0.00,0.26,v);
      const t1 = smstep(0.20,0.68,v);
      const t2 = smstep(0.60,0.96,v)*(0.55+layerT*0.45);

      let r = lerp(COLOR_BASE[0],COLOR_DEEP[0],t0);
      let g = lerp(COLOR_BASE[1],COLOR_DEEP[1],t0);
      let b = lerp(COLOR_BASE[2],COLOR_DEEP[2],t0);
      r=lerp(r,COLOR_MID[0],t1); g=lerp(g,COLOR_MID[1],t1); b=lerp(b,COLOR_MID[2],t1);
      r=lerp(r,COLOR_TIP[0],t2); g=lerp(g,COLOR_TIP[1],t2); b=lerp(b,COLOR_TIP[2],t2);

      const bowl = Math.max(0,1-ucA*3.5)*smstep(0.18,0.65,v)*(1-layerT*0.38);
      r=lerp(r,COLOR_BOWL[0],bowl*0.55); g=lerp(g,COLOR_BOWL[1],bowl*0.55); b=lerp(b,COLOR_BOWL[2],bowl*0.55);

      const vein = (veinBlend*0.55+Math.max(0,Math.sin(ucA*10-0.5))*0.12)*smstep(0.10,0.42,v);
      r=lerp(r,COLOR_VEIN[0],vein*0.50); g=lerp(g,COLOR_VEIN[1],vein*0.50); b=lerp(b,COLOR_VEIN[2],vein*0.50);

      const edgeDim = smstep(0.82,1.0,ucA)*0.28;
      colors[ci++] = r*(1-edgeDim);
      colors[ci++] = g*(1-edgeDim);
      colors[ci++] = b*(1-edgeDim);
    }
  }
  return buildBufferGeometry(buildGridIndices(segsU,segsV), positions, uvs, colors);
}

// ═══════════════════════════════════════════════════════════════════
//  LEAF / SEPAL GEOMETRY
// ═══════════════════════════════════════════════════════════════════
function buildLeafGeometry() {
  const segsU=10, segsV=18;
  const vCount=(segsU+1)*(segsV+1);
  const positions=new Float32Array(vCount*3), uvs=new Float32Array(vCount*2);
  let pi=0, ui=0;
  for (let j=0; j<=segsV; j++) {
    const v=j/segsV;
    const hw=(0.055+0.27*Math.pow(Math.sin(v*Math.PI),0.65))*0.5;
    for (let i=0; i<=segsU; i++) {
      const u=i/segsU, uc=u*2-1, ucA=Math.abs(uc);
      positions[pi++]=uc*hw;
      positions[pi++]=v*0.92;
      positions[pi++]=Math.sin(v*Math.PI)*0.065-uc*uc*0.042*Math.sin(v*Math.PI*0.80)
        +Math.max(0,1-ucA*6)*0.016*Math.sin(v*Math.PI*0.85);
      uvs[ui++]=u; uvs[ui++]=v;
    }
  }
  return buildBufferGeometry(buildGridIndices(segsU,segsV), positions, uvs, null);
}

function buildSepalGeometry() {
  const segsU=6, segsV=14;
  const vCount=(segsU+1)*(segsV+1);
  const positions=new Float32Array(vCount*3), uvs=new Float32Array(vCount*2);
  let pi=0, ui=0;
  for (let j=0; j<=segsV; j++) {
    const v=j/segsV;
    const hw=(0.022+0.14*Math.pow(Math.sin(v*Math.PI*0.86),1.25))*0.5;
    for (let i=0; i<=segsU; i++) {
      const u=i/segsU, uc=u*2-1;
      positions[pi++]=uc*hw;
      positions[pi++]=v*0.73;
      positions[pi++]=Math.sin((v+0.08)*Math.PI*0.84)*0.085-uc*uc*0.048;
      uvs[ui++]=u; uvs[ui++]=v;
    }
  }
  return buildBufferGeometry(buildGridIndices(segsU,segsV), positions, uvs, null);
}

// ═══════════════════════════════════════════════════════════════════
//  STAMENS & PISTIL
// ═══════════════════════════════════════════════════════════════════
function buildStamensAndPistil(parent) {
  const filGeo    = new THREE.CylinderGeometry(0.0042,0.0028,0.20,4,1);
  const antherGeo = new THREE.SphereGeometry(0.011,6,4);
  for (let i=0; i<40; i++) {
    const angle = (i/40)*Math.PI*2+rand()*0.22;
    const r     = randBetween(0.032,0.092);
    const h     = randBetween(0.12,0.23);
    const tilt  = randBetween(0.04,0.16);
    const fil   = new THREE.Mesh(filGeo, Materials.stamen);
    fil.position.set(Math.cos(angle)*r, h*0.5, Math.sin(angle)*r);
    fil.rotation.z = Math.cos(angle)*tilt;
    fil.rotation.x = Math.sin(angle)*tilt;
    parent.add(fil);
    const anther = new THREE.Mesh(antherGeo, Materials.anther);
    anther.position.set(Math.cos(angle)*(r+tilt*0.08), h, Math.sin(angle)*(r+tilt*0.08));
    parent.add(anther);
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.042,10,7,0,Math.PI*2,0,Math.PI*0.54),
    Materials.pistil
  );
  dome.position.y = 0.038;
  parent.add(dome);
  const stigmaGeo = new THREE.SphereGeometry(0.010,5,4);
  for (let i=0; i<5; i++) {
    const a = (i/5)*Math.PI*2;
    const s = new THREE.Mesh(stigmaGeo, Materials.stigma);
    s.position.set(Math.cos(a)*0.024, 0.115, Math.sin(a)*0.024);
    parent.add(s);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FLOWER GROUP
// ═══════════════════════════════════════════════════════════════════
const flowerGroup    = new THREE.Group();
const petalBreezeData = [];
const leafBreezeData  = [];
scene.add(flowerGroup);

function buildFlower() {
  flowerGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3( 0.00, 0.00, 0.00),
        new THREE.Vector3( 0.06,-0.55, 0.03),
        new THREE.Vector3(-0.05,-1.30,-0.04),
        new THREE.Vector3( 0.04,-2.05, 0.02),
        new THREE.Vector3( 0.00,-2.95, 0.00),
      ]),
      36, 0.038, 10, false
    ),
    Materials.stem
  ));

  [[-1.02,1],[-1.55,-1],[-2.05,1],[-2.52,-1]].forEach(([y,side]) => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.013,0.10,5), Materials.stem);
    t.rotation.z = side*1.20;
    t.position.set(side*0.047, y, 0);
    flowerGroup.add(t);
  });

  const leafGeo = buildLeafGeometry();
  [{y:-1.42,ry:-0.60,rx:-0.48,side:-1},{y:-2.0,ry:0.1,rx:0.5,side:0}].forEach(({y,ry,rx,side}) => {
    const leaf   = new THREE.Mesh(leafGeo, Materials.leaf);
    const baseRX = rx, baseRZ = side*0.28;
    leaf.position.set(side*0.05, y, 0);
    leaf.rotation.set(baseRX, ry, baseRZ);
    leaf.scale.setScalar(randBetween(0.82,1.00));
    leaf.castShadow = true;
    flowerGroup.add(leaf);
    leafBreezeData.push({ mesh:leaf, baseRX, baseRZ, phaseX:rand()*Math.PI*2, phaseZ:rand()*Math.PI*2 });
  });

  const sepalGeo = buildSepalGeometry();
  for (let s=0; s<5; s++) {
    const sepal = new THREE.Mesh(sepalGeo, Materials.sepal);
    sepal.rotation.order = 'YXZ';
    sepal.rotation.y = (s/5)*Math.PI*2+0.30;
    sepal.rotation.x = -0.50;
    sepal.position.y  = -0.10;
    flowerGroup.add(sepal);
  }

  flowerGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.10,14,12),
    new THREE.MeshStandardMaterial({ color:0x254a14, roughness:0.65 })
  ));

  const layerDefs = [
    { count: 5,  r:0.000, h: 0.22, tilt: 0.28, scale:0.26 },
    { count: 6,  r:0.020, h: 0.17, tilt: 0.06, scale:0.36 },
    { count: 8,  r:0.040, h: 0.12, tilt:-0.28, scale:0.50 },
    { count:10,  r:0.070, h: 0.06, tilt:-0.56, scale:0.67 },
    { count:12,  r:0.100, h: 0.01, tilt:-0.86, scale:0.84 },
    { count:14,  r:0.140, h:-0.04, tilt:-1.15, scale:1.00 },
  ];

  layerDefs.forEach((def, layerIndex) => {
    const layerT   = layerIndex / (layerDefs.length - 1);
    const petalGeo = buildPetalGeometry(layerT);
    const mat      = makePetalMaterial(layerT);
    petalMaterials.push(mat);
    const breezeAmp = 0.0008 + layerT * 0.03;

    for (let i=0; i<def.count; i++) {
      const angle = (i/def.count)*Math.PI*2 + layerIndex*0.618;
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.castShadow = true;
      petal.rotation.order = 'YXZ';
      const baseRX = def.tilt + randBetween(-0.044,0.044);
      const baseRZ = randBetween(-0.024,0.024);
      petal.rotation.set(baseRX, angle, baseRZ);
      petal.position.set(
        Math.sin(angle)*def.r,
        def.h + randBetween(-0.008,0.008),
        Math.cos(angle)*def.r
      );
      petal.scale.setScalar(def.scale * randBetween(0.94,1.08));
      flowerGroup.add(petal);
      petalBreezeData.push({ mesh:petal, baseRX, baseRZ, breezeAmp, angle,
        phaseX:rand()*Math.PI*2, phaseZ:rand()*Math.PI*2,
        freqX:randBetween(0.48,1.06), freqZ:randBetween(0.36,0.82) });
    }
  });

  buildStamensAndPistil(flowerGroup);
}
buildFlower();

// ═══════════════════════════════════════════════════════════════════
//  BLOOM GLOW OVERLAYS
// ═══════════════════════════════════════════════════════════════════
const glowGroup = new THREE.Group();
scene.add(glowGroup);

function buildGlowOverlays() {
  while (glowGroup.children.length) glowGroup.remove(glowGroup.children[0]);
  const theme = THEMES[activeTheme];
  [
    { r: 0.18, opacity: 0.18 },
    { r: 0.40, opacity: 0.09 },
    { r: 0.75, opacity: 0.045 },
    { r: 1.30, opacity: 0.022 },
  ].forEach(({ r, opacity }) => {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 10),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(theme.petalHue, 0.90, 0.55),
        transparent: true, opacity: opacity * Settings.glowIntensity, depthWrite: false, side: THREE.FrontSide,
      })
    );
    glow.position.set(0, 0.15, 0);
    glowGroup.add(glow);
  });
  glowGroup.visible = Settings.showGlow;
}
buildGlowOverlays();

// ═══════════════════════════════════════════════════════════════════
//  DUST PARTICLES
// ═══════════════════════════════════════════════════════════════════
const dustPositions = new Float32Array(CFG.DUST_COUNT * 3);
const dustColors    = new Float32Array(CFG.DUST_COUNT * 3);

const dustParticles = Array.from({ length: CFG.DUST_COUNT }, (_, i) => {
  const angle  = rand() * Math.PI * 2;
  const radius = randBetween(0.6, 3.8);
  const y      = randBetween(-2.2, 2.6);
  const theme  = THEMES[activeTheme];
  const c      = theme.dustPalette[Math.floor(rand() * theme.dustPalette.length)];

  dustPositions[i*3]   = Math.cos(angle) * radius;
  dustPositions[i*3+1] = y;
  dustPositions[i*3+2] = Math.sin(angle) * radius;
  dustColors[i*3]   = c[0];
  dustColors[i*3+1] = c[1];
  dustColors[i*3+2] = c[2];

  return { angle, radius, y, speed: randBetween(0.00025,0.00095), drift: randBetween(0.00006,0.00022) };
});

const dustPositionAttr = new THREE.BufferAttribute(dustPositions, 3);
dustPositionAttr.setUsage(THREE.DynamicDrawUsage);
const dustColorAttr = new THREE.BufferAttribute(dustColors, 3);
dustColorAttr.setUsage(THREE.DynamicDrawUsage);

const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', dustPositionAttr);
dustGeo.setAttribute('color',    dustColorAttr);
const dustMat = new THREE.PointsMaterial({
  size: Settings.dustSize, vertexColors: true, transparent: true, opacity: Settings.dustOpacity, sizeAttenuation: true,
});
const dustPoints = new THREE.Points(dustGeo, dustMat);
scene.add(dustPoints);

function refreshDustColors() {
  const theme = THEMES[activeTheme];
  dustParticles.forEach((_, i) => {
    const c = theme.dustPalette[Math.floor(rand() * theme.dustPalette.length)];
    dustColors[i*3] = c[0]; dustColors[i*3+1] = c[1]; dustColors[i*3+2] = c[2];
  });
  dustColorAttr.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════════
//  FALLING PETALS
// ═══════════════════════════════════════════════════════════════════
const fallingPetalGeo = (() => {
  const geo = new THREE.PlaneGeometry(0.13, 0.20, 4, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.sin(pos.getY(i)*5.5 + pos.getX(i)*3.5)*0.022 + Math.sin(pos.getX(i)*8)*0.010);
  }
  geo.computeVertexNormals();
  return geo;
})();

const fallingPetals = Array.from({ length: CFG.FALL_COUNT }, () => {
  const mesh = new THREE.Mesh(fallingPetalGeo, makeFallingMaterial());
  mesh.userData = {
    x: randBetween(-5.5,5.5), y: randBetween(2.0,9.0), z: randBetween(-5.5,5.5),
    speedY:  -randBetween(0.004,0.009),
    rotX:    rand()*Math.PI*2, rotZ: rand()*Math.PI*2,
    rotSpX:  randBetween(-0.020,0.020), rotSpZ: randBetween(-0.013,0.013),
    driftX:  randBetween(-0.003,0.003), driftZ: randBetween(-0.002,0.002),
    phase:   rand()*Math.PI*2,
  };
  mesh.visible = Settings.showFallingPetals;
  scene.add(mesh);
  return mesh;
});

function refreshFallingPetalColors() {
  const mat = makeFallingMaterial();
  fallingPetals.forEach(m => {
    m.material.color.set(mat.color);
    m.material.emissive.copy(mat.emissive);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  WIND SYSTEM
// ═══════════════════════════════════════════════════════════════════
const Wind = {
  strength:  0,
  target:    0.12,
  nextGust:  3.0,
  direction: 0.8,

  update(dt) {
    this.strength += (this.target * Settings.windScale - this.strength) * 0.008;
    this.nextGust -= dt;
    if (this.nextGust <= 0) {
      const calm  = rand() < 0.42;
      this.target = calm
        ? randBetween(CFG.WIND_CALM_TARGET_MIN, CFG.WIND_CALM_TARGET_MAX)
        : randBetween(CFG.WIND_GUST_TARGET_MIN, CFG.WIND_GUST_TARGET_MAX);
      this.nextGust = randBetween(CFG.WIND_GUST_INTERVAL_MIN, CFG.WIND_GUST_INTERVAL_MAX);
      if (this.target > 0.30) this.direction += randBetween(-0.55, 0.55);
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
//  CAMERA PRESETS
// ═══════════════════════════════════════════════════════════════════
const CAM_PRESETS = {
  default:  { theta: CFG.THETA,   phi: CFG.PHI,       radius: CFG.RADIUS },
  top:      { theta: CFG.THETA,   phi: 0.14,           radius: 4.5 },
  side:     { theta: Math.PI*0.5, phi: Math.PI*0.5,    radius: 5.5 },
  close:    { theta: CFG.THETA,   phi: 1.25,           radius: 2.2 },
  front:    { theta: 2.3,         phi: 1.45,           radius: 7.5 },
};

function flyToPreset(name) {
  const p = CAM_PRESETS[name];
  if (!p) return;
  orbit.targetTheta  = p.theta;
  orbit.targetPhi    = p.phi;
  orbit.targetRadius = p.radius;
  markCameraActivity();
}

// ═══════════════════════════════════════════════════════════════════
//  ORBIT CONTROLS
// ═══════════════════════════════════════════════════════════════════
const orbit = {
  theta:  CFG.THETA, phi:  CFG.PHI,  radius:  CFG.RADIUS,
  targetTheta: CFG.THETA, targetPhi: CFG.PHI, targetRadius: CFG.RADIUS,
  isDragging: false, lastX:0, lastY:0, lastActivity: -999,
};

function markCameraActivity() { orbit.lastActivity = performance.now() / 1000; }

renderer.domElement.addEventListener('mousedown', e => {
  orbit.isDragging = true;
  orbit.lastX = e.clientX; orbit.lastY = e.clientY;
  document.body.classList.add('grabbing');
  markCameraActivity();
});
window.addEventListener('mouseup', () => {
  orbit.isDragging = false;
  document.body.classList.remove('grabbing');
});
window.addEventListener('mousemove', e => {
  if (!orbit.isDragging) return;
  orbit.targetTheta -= (e.clientX - orbit.lastX) * 0.007;
  orbit.targetPhi    = clamp(orbit.targetPhi - (e.clientY - orbit.lastY) * 0.007, CFG.PHI_MIN, CFG.PHI_MAX);
  orbit.lastX = e.clientX; orbit.lastY = e.clientY;
  markCameraActivity();
});
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  orbit.targetRadius = clamp(orbit.targetRadius + e.deltaY * 0.04, CFG.RADIUS_MIN, CFG.RADIUS_MAX);
  markCameraActivity();
}, { passive: false });

let lastPinchDist = 0;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    orbit.isDragging = true;
    orbit.lastX = e.touches[0].clientX; orbit.lastY = e.touches[0].clientY;
  } else {
    orbit.isDragging = false;
    lastPinchDist = Math.hypot(
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
    orbit.lastX = e.touches[0].clientX; orbit.lastY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    orbit.targetRadius = clamp(orbit.targetRadius * (lastPinchDist / dist), CFG.RADIUS_MIN, CFG.RADIUS_MAX);
    lastPinchDist = dist;
  }
  markCameraActivity();
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => { orbit.isDragging = false; });
renderer.domElement.addEventListener('dblclick', () => flyToPreset('default'));

// ═══════════════════════════════════════════════════════════════════
//  SCREENSHOT
// ═══════════════════════════════════════════════════════════════════
function takeScreenshot() {
  renderer.render(scene, camera);
  const a  = document.createElement('a');
  a.href   = renderer.domElement.toDataURL('image/png');
  a.download = 'rose-' + Date.now() + '.png';
  a.click();
}

// ═══════════════════════════════════════════════════════════════════
//  UI PANEL  — fully collapsible, tabbed settings
// ═══════════════════════════════════════════════════════════════════
(function buildUI() {

  // ── helpers ──────────────────────────────────────────────────────
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  const makeLabel = (text) => {
    const e = el('span', 'ui-label'); e.textContent = text; return e;
  };
  const makeDivider = () => el('div', 'ui-divider');

  // ── Toggle button ────────────────────────────────────────────────
  const toggle = el('button', 'ui-toggle');
  toggle.innerHTML = '⚙';
  toggle.title = 'Settings';
  document.body.appendChild(toggle);

  // ── Drawer ───────────────────────────────────────────────────────
  const panel = el('div');
  panel.id = 'rose-ui';
  panel.classList.add('collapsed');

  let isOpen = false;
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('collapsed', !isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.innerHTML = isOpen ? '✕' : '⚙';
  });

  renderer.domElement.addEventListener('touchstart', () => {
    if (isOpen) {
      isOpen = false;
      panel.classList.add('collapsed');
      toggle.classList.remove('open');
      toggle.innerHTML = '⚙';
    }
  }, { passive: true });

  // ── Tabs ─────────────────────────────────────────────────────────
  const tabBar   = el('div', 'ui-tabs');
  const tabPages = el('div', 'ui-tab-pages');
  const tabs = {};
  const pages = {};

  ['Theme','Camera','Scene','Lights','Particles'].forEach((name, i) => {
    const btn = el('button', 'ui-tab-btn');
    btn.textContent = name;
    btn.dataset.tab = name;
    tabBar.appendChild(btn);

    const page = el('div', 'ui-tab-page');
    page.dataset.tab = name;
    tabPages.appendChild(page);
    tabs[name]  = btn;
    pages[name] = page;
  });

  function switchTab(name) {
    Object.keys(tabs).forEach(k => {
      tabs[k].classList.toggle('active', k === name);
      pages[k].classList.toggle('active', k === name);
    });
  }
  tabBar.addEventListener('click', e => {
    if (e.target.dataset.tab) switchTab(e.target.dataset.tab);
  });
  switchTab('Theme');

  panel.appendChild(tabBar);
  panel.appendChild(tabPages);

  // ══════════════════════════════
  //  TAB: THEME
  // ══════════════════════════════
  const pg = pages;

  Object.keys(THEMES).forEach(key => {
    const ac  = themeAccents[key];
    const btn = el('button', 'ui-btn ui-btn--theme');
    btn.textContent   = THEMES[key].label;
    btn.dataset.theme = key;
    btn.style.color   = ac;
    btn.style.border  = `1px solid ${ac}66`;

    const setActive = (isActive) => {
      btn.style.background = isActive ? `${ac}66` : `${ac}33`;
      btn.style.boxShadow  = isActive ? `0 0 8px ${ac}88` : 'none';
    };
    setActive(key === activeTheme);
    btn.onmouseenter = () => { btn.style.background = `${ac}55`; };
    btn.onmouseleave = () => setActive(activeTheme === key);
    btn.onclick = () => {
      activeTheme = key;
      pg['Theme'].querySelectorAll('[data-theme]').forEach(b => {
        const tk = b.dataset.theme, a = themeAccents[tk];
        b.style.background = tk === activeTheme ? `${a}66` : `${a}33`;
        b.style.boxShadow  = tk === activeTheme ? `0 0 8px ${a}88` : 'none';
      });
      applyTheme();
    };
    pg['Theme'].appendChild(btn);
  });

  pg['Theme'].appendChild(makeDivider());

  // Exposure
  pg['Theme'].appendChild(makeLabel('Brightness'));
  pg['Theme'].appendChild(makeSlider('exposure', 0.1, 1.5, 0.01, Settings.exposure, v => {
    Settings.exposure = v;
    renderer.toneMappingExposure = v;
  }));

  // Fog
  pg['Theme'].appendChild(makeLabel('Fog Density'));
  pg['Theme'].appendChild(makeSlider('fogDensity', 0, 0.15, 0.002, Settings.fogDensity, v => {
    Settings.fogDensity = v;
    scene.fog.density = v;
  }));

  // ══════════════════════════════
  //  TAB: CAMERA
  // ══════════════════════════════
  pg['Camera'].appendChild(makeLabel('View Presets'));

  const camRow = el('div', 'ui-row');
  [['🌸','default'],['⬆','top'],['➡','side'],['🔍','close'],['🫵','front']]
    .forEach(([icon, preset]) => {
      const btn = el('button', 'ui-btn ui-btn--cam');
      btn.textContent = icon + ' ' + preset.charAt(0).toUpperCase() + preset.slice(1);
      btn.onclick = () => flyToPreset(preset);
      camRow.appendChild(btn);
    });
  pg['Camera'].appendChild(camRow);

  pg['Camera'].appendChild(makeDivider());
  pg['Camera'].appendChild(makeLabel('Behaviour'));

  // Auto-rotate toggle
  makeToggle(pg['Camera'], 'Auto Rotate', Settings.autoRotate, v => { Settings.autoRotate = v; });

  // Restore camera toggle
  makeToggle(pg['Camera'], 'Restore After Idle', Settings.restoreCamera, v => { Settings.restoreCamera = v; });

  pg['Camera'].appendChild(makeDivider());
  pg['Camera'].appendChild(makeLabel('Rotation Speed'));
  pg['Camera'].appendChild(makeSlider('rotSpeed', 0, 0.006, 0.0001, CFG.AUTO_ROTATE_SPEED, v => {
    // patch CFG at runtime via mutable shadow
    autoRotateSpeed = v;
  }));

  // ══════════════════════════════
  //  TAB: SCENE
  // ══════════════════════════════
  pg['Scene'].appendChild(makeLabel('Visibility'));
  makeToggle(pg['Scene'], 'Glow Overlays',   Settings.showGlow,   v => { Settings.showGlow = v;   glowGroup.visible = v; });
  makeToggle(pg['Scene'], 'Nebula Clouds',   Settings.showNebula, v => { Settings.showNebula = v; nebulaGroup.visible = v; });
  makeToggle(pg['Scene'], 'Starfield',       Settings.showStars,  v => { Settings.showStars = v;  applyStarVisibility(); });
  makeToggle(pg['Scene'], 'Floor',           Settings.showFloor,  v => { Settings.showFloor = v;  applyFloorVisibility(); });

  pg['Scene'].appendChild(makeDivider());
  pg['Scene'].appendChild(makeLabel('Glow Intensity'));
  pg['Scene'].appendChild(makeSlider('glowInt', 0, 2, 0.05, Settings.glowIntensity, v => {
    Settings.glowIntensity = v;
    buildGlowOverlays();
  }));

  pg['Scene'].appendChild(makeLabel('Wind'));
  pg['Scene'].appendChild(makeSlider('wind', 0, 2, 0.05, Settings.windScale, v => { Settings.windScale = v; Wind.userScale = v; }));

  pg['Scene'].appendChild(makeDivider());
  makeToggle(pg['Scene'], 'Shadows', Settings.shadows, v => {
    Settings.shadows = v;
    renderer.shadowMap.enabled = v;
    // force shadow map refresh
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  });

  // Screenshot
  pg['Scene'].appendChild(makeDivider());
  const shotBtn = el('button', 'ui-btn ui-btn--shot');
  shotBtn.textContent = '📷 Save Screenshot';
  shotBtn.onclick = takeScreenshot;
  pg['Scene'].appendChild(shotBtn);

  // ══════════════════════════════
  //  TAB: LIGHTS
  // ══════════════════════════════
  pg['Lights'].appendChild(makeLabel('Key Light'));
  pg['Lights'].appendChild(makeSlider('keyInt', 0, 8, 0.1, Settings.keyIntensity, v => {
    Settings.keyIntensity = v;
    lights.key.intensity = v;
  }));

  pg['Lights'].appendChild(makeLabel('Ambient'));
  pg['Lights'].appendChild(makeSlider('ambInt', 0, 30, 0.5, Settings.ambientIntensity, v => {
    Settings.ambientIntensity = v;
    lights.ambient.intensity = v;
  }));

  pg['Lights'].appendChild(makeLabel('Spotlights'));
  pg['Lights'].appendChild(makeSlider('spotInt', 0, 8, 0.1, Settings.spotIntensity, v => {
    Settings.spotIntensity = v;
    lights.spots.forEach(s => s.intensity = v);
  }));

  pg['Lights'].appendChild(makeDivider());
  pg['Lights'].appendChild(makeLabel('Bounce Light'));
  pg['Lights'].appendChild(makeSlider('bounceInt', 0, 4, 0.1, 1.2, v => {
    lights.bounce.intensity = v;
  }));

  pg['Lights'].appendChild(makeLabel('Fill Light'));
  pg['Lights'].appendChild(makeSlider('fillInt', 0, 4, 0.1, 1.1, v => {
    lights.fill.intensity = v;
  }));

  // ══════════════════════════════
  //  TAB: PARTICLES
  // ══════════════════════════════
  pg['Particles'].appendChild(makeLabel('Dust Particles'));
  makeToggle(pg['Particles'], 'Show Dust', Settings.showDust, v => {
    Settings.showDust = v;
    dustPoints.visible = v;
  });
  pg['Particles'].appendChild(makeLabel('Dust Size'));
  pg['Particles'].appendChild(makeSlider('dustSz', 0.01, 0.08, 0.001, Settings.dustSize, v => {
    Settings.dustSize = v;
    dustMat.size = v;
  }));
  pg['Particles'].appendChild(makeLabel('Dust Opacity'));
  pg['Particles'].appendChild(makeSlider('dustOp', 0, 1, 0.02, Settings.dustOpacity, v => {
    Settings.dustOpacity = v;
    dustMat.opacity = v;
  }));

  pg['Particles'].appendChild(makeDivider());
  pg['Particles'].appendChild(makeLabel('Falling Petals'));
  makeToggle(pg['Particles'], 'Show Falling Petals', Settings.showFallingPetals, v => {
    Settings.showFallingPetals = v;
    fallingPetals.forEach(m => { m.visible = v; });
  });
  pg['Particles'].appendChild(makeLabel('Petal Opacity'));
  pg['Particles'].appendChild(makeSlider('fallOp', 0, 1, 0.02, Settings.fallingOpacity, v => {
    Settings.fallingOpacity = v;
    fallingPetals.forEach(m => { m.material.opacity = v; });
  }));

  pg['Particles'].appendChild(makeDivider());
  pg['Particles'].appendChild(makeLabel('Star Size'));
  pg['Particles'].appendChild(makeSlider('starSz', 0.02, 0.25, 0.005, Settings.starSize, v => {
    Settings.starSize = v;
    if (envRefs.starMat) envRefs.starMat.size = v;
  }));

  // ── Assemble ──────────────────────────────────────────────────────
  document.body.appendChild(panel);

  // ── Widget builders ──────────────────────────────────────────────
  function makeSlider(id, min, max, step, value, onChange) {
    const row = el('div', 'ui-slider-row');
    const input = el('input');
    input.type  = 'range';
    input.id    = id;
    input.min   = min;
    input.max   = max;
    input.step  = step;
    input.value = value;
    const valDisplay = el('span', 'ui-slider-val');
    valDisplay.textContent = parseFloat(value).toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2);
    input.oninput = () => {
      const v = parseFloat(input.value);
      valDisplay.textContent = v.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2);
      onChange(v);
    };
    row.appendChild(input);
    row.appendChild(valDisplay);
    return row;
  }

  function makeToggle(parent, label, initial, onChange) {
    const row = el('div', 'ui-toggle-row');
    const lbl = el('span', 'ui-toggle-label');
    lbl.textContent = label;
    const track = el('div', 'ui-switch-track' + (initial ? ' on' : ''));
    const thumb = el('div', 'ui-switch-thumb');
    track.appendChild(thumb);
    let state = initial;
    track.addEventListener('click', () => {
      state = !state;
      track.classList.toggle('on', state);
      onChange(state);
    });
    row.appendChild(lbl);
    row.appendChild(track);
    parent.appendChild(row);
    return row;
  }
})();

// Mutable auto-rotate speed (patchable from UI)
let autoRotateSpeed = CFG.AUTO_ROTATE_SPEED;

// ═══════════════════════════════════════════════════════════════════
//  THEME APPLICATION
// ═══════════════════════════════════════════════════════════════════
function applyTheme() {
  const theme = THEMES[activeTheme];
  updateLightTheme();
  petalMaterials.forEach((mat, i) => {
    const layerT = i / Math.max(petalMaterials.length - 1, 1);
    mat.color.setHSL(theme.petalHue, theme.petalSat, 0.20 + layerT * 0.14);
    mat.emissive.setHSL(theme.petalHue, 0.65, 0.04 + layerT * 0.03);
  });
  refreshDustColors();
  refreshFallingPetalColors();
  buildNebula(theme);
  buildGlowOverlays();
}

// ═══════════════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════
flowerGroup.position.y = -5;
let hasRisen      = false;
let previousTime  = 0;
const clock       = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const dt   = time - previousTime;
  previousTime = time;

  if (!hasRisen) {
    flowerGroup.position.y += (0 - flowerGroup.position.y) * 0.025;
    if (Math.abs(flowerGroup.position.y) < 0.002) { flowerGroup.position.y = 0; hasRisen = true; }
  }

  const sw = 1.0 + Wind.strength * 1.6;
  flowerGroup.rotation.z = (Math.sin(time*0.37)*0.015 + Math.sin(time*0.71)*0.006) * sw;
  flowerGroup.rotation.x =  Math.sin(time*0.26)*0.007 * sw;
  flowerGroup.scale.setScalar(1 + Math.sin(time*1.20)*0.003 + Math.sin(time*2.40)*0.001);

  // Pulsing glow
  if (Settings.showGlow) {
    glowGroup.children.forEach((mesh, i) => {
      const pulse = 1 + Math.sin(time * (0.5 + i*0.3) + i) * 0.04;
      mesh.scale.setScalar(pulse);
    });
  }

  // Spotlight flicker
  if (lights.spots) {
    lights.spots.forEach((spot, i) => {
      spot.intensity = Settings.spotIntensity + Math.sin(time * 0.6 + i * 2.1) * 0.25
                     + Wind.strength * 0.3;
    });
  }

  lights.bounce.intensity = 1.2 + Math.sin(time * 1.8) * 0.3;

  const twinkleMat = envGroup.userData.twinkleMat;
  if (twinkleMat && Settings.showStars) twinkleMat.opacity = 0.55 + Math.sin(time * 1.1) * 0.12;

  nebulaGroup.rotation.y = time * 0.018;

  // Camera orbit
  const now     = performance.now() / 1000;
  const idle    = now - orbit.lastActivity;
  const restoring = !orbit.isDragging && idle > CFG.RESTORE_DELAY && Settings.restoreCamera;
  const restoreK  = restoring ? clamp((idle - CFG.RESTORE_DELAY) / 2.0, 0, 1) : 0;

  if (!orbit.isDragging) {
    if (Settings.autoRotate) orbit.targetTheta += autoRotateSpeed;
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

  petalBreezeData.forEach(pd => {
    const gust = Wind.strength * (0.55 + 0.45 * Math.cos(pd.angle - Wind.direction));
    const wX = Math.sin(time*pd.freqX*2.1+pd.phaseX)*0.50
             + Math.sin(time*pd.freqX*3.7+pd.phaseX*1.3)*0.25
             + Math.sin(time*pd.freqX*0.8+pd.phaseX*0.7)*0.25;
    const wZ = Math.sin(time*pd.freqZ*1.9+pd.phaseZ)*0.50
             + Math.sin(time*pd.freqZ*3.1+pd.phaseZ*1.5)*0.50;
    pd.mesh.rotation.x = pd.baseRX + wX * pd.breezeAmp * gust;
    pd.mesh.rotation.z = pd.baseRZ + wZ * pd.breezeAmp * gust * 0.6;
  });

  leafBreezeData.forEach(lb => {
    lb.mesh.rotation.x = lb.baseRX + Math.sin(time*0.88+lb.phaseX)*0.026*Wind.strength;
    lb.mesh.rotation.z = lb.baseRZ + Math.sin(time*0.68+lb.phaseZ)*0.042*Wind.strength;
  });

  if (Settings.showDust) {
    dustParticles.forEach((d, i) => {
      d.angle += d.speed;
      d.y     += d.drift;
      if (d.y > 2.9) d.y = -2.2;
      dustPositions[i*3]   = Math.cos(d.angle) * d.radius;
      dustPositions[i*3+1] = d.y;
      dustPositions[i*3+2] = Math.sin(d.angle) * d.radius;
    });
    dustPositionAttr.needsUpdate = true;
  }

  if (Settings.showFallingPetals) {
    fallingPetals.forEach(mesh => {
      const d = mesh.userData;
      d.y    += d.speedY;
      d.x    += d.driftX + Math.sin(time*0.38+d.phase)*0.0018;
      d.z    += d.driftZ;
      d.rotX += d.rotSpX;
      d.rotZ += d.rotSpZ;
      if (d.y < -4.5) {
        d.y = randBetween(5, 9);
        d.x = randBetween(-5.5, 5.5);
        d.z = randBetween(-5.5, 5.5);
      }
      mesh.position.set(d.x, d.y, d.z);
      mesh.rotation.set(d.rotX, 0, d.rotZ);
      mesh.material.opacity = clamp((d.y + 4.5) * 0.20, 0, Settings.fallingOpacity);
    });
  }

  renderer.render(scene, camera);
}

animate();