import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * tank.js — Tanque de Lavado Caliente con Sensor Clarity — Estación 2
 *
 * Geometría EXPANDIDA:
 * - Tanque RECTANGULAR alargado hacia la izquierda para conectar con el molino.
 * - Doble sistema de agitadores (2 ejes, 4 niveles de paletas).
 * - Pared frontal semitransparente.
 * - Puente colgante ancho con el sensor Clarity centrado y DESPLAZADO HACIA ATRÁS.
 * - Partículas de separación por densidad expandidas.
 *
 * Exporta: { group, waterMesh, glowRing, tankLight, laserRay, impellerBlades }
 */
export function createTank(posX = 14, posZ = 0) {
  const group = new THREE.Group()
  group.position.set(posX, 0, posZ) // Posición central de la máquina

  // ── Materiales ────────────────────────────────────────
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x2e4858, metalness: 0.88, roughness: 0.18 })
  const matShiny = new THREE.MeshStandardMaterial({ color: 0x4a7080, metalness: 0.95, roughness: 0.08 })
  const matCoil  = new THREE.MeshStandardMaterial({ color: 0xcc4400, metalness: 0.9,  roughness: 0.12 })

  // ── Paredes del tanque (Expandido a la izquierda) ─────
  // Centro desplazado a x = -1.0, Ancho total = 5.7m
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(5.7, 3.5, 0.1), matSteel)
  wallBack.position.set(-1.0, 1.85, -2.4)
  wallBack.castShadow = true
  group.add(wallBack)

  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 4.8), matSteel)
  wallLeft.position.set(-3.85, 1.85, 0)
  group.add(wallLeft)

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 4.8), matSteel)
  wallRight.position.set(1.85, 1.85, 0)
  group.add(wallRight)

  const wallFloor = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.1, 4.8), matSteel)
  wallFloor.position.set(-1.0, 0.05, 0)
  wallFloor.receiveShadow = true
  group.add(wallFloor)

  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(5.7, 3.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x5588aa, metalness: 0.75, roughness: 0.08, transparent: true, opacity: 0.22 })
  )
  wallFront.position.set(-1.0, 1.85, 2.45)
  group.add(wallFront)

  // ── Perfil L — borde superior ─────────────────────────
  for (const [w, d, x, z] of [
    [6.0, 0.14, -1.0, -2.4],
    [6.0, 0.14, -1.0,  2.45],
    [0.14, 5.0, -3.85,  0],
    [0.14, 5.0,  1.85,  0],
  ]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), matShiny)
    rim.position.set(x, 3.65, z)
    group.add(rim)
  }

  // ── Costillas de refuerzo ─────────────────────────────
  for (const xi of [-3.4, -1.0, 1.4]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, 3.4, 0.09), new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.9 }))
    rib.position.set(xi, 1.85, -2.41)
    group.add(rib)
  }
  for (const zi of [-1.6, 0, 1.6]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.4, 0.07), new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.9 }))
    rib.position.set(-3.86, 1.85, zi)
    group.add(rib)
    const rib2 = rib.clone(); rib2.position.x = 1.86; group.add(rib2)
  }

  // ── Volumen de agua ───────────────────────────────────
  const waterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 3.1, 4.72),
    new THREE.MeshStandardMaterial({ color: 0x0066cc, roughness: 0.08, transparent: true, opacity: 0.65 })
  )
  waterMesh.position.set(-1.0, 1.6, 0)
  group.add(waterMesh)

  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 4.62),
    new THREE.MeshStandardMaterial({ color: 0x99ccee, transparent: true, opacity: 0.20, roughness: 0.9 })
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(-1.0, 3.18, 0)
  group.add(foam)

  // ── Serpentines calefactores ──────────────────────────
  for (const zi of [-1.6, -0.5, 0.5, 1.6]) {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.5, 10), matCoil)
    coil.rotation.z = Math.PI / 2
    coil.position.set(-1.0, 0.45, zi)
    group.add(coil)
  }
  const coilManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.6, 8), matCoil)
  coilManifold.position.set(-3.75, 0.55, 0)
  group.add(coilManifold)

  // ── Ejes agitadores (SISTEMA DOBLE) ───────────────────
  const paddleMat = new THREE.MeshStandardMaterial({ color: 0x4a6070, metalness: 0.85 })
  const impellerBlades = []

  for (const shaftX of [-2.2, 0.2]) {
    const agShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 10), new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.92 }))
    agShaft.position.set(shaftX, 1.85, 0); group.add(agShaft)

    const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9 }))
    bearing.position.set(shaftX, 3.71, 0); group.add(bearing)

    const motorBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.85 }))
    motorBox.position.set(shaftX, 4.14, 0); group.add(motorBox)

    for (const baseY of [1.1, 2.2]) {
      for (let i = 0; i < 4; i++) {
        const pivot = new THREE.Object3D()
        pivot.position.set(shaftX, baseY, 0)
        
        const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.20), paddleMat)
        paddle.position.set(0.7, 0, 0); pivot.add(paddle)
        
        const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.20), paddleMat)
        gusset.position.set(0.08, 0, 0); pivot.add(gusset)
        
        pivot.rotation.y = (i / 4) * Math.PI * 2
        group.add(pivot)
        impellerBlades.push(pivot)
      }
    }
  }

  // ── SISTEMA SENSOR CLARITY (Puente Desplazado) ────────
  const sensorBridgeMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9 })
  
  // Desplazamos el puente 1.2 metros hacia atrás en Z para liberar el centro
  const bridgeZ = -1.2; 
  
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), sensorBridgeMat)
  postL.position.set(-4.0, 3.1, bridgeZ); group.add(postL)
  
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.1), sensorBridgeMat)
  postR.position.set(2.0, 3.1, bridgeZ); group.add(postR)
  
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.1, 0.1), sensorBridgeMat)
  crossBeam.position.set(-1.0, 4.3, bridgeZ); group.add(crossBeam)

  const laserRays = []
  const glowRings = []

  // Creamos 2 sensores sobre el puente desplazado
  for (const sx of [-2.4, 0.4]) {
    const probeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8 }))
    probeBody.position.set(sx, 4.1, bridgeZ); group.add(probeBody)

    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.8 }))
    glowRing.position.set(sx, 4.1, bridgeZ); glowRing.rotation.x = Math.PI / 2; group.add(glowRing)
    glowRings.push(glowRing)

    const probeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x00ddff, metalness: 0.9, emissive: 0x0055ff }))
    probeTip.position.set(sx, 3.85, bridgeZ); group.add(probeTip)

    const laserRay = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0), new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0 }))
    laserRay.position.set(sx, 2.8, bridgeZ); group.add(laserRay)
    laserRays.push(laserRay)
  }

  // Caja de control central alineada con el puente
  const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.26), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.4 }))
  ctrlBox.position.set(-1.0, 4.45, bridgeZ); group.add(ctrlBox)

  const dispGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.13), new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.45 }))
  dispGlow.position.set(-1.0, 4.45, bridgeZ + 0.131); group.add(dispGlow)

  // ── Tuberías y Luz ────────────────────────────────────
  const overflow = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.75, 10), new THREE.MeshStandardMaterial({ color: 0x3a5566, metalness: 0.9 }))
  overflow.rotation.x = Math.PI / 2; overflow.position.set(-3.85, 2.85, -2.78); group.add(overflow)

  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xe05a00, metalness: 0.7 }))
  valve.position.set(-1.0, -0.18, 1.7); group.add(valve)

  const tankLight = new THREE.PointLight(0x00aaff, 3, 8)
  tankLight.position.set(-1.0, 2.5, 0); group.add(tankLight)

  // ── SEPARACIÓN POR DENSIDAD ───────────────────────────
  const floatLayer = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.10, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x55ddff, transparent: true, opacity: 0.38, roughness: 0.2 })
  )
  floatLayer.position.set(-1.0, 3.04, 0); group.add(floatLayer)

  const petGeo = new THREE.BufferGeometry()
  const petPos = []; const petCol = []
  const petPalette = [[0.67,0.87,1.0],[0.9,0.9,0.9],[0.13,0.67,0.27],[0.13,0.27,0.67],[0.0,0.85,0.85]]
  for (let i = 0; i < 400; i++) { 
    petPos.push((Math.random()-0.5)*5.3 - 1.0, 3.06+Math.random()*0.1, (Math.random()-0.5)*4.4)
    petCol.push(...petPalette[Math.floor(Math.random()*petPalette.length)])
  }
  petGeo.setAttribute('position', new THREE.Float32BufferAttribute(petPos, 3))
  petGeo.setAttribute('color', new THREE.Float32BufferAttribute(petCol, 3))
  const petFlakes = new THREE.Points(petGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.95 }))
  group.add(petFlakes)

  const sinkGeo = new THREE.BufferGeometry()
  const sinkPos = []; const sinkCol = []
  const sinkPalette = [[0.6,0.15,0.15],[0.45,0.45,0.45],[0.75,0.65,0.2],[0.15,0.15,0.15]]
  for (let i = 0; i < 150; i++) {
    sinkPos.push((Math.random()-0.5)*5.2 - 1.0, 0.18+Math.random()*0.22, (Math.random()-0.5)*4.3)
    sinkCol.push(...sinkPalette[Math.floor(Math.random()*sinkPalette.length)])
  }
  sinkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sinkPos, 3))
  sinkGeo.setAttribute('color', new THREE.Float32BufferAttribute(sinkCol, 3))
  const sinkParticles = new THREE.Points(sinkGeo, new THREE.PointsMaterial({ size: 0.10, vertexColors: true, transparent: true, opacity: 0.80 }))
  group.add(sinkParticles)

  const sepPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 4.6),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.07, side: THREE.DoubleSide })
  )
  sepPlane.rotation.x = -Math.PI / 2; sepPlane.position.set(-1.0, 0.52, 0); group.add(sepPlane)

  scene.add(group)
  return { group, waterMesh, glowRings, tankLight, laserRays, impellerBlades, petFlakes, sinkParticles, floatLayer }
}