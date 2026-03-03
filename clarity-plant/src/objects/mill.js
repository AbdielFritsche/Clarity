import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * mill.js — Granulador Húmedo (Wet Granulator) — Estación 1
 *
 * Geometría basada en maquinaria real de reciclaje PET:
 *  - Cuerpo rectangular de acero con costillas verticales de refuerzo
 *  - Tolva de alimentación con aro de seguridad naranja y rejilla
 *  - Ventana de inspección lateral con marco naranja y cruz de barras
 *  - Rotor horizontal con 8 cuchillas giratorias
 *  - 5 cuchillas estáticas fijas en las paredes internas
 *  - Manifold de agua con 4 nozzles de aspersión
 *  - Tornillo sinfín (auger) de salida lateral con carcasa, espiras y brida
 *  - Panel de control con pantalla, 3 botones LED y motor lateral
 *  - Bandeja de drenaje inferior con tubo de desagüe
 *  - 4 patas con ajustadores de nivelación y pies naranjas
 *  - 18 gotas de agua animadas dentro de la cámara
 *
 * Exporta: { group, rotorDrum, blades, augerShaft, waterDrops }
 * La simulación rota rotorDrum, blades y augerShaft cada frame.
 */
export function createMill() {
  const group = new THREE.Group()
  group.position.set(1.5, 0, 0)

  // ── Materiales ────────────────────────────────────────
  const matSteel  = new THREE.MeshStandardMaterial({ color: 0x3a4a55, metalness: 0.88, roughness: 0.18 })
  const matDark   = new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.92, roughness: 0.14 })
  const matOrange = new THREE.MeshStandardMaterial({ color: 0xe05a00, metalness: 0.72, roughness: 0.28 })
  const matBlade  = new THREE.MeshStandardMaterial({ color: 0xd0e0f0, metalness: 1.0,  roughness: 0.04 })

  // ── Cuerpo principal rectangular ─────────────────────
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 2.1), matSteel)
  body.position.y = 0.9
  body.castShadow = true
  group.add(body)

  // ── Costillas verticales de refuerzo (frente y atrás) ─
  for (const xi of [-0.9, 0, 0.9]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.09), matDark)
    rib.position.set(xi, 0.9, 1.07)
    group.add(rib)
    const rib2 = rib.clone()
    rib2.position.z = -1.07
    group.add(rib2)
  }

  // ── Tapa superior ─────────────────────────────────────
  const topLid = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 2.2), matDark)
  topLid.position.y = 2.48
  group.add(topLid)

  // ── Tolva de alimentación superior ───────────────────
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.0), matDark)
  hopper.position.set(0, 3.02, 0)
  group.add(hopper)

  const hopperRim = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 1.15), matOrange)
  hopperRim.position.y = 3.48
  group.add(hopperRim)

  // Rejilla de seguridad
  for (let xi = -0.45; xi <= 0.45; xi += 0.22) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 1.0), matDark)
    bar.position.set(xi, 3.49, 0)
    group.add(bar)
  }

  // ── Ventana de inspección lateral izquierda ───────────
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 1.05), matOrange)
  winFrame.position.set(-1.33, 1.1, 0)
  group.add(winFrame)

  const winGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.95, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.30, roughness: 0 })
  )
  winGlass.position.set(-1.33, 1.1, 0)
  group.add(winGlass)

  const wBarH = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 1.0), matOrange)
  wBarH.position.set(-1.33, 1.1, 0)
  group.add(wBarH)

  const wBarV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.04), matOrange)
  wBarV.position.set(-1.33, 1.1, 0)
  group.add(wBarV)

  // ── Rotor horizontal (tambor animado) ─────────────────
  const rotorDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.30, 1.82, 16),
    new THREE.MeshStandardMaterial({ color: 0x4a5c6a, metalness: 0.9, roughness: 0.12 })
  )
  rotorDrum.rotation.z = Math.PI / 2
  rotorDrum.position.set(0, 1.0, 0)
  group.add(rotorDrum)

  // ── 8 Cuchillas del rotor ─────────────────────────────
  const blades = []
  for (let i = 0; i < 8; i++) {
    const pivot = new THREE.Object3D()
    pivot.position.set(0, 1.0, 0)

    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.055, 0.18), matBlade)
    blade.position.set(0, 0.32, 0)
    pivot.add(blade)

    pivot.rotation.x = (i / 8) * Math.PI * 2
    group.add(pivot)
    blades.push(pivot)
  }

  // ── Cuchillas estáticas en la pared interna ───────────
  for (let i = 0; i < 5; i++) {
    const ck = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xb0c4d8, metalness: 0.95 })
    )
    ck.position.set(0, 0.44 + i * 0.2, 1.0)
    group.add(ck)
  }

  // ── Manifold de agua + 4 nozzles ──────────────────────
  const manifold = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.07, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x335566, metalness: 0.9 })
  )
  manifold.position.set(0, 2.52, 0.82)
  group.add(manifold)

  for (let xi = -0.75; xi <= 0.75; xi += 0.5) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.34, 6),
      new THREE.MeshStandardMaterial({ color: 0x335566, metalness: 0.9 })
    )
    pipe.position.set(xi, 2.36, 0.82)
    group.add(pipe)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 7, 7),
      new THREE.MeshStandardMaterial({ color: 0x00bbdd, metalness: 0.85 })
    )
    head.position.set(xi, 2.18, 0.82)
    group.add(head)
  }

  // ── Tornillo sinfín (auger) de salida — lado derecho ──
  const augerHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 2.0, 12),
    matSteel
  )
  augerHousing.rotation.z = Math.PI / 2
  augerHousing.position.set(1.95, 0.3, 0)
  group.add(augerHousing)

  const augerFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.09, 12),
    matOrange
  )
  augerFlange.rotation.z = Math.PI / 2
  augerFlange.position.set(3.0, 0.3, 0)
  group.add(augerFlange)

  const augerShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.85 })
  )
  augerShaft.rotation.z = Math.PI / 2
  augerShaft.position.set(1.95, 0.3, 0)
  group.add(augerShaft)

  // Espiras del tornillo (discos inclinados)
  for (let xi = 0; xi < 1.8; xi += 0.22) {
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.88 })
    )
    fin.rotation.z = Math.PI / 2
    fin.rotation.x = (xi / 1.8) * Math.PI * 2
    fin.position.set(1.0 + xi, 0.3, 0)
    group.add(fin)
  }

  // ── Panel de control derecho ──────────────────────────
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.85, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.5 })
  )
  panel.position.set(1.35, 1.9, 0.65)
  group.add(panel)

  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x00cc44, transparent: true, opacity: 0.55 })
  )
  screenGlow.rotation.y = -Math.PI / 2
  screenGlow.position.set(1.36, 2.1, 0.65)
  group.add(screenGlow)

  for (const [py, col] of [[1.78, 0x00ff44], [1.63, 0xffcc00], [1.48, 0xff3300]]) {
    const btn = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 8, 8),
      new THREE.MeshBasicMaterial({ color: col })
    )
    btn.position.set(1.38, py, 0.72)
    group.add(btn)
  }

  // Motor lateral
  const motorBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.85 })
  )
  motorBox.position.set(1.5, 1.85, -0.9)
  group.add(motorBox)

  const motorFan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.8 })
  )
  motorFan.rotation.z = Math.PI / 2
  motorFan.position.set(2.06, 1.85, -0.9)
  group.add(motorFan)

  // ── Bandeja de drenaje inferior ───────────────────────
  const drainPan = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.09, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x233344, metalness: 0.85 })
  )
  drainPan.position.set(0.15, -0.7, 0)
  group.add(drainPan)

  const drainPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.32, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a5566, metalness: 0.9 })
  )
  drainPipe.position.set(0, -0.88, 0.65)
  group.add(drainPipe)

  // ── Patas con ajustadores y pies naranjas ─────────────
  for (const [px, pz] of [[-0.95, -0.78], [0.95, -0.78], [-0.95, 0.78], [0.95, 0.78]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.13), matDark)
    leg.position.set(px, -0.36, pz)
    group.add(leg)

    const adjuster = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 8), matDark)
    adjuster.position.set(px, -0.76, pz)
    group.add(adjuster)

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 8), matOrange)
    foot.position.set(px, -0.83, pz)
    group.add(foot)
  }

  // ── Gotas de agua animadas ────────────────────────────
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x44aadd, transparent: true, opacity: 0.65 })
  const waterDrops = []
  for (let i = 0; i < 18; i++) {
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + Math.random() * 0.03, 5, 5),
      dropMat
    )
    const sy = 0.45 + Math.random() * 1.6
    drop.position.set((Math.random() - 0.5) * 2.0, sy, (Math.random() - 0.5) * 1.1)
    drop.userData.vy     = -(0.38 + Math.random() * 0.45)
    drop.userData.startY = sy
    group.add(drop)
    waterDrops.push(drop)
  }

  // ── Luz de acento ──────────────────────────────────────
  const light = new THREE.PointLight(0xff8833, 2.2, 5)
  light.position.set(0, 4, 0)
  group.add(light)

  scene.add(group)
  return { group, rotorDrum, blades, augerShaft, waterDrops }
}
