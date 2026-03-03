import * as THREE from 'three'
import { scene } from '../scene.js'

const BATCH_COUNT = 20 
const START_X = -24  
const END_X = 26
const MILL_X = 2.0;

const PET_COLORS = [0xaaddff, 0x22aa44, 0x2244aa, 0xdddddd, 0x55ccdd]
const CAP_COLORS = [0xff0000, 0xffffff, 0x0000ff, 0x22aa44]

function getElevation(x, isLine2) {
  if (x < -21) return 0.6; 
  if (x >= -21 && x < -19) return 0.6; 
  if (x >= -19 && x < -12.5) return 0.6 + ((x + 19) / 6.5) * 3.2; 
  if (x >= -12.5 && x < -7.5) return 3.2; // Tanque Pre-lavado
  if (x >= -7.5 && x < -6.5) return 3.2;  // Salida plana clasificadora
  if (x >= -6.5 && x < -0.2) {
    if (isLine2) return 1.6 - ((x + 6.5) / 6.3) * 0.3; // Rampa Línea 2
    return 3.2 - ((x + 6.5) / 6.3) * 1.9; // Rampa Línea 1
  }
  if (x >= -0.2 && x < 3.2) return 1.1; 
  if (x >= 3.2 && x < 11.5) return 1.1 + ((x - 3.2) / 8.3) * 2.7; 
  if (x >= 11.5 && x < 16.5) return 3.2; 
  if (x >= 16.5 && x < 19.5) return 3.2 - ((x - 16.5) / 3.0) * 0.4; 
  if (x >= 19.5 && x < 21.5) return 2.45; 
  if (x >= 21.5 && x < 24.5) return 2.45 + ((x - 21.5) / 3.0) * 1.35; 
  if (x >= 24.5) return Math.max(1.2, 4.0 - ((x - 24.5) * 4.0)); 
  return 0.6;
}

function createBottle() {
  const group = new THREE.Group()
  const baseColor = PET_COLORS[Math.floor(Math.random() * PET_COLORS.length)]
  const capColor = CAP_COLORS[Math.floor(Math.random() * CAP_COLORS.length)]

  const bodyMat = new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.75 })
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
  
  body.scale.set(1, 1, 0.5 + Math.random() * 0.5) 
  group.scale.set(0.7 + Math.random() * 0.4, 0.7 + Math.random() * 0.4, 0.7 + Math.random() * 0.4)

  group.rotation.x = Math.PI / 2
  group.rotation.z = Math.random() * Math.PI * 2

  const flakesGeo = new THREE.BufferGeometry()
  const flakePos = []
  for(let i=0; i<60; i++) flakePos.push((Math.random()-0.5)*0.8, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.8) 
  flakesGeo.setAttribute('position', new THREE.Float32BufferAttribute(flakePos, 3))
  const flakes = new THREE.Points(flakesGeo, new THREE.PointsMaterial({ color: baseColor, size: 0.15 }))
  flakes.visible = false
  group.add(flakes)
  
  group.userData = { flakes, meshes: [base, body, shoulder, neck, cap], originalScale: group.scale.clone(), originalColor: baseColor }
  return group
}

export function createBatches() {
  const batches = []
  for (let i = 0; i < BATCH_COUNT; i++) {
    const bottle = createBottle()
    bottle.position.set(START_X + i * 2.5, 0, (Math.random() - 0.5) * 0.8)
    bottle.userData.speed = 1.5 + Math.random() * 0.8
    bottle.userData.rollSpeed = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3)
    scene.add(bottle)
    batches.push(bottle)
  }
  return batches
}

export function updateBatches(batches, dt, t) {
  for (const b of batches) {
    const isGreen = b.userData.originalColor === 0x22aa44; 
    const isFlakes = b.position.x > MILL_X;
    const isLine2 = b.position.z > 4.0; 

    // ── RUTA DE MERMA (Banda Transversal alineada Z=1.0 a Z=8.0) ──
    if (isGreen && b.position.x >= -6.5 && b.position.z < 8.0) {
      b.position.x = -6.5; // Frenamos en X exactamente en la nueva banda
      b.position.z += b.userData.speed * dt * 1.5; 
      
      let wasteY = 3.1;
      if (b.position.z > 1.0 && b.position.z <= 8.0) {
        wasteY = 3.1 - ((b.position.z - 1.0) / 7.0) * 1.5; 
      }
      b.position.y = wasteY + (Math.sin(b.position.z * 12) * 0.04);
      b.rotation.x = Math.PI / 2;
      b.rotation.y += b.userData.rollSpeed * dt;
      
      if (b.position.z >= 8.0) { b.position.z = 8.0; b.position.y = 1.6; } 
      continue;
    }

    // ── RUTA PRINCIPAL ──
    b.position.x += b.userData.speed * dt;
    const noise = Math.sin(b.position.x * 12) * 0.04;
    const prewashZone = b.position.x >= -12.5 && b.position.x <= -7.5;
    const sortingZone = b.position.x > -7.5 && b.position.x < -6.5; // La nueva plataforma
    
    if (!isFlakes) {
      b.rotation.x = Math.PI / 2;
      b.rotation.y += b.userData.rollSpeed * dt;
      
      if (prewashZone || sortingZone) {
        if (prewashZone) {
          b.position.z = Math.sin(t * 2 + b.rotation.z) * 1.0; 
        }
        b.position.y = getElevation(b.position.x, false) + noise;
        
        // Se acomodan en sus carriles ANTES de llegar a X=-6.5
        if (isGreen) {
          b.position.z = THREE.MathUtils.lerp(b.position.z, 1.5, dt * 3); // Carril descarte
        } else {
          b.position.z = THREE.MathUtils.lerp(b.position.z, 0.0, dt * 3); // Carril principal
        }
      } else {
        b.position.y = getElevation(b.position.x, isLine2) + noise;
        const targetZ = isLine2 ? 8.0 : 0.0;
        b.position.z = THREE.MathUtils.lerp(b.position.z, targetZ, 4 * dt);
      }
    } else {
      b.position.y = getElevation(b.position.x, isLine2) + 0.1;
      b.rotation.set(0, 0, 0); 
    }
    
    const distToMill = b.position.x - MILL_X;
    if (distToMill > -1.5 && distToMill < 0) {
      const crush = Math.max(0.1, 1.0 - Math.abs(distToMill));
      b.scale.set(b.userData.originalScale.x, crush * b.userData.originalScale.y, crush * b.userData.originalScale.z); 
    }

    if (isFlakes) {
      b.userData.meshes.forEach(m => m.visible = false)
      b.userData.flakes.visible = true
      b.userData.flakes.rotation.y += dt * 1.5 
      const expand = Math.min(1.5, 1.0 + (b.position.x - MILL_X) * 0.2)
      b.userData.flakes.scale.set(expand, 1.0, expand)
    } else {
      b.userData.meshes.forEach(m => m.visible = true)
      b.userData.flakes.visible = false
      if (distToMill <= -1.5) b.scale.copy(b.userData.originalScale) 
    }

    if (b.position.x > END_X) {
      b.position.x = START_X;
      b.position.z = (Math.random() - 0.5) * 0.8;
      b.scale.copy(b.userData.originalScale);
    }
  }
}