import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js' // <--- IMPORTAMOS CONTROLES

// Renderer
const canvas = document.getElementById('three-canvas')
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.4
renderer.setClearColor(0x050d14)

// Scene
export const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x050d14, 0.015)

// Camera
export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(0, 8, 18)

// ── CONTROLES DE CÁMARA LIBRE ─────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.5, 0)
controls.enableDamping = true // Movimiento suave
controls.dampingFactor = 0.05
controls.maxPolarAngle = Math.PI / 2 + 0.1 // Evita que la cámara baje por debajo del suelo

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Luces industriales
const ambientLight = new THREE.AmbientLight(0x99ccee, 3.0)
scene.add(ambientLight)
const dirLight = new THREE.DirectionalLight(0xfff8e8, 3.0)
dirLight.position.set(6, 16, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
scene.add(dirLight)
const fillLight = new THREE.DirectionalLight(0xaaddff, 1.5)
fillLight.position.set(-10, 8, -6)
scene.add(fillLight)
const hemi = new THREE.HemisphereLight(0x88ccee, 0x223344, 1.5)
scene.add(hemi)

export const stageLights = [0x44aaff, 0xff8844, 0x00ffcc, 0x00ddff, 0xffcc44].map((color, i) => {
  const light = new THREE.PointLight(color, 2.0, 8)
  light.position.set(-10 + i * 5, 5, -1)
  scene.add(light)
  return light
})

// ── PISO DE CONCRETO Y LÍNEAS DE SEGURIDAD ──
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333b44, roughness: 0.95, metalness: 0.1 })
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), floorMat)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.5
floor.receiveShadow = true
scene.add(floor)

const lineMat = new THREE.MeshBasicMaterial({ color: 0xddaa00 })
const safetyLine1 = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.2), lineMat)
safetyLine1.rotation.x = -Math.PI / 2; safetyLine1.position.set(0, -0.48, 3.5)
scene.add(safetyLine1)

// ── PACAS DE PET (Bales) Y COLUMNAS ──
function createPETBale(x, y, z, rotationY) {
  const group = new THREE.Group()

  const baseVol = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x334455, transparent: true, opacity: 0.6 })
  )
  group.add(baseVol)

  const geom = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6)
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true, opacity: 0.85 })
  const instancedBale = new THREE.InstancedMesh(geom, mat, 200)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  for (let i = 0; i < 200; i++) {
    dummy.position.set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1)
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    dummy.scale.set(1, 0.3 + Math.random() * 0.5, 1) 
    dummy.updateMatrix()
    instancedBale.setMatrixAt(i, dummy.matrix)

    const rand = Math.random()
    if (rand < 0.2) color.setHex(0x22aa44) 
    else if (rand < 0.4) color.setHex(0x2244aa) 
    else color.setHex(0xaaddff) 
    instancedBale.setColorAt(i, color)
  }
  group.add(instancedBale)

  const wires = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 1.22, 1.22, 4, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
  )
  group.add(wires)

  group.position.set(x, y, z)
  group.rotation.y = rotationY
  scene.add(group)
}

createPETBale(-20, 0.1, -5, 0.1)
createPETBale(-20, 1.3, -5, 0.05)
createPETBale(-18.3, 0.1, -4.5, -0.2)
createPETBale(-18.5, 1.3, -4.8, 0)
createPETBale(15, 0.1, -6, 0.3)
createPETBale(15, 1.3, -6, 0.1)

// Columnas estructurales de la nave industrial (Despejadas del centro)
const colMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
for (let x = -25; x <= 25; x += 12) {
  // Fila trasera
  const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 15, 0.8), colMat)
  col1.position.set(x, 7, -6) 
  scene.add(col1)
  // Fila delantera (pasando la línea 2)
  const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 15, 0.8), colMat)
  col2.position.set(x, 7, 14) 
  scene.add(col2)
}

// ══════════════════════════════════════════════════════
//  ESCENARIO INDUSTRIAL COMPLETO — PLANTA DE RECICLAJE
// ══════════════════════════════════════════════════════

