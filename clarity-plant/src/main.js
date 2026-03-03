import './style.css'
import './scene.js'

import { createHopper }                    from './objects/hopper.js'
import { createConveyor }                  from './objects/conveyor.js'
import { createPrewash }                   from './objects/prewash.js'
import { createMill }                      from './objects/mill.js'
import { createTank }                      from './objects/tank.js'
import { createRinseTank, createCollectionZone } from './objects/dryer.js'
import { createBatches }                   from './objects/batches.js'
import { startSimulation }                 from './simulation.js'

createHopper()
const { belts } = createConveyor()
const { prewashAgitators } = createPrewash() 

// ── LÍNEA 1 (Transparente) ──
const mill1 = createMill(1.5, 0)
const tank1 = createTank(14, 0)
createRinseTank(20.5, 0)
createCollectionZone(25, 0)

// ── LÍNEA 2 (Verde/Merma) ──
const mill2 = createMill(1.5, 8)
const tank2 = createTank(14, 8)
createRinseTank(20.5, 8)
createCollectionZone(25, 8)

const batches = createBatches()

// ── Combinar Referencias para Animación ──
const refs = {
  belts, prewashAgitators, batches,
  rotorDrums: [mill1.rotorDrum, mill2.rotorDrum],
  allBlades: [...mill1.blades, ...mill2.blades],
  augerShafts: [mill1.augerShaft, mill2.augerShaft],
  allWaterDrops: [...mill1.waterDrops, ...mill2.waterDrops],
  waterMeshes: [tank1.waterMesh, tank2.waterMesh],
  tankLights: [tank1.tankLight, tank2.tankLight],
  glowRings: [...tank1.glowRings, ...tank2.glowRings],
  laserRays: [...tank1.laserRays, ...tank2.laserRays],
  impellerBlades: [...tank1.impellerBlades, ...tank2.impellerBlades],
  floatLayers: [tank1.floatLayer, tank2.floatLayer],
  petFlakes: [tank1.petFlakes, tank2.petFlakes],
  sinkParticles: [tank1.sinkParticles, tank2.sinkParticles]
}

startSimulation(refs)