"""
Clarity — Biosensor Óptico para Reciclaje PET
SSimulación INTERACTIVA con Pygame

Visualización en tiempo real del sistema de control de biocarga:
  - Tanque de agua con nivel de contaminación animado
  - Sensor láser con animación de lectura
  - Métricas en tiempo real
  - Eventos visuales de dosificación y purgas
  - Comparación lado a lado: MODO CIEGO vs MODO CLARITY
"""

import sys
import math
import random
import pygame

sys.stdout.reconfigure(encoding="utf-8")

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
AGUA_BASE_POR_HORA = 200     # litros/hora — reposición por evaporación, arrastre y pérdidas
CADA_PURGA_CIEGA  = 4 * 3600
CADA_DOSIS_CIEGA  = 1 * 3600
COOLDOWN_PURGA    = 1_800
PURGA_OBLIGATORIA = 12 * 3600  # purga sanitaria obligatoria cada 12 horas (protocolo de planta)
PURGAS_POR_CICLO  = 2          # número de purgas consecutivas por ciclo obligatorio

# Sensor
INTERVALO_SENSOR  = 2
RUIDO_SENSOR      = 0.05

# Simulación
DT            = 10       # paso de simulación en segundos
ESCALA_TIEMPO = 3600     # 1 hora simulada = 1 segundo real

# ──────────────────── Ventana y Layout ────────────────────────────────────────

WIDTH  = 1280
HEIGHT = 720
FPS    = 60

BG_COLOR     = (26, 26, 26)
DIVIDER_X    = WIDTH // 2
LEFT_CENTER  = WIDTH // 4
RIGHT_CENTER = WIDTH * 3 // 4

# Tanque
TANK_W = 180
TANK_H = 260
TANK_TOP = 120
TANK_BOTTOM = TANK_TOP + TANK_H

# Barra de nivel
BAR_W = 16
BAR_GAP = 12

# ──────────────────── Colores ─────────────────────────────────────────────────

COLOR_LEVELS = [
    (100,   (0, 102, 204)),
    (200,   (0, 153, 255)),
    (350,   (0, 204, 204)),
    (500,   (204, 204, 0)),
    (1000,  (255, 136, 0)),
    (3000,  (255, 68, 0)),
    (99999, (255, 0, 0)),
]

LEGEND_LABELS = [
    ((0, 102, 204),   "<100 Limpio"),
    ((0, 153, 255),   "<200 Mínimo"),
    ((0, 204, 204),   "<350 Detectado"),
    ((204, 204, 0),   "<500 Precaución"),
    ((255, 136, 0),   "<1000 Tratando"),
    ((255, 68, 0),    "<3000 Crítico"),
    ((255, 0, 0),     ">3000 Purga"),
]


def get_biocarga_color(biocarga):
    for threshold, color in COLOR_LEVELS:
        if biocarga < threshold:
            return color
    return (255, 0, 0)


def log_fraction(value):
    if value <= 50:
        return 0.0
    log_min = math.log10(50)
    log_max = math.log10(BIOCARGA_MAX)
    return min(1.0, (math.log10(value) - log_min) / (log_max - log_min))


# ──────────────────── Sistema de Agua (lógica pura) ───────────────────────────