/*// ── VIGAS ESTRUCTURALES DEL TECHO ────────────────────
const beamMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.85, roughness: 0.3 })
for (let x = -24; x <= 24; x += 11.5) {
  // Vigas horizontales transversales (eje Z)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 18), beamMat)
  beam.position.set(x, 11, -2)
  scene.add(beam)
  // Columnas de soporte frontales
  const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 11, 0.3), beamMat)
  col2.position.set(x, 5.5, 5)
  scene.add(col2)
}
// Viga longitudinal principal
const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(52, 0.4, 0.4), beamMat)
mainBeam.position.set(0, 11.2, -8)
scene.add(mainBeam)
const mainBeam2 = mainBeam.clone()
mainBeam2.position.z = 5
scene.add(mainBeam2)
*/
// ── LUMINARIAS INDUSTRIALES DE TECHO ─────────────────
for (let x = -20; x <= 20; x += 8) {
  // Carcasa de la luminaria
  const fixtureBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.18, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9 })
  )
  fixtureBody.position.set(x, 10.6, 0)
  scene.add(fixtureBody)
  // Panel emisor (luz fría industrial)
  const emitter = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.85 })
  )
  emitter.rotation.x = Math.PI / 2
  emitter.position.set(x, 10.49, 0)
  scene.add(emitter)
  // Punto de luz real
  const workLight = new THREE.PointLight(0xddeeff, 2.2, 14)
  workLight.position.set(x, 10.0, 0)
  scene.add(workLight)
  // Cable desde viga
  /*const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), beamMat)
  cable.position.set(x, 10.95, 0)
  scene.add(cable)*/
}

// ── SISTEMA DE TUBERÍAS OVERHEAD ─────────────────────
const pipeMat    = new THREE.MeshStandardMaterial({ color: 0x3a5a6a, metalness: 0.88, roughness: 0.2 })
const pipeMatRed = new THREE.MeshStandardMaterial({ color: 0x882222, metalness: 0.85, roughness: 0.25 })
const pipeMatYel = new THREE.MeshStandardMaterial({ color: 0x887700, metalness: 0.7, roughness: 0.3 })

// Tubería principal de agua (azul/gris) — corre toda la longitud
const waterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 50, 10), pipeMat)
waterPipe.rotation.z = Math.PI / 2
waterPipe.position.set(0, 9.5, -6.5)
scene.add(waterPipe)

// Tubería de retorno/drenaje (roja) paralela
const drainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 50, 10), pipeMatRed)
drainPipe.rotation.z = Math.PI / 2
drainPipe.position.set(0, 9.0, -6.5)
scene.add(drainPipe)

// Tubería de químicos (amarilla) más delgada
const chemPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 50, 8), pipeMatYel)
chemPipe.rotation.z = Math.PI / 2
chemPipe.position.set(0, 8.6, -6.5)
scene.add(chemPipe)

// Bajantes de tubería a cada máquina (drops verticales)
for (const [x, y0, y1] of [
  [-15, 9.5, 5.5], // al Trommel
  [-7,  9.5, 2.5], // al Pre-lavado
  [1.5, 9.5, 4.0], // al Molino
  [10,  9.5, 5.5], // al Tanque Clarity
  [16,  9.5, 3.5], // al Enjuague
]) {
  const height = y0 - y1
  const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height, 8), pipeMat)
  drop.position.set(x, y1 + height/2, -6.3)
  scene.add(drop)
  // Codo de conexión (esfera)
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pipeMat)
  elbow.position.set(x, y0, -6.4)
  scene.add(elbow)
  // Ramal horizontal al equipo
  const lateral = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 3.5, 8), pipeMat)
  lateral.rotation.x = Math.PI / 2
  lateral.position.set(x, y1, -4.5)
  scene.add(lateral)
}

// ── TANQUES DE QUÍMICOS Y DOSIFICACIÓN ───────────────
function createChemTank(x, z, color, label) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  // Tanque cilíndrico
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 2.2, 16),
    new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 })
  )
  tank.position.y = 1.1
  g.add(tank)
  // Tapa
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 }))
  lid.position.y = 2.25; g.add(lid)
  // Banda de identificación
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.25, 16),
    new THREE.MeshStandardMaterial({ color: label, metalness: 0.4 }))
  band.position.y = 1.6; g.add(band)
  // Tubo de salida inferior
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.9 }))
  outlet.rotation.z = Math.PI / 2
  outlet.position.set(0.55, 0.3, 0); g.add(outlet)
  // Patas
  for (const [px, pz] of [[-0.3,0.3],[0.3,0.3],[-0.3,-0.3],[0.3,-0.3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a2530 }))
    leg.position.set(px, 0.17, pz); g.add(leg)
  }
  // Nivel de líquido
  const level = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.4, 16),
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5 }))
  level.position.y = 0.8; g.add(level)
  scene.add(g)
}
createChemTank(-19, -7, 0x1a3a5a, 0x0066ff)  // Detergente alcalino (azul)
createChemTank(-17, -7, 0x3a1a1a, 0xff2200)  // Ácido de limpieza (rojo)
createChemTank( 8,  -7, 0x1a3a2a, 0x00aa44)  // Biocida Clarity (verde)
createChemTank( 11, -7, 0x2a2a1a, 0xffcc00)  // Neutralizante (amarillo)

