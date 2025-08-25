# Mindfulness Through Breathing: Interactive Analysis Tool

This project is a web-based interface for analyzing respiratory patterns from audio recordings. It helps users visualize their breathing, interactively correct detected respiratory phases (inhalation, exhalation, apnea), and receive real-time feedback on their technique based on metrics like depth, stability, and balance.

All analysis results are saved persistently in a local SQLite database, allowing for a durable record of each session.

## Key Features

-   **Audio Upload:** Upload `.wav` audio files of breathing sessions.
-   **Participant Tracking:** Mandatory input for participant name/code, used for organizing results folders and database records.
-   **Audio Playback with Visual Sync:** Play uploaded audio with a synchronized vertical indicator bar on the respiratory phase chart.
-   **Automatic Phase Detection:** The backend analyzes the audio to identify and segment inhalation, exhalation, and apnea phases.
-   **Interactive Charting:**
    -   Visualizes the audio signal and an amplitude envelope plot where respiratory phases are clearly marked.
    -   **Full Interactivity:** Select, merge, or delete detected phase blocks directly on the chart.
    -   All changes instantly update the respiratory cycle table and performance scores.
-   **Real-Time Analysis & Feedback:**
    -   **Respiratory Cycles Table:** Automatically groups phases into complete respiratory cycles and calculates durations.
    -   **Performance Scores:** Provides scores for **Depth**, **Stability**, and **Internal Balance**, plus a final weighted score.
    -   **Personalized Recommendations:** Offers a simple, actionable tip based on the weakest performance area.
-   **Persistent Storage with SQLite:**
    -   Each analysis session is saved as a record in a local **SQLite database** (`mindfulness_analysis.db`).
    -   Interactive changes made in the UI **update the original database record**, ensuring data integrity and preventing duplicate entries.
-   **Data Export:** For every session, the raw results (cycles table, segmentation chart, and ML-ready JSON) are still saved to the `results/` directory.
-   **User-Friendly Interface:** Includes a loading indicator during analysis for better user experience.

## How It Works

1.  **Backend (Python & Flask):**
    -   **Audio Processing:** Uses `librosa` to load audio and calculate an amplitude envelope.
    -   **Phase Detection:** A threshold-based algorithm identifies active breathing vs. apnea.
    -   **Data Analysis:** `pandas` is used for structuring and analyzing respiratory cycles.
    -   **Database:** The `sqlite3` module handles all interactions with the local database (creation, insertion, and updates).
    -   **Web Framework:** Flask manages file uploads, serves the frontend, and provides an API endpoint (`/recalculate_table`) for real-time updates.

2.  **Frontend (HTML, CSS, JavaScript):**
    -   **Dynamic Charts:** Uses `Chart.js` with the annotation plugin to create interactive visualizations.
    -   **Audio Playback & Synchronization:** Integrates an audio player with a real-time vertical indicator on the charts, synchronized with audio playback.
    -   **AJAX for Real-Time Updates:** When a user modifies a phase, an asynchronous request is sent to the Flask backend.
    -   **Real-Time Recalculation:** The backend recalculates all metrics and database entries, returning the updated data to the frontend without a page reload.

## Project Structure

```
.
├── analisis_audio.py           # Core logic for audio analysis and respiration metrics.
├── app.py                      # Flask web application (controller).
├── database.py                 # Handles all SQLite database operations.
├── mindfulness_analysis.db     # SQLite database file (created on first run).
├── requirements.txt            # Project dependencies.
├── check_db.py                 # Utility script to view database contents.
├── DetecciónDeFasesRespiratorias.ipynb # Jupyter Notebook for R&D.
├── results/
│   └── ...                     # Each session's output files are saved here.
├── static/
│   ├── css/style.css           # Custom stylesheets.
│   └── js/script.js            # Frontend JavaScript for interactivity.
├── templates/
│   └── index.html              # Main HTML template for the UI.
└── uploads/
    └── ...                     # Uploaded audio files are stored here.
```

## How to Run

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies from `requirements.txt`:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Flask application:**
    ```bash
    python app.py
    ```
    On the first run, this will create the `mindfulness_analysis.db` file.

4.  **Access the application:** Open a web browser and navigate to `http://127.0.0.1:5000`.

## How to Check the Database

You can inspect the contents of the database in two ways:

1.  **Using the provided script:**
    Run the `check_db.py` script to print a summary of all saved sessions to your console.
    ```bash
    python check_db.py
    ```

2.  **Using a DB Browser:**
    Use a graphical tool like [DB Browser for SQLite](https://sqlitebrowser.org/) to open the `mindfulness_analysis.db` file and explore the data visually.

## Example Results

Below is an example of the analysis results from a session.

**Segmentation Chart**

*Note: The image path is an example and may vary based on the session.*
![Segmentation Chart](results/Test1_24.6.2025-15.58pm_20250821-120950/segmentation_chart.png)

**Respiratory Cycles Table**

| Cycle | Inhalation (s) | Apnea 1 (s) | Exhalation (s) | Apnea 2 (s) | Total Cycle (s) |
|-------|----------------|-------------|----------------|-------------|-----------------|
| 1     | 11.0           | 14.0        | 14.0           | 12.0        | 51.0            |
| 2     | 7.0            | 11.0        | 17.0           | 17.0        | 52.0            |
| ...   | ...            | ...         | ...            | ...         | ...             |
| avg   | 7.8            | 15.8        | 14.8           | 11.4        | 49.8            |

**Data for Machine Learning**

For each session, a `segmentation_data.json` file is also generated. This file is designed for use in machine learning pipelines and contains the audio metadata and a list of all detected respiratory events.

```json
{
    "audio_metadata": {
        "original_filename": "24.6.2025-15.58pm.wav",
        "total_duration_seconds": 350.5,
        "sampling_rate": 22050
    },
    "segmentation_events": [
        {
            "start_time": 0.0,
            "end_time": 10.0,
            "label": "inhalation",
            "cycle_number": 1
        },
        {
            "start_time": 10.0,
            "end_time": 24.0,
            "label": "apnea",
            "cycle_number": 1
        }
    ]
}
```

##  Docker deployment

A Docker image based on Python 3.13.5 was created that copies the Flask application code and its dependencies listed in requirements.txt. The container was configured to have Flask listen on all interfaces (0.0.0.0) allowing external access, and port 5000 was exposed to map it to the host. To run the container, use docker run -p 5000:5000 flask-audio-app , and it is recommended to add the --restart unless-stopped option so that the container restarts automatically when the machine boots.

Run the container locally:
```bash
git clone https://github.com/MrOnie/Mindfulness-Through-Breathing.git
git switch production
docker build -t flask-audio-app .
docker run -p 5000:5000 --restart unless-stopped flask-audio-app
```