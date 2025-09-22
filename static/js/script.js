document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            // Show the loading overlay when the form is submitted
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
        });
    }

    // The spinner will be hidden automatically when the new page loads,
    // as the 'loading-overlay' is hidden by default in the CSS.
    // No additional code is needed to hide it after the analysis.

    // --- Start of moved and new JavaScript code ---
    // Check if analysis_data is available (passed from Flask)
    if (typeof analysis_data !== 'undefined' && analysis_data !== null) {
        // --- Global variables ---
        let data = analysis_data; // Use the global analysis_data
        let dbId = data.db_id;
        let events = data.events;
        let signal = data.signal;
        let envelope = data.envelope;
        let breathingChart, signalChart;
        let audioPlayer = document.getElementById('audioPlayer'); // Get audio player reference

        // --- State variables ---
        let selectedPhaseIds = new Set();
        let rangeStartPhaseId = null;

        // --- DOM Elements ---
        const btnRecalculate = document.getElementById('recalculate-button');
        const btnUndo = document.getElementById('undo-button');
        const btnMerge = document.getElementById('merge-button');
        const btnDelete = document.getElementById('delete-button');
        const btnSave = document.getElementById('save-button');
        const cyclesTableContainer = document.getElementById('tabla-ciclos-container');
        const analysisContainer = document.getElementById('analisis-respiracion-container');

        // --- Chart & Drawing Configuration ---
        const phaseColors = { 'inhalation': 'rgba(75, 192, 192, 0.4)', 'exhalation': 'rgba(255, 206, 86, 0.4)', 'apnea': 'rgba(255, 99, 132, 0.4)' };
        const phaseBorderColors = { 'inhalation': 'rgb(75, 192, 192)', 'exhalation': 'rgb(255, 206, 86)', 'apnea': 'rgb(255, 99, 132)' };
        const selectedBorderColor = '#007bff';
        const rangeStartBorderColor = '#28a745';

        // --- Core Functions ---

        /**
         * Updates all UI components with new data from the server.
         * @param {object} responseData The JSON data from the backend.
         */
        function updateUI(responseData) {
            // Update global data
            data = responseData.analysis_data;
            events = data.events;

            // Update analysis summary
            if (responseData.respiration_analysis) {
                const r = responseData.respiration_analysis;
                analysisContainer.innerHTML = `
                    <p>Based on <strong>${r.num_cycles}</strong> respiratory cycles.</p>
                    <ul>
                        <li><strong>Depth Score:</strong> ${r.scores.Depth} / 100</li>
                        <li><strong>Stability Score:</strong> ${r.scores.Stability} / 100</li>
                        <li><strong>Internal Balance Score:</strong> ${r.scores['Internal Balance']} / 100</li>
                    </ul>
                    <h4><strong>Final Score:</strong> ${r.scores.Final} / 100</h4><hr>
                    <h5>Quick Diagnosis</h5>
                    <p>The pillar with the most room for improvement is: <strong>${r.weakest_pillar}</strong>.</p>
                    <p><strong>Recommendation:</strong> ${r.recommendation}</p>
                `;
            } else {
                analysisContainer.innerHTML = '<p>No sufficient data to generate an analysis.</p>';
            }

            // Update cycles table
            cyclesTableContainer.innerHTML = responseData.table_html;

            // Update chart
            breathingChart.options.plugins.annotation.annotations = createAnnotations(events, data.cycle_events);
            breathingChart.update('none');

            // Reset state
            selectedPhaseIds.clear();
            rangeStartPhaseId = null;
            updateButtonStates();
        }

        /**
         * Performs an action by calling a backend endpoint and updates the UI.
         */
        async function performAction(endpoint, body) {
            loadingOverlay.style.display = 'flex';
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const responseData = await response.json();
                if (response.ok && responseData.success) {
                    updateUI(responseData);
                } else {
                    alert(`Error: ${responseData.error || 'Unknown error'}`);
                }
            } catch (error) {
                alert(`An unexpected error occurred: ${error}`);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        /**
         * Creates annotation objects for the breathing chart.
         */
        function createAnnotations(currentEvents, cycleEvents) {
            const annotations = {};
            currentEvents.forEach(event => {
                let borderColor = phaseBorderColors[event.type];
                let borderWidth = 1;
                if (selectedPhaseIds.has(event.id)) { borderColor = selectedBorderColor; borderWidth = 3; }
                else if (event.id === rangeStartPhaseId) { borderColor = rangeStartBorderColor; borderWidth = 3; }

                annotations['box' + event.id] = { type: 'box', id: 'box' + event.id, xMin: event.start, xMax: event.end, yMin: envelope.negative_mean.reduce((a, b) => Math.min(a, b), 0) * 1.1, yMax: envelope.positive_mean.reduce((a, b) => Math.max(a, b), 0) * 1.1, backgroundColor: phaseColors[event.type], borderColor, borderWidth, label: { content: event.type, enabled: true, position: "start" } };
            });
            if (cycleEvents) {
                cycleEvents.forEach(cycle => {
                    annotations['label' + cycle.id] = { type: 'label', xValue: cycle.start, yValue: envelope.positive_mean.reduce((a, b) => Math.max(a, b), 0) * 0.9, content: [cycle.label], font: { size: 14, weight: 'bold' }, color: 'black', xAdjust: 5, yAdjust: -10 };
                });
            }
            return annotations;
        }

        /**
         * Updates the enabled/disabled state of the action buttons.
         */
        function updateButtonStates() {
            const numSelected = selectedPhaseIds.size;
            btnDelete.disabled = numSelected === 0;
            btnMerge.disabled = numSelected < 2;
            fetch('/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ db_id: dbId, check: true }) })
                .then(res => res.json()).then(data => { btnUndo.disabled = !data.undo_available; });
        }

        /**
         * Redraws the chart annotations based on the current selection.
         */
        function updateSelection() {
            breathingChart.options.plugins.annotation.annotations = createAnnotations(events, data.cycle_events);
            breathingChart.update('none');
            updateButtonStates();
        }

        // --- Chart Initialization ---
        function initializeCharts() {
            const baseAxisOptions = { type: 'linear', position: 'bottom', min: 0, max: data.duration, ticks: { stepSize: 30, callback: (val) => `${Math.floor(val/60)}:${(Math.floor(val%60)).toString().padStart(2,'0')}` } };

            signalChart = new Chart(document.getElementById('signal-chart').getContext('2d'), {
                type: 'line',
                data: { datasets: [{
                        label: 'Max Amplitude', data: signal.max.map((val, i) => ({ x: signal.t[i], y: val })), borderColor: 'rgba(128, 128, 128, 0.8)', backgroundColor: 'rgba(128, 128, 128, 0.8)', borderWidth: 1, pointRadius: 0, fill: 'origin'
                    }, {
                        label: 'Min Amplitude', data: signal.min.map((val, i) => ({ x: signal.t[i], y: val })), borderColor: 'rgba(128, 128, 128, 0.8)', backgroundColor: 'rgba(128, 128, 128, 0.8)', borderWidth: 1, pointRadius: 0, fill: 'origin'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ...baseAxisOptions, title: { display: false } }, y: { title: { display: false }, min: -1, max: 1, ticks: { callback: (val) => val.toFixed(2) } } }, plugins: { legend: { display: false } } }
            });

            breathingChart = new Chart(document.getElementById('breathing-chart').getContext('2d'), {
                type: 'line',
                data: { datasets: [{
                        label: 'Positive Envelope', data: envelope.positive_mean.map((val, i) => ({ x: envelope.time[i], y: val })), borderColor: 'blue', borderWidth: 1.5, pointRadius: 0
                    }, {
                        label: 'Negative Envelope', data: envelope.negative_mean.map((val, i) => ({ x: envelope.time[i], y: val })), borderColor: 'purple', borderWidth: 1.5, pointRadius: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { ...baseAxisOptions, title: { display: true, text: 'Time (mm:ss)' } }, y: { title: { display: false }, ticks: { callback: (val) => val.toFixed(2) } } },
                    plugins: {
                        legend: { display: false },
                        annotation: {
                            drawTime: 'beforeDatasetsDraw',
                            annotations: createAnnotations(events, data.cycle_events),
                            click: (ctx, event) => {
                                if (!ctx.element || ctx.element.options.type !== 'box') return;
                                const clickedEventId = parseInt(ctx.element.options.id.replace('box', ''), 10);
                                if (isNaN(clickedEventId)) return;

                                if (!rangeStartPhaseId || rangeStartPhaseId === clickedEventId) {
                                    rangeStartPhaseId = rangeStartPhaseId ? null : clickedEventId;
                                    selectedPhaseIds.clear();
                                    if(rangeStartPhaseId) selectedPhaseIds.add(clickedEventId);
                                } else {
                                    const allEvents = [...events].sort((a, b) => a.start - b.start);
                                    const startIndex = allEvents.findIndex(e => e.id === rangeStartPhaseId);
                                    const endIndex = allEvents.findIndex(e => e.id === clickedEventId);
                                    selectedPhaseIds.clear();
                                    const [start, end] = [startIndex, endIndex].sort((a, b) => a - b);
                                    for (let i = start; i <= end; i++) { selectedPhaseIds.add(allEvents[i].id); }
                                    rangeStartPhaseId = null;
                                }
                                updateSelection();
                            }
                        }
                    }
                }
            });
        }

        // --- Event Listeners ---
        btnDelete.addEventListener('click', () => performAction('/delete', { db_id: dbId, segment_ids: Array.from(selectedPhaseIds) }));
        btnMerge.addEventListener('click', () => performAction('/merge', { db_id: dbId, segment_ids: Array.from(selectedPhaseIds) }));
        btnUndo.addEventListener('click', () => performAction('/undo', { db_id: dbId }));
        btnRecalculate.addEventListener('click', () => {
            if (confirm('Are you sure you want to discard all changes and run the initial analysis again?')) {
                performAction('/recalculate', { db_id: dbId });
            }
        });
        
        /**
         * Handles saving the results by fetching the file from the backend and
         * triggering a download in the browser.
         * @param {string} exportFormat The desired format ('pdf', 'csv', 'all', etc.).
         */
        async function saveResults(exportFormat) {
            loadingOverlay.style.display = 'flex';
            try {
                const response = await fetch('/save_results', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ db_id: dbId, export_format: exportFormat })
                });

                const contentType = response.headers.get('content-type');

                // If the server sends a JSON response, it's likely an error.
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error("Server returned an error:", errorData); // Log the full error for debugging
                    // Try to find a meaningful message, otherwise show the raw data.
                    const errorMessage = errorData.error || errorData.message || `Unknown server error. Raw response: ${JSON.stringify(errorData)}`;
                    alert(`Error: ${errorMessage}`);
                } else if (response.ok) {
                    // The response is a file.
                    const blob = await response.blob();
                    
                    // Extract filename from the 'Content-Disposition' header.
                    const disposition = response.headers.get('Content-Disposition');
                    let filename = `results.${exportFormat}`; // Fallback filename
                    if (disposition && disposition.includes('attachment')) {
                        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
                        if (filenameMatch && filenameMatch[1]) {
                            filename = filenameMatch[1];
                        }
                    }

                    // Create a temporary link to trigger the download.
                    const link = document.createElement('a');
                    const url = window.URL.createObjectURL(blob);
                    link.href = url;
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    
                    // Clean up the temporary link and URL object.
                    link.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    // Handle other HTTP errors.
                    alert(`An error occurred while generating the file. Status: ${response.status}`);
                }
            } catch (error) {
                alert(`An unexpected error occurred: ${error}`);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        }

        // Export format event listeners
        document.getElementById('save-all').addEventListener('click', (e) => {
            e.preventDefault();
            saveResults('all');
        });
        document.getElementById('save-pdf').addEventListener('click', (e) => {
            e.preventDefault();
            saveResults('pdf');
        });
        document.getElementById('save-png').addEventListener('click', (e) => {
            e.preventDefault();
            saveResults('png');
        });
        document.getElementById('save-csv').addEventListener('click', (e) => {
            e.preventDefault();
            saveResults('csv');
        });
        document.getElementById('save-excel').addEventListener('click', (e) => {
            e.preventDefault();
            saveResults('excel');
        });

// Zoom functionality - versión corregida
let currentZoomLevel = 1;
const maxZoom = 10;
const minZoom = 0.1;

function updateZoom(factor) {
    currentZoomLevel *= factor;
    currentZoomLevel = Math.max(minZoom, Math.min(maxZoom, currentZoomLevel));

    // Usar la posición actual del audio como centro del zoom
    let center = 0;
    if (audioPlayer && !isNaN(audioPlayer.currentTime)) {
        center = audioPlayer.currentTime;
    } else {
        // Si no hay audio o no está reproduciendo, usar el centro de la vista actual
        const currentChart = breathingChart || signalChart;
        if (currentChart && currentChart.scales.x) {
            center = currentChart.scales.x.min + (currentChart.scales.x.max - currentChart.scales.x.min) / 2;
        } else {
            center = data.duration / 2;
        }
    }

    [signalChart, breathingChart].forEach(chart => {
        if (chart) {
            const duration = data.duration;
            const zoomedDuration = duration / currentZoomLevel;
            let newMin = center - (zoomedDuration / 2);
            let newMax = center + (zoomedDuration / 2);

            // Ajustar los límites si se salen del rango válido
            if (newMin < 0) {
                newMin = 0;
                newMax = Math.min(zoomedDuration, duration);
            } else if (newMax > duration) {
                newMax = duration;
                newMin = Math.max(0, duration - zoomedDuration);
            }

            chart.options.scales.x.min = newMin;
            chart.options.scales.x.max = newMax;
            chart.update('none');
        }
    });
}

    function resetZoom() {
        currentZoomLevel = 1;
        [signalChart, breathingChart].forEach(chart => {
            if (chart) {
                chart.options.scales.x.min = 0;
                chart.options.scales.x.max = data.duration;
                chart.update('none');
            }
        });
    }

    // También podrías agregar una función para hacer zoom a la posición actual del audio
    function zoomToAudioPosition(zoomLevel = 2) {
        if (audioPlayer && !isNaN(audioPlayer.currentTime)) {
            currentZoomLevel = zoomLevel;
            const center = audioPlayer.currentTime;
            const duration = data.duration;
            const zoomedDuration = duration / currentZoomLevel;
            
            let newMin = center - (zoomedDuration / 2);
            let newMax = center + (zoomedDuration / 2);

            // Ajustar los límites si se salen del rango válido
            if (newMin < 0) {
                newMin = 0;
                newMax = Math.min(zoomedDuration, duration);
            } else if (newMax > duration) {
                newMax = duration;
                newMin = Math.max(0, duration - zoomedDuration);
            }

            [signalChart, breathingChart].forEach(chart => {
                if (chart) {
                    chart.options.scales.x.min = newMin;
                    chart.options.scales.x.max = newMax;
                    chart.update('none');
                }
            });
        }
    }


        function resetZoom() {
            currentZoomLevel = 1;
            [signalChart, breathingChart].forEach(chart => {
                if (chart) {
                    chart.options.scales.x.min = 0;
                    chart.options.scales.x.max = data.duration;
                    chart.update('none');
                }
            });
        }

        // Zoom control event listeners
        document.getElementById('zoom-in').addEventListener('click', () => updateZoom(1.5));
        document.getElementById('zoom-out').addEventListener('click', () => updateZoom(0.67));
        document.getElementById('zoom-reset').addEventListener('click', resetZoom);

        // --- Audio Playback and Visual Indicator ---
        if (audioPlayer) {
            audioPlayer.addEventListener('timeupdate', () => {
                if (breathingChart) {
                    const currentTime = audioPlayer.currentTime;
                    const xScale = breathingChart.scales.x;
                    const xPosition = xScale.getPixelForValue(currentTime);

                    // Remove previous playback line annotation if it exists
                    if (breathingChart.options.plugins.annotation.annotations.playbackLine) {
                        delete breathingChart.options.plugins.annotation.annotations.playbackLine;
                    }

                    // Add new playback line annotation
                    breathingChart.options.plugins.annotation.annotations.playbackLine = {
                        type: 'line',
                        mode: 'vertical',
                        scaleID: 'x',
                        value: currentTime,
                        borderColor: 'red',
                        borderWidth: 2,
                        label: {
                            content: 'Current Playback',
                            enabled: false, // Set to true for debugging
                            position: 'top'
                        }
                    };
                    breathingChart.update('none');
                }
            });

            audioPlayer.addEventListener('ended', () => {
                // Remove playback line when audio ends
                if (breathingChart && breathingChart.options.plugins.annotation.annotations.playbackLine) {
                    delete breathingChart.options.plugins.annotation.annotations.playbackLine;
                    breathingChart.update('none');
                }
            });
        }

        // --- Initial Run ---
        initializeCharts();
        updateButtonStates();
    }
});

// This part handles the file input label update, it should be outside the DOMContentLoaded for analysis_data
// as it's always present.
$('.custom-file-input').on('change', function(event) {
    var inputFile = event.currentTarget;
    $(inputFile).parent().find('.custom-file-label').html(inputFile.files[0].name);
});