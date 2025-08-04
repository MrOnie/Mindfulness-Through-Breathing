# Mindfulness Web Interface

This project is a web-based interface for analyzing respiratory patterns from audio recordings. It helps users visualize their breathing, identify respiratory phases (inhalation, exhalation, apnea), and provides feedback on their breathing technique based on metrics like depth, stability, and balance.

## Features

-   **Audio Upload:** Users can upload `.wav` audio files of their breathing sessions.
-   **Respiratory Phase Detection:** The application automatically analyzes the audio to identify and segment inhalation, exhalation, and apnea phases.
-   **Interactive Visualization:**
    -   An audio waveshow and an amplitude envelope plot are displayed.
    -   Detected respiratory phases are highlighted on the plot.
    -   Users can interactively adjust the start and end times of each phase.
-   **Cycle Analysis:**
    -   The application groups the phases into complete respiratory cycles (Inhalation -> Apnea -> Exhalation -> Apnea).
    -   A table summarizes the duration of each phase within every cycle.
-   **Performance Metrics:**
    -   **Depth Score:** Measures how slow and deep the breathing is.
    -   **Stability Score:** Assesses the consistency of the duration of each respiratory phase.
    -   **Balance Score:** Evaluates the inhalation/exhalation ratio and the proportion of time spent in apnea.
    -   **Final Score:** A weighted average of the above scores.
-   **Personalized Recommendations:** Based on the weakest performance metric, the application provides a simple recommendation for improvement.
-   **Results Saving:** All analysis results, including the respiratory cycles table and a segmentation chart, are saved on the server for each session.

## How It Works

1.  **Backend (Python/Flask):**
    -   Uses `librosa` for audio processing to calculate an amplitude envelope of the signal.
    -   A threshold-based method is used to distinguish between active breathing and apnea.
    -   `pandas` is used for data manipulation and analysis of respiratory cycles.
    -   `matplotlib` generates and saves the segmentation charts.
    -   Flask handles file uploads, serves the frontend, and provides API endpoints for recalculating the analysis.

2.  **Frontend (HTML/CSS/JavaScript):**
    -   The interface is built with standard HTML, CSS, and JavaScript.
    -   It displays the visualizations and allows for interactive adjustments of the respiratory phases.
    -   When a user modifies a phase, an AJAX request is sent to the Flask backend to recalculate and update the analysis in real-time.

## Project Structure

```
.
├── analisis_audio.py           # Core logic for audio analysis and respiration metrics.
├── app.py                      # Flask web application.
├── DetecciónDeFasesRespiratorias.ipynb # Jupyter Notebook for experimentation.
├── results/                    # Directory where analysis results are saved.
├── static/
│   ├── css/style.css           # Stylesheets.
│   └── js/script.js            # Frontend JavaScript for interactivity.
├── templates/
│   └── index.html              # Main HTML template.
└── uploads/                    # Directory where uploaded audio files are stored.
```

## How to Run

1.  **Install dependencies:**
    ```bash
    pip install flask pandas numpy librosa matplotlib
    ```
2.  **Run the Flask application:**
    ```bash
    python app.py
    ```
3.  Open a web browser and navigate to `http://127.0.0.1:5000`.

## Example Results

Below is an example of the analysis results from a session:

**Segmentation Chart**

![Segmentation Chart](results/24.6.2025-15.58pm_20250730-103821/segmentation_chart.png)

**Respiratory Cycles**

| Cycle | Inhalation (s) | Apnea 1 (s) | Exhalation (s) | Apnea 2 (s) | Total Cycle (s) |
|-------|----------------|-------------|----------------|-------------|-----------------|
| 1     | 11.0           | 14.0        | 14.0           | 12.0        | 51.0            |
| 2     | 7.0            | 11.0        | 17.0           | 17.0        | 52.0            |
| 3     | 7.0            | 17.0        | 16.0           | 14.0        | 54.0            |
| 4     | 9.0            | 21.0        | 18.0           | 9.0         | 57.0            |
| 5     | 8.0            | 15.0        | 14.0           | 13.0        | 50.0            |
| 6     | 7.0            | 12.0        | 16.0           | 13.0        | 48.0            |
| 7     | 6.0            | 18.0        | 16.0           | 12.0        | 52.0            |
| 8     | 6.0            | 19.0        | 13.0           | 12.0        | 50.0            |
| 9     | 8.0            | 14.0        | 14.0           | 12.0        | 48.0            |
| 10    | 8.0            | 14.0        | 16.0           | 12.0        | 50.0            |
| 11    | 8.0            | 16.0        | 11.0           | 10.0        | 45.0            |
| 12    | 8.0            | 19.0        | 13.0           | 1.0         | 41.0            |
| avg   | 7.8            | 15.8        | 14.8           | 11.4        | 49.8            |

## Data for Machine Learning

For each session, a `segmentation_data.json` file is also generated. This file is designed for use in machine learning pipelines and contains the audio metadata and a list of all detected respiratory events, including which cycle they belong to.

**Example `segmentation_data.json`:**

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
        },
        {
            "start_time": 24.0,
            "end_time": 38.0,
            "label": "exhalation",
            "cycle_number": 1
        }
    ]
}
```

## Future Improvements

-   Implement a more robust phase detection algorithm (e.g., using machine learning).
-   Add user authentication to track progress over time.
-   Support more audio formats.
-   Enhance the user interface and visualizations.
