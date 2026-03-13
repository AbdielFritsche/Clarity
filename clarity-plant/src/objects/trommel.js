import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * trommel.js → CLASIFICADORA DE VAJILLA / SORTING STATION
 * Estación donde se ordenan las piezas en canastillas antes de entrar al túnel.
 * Con cinta clasificadora de dos carriles y brazo de selección.
 */
export function createTrommel() {
  const g = new THREE.Group()
  g.position.set(-9.5, 0, 0)

  const ssM  = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.14 })
  const darkM = new THREE.MeshStandardMaterial({ color: 0x1e2530, metalness: 0.8 })

  // Base / estructura soporte
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 2.0), darkM)
  base.position.y = 0.1; g.add(base)
  for (const [lx, lz] of [[-1.2,-0.8],[1.2,-0.8],[-1.2,0.8],[1.2,0.8]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), ssM)
    leg.position.set(lx, 0.7, lz); g.add(leg)
  }

  // Plataforma de trabajo
  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 2.2), ssM)
  platform.position.y = 1.38; g.add(platform)

  // Dos canastillas (racks) de lavado en la plataforma
  for (const [rz, col] of [[0.5, 0xeeeeee],[-0.5, 0xdddddd]]) {
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.85, wireframe: true })
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.9), rackMat)
    rack.position.set(0, 1.7, rz); g.add(rack)
    // Platos dentro de la canastilla
    for (let pi = 0; pi < 5; pi++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.02, 14),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 }))
      plate.position.set(-0.5 + pi*0.25, 1.8, rz); g.add(plate)
    }
  }

  // Brazo clasificador (arm that sorts dishes)
  const drumGroup = new THREE.Group()
  drumGroup.position.set(0, 1.8, 0)
  // Eje central (rota para seleccionar)
  const armShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.9 }))
  armShaft.rotation.z = Math.PI/2; drumGroup.add(armShaft)
  // Paletas del brazo clasificador
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xdd5500, metalness: 0.65 }))
    arm.position.set(0.42, 0, -0.8 + i*0.8)
    const armPivot = new THREE.Object3D()
    armPivot.rotation.x = (i/3)*Math.PI*2
    armPivot.add(arm); drumGroup.add(armPivot)
  }
  g.add(drumGroup)

  // Panel de control lateral
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.4), darkM)
  panel.position.set(1.52, 2.0, 0.7); g.add(panel)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x003355, transparent: true, opacity: 0.85 }))
  scr.rotation.y = -Math.PI/2; scr.position.set(1.49, 2.1, 0.7); g.add(scr)

  // Luz de zona
  const zLight = new THREE.PointLight(0xfff0dd, 1.8, 5)
  zLight.position.set(0, 2.5, 0); g.add(zLight)

  scene.add(g)
  return { trommelDrum: drumGroup }
}
