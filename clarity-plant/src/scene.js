import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvas = document.getElementById('three-canvas')
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.setClearColor(0x060a0f)

export const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x060a0f, 0.011)

export const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(0, 7, 16)

export const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.5, 0)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2 + 0.1

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── ILUMINACIÓN COCINA INDUSTRIAL ─────────────────────
const ambient = new THREE.AmbientLight(0xfff5e8, 2.0)
scene.add(ambient)
const dirLight = new THREE.DirectionalLight(0xfff8f0, 3.0)
dirLight.position.set(4, 14, 8); dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048); scene.add(dirLight)
const fill = new THREE.DirectionalLight(0xddeeff, 1.0)
fill.position.set(-10, 6, -4); scene.add(fill)
const hemi = new THREE.HemisphereLight(0xfff8f0, 0x334455, 0.9); scene.add(hemi)

export const stageLights = [0xffffff, 0xaaddff, 0x00ffcc, 0x00aaff, 0xffee88].map((color, i) => {
  const l = new THREE.PointLight(color, 1.5, 8)
  l.position.set(-8 + i * 4, 5, -1); scene.add(l); return l
})

// ── PISO BALDOSA ANTIDESLIZANTE (cocina) ──────────────
const floorMat = new THREE.MeshStandardMaterial({ color: 0xd0cdc5, roughness: 0.88, metalness: 0.04 })
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), floorMat)
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor)

// Juntas de baldosa
const groutMat = new THREE.MeshBasicMaterial({ color: 0xb8b5ae })
for (let x = -25; x <= 25; x += 1.2) {
  const gx = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 30), groutMat)
  gx.rotation.x = -Math.PI / 2; gx.position.set(x, -0.489, 0); scene.add(gx)
}
for (let z = -8; z <= 8; z += 1.2) {
  const gz = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.03), groutMat)
  gz.rotation.x = -Math.PI / 2; gz.position.set(0, -0.489, z); scene.add(gz)
}
// Zona húmeda (línea verde de seguridad)
const lineMat = new THREE.MeshBasicMaterial({ color: 0x22aa55 })
const safeLine = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.12), lineMat)
safeLine.rotation.x = -Math.PI / 2; safeLine.position.set(0, -0.48, 3.8); scene.add(safeLine)

// ── PAREDES DE COCINA (azulejo blanco / acero inox) ───
const wallMat  = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.35 })
const steelMat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, metalness: 0.9, roughness: 0.1 })
const darkMat  = new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.8, roughness: 0.3 })

const backWall = new THREE.Mesh(new THREE.BoxGeometry(58, 12, 0.25), wallMat)
backWall.position.set(0, 5.5, -8); scene.add(backWall)
const frontWall = new THREE.Mesh(new THREE.BoxGeometry(58, 3.5, 0.25), wallMat)
frontWall.position.set(0, 1.25, 6.8); scene.add(frontWall)

// Frisos de azulejo horizontal
for (let y = 0.4; y <= 4; y += 0.4) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(58, 0.015, 0.05), new THREE.MeshBasicMaterial({ color: 0xcccccc }))
  g.position.set(0, y, -7.86); scene.add(g)
}
// Zócalo de acero inox en la base de la pared
const baseboard = new THREE.Mesh(new THREE.BoxGeometry(58, 0.3, 0.05), steelMat)
baseboard.position.set(0, -0.36, -7.84); scene.add(baseboard)

// ── ESTRUCTURA TECHO ──────────────────────────────────
for (let x = -20; x <= 20; x += 8) {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 16), darkMat)
  beam.position.set(x, 9.8, -0.5); scene.add(beam)
  const colF = new THREE.Mesh(new THREE.BoxGeometry(0.22, 9.8, 0.22), darkMat)
  colF.position.set(x, 4.9, 6); scene.add(colF)
  const colB = colF.clone(); colB.position.z = -7.8; scene.add(colB)
}
const lBeam = new THREE.Mesh(new THREE.BoxGeometry(50, 0.3, 0.3), darkMat)
lBeam.position.set(0, 10.0, -0.5); scene.add(lBeam)
const roof = new THREE.Mesh(new THREE.BoxGeometry(58, 0.35, 19), new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.6 }))
roof.position.set(0, 10.2, -0.5); scene.add(roof)