class SistemaAgua:
    """Estado dinámico del agua de lavado en el proceso PET."""

    def __init__(self, modo: str):
        self.modo = modo
        self.biocarga = BIOCARGA_INICIAL
        self.agua_usada = 0.0
        self.quim_usado = 0.0
        self.purgas = 0
        self.dosificaciones = 0
        self.t_ultima_purga = -COOLDOWN_PURGA
        self.t_ultima_purga_obligatoria = 0.0  # purga sanitaria por protocolo

        # Indicadores visuales (frames restantes)
        self.dosis_flash = 0
        self.purga_flash = 0

    def dosificar(self, factor: float):
        self.quim_usado += factor
        self.dosificaciones += 1
        self.biocarga *= (1.0 - EFECTO_QUIMICO * factor)
        self.biocarga = max(50.0, self.biocarga)
        self.dosis_flash = 90

    def purgar(self, t: float, force: bool = False) -> bool:
        if not force and t - self.t_ultima_purga < COOLDOWN_PURGA:
            return False
        self.agua_usada += AGUA_POR_PURGA
        self.purgas += 1
        self.t_ultima_purga = t
        fraccion = AGUA_POR_PURGA / VOLUMEN_TANQUE
        self.biocarga *= (1.0 - fraccion * 0.88)
        self.biocarga = max(50.0, self.biocarga)
        self.purga_flash = 90
        return True

    def step(self, dt: float, t: float = 0.0):
        delta = TASA_CRECIMIENTO * self.biocarga * (1.0 - self.biocarga / BIOCARGA_MAX) * dt
        self.biocarga = max(50.0, self.biocarga + delta)
        # Consumo base de agua (reposición, evaporación, arrastre)
        self.agua_usada += AGUA_BASE_POR_HORA * (dt / 3600)
        # Purga sanitaria obligatoria por protocolo de planta (2 purgas cada 12h)
        if t - self.t_ultima_purga_obligatoria >= PURGA_OBLIGATORIA:
            for _ in range(PURGAS_POR_CICLO):
                self.purgar(t, force=True)
            self.t_ultima_purga_obligatoria = t
        if self.dosis_flash > 0:
            self.dosis_flash -= 1
        if self.purga_flash > 0:
            self.purga_flash -= 1

    def get_estado_text(self):
        b = self.biocarga
        if b < 200:
            return "LIMPIO", (100, 200, 100)
        elif b < 500:
            return "CRECIENDO", (200, 200, 100)
        elif b < 3000:
            return "TRATANDO", (255, 136, 0)
        else:
            return "CRÍTICO", (255, 0, 0)


# ──────────────────── Controlador PLC ─────────────────────────────────────────

class PLCControlador:
    def __init__(self, sistema: SistemaAgua):
        self.sistema = sistema

    def on_lectura_sensor(self, biocarga: float, t: float):
        if biocarga >= UMBRAL_PURGAR:
            if self.sistema.purgar(t):
                self.sistema.dosificar(DOSIS_EXACTA)
        elif biocarga >= UMBRAL_DOSIFICAR:
            factor = (biocarga - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR)
            factor = max(0.2, min(DOSIS_EXACTA, factor))
            self.sistema.dosificar(factor)

    def step_ciego(self, t, t_ultima_dosis, t_ultima_purga_ciego):
        dosis_out = t_ultima_dosis
        purga_out = t_ultima_purga_ciego

        if t - t_ultima_dosis >= CADA_DOSIS_CIEGA:
            self.sistema.dosificar(DOSIS_CIEGA)
            dosis_out = t

        if t - t_ultima_purga_ciego >= CADA_PURGA_CIEGA:
            self.sistema.purgar(t)
            purga_out = t

        return dosis_out, purga_out


# ──────────────────── Biosensor Clarity ───────────────────────────────────────

class BiosensorClarity:
    def __init__(self, sistema: SistemaAgua, plc: PLCControlador):
        self.sistema = sistema
        self.plc = plc
        self.ultima_lectura = BIOCARGA_INICIAL
        self.t_ultima_lectura = 0.0

    def step(self, t: float):
        if t - self.t_ultima_lectura >= INTERVALO_SENSOR:
            self.t_ultima_lectura = t
            ruido = random.gauss(1.0, RUIDO_SENSOR)
            self.ultima_lectura = max(0.0, self.sistema.biocarga * ruido)
            self.plc.on_lectura_sensor(self.ultima_lectura, t)


# ──────────────────── Funciones de dibujo ─────────────────────────────────────

def draw_text_centered(surface, text, x, y, font, color=(255, 255, 255)):
    rendered = font.render(text, True, color)
    rect = rendered.get_rect(center=(x, y))
    surface.blit(rendered, rect)


def draw_text_left(surface, text, x, y, font, color=(255, 255, 255)):
    rendered = font.render(text, True, color)
    surface.blit(rendered, (x, y))


