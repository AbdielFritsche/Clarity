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
const stageEls   = [0, 1, 2, 3, 4, 5].map(i => document.getElementById('s' + i))

// Referencias del nuevo panel de ahorro
const aguaCiegoEl = document.getElementById('aguaCiego')
const aguaClarityEl = document.getElementById('aguaClarity')
const aguaClarityBar = document.getElementById('aguaClarityBar')
const purgasCiegoEl = document.getElementById('purgasCiego')
const purgasClarityEl = document.getElementById('purgasClarity')
const dosisCiegoEl = document.getElementById('dosisCiego')
const dosisClarityEl = document.getElementById('dosisClarity')
const totalSavedLitersEl = document.getElementById('totalSavedLiters')
const totalSavedPctEl = document.getElementById('totalSavedPct')

// ── Parámetros del modelo matemático ──────────────────
const BIOCARGA_MAX     = 30000;
const BIOCARGA_INICIAL = 100;
const TASA_CRECIMIENTO = 0.00018;
const UMBRAL_DOSIFICAR = 500;
const UMBRAL_PURGAR    = 3000;

const AGUA_POR_PURGA   = 1200;
const VOLUMEN_TANQUE   = 5000;
const EFECTO_QUIMICO   = 0.60;

const CADA_DOSIS_CIEGA = 3600; // 1 hora
const CADA_PURGA_CIEGA = 14400; // 4 horas
const COOLDOWN_PURGA   = 1800; // 30 min
const INTERVALO_SENSOR = 300; // Cada 5 minutos se activa el láser para simular la lectura  
const VELOCIDAD_SIM    = 1800; // 1 seg real = 30 min simulados

// ── Estado ────────────────────────────────────────────
let t_simulado = 0; 
let lotes = 0;
let activeStage = 0;
let stageTimer = 0;

// Estado Sistema Clarity 
let biocarga = BIOCARGA_INICIAL;
let clarity_agua = 0;
let clarity_quim = 0;
let clarity_purgas = 0;
let clarity_dosis = 0;
let clarity_ultima_purga = -COOLDOWN_PURGA;

// Estado Sistema Ciego (Competidor)
let ciego_agua = 0;
let ciego_quim = 0;
let ciego_purgas = 0;
let ciego_dosis = 0;
let ciego_ultima_purga = 0;
let ciego_ultima_dosis = 0;

stageEls[0].classList.add('active')

