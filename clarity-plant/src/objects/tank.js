import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * tank.js — Tanque de Lavado Caliente con Sensor Clarity — Estación 2
 *
 * Geometría basada en tanques industriales reales de hot-wash PET:
 *  - Tanque RECTANGULAR abierto por arriba (no cilíndrico)
 *  - 4 paredes de acero inox + fondo; pared frontal semitransparente
 *  - Perfil L en el borde superior (lip estructural)
 *  - Costillas de refuerzo externas
 *  - Volumen de agua con color reactivo a la biocarga
 *  - Plano de espuma / agitación en la superficie
 *  - Serpentines calefactores horizontales con manifold vertical
 *  - Eje agitador central con 2 conjuntos de 4 paletas (paddle agitator)
 *  - Motor encima del eje agitador
 *  - Sonda sensor Clarity en brazo de acero sobre el tanque
 *  - Collar de acero, punta óptica luminosa, LED de estado
 *  - Aro de brillo pulsante (marca Clarity)
 *  - Rayo láser animado
 *  - Cable desde sonda hasta caja de control
 *  - Caja de control con pantalla luminosa
 *  - Tubería de overflow y válvula de drenaje
 *  - 45 burbujas internas animadas
 *
 * Exporta: { group, waterMesh, glowRing, tankLight, laserRay, bubbles, impellerBlades }
 */
