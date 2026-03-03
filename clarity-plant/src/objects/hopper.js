import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * hopper.js
 * Responsabilidad: Tolva de recepción de botellas PET (Estación 0).
 */

export function createHopper() {
  const group = new THREE.Group()
  group.position.set(-20.5, 0, 0)

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 3, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x1a2d3a, metalness: 0.8, roughness: 0.2 })
  )
  body.position.y = 1
  body.castShadow = true
  group.add(body)

  // Top opening lid
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.3, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9 })
  )
  lid.position.y = 2.6
  group.add(lid)

  // Glow backface
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 3.2, 2.7),
    new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.08, side: THREE.BackSide })
  )
  glow.position.y = 1
  group.add(glow)

  const light = new THREE.PointLight(0x0044ff, 2, 4)
  light.position.set(0, 3.5, 0)
  group.add(light)

  scene.add(group)
  return group
}
