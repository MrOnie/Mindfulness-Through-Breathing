#!/bin/bash

# Script de despliegue automático con versionado semántico
echo "🚀 Despliegue Automático - Docker Hub"
echo "======================================"

# Obtener última versión de Git (más confiable)
echo "📡 Buscando última versión en Git..."
LAST_VERSION=$(git describe --tags `git rev-list --tags --max-count=1` 2>/dev/null)

if [ -z "$LAST_VERSION" ]; then
    LAST_VERSION="v0.0.0"
    echo "ℹ️  No se encontraron tags anteriores, empezando desde $LAST_VERSION"
else
    echo "📦 Última versión encontrada: $LAST_VERSION"
fi

# Extraer números de versión (manejar formato vX.Y.Z)
CURRENT_MAJOR=$(echo $LAST_VERSION | sed 's/^v//' | cut -d'.' -f1)
CURRENT_MINOR=$(echo $LAST_VERSION | sed 's/^v//' | cut -d'.' -f2)
CURRENT_PATCH=$(echo $LAST_VERSION | sed 's/^v//' | cut -d'.' -f3)

# Si algún número está vacío, establecer a 0
CURRENT_MAJOR=${CURRENT_MAJOR:-0}
CURRENT_MINOR=${CURRENT_MINOR:-0}
CURRENT_PATCH=${CURRENT_PATCH:-0}

echo ""
echo "🎯 ¿Qué tipo de cambio estás desplegando?"
echo "1. 🐛 Bug fix (PATCH) - v$CURRENT_MAJOR.$CURRENT_MINOR.$((CURRENT_PATCH + 1))"
echo "2. ✨ Nueva funcionalidad (MINOR) - v$CURRENT_MAJOR.$((CURRENT_MINOR + 1)).0"
echo "3. 💥 Cambio importante (MAJOR) - v$((CURRENT_MAJOR + 1)).0.0"
echo "4. 🔢 Versión personalizada"
echo ""

read -p "Selecciona opción (1-4): " option

case $option in
    1)
        NEW_VERSION="v$CURRENT_MAJOR.$CURRENT_MINOR.$((CURRENT_PATCH + 1))"
        CHANGE_TYPE="Bug fix"
        ;;
    2)
        NEW_VERSION="v$CURRENT_MAJOR.$((CURRENT_MINOR + 1)).0"
        CHANGE_TYPE="Nueva funcionalidad"
        ;;
    3)
        NEW_VERSION="v$((CURRENT_MAJOR + 1)).0.0"
        CHANGE_TYPE="Cambio importante"
        ;;
    4)
        read -p "📌 Ingresa versión personalizada (ej: v2.1.3): " NEW_VERSION
        CHANGE_TYPE="Personalizada"
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

# Validar formato de versión
if ! echo "$NEW_VERSION" | grep -qE "^v[0-9]+\.[0-9]+\.[0-9]+$"; then
    echo "❌ Formato de versión inválido. Debe ser: vX.Y.Z"
    exit 1
fi

# Confirmar despliegue
echo ""
echo "📋 Resumen del despliegue:"
echo "   Tipo: $CHANGE_TYPE"
echo "   Versión actual: $LAST_VERSION"
echo "   Nueva versión: $NEW_VERSION"
echo "   Imagen: faitarch/flask-audio-app:$NEW_VERSION"
echo ""

read -p "¿Continuar con el despliegue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Despliegue cancelado"
    exit 0
fi

# Verificar que estamos en el directorio correcto con Dockerfile
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: No se encuentra Dockerfile en el directorio actual"
    echo "💡 Asegúrate de estar en el directorio del proyecto"
    exit 1
fi

# Ejecutar despliegue
echo "🔨 Construyendo imagen $NEW_VERSION..."
docker build -t faitarch/flask-audio-app:$NEW_VERSION .
docker build -t faitarch/flask-audio-app:latest .

echo "📤 Subiendo a Docker Hub..."
docker push faitarch/flask-audio-app:$NEW_VERSION
docker push faitarch/flask-audio-app:latest

echo "✅ Versión $NEW_VERSION desplegada correctamente"

# Crear tag en Git
echo "🏷 Creando tag $NEW_VERSION en Git..."
git tag -a $NEW_VERSION -m "Versión $NEW_VERSION - $CHANGE_TYPE"
git push origin $NEW_VERSION

echo "🎯 Para ejecutar: docker run -p 5000:5000 faitarch/flask-audio-app:$NEW_VERSION"
echo "🌐 Imagen disponible en: https://hub.docker.com/r/faitarch/flask-audio-app"