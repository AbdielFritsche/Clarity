import * as THREE from 'three'
import { scene, camera, renderer, stageLights } from './scene.js'
import { updateBatches } from './objects/batches.js'

/**
 * simulation.js
 * Logica dinamica: biocarga, HUD, animaciones, water-savings panel, loop.
 */

// DOM refs
const bioValEl   = document.getElementById('bioVal')
const bioFillEl  = document.getElementById('bioFill')
const lotesEl    = document.getElementById('lotesVal')
const purezaEl   = document.getElementById('pureza')
const purezaFill = document.getElementById('purezaFill')
const tempEl     = document.getElementById('tempVal')
const alertEl    = document.getElementById('alertBanner')
const stageEls   = [0,1,2,3,4,5].map(i => document.getElementById('s' + i))

// Water savings DOM
const clarityBarEl    = document.getElementById('clarityBar')
const standardBarEl   = document.getElementById('standardBar')
const claritySavedEl  = document.getElementById('claritySaved')
const totalSavedEl    = document.getElementById('totalSaved')

// Simulation constants
const BIOCARGA_MAX    = 30000
const BIOCARGA_RATE   = 400
const RESET_THRESHOLD = 0.9

// Water simulation (L per batch)
const STANDARD_WATER_PER_BATCH = 18.0   // sin sensor — cambio completo frecuente
const CLARITY_WATER_PER_BATCH  = 3.2    // con sensor — solo cuando se necesita

let biocarga    = 100
let lotes       = 0
let activeStage = 0
let stageTimer  = 0
let laserTimer  = 0
let totalSavedLiters = 0

stageEls[0].classList.add('active')

// Steam particles
const PARTICLE_COUNT = 200
const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
const particleData = []
const STEAM_SOURCES = [0, 10.5]

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const sx = STEAM_SOURCES[i % 2]
  particlePositions[i*3]   = sx + (Math.random() - 0.5) * 2
  particlePositions[i*3+1] = Math.random() * 5 + 2
  particlePositions[i*3+2] = (Math.random() - 0.5) * 2
  particleData.push({ vy: Math.random() * 0.5 + 0.2, sx })
}

const particleGeo = new THREE.BufferGeometry()
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
const particles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({ color: 0xaaddff, size: 0.14, transparent: true, opacity: 0.45 })
)
scene.add(particles)

// Piping
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3a6a7a, metalness: 0.9, roughness: 0.15 })
for (const [x, y] of [[-7.5, 1.5], [-2.5, 1.5], [2.5, 1.5], [8, 1.5]]) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.5, 10), pipeMat)
  pipe.rotation.z = Math.PI / 2
  pipe.position.set(x, y, 0.5)
  scene.add(pipe)
}

// HUD helpers
function updateHUD(pct, t) {
  bioValEl.textContent = Math.floor(biocarga).toLocaleString()
  bioFillEl.style.width = (pct * 100).toFixed(1) + '%'
  const bioColor = pct < 0.3 ? '#00f5ff' : pct < 0.7 ? '#ffcc00' : '#ff3300'
  bioValEl.style.color = bioColor
  bioFillEl.style.background = bioColor
  alertEl.classList.toggle('visible', pct > 0.8)

  const pureza = Math.max(96, 99.8 - pct * 3)
  purezaEl.textContent = pureza.toFixed(1) + '%'
  purezaFill.style.width = pureza + '%'
  const purezaColor = pureza > 98 ? '#00ff88' : pureza > 96 ? '#ffcc00' : '#ff3300'
  purezaEl.style.color = purezaColor
  purezaFill.style.background = purezaColor

  lotesEl.textContent = lotes
  const temp = 72.4 + Math.sin(t * 0.3) * 1.2 + (Math.random() - 0.5) * 0.15
  tempEl.textContent = temp.toFixed(1)
}

