import * as THREE from 'three'
import { scene } from '../scene.js'

/**
 * dryer.js → ENJUAGUE FINAL + ZONA DE SECADO
 * Tanque de enjuague con agua caliente limpia + secadora de aire caliente.
 * La vajilla sale aquí lista y seca para el servicio.
 */
export function createRinseTank(posX = 20.5, posZ = 0) {
  const g = new THREE.Group()
  g.position.set(posX, 0, posZ)

  const ssM = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.12 })

  // Tanque de enjuague final (agua limpia)
  for (const [pos, geo] of [
    [[0, 1.4, -1.1],  new THREE.BoxGeometry(2.8, 2.8, 0.09)],
    [[-1.4, 1.4, 0],  new THREE.BoxGeometry(0.09, 2.8, 2.2)],
    [[ 1.4, 1.4, 0],  new THREE.BoxGeometry(0.09, 2.8, 2.2)],
    [[0, 0.07, 0],    new THREE.BoxGeometry(2.8, 0.1, 2.2)],
  ]) {
    const m = new THREE.Mesh(geo, ssM); m.position.set(...pos); g.add(m)
  }
  const frontW = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x88bbcc, metalness: 0.7, roughness: 0.08, transparent: true, opacity: 0.18 }))
  frontW.position.set(0, 1.4, 1.12); g.add(frontW)

  // Bordes
  for (const [w, d, x, z] of [[3.0,0.12,0,-1.1],[3.0,0.12,0,1.12],[0.12,2.4,-1.4,0],[0.12,2.4,1.4,0]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w,0.11,d),
      new THREE.MeshStandardMaterial({ color: 0xccccbb, metalness: 0.9, roughness: 0.07 }))
    rim.position.set(x, 2.83, z); g.add(rim)
  }

  // Agua limpia brillante
  const water = new THREE.Mesh(new THREE.BoxGeometry(2.65, 2.6, 2.05),
    new THREE.MeshStandardMaterial({ color: 0x22ccee, transparent: true, opacity: 0.55, roughness: 0.04 }))
  water.position.set(0, 1.4, 0); g.add(water)

  // Espuma de enjuague
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 1.95),
    new THREE.MeshStandardMaterial({ color: 0xddf5ff, transparent: true, opacity: 0.28, roughness: 0.95 }))
  foam.rotation.x = -Math.PI/2; foam.position.set(0, 2.76, 0); g.add(foam)

  // Boquillas de enjuague (spray heads)
  for (const [nx, nz] of [[-0.8, -0.5],[-0.8, 0.5],[0.8, -0.5],[0.8, 0.5]]) {
    const nozzle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x00aacc, metalness: 0.85 }))
    nozzle.position.set(nx, 2.7, nz); g.add(nozzle)
    // Mini tubo conectando nozzle al manifold
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6),
      new THREE.MeshStandardMaterial({ color: 0x335566, metalness: 0.9 }))
    tube.position.set(nx, 2.82, nz); g.add(tube)
  }

  // Manifold horizontal
  const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x335566, metalness: 0.9 }))
  manifold.rotation.z = Math.PI/2; manifold.position.set(0, 3.0, -0.5); g.add(manifold)

  const tankLight = new THREE.PointLight(0x00eeff, 2.5, 6)
  tankLight.position.set(0, 2.8, 0); g.add(tankLight)

  scene.add(g)
  return g
}

export function createCollectionZone(posX = 25, posZ = 0) {
  const g = new THREE.Group()
  g.position.set(posX, 0, posZ)

  const ssM = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, metalness: 0.88, roughness: 0.12 })
  const darkM = new THREE.MeshStandardMaterial({ color: 0x1a2530, metalness: 0.8 })

  // Mesa de salida de vajilla limpia
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.4), ssM)
  top.position.y = 2.32; g.add(top)
  for (const [lx, lz] of [[-0.95,-0.6],[0.95,-0.6],[-0.95,0.6],[0.95,0.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.32, 0.04), ssM)
    leg.position.set(lx, 1.16, lz); g.add(leg)
  }

  // Secadora de aire caliente (blower)
  const blower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.8), darkM)
  blower.position.set(0, 1.4, 0); g.add(blower)
  // Rejilla de salida de aire
  const grill = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x334455, wireframe: true }))
  grill.position.set(0, 1.74, 0); g.add(grill)
  // Luz cálida del blower
  const blowLight = new THREE.PointLight(0xffee88, 1.8, 4)
  blowLight.position.set(0, 2.0, 0); g.add(blowLight)

  // Platos limpios apilados (vajilla ya lavada)
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f4, roughness: 0.2, metalness: 0.05 })
  for (let pi = 0; pi < 10; pi++) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.02, 16), plateMat)
    plate.position.set((Math.random()-0.5)*0.6, 2.38+pi*0.022, (Math.random()-0.5)*0.4); g.add(plate)
    // Decoración del borde
    const decor = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.006, 5, 20),
      new THREE.MeshStandardMaterial({ color: 0x334488, metalness: 0.7, roughness: 0.2 }))
    decor.rotation.x = Math.PI/2; decor.position.set((Math.random()-0.5)*0.6, 2.39+pi*0.022, (Math.random()-0.5)*0.4)
    g.add(decor)
  }

  // Carrito de traslado al comedor
  const cartMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.82, roughness: 0.2 })
  const cart = new THREE.Group(); cart.position.set(0.5, -0.5, 1.2)
  const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), cartMat)
  cartBody.position.y = 0.55; cart.add(cartBody)
  for (const [cx, cz] of [[-0.3,-0.2],[0.3,-0.2],[-0.3,0.2],[0.3,0.2]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.032, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }))
    w.rotation.x = Math.PI/2; w.position.set(cx, 0.062, cz); cart.add(w)
  }
  g.add(cart)

  scene.add(g)
  return g
}
