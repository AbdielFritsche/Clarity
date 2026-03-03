import * as THREE from 'three'
import { scene, camera, renderer, stageLights, controls } from './scene.js'
import { updateBatches } from './objects/batches.js'

// ── DOM refs ──────────────────────────────────────────
const bioValEl   = document.getElementById('bioVal')
const bioFillEl  = document.getElementById('bioFill')
const lotesEl    = document.getElementById('lotesVal')
const purezaEl   = document.getElementById('pureza')
const purezaFill = document.getElementById('purezaFill')
const tiempoValEl= document.getElementById('tiempoVal')
const alertEl    = document.getElementById('alertBanner')
const stageEls   = [0, 1, 2, 3, 4, 5, 6].map(i => document.getElementById('s' + i))

// Referencias de Agua
const aguaCiegoEl = document.getElementById('aguaCiego')
const aguaClarityEl = document.getElementById('aguaClarity')
const aguaClarityBar = document.getElementById('aguaClarityBar')
const totalSavedLitersEl = document.getElementById('totalSavedLiters')
const totalSavedPctEl = document.getElementById('totalSavedPct')

// Referencias de Químicos
const quimCiegoEl = document.getElementById('quimCiego')
const quimClarityEl = document.getElementById('quimClarity')
const quimClarityBar = document.getElementById('quimClarityBar')
const totalSavedQuimEl = document.getElementById('totalSavedQuim')
const totalSavedQuimPctEl = document.getElementById('totalSavedQuimPct')

// ── Parámetros del modelo matemático ──────────────────
const BIOCARGA_MAX     = 30000;
const BIOCARGA_INICIAL = 100;
const TASA_CRECIMIENTO = 0.00018;
const UMBRAL_DOSIFICAR = 500;
const UMBRAL_PURGAR    = 3000;

// Métricas de Consumo Reales (Por Hora)
const CIEGO_WATER_LPH = 370000/24; // 370k Litros de agua por hora
const CIEGO_CHEM_LPH  = 150;    // Litros de químicos por hora

const VELOCIDAD_SIM   = 1800; // 1 seg real = 30 min simulados

// ── Estado ────────────────────────────────────────────
let t_simulado = 0; 
let lotes = 0;
let activeStage = 0;
let stageTimer = 0;

// Estado Sistema Clarity 
let biocarga = BIOCARGA_INICIAL;
let clarity_agua = 0;
let clarity_quim = 0;

// Estado Sistema Ciego (Competidor)
let ciego_agua = 0;
let ciego_quim = 0;

if (stageEls[0]) stageEls[0].classList.add('active')

