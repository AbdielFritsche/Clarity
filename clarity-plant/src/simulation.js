import * as THREE from 'three'
import { scene, camera, renderer, stageLights, controls } from './scene.js'
import { updateBatches } from './objects/batches.js'

// ── DOM refs ──────────────────────────────────────────
const bioValEl       = document.getElementById('bioVal')
const bioFillEl      = document.getElementById('bioFill')
const cyclosEl       = document.getElementById('lotesVal')
const purezaEl       = document.getElementById('pureza')
const purezaFill     = document.getElementById('purezaFill')
const tiempoValEl    = document.getElementById('tiempoVal')
const alertEl        = document.getElementById('alertBanner')
const stageEls       = [0,1,2,3,4,5].map(i => document.getElementById('s'+i))

const aguaCiegoEl    = document.getElementById('aguaCiego')
const aguaClarityEl  = document.getElementById('aguaClarity')
const aguaClarityBar = document.getElementById('aguaClarityBar')
const purgasCiegoEl  = document.getElementById('purgasCiego')
const purgasClarEl   = document.getElementById('purgasClarity')
const dosisCiegoEl   = document.getElementById('dosisCiego')
const dosisClarEl    = document.getElementById('dosisClarity')
const savedLEl       = document.getElementById('totalSavedLiters')
const savedPctEl     = document.getElementById('totalSavedPct')
const quimSavedEl    = document.getElementById('quimSaved')
const lphCiegoEl     = document.getElementById('lphCiego')
const lphClarEl      = document.getElementById('lphClarity')

// ══════════════════════════════════════════════════════
//  MODELO MATEMÁTICO — LAVAVAJILLAS INDUSTRIAL
//
//  REFERENCIA REAL:
//    • Consumo estándar conveyor:  ~8 L/min = 480 L/h  (agua de purga/renovación)
//    • Consumo eficiente:           7–15 L / ciclo de lavado
//    • Un turno de 8h sin sensor:  ~3 840 L de agua de purga
//    • Clarity reduce agua 25–30 % y químicos 20–25 %
//
//  SIMPLIFICACIÓN DEL MODELO:
//    El agua "de trabajo" dentro del tanque es la misma en ambos casos.
//    El ahorro viene de POSTERGAR las purgas (cambios de baño):
//      - Ciego:   purga cada 2 h fijas  (480 L/purga × 4 purgas/turno = 1 920 L)
//      - Clarity: purga solo cuando la biocarga supera el umbral real
//                 → ~3 purgas/turno → ahorro natural del 25–28 %
//
//  CONSUMO POR PURGA:
//    Tanque estándar ~300 L + enjuague de renovación ~180 L = 480 L / purga
//    (coherente con 8 L/min × 60 min por baño completo)
// ══════════════════════════════════════════════════════

const BIOCARGA_MAX     = 30000
const BIOCARGA_INICIAL = 150
const TASA_CRECIMIENTO = 0.00022

const UMBRAL_DOSIFICAR = 600
const UMBRAL_PURGAR    = 3500

const AGUA_POR_PURGA   = 480    // L por purga (= 8 L/min × 60 min renovación)
const VOLUMEN_TANQUE   = 3000
const EFECTO_QUIMICO   = 0.62

// Ciego: ciclo fijo cada 2 h purga, dosis cada 40 min (sobredosis preventiva)
const CADA_DOSIS_CIEGA = 2400   // 40 min en tiempo sim
const CADA_PURGA_CIEGA = 7200   // 2 h en tiempo sim

// Clarity: cooldown mínimo de 45 min entre purgas (evita purgas en cascada)
const COOLDOWN_PURGA   = 2700   // 45 min
const INTERVALO_SENSOR = 240    // lectura cada 4 min
const VELOCIDAD_SIM    = 1800   // 1 s real = 30 min sim

// ── Estado ────────────────────────────────────────────
let t_simulado = 0
let ciclos = 0, activeStage = 0, stageTimer = 0

let biocarga = BIOCARGA_INICIAL
let cl_agua = 0, cl_quim = 0, cl_purgas = 0, cl_dosis = 0
let cl_ultima_purga = -COOLDOWN_PURGA

let ci_agua = 0, ci_quim = 0, ci_purgas = 0, ci_dosis = 0
let ci_ultima_purga = 0, ci_ultima_dosis = 0

stageEls[0]?.classList.add('active')

