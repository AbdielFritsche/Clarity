import * as THREE from 'three'
import { scene } from '../scene.js'

export function createPrewash() {
  const group = new THREE.Group()
  group.position.set(-10, 0, 0) 

  const matSteel = new THREE.MeshStandardMaterial({ color: 0x2e4858, metalness: 0.88, roughness: 0.18 })
  const matShiny = new THREE.MeshStandardMaterial({ color: 0x4a7080, metalness: 0.95, roughness: 0.08 })

  // Paredes del tanque
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.5, 0.1), matSteel)
  wallBack.position.set(0, 1.85, -2.4); group.add(wallBack)
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 4.8), matSteel)
  wallLeft.position.set(-2.5, 1.85, 0); group.add(wallLeft)
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 4.8), matSteel)
  wallRight.position.set(2.5, 1.85, 0); group.add(wallRight)
  const wallFloor = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.1, 4.8), matSteel)
  wallFloor.position.set(0, 0.05, 0); group.add(wallFloor)

  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(5.0, 3.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x5588aa, metalness: 0.75, roughness: 0.08, transparent: true, opacity: 0.22 })
  )
  wallFront.position.set(0, 1.85, 2.45); group.add(wallFront)

  for (const [w, d, x, z] of [[5.2, 0.14, 0, -2.4], [5.2, 0.14, 0, 2.45], [0.14, 5.0, -2.5, 0], [0.14, 5.0, 2.5, 0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), matShiny)
    rim.position.set(x, 3.65, z); group.add(rim)
  }

  // Agua
  const waterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 3.1, 4.72),
    new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.2, transparent: true, opacity: 0.85 })
  )
  waterMesh.position.set(0, 1.6, 0); group.add(waterMesh)

  // Agitadores
  const prewashAgitators = []
  const paddleMat = new THREE.MeshStandardMaterial({ color: 0x4a6070, metalness: 0.85 })
  for (const shaftX of [-1.2, 1.2]) {
    const agShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 10), matShiny)
    agShaft.position.set(shaftX, 1.85, 0); group.add(agShaft)
    
    const motorBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a2530 }))
    motorBox.position.set(shaftX, 3.8, 0); group.add(motorBox)

    for (const baseY of [1.1, 2.2]) {
      for (let i = 0; i < 4; i++) {
        const pivot = new THREE.Object3D()
        pivot.position.set(shaftX, baseY, 0)
        const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.2), paddleMat)
        paddle.position.set(0.75, 0, 0); pivot.add(paddle)
        pivot.rotation.y = (i / 4) * Math.PI * 2
        group.add(pivot)
        prewashAgitators.push(pivot)
      }
    }
  }

  const light = new THREE.PointLight(0xaaffaa, 2.5, 8)
  light.position.set(0, 2.5, 0); group.add(light)

  scene.add(group)
  return { prewashAgitators }
}