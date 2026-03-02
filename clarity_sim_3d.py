"""
Clarity — Biosensor Óptico para Reciclaje PET
Simulación INTERACTIVA 3D con salabim

Visualización en tiempo real del sistema de control de biocarga:
  - Tanque de agua 3D con nivel de contaminación animado
  - Sensor láser con animación de lectura
  - Gráficos en tiempo real de biocarga, químicos y agua
  - Eventos visuales de dosificación y purgas
  - Comparación lado a lado: MODO CIEGO vs MODO CLARITY
"""

import sys
import salabim as sim
import random

sys.stdout.reconfigure(encoding="utf-8")
sim.yieldless(False)


# ──────────────────── Entorno con zoom sincronizado ───────────────────────────
# salabim caches rendered PIL images per animation object using `_image_ident`.
# The cache key does NOT include the viewport scale, so when the user zooms,
# static elements (constant fillcolor/spec) reuse stale images rendered at the
# old scale while their screen position (qx, qy) is recalculated at the NEW
# scale. This causes a visual desync between static and dynamic elements.
#
# Fix: detect when `_scalez` changes between ticks and invalidate
# `_image_ident_prev` on every animation object, forcing a full re-render
# of all elements at the correct scale.

class ZoomSyncEnvironment(sim.Environment):
    def animation_pre_tick(self, t):
        prev_scale = getattr(self, '_prev_scalez', None)
        super().animation_pre_tick(t)
        if prev_scale is not None and self._scalez != prev_scale:
            # Invalidate _image_ident (not _image_ident_prev!) because
            # make_pil_image() starts with `_image_ident_prev = _image_ident`
            # before computing the new ident.  Setting _image_ident to None
            # ensures the saved prev won't match the freshly computed value,
            # forcing a full re-render of every element at the new scale.
            for ao in self.an_objects:
                ao._image_ident = None
        self._prev_scalez = self._scalez


# ──────────────────── Parámetros del proceso ──────────────────────────────────

HORAS   = 24
T_TOTAL = HORAS * 3600

# Carga microbiana
BIOCARGA_INICIAL  = 100
BIOCARGA_MAX      = 30_000
UMBRAL_DOSIFICAR  = 500
UMBRAL_PURGAR     = 3_000
TASA_CRECIMIENTO  = 0.00018

# Químicos
DOSIS_CIEGA       = 1.20
DOSIS_EXACTA      = 1.00
EFECTO_QUIMICO    = 0.60

# Agua y purgas
VOLUMEN_TANQUE    = 5_000
AGUA_POR_PURGA    = 1_200
CADA_PURGA_CIEGA  = 4 * 3600
CADA_DOSIS_CIEGA  = 1 * 3600
COOLDOWN_PURGA    = 1_800

# Sensor
INTERVALO_SENSOR  = 2
RUIDO_SENSOR      = 0.05

# Visualización mejorada
ESCALA_TIEMPO     = 3600  # 1 hora simulada = 1 segundo real


# ──────────────────── Layout compartido ───────────────────────────────────────

DIVIDER_CENTER_X = 512
SYSTEM_CENTER_OFFSET = 200
LEFT_SYSTEM_CENTER = DIVIDER_CENTER_X - SYSTEM_CENTER_OFFSET
RIGHT_SYSTEM_CENTER = DIVIDER_CENTER_X + SYSTEM_CENTER_OFFSET
LAYOUT_CENTER_X = DIVIDER_CENTER_X
LEFT_CONTENT_EDGE = LEFT_SYSTEM_CENTER - 170
RIGHT_CONTENT_EDGE = RIGHT_SYSTEM_CENTER + 170
LAYOUT_WIDTH = RIGHT_CONTENT_EDGE - LEFT_CONTENT_EDGE


# ──────────────────── Componente auxiliar: Reset de indicadores ──────────────

