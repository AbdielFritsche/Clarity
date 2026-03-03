import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * prewash.js — Tina de Pre-lavado (Sink-Float Tank)
 * Tanque largo con paletas giratorias en la superficie.
 */
export function createPrewash() {
  const group = new THREE.Group()
  group.position.set(-7, 0.5, 0) // Entre el molino y el tanque Clarity

  // Tanque largo de acero
  const tankBody = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.8, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x3a4a55, metalness: 0.8, roughness: 0.3 })
  )
  tankBody.position.y = 0.9
  group.add(tankBody)

  // Agua del pre-lavado (sucia)
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(4.3, 1.6, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x226655, transparent: true, opacity: 0.75, roughness: 0.1 })
  )
  water.position.y = 1.0
  group.add(water)

  // Paletas giratorias superiores (para empujar las tapas que flotan)
  const paddles = []
  for (let x = -1.5; x <= 1.5; x += 1.5) {
    const paddleGroup = new THREE.Group()
    paddleGroup.position.set(x, 1.8, 0)
    
    const axis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    )
    axis.rotation.x = Math.PI / 2
    paddleGroup.add(axis)

    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.05, 1.8),
        new THREE.MeshStandardMaterial({ color: 0xdd4400 }) // Paletas naranjas
      )
      blade.position.y = 0.3
      
      const pivot = new THREE.Group()
      pivot.rotation.x = (i / 4) * Math.PI * 2
      pivot.add(blade)
      paddleGroup.add(pivot)
    }
    
    group.add(paddleGroup)
    paddles.push(paddleGroup)
  }

  scene.add(group)
  return { prewashPaddles: paddles }
}