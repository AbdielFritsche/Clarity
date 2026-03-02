"""
Clarity — Biosensor Óptico para Reciclaje PET
Simulación en TIEMPO REAL con visualización matplotlib

Gráficos animados que muestran la evolución del sistema en tiempo real
"""

import sys
import random
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Rectangle, Circle
from collections import deque

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
CADA_PURGA_CIEGA  = 4 * 3600
CADA_DOSIS_CIEGA  = 1 * 3600
COOLDOWN_PURGA    = 1_800

# Sensor
INTERVALO_SENSOR  = 2
RUIDO_SENSOR      = 0.05

# Simulación
DT = 10  # paso de tiempo en segundos
VELOCIDAD = 1800  # aceleración (1800x = 30 min por segundo)


# ──────────────────── Clase Sistema ──────────────────────────────────────

class SistemaAgua:
    def __init__(self, modo: str):
        self.modo = modo
        self.t = 0
        self.biocarga = BIOCARGA_INICIAL
        self.agua_usada = 0.0
        self.quim_usado = 0.0
        self.purgas = 0
        self.dosificaciones = 0
        self.t_ultima_purga = -COOLDOWN_PURGA
        self.t_ultima_dosis = -CADA_DOSIS_CIEGA

        # Historial para gráficas
        self.hist_t = deque(maxlen=500)
        self.hist_biocarga = deque(maxlen=500)
        self.hist_agua = deque(maxlen=500)
        self.hist_quim = deque(maxlen=500)

        # Eventos recientes (para visualización)
        self.evento_dosis_activo = 0
        self.evento_purga_activo = 0

    def dosificar(self, factor: float):
        self.quim_usado += factor
        self.dosificaciones += 1
        self.biocarga *= (1.0 - EFECTO_QUIMICO * factor)
        self.biocarga = max(50.0, self.biocarga)
        self.evento_dosis_activo = 30  # frames de animación

    def purgar(self) -> bool:
        if self.t - self.t_ultima_purga < COOLDOWN_PURGA:
            return False

        self.agua_usada += AGUA_POR_PURGA
        self.purgas += 1
        self.t_ultima_purga = self.t

        fraccion = AGUA_POR_PURGA / VOLUMEN_TANQUE
        self.biocarga *= (1.0 - fraccion * 0.88)
        self.biocarga = max(50.0, self.biocarga)
        self.evento_purga_activo = 30
        return True

    def step(self, dt: float):
        """Avanza la simulación un paso de tiempo"""
        self.t += dt

        # Crecimiento bacteriano
        delta = (TASA_CRECIMIENTO * self.biocarga *
                 (1.0 - self.biocarga / BIOCARGA_MAX) * dt)
        self.biocarga = max(50.0, self.biocarga + delta)

        # Control según modo
        if self.modo == "ciego":
            self._control_ciego()
        else:
            self._control_clarity()

        # Guardar historial
        self.hist_t.append(self.t / 3600)
        self.hist_biocarga.append(self.biocarga)
        self.hist_agua.append(self.agua_usada)
        self.hist_quim.append(self.quim_usado)

        # Decrementar eventos activos
        if self.evento_dosis_activo > 0:
            self.evento_dosis_activo -= 1
        if self.evento_purga_activo > 0:
            self.evento_purga_activo -= 1

    def _control_ciego(self):
        """Control por temporizador fijo"""
        # Dosificación cada hora
        if self.t - self.t_ultima_dosis >= CADA_DOSIS_CIEGA:
            self.dosificar(DOSIS_CIEGA)
            self.t_ultima_dosis = self.t

        # Purga cada 4 horas
        if self.t - self.t_ultima_purga >= CADA_PURGA_CIEGA:
            self.purgar()

    def _control_clarity(self):
        """Control con sensor en tiempo real"""
        # Simular lectura del sensor con ruido
        ruido = random.gauss(1.0, RUIDO_SENSOR)
        lectura = max(0.0, self.biocarga * ruido)

        # Decisión basada en lectura
        if lectura >= UMBRAL_PURGAR:
            if self.purgar():
                self.dosificar(DOSIS_EXACTA)
        elif lectura >= UMBRAL_DOSIFICAR:
            factor = (lectura - UMBRAL_DOSIFICAR) / (UMBRAL_PURGAR - UMBRAL_DOSIFICAR)
            factor = max(0.2, min(DOSIS_EXACTA, factor))
            self.dosificar(factor)


