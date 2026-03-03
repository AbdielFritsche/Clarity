/**
 * main.js
 * Entry point del Proyecto Clarity v3.
 *
 * Responsabilidad: importar todos los módulos y conectarlos.
 * NO contiene lógica propia — sólo instancia y pasa referencias.
 *
 * Flujo:
 *   scene.js   → renderer, camera, scene, lights (side-effects al importar)
 *   objects/   → cada estación devuelve sus refs animables
 *   main.js    → recoge todas las refs y las pasa a startSimulation()
 */

import './scene.js'
import './style.css'

import { createHopper }                    from './objects/hopper.js'
import { createConveyor }                  from './objects/conveyor.js'
import { createMill }                      from './objects/mill.js'
import { createTank }                      from './objects/tank.js'
import { createRinseTank, createCollectionZone }    from './objects/dryer.js'
import { createBatches }                   from './objects/batches.js'
import { startSimulation }                 from './simulation.js'
import { createTrommel }                   from './objects/trommel.js'
import { createPrewash }                   from './objects/prewash.js'

// ── Build the plant ───────────────────────────────────
createHopper()
const {belts} = createConveyor()
createRinseTank()
createCollectionZone()
const { trommelDrum } = createTrommel()
const { prewashPaddles } = createPrewash()

// Mill: nuevas refs del granulador (rotorDrum, blades, augerShaft, waterDrops)
const { rotorDrum, blades, augerShaft, waterDrops } = createMill()

// Tank: nuevas refs del tanque rectangular (waterMesh, impellerBlades, etc.)
const { waterMesh, glowRing, tankLight, laserRay, impellerBlades, petFlakes, sinkParticles, floatLayer } = createTank()

const batches = createBatches()

// ── Start animation loop ──────────────────────────────
startSimulation({
  waterMesh,
  glowRing,
  tankLight,
  laserRay,
  impellerBlades,
  rotorDrum,
  augerShaft,
  waterDrops,
  batches,
  trommelDrum,
  prewashPaddles,
  belts,
  blades,
  petFlakes,
  sinkParticles,
  floatLayer,
})