// Water savings panel update
function updateWaterPanel(pct) {
  // Clarity uses less water as biocarga is managed intelligently
  // When biocarga is low, water is being reused; only refreshes when sensor detects threshold
  const clarityUsage  = CLARITY_WATER_PER_BATCH * (0.8 + pct * 0.4)
  const standardUsage = STANDARD_WATER_PER_BATCH

  const clarityPct  = (clarityUsage  / standardUsage) * 100
  const standardPct = 100

  clarityBarEl.style.width  = clarityPct.toFixed(1) + '%'
  standardBarEl.style.width = standardPct + '%'
  claritySavedEl.textContent = clarityUsage.toFixed(1) + ' L/lote'

  const savingPct = ((standardUsage - clarityUsage) / standardUsage * 100).toFixed(0)
  totalSavedEl.textContent = totalSavedLiters.toFixed(0) + ' L  (-' + savingPct + '%)'
}

export function startSimulation({ waterMesh, glowRing, tankLight, laserRay, bubbles, gear, batches }) {
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)
    const dt = clock.getDelta()
    const t  = clock.getElapsedTime()

    // Stage cycling
    stageTimer += dt
    if (stageTimer > 2.5) {
      stageTimer = 0
      activeStage = (activeStage + 1) % 6
      stageEls.forEach((el, i) => el.classList.toggle('active', i === activeStage))
      if (activeStage === 5) {
        lotes++
        // Accumulate water savings per completed batch
        totalSavedLiters += STANDARD_WATER_PER_BATCH - CLARITY_WATER_PER_BATCH
      }
    }

    // Biocarga
    biocarga = Math.min(biocarga + BIOCARGA_RATE * dt, BIOCARGA_MAX)
    const pct = biocarga / BIOCARGA_MAX
    if (biocarga >= BIOCARGA_MAX * RESET_THRESHOLD) biocarga = 100

    // Water color
    if (pct < 0.3)      waterMesh.material.color.setHex(0x1199dd)
    else if (pct < 0.7) waterMesh.material.color.setHex(0xaa8800)
    else                waterMesh.material.color.setHex(0xaa2200)

    // Laser
    laserTimer += dt
    if (laserTimer > 1.5 + Math.random()) {
      laserTimer = 0
      laserRay.material.opacity = 0.9
      setTimeout(() => { laserRay.material.opacity = 0 }, 120)
    }

    glowRing.material.opacity = 0.06 + Math.sin(t * 2) * 0.05
    tankLight.intensity = 2.5 + Math.sin(t * 3) * 0.6

    gear.rotation.y += 3 * dt
    gear.rotation.z += 2 * dt

    for (const b of bubbles) {
      b.position.y += b.userData.speed * dt
      b.position.x = Math.cos(b.userData.angle + t * 0.2) * b.userData.r
      b.position.z = Math.sin(b.userData.angle + t * 0.2) * b.userData.r
      if (b.position.y > 3.5) b.position.y = b.userData.startY
    }

    const pos = particles.geometry.attributes.position.array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i*3+1] += particleData[i].vy * dt
      pos[i*3]   += Math.sin(t + i) * 0.002
      if (pos[i*3+1] > 8) {
        pos[i*3+1] = 2
        pos[i*3]   = particleData[i].sx + (Math.random() - 0.5) * 2
        pos[i*3+2] = (Math.random() - 0.5) * 2
      }
    }
    particles.geometry.attributes.position.needsUpdate = true

    stageLights.forEach((l, i) => {
      l.intensity = i === activeStage % stageLights.length
        ? 3 + Math.sin(t * 5) * 0.8
        : 0.5
    })

    updateBatches(batches, dt, t)

    // Slow camera orbit
    camera.position.x = Math.sin(t * 0.04) * 6
    camera.position.z = 16 + Math.cos(t * 0.04) * 3
    camera.position.y = 8  + Math.sin(t * 0.02) * 1
    camera.lookAt(0, 1.5, 0)

    updateHUD(pct, t)
    updateWaterPanel(pct)
    renderer.render(scene, camera)
  }

  animate()
}
