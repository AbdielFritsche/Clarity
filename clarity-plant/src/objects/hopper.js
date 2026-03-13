import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * hopper.js → ZONA DE CARGA / MESA DE RASPADO
 * Mesa de acero inox donde llega la vajilla sucia desde el salón.
 * Con pileta de pre-enjuague manual y zona de apilado.
 */
export function createHopper() {
  const g = new THREE.Group()
  g.position.set(-22, 0, 0)

  const ssM = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, metalness: 0.9, roughness: 0.1 })
  const drM = new THREE.MeshStandardMaterial({ color: 0x889aaa, metalness: 0.88, roughness: 0.15 })

  // Mesa de carga principal
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 1.4), ssM)
  top.position.y = 0.9; g.add(top)
  
  const backsplash = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 0.04), ssM)
  backsplash.position.set(0, 1.04, -0.72); g.add(backsplash)

  // Patas
  for (const [lx, lz] of [[-1.5,-0.6],[1.5,-0.6],[-1.5,0.6],[1.5,0.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), ssM)
    leg.position.set(lx, 0.45, lz); g.add(leg)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 }))
    foot.position.set(lx, -0.02, lz); g.add(foot)
  }

  // Pileta de pre-enjuague (izquierda)
  const sinkBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.58),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.12 }))
  sinkBody.position.set(-0.85, 0.78, 0); g.add(sinkBody)
  // Interior de la pileta
  const sinkWell = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x333a44, roughness: 0.3 }))
  sinkWell.position.set(-0.85, 0.8, 0); g.add(sinkWell)
  // Agua en la pileta
  const sinkWater = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.08, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x3388aa, transparent: true, opacity: 0.55, roughness: 0.05 }))
  sinkWater.position.set(-0.85, 0.88, 0); g.add(sinkWater)
  // Grifo
  const faucetArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }))
  faucetArm.rotation.z = Math.PI/2; faucetArm.position.set(-0.62, 1.08, -0.3); g.add(faucetArm)
  const faucetSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95 }))
  faucetSpout.position.set(-0.47, 1.0, -0.3); g.add(faucetSpout)

  // Ducha de pre-enjuague (pistola de agua)
  const hosePost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.85 }))
  hosePost.position.set(0.2, 1.1, -0.5); g.add(hosePost)

  // Cubo de residuos orgánicos
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.48, 12),
    new THREE.MeshStandardMaterial({ color: 0x556633, roughness: 0.8 }))
  bin.position.set(1.1, 0.24, 0.4); g.add(bin)
  const binLid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: 0x445522, roughness: 0.7 }))
  binLid.position.set(1.1, 0.5, 0.4); g.add(binLid)

  // Platos apilados esperando lavado
  for (let i = 0; i < 7; i++) {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.18, 0.022, 16),
      new THREE.MeshStandardMaterial({ color: 0xf0ede5, roughness: 0.3 })
    )
    plate.position.set(0.7 + (Math.random()-0.5)*0.1, 0.93 + i*0.024, (Math.random()-0.5)*0.15)
    g.add(plate)
  }

  // Luz puntual de área de trabajo
  const areaLight = new THREE.PointLight(0xfff5e0, 2.0, 5)
  areaLight.position.set(0, 2.5, 0); g.add(areaLight)

  scene.add(g)
  return g
}