// ── CAMPANAS EXTRACTORAS (sobre cada estación) ────────
function createHood(x) {
  const g = new THREE.Group(); g.position.set(x, 0, -2.2)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 1.8), steelMat)
  hood.position.y = 7.8; g.add(hood)
  const brim = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.07, 2.0), 
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.06 }))
  brim.position.y = 7.55; g.add(brim)
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.0, 0.75), 
    new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.88 }))
  duct.position.set(0, 9.0, 0); g.add(duct)
  // LED interior cálido
  const led = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xfffff0, transparent: true, opacity: 0.92 }))
  led.position.set(0, 7.55, -0.45); g.add(led)
  const hoodLight = new THREE.PointLight(0xfff5d0, 2.2, 5)
  hoodLight.position.set(0, 7.4, 0); g.add(hoodLight)
  scene.add(g)
}
for (const hx of [-16, -5, 5, 16]) createHood(hx)

// ── FLUORESCENTES DE TECHO ─────────────────────────────
for (let x = -20; x <= 20; x += 5) {
  const fix = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 0.25), darkMat)
  fix.position.set(x, 9.35, 0.5); scene.add(fix)
  const emit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xfffff8, transparent: true, opacity: 0.95 }))
  emit.position.set(x, 9.3, 0.5); scene.add(emit)
  const wl = new THREE.PointLight(0xfffff0, 2.5, 11)
  wl.position.set(x, 8.9, 0.5); scene.add(wl)
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.45, 4), darkMat)
  cab.position.set(x, 9.6, 0.5); scene.add(cab)
}

// ── TUBERÍAS OVERHEAD ─────────────────────────────────
const pipeCold  = new THREE.MeshStandardMaterial({ color: 0x2255aa, metalness: 0.85, roughness: 0.18 })
const pipeHot   = new THREE.MeshStandardMaterial({ color: 0xaa2222, metalness: 0.85, roughness: 0.18 })
const pipeSteam = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.12 })

const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 48, 10), pipeCold)
cp.rotation.z = Math.PI/2; cp.position.set(0, 8.5, -6); scene.add(cp)
const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 48, 10), pipeHot)
hp.rotation.z = Math.PI/2; hp.position.set(0, 8.1, -6); scene.add(hp)
const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 48, 10), pipeSteam)
sp.rotation.z = Math.PI/2; sp.position.set(0, 7.7, -6); scene.add(sp)

// Bajantes con válvulas
for (const [bx, by] of [[-16, 5.2],[-5, 4.0],[5, 4.8],[16, 4.5]]) {
  const h = 8.5 - by
  const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 8), pipeCold)
  drop.position.set(bx, by + h/2, -5.8); scene.add(drop)
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), pipeCold)
  elbow.position.set(bx, 8.5, -5.9); scene.add(elbow)
  const lat = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.2, 8), pipeCold)
  lat.rotation.x = Math.PI/2; lat.position.set(bx, by, -4.2); scene.add(lat)
  const valv = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x113377, metalness: 0.7 }))
  valv.position.set(bx, by + 0.4, -5.8); scene.add(valv)
}

// ── MESAS DE ACERO INOX (prep / salida) ───────────────
function createSSTable(x, z, w = 2.0) {
  const g = new THREE.Group(); g.position.set(x, -0.5, z)
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.85), steelMat)
  top.position.y = 0.95; g.add(top)
  const backsplash = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, 0.03), steelMat)
  backsplash.position.set(0, 1.06, -0.42); g.add(backsplash)
  for (const [lx, lz] of [[-w/2+0.06, -0.35],[w/2-0.06,-0.35],[-w/2+0.06,0.35],[w/2-0.06,0.35]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), steelMat)
    leg.position.set(lx, 0.47, lz); g.add(leg)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }))
    foot.position.set(lx, -0.01, lz); g.add(foot)
  }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(w-0.1, 0.025, 0.75), steelMat)
  shelf.position.y = 0.22; g.add(shelf)
  scene.add(g)
}
createSSTable(-22, -0.5, 2.5)
createSSTable(-19.5, -0.5, 2.5)
createSSTable(21, -0.5, 2.5)
createSSTable(23.5, -0.5, 2.5)