// ── EXTRACTORES / VENTILACIÓN ─────────────────────────
for (const x of [-16, -2, 12]) {
  // Conducto cuadrado
  const duct = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 3.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x2a3a44, metalness: 0.75 })
  )
  duct.position.set(x, 9.5, -7.5)
  scene.add(duct)
  // Extractor circular encima del conducto
  const fan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.8 })
  )
  fan.position.set(x, 11.3, -7.5)
  scene.add(fan)
  // Rejilla del extractor
  const grill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x334455, wireframe: true })
  )
  grill.position.set(x, 11.5, -7.5)
  scene.add(grill)
}


// ── PASARELA METÁLICA ELEVADA (sobre la línea) ────────
const walkMat = new THREE.MeshStandardMaterial({ color: 0x2a3a44, metalness: 0.75, roughness: 0.5 })
const walkGratingMat = new THREE.MeshStandardMaterial({ color: 0x1e2e38, wireframe: true })
// Sección de pasarela sobre tanques (lado trasero)
const walkway = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 1.2), walkMat)
walkway.position.set(3, 5.2, -4.5)
scene.add(walkway)
const grating = new THREE.Mesh(new THREE.BoxGeometry(20, 0.09, 1.2), walkGratingMat)
grating.position.set(3, 5.22, -4.5)
scene.add(grating)
// Barandillas de la pasarela
for (let x = -7; x <= 13; x += 2.5) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), walkMat)
  post.position.set(x, 5.65, -3.95)
  scene.add(post)
  const post2 = post.clone()
  post2.position.z = -5.05
  scene.add(post2)
}
const railing1 = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.05, 0.05), walkMat)
railing1.position.set(3, 6.1, -3.95); scene.add(railing1)
const railing2 = railing1.clone()
railing2.position.z = -5.05; scene.add(railing2)

// ── CUADRO ELÉCTRICO PRINCIPAL ─────────────────────────
const elecPanel = new THREE.Group()
elecPanel.position.set(22, 0, -5)
const panelBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.6, roughness: 0.4 }))
panelBox.position.y = 1.1; elecPanel.add(panelBox)
const panelDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.04),
  new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.7 }))
panelDoor.position.set(0, 1.1, 0.16); elecPanel.add(panelDoor)
// Pantalla SCADA
const scadaScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45),
  new THREE.MeshBasicMaterial({ color: 0x003355, transparent: true, opacity: 0.9 }))
scadaScreen.position.set(0, 1.6, 0.19); elecPanel.add(scadaScreen)
const scadaGlow = new THREE.PointLight(0x0055ff, 1.5, 3)
scadaGlow.position.set(0, 1.6, 0.5); elecPanel.add(scadaGlow)
// Botones y pilotos en el panel
for (const [bx, by, col] of [[-0.22,0.85,0x00ff44],[0,0.85,0xffcc00],[0.22,0.85,0xff2200]]) {
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshBasicMaterial({ color: col }))
  btn.position.set(bx, by, 0.19); elecPanel.add(btn)
}
scene.add(elecPanel)

// ── BANDA DE SEGURIDAD EN EL SUELO (adicional al lado de las máquinas) ─
const hazardMat = new THREE.MeshBasicMaterial({ color: 0xddaa00 })
const hazardMat2 = new THREE.MeshBasicMaterial({ color: 0x111111 })
// Segunda línea paralela más cerca
const line2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.12), hazardMat)
line2.rotation.x = -Math.PI / 2
line2.position.set(0, -0.47, -4.2)
scene.add(line2)

// ── TECHO INDUSTRIAL (parcialmente visible) ──────────
const roofMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.3, roughness: 0.9 })
const roof = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 60), roofMat)
roof.position.set(0, 13, -2)
scene.add(roof)
// Claraboyas (paneles de luz en el techo)
for (let x = -16; x <= 16; x += 10) {
  const skylight = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 4),
    new THREE.MeshBasicMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.3 }))
  skylight.position.set(x, 12.32, -2)
  scene.add(skylight)
  const skylightGlow = new THREE.PointLight(0x88bbdd, 0.8, 12)
  skylightGlow.position.set(x, 11.5, -2)
  scene.add(skylightGlow)
}

