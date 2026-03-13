import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * prewash.js → TANQUE DE PRE-REMOJO
 * Tina de acero inox con agua caliente sucia donde los platos
 * se sumergen brevemente para ablandar restos orgánicos.
 */
export function createPrewash() {
  const g = new THREE.Group()
  g.position.set(-15, 0, 0)

  const ssM = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.14 })

  // Cuerpo del tanque
  for (const [pos, geo] of [
    [[0, 1.3, -1.5],  new THREE.BoxGeometry(4.8, 2.6, 0.08)], // pared trasera
    [[-2.4, 1.3, 0],  new THREE.BoxGeometry(0.08, 2.6, 3.0)], // pared izq
    [[ 2.4, 1.3, 0],  new THREE.BoxGeometry(0.08, 2.6, 3.0)], // pared der
    [[0, 0.08, 0],    new THREE.BoxGeometry(4.8, 0.1, 3.0)],  // fondo
  ]) {
    const mesh = new THREE.Mesh(geo, ssM)
    mesh.position.set(...pos); g.add(mesh)
  }
  // Pared frontal semitransparente
  const front = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.6, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.18 }))
  front.position.set(0, 1.3, 1.52); g.add(front)

  // Bordes/rimm superiores
  for (const [w, d, x, z] of [[5.0, 0.1, 0, -1.5],[5.0, 0.1, 0, 1.55],[0.1, 3.1, -2.4, 0],[0.1, 3.1, 2.4, 0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d),
      new THREE.MeshStandardMaterial({ color: 0xccccbb, metalness: 0.92, roughness: 0.06 }))
    rim.position.set(x, 2.65, z); g.add(rim)
  }

  // Agua sucia caliente (marrón cálido)
  const water = new THREE.Mesh(new THREE.BoxGeometry(4.65, 2.3, 2.85),
    new THREE.MeshStandardMaterial({ color: 0x7a6030, roughness: 0.15, transparent: true, opacity: 0.78 }))
  water.position.set(0, 1.25, 0); g.add(water)

  // Espuma superficial
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.75),
    new THREE.MeshStandardMaterial({ color: 0xbbaa88, transparent: true, opacity: 0.3, roughness: 0.9 }))
  foam.rotation.x = -Math.PI/2; foam.position.set(0, 2.45, 0); g.add(foam)

  // Resistencias calefactoras
  for (const [zp, c] of [[-0.8, 0xcc4400],[0, 0xcc4400],[0.8, 0xcc4400]]) {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 10),
      new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.1 }))
    coil.rotation.z = Math.PI/2; coil.position.set(0, 0.35, zp); g.add(coil)
  }

  // Paletas agitadoras (para mover la vajilla)
  const prewashAgitators = []
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3a5566, metalness: 0.8 })
  for (const ax of [-1.0, 1.0]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.9 }))
    shaft.position.set(ax, 1.4, 0); g.add(shaft)
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.8 }))
    motor.position.set(ax, 2.85, 0); g.add(motor)

    for (const by of [0.6, 1.5]) {
      for (let i = 0; i < 4; i++) {
        const piv = new THREE.Object3D()
        piv.position.set(ax, by, 0)
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.14), padMat)
        blade.position.set(0.55, 0, 0); piv.add(blade)
        piv.rotation.y = (i/4)*Math.PI*2
        g.add(piv)
        prewashAgitators.push(piv)
      }
    }
  }

  // Termómetro / sonda de temperatura
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9 }))
  probe.position.set(2.0, 1.6, -1.3); g.add(probe)
  const probeTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4400 }))
  probeTip.position.set(2.0, 1.2, -1.3); g.add(probeTip)

  // Válvula de drenaje
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: 0xe05a00, metalness: 0.7 }))
  drain.position.set(0, -0.18, 0.6); g.add(drain)

  // Luz cálida del agua
  const wLight = new THREE.PointLight(0xffaa44, 2.2, 7)
  wLight.position.set(0, 2.0, 0); g.add(wLight)

  scene.add(g)
  return { prewashAgitators }
}