// ── ESTANTES CON VAJILLA (entrada y salida) ────────────
function createDishRack(x, z) {
  const g = new THREE.Group(); g.position.set(x, -0.5, z)
  for (const [sx,sz] of [[-0.45,-0.28],[0.45,-0.28],[-0.45,0.28],[0.45,0.28]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 8), steelMat)
    p.position.set(sx, 0.95, sz); g.add(p)
  }
  for (const sy of [0.2, 0.7, 1.25]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.62), steelMat)
    shelf.position.y = sy; g.add(shelf)
    for (let pi = 0; pi < 9; pi++) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.15, 0.018 + pi*0.002, 14),
        new THREE.MeshStandardMaterial({ color: 0xf9f9f5, roughness: 0.25, metalness: 0.05 })
      )
      plate.position.set((Math.random()-0.5)*0.55, sy+0.02+pi*0.021, (Math.random()-0.5)*0.3)
      g.add(plate)
    }
  }
  scene.add(g)
}
for (const [rx, rz] of [[-22,-4.5],[-20.5,-4.5],[-19,-4.5],[22,-5],[23.5,-5]]) createDishRack(rx, rz)

// ── CARROS DE VAJILLA (hostelería) ────────────────────
function createDishCart(x, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, -0.5, z); g.rotation.y = rotY
  const cMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.85, roughness: 0.18 })
  for (const [cx, cz] of [[-0.3,-0.2],[0.3,-0.2],[-0.3,0.2],[0.3,0.2]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.035, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }))
    w.rotation.x = Math.PI/2; w.position.set(cx, 0.065, cz); g.add(w)
  }
  for (const by of [0.18, 0.52, 0.88]) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.48), cMat)
    tray.position.y = by; g.add(tray)
    for (let pi = 0; pi < 6; pi++) {
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.022, 14),
        new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.35 }))
      pl.position.set((Math.random()-0.5)*0.36, by+0.022+pi*0.024, (Math.random()-0.5)*0.22)
      g.add(pl)
    }
  }
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.035, 0.035), cMat)
  h.position.set(0, 1.05, -0.22); g.add(h)
  scene.add(g)
}
createDishCart(-21, 1.2, 0.2)
createDishCart(-21, 2.8, -0.1)
createDishCart(22, 1.8, Math.PI)
createDishCart(23.2, 3.2, Math.PI + 0.12)

// ── PANEL ELÉCTRICO / SCADA ───────────────────────────
const scada = new THREE.Group(); scada.position.set(21, 0, -5.8)
const sBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.55, roughness: 0.4 }))
sBox.position.y = 1.1; scada.add(sBox)
const sScrn = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.65),
  new THREE.MeshBasicMaterial({ color: 0x001133, transparent: true, opacity: 0.92 }))
sScrn.rotation.y = Math.PI/2; sScrn.position.set(0.1, 1.75, 0); scada.add(sScrn)
const sGlow = new THREE.PointLight(0x0055ff, 1.8, 3)
sGlow.position.set(0.3, 1.75, 0); scada.add(sGlow)
for (const [bz, col] of [[-0.28, 0x00ff55],[0, 0xffcc00],[0.28, 0xff3300]]) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshBasicMaterial({ color: col }))
  b.position.set(0.11, 0.95, bz); scada.add(b)
}
scene.add(scada)

// ── SEÑALIZACIÓN ──────────────────────────────────────
function sign(x, y, z, rotY, col) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.04),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }))
  f.position.set(x, y, z); f.rotation.y = rotY; scene.add(f)
  const gw = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }))
  gw.position.set(x+Math.sin(rotY)*0.026, y, z+Math.cos(rotY)*0.026)
  gw.rotation.y = rotY; scene.add(gw)
}
sign(-18, 2.2, 4.4, 0, 0x226633)
sign( -7, 2.8, 4.4, 0, 0x224488)
sign(  3, 2.8, 4.4, 0, 0x882200)
sign( 13, 3.5, 4.4, 0, 0x006677)
sign( 20, 2.2, 4.4, 0, 0x226633)
