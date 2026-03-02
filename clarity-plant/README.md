# Proyecto Clarity — Simulación 3D Línea de Lavado PET

Simulación visual 3D de una línea de procesado y lavado de botellas PET,
con sensor de biocarga reactivo (sistema Clarity).

## Estructura del proyecto

```
clarity-plant/
├── index.html              ← Entry point HTML
├── package.json            ← Dependencias (three, vite)
├── vite.config.js          ← Configuración de Vite
└── src/
    ├── main.js             ← Entry point JS: conecta todos los módulos
    ├── scene.js            ← Renderer, cámara, luces, suelo
    ├── style.css           ← HUD y estilos
    ├── simulation.js       ← Loop de animación + lógica de biocarga + HUD
    └── objects/
        ├── hopper.js       ← Estación 0: Tolva de recepción
        ├── conveyor.js     ← Cinta transportadora central
        ├── mill.js         ← Estación 1: Molino triturador
        ├── tank.js         ← Estación 2: Tanque Clarity (núcleo del proyecto)
        ├── dryer.js        ← Estación 3+4: Enjuague y Secadora
        └── batches.js      ← Lotes PET animados a lo largo de la cinta
```

## Cómo correrlo

```bash
# 1. Instalar dependencias
npm install

# 2. Modo desarrollo (hot reload)
npm run dev

# 3. Build para producción
npm run build
npm run preview
```

Luego abre http://localhost:5173 en tu navegador.

## Dependencias

| Paquete | Versión | Rol |
|---------|---------|-----|
| `three` | ^0.165  | Motor 3D (WebGL) |
| `vite`  | ^5.3    | Dev server + bundler |

## Cómo extender el proyecto

- **Agregar una nueva estación**: crea un archivo en `src/objects/`, 
  impórtalo en `main.js` y pasa cualquier referencia animable a `startSimulation()`.
- **Cambiar parámetros de biocarga**: edita `BIOCARGA_MAX` y `BIOCARGA_RATE` en `simulation.js`.
- **Cargar modelos 3D propios** (`.glb`, `.obj`): usa `GLTFLoader` de `three/examples/jsm` 
  en lugar de los `BoxGeometry` actuales.
