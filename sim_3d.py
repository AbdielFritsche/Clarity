from ursina import *
import random

# ==========================================
# 1. CLASES DE LA LÍNEA DE PRODUCCIÓN (3D)
# ==========================================

class LotePET3D(Entity):
    def __init__(self, **kwargs):
        super().__init__(
            model='cube',
            color=color.blue,  # PET sucio
            scale=(0.5, 0.5, 0.5),
            **kwargs # Esto permite pasar la posición (u otros argumentos) de forma nativa
        )
        self.etapa = "transito"
        self.velocidad = 2

    def update(self):
        # El método update() se ejecuta en cada frame automáticamente en Ursina
        if self.etapa == "transito":
            self.x += self.velocidad * time.dt

class CintaTransportadora(Entity):
    def __init__(self, **kwargs):
        super().__init__(
            model='cube',
            color=color.dark_gray,
            scale=(5, 0.2, 1),
            **kwargs
        )

class MolinoTriturador(Entity):
    def __init__(self, **kwargs):
        super().__init__(
            model='cube', # Aquí luego puedes cargar tu propio modelo: model='molino.obj'
            color=color.gray,
            scale=(1.5, 2, 1.5),
            **kwargs
        )
        self.ocupado = False

# ==========================================
# 2. EL NÚCLEO DEL PROYECTO CLARITY
# ==========================================

class TanqueLavado(Entity):
    def __init__(self, nombre="Tanque Clarity", **kwargs):
        # El contenedor físico del tanque
        super().__init__(
            model='cube',
            color=color.white50, # Semitransparente para ver el agua
            scale=(3, 3, 3),
            **kwargs
        )
        self.nombre = nombre
        
        # --- Variables del proceso Clarity ---
        self.biocarga = 100
        self.biocarga_max = 30000
        self.tasa_crecimiento = 500  # Acelerado para la simulación visual
        
        # --- Representación del Agua en 3D ---
        # Creamos una entidad hija (el agua) dentro del tanque
        self.agua_3d = Entity(
            parent=self, # El agua se mueve y escala relativa al tanque
            model='cube',
            color=color.rgba(0, 102, 204, 200), # Azul limpio inicial
            scale=(0.95, 0.8, 0.95), # Ligeramente más pequeña que el tanque
            position=(0, -0.1, 0)
        )
        
        # --- Sensor Láser 3D ---
        self.sensor_laser = Entity(
            parent=self,
            model='cube',
            color=color.black,
            scale=(0.2, 0.2, 0.5),
            position=(0.5, 0.5, 0)
        )
        self.rayo = Entity(
            parent=self.sensor_laser,
            model='cube',
            color=color.clear, # Invisible por defecto
            scale=(0.05, 0.05, 5),
            position=(-2.5, 0, 0)
        )

    def simular_crecimiento_bacteriano(self):
        # Aumentamos la biocarga
        self.biocarga += self.tasa_crecimiento * time.dt
        
        # Cambiamos el color del agua 3D según la contaminación (de azul a rojo/verde oscuro)
        if self.biocarga > 3000:
            self.agua_3d.color = color.rgba(255, 0, 0, 200) # Crítico
        elif self.biocarga > 500:
            self.agua_3d.color = color.rgba(204, 204, 0, 200) # Precaución
        else:
            self.agua_3d.color = color.rgba(0, 153, 255, 200) # Limpio

    def disparar_laser(self):
        # Animación del láser del sensor Clarity
        self.rayo.color = color.magenta
        invoke(setattr, self.rayo, 'color', color.clear, delay=0.1) # Se apaga en 0.1s

    def update(self):
        # Lógica continua del tanque
        self.simular_crecimiento_bacteriano()
        
        # El sensor lee cada segundo (60 frames aprox)
        if random.random() < 0.02: 
            self.disparar_laser()

# ==========================================
# 3. ENSAMBLAJE DE LA PLANTA (Main)
# ==========================================

def iniciar_planta_3d():
    app = Ursina()

    # Ajustamos la cámara para tener una vista isométrica de la planta
    camera.position = (5, 5, -15)
    camera.rotation_x = 15

    # Instanciamos los objetos usando el argumento 'position' estándar de Ursina
    cinta = CintaTransportadora(position=(0, 0, 0))
    molino = MolinoTriturador(position=(-3, 1, 0))
    
    # Aquí instanciamos el tanque principal de tu proyecto
    tanque_clarity = TanqueLavado(position=(3, 1.5, 0))

    # Generamos un primer lote de prueba
    LotePET3D(position=(-5, 1, 0))

    # Añadimos iluminación básica
    DirectionalLight(y=2, z=3, shadows=True)

    app.run()

if __name__ == '__main__':
    iniciar_planta_3d()