class ResetIndicator(sim.Component):
    """Componente temporal para resetear indicadores visuales"""
    def setup(self, tanque, tipo: str, wait_time: float):
        self.tanque = tanque
        self.tipo = tipo
        self.wait_time = wait_time

    def process(self):
        yield self.hold(self.wait_time)
        if self.tipo == "dosis":
            self.tanque._dosis_active = False
        elif self.tipo == "purga":
            self.tanque._purga_active = False


# ──────────────────── Componente: Tanque de Agua ──────────────────────────────

class TanqueAgua(sim.Component):
    def setup(self, modo: str, x_offset: float = 0):
        self.modo = modo
        self.x_offset = x_offset

        # Estado del proceso
        self.biocarga = BIOCARGA_INICIAL

        # Métricas de consumo
        self.agua_usada      = 0.0
        self.quim_usado      = 0.0
        self.purgas          = 0
        self.dosificaciones  = 0
        self.t_ultima_purga  = -COOLDOWN_PURGA

        # Estado visual de indicadores
        self._dosis_active = False
        self._purga_active = False

        # Monitor para gráfica
        self.hist_biocarga_monitor = sim.Monitor(
            name=f"biocarga_{modo}",
            level=True,
            initial_tally=BIOCARGA_INICIAL
        )

        # Animaciones 3D
        self._crear_visualizacion()

    def _crear_visualizacion(self):
        """Crea los elementos visuales del tanque y sensores"""
        import math as _math

        x = self.x_offset
        color = "red" if self.modo == "ciego" else "green"
        titulo = "MODO CIEGO" if self.modo == "ciego" else "MODO CLARITY"
        panel_center_x = x

        # ═══════════════════ TANQUE PRINCIPAL ═══════════════════
        TANK_LEFT   = x - 90
        TANK_RIGHT  = x + 90
        TANK_BOTTOM = 300
        TANK_TOP    = 580

        # ─── Título y subtítulo (tight above tank) ───
        sim.AnimateText(
            text=titulo,
            x=panel_center_x, y=TANK_TOP + 14,
            font="Arial", fontsize=26, textcolor=color,
            xy_anchor="c"
        )

        subtitle = "Sin sensor — temporizadores fijos" if self.modo == "ciego" else "Sensor láser 405nm — lazo cerrado"
        sim.AnimateText(
            text=subtitle,
            x=panel_center_x, y=TANK_TOP - 6,
            font="Arial", fontsize=11,
            textcolor="#aaaaaa",
            xy_anchor="c"
        )

        sim.AnimateText(
            text="TANQUE DE AGUA",
            x=panel_center_x, y=TANK_TOP - 22,
            font="Arial", fontsize=11,
            textcolor="#cccccc",
            xy_anchor="c"
        )

        # ─── Agua interior (drawn first so frame goes on top) ───
        self.nivel_agua = sim.AnimateRectangle(
            spec=(TANK_LEFT, TANK_BOTTOM, TANK_RIGHT, TANK_TOP),
            fillcolor=lambda arg, t: self._get_color_biocarga(),
            linewidth=0
        )

        # ─── Marco exterior ───
        sim.AnimateRectangle(
            spec=(TANK_LEFT - 3, TANK_BOTTOM - 3, TANK_RIGHT + 3, TANK_TOP + 3),
            fillcolor="",
            linewidth=4,
            linecolor="#888888"
        )

        # ─── Valor biocarga centrado en el tanque ───
        tank_mid_y = (TANK_BOTTOM + TANK_TOP) // 2
        self.text_biocarga = sim.AnimateText(
            text=lambda arg, t: f"{int(self.biocarga)}",
            x=x, y=tank_mid_y + 12,
            font="Courier New", fontsize=30,
            textcolor="white",
            xy_anchor="c"
        )

        sim.AnimateText(
            text="UFC/mL",
            x=x, y=tank_mid_y - 18,
            font="Courier New", fontsize=12,
            textcolor="#dddddd",
            xy_anchor="c"
        )

        # ═══════════════════ BARRA DE NIVEL (log scale) ═══════════════════
        BAR_X      = TANK_RIGHT + 10
        BAR_W      = 16
        BAR_BOTTOM = TANK_BOTTOM
        BAR_TOP    = TANK_TOP

        sim.AnimateRectangle(
            spec=(BAR_X, BAR_BOTTOM, BAR_X + BAR_W, BAR_TOP),
            fillcolor="#1a1a1a",
            linewidth=2,
            linecolor="#666666"
        )

        _LOG_MIN = _math.log10(50)
        _LOG_MAX = _math.log10(BIOCARGA_MAX)

        def _log_fraction(value):
            if value <= 50:
                return 0.0
            return min(1.0, (_math.log10(value) - _LOG_MIN) / (_LOG_MAX - _LOG_MIN))

        self.nivel_barra = sim.AnimateRectangle(
            spec=lambda arg, t: (
                BAR_X + 2,
                BAR_BOTTOM + 2,
                BAR_X + BAR_W - 2,
                BAR_BOTTOM + 2 + (BAR_TOP - BAR_BOTTOM - 4) * _log_fraction(self.biocarga)
            ),
            fillcolor=lambda arg, t: self._get_color_biocarga(),
            linewidth=0
        )

        y_dosis = BAR_BOTTOM + (BAR_TOP - BAR_BOTTOM) * _log_fraction(UMBRAL_DOSIFICAR)
        y_purga = BAR_BOTTOM + (BAR_TOP - BAR_BOTTOM) * _log_fraction(UMBRAL_PURGAR)

        sim.AnimateLine(
            spec=(BAR_X - 3, y_dosis, BAR_X + BAR_W + 3, y_dosis),
            linewidth=2, linecolor="orange"
        )
        sim.AnimateText(
            text="D", x=BAR_X + BAR_W + 5, y=y_dosis,
            fontsize=8, textcolor="orange", xy_anchor="w"
        )

        sim.AnimateLine(
            spec=(BAR_X - 3, y_purga, BAR_X + BAR_W + 3, y_purga),
            linewidth=2, linecolor="red"
        )
        sim.AnimateText(
            text="P", x=BAR_X + BAR_W + 5, y=y_purga,
            fontsize=8, textcolor="red", xy_anchor="w"
        )

        # ═══════════════════ SENSOR CLARITY ═══════════════════
        if self.modo == "clarity":
            SENS_W = 70
            SENS_H = 90
            SENS_LEFT  = TANK_LEFT - SENS_W - 8
            SENS_MID_Y = tank_mid_y
            SENS_BOT   = SENS_MID_Y - SENS_H // 2
            SENS_TOP   = SENS_MID_Y + SENS_H // 2
            SENS_CX    = (SENS_LEFT + TANK_LEFT - 8) // 2

            sim.AnimateRectangle(
                spec=(SENS_LEFT, SENS_BOT, TANK_LEFT - 8, SENS_TOP),
                fillcolor="dimgray", linewidth=3, linecolor="black"
            )

            sim.AnimateText(
                text="SENSOR\nCLARITY",
                x=SENS_CX, y=SENS_MID_Y + 12,
                font="Arial", fontsize=10,
                textcolor="white", xy_anchor="c"
            )

            sim.AnimateText(
                text="405nm",
                x=SENS_CX, y=SENS_MID_Y - 22,
                font="Arial", fontsize=9,
                textcolor="cyan", xy_anchor="c"
            )

            self.laser_beam = sim.AnimateLine(
                spec=(TANK_LEFT - 8, SENS_MID_Y, TANK_LEFT, SENS_MID_Y),
                linewidth=4,
                linecolor=lambda arg, t: "purple" if int(self.env.now() / INTERVALO_SENSOR) % 2 == 0 else ""
            )

            sim.AnimateCircle(
                radius=5,
                x=TANK_LEFT, y=SENS_MID_Y,
                fillcolor=lambda arg, t: "purple" if int(self.env.now() / INTERVALO_SENSOR) % 2 == 0 else "",
                linewidth=0
            )

        # ═══════════════════ INDICADORES DE EVENTOS ═══════════════════
        ind_y = TANK_BOTTOM - 40

        self.dosis_indicator = sim.AnimateCircle(
            radius=14, x=x - 45, y=ind_y,
            fillcolor=lambda arg, t: "orange" if self._dosis_active else "",
            linewidth=3, linecolor="orange"
        )
        sim.AnimateText(
            text="DOSIS", x=x - 45, y=ind_y - 22,
            fontsize=10, textcolor="orange", xy_anchor="c"
        )

        self.purga_indicator = sim.AnimateCircle(
            radius=14, x=x + 45, y=ind_y,
            fillcolor=lambda arg, t: "dodgerblue" if self._purga_active else "",
            linewidth=3, linecolor="dodgerblue"
        )
        sim.AnimateText(
            text="PURGA", x=x + 45, y=ind_y - 22,
            fontsize=10, textcolor="dodgerblue", xy_anchor="c"
        )

        # ═══════════════════ MÉTRICAS EN TIEMPO REAL ═══════════════════
        met_center_x = x
        met_top    = ind_y - 42
        met_bottom = met_top - 100

        sim.AnimateRectangle(
            spec=(met_center_x - 92, met_bottom, met_center_x + 92, met_top),
            fillcolor="#262626", linewidth=2, linecolor="#4d4d4d"
        )

        sim.AnimateText(
            text="MÉTRICAS", x=met_center_x, y=met_top - 12,
            fontsize=13, textcolor="white", xy_anchor="c"
        )

        self.text_quimico = sim.AnimateText(
            text=lambda arg, t: f"Químico: {self.quim_usado:.1f} u.",
            x=met_center_x, y=met_top - 27,
            fontsize=12, textcolor="yellow", xy_anchor="c"
        )

        self.text_agua = sim.AnimateText(
            text=lambda arg, t: f"Agua: {int(self.agua_usada)} L",
            x=met_center_x, y=met_top - 42,
            fontsize=12, textcolor="cyan", xy_anchor="c"
        )

        self.text_purgas = sim.AnimateText(
            text=lambda arg, t: f"Purgas: {self.purgas}",
            x=met_center_x, y=met_top - 57,
            fontsize=12, textcolor="lightblue", xy_anchor="c"
        )

        self.text_dosis = sim.AnimateText(
            text=lambda arg, t: f"Dosif.: {self.dosificaciones}",
            x=met_center_x, y=met_top - 72,
            fontsize=12, textcolor="orange", xy_anchor="c"
        )

        self.text_estado = sim.AnimateText(
            text=lambda arg, t: self._get_estado_text(),
            x=met_center_x, y=met_top - 90,
            fontsize=10,
            textcolor=lambda arg, t: self._get_color_biocarga(),
            xy_anchor="c"
        )

    def _get_estado_text(self):
        """Texto descriptivo del estado actual"""
        b = self.biocarga
        if b < 200:
            return "● LIMPIO"
        elif b < 500:
            return "● CRECIENDO"
        elif b < 3000:
            return "▲ TRATANDO"
        else:
            return "▲ CRÍTICO"

    def _get_color_biocarga(self):
        """Retorna color según nivel de biocarga (umbrales absolutos)"""
        b = self.biocarga
        if b < 100:
            return "#0066cc"      # Azul oscuro — agua limpia
        elif b < 200:
            return "#0099ff"      # Azul — contaminación mínima
        elif b < 350:
            return "#00cccc"      # Cyan — crecimiento detectado
        elif b < 500:
            return "#cccc00"      # Amarillo — cerca de umbral dosis
        elif b < 1000:
            return "#ff8800"      # Naranja — requiere tratamiento
        elif b < 3000:
            return "#ff4400"      # Rojo naranja — crítico
        else:
            return "#ff0000"      # Rojo — sobre umbral de purga

    def dosificar(self, factor: float):
        """Aplica dosis química con animación"""
        self.quim_usado     += factor
        self.dosificaciones += 1
        self.biocarga *= (1.0 - EFECTO_QUIMICO * factor)
        self.biocarga  = max(50.0, self.biocarga)

        # Animación de dosificación
        self._animar_evento("dosis")

    def purgar(self) -> bool:
        """Renueva agua con animación"""
        t_actual = self.env.now()
        if t_actual - self.t_ultima_purga < COOLDOWN_PURGA:
            return False

        self.agua_usada     += AGUA_POR_PURGA
        self.purgas         += 1
        self.t_ultima_purga  = t_actual

        fraccion = AGUA_POR_PURGA / VOLUMEN_TANQUE
        self.biocarga *= (1.0 - fraccion * 0.88)
        self.biocarga  = max(50.0, self.biocarga)

        # Animación de purga
        self._animar_evento("purga")
        return True

    def _animar_evento(self, tipo: str):
        """Anima eventos de dosificación o purga (duración visible a 3600x)"""
        if tipo == "dosis":
            self._dosis_active = True
            ResetIndicator(tanque=self, tipo="dosis", wait_time=1800)
        elif tipo == "purga":
            self._purga_active = True
            ResetIndicator(tanque=self, tipo="purga", wait_time=1800)

    def process(self):
        """Crecimiento bacteriano continuo"""
        while True:
            yield self.hold(10)

            delta = (TASA_CRECIMIENTO
                     * self.biocarga
                     * (1.0 - self.biocarga / BIOCARGA_MAX)
                     * 10)
            self.biocarga = max(50.0, self.biocarga + delta)

            # Actualizar monitor
            self.hist_biocarga_monitor.tally(self.biocarga)


