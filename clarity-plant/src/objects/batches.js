import * as THREE from 'three'
import { scene } from '../scene.js'

const DISH_COUNT = 22
const START_X    = -24
const END_X      = 26

const PLATE_COLORS = [0xf9f9f5, 0xf5f0e8, 0xffffff, 0xf0ede5, 0xe8e4dd]
const SOIL_COLORS  = [0x8B4513, 0x6B3A1A, 0xcc9944, 0x886633, 0x553311]

function getElevation(x) {
  if (x < -21)  return 0.6
  if (x < -18)  return 0.6 + (x + 21) / 3 * 0.5
  if (x < -12)  return 1.15
  if (x < -9)   return 1.15 - (x + 12) / 3 * 0.08
  if (x < 8)    return 1.1
  if (x < 11)   return 1.1 + (x - 8) / 3 * 2.2
  if (x < 17)   return 3.3
  if (x < 20)   return 3.3 - (x - 17) / 3 * 1.0
  if (x < 24)   return 2.3
  return Math.max(1.0, 2.3 - (x - 24) * 3.0)
}

function createDirtyPlate() {
  const g = new THREE.Group()
  const plateColor = PLATE_COLORS[Math.floor(Math.random() * PLATE_COLORS.length)]
  const soilColor  = SOIL_COLORS[Math.floor(Math.random() * SOIL_COLORS.length)]

  const plateMat = new THREE.MeshStandardMaterial({ color: plateColor, roughness: 0.28, metalness: 0.04 })
  const rimMat   = new THREE.MeshStandardMaterial({ color: plateColor, roughness: 0.2,  metalness: 0.06 })

  // Geometría del plato (cilindros apilados, orientación Y-up = horizontal sobre banda)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.022, 20), plateMat)
  base.position.y = 0; g.add(base)

  const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.014, 20), rimMat)
  ala.position.y = 0.013; g.add(ala)

  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 16), plateMat)
  centro.position.y = 0.02; g.add(centro)

  // Línea decorativa (torus horizontal en el plato)
  const decor = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.007, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a3366, metalness: 0.75, roughness: 0.2 })
  )
  decor.rotation.x = Math.PI / 2  // torus queda plano sobre el plato
  decor.position.y = 0.016
  g.add(decor)

  // Restos de comida encima del plato (en la cara superior)
  const soilParts = []
  const numSoil = 2 + Math.floor(Math.random() * 4)
  for (let i = 0; i < numSoil; i++) {
    const r = 0.03 + Math.random() * 0.07
    const soilMesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 6, 4),
      new THREE.MeshStandardMaterial({ color: soilColor, roughness: 0.95, metalness: 0 })
    )
    const angle = Math.random() * Math.PI * 2
    const dist  = Math.random() * 0.12
    // Posición encima de la superficie del plato (y ≈ 0.025)
    soilMesh.position.set(Math.cos(angle) * dist, 0.025 + r * 0.4, Math.sin(angle) * dist)
    soilMesh.scale.y = 0.35 + Math.random() * 0.3
    g.add(soilMesh)
    soilParts.push(soilMesh)
  }

  // Escala variada
  const s = 0.78 + Math.random() * 0.4
  g.scale.setScalar(s)

  // SIN rotación en X ni Z — el plato queda horizontal (plano sobre la banda)
  // Solo rotación aleatoria en Y para variedad de orientación
  g.rotation.y = Math.random() * Math.PI * 2

  g.userData = {
    soilParts,
    originalScale: new THREE.Vector3(s, s, s),
    isClean: false,
    speed: 0,
    wobble: 0
  }
  return g
}

export function createBatches() {
  const batches = []
  for (let i = 0; i < DISH_COUNT; i++) {
    const plate = createDirtyPlate()
    plate.position.set(START_X + i * 2.3, 0.6, (Math.random() - 0.5) * 0.65)
    plate.userData.speed  = 1.2 + Math.random() * 0.6
    plate.userData.wobble = Math.random() * Math.PI * 2
    scene.add(plate)
    batches.push(plate)
  }
  return batches
}

export function updateBatches(batches, dt) {
  for (const b of batches) {
    b.position.x += b.userData.speed * dt

    const x = b.position.x
    b.position.y = getElevation(x) + Math.sin(x * 7 + b.userData.wobble) * 0.015

    // SIEMPRE horizontal — solo giro suave en Y
    b.rotation.x = 0
    b.rotation.z = 0
    b.rotation.y += 0.18 * dt

    // ── LIMPIEZA PROGRESIVA ─────────────────────────────
    // Empieza en cuanto entra al túnel (-9) y termina al salir de Clarity (17)
    if (!b.userData.isClean && b.userData.soilParts.length) {
      let p = 0
      if      (x > -9  && x <= 8)  p = (x + 9) / 17 * 0.75   // túnel: 0→75%
      else if (x > 8   && x <= 11) p = 0.75                    // rampa: fijo 75%
      else if (x > 11  && x <= 17) p = 0.75 + (x - 11) / 6 * 0.25  // Clarity: 75→100%
      else if (x > 17)             { p = 1.0; b.userData.isClean = true }

      b.userData.soilParts.forEach(s => {
        s.material.transparent = true
        s.material.opacity = Math.max(0, 1 - p)
        s.material.needsUpdate = true
      })
    }

    // Reset ciclo
    if (b.position.x > END_X) {
      b.position.x = START_X
      b.position.z = (Math.random() - 0.5) * 0.65
      b.userData.isClean = false
      b.userData.soilParts.forEach(s => {
        s.material.opacity = 1.0
        s.material.transparent = false
        s.material.needsUpdate = true
      })
    }
  }
}
