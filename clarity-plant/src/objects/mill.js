import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * mill.js → TÚNEL DE LAVADO INDUSTRIAL (Conveyor Dishwasher)
 *
 * Posición: posX = -9 en mundo.
 * El túnel cubre X local 0..17 = mundo -9..8
 * La banda de transporte pasa POR DENTRO a altura y=1.1
 * (pared lateral con hueco inferior para dejar pasar la banda)
 *
 * Sin marcos naranja — solo acero inox y ventanas de vidrio.
 */
export function createMill(posX = -9.0, posZ = 0) {
  const g = new THREE.Group()
  g.position.set(posX, 0, posZ)

  const ssM   = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.12 })
  const darkM  = new THREE.MeshStandardMaterial({ color: 0x1e2530, metalness: 0.85, roughness: 0.2  })
  const glassM = new THREE.MeshStandardMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.20, roughness: 0.0, metalness: 0.6 })
  const inoxM  = new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.92, roughness: 0.09 })

  const L   = 17.0   // largo del túnel en coords locales
  const MX  = L / 2  // centro X = 8.5 local

  // ── TECHO ─────────────────────────────────────────────
  const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 2.2), ssM)
  top.position.set(MX, 3.0, 0); g.add(top)

  // ── PAREDES LATERALES con hueco para la banda ─────────
  // La banda va a y=1.1 (mundo) = y=1.1 (local, porque posY=0)
  // Pared: parte superior (y de 1.35 a 3.0) + zócalo (y de 0 a 0.6)
  for (const z of [-1.1, 1.1]) {
    // Sección superior de la pared
    const wallUp = new THREE.Mesh(new THREE.BoxGeometry(L, 1.65, 0.09), ssM)
    wallUp.position.set(MX, 2.17, z); g.add(wallUp)
    // Zócalo inferior (debajo de la banda)
    const wallLow = new THREE.Mesh(new THREE.BoxGeometry(L, 0.6, 0.09), ssM)
    wallLow.position.set(MX, 0.30, z); g.add(wallLow)
  }

  // ── BASE / BANDEJA INFERIOR ───────────────────────────
  const base = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.1, 2.35), darkM)
  base.position.set(MX, 0.65, 0); g.add(base)

  // ── TAPAS DE ENTRADA Y SALIDA ─────────────────────────
  for (const ex of [0, L]) {
    const endCap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.38, 2.2), ssM)
    endCap.position.set(ex, 1.88, 0); g.add(endCap)
    // Cortina de agua (abertura inferior para la banda)
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.88, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.18, roughness: 0.1 }))
    curtain.position.set(ex, 1.54, 0); g.add(curtain)
  }

  // ── PATAS ─────────────────────────────────────────────
  for (const [px, pz] of [[0.5,-0.82],[L-0.5,-0.82],[0.5,0.82],[L-0.5,0.82]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), ssM)
    leg.position.set(px, 0.36, pz); g.add(leg)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }))
    foot.position.set(px, -0.02, pz); g.add(foot)
  }

  // ── VENTANAS DE INSPECCIÓN (inox + vidrio, sin naranja) ─
  for (const [wx, wz] of [
    [3.0, 1.11],[7.0, 1.11],[12.0, 1.11],[16.0, 1.11],
    [3.0,-1.11],[7.0,-1.11],[12.0,-1.11],[16.0,-1.11]
  ]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.05), inoxM)
    trim.position.set(wx, 2.2, wz + (wz > 0 ? 0.025 : -0.025)); g.add(trim)
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.96, 0.05), glassM)
    win.position.set(wx, 2.2, wz); g.add(win)
  }

  // ── BRAZOS ROCIADORES (3 zonas) ───────────────────────
  const sprayMat = new THREE.MeshStandardMaterial({ color: 0x336677, metalness: 0.92, roughness: 0.1 })
  const sprayArms = []

  for (const zoneX of [3.5, 8.5, 13.5]) {
    // Brazo superior (gira en animación)
    const armTop = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.82, 8), sprayMat)
    armTop.rotation.z = Math.PI / 2
    armTop.position.set(zoneX, 2.88, 0); g.add(armTop); sprayArms.push(armTop)

    // Brazo inferior
    const armBot = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.82, 8), sprayMat)
    armBot.rotation.z = Math.PI / 2
    armBot.position.set(zoneX, 1.28, 0); g.add(armBot); sprayArms.push(armBot)

    // Nozzles
    for (const [armY] of [[2.88],[1.28]]) {
      for (const nz of [-0.65,-0.2,0.2,0.65]) {
        const nozzle = new THREE.Mesh(new THREE.SphereGeometry(0.038, 7, 6),
          new THREE.MeshStandardMaterial({ color: 0x00aacc, metalness: 0.85 }))
        nozzle.position.set(zoneX, armY, nz); g.add(nozzle)
      }
    }

    // Manifold vertical lateral
    const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.65, 8), sprayMat)
    manifold.position.set(zoneX, 2.06, -1.02); g.add(manifold)
  }

  // ── PANEL DE CONTROL (extremo derecho) ───────────────
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.52), darkM)
  panel.position.set(L + 0.06, 2.42, 0.88); g.add(panel)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x002244, transparent: true, opacity: 0.9 }))
  screen.rotation.y = -Math.PI / 2
  screen.position.set(L + 0.02, 2.55, 0.88); g.add(screen)
  for (const [py, col] of [[2.24,0x00ff55],[2.14,0xffcc00],[2.04,0xff3300]]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshBasicMaterial({ color: col }))
    btn.position.set(L + 0.05, py, 1.04); g.add(btn)
  }

  // ── BOMBA DE CIRCULACIÓN ──────────────────────────────
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.48, 12), darkM)
  pump.rotation.z = Math.PI / 2
  pump.position.set(MX, 0.26, -1.38); g.add(pump)

  // ── VAPOR / GOTAS ANIMADAS ────────────────────────────
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xaaccee, transparent: true, opacity: 0.50 })
  const steamParticles = []
  for (let i = 0; i < 28; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random()*0.022, 5, 4), dropMat)
    const sy = 1.15 + Math.random() * 1.6
    drop.position.set(0.8 + Math.random() * (L - 1.6), sy, (Math.random()-0.5)*1.5)
    drop.userData.vy     = 0.38 + Math.random() * 0.45
    drop.userData.startY = sy
    g.add(drop); steamParticles.push(drop)
  }

  // ── LUZ INTERIOR ─────────────────────────────────────
  const tLight = new THREE.PointLight(0xaaddff, 2.6, 10)
  tLight.position.set(MX, 3.2, 0); g.add(tLight)

  scene.add(g)

  const rotorDrum  = sprayArms[0]
  const blades     = sprayArms
  const augerShaft = sprayArms[1]
  const waterDrops = steamParticles

  return { group: g, rotorDrum, blades, augerShaft, waterDrops, sprayArms, steamParticles }
}