# ──────────────────── Componente: Biosensor Clarity ───────────────────────────

class BiosensorClarity(sim.Component):
    def setup(self, tanque: TanqueAgua, plc):
        self.tanque       = tanque
        self.plc          = plc
        self.ultima_lectura = BIOCARGA_INICIAL

    def process(self):
        while True:
            yield self.hold(INTERVALO_SENSOR)

            ruido            = random.gauss(1.0, RUIDO_SENSOR)
            self.ultima_lectura = max(0.0, self.tanque.biocarga * ruido)

            self.plc.on_lectura_sensor(self.ultima_lectura)


# ──────────────────── Componente: PLC (Controlador) ───────────────────────────

class PLCControlador(sim.Component):
    def setup(self, tanque: TanqueAgua):
        self.tanque = tanque

    def on_lectura_sensor(self, biocarga: float):
        """Callback del sensor (modo Clarity)"""
        if biocarga >= UMBRAL_PURGAR:
            if self.tanque.purgar():
                self.tanque.dosificar(DOSIS_EXACTA)
        elif biocarga >= UMBRAL_DOSIFICAR:
            factor = (biocarga - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR)
            factor = max(0.2, min(DOSIS_EXACTA, factor))
            self.tanque.dosificar(factor)

    def process(self):
        if self.tanque.modo == "clarity":
            yield self.passivate()
        else:
            yield from self._modo_ciego()

    def _modo_ciego(self):
        """Lógica de temporizadores fijos"""
        t_ultima_purga = -CADA_PURGA_CIEGA

        while True:
            yield self.hold(CADA_DOSIS_CIEGA)

            self.tanque.dosificar(DOSIS_CIEGA)

            t = self.env.now()
            if t - t_ultima_purga >= CADA_PURGA_CIEGA:
                self.tanque.purgar()
                t_ultima_purga = t