export function createTank() {
  const group = new THREE.Group()
  group.position.set(10, 0, 0)

  // ── Materiales ────────────────────────────────────────
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x2e4858, metalness: 0.88, roughness: 0.18 })
  const matShiny = new THREE.MeshStandardMaterial({ color: 0x4a7080, metalness: 0.95, roughness: 0.08 })
  const matCoil  = new THREE.MeshStandardMaterial({ color: 0xcc4400, metalness: 0.9,  roughness: 0.12 })

  // ── Paredes del tanque rectangular (abierto por arriba) ─
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.5, 0.1), matSteel)
  wallBack.position.set(0, 1.85, -2.4)
  wallBack.castShadow = true
  group.add(wallBack)

  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 4.8), matSteel)
  wallLeft.position.set(-1.85, 1.85, 0)
  group.add(wallLeft)

  const wallRight = wallLeft.clone()
  wallRight.position.x = 1.85
  group.add(wallRight)

  const wallFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 4.8), matSteel)
  wallFloor.position.set(0, 0.05, 0)
  wallFloor.receiveShadow = true
  group.add(wallFloor)

  // Pared frontal semitransparente para ver el interior
  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 3.5, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x5588aa, metalness: 0.75, roughness: 0.08,
      transparent: true, opacity: 0.22
    })
  )
  wallFront.position.set(0, 1.85, 2.45)
  group.add(wallFront)

  // ── Perfil L — borde superior (4 lados) ──────────────
  for (const [w, d, x, z] of [
    [3.9, 0.14,  0,    -2.4],
    [3.9, 0.14,  0,     2.45],
    [0.14, 5.0, -1.85,  0],
    [0.14, 5.0,  1.85,  0],
  ]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), matShiny)
    rim.position.set(x, 3.65, z)
    group.add(rim)
  }

  // ── Costillas de refuerzo externas ────────────────────
  for (const xi of [-1.4, 0, 1.4]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.4, 0.09), new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.9 }))
    rib.position.set(xi, 1.85, -2.41)
    group.add(rib)
  }
  for (const zi of [-1.6, 0, 1.6]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.4, 0.07), new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.9 }))
    rib.position.set(-1.86, 1.85, zi)
    group.add(rib)
    const rib2 = rib.clone()
    rib2.position.x = 1.86
    group.add(rib2)
  }

  // ── Volumen de agua (color reactivo a la biocarga) ────
  const waterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.38, 3.1, 4.72),
    new THREE.MeshStandardMaterial({
      color: 0x0066cc, metalness: 0, roughness: 0.08,
      transparent: true, opacity: 0.65
    })
  )
  waterMesh.position.set(0, 1.6, 0)
  group.add(waterMesh)

  // ── Espuma / agitación en la superficie ───────────────
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 4.62),
    new THREE.MeshStandardMaterial({
      color: 0x99ccee, transparent: true, opacity: 0.20, roughness: 0.9
    })
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, 3.18, 0)
  group.add(foam)

  // ── Serpentines calefactores horizontales ─────────────
  for (const zi of [-1.6, -0.5, 0.5, 1.6]) {
    const coil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3.3, 10),
      matCoil
    )
    coil.rotation.z = Math.PI / 2
    coil.position.set(0, 0.45, zi)
    group.add(coil)
  }
  // Manifold vertical que une los serpentines
  const coilManifold = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 4.6, 8),
    matCoil
  )
  coilManifold.position.set(-1.75, 0.55, 0)
  group.add(coilManifold)

  // Sonda de temperatura en el manifold
  const tempProbe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: 0xddddee, metalness: 0.95 })
  )
  tempProbe.rotation.z = Math.PI / 2
  tempProbe.position.set(-1.3, 1.85, -2.1)
  group.add(tempProbe)

  // ── Eje agitador central ──────────────────────────────
  const agShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 3.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.92 })
  )
  agShaft.position.set(0, 1.85, 0)
  group.add(agShaft)

  // Rodamiento superior
  const bearing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9 })
  )
  bearing.position.set(0, 3.71, 0)
  group.add(bearing)

  // Motor encima del eje
  const motorBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.85 })
  )
  motorBox.position.set(0, 4.14, 0)
  group.add(motorBox)

  // ── Paletas del agitador (2 niveles × 4 paletas) ──────
  const paddleMat = new THREE.MeshStandardMaterial({ color: 0x4a6070, metalness: 0.85 })
  const impellerBlades = []

  for (const baseY of [1.1, 2.2]) {
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Object3D()
      pivot.position.set(0, baseY, 0)

      const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.20), paddleMat)
      paddle.position.set(0.7, 0, 0)
      pivot.add(paddle)

      // Refuerzo de la paleta
      const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.20), paddleMat)
      gusset.position.set(0.08, 0, 0)
      pivot.add(gusset)

      pivot.rotation.y = (i / 4) * Math.PI * 2
      group.add(pivot)
      impellerBlades.push(pivot)
    }
  }

  // ── SISTEMA SENSOR CLARITY (Puente Colgante) ─────────
  const sensorBridgeMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9 })
  
  // Postes laterales
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), sensorBridgeMat)
  postL.position.set(-2.0, 3.1, 0); group.add(postL)
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), sensorBridgeMat)
  postR.position.set(2.0, 3.1, 0); group.add(postR)
  
  // Viga cruzada superior
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.1, 0.1), sensorBridgeMat)
  crossBeam.position.set(0, 4.3, 0); group.add(crossBeam)

  // Cuerpo del Sensor apuntando hacia abajo
  const probeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8 })
  )
  probeBody.position.set(0, 4.1, 0); group.add(probeBody)

  // Aro luminoso de estado
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.03, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.8 })
  )
  glowRing.position.set(0, 4.1, 0); glowRing.rotation.x = Math.PI / 2; group.add(glowRing)

  // Lente inferior
  const probeTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x00ddff, metalness: 0.9, emissive: 0x0055ff })
  )
  probeTip.position.set(0, 3.85, 0); group.add(probeTip)

  // Rayo láser vertical apuntando al agua
  const laserRay = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 2.0),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0 })
  )
  laserRay.position.set(0, 2.8, 0); group.add(laserRay)

  // Poste de montaje (derecha)
  const sPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10),
    matShiny
  )
  sPost.position.set(2.35, 3.55, 0)
  group.add(sPost)

  // Brazo horizontal sobre el tanque
  const sArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 1.15, 10),
    matShiny
  )
  sArm.rotation.z = Math.PI / 2
  sArm.position.set(1.78, 4.32, 0)
  group.add(sArm)

  // Tubo vertical que sostiene la sonda
  const sDrop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.75, 10),
    matShiny
  )
  sDrop.position.set(1.22, 3.98, 0)
  group.add(sDrop)

  // Collar de acero
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 0.09, 12),
    matShiny
  )
  collar.position.set(1.22, 3.71, 0)
  group.add(collar)

  probeTip.position.set(1.22, 3.21, 0)
  group.add(probeTip)

  // LED de estado en la sonda
  const probeLED = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 9, 9),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc })
  )
  probeLED.position.set(1.22, 3.76, 0.09)
  group.add(probeLED)
  
  glowRing.position.set(1.22, 3.76, 0.09)
  glowRing.rotation.x = Math.PI / 2
  group.add(glowRing)

  // Cable desde la sonda hasta la caja de control
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.017, 0.017, 1.1, 5),
    new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.3 })
  )
  cable.rotation.z = Math.PI / 5
  cable.position.set(1.65, 4.08, 0.1)
  group.add(cable)

  // Caja de control con pantalla luminosa
  const ctrlBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.42, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.4 })
  )
  ctrlBox.position.set(2.5, 4.08, 0.72)
  group.add(ctrlBox)

  const dispGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.20, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.45 })
  )
  dispGlow.rotation.y = -Math.PI / 2
  dispGlow.position.set(2.51, 4.14, 0.72)
  group.add(dispGlow)

  // ── Tuberías de servicio ──────────────────────────────

  // Tubería de overflow lateral
  const overflow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.75, 10),
    new THREE.MeshStandardMaterial({ color: 0x3a5566, metalness: 0.9 })
  )
  overflow.rotation.x = Math.PI / 2
  overflow.position.set(-1.85, 2.85, -2.78)
  group.add(overflow)

  // Válvula de drenaje en la base
  const valve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0xe05a00, metalness: 0.7 })
  )
  valve.position.set(0, -0.18, 1.7)
  group.add(valve)

  // ── Luz de acento del tanque ──────────────────────────
  const tankLight = new THREE.PointLight(0x00aaff, 3, 8)
  tankLight.position.set(0, 2.5, 0)
  group.add(tankLight)

  // ── SEPARACIÓN POR DENSIDAD ───────────────────────────
  // PET hojuelas (densidad ~0.96) → FLOTAN en la superficie
  // PVC / vidrio / metales (densidad >1.0) → SE HUNDEN al fondo

  // Capa de flotación — hojuelas PET en la superficie
  const floatLayer = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.10, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x55ddff, transparent: true, opacity: 0.38, roughness: 0.2 })
  )
  floatLayer.position.set(0, 3.04, 0)
  group.add(floatLayer)

  // Puntos PET flotantes (partículas de colores reales del PET reciclado)
  const petGeo = new THREE.BufferGeometry()
  const petPos = []; const petCol = []
  const petPalette = [[0.67,0.87,1.0],[0.9,0.9,0.9],[0.13,0.67,0.27],[0.13,0.27,0.67],[0.0,0.85,0.85]]
  for (let i = 0; i < 260; i++) {
    petPos.push((Math.random()-0.5)*3.1, 3.06+Math.random()*0.1, (Math.random()-0.5)*4.4)
    const c = petPalette[Math.floor(Math.random()*petPalette.length)]
    petCol.push(...c)
  }
  petGeo.setAttribute('position', new THREE.Float32BufferAttribute(petPos, 3))
  petGeo.setAttribute('color',    new THREE.Float32BufferAttribute(petCol, 3))
  const petFlakes = new THREE.Points(petGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.95 }))
  group.add(petFlakes)

  // Puntos de contaminantes hundidos (PVC, vidrio, metales)
  const sinkGeo = new THREE.BufferGeometry()
  const sinkPos = []; const sinkCol = []
  const sinkPalette = [[0.6,0.15,0.15],[0.45,0.45,0.45],[0.75,0.65,0.2],[0.15,0.15,0.15]]
  for (let i = 0; i < 90; i++) {
    sinkPos.push((Math.random()-0.5)*3.0, 0.18+Math.random()*0.22, (Math.random()-0.5)*4.3)
    const c = sinkPalette[Math.floor(Math.random()*sinkPalette.length)]
    sinkCol.push(...c)
  }
  sinkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sinkPos, 3))
  sinkGeo.setAttribute('color',    new THREE.Float32BufferAttribute(sinkCol, 3))
  const sinkParticles = new THREE.Points(sinkGeo, new THREE.PointsMaterial({ size: 0.10, vertexColors: true, transparent: true, opacity: 0.80 }))
  group.add(sinkParticles)

  // Plano de separación (interfaz densimétrica) — línea sutil
  const sepPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.3, 4.6),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.07, side: THREE.DoubleSide })
  )
  sepPlane.rotation.x = -Math.PI / 2
  sepPlane.position.set(0, 0.52, 0)
  group.add(sepPlane)

  // Flechas indicativas de dirección de separación (↑ PET flota, ↓ contaminante)
  for (const [yPos, color] of [[2.8, 0x00f5ff],[0.55, 0xff4422]]) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.22, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
    )
    arrow.position.set(1.6, yPos, -1.8)
    arrow.rotation.z = yPos > 1 ? 0 : Math.PI // arriba o abajo
    group.add(arrow)
  }

  scene.add(group)
  return { group, waterMesh, glowRing, tankLight, laserRay, impellerBlades, petFlakes, sinkParticles, floatLayer }
}
