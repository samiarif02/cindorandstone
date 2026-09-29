/* CINDER & STONE — 3D cairn of basalt stones, shader steam, rising embers (Three.js)
   Stones are procedurally sculpted (fbm-displaced icospheres); the stack drifts apart on scroll. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const S = window.__cinder || (window.__cinder = { intro: 0 });
const canvas = document.getElementById("gl");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) { canvas.remove(); S.ready && S.ready(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
camera.position.set(0, 0, 14);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* heat below, cold behind */
scene.add(new THREE.AmbientLight(0xffe8d6, 0.12));
const ember = new THREE.PointLight(0xff6a2a, 60, 14, 1.6); scene.add(ember);
const cold = new THREE.DirectionalLight(0x9fc0d8, 2.2); cold.position.set(-6, 4, -5); scene.add(cold);
const keyL = new THREE.DirectionalLight(0xfff0e0, 0.9); keyL.position.set(4, 6, 8); scene.add(keyL);

/* ---------------- procedural stones ---------------- */
function hash(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function vnoise(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(
    L(L(hash(xi, yi, zi, s), hash(xi + 1, yi, zi, s), u), L(hash(xi, yi + 1, zi, s), hash(xi + 1, yi + 1, zi, s), u), v),
    L(L(hash(xi, yi, zi + 1, s), hash(xi + 1, yi, zi + 1, s), u), L(hash(xi, yi + 1, zi + 1, s), hash(xi + 1, yi + 1, zi + 1, s), u), v),
    w
  );
}
function fbm(x, y, z, s) {
  return vnoise(x, y, z, s) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1, s + 7) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 4.3, s + 13) * 0.17;
}
function stoneGeo(seed, squash) {
  let g = new THREE.IcosahedronGeometry(1, 28);
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 1.2 + 10, v.y * 1.2 + 10, v.z * 1.2 + 10, seed);
    const micro = vnoise(v.x * 11 + 3, v.y * 11 + 3, v.z * 11 + 3, seed + 99);
    v.multiplyScalar(1 + (n - 0.5) * 0.42 + (micro - 0.5) * 0.035);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const stoneMat = new THREE.MeshPhysicalMaterial({
  color: 0x3a3430, roughness: 0.82, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.6, envMapIntensity: 0.28, sheen: 0.5, sheenColor: 0x6e6258, transparent: true
});
const SPEC = [
  { r: 1.0, sq: 0.46, seed: 1, rot: 0.2 },
  { r: 0.82, sq: 0.5, seed: 2, rot: -0.35 },
  { r: 0.66, sq: 0.52, seed: 3, rot: 0.6 },
  { r: 0.5, sq: 0.56, seed: 4, rot: -0.1 },
  { r: 0.36, sq: 0.62, seed: 5, rot: 0.9 }
];
const cairn = new THREE.Group();
scene.add(cairn);
const stones = [];
let yAcc = 0;
SPEC.forEach((s, i) => {
  const m = new THREE.Mesh(stoneGeo(s.seed, s.sq), stoneMat);
  m.scale.setScalar(s.r);
  const half = s.r * s.sq;
  yAcc += (i === 0 ? half : half * 0.78);
  m.userData = { baseY: yAcc, rot: s.rot, tilt: (Math.random() - 0.5) * 0.16, i, ox: (Math.random() - 0.5) * 0.14 * s.r };
  yAcc += half * 0.78;
  stones.push(m); cairn.add(m);
});
const STACK_H = yAcc;
stones.forEach((m) => { m.userData.baseY -= STACK_H / 2; });

/* ---------------- steam (fbm shader planes) ---------------- */
const steamVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const steamFS = `
varying vec2 vUv; uniform float uTime; uniform float uAlpha; uniform float uSeed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 uv = vUv;
  vec2 p = uv * vec2(1.6, 2.4) + vec2(uSeed, -uTime * 0.09);
  float n = fbm(p + fbm(p * 1.4 + vec2(uTime * 0.04, 0.0)) * 1.2);
  float mask = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.45, uv.y) * smoothstep(0.5, 0.12, abs(uv.x - 0.5));
  float a = smoothstep(0.42, 0.9, n) * mask * uAlpha;
  gl_FragColor = vec4(vec3(0.95, 0.9, 0.84), a);
}`;
const steams = [];
for (let i = 0; i < 5; i++) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: steamVS, fragmentShader: steamFS, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: i * 3.7 } }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.userData = { ox: (i - 2) * 0.55, oz: i % 2 ? 1.2 : -1.4, w: 3.4 + (i % 3) * 0.8, hgt: 5 + (i % 2) * 1.5, ph: i * 1.3 };
  steams.push(m); scene.add(m);
}

