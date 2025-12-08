# 1. Usar una imagen base oficial de Python (basada en Debian)
FROM python:3.11-slim

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Instalar dependencias del sistema operativo
# Actualiza la lista de paquetes e instala ffmpeg.
# Este es el paso CRUCIAL para que el procesamiento de .mp3 funcione.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libopus-dev opus-tools && \
    # Limpiar la caché de apt para mantener la imagen pequeña
    rm -rf /var/lib/apt/lists/*

# 4. Copiar el archivo de requisitos de Python
COPY requirements.txt .

# 5. Instalar las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copiar el resto del código de la aplicación al contenedor
COPY . .

# 7. Exponer el puerto en el que se ejecuta la aplicación Flask
EXPOSE 5000

# 8. Comando para ejecutar la aplicación cuando se inicie el contenedor
# Escucha en 0.0.0.0 para que sea accesible desde fuera del contenedor
CMD ["python", "app.py"]