// ── Loop principal ────────────────────────────────────
export function startSimulation({
  waterMesh, glowRing, tankLight, laserRay, impellerBlades,
  rotorDrum, blades, augerShaft, waterDrops, batches,
  trommelDrum, prewashPaddles, belts,
  petFlakes, sinkParticles, floatLayer
}) {
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)
    const dt_real = clock.getDelta()
    const t_real  = clock.getElapsedTime()
    
    // Aceleración de tiempo
    const dt_sim = dt_real * VELOCIDAD_SIM;
    t_simulado += dt_sim;

    // ── 1. LÓGICA MATEMÁTICA CLARITY ──────────────────────
    let delta = (TASA_CRECIMIENTO * biocarga * (1.0 - biocarga / BIOCARGA_MAX) * dt_sim);
    biocarga = Math.max(50, biocarga + delta);

    let lectura = biocarga; 
    
    if (lectura >= UMBRAL_PURGAR) {
      if (t_simulado - clarity_ultima_purga >= COOLDOWN_PURGA) {
        clarity_agua += AGUA_POR_PURGA;
        clarity_purgas++;
        clarity_ultima_purga = t_simulado;
        biocarga *= (1.0 - (AGUA_POR_PURGA/VOLUMEN_TANQUE) * 0.88);
        
        clarity_quim += 1.0;
        clarity_dosis++;
        biocarga *= (1.0 - EFECTO_QUIMICO);
      }
    } else if (lectura >= UMBRAL_DOSIFICAR) {
        let factor = (lectura - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR);
        factor = Math.max(0.2, Math.min(1.0, factor));
        clarity_quim += factor;
        clarity_dosis++;
        biocarga *= (1.0 - EFECTO_QUIMICO * factor);
    }
    biocarga = Math.max(50, biocarga);

    // ── 2. LÓGICA MATEMÁTICA MODO CIEGO ───────────────────
    if (t_simulado - ciego_ultima_dosis >= CADA_DOSIS_CIEGA) {
        ciego_quim += 1.2; 
        ciego_dosis++;
        ciego_ultima_dosis = t_simulado;
    }
    if (t_simulado - ciego_ultima_purga >= CADA_PURGA_CIEGA) {
        ciego_agua += AGUA_POR_PURGA;
        ciego_purgas++;
        ciego_ultima_purga = t_simulado;
    }

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

    aguaCiegoEl.textContent = Math.floor(ciego_agua).toLocaleString() + ' L';
    aguaClarityEl.textContent = Math.floor(clarity_agua).toLocaleString() + ' L';
    
    let ratio = ciego_agua > 0 ? (clarity_agua / ciego_agua) * 100 : 0;
    aguaClarityBar.style.width = ratio.toFixed(1) + '%';

    purgasCiegoEl.textContent = ciego_purgas;
    purgasClarityEl.textContent = clarity_purgas;
    dosisCiegoEl.textContent = ciego_dosis;
    dosisClarityEl.textContent = clarity_dosis;

    let ahorroLts = ciego_agua - clarity_agua;
    let ahorroPct = ciego_agua > 0 ? (ahorroLts / ciego_agua) * 100 : 0;
    
    totalSavedLitersEl.textContent = Math.floor(ahorroLts).toLocaleString() + ' L';
    totalSavedPctEl.textContent = `(-${ahorroPct.toFixed(1)}%)`;

    // ── 4. ANIMACIONES VISUALES 3D ────────────────────────
    stageTimer += dt_real;
    if (stageTimer > 2.0) {
      stageTimer  = 0;
      activeStage = (activeStage + 1) % 6;
      stageEls.forEach((el, i) => el.classList.toggle('active', i === activeStage));
      if (activeStage === 5) lotes++;
    }
    lotesEl.textContent = lotes;

    if (biocarga < UMBRAL_DOSIFICAR) waterMesh.material.color.setHex(0x1199dd);
    else if (biocarga < UMBRAL_PURGAR) waterMesh.material.color.setHex(0xaa8800);
    else waterMesh.material.color.setHex(0xaa2200);

    if (Math.floor(t_simulado) % INTERVALO_SENSOR === 0) {
        laserRay.material.opacity = 0.9;
        setTimeout(() => { if(laserRay) laserRay.material.opacity = 0; }, 100);
    }

    if (belts) belts.forEach(belt => { belt.material.map.offset.x -= 0.8 * dt_real; });
    glowRing.material.opacity = 0.06 + Math.sin(t_real * 2) * 0.05;
    tankLight.intensity       = 2.5  + Math.sin(t_real * 3) * 0.6;
    impellerBlades.forEach(b => { b.rotation.y += 1.8 * dt_real; });

    if(rotorDrum) rotorDrum.rotation.x += 5.0 * dt_real;
    if(blades) blades.forEach(b => { b.rotation.x += 5.0 * dt_real; });
    if(augerShaft) augerShaft.rotation.x += 3.5 * dt_real;
    if(waterDrops) waterDrops.forEach(d => {
      d.position.y += d.userData.vy * dt_real;
      if (d.position.y < 0.4) d.position.y = d.userData.startY;
    });

    if (trommelDrum) trommelDrum.rotation.x += 1.5 * dt_real;
    if (prewashPaddles) prewashPaddles.forEach(p => { p.rotation.x -= 2.0 * dt_real; });

    // ── Animación separación por densidad en Tanque Clarity ─
    if (petFlakes) {
      // Las hojuelas PET flotan y oscilan suavemente en la superficie
      const pos = petFlakes.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        // Movimiento ondulatorio en X y Z (arrastre del agitador)
        pos[i]   += Math.sin(t_real * 0.7 + i * 0.3) * 0.003;
        pos[i+2] += Math.cos(t_real * 0.5 + i * 0.2) * 0.003;
        // Flotar suavemente en Y (superficie ±0.06)
        pos[i+1] = 3.06 + Math.sin(t_real * 1.2 + i * 0.5) * 0.06;
        // Mantener dentro del tanque
        if (pos[i]   >  1.55) pos[i]   =  1.55;
        if (pos[i]   < -1.55) pos[i]   = -1.55;
        if (pos[i+2] >  2.2)  pos[i+2] =  2.2;
        if (pos[i+2] < -2.2)  pos[i+2] = -2.2;
      }
      petFlakes.geometry.attributes.position.needsUpdate = true;
    }

    if (sinkParticles) {
      // Los contaminantes en el fondo vibran levemente (efecto sedimentación)
      const spos = sinkParticles.geometry.attributes.position.array;
      for (let i = 0; i < spos.length; i += 3) {
        spos[i]   += (Math.random() - 0.5) * 0.004;
        spos[i+2] += (Math.random() - 0.5) * 0.004;
        spos[i+1] = 0.18 + Math.random() * 0.22;
        if (spos[i]   >  1.4)  spos[i]   =  1.4;
        if (spos[i]   < -1.4)  spos[i]   = -1.4;
        if (spos[i+2] >  2.1)  spos[i+2] =  2.1;
        if (spos[i+2] < -2.1)  spos[i+2] = -2.1;
      }
      sinkParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (floatLayer) {
      // La capa de flotación pulsa levemente para indicar movimiento
      floatLayer.material.opacity = 0.28 + Math.sin(t_real * 1.5) * 0.10;
    }

    stageLights.forEach((l, i) => {
      l.intensity = i === activeStage % stageLights.length ? 3 + Math.sin(t_real * 5) * 0.8 : 0.5;
    });

    updateBatches(batches, dt_real, t_real);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}