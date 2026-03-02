import * as THREE from 'three'

/**
 * scene.js
 * Responsabilidad: renderer, escena, camara y luces.
 */

// Renderer
const canvas = document.getElementById('three-canvas')
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.4
renderer.setClearColor(0x071420)

// Scene
export const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x071420, 0.018)

// Camera
export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(0, 8, 18)
camera.lookAt(0, 1, 0)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Lights - much brighter and warmer so everything is visible
const ambientLight = new THREE.AmbientLight(0x99ccee, 4.0)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xfff8e8, 3.5)
dirLight.position.set(6, 16, 10)
dirLight.castShadow = true
dirLight.shadow.mapSize.set(2048, 2048)
scene.add(dirLight)

// Fill from opposite side - eliminates dark shadows
const fillLight = new THREE.DirectionalLight(0xaaddff, 2.0)
fillLight.position.set(-10, 8, -6)
scene.add(fillLight)

// Hemisphere sky/ground bounce
const hemi = new THREE.HemisphereLight(0x88ccee, 0x335566, 1.8)
scene.add(hemi)

// Per-stage accent lights
const stageColors = [0x44aaff, 0xff8844, 0x00ffcc, 0x00ddff, 0xffcc44]
export const stageLights = stageColors.map((color, i) => {
  const light = new THREE.PointLight(color, 2.5, 7)
  light.position.set(-10 + i * 5, 4, -1)
  scene.add(light)
  return light
})

// Floor
const gridHelper = new THREE.GridHelper(60, 60, 0x0d3344, 0x0a2233)
gridHelper.position.y = -1.01
scene.add(gridHelper)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x0c1f2c, roughness: 0.85, metalness: 0.15 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -1.0
floor.receiveShadow = true
scene.add(floor)
