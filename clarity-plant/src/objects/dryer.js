import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * dryer.js
 * Responsabilidad: Tanque de enjuague (Estación 3) y secadora (Estación 4).
 */

export function createRinseTank() {
  const group = new THREE.Group()
  group.position.set(5.5, 0, 0)

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.5, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x082030, metalness: 0.7, roughness: 0.3,
      transparent: true, opacity: 0.9
    })
  )
  body.position.y = 0.75
  group.add(body)

  const water = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 3.0, 2.0),
    new THREE.MeshStandardMaterial({
      color: 0x00ccff, transparent: true, opacity: 0.5, roughness: 0.1
    })
  )
  water.position.y = 0.75
  group.add(water)

  // Spray nozzles
  for (const x of [-0.7, 0.7]) {
    const nozzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x00ccff, metalness: 0.9 })
    )
    nozzle.position.set(x, 2.8, 0.5)
    group.add(nozzle)
  }

  const light = new THREE.PointLight(0x00ccff, 2, 5)
  light.position.set(0, 3.5, 0)
  group.add(light)

  scene.add(group)
  return group
}

export function createDryer() {
  const group = new THREE.Group()
  group.position.set(10.5, 0, 0)

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 3.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x201505, metalness: 0.8, roughness: 0.2 })
  )
  body.position.y = 0.75
  group.add(body)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.08, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9 })
  )
  ring.position.y = 0.75
  ring.rotation.x = Math.PI / 2
  group.add(ring)

  const light = new THREE.PointLight(0xffaa00, 2, 5)
  light.position.set(0, 3, 0)
  group.add(light)

  scene.add(group)
  return group
}