def draw_tank(surface, sistema, center_x, fonts, sim_time):
    """Dibuja un tanque completo con toda su información"""
    color_bio = get_biocarga_color(sistema.biocarga)
    is_clarity = sistema.modo == "clarity"

    # ─── Título del modo ───
    mode_color = (0, 200, 0) if is_clarity else (220, 50, 50)
    mode_title = "MODO CLARITY" if is_clarity else "MODO CIEGO"
    draw_text_centered(surface, mode_title, center_x, TANK_TOP - 52, fonts["title"], mode_color)

    subtitle = "Sensor láser 405nm — lazo cerrado" if is_clarity else "Sin sensor — temporizadores fijos"
    draw_text_centered(surface, subtitle, center_x, TANK_TOP - 30, fonts["small"], (170, 170, 170))

    draw_text_centered(surface, "TANQUE DE AGUA", center_x, TANK_TOP - 14, fonts["small"], (200, 200, 200))

    # ─── Tanque interior (agua coloreada) ───
    tank_left = center_x - TANK_W // 2
    tank_rect = pygame.Rect(tank_left, TANK_TOP, TANK_W, TANK_H)
    pygame.draw.rect(surface, color_bio, tank_rect)

    # ─── Marco exterior ───
    frame_rect = tank_rect.inflate(6, 6)
    pygame.draw.rect(surface, (136, 136, 136), frame_rect, 4)

    # ─── Biocarga centrada ───
    tank_mid_y = TANK_TOP + TANK_H // 2
    draw_text_centered(surface, f"{int(sistema.biocarga)}", center_x, tank_mid_y - 6, fonts["biocarga"])
    draw_text_centered(surface, "UFC/mL", center_x, tank_mid_y + 22, fonts["unit"], (220, 220, 220))

    # ─── Barra de nivel logarítmica ───
    bar_left = tank_left + TANK_W + BAR_GAP
    bar_rect = pygame.Rect(bar_left, TANK_TOP, BAR_W, TANK_H)
    pygame.draw.rect(surface, (26, 26, 26), bar_rect)
    pygame.draw.rect(surface, (100, 100, 100), bar_rect, 2)

    frac = log_fraction(sistema.biocarga)
    fill_h = max(1, int((TANK_H - 4) * frac))
    fill_rect = pygame.Rect(bar_left + 2, TANK_TOP + TANK_H - 2 - fill_h, BAR_W - 4, fill_h)
    pygame.draw.rect(surface, color_bio, fill_rect)

    # Marcas de umbral
    frac_dosis = log_fraction(UMBRAL_DOSIFICAR)
    frac_purga = log_fraction(UMBRAL_PURGAR)
    y_dosis = TANK_TOP + TANK_H - int(TANK_H * frac_dosis)
    y_purga = TANK_TOP + TANK_H - int(TANK_H * frac_purga)

    pygame.draw.line(surface, (255, 165, 0), (bar_left - 4, y_dosis), (bar_left + BAR_W + 4, y_dosis), 2)
    draw_text_left(surface, "D", bar_left + BAR_W + 6, y_dosis - 6, fonts["tiny"], (255, 165, 0))

    pygame.draw.line(surface, (255, 50, 50), (bar_left - 4, y_purga), (bar_left + BAR_W + 4, y_purga), 2)
    draw_text_left(surface, "P", bar_left + BAR_W + 6, y_purga - 6, fonts["tiny"], (255, 50, 50))

    # ─── Sensor Clarity ───
    if is_clarity:
        sens_w = 70
        sens_h = 90
        sens_right = tank_left - 10
        sens_left = sens_right - sens_w
        sens_top = tank_mid_y - sens_h // 2
        sens_rect = pygame.Rect(sens_left, sens_top, sens_w, sens_h)
        pygame.draw.rect(surface, (105, 105, 105), sens_rect)
        pygame.draw.rect(surface, (50, 50, 50), sens_rect, 3)

        sens_cx = sens_left + sens_w // 2
        draw_text_centered(surface, "SENSOR", sens_cx, sens_top + 25, fonts["tiny"])
        draw_text_centered(surface, "CLARITY", sens_cx, sens_top + 40, fonts["tiny"])
        draw_text_centered(surface, "405nm", sens_cx, sens_top + 62, fonts["tiny"], (0, 220, 220))

        # Láser pulsante
        pulse = int(sim_time / INTERVALO_SENSOR) % 2 == 0
        if pulse:
            laser_color = (180, 0, 255)
            pygame.draw.line(surface, laser_color, (sens_right, tank_mid_y), (tank_left, tank_mid_y), 4)
            pygame.draw.circle(surface, laser_color, (tank_left, tank_mid_y), 5)

    # ─── Indicadores de eventos ───
    ind_y = TANK_BOTTOM + 40

    # Dosis
    dosis_cx = center_x - 50
    dosis_color = (255, 165, 0)
    if sistema.dosis_flash > 0:
        pygame.draw.circle(surface, dosis_color, (dosis_cx, ind_y), 14)
    pygame.draw.circle(surface, dosis_color, (dosis_cx, ind_y), 14, 3)
    draw_text_centered(surface, "DOSIS", dosis_cx, ind_y + 24, fonts["tiny"], dosis_color)

    # Purga
    purga_cx = center_x + 50
    purga_color = (30, 144, 255)
    if sistema.purga_flash > 0:
        pygame.draw.circle(surface, purga_color, (purga_cx, ind_y), 14)
    pygame.draw.circle(surface, purga_color, (purga_cx, ind_y), 14, 3)
    draw_text_centered(surface, "PURGA", purga_cx, ind_y + 24, fonts["tiny"], purga_color)

    # ─── Panel de métricas ───
    met_top = ind_y + 52
    met_w = 200
    met_h = 130
    met_left = center_x - met_w // 2
    met_rect = pygame.Rect(met_left, met_top, met_w, met_h)
    pygame.draw.rect(surface, (38, 38, 38), met_rect)
    pygame.draw.rect(surface, (77, 77, 77), met_rect, 2)

    draw_text_centered(surface, "MÉTRICAS", center_x, met_top + 14, fonts["met_title"])

    metrics = [
        (f"Químico: {sistema.quim_usado:.1f} u.", (255, 255, 80)),
        (f"Agua: {int(sistema.agua_usada)} L", (80, 255, 255)),
        (f"Purgas: {sistema.purgas}", (173, 216, 230)),
        (f"Dosif.: {sistema.dosificaciones}", (255, 165, 0)),
    ]
    for i, (txt, col) in enumerate(metrics):
        draw_text_centered(surface, txt, center_x, met_top + 36 + i * 18, fonts["metric"], col)

    estado_text, estado_color = sistema.get_estado_text()
    draw_text_centered(surface, f"● {estado_text}", center_x, met_top + met_h - 10, fonts["small"], estado_color)


