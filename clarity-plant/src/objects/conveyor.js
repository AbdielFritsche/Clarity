import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * conveyor.js
 * Responsabilidad: construir la cinta transportadora central
 * que conecta todas las estaciones de la planta.
 */

export function createConveyor() {
  const group = new THREE.Group()

  // Belt surface
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.2, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.4, roughness: 0.8 })
  )
  belt.position.set(0, 0.1, 0)
  belt.receiveShadow = true
  group.add(belt)

  // Transverse stripes
  for (let i = -12; i <= 12; i += 1.5) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.25, 1.65),
      new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.6 })
    )
    stripe.position.set(i, 0.1, 0)
    group.add(stripe)
  }

  // Side rails
  for (const z of [-0.9, 0.9]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.3, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9, roughness: 0.2 })
    )
    rail.position.set(0, 0.35, z)
    group.add(rail)
  }

  // Support legs
  for (let x = -12; x <= 12; x += 4) {
    for (const z of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.2, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.7, roughness: 0.4 })
      )
      leg.position.set(x, -0.5, z)
      group.add(leg)
    }
  }

  scene.add(group)
  return group
}
