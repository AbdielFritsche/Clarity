import * as THREE from 'three'
import { scene } from '../scene.js'

export function createConveyor() {
  const group = new THREE.Group()
  const belts = [] 

  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0f14'; ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#141c24'; ctx.fillRect(0, 0, 64, 128) 
  const beltTexture = new THREE.CanvasTexture(canvas)
  beltTexture.wrapS = THREE.RepeatWrapping
  beltTexture.wrapT = THREE.RepeatWrapping

  function buildSegment(startX, startY, endX, endY, zPos = 0) {
    const segGroup = new THREE.Group()
    const length = Math.hypot(endX - startX, endY - startY)
    const angle = Math.atan2(endY - startY, endX - startX)
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2

    const mat = new THREE.MeshStandardMaterial({ map: beltTexture.clone(), roughness: 0.9 })
    mat.map.repeat.set(length * 2, 1)
    const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.15, 1.6), mat)
    segGroup.add(belt); belts.push(belt) 

    for (const z of [-0.85, 0.85]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 }))
      rail.position.set(0, 0.15, z); segGroup.add(rail)
    }

    segGroup.position.set(midX, midY, zPos)
    segGroup.rotation.z = angle; group.add(segGroup)

    for (const xOffset of [-length/2 + 0.5, length/2 - 0.5]) {
      for (const z of [-0.6, 0.6]) {
        const height = midY + (xOffset * Math.tan(angle)) + 0.5
        if (height < 0.2) continue;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height, 8), new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.6 }))
        const realX = midX + (xOffset * Math.cos(angle))
        leg.position.set(realX, height / 2 - 0.5, zPos + z)
        group.add(leg)
      }
    }
  }

  // ── LÍNEA 1: PET Limpio/Transparente (Carril Central Z = 0) ──
  buildSegment(-24, 0.3, -21,   0.3, 0) 
  buildSegment(-19, 0.3, -12.5, 3.8, 0) 
  buildSegment(-7.5, 3.1, -0.2, 1.3, 0) // Principal bajando
  buildSegment(3.2,  0.5, 11.5, 3.8, 0) 
  buildSegment(16.5, 3.1, 19.5, 2.8, 0) 
  buildSegment(21.5, 2.4, 24.5, 3.8, 0)
  
  // ── BANDA TRANSVERSAL (Sale alineada al borde del tanque Z = 1.5) ──
  const lateralLen = 7.0; // De Z=1.0 a Z=8.0
  const latGroup = new THREE.Group();
  const latMat = new THREE.MeshStandardMaterial({ map: beltTexture.clone(), roughness: 0.9 });
  latMat.map.repeat.set(lateralLen * 2, 1);
  const latBeltX = new THREE.Mesh(new THREE.BoxGeometry(lateralLen, 0.15, 1.6), latMat);
  latGroup.add(latBeltX); belts.push(latBeltX);

  for (const z of [-0.85, 0.85]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(lateralLen, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 }))
    rail.position.set(0, 0.15, z); latGroup.add(rail)
  }
  
  // Inclinamos hacia abajo (de 3.1m a 1.6m de altura = -1.5m)
  const dropAngle = Math.atan2(-1.5, lateralLen);
  latGroup.rotation.set(0, -Math.PI / 2, dropAngle, 'YXZ');
  
  // Colocación exacta en el punto medio
  latGroup.position.set(-6.5, 2.35, 4.5); 
  group.add(latGroup);

  // Patas exclusivas para la banda transversal
  for (const localX of [-lateralLen/2 + 0.5, lateralLen/2 - 0.5]) {
    for (const localZ of [-0.6, 0.6]) {
      const height = 2.35 + (localX * Math.tan(dropAngle)) + 0.5;
      if (height < 0.2) continue;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height, 8), new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.6 }))
      const realZ = 4.75 + (localX * Math.cos(dropAngle));
      const realX = -7.5 + localZ; // Compensamos el ancho
      leg.position.set(realX, height / 2 - 0.5, realZ);
      group.add(leg)
    }
  }

  // ── LÍNEA 2: PET Verde/Merma (Carril Paralelo Z = 8) ──
  buildSegment(-7.5, 1.6, -0.2, 1.3, 8) // Recibe de la transversal
  buildSegment(3.2,  0.5, 11.5, 3.8, 8) 
  buildSegment(16.5, 3.1, 19.5, 2.8, 8) 
  buildSegment(21.5, 2.4, 24.5, 3.8, 8) 

  scene.add(group)
  return { belts }
}