def draw_header(surface, fonts, sim_time):
    draw_text_centered(
        surface,
        "CLARITY — Biosensor Óptico para Control de Biocarga en Reciclaje PET",
        WIDTH // 2, 30, fonts["header"]
    )
    draw_text_centered(
        surface,
        f"Hora simulada: {sim_time / 3600:.1f}h / {HORAS}h",
        WIDTH // 2, 56, fonts["clock"], (200, 200, 200)
    )


def draw_divider(surface):
    pygame.draw.line(surface, (85, 85, 85), (DIVIDER_X, 75), (DIVIDER_X, HEIGHT - 70), 2)


def draw_footer(surface, fonts):
    # Leyenda de colores at very bottom
    legend_y = HEIGHT - 22
    total_legend_w = len(LEGEND_LABELS) * 120
    legend_start_x = (WIDTH - total_legend_w) // 2

    for i, (col, label) in enumerate(LEGEND_LABELS):
        lx = legend_start_x + i * 120
        pygame.draw.rect(surface, col, (lx, legend_y, 12, 12))
        pygame.draw.rect(surface, (85, 85, 85), (lx, legend_y, 12, 12), 1)
        draw_text_left(surface, label, lx + 16, legend_y - 1, fonts["legend"], (187, 187, 187))

    # Panel de umbrales just above legend
    panel_w = 780
    panel_h = 24
    panel_left = (WIDTH - panel_w) // 2
    panel_top = legend_y - 30
    panel_rect = pygame.Rect(panel_left, panel_top, panel_w, panel_h)
    pygame.draw.rect(surface, (51, 51, 51), panel_rect)
    pygame.draw.rect(surface, (85, 85, 85), panel_rect, 1)

    threshold_text = f"Umbral Dosis: {UMBRAL_DOSIFICAR:,} UFC/mL  ·  Umbral Purga: {UMBRAL_PURGAR:,} UFC/mL  ·  Capacidad: {BIOCARGA_MAX:,} UFC/mL"
    draw_text_centered(surface, threshold_text, WIDTH // 2, panel_top + 12, fonts["metric"], (255, 255, 80))


def draw_speed_controls(surface, fonts, paused, speed_multiplier):
    y = HEIGHT - 60
    x = WIDTH - 20

    speed_text = f"{'⏸ PAUSA' if paused else f'▶ {speed_multiplier}x'}"
    speed_color = (255, 100, 100) if paused else (100, 255, 100)
    rendered = fonts["small"].render(speed_text, True, speed_color)
    rect = rendered.get_rect(topright=(x, y - 30))
    surface.blit(rendered, rect)

    help_text = "[Space] Pausa  [↑↓] Velocidad"
    rendered = fonts["legend"].render(help_text, True, (120, 120, 120))
    rect = rendered.get_rect(topright=(x, y - 12))
    surface.blit(rendered, rect)


def draw_results_overlay(surface, fonts, ciego, clarity):
    """Panel de resultados comparativos que aparece al terminar la simulación."""
    # Overlay oscuro semi-transparente
    overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 200))
    surface.blit(overlay, (0, 0))

    # Panel principal
    panel_w = 720
    panel_h = 520
    px = (WIDTH - panel_w) // 2
    py = (HEIGHT - panel_h) // 2
    panel_rect = pygame.Rect(px, py, panel_w, panel_h)

    # Fondo del panel con borde
    pygame.draw.rect(surface, (30, 30, 40), panel_rect, border_radius=12)
    pygame.draw.rect(surface, (0, 180, 255), panel_rect, 3, border_radius=12)

    # Fuentes para resultados
    f_title = fonts.get("res_title", fonts["title"])
    f_sub   = fonts.get("res_sub", fonts["small"])
    f_head  = fonts.get("res_head", fonts["met_title"])
    f_row   = fonts.get("res_row", fonts["metric"])
    f_note  = fonts.get("res_note", fonts["tiny"])

    cy = py + 30  # cursor vertical

    # Título
    draw_text_centered(surface, "RESULTADOS DE SIMULACIÓN", WIDTH // 2, cy, f_title, (0, 200, 255))
    cy += 26
    draw_text_centered(surface, f"Planta Reciclaje PET — {HORAS}h de operación",
                       WIDTH // 2, cy, f_sub, (180, 180, 180))
    cy += 30

    # Línea separadora
    pygame.draw.line(surface, (0, 140, 200), (px + 30, cy), (px + panel_w - 30, cy), 1)
    cy += 16

    # Encabezados de columna
    col_label = px + 40
    col_ciego = px + 400
    col_clarity = px + 520
    col_delta = px + 640

    for txt, cx in [("Métrica", col_label), ("Ciego", col_ciego),
                    ("Clarity", col_clarity), ("Δ", col_delta)]:
        rendered = f_head.render(txt, True, (200, 200, 200))
        r = rendered.get_rect(midleft=(cx, cy) if txt == "Métrica" else (0,0))
        if txt == "Métrica":
            surface.blit(rendered, r)
        else:
            r = rendered.get_rect(center=(cx, cy))
            surface.blit(rendered, r)
    cy += 22

    pygame.draw.line(surface, (80, 80, 100), (px + 30, cy), (px + panel_w - 30, cy), 1)
    cy += 10

    # Filas de datos
    def delta_str(a, b):
        if a == 0:
            return "—"
        pct = (b - a) / a * 100
        return f"{pct:+.1f}%"

    def delta_color(a, b):
        if a == 0:
            return (180, 180, 180)
        return (100, 255, 100) if b < a else (255, 100, 100) if b > a else (180, 180, 180)

    rows = [
        ("Agua fresca consumida",   f"{int(ciego.agua_usada):,} L",         f"{int(clarity.agua_usada):,} L",
         delta_str(ciego.agua_usada, clarity.agua_usada), delta_color(ciego.agua_usada, clarity.agua_usada)),
        ("Químico utilizado",       f"{ciego.quim_usado:.1f} u.",           f"{clarity.quim_usado:.1f} u.",
         delta_str(ciego.quim_usado, clarity.quim_usado), delta_color(ciego.quim_usado, clarity.quim_usado)),
        ("Purgas realizadas",       f"{ciego.purgas}",                      f"{clarity.purgas}",
         delta_str(ciego.purgas, clarity.purgas), delta_color(ciego.purgas, clarity.purgas)),
        ("Dosificaciones",          f"{ciego.dosificaciones}",              f"{clarity.dosificaciones}",
         delta_str(ciego.dosificaciones, clarity.dosificaciones), delta_color(ciego.dosificaciones, clarity.dosificaciones)),
        ("Biocarga final",          f"{int(ciego.biocarga):,} UFC/mL",      f"{int(clarity.biocarga):,} UFC/mL",
         delta_str(ciego.biocarga, clarity.biocarga), delta_color(ciego.biocarga, clarity.biocarga)),
    ]

    for label, val_c, val_cl, d_str, d_col in rows:
        # Label
        rendered = f_row.render(label, True, (220, 220, 220))
        surface.blit(rendered, (col_label, cy))

        # Valor ciego
        rendered = f_row.render(val_c, True, (220, 80, 80))
        r = rendered.get_rect(center=(col_ciego, cy + 8))
        surface.blit(rendered, r)

        # Valor Clarity
        rendered = f_row.render(val_cl, True, (80, 220, 80))
        r = rendered.get_rect(center=(col_clarity, cy + 8))
        surface.blit(rendered, r)

        # Delta
        rendered = f_row.render(d_str, True, d_col)
        r = rendered.get_rect(center=(col_delta, cy + 8))
        surface.blit(rendered, r)

        cy += 28

    cy += 8
    pygame.draw.line(surface, (80, 80, 100), (px + 30, cy), (px + panel_w - 30, cy), 1)
    cy += 16

    # Bloque de impacto
    ahorro_agua = (ciego.agua_usada - clarity.agua_usada) / ciego.agua_usada * 100 if ciego.agua_usada else 0
    ahorro_quim = (ciego.quim_usado - clarity.quim_usado) / ciego.quim_usado * 100 if ciego.quim_usado else 0

    # Recuadro de impacto
    imp_rect = pygame.Rect(px + 30, cy - 4, panel_w - 60, 120)
    pygame.draw.rect(surface, (20, 40, 30), imp_rect, border_radius=8)
    pygame.draw.rect(surface, (0, 180, 100), imp_rect, 2, border_radius=8)

    draw_text_centered(surface, "IMPACTO DE CLARITY", WIDTH // 2, cy + 12, f_head, (0, 255, 160))
    cy += 32

    impact_lines = [
        (f"Ahorro de agua:  {ahorro_agua:+.1f}%", (100, 220, 255)),
        (f"Ahorro de químicos:  {ahorro_quim:+.1f}%", (255, 255, 100)),
        (f"Control en tiempo real cada {INTERVALO_SENSOR}s — dosificación precisa", (180, 220, 180)),
    ]

    for txt, col in impact_lines:
        draw_text_centered(surface, txt, WIDTH // 2, cy, f_row, col)
        cy += 22

    # Nota al pie
    cy = py + panel_h - 28
    draw_text_centered(surface, "Presiona Esc para cerrar",
                       WIDTH // 2, cy, f_note, (120, 120, 140))


# ──────────────────── Bucle principal ─────────────────────────────────────────

def simular_3d():
    print("\n╔═══════════════════════════════════════════════════════════╗")
    print("║     CLARITY — Simulación Interactiva (Pygame)            ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"  Duración: {HORAS}h simulados")
    print(f"  Escala: 1 hora simulada = 1 segundo real")
    print(f"  Velocidad: {ESCALA_TIEMPO}x\n")

    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("CLARITY — Simulación de Biosensor Óptico para Reciclaje PET")
    clock = pygame.time.Clock()

    # ─── Fuentes ───
    fonts = {
        "header":    pygame.font.SysFont("Arial", 20, bold=True),
        "clock":     pygame.font.SysFont("Arial", 15),
        "title":     pygame.font.SysFont("Arial", 24, bold=True),
        "small":     pygame.font.SysFont("Arial", 12),
        "biocarga":  pygame.font.SysFont("Courier New", 32, bold=True),
        "unit":      pygame.font.SysFont("Courier New", 13),
        "met_title": pygame.font.SysFont("Arial", 14, bold=True),
        "metric":    pygame.font.SysFont("Arial", 13),
        "tiny":      pygame.font.SysFont("Arial", 11),
        "legend":    pygame.font.SysFont("Arial", 10),
    }

    # ─── Sistemas ───
    print("  [1/2] Iniciando sistema CIEGO (sin sensor)...")
    sys_ciego = SistemaAgua("ciego")
    plc_ciego = PLCControlador(sys_ciego)
    t_ultima_dosis_ciego = 0.0
    t_ultima_purga_ciego = 0.0

    print("  [2/2] Iniciando sistema CLARITY (con biosensor)...")
    sys_clarity = SistemaAgua("clarity")
    plc_clarity = PLCControlador(sys_clarity)
    sensor = BiosensorClarity(sys_clarity, plc_clarity)

    print("\n  ► Simulación en progreso...")
    print("  ► [Space] Pausar  [↑↓] Velocidad  [Esc/Cerrar] Salir\n")

    sim_time = 0.0
    speed_multiplier = ESCALA_TIEMPO
    paused = False
    running = True

    while running:
        dt_real = clock.tick(FPS) / 1000.0

        # ─── Eventos ───
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    paused = not paused
                elif event.key == pygame.K_UP:
                    speed_multiplier = min(speed_multiplier * 2, 28800)
                elif event.key == pygame.K_DOWN:
                    speed_multiplier = max(speed_multiplier // 2, 60)

        # ─── Avance de simulación ───
        if not paused and sim_time < T_TOTAL:
            sim_dt = dt_real * speed_multiplier
            steps = max(1, int(sim_dt / DT))
            step_dt = sim_dt / steps

            for _ in range(steps):
                if sim_time >= T_TOTAL:
                    break

                sys_ciego.step(step_dt, sim_time)
                sys_clarity.step(step_dt, sim_time)

                t_ultima_dosis_ciego, t_ultima_purga_ciego = plc_ciego.step_ciego(
                    sim_time, t_ultima_dosis_ciego, t_ultima_purga_ciego
                )

                sensor.step(sim_time)

                sim_time += step_dt

        # ─── Dibujo ───
        screen.fill(BG_COLOR)

        draw_header(screen, fonts, sim_time)
        draw_divider(screen)
        draw_tank(screen, sys_ciego, LEFT_CENTER, fonts, sim_time)
        draw_tank(screen, sys_clarity, RIGHT_CENTER, fonts, sim_time)
        draw_footer(screen, fonts)
        draw_speed_controls(screen, fonts, paused, speed_multiplier)

        if sim_time >= T_TOTAL:
            draw_results_overlay(screen, fonts, sys_ciego, sys_clarity)

        pygame.display.flip()

    pygame.quit()
    return sys_ciego, sys_clarity


# ──────────────────── Reporte comparativo ─────────────────────────────────────

def reporte(ciego: SistemaAgua, clarity: SistemaAgua):
    def delta(a, b):
        if a == 0:
            return "  —"
        return f"{(b - a) / a * 100:+5.1f}%"

    W = 70
    print("\n" + "═" * W)
    print("  CLARITY — Resultados de Simulación")
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
