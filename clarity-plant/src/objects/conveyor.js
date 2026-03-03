import * as THREE from 'three'
import { scene } from '../scene.js'

export function createConveyor() {
  const group = new THREE.Group()
  const belts = [] // Guardaremos las mallas de las bandas para animarlas

  // Crear textura de rayas para la banda transportadora
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0f14'; ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#141c24'; ctx.fillRect(0, 0, 64, 128) // Mitad más clara
  const beltTexture = new THREE.CanvasTexture(canvas)
  beltTexture.wrapS = THREE.RepeatWrapping
  beltTexture.wrapT = THREE.RepeatWrapping

  function buildSegment(startX, startY, endX, endY) {
    const segGroup = new THREE.Group()
    const length = Math.hypot(endX - startX, endY - startY)
    const angle = Math.atan2(endY - startY, endX - startX)
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2

    // Banda negra con textura animable
    const mat = new THREE.MeshStandardMaterial({ map: beltTexture, roughness: 0.9 })
    const belt = new THREE.Mesh(new THREE.BoxGeometry(length, 0.15, 1.6), mat)
    // Ajustar la repetición de la textura según el largo de la cinta
    mat.map = mat.map.clone() 
    mat.map.repeat.set(length * 2, 1)
    
    segGroup.add(belt)
    belts.push(belt) // Exportar para animar

    // Rieles laterales metálicos
    for (const z of [-0.85, 0.85]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 })
      )
      rail.position.set(0, 0.15, z)
      segGroup.add(rail)
    }

    segGroup.position.set(midX, midY, 0)
    segGroup.rotation.z = angle
    group.add(segGroup)

    // Patas
    for (const xOffset of [-length/2 + 0.5, length/2 - 0.5]) {
      for (const z of [-0.6, 0.6]) {
        const height = midY + (xOffset * Math.tan(angle)) + 0.5
        if (height < 0.2) continue;

        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, height, 8),
          new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.6 })
        )
        const realX = midX + (xOffset * Math.cos(angle))
        leg.position.set(realX, height / 2 - 0.5, z)
        group.add(leg)
      }
    }
  }

  // TRAMOS DE BANDA — Solo conectan donde NO hay máquinas
  // La lógica: cada banda va DE la salida de una máquina A la entrada de la siguiente
  
  buildSegment(-22, 0.3, -18, 0.3)   // Tolva → pie de subida Trommel
  buildSegment(-18, 0.3, -16, 2.3)   // Subida inclinada al Trommel
  // HUECO -16 a -13: aquí está el Trommel (group.position.x = -15) — sin banda
  buildSegment(-13, 2.3, -10.5, 1.3) // Bajada Trommel → Pre-lavado (boca del tanque)
  // HUECO -10.5 a -4.0: aquí está el Pre-lavado (position.x = -7, largo 4.5) — sin banda
  buildSegment(-4.0, 1.3, -2.5, 1.3) // Salida Pre-lavado → entrada Molino
  buildSegment(-2.5, 1.3, -0.2, 0.5) // Caída a la boca del Molino
  // HUECO -0.2 a 3.2: aquí está el Molino (position.x = 1.5, largo 2.6) — sin banda
  buildSegment(3.2,  0.5,  6.5, 3.2) // Sinfín/Auger → subida al Tanque Clarity
  // HUECO 6.5 a 11.5: aquí está el Tanque Clarity (position.x = 10) — sin banda
  buildSegment(11.5, 3.1, 14.5, 2.4) // Salida Tanque Clarity → Tanque Enjuague
  // HUECO 14.5 a 17.5: aquí está el Tanque Enjuague (position.x = 16) — sin banda
  buildSegment(17.5, 2.4, 21.5, 3.8) // Salida Enjuague → Zona de recolección

  scene.add(group)
  return { belts } // Retornamos las bandas para animarlas en simulation.js
}