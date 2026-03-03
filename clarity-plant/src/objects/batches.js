import * as THREE from 'three'
import { scene } from '../scene.js'

const BATCH_COUNT = 15 
const START_X = -22  
const END_X = 22.5
const MILL_X = 1.5;

// Colores típicos de botellas PET reales (Agua, Sprite, Retornables, etc.)
const PET_COLORS = [0xaaddff, 0x22aa44, 0x2244aa, 0xdddddd, 0x55ccdd]
const CAP_COLORS = [0xff0000, 0xffffff, 0x0000ff, 0x22aa44]

function getElevation(x) {
  if (x < -18) return 0.6; 
  if (x >= -18 && x < -16) return 0.6 + ((x + 18) * 1.0); 
  if (x >= -16 && x < -13) return 2.6;  // nivel Trommel
  if (x >= -13 && x < -10.5) return 2.6 - ((x + 13) * 0.52);  // bajada a Pre-lavado
  if (x >= -10.5 && x < -4.0) return 1.8; // nivel Pre-lavado
  if (x >= -4.0 && x < -0.2) return 1.8 - ((x + 4.0) * 0.33); // bajada a Molino
  if (x >= -0.2 && x < 3.2)  return 1.1;  // zona Molino
  if (x >= 3.2  && x < 6.5)  return 1.1 + ((x - 3.2) * 0.64); // subida a Clarity
  if (x >= 6.5  && x < 11.5) return 3.15; // nivel Clarity
  if (x >= 11.5 && x < 14.5) return 3.15 - ((x - 11.5) * 0.25); // bajada a Enjuague
  if (x >= 14.5 && x < 17.5) return 2.4;  // nivel Enjuague
  if (x >= 17.5 && x < 21.5) return 2.4 + ((x - 17.5) * 0.35); // subida final
  if (x >= 21.5) return Math.max(1.2, 4.0 - ((x - 21.5) * 4.0)); 
  return 0.6; 
}
function createBottle() {
  const group = new THREE.Group()
  const baseColor = PET_COLORS[Math.floor(Math.random() * PET_COLORS.length)]
  const capColor = CAP_COLORS[Math.floor(Math.random() * CAP_COLORS.length)]

  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: baseColor, metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.75 
  })
  const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.8 })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.08, 10), bodyMat)
  base.position.y = 0.04; group.add(base)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10), bodyMat)
  body.position.y = 0.355; group.add(body)
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.22, 0.22, 10), bodyMat)
  shoulder.position.y = 0.74; group.add(shoulder)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 8), bodyMat)
  neck.position.y = 0.94; group.add(neck)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.10, 0.10, 8), capMat)
  cap.position.y = 1.08; group.add(cap)
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.32, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.3 }))
  label.position.y = 0.36; group.add(label)

  body.scale.set(1, 1, 0.5 + Math.random() * 0.5) 
  group.scale.set(0.7 + Math.random() * 0.4, 0.7 + Math.random() * 0.4, 0.7 + Math.random() * 0.4)

  group.rotation.x = Math.PI / 2
  group.rotation.z = Math.random() * Math.PI * 2

  const flakesGeo = new THREE.BufferGeometry()
  const flakePos = []
  for(let i=0; i<60; i++) flakePos.push((Math.random()-0.5)*0.8, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.8) // Más planos inicialmente
  flakesGeo.setAttribute('position', new THREE.Float32BufferAttribute(flakePos, 3))
  const flakes = new THREE.Points(flakesGeo, new THREE.PointsMaterial({ color: baseColor, size: 0.15 }))
  flakes.visible = false
  group.add(flakes)
  
  group.userData = { bodyMat, capMat, flakes, meshes: [base, body, shoulder, neck, cap, label], originalScale: group.scale.clone() }
  return group
}

export function createBatches() {
  const batches = []
  for (let i = 0; i < BATCH_COUNT; i++) {
    const bottle = createBottle()
    bottle.position.set(START_X + i * 3.0, 0, (Math.random() - 0.5) * 0.8)
    bottle.userData.speed = 1.5 + Math.random() * 0.8
    bottle.userData.rollSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3)
    scene.add(bottle)
    batches.push(bottle)
  }
  return batches
}

export function updateBatches(batches, dt, t) {
  for (const b of batches) {
    b.position.x += b.userData.speed * dt
    const isFlakes = b.position.x > MILL_X;
    
    // Físicas estabilizadas
    if (!isFlakes) {
      // Botellas enteras: Botan y ruedan
      const noise = Math.sin(b.position.x * 12) * 0.04
      b.position.y = getElevation(b.position.x) + noise
      b.rotation.y += b.userData.rollSpeed * dt
      b.rotation.z += b.userData.rollSpeed * 0.3 * dt
      b.rotation.x = Math.PI / 2; // Mantener acostadas
    } else {
      // Hojuelas (Flakes): Movimiento estrictamente lineal sobre la cinta
      b.position.y = getElevation(b.position.x) + 0.1 // Ligeramente elevado sobre la banda
      b.rotation.set(0, 0, 0); // Bloquear rotación completa del grupo para que no "bote"
    }
    
    const distToMill = b.position.x - MILL_X;
    
    if (distToMill > -1.5 && distToMill < 0) {
      const crush = Math.max(0.1, 1.0 - Math.abs(distToMill));
      b.scale.set(b.userData.originalScale.x, crush * b.userData.originalScale.y, crush * b.userData.originalScale.z); 
    }

    if (isFlakes) {
      b.userData.meshes.forEach(m => m.visible = false)
      b.userData.flakes.visible = true
      
      // Solo giran sobre su propio eje Y, plano sobre la cinta
      b.userData.flakes.rotation.y += dt * 1.5 
      b.userData.flakes.rotation.x = 0; 
      b.userData.flakes.rotation.z = 0;
      
      const expand = Math.min(1.5, 1.0 + (b.position.x - MILL_X) * 0.2)
      b.userData.flakes.scale.set(expand, 1.0, expand) // No expandir en Y para mantenerlos planos
    } else {
      b.userData.meshes.forEach(m => m.visible = true)
      b.userData.flakes.visible = false
      b.userData.flakes.scale.set(1,1,1)
      if (distToMill <= -1.5) b.scale.copy(b.userData.originalScale) 
    }

    if (b.position.x > END_X) {
      b.position.x = START_X
      b.position.z = (Math.random() - 0.5) * 0.8
      b.scale.copy(b.userData.originalScale)
    }
  }
}