// ── Loop principal ────────────────────────────────────
export function startSimulation({
  waterMesh, glowRings, tankLight, laserRays, impellerBlades,
  rotorDrum, blades, augerShaft, waterDrops, batches,
  trommelDrum, prewashAgitators, belts,
  petFlakes, sinkParticles, floatLayer
}) {
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)
    const dt_real = clock.getDelta()
    const t_real  = clock.getElapsedTime()
    const dt_sim  = dt_real * VELOCIDAD_SIM
    t_simulado   += dt_sim

    // ── 1. CLARITY — lógica basada en sensor ──────────
    biocarga += TASA_CRECIMIENTO * biocarga * (1 - biocarga / BIOCARGA_MAX) * dt_sim
    biocarga  = Math.max(50, biocarga)

    if (biocarga >= UMBRAL_PURGAR) {
      if (t_simulado - cl_ultima_purga >= COOLDOWN_PURGA) {
        cl_agua += AGUA_POR_PURGA
        cl_purgas++
        cl_ultima_purga = t_simulado
        biocarga *= (1 - (AGUA_POR_PURGA / VOLUMEN_TANQUE) * 0.85)
        cl_quim  += 1.0; cl_dosis++
        biocarga *= (1 - EFECTO_QUIMICO)
      }
    } else if (biocarga >= UMBRAL_DOSIFICAR) {
      const f = Math.max(0.15, (biocarga - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR))
      cl_quim  += f * dt_sim / 60   // acumulamos en unidades proporcionales al tiempo
      cl_dosis++
      biocarga *= (1 - EFECTO_QUIMICO * f * dt_sim / 120)
    }
    biocarga = Math.max(50, biocarga)

    // ── 2. CIEGO — ciclo fijo calendario ─────────────
    if (t_simulado - ci_ultima_dosis >= CADA_DOSIS_CIEGA) {
      ci_quim += 1.3; ci_dosis++; ci_ultima_dosis = t_simulado
    }
    if (t_simulado - ci_ultima_purga >= CADA_PURGA_CIEGA) {
      ci_agua += AGUA_POR_PURGA; ci_purgas++; ci_ultima_purga = t_simulado
    }

    // ── 3. HUD ────────────────────────────────────────
    const hrs = t_simulado / 3600
    if (tiempoValEl) tiempoValEl.textContent = hrs.toFixed(1)

    if (bioValEl)  bioValEl.textContent  = Math.floor(biocarga).toLocaleString()
    if (bioFillEl) bioFillEl.style.width = ((biocarga / BIOCARGA_MAX) * 100).toFixed(1) + '%'
    const bioCol = biocarga < UMBRAL_DOSIFICAR ? '#00f5ff' : biocarga < UMBRAL_PURGAR ? '#ffcc00' : '#ff3300'
    if (bioValEl)  bioValEl.style.color  = bioCol
    if (bioFillEl) bioFillEl.style.background = bioCol
    if (alertEl)   alertEl.classList.toggle('visible', biocarga >= UMBRAL_PURGAR)

    const higiene = Math.max(96, 99.9 - (biocarga / UMBRAL_PURGAR) * 0.5)
    if (purezaEl)   purezaEl.textContent   = higiene.toFixed(1) + '%'
    if (purezaFill) purezaFill.style.width = higiene.toFixed(1) + '%'
    if (purezaEl)   purezaEl.style.color   = higiene > 99 ? '#00ff88' : '#ffcc00'

    // Agua acumulada
    if (aguaCiegoEl)   aguaCiegoEl.textContent   = Math.floor(ci_agua).toLocaleString() + ' L'
    if (aguaClarityEl) aguaClarityEl.textContent = Math.floor(cl_agua).toLocaleString() + ' L'
    const barRatio = ci_agua > 0 ? Math.min(100, (cl_agua / ci_agua) * 100) : 0
    if (aguaClarityBar) aguaClarityBar.style.width = barRatio.toFixed(1) + '%'

    // Purgas y dosis
    if (purgasCiegoEl) purgasCiegoEl.textContent = ci_purgas
    if (purgasClarEl)  purgasClarEl.textContent  = cl_purgas
    if (dosisCiegoEl)  dosisCiegoEl.textContent  = ci_dosis
    if (dosisClarEl)   dosisClarEl.textContent   = cl_dosis

    // Ahorros
    const ahorroL    = Math.max(0, ci_agua - cl_agua)
    const ahorroPctA = ci_agua > 0 ? (ahorroL / ci_agua * 100) : 0
    const ahorroPctQ = ci_quim > 0 ? ((ci_quim - cl_quim) / ci_quim * 100) : 0
    if (savedLEl)    savedLEl.textContent   = Math.floor(ahorroL).toLocaleString() + ' L'
    if (savedPctEl)  savedPctEl.textContent = `−${ahorroPctA.toFixed(1)}%`
    if (quimSavedEl) quimSavedEl.textContent = `−${Math.max(0, ahorroPctQ).toFixed(1)}%`

    // L/h en tiempo real
    if (hrs > 0.02) {
      if (lphCiegoEl) lphCiegoEl.textContent = Math.round(ci_agua / hrs) + ' L/h'
      if (lphClarEl)  lphClarEl.textContent  = Math.round(cl_agua / hrs) + ' L/h'
    }

    // ── 4. ANIMACIONES ────────────────────────────────
    stageTimer += dt_real
    if (stageTimer > 2.2) {
      stageTimer = 0
      activeStage = (activeStage + 1) % 6
      stageEls.forEach((el, i) => el?.classList.toggle('active', i === activeStage))
      if (activeStage === 5) ciclos++
    }
    if (cyclosEl) cyclosEl.textContent = ciclos

    // Color del agua del tanque
    if (waterMesh) {
      if      (biocarga < UMBRAL_DOSIFICAR) waterMesh.material.color.setHex(0x1199cc)
      else if (biocarga < UMBRAL_PURGAR)   waterMesh.material.color.setHex(0x887733)
      else                                  waterMesh.material.color.setHex(0x773311)
    }

    // Sensor laser pulso
    if (Math.floor(t_simulado) % INTERVALO_SENSOR === 0) {
      laserRays?.forEach(r => {
        r.material.opacity = 0.9
        setTimeout(() => { if (r) r.material.opacity = 0 }, 130)
      })
    }

    if (belts)         belts.forEach(b => { b.material.map.offset.x -= 0.65 * dt_real })
    glowRings?.forEach(r => { r.material.opacity = 0.04 + Math.sin(t_real * 2.2) * 0.05 })
    if (tankLight)     tankLight.intensity = 2.4 + Math.sin(t_real * 3) * 0.7
    impellerBlades?.forEach(b => { b.rotation.y += 1.6 * dt_real })

    if (rotorDrum)  rotorDrum.rotation.x  += 1.8 * dt_real
    if (blades)     blades.forEach(b => { b.rotation.x += 1.8 * dt_real })
    if (augerShaft) augerShaft.rotation.x += 1.8 * dt_real

    if (waterDrops) waterDrops.forEach(d => {
      d.position.y += Math.abs(d.userData.vy) * dt_real
      if (d.position.y > 3.2) d.position.y = d.userData.startY
    })

    if (trommelDrum)     trommelDrum.rotation.x      += 0.9 * dt_real
    if (prewashAgitators) prewashAgitators.forEach(p => { p.rotation.y += 1.5 * dt_real })

    if (petFlakes) {
      const p = petFlakes.geometry.attributes.position.array
      for (let i = 0; i < p.length; i += 3) {
        p[i]   += Math.sin(t_real * 0.6 + i * 0.3) * 0.003
        p[i+2] += Math.cos(t_real * 0.5 + i * 0.2) * 0.003
        p[i+1]  = 3.64 + Math.sin(t_real * 1.1 + i * 0.5) * 0.05
        p[i]    = Math.max(-3.4, Math.min(1.8, p[i]))
        p[i+2]  = Math.max(-2.2, Math.min(2.2, p[i+2]))
      }
      petFlakes.geometry.attributes.position.needsUpdate = true
    }
    if (sinkParticles) {
      const s = sinkParticles.geometry.attributes.position.array
      for (let i = 0; i < s.length; i += 3) {
        s[i]   += (Math.random() - 0.5) * 0.003
        s[i+2] += (Math.random() - 0.5) * 0.003
        s[i+1]  = 0.18 + Math.random() * 0.18
        s[i]    = Math.max(-3.3, Math.min(1.7, s[i]))
        s[i+2]  = Math.max(-2.1, Math.min(2.1, s[i+2]))
      }
      sinkParticles.geometry.attributes.position.needsUpdate = true
    }
    if (floatLayer) floatLayer.material.opacity = 0.24 + Math.sin(t_real * 1.4) * 0.1

    stageLights.forEach((l, i) => {
      l.intensity = i === activeStage % stageLights.length
        ? 2.4 + Math.sin(t_real * 5) * 0.7
        : 0.35
    })

    updateBatches(batches, dt_real)
    controls.update()
    renderer.render(scene, camera)
  }

  animate()
}
