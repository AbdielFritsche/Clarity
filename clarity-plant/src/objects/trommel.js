import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * trommel.js — Separador de Etiquetas (Label Remover)
 * Basado en el cilindro rotatorio horizontal del video.
 */
export function createTrommel() {
  const group = new THREE.Group()
  group.position.set(-15, 1.5, 0) // Se coloca antes del molino

  // Base y soportes
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.2, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.8 })
  )
  base.position.y = 0.1
  group.add(base)

  for (const x of [-1.5, 1.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x223344 }))
    leg.position.set(x, 0.85, 0)
    group.add(leg)
  }

  // Tambor rotatorio (Trommel)
  const drumGroup = new THREE.Group()
  drumGroup.position.set(0, 1.8, 0)
  
  // Cilindro exterior tipo "malla" (semitransparente para ver las botellas)
  const drumMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 4.0, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x556677, metalness: 0.9, roughness: 0.5, 
      transparent: true, opacity: 0.4, wireframe: true 
    })
  )
  drumMesh.rotation.z = Math.PI / 2
  drumGroup.add(drumMesh)

  // Eje central interno con aspas de fricción
  const drumShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.9 })
  )
  drumShaft.rotation.z = Math.PI / 2
  drumGroup.add(drumShaft)

  group.add(drumGroup)
  scene.add(group)

  return { trommelDrum: drumGroup }
}