// ── PALLETS Y MATERIALES APILADOS ─────────────────────
function createPallet(x, z) {
  const g = new THREE.Group()
  g.position.set(x, -0.5, z)
  const palMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 })
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 1.0), palMat)
  base.position.y = 0.3; g.add(base)
  for (const [bx, bz] of [[-0.4,0],[0,0],[0.4,0]]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 1.05), palMat)
    plank.position.set(bx, 0.07, bz); g.add(plank)
  }
  // Bolsas de material apiladas encima
  for (let i = 0; i < 3; i++) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.92),
      new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.95 }))
    bag.position.y = 0.46 + i * 0.33; g.add(bag)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.94),
      new THREE.MeshBasicMaterial({ color: 0x0055aa, transparent: true, opacity: 0.7 }))
    stripe.position.set(-0.35, 0.46 + i*0.33, 0); g.add(stripe)
  }
  scene.add(g)
}
createPallet(-24, -6.5)
createPallet(-24, -5.0)
createPallet( 20,  -6.0)
createPallet( 22,  -4.5)

// ── CARRETILLA ELEVADORA (estática, ambiental) ─────────
const forkliftGroup = new THREE.Group()
forkliftGroup.position.set(30, -0.5, 0)
forkliftGroup.rotation.y = Math.PI * 0.6
const fMat = new THREE.MeshStandardMaterial({ color: 0xdd8800, metalness: 0.6, roughness: 0.4 })
const fBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.8), fMat)
fBody.position.y = 0.55; forkliftGroup.add(fBody)
const fCab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 1.2), fMat)
fCab.position.set(0, 1.5, 0); forkliftGroup.add(fCab)
// Mástil
const mast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85 }))
mast.position.set(0.5, 1.2, 1.05); forkliftGroup.add(mast)
const mast2 = mast.clone(); mast2.position.x = -0.5; forkliftGroup.add(mast2)
const forkBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9 }))
forkBar.position.set(0, 0.7, 1.1); forkliftGroup.add(forkBar)
for (const fx of [-0.35, 0.35]) {
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.9 }))
  fork.position.set(fx, 0.63, 1.55); forkliftGroup.add(fork)
}
// Ruedas
for (const [wx, wz] of [[-0.55,-0.75],[0.55,-0.75],[-0.55,0.75],[0.55,0.75]]) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }))
  wheel.rotation.z = Math.PI / 2
  wheel.position.set(wx, 0.1, wz); forkliftGroup.add(wheel)
}
scene.add(forkliftGroup)


function createBottleBunker() {
  const bunkerGroup = new THREE.Group()
  bunkerGroup.position.set(-28, -0.5, 0) // Al inicio de la línea

  // Muros de contención de hormigón
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9 })
  
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 6.0), wallMat)
  backWall.position.set(-3.8, 1.25, 0); bunkerGroup.add(backWall)
  
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.5, 0.4), wallMat)
  leftWall.position.set(-1.5, 1.25, -2.8); bunkerGroup.add(leftWall)
  
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.5, 0.4), wallMat)
  rightWall.position.set(-1.5, 1.25, 2.8); bunkerGroup.add(rightWall)

  // Montaña masiva de botellas (InstancedMesh para rendimiento)
  const geom = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 6) // Simplificada
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true, opacity: 0.8 })
  
  const BOTTLE_COUNT = 1500
  const instancedBottles = new THREE.InstancedMesh(geom, mat, BOTTLE_COUNT)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  const petColors = [0x4455aa, 0x22aa44, 0x2244aa, 0xdddddd, 0x55ccdd, 0x667788]

  for (let i = 0; i < BOTTLE_COUNT; i++) {
    // Generar posición en forma de "montaña" (más alta hacia la pared del fondo)
    const xPos = (Math.random() * 4.5) - 3.5 // Concentrado atrás
    const zPos = (Math.random() - 0.5) * 5.0
    
    // La altura máxima depende de qué tan atrás esté (creando una pendiente)
    const maxHeight = 2.2 * (1.0 - ((xPos + 3.5) / 4.5))
    const yPos = (Math.random() * maxHeight) + 0.1

    dummy.position.set(xPos, yPos, zPos)
    
    // Rotaciones y deformaciones caóticas
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    dummy.scale.set(1, 0.5 + Math.random() * 0.5, 1) // Algunas aplastadas
    
    dummy.updateMatrix()
    instancedBottles.setMatrixAt(i, dummy.matrix)

    // Colores sucios aleatorios
    const colHex = petColors[Math.floor(Math.random() * petColors.length)]
    color.setHex(colHex)
    instancedBottles.setColorAt(i, color)
  }
  
  bunkerGroup.add(instancedBottles)
  scene.add(bunkerGroup)
}

createBottleBunker()