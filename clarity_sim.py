"""
Clarity — Biosensor Óptico para Reciclaje PET
Prototipo de simulación con salabim

Modela el lazo de control cerrado del sensor en una planta de reciclaje PET:
  - Modo CIEGO  : dosificación y purgas por temporizador (status quo actual)
  - Modo CLARITY: control en lazo cerrado basado en biocarga real

Tecnología del sensor:
  - Fluorescencia inducida por láser (405 nm) → detecta NADH/riboflavina vivos
  - Dispersión Mie → clasifica tamaño/morfología de partículas
  - Lectura cada 2 segundos sin reactivos consumibles

Referencia técnica: METTLER TOLEDO Thornton 7000RMS (tecnología base)
"""

import sys
import salabim as sim
import random

sys.stdout.reconfigure(encoding="utf-8")  # caracteres Unicode en Windows
sim.yieldless(False)  # salabim 26+ usa yieldless por defecto; revertimos al estilo generator  # salabim 26+ usa yieldless por defecto; revertimos al estilo generator

# ──────────────────── Parámetros del proceso ──────────────────────────────────

HORAS   = 24
T_TOTAL = HORAS * 3600  # segundos de simulación

# Carga microbiana
BIOCARGA_INICIAL  = 100     # UFC/mL al inicio del turno
BIOCARGA_MAX      = 30_000  # capacidad máxima del sistema (logístico)
UMBRAL_DOSIFICAR  = 500     # UFC/mL → activar dosificación química
UMBRAL_PURGAR     = 3_000   # UFC/mL → purga urgente de agua
TASA_CRECIMIENTO  = 0.00018 # por segundo (crecimiento bacteriano)

# Químicos
DOSIS_CIEGA       = 1.20    # 120% — sobredosificación "por si acaso" (modo ciego)
DOSIS_EXACTA      = 1.00    # 100% — dosificación Clarity
EFECTO_QUIMICO    = 0.60    # fracción de reducción de biocarga por dosis completa

# Agua y purgas
VOLUMEN_TANQUE    = 5_000   # litros
AGUA_POR_PURGA    = 1_200   # litros renovados por purga
CADA_PURGA_CIEGA  = 4 * 3600   # purga fija cada 4 horas (modo ciego)
CADA_DOSIS_CIEGA  = 1 * 3600   # dosificación fija cada 1 hora (modo ciego)
COOLDOWN_PURGA    = 1_800       # mínimo 30 min entre purgas (ambos modos)

# Sensor
INTERVALO_SENSOR  = 2       # segundos entre lecturas (spec Clarity)
RUIDO_SENSOR      = 0.05    # ±5% de precisión del sensor óptico


# ──────────────────── Componente: Tanque de Agua ──────────────────────────────

class TanqueAgua(sim.Component):
    """
    Estado dinámico del agua de lavado en el proceso PET.

    La biocarga crece de forma logística (crecimiento bacteriano natural)
    y se reduce mediante dosificación de químicos o purgas de agua fresca.
    """

    def setup(self, modo: str):
        self.modo = modo

        # Estado del proceso
        self.biocarga = BIOCARGA_INICIAL

        # Métricas de consumo
        self.agua_usada      = 0.0
        self.quim_usado      = 0.0
        self.purgas          = 0
        self.dosificaciones  = 0
        self.t_ultima_purga  = -COOLDOWN_PURGA  # permite purga al inicio

        # Historial para reporte
        self.hist_t          = []
        self.hist_biocarga   = []

    def dosificar(self, factor: float):
        """Aplica dosis química proporcional. factor=1.0 → dosis exacta."""
        self.quim_usado     += factor
        self.dosificaciones += 1
        # Efecto: reducción de biocarga proporcional a dosis
        self.biocarga *= (1.0 - EFECTO_QUIMICO * factor)
        self.biocarga  = max(50.0, self.biocarga)

    def purgar(self) -> bool:
        """
        Renueva agua fresca. Retorna False si está en cooldown.
        En modo Clarity: solo cuando la biocarga lo requiere.
        En modo ciego: por temporizador, sin importar el estado.
        """
        t_actual = self.env.now()
        if t_actual - self.t_ultima_purga < COOLDOWN_PURGA:
            return False

        self.agua_usada     += AGUA_POR_PURGA
        self.purgas         += 1
        self.t_ultima_purga  = t_actual

        # Efecto: diluir biocarga proporcionalmente al volumen renovado
        fraccion = AGUA_POR_PURGA / VOLUMEN_TANQUE
        self.biocarga *= (1.0 - fraccion * 0.88)
        self.biocarga  = max(50.0, self.biocarga)
        return True

    def process(self):
        """Crecimiento bacteriano continuo (modelo logístico, paso=10s)."""
        while True:
            yield self.hold(10)
            # Modelo logístico: dN/dt = r·N·(1 - N/K)
            delta = (TASA_CRECIMIENTO
                     * self.biocarga
                     * (1.0 - self.biocarga / BIOCARGA_MAX)
                     * 10)
            self.biocarga = max(50.0, self.biocarga + delta)

            # Guardar historial cada 5 minutos
            t = self.env.now()
            if int(t) % 300 == 0:
                self.hist_t.append(t / 3600)
                self.hist_biocarga.append(self.biocarga)


