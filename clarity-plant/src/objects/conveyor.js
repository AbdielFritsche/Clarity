import * as THREE from 'three'
import { scene } from '../scene.js'

export function createConveyor() {
  const group = new THREE.Group()
  const belts = []

  // Textura de banda transportadora (acero inox perforado / malla)
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1a1e22'; ctx.fillRect(0, 0, 128, 128)
  // Patrón de malla metálica
  ctx.fillStyle = '#22272c'
  for (let i = 0; i < 128; i += 8) {
    ctx.fillRect(i, 0, 4, 128)
    ctx.fillRect(0, i, 128, 4)
  }
  const beltTexture = new THREE.CanvasTexture(canvas)
  beltTexture.wrapS = THREE.RepeatWrapping
  beltTexture.wrapT = THREE.RepeatWrapping

  // Materiales
  const railMat = new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.9, roughness: 0.1 })

  function buildSegment(x0, y0, x1, y1, zPos = 0, width = 1.4) {
    const sg = new THREE.Group()
    const len = Math.hypot(x1 - x0, y1 - y0)
    const ang = Math.atan2(y1 - y0, x1 - x0)
    const mx  = (x0 + x1) / 2
    const my  = (y0 + y1) / 2

    // Banda de malla
    const mat = new THREE.MeshStandardMaterial({ map: beltTexture.clone(), roughness: 0.7, metalness: 0.3 })
    mat.map.repeat.set(len * 1.5, 1)
    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, width), mat)
    sg.add(belt); belts.push(belt)

    // Guías laterales en acero inox
    for (const z of [-width/2 - 0.05, width/2 + 0.05]) {
      const guide = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.06), railMat)
      guide.position.set(0, 0.08, z); sg.add(guide)
    }

    sg.position.set(mx, my, zPos); sg.rotation.z = ang; group.add(sg)

    // Soportes / patas
    for (const xOff of [-len/2 + 0.5, len/2 - 0.5]) {
      for (const z of [-0.5, 0.5]) {
        const ht = my + xOff * Math.tan(ang) + 0.5
        if (ht < 0.15) continue
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ht, 8),
          new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.8 }))
        const rx = mx + xOff * Math.cos(ang)
        leg.position.set(rx, ht/2 - 0.5, zPos + z)
        group.add(leg)
      }
    }
  }

  // ── LÍNEA DE LAVADO INDUSTRIAL ────────────────────────

  // 1. Zona de carga → Pre-remojo
  buildSegment(-24, 0.6, -21, 0.6)         // mesa de raspado → rampa
  buildSegment(-21, 0.6, -18, 1.15)        // rampa de subida al pre-remojo
  // HUECO -18 a -12: tanque pre-remojo

  // 2. Salida pre-remojo → entrada túnel
  buildSegment(-12, 1.15, -9, 1.1)         // bajada al túnel

  // 3. BANDA DENTRO DEL TÚNEL (-9 a 8) — pasa por el interior
  buildSegment(-9, 1.1, 8, 1.1, 0, 1.2)   // banda estrecha que cruza todo el túnel

  // 4. Salida túnel → subida a Clarity
  buildSegment(8, 1.1, 11, 3.3)            // rampa de subida al Clarity
  // HUECO 11 a 17: tanque Clarity

  // 5. Salida Clarity → enjuague final
  buildSegment(17, 3.3, 20, 2.3)           // bajada al enjuague
  // HUECO 20 a 22.5: enjuague/secado

  // 6. Secado → zona de salida
  buildSegment(22.5, 2.3, 25.5, 2.3)      // salida horizontal a rack limpio

  scene.add(group)
  return { belts }
}
