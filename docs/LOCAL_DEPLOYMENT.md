# Local Installation

## Requirements
- Python 3.13 +
- pip
- Virtualenv (optional - recommended)

## Commands for installation and locally excecution
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
cd Mindfulness-Through-Breathing
pip install -r requirements.txt
python app.py
```

## Commands for installation and locally excecution in a venv
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
cd Mindfulness-Through-Breathing
python3 -m venv venv            # Windows use `venv\Scripts\python -m venv venv`
source venv/bin/activate        # Windows use `venv\Scripts\activate`
pip install -r requirements.txt
python app.py
```