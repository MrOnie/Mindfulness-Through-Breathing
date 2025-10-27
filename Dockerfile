# Usa una imagen oficial de Python
FROM python:3.13.5

# Establece el directorio de trabajo
WORKDIR /app

# Copia e instala dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo el contenido del proyecto al contenedor
COPY . .

# Exponer el puerto 5000 (Flask lo usa por defecto)
EXPOSE 5000

# Ejecutar la app con el servidor de desarrollo
CMD ["python", "app.py"]
