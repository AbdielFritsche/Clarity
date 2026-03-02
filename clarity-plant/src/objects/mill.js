import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * mill.js
 * Responsabilidad: molino triturador de botellas PET (Estación 1).
 * Exporta el grupo y la referencia al engranaje para animarlo.
 */

export function createMill() {
  const group = new THREE.Group()
  group.position.set(-5.5, 0, 0)

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 3.5, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1f1205, metalness: 0.7, roughness: 0.4 })
  )
  body.position.y = 0.75
  body.castShadow = true
  group.add(body)

  // Orange top cap
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.5, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xff4400, metalness: 0.8, roughness: 0.3 })
  )
  top.position.y = 2.75
  group.add(top)

  // Glow backface
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 3.8, 2.5),
    new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.08, side: THREE.BackSide })
  )
  glow.position.y = 0.75
  group.add(glow)

  // Spinning gear indicator on the front face
  const gear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 1, roughness: 0.1 })
  )
  gear.position.set(0, 3.2, 1.15)
  group.add(gear)

  // Accent light
  const light = new THREE.PointLight(0xff6600, 2, 4)
  light.position.set(0, 3.5, 0)
  group.add(light)

  scene.add(group)

  // Return gear so simulation.js can rotate it each frame
  return { group, gear }
}
