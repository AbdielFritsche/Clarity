/**
 * main.js
 * Entry point del proyecto Clarity.
 *
 * Responsabilidad: importar todos los módulos y conectarlos.
 * NO contiene lógica propia — sólo instancia y pasa referencias.
 *
 * Flujo:
 *   scene.js   → renderer, camera, scene, lights (ya importados por los demás)
 *   objects/   → cada estación devuelve sus refs animables
 *   main.js    → recoge todas las refs y las pasa a startSimulation()
 */

import './scene.js'  // Inicializa renderer, scene, camera, luces, floor

import { createHopper }     from './objects/hopper.js'
import { createMill }       from './objects/mill.js'
import { createTank }       from './objects/tank.js'
import { createRinseTank, createDryer } from './objects/dryer.js'
import { createConveyor }   from './objects/conveyor.js'
import { createBatches }    from './objects/batches.js'
import { startSimulation }  from './simulation.js'

// ── Build the plant ───────────────────────────────────
createHopper()
createConveyor()
createRinseTank()
createDryer()

const { gear }                              = createMill()
const { waterMesh, glowRing, tankLight, laserRay, bubbles } = createTank()
const batches                               = createBatches()

// ── Start the simulation loop ─────────────────────────
startSimulation({ waterMesh, glowRing, tankLight, laserRay, bubbles, gear, batches })