// ── Loop principal ────────────────────────────────────
export function startSimulation(refs) {
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)
    const dt_real = clock.getDelta()
    const t_real  = clock.getElapsedTime()
    
    // Aceleración de tiempo
    const dt_sim = dt_real * VELOCIDAD_SIM;
    t_simulado += dt_sim;

    // ── 1. DINÁMICA DE BIOCARGA ───────────────────────────
    let delta = (TASA_CRECIMIENTO * biocarga * (1.0 - biocarga / BIOCARGA_MAX) * dt_sim);
    biocarga = Math.max(50, biocarga + delta);
    
    if (biocarga >= UMBRAL_PURGAR) {
      biocarga *= 0.6; // Se realiza purga/dosificación, baja la carga
    }

    // ── 2. CÁLCULO DE CONSUMOS (Ciego vs Clarity) ─────────
    // El modo ciego consume el máximo constantemente (370k/h)
    ciego_agua += (CIEGO_WATER_LPH / 3600) * dt_sim;
    ciego_quim += (CIEGO_CHEM_LPH / 3600) * dt_sim;

    // Clarity ahorra regulando el flujo según la contaminación real
    // En su peor momento (agua muy sucia) ahorra 25%, en el mejor ahorra 30% (Factor 0.70 a 0.75)
    let water_factor = 0.70 + (biocarga / BIOCARGA_MAX) * 0.05; 
    
    // Químicos: Ahorro constante del 20% promedio (Factor 0.80)
    let chem_factor = 0.80 + (biocarga / BIOCARGA_MAX) * 0.02;

    clarity_agua += ((CIEGO_WATER_LPH * water_factor) / 3600) * dt_sim;
    clarity_quim += ((CIEGO_CHEM_LPH * chem_factor) / 3600) * dt_sim;

    // ── 3. ACTUALIZAR INTERFAZ (HUD) ──────────────────────
    const horas_simuladas = t_simulado / 3600;
    tiempoValEl.textContent = horas_simuladas.toFixed(1);

    bioValEl.textContent = Math.floor(biocarga).toLocaleString();
    const pct = biocarga / BIOCARGA_MAX;
    bioFillEl.style.width = (pct * 100).toFixed(1) + '%';
    
    const bioColor = biocarga < UMBRAL_DOSIFICAR ? '#00f5ff' : biocarga < UMBRAL_PURGAR ? '#ffcc00' : '#ff3300';
    bioValEl.style.color = bioColor;
    bioFillEl.style.background = bioColor;
    
    alertEl.classList.toggle('visible', biocarga >= UMBRAL_PURGAR);

    const pureza = Math.max(96, 99.9 - (biocarga/UMBRAL_PURGAR) * 0.5);
    purezaEl.textContent = pureza.toFixed(1) + '%';
    purezaFill.style.width = pureza + '%';
    purezaEl.style.color = pureza > 99 ? '#00ff88' : '#ffcc00';

    // -- Actualizar métricas de AGUA --
    aguaCiegoEl.textContent = Math.floor(ciego_agua).toLocaleString() + ' L';
    aguaClarityEl.textContent = Math.floor(clarity_agua).toLocaleString() + ' L';
    let ratioAgua = ciego_agua > 0 ? (clarity_agua / ciego_agua) * 100 : 0;
    aguaClarityBar.style.width = ratioAgua.toFixed(1) + '%';

    let ahorroAguaLts = ciego_agua - clarity_agua;
    let ahorroAguaPct = ciego_agua > 0 ? (ahorroAguaLts / ciego_agua) * 100 : 0;
    totalSavedLitersEl.textContent = Math.floor(ahorroAguaLts).toLocaleString() + ' L';
    totalSavedPctEl.textContent = `(-${ahorroAguaPct.toFixed(1)}%)`;

    // -- Actualizar métricas de QUÍMICOS --
    quimCiegoEl.textContent = Math.floor(ciego_quim).toLocaleString() + ' L';
    quimClarityEl.textContent = Math.floor(clarity_quim).toLocaleString() + ' L';
    let ratioQuim = ciego_quim > 0 ? (clarity_quim / ciego_quim) * 100 : 0;
    quimClarityBar.style.width = ratioQuim.toFixed(1) + '%';

    let ahorroQuimLts = ciego_quim - clarity_quim;
    let ahorroQuimPct = ciego_quim > 0 ? (ahorroQuimLts / ciego_quim) * 100 : 0;
    totalSavedQuimEl.textContent = Math.floor(ahorroQuimLts).toLocaleString() + ' L';
    totalSavedQuimPctEl.textContent = `(-${ahorroQuimPct.toFixed(1)}%)`;

    // ── 4. ANIMACIONES VISUALES 3D ────────────────────────
    stageTimer += dt_real;
    if (stageTimer > 2.0) {
      stageTimer  = 0;
      activeStage = (activeStage + 1) % 7;
      stageEls.forEach((el, i) => { if (el) el.classList.toggle('active', i === activeStage) });
      if (activeStage === 6) lotes++;
    }
    lotesEl.textContent = lotes;

    if (refs.waterMeshes) refs.waterMeshes.forEach(m => {
      if (biocarga < UMBRAL_DOSIFICAR) m.material.color.setHex(0x1199dd);
      else if (biocarga < UMBRAL_PURGAR) m.material.color.setHex(0xaa8800);
      else m.material.color.setHex(0xaa2200);
    });

    if (Math.floor(t_simulado) % 2 === 0 && refs.laserRays) {
        refs.laserRays.forEach(ray => {
            ray.material.opacity = 0.9;
            setTimeout(() => { if(ray) ray.material.opacity = 0; }, 100);
        });
    }

    if (refs.glowRings) refs.glowRings.forEach(g => g.material.opacity = 0.06 + Math.sin(t_real * 2) * 0.05);
    if (refs.tankLights) refs.tankLights.forEach(l => l.intensity = 2.5 + Math.sin(t_real * 3) * 0.6);

    if (refs.belts) refs.belts.forEach(b => b.material.map.offset.x -= 0.8 * dt_real);
    if (refs.prewashAgitators) refs.prewashAgitators.forEach(p => p.rotation.y += 1.8 * dt_real);
    if (refs.impellerBlades) refs.impellerBlades.forEach(b => b.rotation.y += 1.8 * dt_real);
    if (refs.rotorDrums) refs.rotorDrums.forEach(d => d.rotation.x += 5.0 * dt_real);
    if (refs.allBlades) refs.allBlades.forEach(b => b.rotation.x += 5.0 * dt_real);
    if (refs.augerShafts) refs.augerShafts.forEach(s => s.rotation.x += 3.5 * dt_real);

    if (refs.allWaterDrops) refs.allWaterDrops.forEach(d => {
      d.position.y += d.userData.vy * dt_real;
      if (d.position.y < 0.4) d.position.y = d.userData.startY;
    });

    if (refs.petFlakes) refs.petFlakes.forEach(f => {
      const pos = f.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += Math.sin(t_real * 0.7 + i * 0.3) * 0.003;
        pos[i+2] += Math.cos(t_real * 0.5 + i * 0.2) * 0.003;
        pos[i+1] = 3.06 + Math.sin(t_real * 1.2 + i * 0.5) * 0.06;
      }
      f.geometry.attributes.position.needsUpdate = true;
    });

    if (refs.sinkParticles) refs.sinkParticles.forEach(s => {
      const spos = s.geometry.attributes.position.array;
      for (let i = 0; i < spos.length; i += 3) {
        spos[i] += (Math.random() - 0.5) * 0.004;
        spos[i+2] += (Math.random() - 0.5) * 0.004;
        spos[i+1] = 0.18 + Math.random() * 0.22;
      }
      s.geometry.attributes.position.needsUpdate = true;
    });

    if (refs.floatLayers) refs.floatLayers.forEach(fl => fl.material.opacity = 0.28 + Math.sin(t_real * 1.5) * 0.10);
    stageLights.forEach((l, i) => l.intensity = i === activeStage % stageLights.length ? 3 + Math.sin(t_real * 5) * 0.8 : 0.5);

    updateBatches(refs.batches, dt_real, t_real);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}