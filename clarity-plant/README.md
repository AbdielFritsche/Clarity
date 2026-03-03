# Proyecto Clarity v3 — Línea de Lavado PET

## Arranque

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en /dist
```

> **Importante:** el proyecto usa ES modules — debe servirse con Vite
> (o cualquier servidor HTTP). No abrir el HTML directamente en el navegador.

## Estructura

```
clarity-plant/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js          Entry point — instancia y conecta todo
    ├── scene.js         Renderer, cámara, luces, suelo
    ├── style.css        HUD industrial
    ├── simulation.js    Loop de animación + biocarga + HUD + water-savings
    └── objects/
        ├── hopper.js    Estación 0: Tolva de recepción
        ├── conveyor.js  Cinta transportadora central
        ├── mill.js      Estación 1: Granulador húmedo (REDISEÑADO v3)
        ├── tank.js      Estación 2: Tanque de lavado Clarity (REDISEÑADO v3)
        ├── dryer.js     Estaciones 3+4: Enjuague + Secadora
        └── batches.js   Botellas PET animadas
```

## Cambios v3 vs v2

### mill.js — Granulador húmedo industrial
- Cuerpo rectangular con **costillas verticales de refuerzo**
- **Tolva** con aro de seguridad naranja y rejilla
- **Ventana de inspección** lateral con marco naranja y cruz
- **Rotor** horizontal con **8 cuchillas** animadas en pivotes
- **5 cuchillas estáticas** en la pared interna
- **Manifold de agua** con 4 nozzles de aspersión
- **Tornillo sinfín** (auger) con carcasa, espiras y brida de salida
- Panel de control con pantalla, 3 botones LED y motor lateral
- Bandeja de drenaje, patas con ajustadores y pies naranjas
- 18 gotas de agua animadas dentro de la cámara

### tank.js — Tanque rectangular abierto + Sensor Clarity
- **Forma rectangular** (no cilíndrica) — como los tanques reales
- Pared frontal **semitransparente** para ver el interior
- Perfil **L** en el borde superior y costillas externas
- **Serpentines calefactores** horizontales + manifold vertical
- **Eje agitador** con 2 conjuntos de 4 paletas que giran
- Sonda **Clarity** completa: poste, brazo, probe, collar de acero,
  punta óptica, LED de estado, aro de brillo pulsante, rayo láser,
  cable y caja de control con pantalla luminosa
- 45 burbujas internas animadas
- Tubería de overflow y válvula de drenaje naranja