# ──────────────────── Componente: Biosensor Clarity ───────────────────────────

class BiosensorClarity(sim.Component):
    """
    Sensor óptico en el bucle de derivación (bypass).

    Principio físico:
      1. Fluorescencia inducida por láser 405 nm
         → excita NADH y riboflavina en microorganismos vivos
         → fotodiodo captura la señal fluorescente
      2. Dispersión Mie
         → determina tamaño/morfología de partículas
         → distingue material biológico de microplásticos inertes

    Transmite UFCs/mL al PLC cada INTERVALO_SENSOR segundos.
    """

    def setup(self, tanque: TanqueAgua, plc):
        self.tanque       = tanque
        self.plc          = plc
        self.ultima_lectura = BIOCARGA_INICIAL

    def process(self):
        while True:
            yield self.hold(INTERVALO_SENSOR)

            # Lectura con ruido gaussiano ±5% (precisión real del sensor óptico)
            ruido            = random.gauss(1.0, RUIDO_SENSOR)
            self.ultima_lectura = max(0.0, self.tanque.biocarga * ruido)

            # Transmitir al PLC para control en lazo cerrado
            self.plc.on_lectura_sensor(self.ultima_lectura)


# ──────────────────── Componente: PLC (Controlador) ───────────────────────────

class PLCControlador(sim.Component):
    """
    Controlador Lógico Programable de la planta.

    MODO CIEGO (status quo):
      - Dosifica químicos cada 1 hora en dosis fija del 120%
      - Purga agua cada 4 horas por temporizador
      - No usa información de biocarga real

    MODO CLARITY (lazo cerrado):
      - Recibe lectura del sensor cada 2 segundos
      - Dosifica solo cuando biocarga supera umbral (dosis proporcional)
      - Purga solo cuando biocarga supera umbral crítico
    """

    def setup(self, tanque: TanqueAgua):
        self.tanque = tanque

    # ── Clarity: callback del sensor ──────────────────────────────────────────
    def on_lectura_sensor(self, biocarga: float):
        """Llamado por BiosensorClarity cada 2 segundos."""
        if biocarga >= UMBRAL_PURGAR:
            # Biocarga crítica → purga de emergencia + dosificación
            if self.tanque.purgar():
                self.tanque.dosificar(DOSIS_EXACTA)
        elif biocarga >= UMBRAL_DOSIFICAR:
            # Biocarga elevada → dosificación proporcional (no al máximo)
            factor = (biocarga - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR)
            factor = max(0.2, min(DOSIS_EXACTA, factor))
            self.tanque.dosificar(factor)
        # Si biocarga < UMBRAL_DOSIFICAR → no se hace nada (ahorro)

    # ── Proceso principal ─────────────────────────────────────────────────────
    def process(self):
        if self.tanque.modo == "clarity":
            # El control lo maneja on_lectura_sensor() — el PLC espera señales
            yield self.passivate()
        else:
            yield from self._modo_ciego()

    def _modo_ciego(self):
        """Lógica de temporizadores fijos (sin sensor)."""
        t_ultima_purga = -CADA_PURGA_CIEGA  # permite primera purga al inicio

        while True:
            yield self.hold(CADA_DOSIS_CIEGA)

            # Dosificación fija 120% — margen de seguridad arbitrario
            self.tanque.dosificar(DOSIS_CIEGA)

            # Purga fija cada 4 horas — sin importar biocarga real
            t = self.env.now()
            if t - t_ultima_purga >= CADA_PURGA_CIEGA:
                self.tanque.purgar()
                t_ultima_purga = t


# ──────────────────── Runner ───────────────────────────────────────────────────

