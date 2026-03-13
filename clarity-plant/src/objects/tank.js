import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * tank.js → TANQUE DE LAVADO CALIENTE + SENSOR CLARITY
 * Tanque de lavado principal con agua a 60-85°C.
 * El sensor Clarity mide biocarga (UFC/mL) en tiempo real
 * para dosificación inteligente y ahorro de agua en hoteles/restaurantes.
 */
export function createTank(posX = 14, posZ = 0) {
  const g = new THREE.Group()
  g.position.set(posX, 0, posZ)

  const ssM  = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.14 })
  const sMat = new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.92, roughness: 0.08 })
  const coilM = new THREE.MeshStandardMaterial({ color: 0xcc4400, metalness: 0.9, roughness: 0.12 })

  // ── PAREDES DEL TANQUE ─────────────────────────────────
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 0.1), ssM)
  wallBack.position.set(-0.8, 1.9, -2.4); wallBack.castShadow = true; g.add(wallBack)
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 4.8), ssM)
  wallL.position.set(-3.55, 1.9, 0); g.add(wallL)
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.8, 4.8), ssM)
  wallR.position.set(1.95, 1.9, 0); g.add(wallR)
  const wallFloor = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 4.8), ssM)
  wallFloor.position.set(-0.8, 0.06, 0); wallFloor.receiveShadow = true; g.add(wallFloor)

  // Pared frontal semitransparente
  const wallFront = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.75, roughness: 0.08, transparent: true, opacity: 0.2 }))
  wallFront.position.set(-0.8, 1.9, 2.45); g.add(wallFront)

  // Bordes superiores
  for (const [w, d, x, z] of [[5.8, 0.14, -0.8,-2.4],[5.8, 0.14, -0.8, 2.45],[0.14, 5.0, -3.55, 0],[0.14, 5.0, 1.95, 0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, d), sMat)
    rim.position.set(x, 3.88, z); g.add(rim)
  }

  // ── AGUA CALIENTE ─────────────────────────────────────
  const waterMesh = new THREE.Mesh(new THREE.BoxGeometry(5.3, 3.5, 4.65),
    new THREE.MeshStandardMaterial({ color: 0x1188cc, roughness: 0.06, transparent: true, opacity: 0.68 }))
  waterMesh.position.set(-0.8, 1.85, 0); g.add(waterMesh)

  // Burbujas de calor en la superficie
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.55),
    new THREE.MeshStandardMaterial({ color: 0xbbddee, transparent: true, opacity: 0.22, roughness: 0.9 }))
  foam.rotation.x = -Math.PI/2; foam.position.set(-0.8, 3.65, 0); g.add(foam)

  // ── RESISTENCIAS CALEFACTORAS ─────────────────────────
  for (const zi of [-1.5, -0.4, 0.6, 1.7]) {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 5.2, 10), coilM)
    coil.rotation.z = Math.PI/2; coil.position.set(-0.8, 0.4, zi); g.add(coil)
  }

  // ── AGITADORES DOBLES ─────────────────────────────────
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4a6070, metalness: 0.85 })
  const impellerBlades = []
  for (const ax of [-2.0, 0.4]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 3.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.9 }))
    shaft.position.set(ax, 1.9, 0); g.add(shaft)
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.85 }))
    motor.position.set(ax, 3.95, 0); g.add(motor)
    for (const by of [0.9, 2.2]) {
      for (let i = 0; i < 4; i++) {
        const piv = new THREE.Object3D()
        piv.position.set(ax, by, 0)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.065, 0.18), padMat)
        blade.position.set(0.65, 0, 0); piv.add(blade)
        piv.rotation.y = (i/4)*Math.PI*2
        g.add(piv); impellerBlades.push(piv)
      }
    }
  }

  // ── SISTEMA SENSOR CLARITY ────────────────────────────
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9 })
  const bz = -1.0 // puente desplazado hacia atrás

  // Postes y viga del puente
  const pL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), bridgeMat)
  pL.position.set(-3.7, 3.1, bz); g.add(pL)
  const pR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), bridgeMat)
  pR.position.set(2.1, 3.1, bz); g.add(pR)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.1, 0.1), bridgeMat)
  beam.position.set(-0.8, 4.25, bz); g.add(beam)

  const glowRings = []
  const laserRays = []

  // Dos sensores sobre el puente
  for (const sx of [-2.2, 0.6]) {
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.38, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8 }))
    probe.position.set(sx, 4.06, bz); g.add(probe)

    // Aro luminoso Clarity
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.85 }))
    ring.position.set(sx, 4.06, bz); ring.rotation.x = Math.PI/2; g.add(ring); glowRings.push(ring)

    // Lente óptica
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10),
      new THREE.MeshStandardMaterial({ color: 0x00ddff, metalness: 0.9, emissive: 0x0055ff }))
    lens.position.set(sx, 3.82, bz); g.add(lens)

    // Rayo láser (animado)
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0 }))
    ray.position.set(sx, 2.7, bz); g.add(ray); laserRays.push(ray)

    // LED de estado
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc }))
    led.position.set(sx, 4.1, bz + 0.09); g.add(led)
  }

  // Caja de control Clarity
  const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.4 }))
  ctrlBox.position.set(-0.8, 4.38, bz); g.add(ctrlBox)
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.5 }))
  disp.position.set(-0.8, 4.38, bz + 0.128); g.add(disp)

  // ── DOSIFICADOR DE DETERGENTE ─────────────────────────
  const doserPump = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a3050, metalness: 0.7 }))
  doserPump.position.set(2.2, 1.5, -2.3); g.add(doserPump)
  const doserTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x225599, metalness: 0.6 }))
  doserTube.position.set(2.2, 2.3, -2.3); g.add(doserTube)

  // ── PARTÍCULAS DE BIOCARGA ────────────────────────────
  const floatLayer = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.09, 4.5),
    new THREE.MeshStandardMaterial({ color: 0x44bbdd, transparent: true, opacity: 0.35, roughness: 0.2 }))
  floatLayer.position.set(-0.8, 3.63, 0); g.add(floatLayer)

  // Partículas orgánicas (biocarga) flotando
  const petGeo = new THREE.BufferGeometry()
  const petPos = []; const petCol = []
  // Colores: restos orgánicos (marrón/amarillo/gris)
  const orgPalette = [[0.55,0.38,0.18],[0.68,0.55,0.28],[0.42,0.32,0.15],[0.75,0.70,0.45],[0.35,0.28,0.12]]
  for (let i = 0; i < 300; i++) {
    petPos.push((Math.random()-0.5)*5.1 - 0.8, 3.64+Math.random()*0.1, (Math.random()-0.5)*4.4)
    petCol.push(...orgPalette[Math.floor(Math.random()*orgPalette.length)])
  }
  petGeo.setAttribute('position', new THREE.Float32BufferAttribute(petPos, 3))
  petGeo.setAttribute('color', new THREE.Float32BufferAttribute(petCol, 3))
  const petFlakes = new THREE.Points(petGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.9 }))
  g.add(petFlakes)

  // Partículas sedimentadas en el fondo
  const sinkGeo = new THREE.BufferGeometry()
  const sinkPos = []; const sinkCol = []
  const sinkPalette = [[0.4,0.3,0.1],[0.3,0.25,0.1],[0.5,0.4,0.15]]
  for (let i = 0; i < 120; i++) {
    sinkPos.push((Math.random()-0.5)*5.0 - 0.8, 0.18+Math.random()*0.18, (Math.random()-0.5)*4.3)
    sinkCol.push(...sinkPalette[Math.floor(Math.random()*sinkPalette.length)])
  }
  sinkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sinkPos, 3))
  sinkGeo.setAttribute('color', new THREE.Float32BufferAttribute(sinkCol, 3))
  const sinkParticles = new THREE.Points(sinkGeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.75 }))
  g.add(sinkParticles)

  // ── LUZ ───────────────────────────────────────────────
  const tankLight = new THREE.PointLight(0x22aaff, 3.0, 9)
  tankLight.position.set(-0.8, 2.5, 0); g.add(tankLight)

  scene.add(g)
  return { group: g, waterMesh, glowRings, tankLight, laserRays, impellerBlades, petFlakes, sinkParticles, floatLayer }
}