# ──────────────────── Simulación con Visualización ────────────────────────────

def simular_3d():
    """
    Ejecuta simulación comparativa con visualización 3D lado a lado
    """
    print("\n╔═══════════════════════════════════════════════════════════╗")
    print("║     CLARITY — Simulación 3D Interactiva                  ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"  Duración: {HORAS}h simulados")
    print(f"  Escala: 1 hora simulada = 1 segundo real")
    print(f"  Velocidad: {ESCALA_TIEMPO}x\n")

    # Crear entorno (zoom sincronizado: invalida cache de imágenes al cambiar escala)
    env = ZoomSyncEnvironment(trace=False, time_unit="seconds")

    # Configurar ventana de animación
    env.animation_parameters(
        animate=True,
        width=1024,
        height=768,
        x0=0,
        y0=0,
        background_color="#1a1a1a",
        foreground_color="white",
        fps=30,
        modelname="",
        speed=ESCALA_TIEMPO
    )

    # ═══════════════════ TÍTULO PRINCIPAL ═══════════════════
    sim.AnimateText(
        text="CLARITY — Biosensor Óptico para Control de Biocarga en Reciclaje PET",
        x=LAYOUT_CENTER_X, y=680,
        font="Arial", fontsize=22,
        textcolor="white",
        xy_anchor="c"
    )

    # ═══════════════════ RELOJ DE SIMULACIÓN ═══════════════════
    sim.AnimateText(
        text=lambda arg, t: f"Hora simulada: {t/3600:.1f}h / {HORAS}h",
        x=LAYOUT_CENTER_X, y=660,
        fontsize=15,
        textcolor="#cccccc",
        xy_anchor="c"
    )

    # ═══════════════════ LÍNEA DIVISORIA ═══════════════════
    sim.AnimateLine(
        spec=(DIVIDER_CENTER_X, 60, DIVIDER_CENTER_X, 640),
        linewidth=2,
        linecolor="#555555"
    )

    # ═══════════════════ PANEL DE UMBRALES ═══════════════════
    sim.AnimateRectangle(
        spec=(LEFT_CONTENT_EDGE, 85, RIGHT_CONTENT_EDGE, 110),
        fillcolor="#333333",
        linewidth=1,
        linecolor="#555555"
    )

    sim.AnimateText(
        text=f"Umbral Dosis: {UMBRAL_DOSIFICAR:,} UFC/mL  ·  Umbral Purga: {UMBRAL_PURGAR:,} UFC/mL  ·  Capacidad: {BIOCARGA_MAX:,} UFC/mL",
        x=LAYOUT_CENTER_X, y=97,
        fontsize=12,
        textcolor="yellow",
        xy_anchor="c"
    )

    # ═══════════════════ LEYENDA DE COLORES ═══════════════════
    legend_items = [
        ("#0066cc", "<100 Limpio"),
        ("#0099ff", "<200 Mínimo"),
        ("#00cccc", "<350 Detectado"),
        ("#cccc00", "<500 Precaución"),
        ("#ff8800", "<1000 Tratando"),
        ("#ff4400", "<3000 Crítico"),
        ("#ff0000", ">3000 Purga"),
    ]

    legend_y  = 65
    legend_x0 = LEFT_CONTENT_EDGE
    legend_spacing = LAYOUT_WIDTH / max(1, len(legend_items) - 1)

    for i, (col, label) in enumerate(legend_items):
        lx = legend_x0 + i * legend_spacing
        sim.AnimateRectangle(
            spec=(lx, legend_y - 5, lx + 12, legend_y + 5),
            fillcolor=col,
            linewidth=1,
            linecolor="#555555"
        )
        sim.AnimateText(
            text=label,
            x=lx + 15, y=legend_y,
            fontsize=8,
            textcolor="#bbbbbb",
            xy_anchor="w"
        )

    # ═══════════════════ SISTEMA CIEGO (IZQUIERDA) ═══════════════════
    print("  [1/2] Iniciando sistema CIEGO (sin sensor)...")
    tanque_ciego = TanqueAgua(name="tanque_ciego", env=env, modo="ciego", x_offset=LEFT_SYSTEM_CENTER)
    plc_ciego = PLCControlador(name="plc_ciego", env=env, tanque=tanque_ciego)

    # ═══════════════════ SISTEMA CLARITY (DERECHA) ═══════════════════
    print("  [2/2] Iniciando sistema CLARITY (con biosensor)...")
    tanque_clarity = TanqueAgua(name="tanque_clarity", env=env, modo="clarity", x_offset=RIGHT_SYSTEM_CENTER)
    plc_clarity = PLCControlador(name="plc_clarity", env=env, tanque=tanque_clarity)
    sensor = BiosensorClarity(name="sensor_clarity", env=env,
                              tanque=tanque_clarity, plc=plc_clarity)

    print("\n  ► Simulación en progreso...")
    print("  ► Observa la diferencia entre ambos sistemas")
    print("  ► Cierra la ventana de animación para ver el reporte final\n")

    # Ejecutar simulación (SimulationStopped se lanza al cerrar la ventana)
    try:
        env.run(till=T_TOTAL)
    except sim.SimulationStopped:
        print("  ► Ventana de animación cerrada.")

    return tanque_ciego, tanque_clarity


# ──────────────────── Reporte comparativo ─────────────────────────────────────

def reporte(ciego: TanqueAgua, clarity: TanqueAgua):
    def delta(a, b):
        if a == 0:
            return "  —"
        return f"{(b - a) / a * 100:+5.1f}%"

    W = 70
    print("\n" + "═" * W)
    print("  CLARITY — Resultados de Simulación 3D")
    print(f"  Planta Reciclaje PET | {HORAS}h operación")
    print("═" * W)
    print(f"\n  {'Métrica':<38} {'Ciego':>8} {'Clarity':>9} {'Δ':>8}")
    print("  " + "─" * (W - 2))

    filas = [
        ("Agua fresca consumida (L)",      ciego.agua_usada,      clarity.agua_usada),
        ("Químico consumido (unidades)",   ciego.quim_usado,      clarity.quim_usado),
        ("Purgas de agua realizadas",      float(ciego.purgas),   float(clarity.purgas)),
        ("Dosificaciones ejecutadas",      float(ciego.dosificaciones), float(clarity.dosificaciones)),
        ("Biocarga final (UFC/mL)",        ciego.biocarga,        clarity.biocarga),
    ]

    for nombre, vc, vcl in filas:
        print(f"  {nombre:<38} {vc:>8.1f} {vcl:>9.1f} {delta(vc, vcl):>8}")

    print("  " + "─" * (W - 2))

    if ciego.agua_usada > 0:
        ahorro_agua = (ciego.agua_usada - clarity.agua_usada) / ciego.agua_usada * 100
    else:
        ahorro_agua = 0.0
    ahorro_quim = (ciego.quim_usado - clarity.quim_usado) / ciego.quim_usado * 100 if ciego.quim_usado else 0

    print(f"\n  ╔══════════════════════════════════════════════════════════════════╗")
    print(f"  ║  IMPACTO DE CLARITY                                              ║")
    print(f"  ╠══════════════════════════════════════════════════════════════════╣")
    print(f"  ║  ✓ Ahorro de agua       : {ahorro_agua:+6.1f}%  (meta proyecto: -35%)        ║")
    print(f"  ║  ✓ Ahorro de químicos   : {ahorro_quim:+6.1f}%  (vs. sobredosis 120%)        ║")
    print(f"  ║  ✓ Control en tiempo real cada {INTERVALO_SENSOR} segundos                      ║")
    print(f"  ║  ✓ Dosificación precisa vs. margen ciego                        ║")
    print(f"  ║  ✓ Purgas por necesidad real, no calendario                     ║")
    print(f"  ╚══════════════════════════════════════════════════════════════════╝")
    print("\n" + "═" * W + "\n")


# ──────────────────── Entry point ─────────────────────────────────────────────

if __name__ == "__main__":
    ciego, clarity = simular_3d()
    reporte(ciego, clarity)