# ──────────────────── Visualización en Tiempo Real ──────────────────────────────────

class VisualizadorClarity:
    def __init__(self):
        self.ciego = SistemaAgua("ciego")
        self.clarity = SistemaAgua("clarity")

        # Configurar figura
        self.fig = plt.figure(figsize=(16, 10))
        self.fig.suptitle('CLARITY — Biosensor Óptico para Control de Biocarga en Reciclaje PET',
                         fontsize=16, fontweight='bold')

        # Crear subplots
        gs = self.fig.add_gridspec(3, 4, hspace=0.4, wspace=0.3)

        # Tanques (arriba)
        self.ax_tanque_ciego = self.fig.add_subplot(gs[0, 0:2])
        self.ax_tanque_clarity = self.fig.add_subplot(gs[0, 2:4])

        # Gráficas de biocarga (medio)
        self.ax_biocarga = self.fig.add_subplot(gs[1, :])

        # Métricas (abajo)
        self.ax_agua = self.fig.add_subplot(gs[2, 0:2])
        self.ax_quim = self.fig.add_subplot(gs[2, 2:4])

        self._setup_plots()

    def _setup_plots(self):
        """Configura los ejes de las gráficas"""
        # Tanques
        for ax, titulo, color in [(self.ax_tanque_ciego, "MODO CIEGO", "red"),
                                    (self.ax_tanque_clarity, "MODO CLARITY", "green")]:
            ax.set_xlim(0, 10)
            ax.set_ylim(0, 10)
            ax.set_aspect('equal')
            ax.axis('off')
            ax.set_title(titulo, fontsize=14, fontweight='bold', color=color)

        # Biocarga
        self.ax_biocarga.set_xlabel('Tiempo (horas)')
        self.ax_biocarga.set_ylabel('Biocarga (UFC/mL)')
        self.ax_biocarga.set_title('Evolución de la Biocarga')
        self.ax_biocarga.grid(True, alpha=0.3)
        self.ax_biocarga.axhline(y=UMBRAL_DOSIFICAR, color='orange', linestyle='--',
                                  label=f'Umbral Dosis ({UMBRAL_DOSIFICAR} UFC/mL)')
        self.ax_biocarga.axhline(y=UMBRAL_PURGAR, color='red', linestyle='--',
                                  label=f'Umbral Purga ({UMBRAL_PURGAR:,} UFC/mL)')
        self.ax_biocarga.legend(loc='upper left')

        # Agua
        self.ax_agua.set_xlabel('Tiempo (horas)')
        self.ax_agua.set_ylabel('Agua Consumida (L)')
        self.ax_agua.set_title('Consumo de Agua Fresca')
        self.ax_agua.grid(True, alpha=0.3)

        # Químicos
        self.ax_quim.set_xlabel('Tiempo (horas)')
        self.ax_quim.set_ylabel('Químico Consumido (u.)')
        self.ax_quim.set_title('Consumo de Químicos')
        self.ax_quim.grid(True, alpha=0.3)

    def _get_color_biocarga(self, biocarga):
        """Color según nivel de biocarga"""
        ratio = biocarga / UMBRAL_PURGAR
        if ratio < 0.2:
            return '#00BFFF'  # azul
        elif ratio < 0.5:
            return '#00FFFF'  # cyan
        elif ratio < 0.8:
            return '#FFFF00'  # amarillo
        elif ratio < 1.0:
            return '#FFA500'  # naranja
        else:
            return '#FF0000'  # rojo

    def _dibujar_tanque(self, ax, sistema):
        """Dibuja la representación visual del tanque"""
        ax.clear()
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.set_aspect('equal')
        ax.axis('off')

        titulo = "MODO CIEGO" if sistema.modo == "ciego" else "MODO CLARITY"
        color_titulo = "red" if sistema.modo == "ciego" else "green"
        ax.set_title(titulo, fontsize=14, fontweight='bold', color=color_titulo)

        # Tanque principal
        tanque = Rectangle((2, 2), 6, 6, linewidth=3, edgecolor='black',
                           facecolor=self._get_color_biocarga(sistema.biocarga))
        ax.add_patch(tanque)

        # Texto de biocarga
        ax.text(5, 5, f'{int(sistema.biocarga)}\nUFC/mL',
                ha='center', va='center', fontsize=16, fontweight='bold',
                color='white' if sistema.biocarga > 1000 else 'black')

        # Indicadores de eventos
        if sistema.evento_dosis_activo > 0:
            dosis_circle = Circle((2, 9), 0.5, color='orange')
            ax.add_patch(dosis_circle)
            ax.text(2, 9.8, 'DOSIS', ha='center', fontsize=8, fontweight='bold')

        if sistema.evento_purga_activo > 0:
            purga_circle = Circle((8, 9), 0.5, color='dodgerblue')
            ax.add_patch(purga_circle)
            ax.text(8, 9.8, 'PURGA', ha='center', fontsize=8, fontweight='bold')

        # Métricas
        info_text = (f'Agua: {int(sistema.agua_usada)} L\n'
                    f'Químico: {sistema.quim_usado:.1f} u.\n'
                    f'Purgas: {sistema.purgas}\n'
                    f'Dosis: {sistema.dosificaciones}')
        ax.text(5, 0.5, info_text, ha='center', va='top', fontsize=9,
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

        # Sensor para Clarity
        if sistema.modo == "clarity":
            sensor = Rectangle((8.5, 4), 1, 2, linewidth=2, edgecolor='purple',
                              facecolor='gray')
            ax.add_patch(sensor)
            ax.text(9, 5, 'SENSOR\n405nm', ha='center', va='center',
                   fontsize=7, color='white', fontweight='bold')

            # Rayo láser (animado)
            if int(sistema.t / INTERVALO_SENSOR) % 2 == 0:
                ax.plot([8.5, 2], [5, 5], 'purple', linewidth=3, alpha=0.7)

    def update(self, frame):
        """Actualiza la animación"""
        # Avanzar simulación
        for _ in range(VELOCIDAD // DT):
            self.ciego.step(DT)
            self.clarity.step(DT)

            if self.ciego.t >= T_TOTAL:
                self.ani.event_source.stop()
                self._mostrar_reporte()
                return

        # Actualizar tanques
        self._dibujar_tanque(self.ax_tanque_ciego, self.ciego)
        self._dibujar_tanque(self.ax_tanque_clarity, self.clarity)

        # Actualizar gráfica de biocarga
        self.ax_biocarga.clear()
        self.ax_biocarga.set_xlabel('Tiempo (horas)')
        self.ax_biocarga.set_ylabel('Biocarga (UFC/mL)')
        self.ax_biocarga.set_title('Evolución de la Biocarga')
        self.ax_biocarga.grid(True, alpha=0.3)
        self.ax_biocarga.axhline(y=UMBRAL_DOSIFICAR, color='orange', linestyle='--', alpha=0.5)
        self.ax_biocarga.axhline(y=UMBRAL_PURGAR, color='red', linestyle='--', alpha=0.5)

        if len(self.ciego.hist_t) > 0:
            self.ax_biocarga.plot(list(self.ciego.hist_t), list(self.ciego.hist_biocarga),
                                 'r-', label='Ciego', linewidth=2)
            self.ax_biocarga.plot(list(self.clarity.hist_t), list(self.clarity.hist_biocarga),
                                 'g-', label='Clarity', linewidth=2)
        self.ax_biocarga.legend()

        # Actualizar gráfica de agua
        self.ax_agua.clear()
        self.ax_agua.set_xlabel('Tiempo (horas)')
        self.ax_agua.set_ylabel('Agua Consumida (L)')
        self.ax_agua.set_title('Consumo de Agua Fresca')
        self.ax_agua.grid(True, alpha=0.3)

        if len(self.ciego.hist_t) > 0:
            self.ax_agua.plot(list(self.ciego.hist_t), list(self.ciego.hist_agua),
                             'r-', label='Ciego', linewidth=2)
            self.ax_agua.plot(list(self.clarity.hist_t), list(self.clarity.hist_agua),
                             'g-', label='Clarity', linewidth=2)
        self.ax_agua.legend()

        # Actualizar gráfica de químicos
        self.ax_quim.clear()
        self.ax_quim.set_xlabel('Tiempo (horas)')
        self.ax_quim.set_ylabel('Químico Consumido (u.)')
        self.ax_quim.set_title('Consumo de Químicos')
        self.ax_quim.grid(True, alpha=0.3)

        if len(self.ciego.hist_t) > 0:
            self.ax_quim.plot(list(self.ciego.hist_t), list(self.ciego.hist_quim),
                             'r-', label='Ciego', linewidth=2)
            self.ax_quim.plot(list(self.clarity.hist_t), list(self.clarity.hist_quim),
                             'g-', label='Clarity', linewidth=2)
        self.ax_quim.legend()

    def _mostrar_reporte(self):
        """Muestra el reporte final"""
        print("\n" + "═" * 70)
        print("  CLARITY — Resultados de Simulación")
        print(f"  Planta Reciclaje PET | {HORAS}h operación")
        print("═" * 70)

        ahorro_agua = ((self.ciego.agua_usada - self.clarity.agua_usada) /
                      self.ciego.agua_usada * 100) if self.ciego.agua_usada > 0 else 0
        ahorro_quim = ((self.ciego.quim_usado - self.clarity.quim_usado) /
                      self.ciego.quim_usado * 100) if self.ciego.quim_usado > 0 else 0

        print(f"\n  Ahorro de agua     : {ahorro_agua:+.1f}%  (meta: -35%)")
        print(f"  Ahorro de químicos : {ahorro_quim:+.1f}%")
        print(f"\n  Agua consumida     : Ciego {self.ciego.agua_usada:.0f} L | Clarity {self.clarity.agua_usada:.0f} L")
        print(f"  Químico consumido  : Ciego {self.ciego.quim_usado:.1f} u. | Clarity {self.clarity.quim_usado:.1f} u.")
        print(f"  Purgas realizadas  : Ciego {self.ciego.purgas} | Clarity {self.clarity.purgas}")
        print(f"  Dosificaciones     : Ciego {self.ciego.dosificaciones} | Clarity {self.clarity.dosificaciones}")
        print("═" * 70 + "\n")

    def run(self):
        """Ejecuta la animación"""
        print("\n╔═══════════════════════════════════════════════════════════╗")
        print("║     CLARITY — Simulación en Tiempo Real                  ║")
        print("╚═══════════════════════════════════════════════════════════╝")
        print(f"  Duración: {HORAS}h simulados")
        print(f"  Velocidad: {VELOCIDAD}x (30 min por segundo)")
        print(f"\n  ► Iniciando visualización animada...")
        print(f"  ► Cierra la ventana para finalizar\n")

        self.ani = animation.FuncAnimation(self.fig, self.update,
                                          interval=50, blit=False, cache_frame_data=False)
        plt.show()


# ──────────────────── Entry point ─────────────────────────────────────────────

if __name__ == "__main__":
    viz = VisualizadorClarity()
    viz.run()
