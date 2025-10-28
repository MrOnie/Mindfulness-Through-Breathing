#  Docker deployment
A Docker image based on Python 3.13.5 was created that copies the Flask application code and its dependencies listed in requirements.txt. The container was configured to have Flask listen on all interfaces (0.0.0.0) allowing external access, and port 5000 was exposed to map it to the host. To run the container, use docker run -p 5000:5000 flask-audio-app , and it is recommended to add the --restart unless-stopped option so that the container restarts automatically when the machine boots.

Imagen DockerHub: [flask-audio-app](https://hub.docker.com/r/faitarch/flask-audio-app)


## Crear Tag Github
### Crear un tag para la nueva versión
```bash
# Crear tag (semantic versioning recomendado)
git tag -a [version] -m "Versión [version] con nuevas funcionalidades"

# Subir el tag al repositorio
git push origin [version]
```


## Crear Tag DockerHub
### Run the container locally:
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
git switch production
docker build -t faitarch/flask-audio-app:[version] .
docker run -p 5000:5000 --restart unless-stopped faitarch/flask-audio-app:[version] 
```

### Construir la imagen con el nuevo tag
```bash
# Construir con tag específico
docker build -t faitarch/flask-audio-app:[version] .

# También actualizar latest
docker build -t faitarch/flask-audio-app:latest .
```


