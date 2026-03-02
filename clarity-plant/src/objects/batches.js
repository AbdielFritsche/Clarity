import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * batches.js
 * Botellas PET con forma real: cuerpo cilindrico + cuello + tapa.
 * Color cambia segun la etapa de la linea de produccion.
 */

const BATCH_COUNT = 8
const BATCH_SPACING = 3.8
const START_X = -14
const END_X = 15

// Color por etapa segun posicion X
const COLOR_STAGES = [
  { x: -7,  body: 0x4455aa, cap: 0x223388 }, // Sucia - azul opaco
  { x: -2,  body: 0xcc4411, cap: 0x882200 }, // Triturada - rojo/marron
  { x:  3,  body: 0x22aacc, cap: 0x117788 }, // Lavando - cyan
  { x:  8,  body: 0x44ddee, cap: 0x22aacc }, // Enjuague - cyan claro
  { x: 13,  body: 0x88dd44, cap: 0x559922 }, // Secado - verde
]

function getColors(x) {
  for (let i = COLOR_STAGES.length - 1; i >= 0; i--) {
    if (x >= COLOR_STAGES[i].x) return COLOR_STAGES[i]
  }
  return { body: 0x00ff88, cap: 0x00bb55 } // Salida - PET limpio brillante
}

/**
 * Crea una botella PET usando geometrias primitivas agrupadas.
 * Estructura: base cilindrica + cuerpo + hombros (cono) + cuello + tapa
 */
function createBottle() {
  const group = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4455aa, metalness: 0.1, roughness: 0.3,
    transparent: true, opacity: 0.82
  })
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x223388, metalness: 0.6, roughness: 0.2
  })

  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.08, 12), bodyMat)
  base.position.y = 0.04
  group.add(base)

  // Main body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 12), bodyMat)
  body.position.y = 0.355
  group.add(body)

  // Shoulders (tapered cone)
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.22, 0.22, 12), bodyMat)
  shoulder.position.y = 0.74
  group.add(shoulder)

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 10), bodyMat)
  neck.position.y = 0.94
  group.add(neck)

  // Cap/lid
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.10, 0.10, 10), capMat)
  cap.position.y = 1.08
  group.add(cap)

  // Slight label bump (thin cylinder on body)
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.225, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.9, transparent: true, opacity: 0.18 })
  )
  label.position.y = 0.36
  group.add(label)

  group.userData.bodyMat = bodyMat
  group.userData.capMat  = capMat
  return group
}

export function createBatches() {
  const batches = []
  for (let i = 0; i < BATCH_COUNT; i++) {
    const bottle = createBottle()
    bottle.position.set(
      START_X + i * BATCH_SPACING,
      0.55,
      (Math.random() - 0.5) * 0.4
    )
    bottle.rotation.y = Math.random() * Math.PI * 2
    bottle.userData.speed = 1.4 + Math.random() * 0.4
    bottle.userData.wobble = Math.random() * Math.PI * 2
    scene.add(bottle)
    batches.push(bottle)
  }
  return batches
}

export function updateBatches(batches, dt, t) {
  for (const b of batches) {
    b.position.x += b.userData.speed * dt
    // Slight wobble/sway on the conveyor
    b.rotation.z = Math.sin(t * 2 + b.userData.wobble) * 0.04
    b.rotation.y += 0.3 * dt

    const { body, cap } = getColors(b.position.x)
    b.userData.bodyMat.color.setHex(body)
    b.userData.capMat.color.setHex(cap)

    if (b.position.x > END_X) {
      b.position.x = START_X
      b.position.z = (Math.random() - 0.5) * 0.4
    }
  }
}
