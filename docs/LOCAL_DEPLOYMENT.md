# Instalación local

## Requisitos
- Python 3.13 o superior
- pip
- Virtualenv (opcional pero recomendado)

## Comandos para instalar y ejecutar la aplicación localmente
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
cd Mindfulness-Through-Breathing
pip install -r requirements.txt
python app.py
```

## Comandos para instalar y ejecutar la aplicación localmente en un entorno virtual
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
cd Mindfulness-Through-Breathing
python3 -m venv venv            # En Windows usa `venv\Scripts\python -m venv venv`
source venv/bin/activate        # En Windows usa `venv\Scripts\activate`
pip install -r requirements.txt
python app.py
```