import './style.css'
import './scene.js'

import { createHopper }                          from './objects/hopper.js'
import { createConveyor }                        from './objects/conveyor.js'
import { createPrewash }                         from './objects/prewash.js'
import { createMill }                            from './objects/mill.js'
import { createTank }                            from './objects/tank.js'
import { createRinseTank, createCollectionZone } from './objects/dryer.js'
import { createTrommel }                         from './objects/trommel.js'
import { createBatches }                         from './objects/batches.js'
import { startSimulation }                       from './simulation.js'

// ── BUILD THE DISH LINE ───────────────────────────────
createHopper()                          // Mesa de carga / raspado
const { belts } = createConveyor()      // Banda transportadora malla inox
const { prewashAgitators } = createPrewash()  // Tanque pre-remojo
const { trommelDrum } = createTrommel() // Clasificadora de canastillas

// Túnel de lavado — cubre mundo X: -9 a +8
const tunnel = createMill(-9.0, 0)

// Tanque Clarity (lavado caliente con sensor)
const tank1 = createTank(14, 0)

// Enjuague final + zona de salida
createRinseTank(20.5, 0)
createCollectionZone(25, 0)

// Vajilla animada
const batches = createBatches()

// ── REFERENCIAS PARA ANIMACIÓN ────────────────────────
const refs = {
  belts,
  prewashAgitators,
  trommelDrum,
  batches,

  // Tunnel spray arms (recycled as rotor/blades)
  rotorDrum:    tunnel.rotorDrum,
  blades:       tunnel.blades,
  augerShaft:   tunnel.augerShaft,
  waterDrops:   tunnel.waterDrops,

  // Tank Clarity
  waterMesh:      tank1.waterMesh,
  tankLight:      tank1.tankLight,
  glowRings:      tank1.glowRings,
  laserRays:      tank1.laserRays,
  impellerBlades: tank1.impellerBlades,
  floatLayer:     tank1.floatLayer,
  petFlakes:      tank1.petFlakes,
  sinkParticles:  tank1.sinkParticles,
}

startSimulation(refs)
