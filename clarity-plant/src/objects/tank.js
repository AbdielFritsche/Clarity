import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * tank.js
 * Responsabilidad: Tanque de lavado biológico Clarity (Estación 2).
 * Es el núcleo del proyecto: contiene el agua reactiva, el sensor láser
 * y el sistema de burbujas.
 */

export function createTank() {
  const group = new THREE.Group()
  group.position.set(0, 0, 0)

  // ── Outer cylindrical shell ──────────────────────────
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 4.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0a2535,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85
    })
  )
  outer.position.y = 1.25
  group.add(outer)

  // ── Water (color changes with biocarga) ─────────────
  const waterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 3.8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0066cc,
      metalness: 0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    })
  )
  waterMesh.position.y = 1.1
  group.add(waterMesh)

  // ── Metal rings ──────────────────────────────────────
  for (const y of [0.2, 1.5, 2.8]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.08, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.9, roughness: 0.1 })
    )
    ring.position.y = y
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  }

  // ── Sensor laser mount ───────────────────────────────
  const sensorPole = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.5, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9 })
  )
  sensorPole.position.set(2.2, 1.5, 0)
  group.add(sensorPole)

  const sensorHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x00ddff, metalness: 0.95 })
  )
  sensorHead.position.set(2.2, 2.4, 0)
  group.add(sensorHead)

  // ── Glow ring (pulsing) ──────────────────────────────
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.3, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.08 })
  )
  glowRing.position.y = 2
  glowRing.rotation.x = Math.PI / 2
  group.add(glowRing)

  // ── Tank point light ─────────────────────────────────
  const tankLight = new THREE.PointLight(0x00aaff, 3, 8)
  tankLight.position.y = 4
  group.add(tankLight)

  // ── Laser ray (hidden by default) ────────────────────
  const laserRay = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.03, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0 })
  )
  laserRay.position.set(0, 2.4, 0)
  group.add(laserRay)

  // ── Bubbles ──────────────────────────────────────────
  const bubbles = []
  for (let i = 0; i < 40; i++) {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(Math.random() * 0.06 + 0.02, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0x88ddff,
        transparent: true,
        opacity: Math.random() * 0.5 + 0.2
      })
    )
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 1.5
    bubble.position.set(
      Math.cos(angle) * r,
      Math.random() * 3.5 - 0.5,
      Math.sin(angle) * r
    )
    bubble.userData = {
      speed: Math.random() * 0.5 + 0.3,
      startY: Math.random() * 3.5 - 0.5,
      angle,
      r
    }
    group.add(bubble)
    bubbles.push(bubble)
  }

  scene.add(group)

  return { group, waterMesh, glowRing, tankLight, laserRay, bubbles }
}