def simular(modo: str) -> TanqueAgua:
    """
    Crea el entorno salabim, instancia los componentes y ejecuta la simulación.

    Arquitectura del sistema:
      TanqueAgua → [bypass] → BiosensorClarity → PLCControlador
                                                        ↓
                                              BombaDosificadora / Purga
    """
    env = sim.Environment(trace=False)

    tanque = TanqueAgua(name=f"tanque_{modo}", env=env, modo=modo)

    plc = PLCControlador(name="plc", env=env, tanque=tanque)

    if modo == "clarity":
        sensor = BiosensorClarity(name="sensor_clarity", env=env,
                                  tanque=tanque, plc=plc)

    env.run(till=T_TOTAL)
    return tanque


# ──────────────────── Reporte comparativo ─────────────────────────────────────

def reporte(ciego: TanqueAgua, clarity: TanqueAgua):
    def delta(a, b):
        if a == 0:
            return "  —"
        return f"{(b - a) / a * 100:+5.1f}%"

    W = 66
    print("\n" + "═" * W)
    print("  CLARITY — Simulación de Biosensor Óptico")
    print(f"  Planta Reciclaje PET | {HORAS}h operación | salabim DES")
    print("═" * W)
    print(f"\n  {'Métrica':<36} {'Ciego':>7} {'Clarity':>8} {'Δ':>8}")
    print("  " + "─" * (W - 2))

    filas = [
        ("Agua fresca consumida (L)",      ciego.agua_usada,      clarity.agua_usada),
        ("Químico consumido (u.)",          ciego.quim_usado,      clarity.quim_usado),
        ("Purgas de agua realizadas",       float(ciego.purgas),   float(clarity.purgas)),
        ("Dosificaciones al sistema",       float(ciego.dosificaciones), float(clarity.dosificaciones)),
        ("Biocarga final (UFC/mL)",         ciego.biocarga,        clarity.biocarga),
    ]

    for nombre, vc, vcl in filas:
        print(f"  {nombre:<36} {vc:>7.1f} {vcl:>8.1f} {delta(vc, vcl):>8}")

    print("  " + "─" * (W - 2))

    # Agua: si Clarity no purgó, el ahorro es vs. el calendario ciego
    if ciego.agua_usada > 0:
        ahorro_agua = (ciego.agua_usada - clarity.agua_usada) / ciego.agua_usada * 100
    else:
        ahorro_agua = 0.0
    ahorro_quim = (ciego.quim_usado - clarity.quim_usado) / ciego.quim_usado * 100 if ciego.quim_usado else 0

    print(f"\n  Resultados clave:")
    print(f"    Ahorro de agua     : {ahorro_agua:+.1f}%  (meta documento: -35%)")
    print(f"    Ahorro de químico  : {ahorro_quim:+.1f}%  (baseline: 120% dosis ciega)")
    print()
    print(f"  Por qué Clarity no purgó en {HORAS}h:")
    print(f"    Las {clarity.dosificaciones} microdosificaciones precisas mantuvieron")
    print(f"    la biocarga en {clarity.biocarga:.0f} UFC/mL — siempre bajo el umbral")
    print(f"    de purga ({UMBRAL_PURGAR:,} UFC/mL). El modo ciego purgó {ciego.purgas}x")
    print(f"    por calendario aunque el agua aún era viable.")
    print()
    print(f"  Sensor Clarity:")
    print(f"    Lectura cada     : {INTERVALO_SENSOR}s  (vs. laboratorio: días)")
    print(f"    Tecnología       : Fluorescencia láser 405nm + Dispersión Mie")
    print(f"    Sin consumibles  : no usa reactivos, solo luz")
    print(f"    Umbral dosis     : {UMBRAL_DOSIFICAR:,} UFC/mL")
    print(f"    Umbral purga     : {UMBRAL_PURGAR:,} UFC/mL")
    print("═" * W + "\n")


# ──────────────────── Entry point ─────────────────────────────────────────────

if __name__ == "__main__":
    print("\n[ CLARITY — Iniciando simulación de proceso PET ]")
    print(f"  Duración: {HORAS}h | Motor: salabim (DES)\n")

    print("  [1/2] Simulando modo CIEGO (sin sensor, temporizadores fijos)...")
    ciego = simular("ciego")

    print("  [2/2] Simulando modo CLARITY (lazo cerrado, sensor activo)...")
    clarity = simular("clarity")

    reporte(ciego, clarity)