/* ---------------- embers (points) ---------------- */
const EMB = 180;
const eg = new THREE.BufferGeometry();
const seeds = new Float32Array(EMB * 4);
for (let i = 0; i < EMB * 4; i++) seeds[i] = Math.random();
eg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(EMB * 3), 3));
eg.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
const emberMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uW: { value: 10 }, uH: { value: 8 }, uPR: { value: renderer.getPixelRatio() }, uAlpha: { value: 1 }, uLift: { value: 0 } },
  vertexShader: `
    attribute vec4 seed; uniform float uTime, uW, uH, uPR, uLift; varying float vA;
    void main(){
      float sp = 0.25 + seed.z * 0.55;
      float y = mod(seed.y * uH + uTime * sp + uLift, uH) - uH * 0.5;
      float x = (seed.x - 0.5) * uW + sin(uTime * (0.6 + seed.w) + seed.x * 40.0) * 0.35;
      float z = (seed.w - 0.5) * 4.0;
      vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
      gl_Position = projectionMatrix * mv;
      float life = smoothstep(-0.5, -0.2, y / uH) * (1.0 - smoothstep(0.25, 0.5, y / uH));
      vA = life * (0.45 + 0.55 * sin(uTime * (3.0 + seed.z * 6.0) + seed.x * 30.0) * 0.5 + 0.5);
      gl_PointSize = (1.5 + seed.z * 3.5) * uPR * (14.0 / -mv.z);
    }`,
  fragmentShader: `
    uniform float uAlpha; varying float vA;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(1.0, 0.45 + a * 0.35, 0.15, a * vA * uAlpha); }`
});
const embers = new THREE.Points(eg, emberMat);
embers.frustumCulled = false;
scene.add(embers);

/* ---------------- layout ---------------- */
let vw = innerWidth, vh = innerHeight, visH = 1, visW = 1, mobile = false;
function resize() {
  vw = innerWidth; vh = innerHeight;
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh; camera.updateProjectionMatrix();
  visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  visW = visH * camera.aspect; mobile = camera.aspect < 0.85;
  emberMat.uniforms.uW.value = visW * 1.1; emberMat.uniforms.uH.value = visH * 1.2;
}
resize(); addEventListener("resize", resize);
const wx = (sx) => (sx - 0.5) * visW, wy = (sy) => (0.5 - sy) * visH;
const clamp = THREE.MathUtils.clamp;

const hero = document.querySelector(".hero");
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { ptr.tx = e.clientX / vw - 0.5; ptr.ty = e.clientY / vh - 0.5; });

let first = true;
const clock = new THREE.Clock();
function frame() {
  const t = clock.getElapsedTime();
  ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
  const intro = reduced ? 1 : S.intro;
  const hr = hero.getBoundingClientRect();
  const hp = clamp(-hr.top / hr.height, 0, 1);
  const heroOn = hp < 1;

  /* cairn */
  const sx = mobile ? 0.5 : 0.68, sy = mobile ? 0.66 : 0.54;
  const h = mobile ? 0.36 : 0.56;
  const scale = (h * visH) / STACK_H;
  cairn.position.set(wx(sx) + ptr.x * 0.25, wy(sy) - hp * visH * 0.35, 0);
  cairn.scale.setScalar(scale);
  cairn.rotation.set(0.18 + ptr.y * 0.12, ptr.x * 0.5 + t * 0.06, 0);
  stones.forEach((m) => {
    const d = m.userData, i = d.i;
    const fall = (1 - intro);
    const spread = hp * (i + 0.6) * 0.9;                    // stack lifts apart on scroll
    m.position.set(
      d.ox + Math.sin(i * 2.1) * spread * 0.35,
      d.baseY + spread + fall * (4 + i * 1.6) + Math.sin(t * 0.9 + i) * 0.015 * (1 + hp * 20),
      Math.cos(i * 1.7) * spread * 0.25
    );
    m.rotation.set(d.tilt + hp * i * 0.25, d.rot + t * 0.04 * (i % 2 ? 1 : -1) + hp * (i + 1) * 0.5, d.tilt * 0.5);
  });
  stoneMat.opacity = 1 - smoothstepJS(0.55, 0.95, hp);
  cairn.visible = heroOn;

  /* ember light breathes under the stack */
  ember.position.set(cairn.position.x, cairn.position.y - STACK_H * scale * 0.55, 1.5);
  ember.intensity = (45 + Math.sin(t * 2.3) * 8 + Math.sin(t * 5.1) * 4) * intro;

  /* steam around the stones */
  steams.forEach((m) => {
    const d = m.userData;
    m.material.uniforms.uTime.value = t + d.ph * 10;
    m.material.uniforms.uAlpha.value = intro * (0.42 + hp * 0.4) * (1 - smoothstepJS(0.7, 1, hp));
    m.scale.set(d.w * scale * 0.9, d.hgt * scale * 0.9, 1);
    m.position.set(cairn.position.x + d.ox * scale, cairn.position.y + d.hgt * scale * 0.25, d.oz);
    m.visible = heroOn;
  });

  /* embers everywhere, strongest in the hero */
  emberMat.uniforms.uTime.value = t;
  emberMat.uniforms.uAlpha.value = intro * (1 - hp * 0.55);
  emberMat.uniforms.uLift.value = -hr.top / vh * 1.2;

  renderer.render(scene, camera);
  if (first) { first = false; S.ready && S.ready(); }
}
function smoothstepJS(a, b, v) { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
renderer.setAnimationLoop(frame);
