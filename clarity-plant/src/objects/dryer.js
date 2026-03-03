import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * dryer.js -> REFACTORIZADO A ZONA FINAL
 * Responsabilidad: Tanque de enjuague (x=16) y Estación de Súper Sacos (x=22).
 */

export function createRinseTank() {
  const group = new THREE.Group()
  group.position.set(16, 0, 0) // Posición exacta tras el tanque Clarity

  // Tanque de Enjuague (Más industrial y robusto)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2.5, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x3a4a55, metalness: 0.7, roughness: 0.3 })
  )
  body.position.y = 1.25
  group.add(body)

  // Borde superior
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.15, 2.7),
    new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 })
  )
  rim.position.y = 2.5
  group.add(rim)

  // Agua limpia
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.3, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x00aacc, transparent: true, opacity: 0.6, roughness: 0.1 })
  )
  water.position.y = 1.3
  group.add(water)

  const light = new THREE.PointLight(0x00ccff, 2.5, 6)
  light.position.set(0, 3.0, 0)
  group.add(light)

  scene.add(group)
  return group
}

export function createCollectionZone() {
  const group = new THREE.Group()
  group.position.set(22, 0, 0) // Posición final

  // Estructura metálica para colgar el saco
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
  for(const x of [-0.9, 0.9]) {
    for(const z of [-0.9, 0.9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5), frameMat)
      post.position.set(x, 1.75, z)
      group.add(post)
    }
    // Barras superiores
    const barX = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.05), frameMat)
    barX.position.set(0, 3.5, x)
    group.add(barX)
    const barZ = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.9), frameMat)
    barZ.position.set(x, 3.5, 0)
    group.add(barZ)
  }

  // Súper Saco (Jumbo Bag) translúcido
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, transparent: true, opacity: 0.85 })
  const sack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 1.6), sackMat)
  sack.position.y = 1.2
  group.add(sack)

  // Relleno de hojuelas visibles dentro del saco
  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.0, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.7 })
  )
  fill.position.y = 0.7
  group.add(fill)

  scene.add(group)
  return group
}