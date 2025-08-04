$(document).ready(function() {
    $('.custom-file-input').on('change', function(event) {
        var inputFile = event.currentTarget;
        $(inputFile).parent().find('.custom-file-label').html(inputFile.files[0].name);
    });

    if (window.analysisData) {
        const data = window.analysisData;
        let events = data.events;
        const signal = data.signal;
        const envelope = data.envelope;
        
        let selectedPhaseIds = new Set();
        const btnMerge = document.getElementById('btn-unir');
        const btnDelete = document.getElementById('btn-eliminar');

        const phaseColors = {
            'inhalation': 'rgba(75, 192, 192, 0.4)',
            'exhalation': 'rgba(255, 206, 86, 0.4)',
            'apnea': 'rgba(255, 99, 132, 0.4)'
        };
        const phaseBorderColors = {
            'inhalation': 'rgb(75, 192, 192)',
            'exhalation': 'rgb(255, 206, 86)',
            'apnea': 'rgb(255, 99, 132)'
        };
        const selectedBorderColor = '#007bff';

        function formatTime(seconds) {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec.toString().padStart(2, '0')}`;
        }

        function createCustomLegend() {
            const legendContainer = document.getElementById('legend-container');
            legendContainer.innerHTML = '';
            Object.keys(phaseColors).forEach(type => {
                const legendItem = document.createElement('div');
                legendItem.className = 'd-flex align-items-center mr-4';
                legendItem.innerHTML = `
                    <div style="width: 20px; height: 20px; background-color: ${phaseColors[type]}; border: 1px solid ${phaseBorderColors[type]}; margin-right: 8px;"></div>
                    <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                `;
                legendContainer.appendChild(legendItem);
            });
        }

        const baseAxisOptions = {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: data.duration,
            ticks: {
                stepSize: 30,
                callback: function(value) { return formatTime(value); }
            }
        };

        

        function createAnnotations(currentEvents, cycleEvents) {
            const annotations = {};
            let eventsToGraph = [...currentEvents];

            const firstInhalationIndex = eventsToGraph.findIndex(e => e.type === 'inhalation');

            if (firstInhalationIndex > 0) {
                eventsToGraph = eventsToGraph.slice(firstInhalationIndex);
            } else if (firstInhalationIndex === -1) {
                eventsToGraph = [];
            }

            eventsToGraph.forEach(event => {
                annotations['box' + event.id] = {
                    type: 'box', id: 'box' + event.id,
                    xMin: event.start, xMax: event.end,
                    yMin: envelope.negative_mean.reduce((a, b) => Math.min(a, b), 0) * 1.1,
                    yMax: envelope.positive_mean.reduce((a, b) => Math.max(a, b), 0) * 1.1,
                    backgroundColor: phaseColors[event.type],
                    borderColor: selectedPhaseIds.has(event.id) ? selectedBorderColor : phaseBorderColors[event.type],
                    borderWidth: selectedPhaseIds.has(event.id) ? 3 : 1,
                    label: { content: event.type, enabled: true, position: "start" }
                };
            });

            if (cycleEvents) {
                cycleEvents.forEach(cycle => {
                    annotations['label' + cycle.id] = {
                        type: 'label',
                        xValue: cycle.start,
                        yValue: envelope.positive_mean.reduce((a, b) => Math.max(a, b), 0) * 0.9,
                        content: [cycle.label],
                        font: { size: 14, weight: 'bold' },
                        color: 'black',
                        xAdjust: 5,
                        yAdjust: -10
                    };
                });
            }
            return annotations;
        }

        const signalChart = new Chart(document.getElementById('signal-chart').getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Max Amplitude',
                    data: signal.max.map((val, i) => ({ x: signal.t[i], y: val })),
                    borderColor: 'rgba(128, 128, 128, 0.8)',
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderWidth: 1, pointRadius: 0, fill: 'origin'
                }, {
                    label: 'Min Amplitude',
                    data: signal.min.map((val, i) => ({ x: signal.t[i], y: val })),
                    borderColor: 'rgba(128, 128, 128, 0.8)',
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderWidth: 1, pointRadius: 0, fill: 'origin'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ...baseAxisOptions, title: { display: false } },
                    y: { 
                        title: { display: false }, 
                        min: -1, 
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        const signalChart = new Chart(document.getElementById('signal-chart').getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Max Amplitude',
                    data: signal.max.map((val, i) => ({ x: signal.t[i], y: val })),
                    borderColor: 'rgba(128, 128, 128, 0.8)',
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderWidth: 1, pointRadius: 0, fill: 'origin'
                }, {
                    label: 'Min Amplitude',
                    data: signal.min.map((val, i) => ({ x: signal.t[i], y: val })),
                    borderColor: 'rgba(128, 128, 128, 0.8)',
                    backgroundColor: 'rgba(128, 128, 128, 0.8)',
                    borderWidth: 1, pointRadius: 0, fill: 'origin'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ...baseAxisOptions, title: { display: false } },
                    y: { 
                        title: { display: false }, 
                        min: -1, 
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        const breathingChart = new Chart(document.getElementById('breathing-chart').getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Positive Envelope', 
                    data: envelope.positive_mean.map((val, i) => ({ x: envelope.time[i], y: val })),
                    borderColor: 'blue', borderWidth: 1.5, pointRadius: 0
                }, {
                    label: 'Negative Envelope', 
                    data: envelope.negative_mean.map((val, i) => ({ x: envelope.time[i], y: val })),
                    borderColor: 'purple', borderWidth: 1.5, pointRadius: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { ...baseAxisOptions, title: { display: true, text: 'Time (mm:ss)' } },
                    y: { 
                        title: { display: false },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2);
                            }
                        }
                    } 
                },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        drawTime: 'beforeDatasetsDraw',
                        annotations: createAnnotations(events, data.cycle_events),
                        enter: (ctx, event) => {
                            if (ctx.element && ctx.element.options.type === 'box') { ctx.element.options.borderWidth = 3; ctx.chart.draw(); }
                        },
                        leave: (ctx, event) => {
                            if (ctx.element && ctx.element.options.type === 'box') {
                                const eventId = parseInt(ctx.element.options.id.replace('box', ''), 10);
                                if (!selectedPhaseIds.has(eventId)) {
                                    ctx.element.options.borderWidth = 1;
                                }
                                ctx.chart.draw();
                            }
                        },
                        click: (ctx, event) => {
                            if (ctx.element && ctx.element.options.type === 'box') {
                                const eventId = parseInt(ctx.element.options.id.replace('box', ''), 10);
                                if (isNaN(eventId)) return;
                                if (selectedPhaseIds.has(eventId)) selectedPhaseIds.delete(eventId); else selectedPhaseIds.add(eventId);
                                updateSelection();
                            }
                        }
                    }
                }
            }
        });

        createCustomLegend();

        function updateButtonStates() {
            const numSelected = selectedPhaseIds.size;
            btnDelete.disabled = numSelected === 0;
            if (numSelected < 2) {
                btnMerge.disabled = true;
                return;
            }
            const selected = events.filter(e => selectedPhaseIds.has(e.id)).sort((a, b) => a.start - b.start);
            const firstType = selected[0].type;
            let contiguous = true;
            for (let i = 0; i < selected.length - 1; i++) {
                if (selected[i].type !== firstType || selected[i+1].type !== firstType || selected[i].end + 1 !== selected[i+1].start) {
                    contiguous = false;
                    break;
                }
            }
            btnMerge.disabled = !contiguous;
        }

        function updateChart(updatedEvents, cycleEvents) {
            breathingChart.options.plugins.annotation.annotations = createAnnotations(updatedEvents, cycleEvents);
            breathingChart.update();
            updateButtonStates();
        }

        function updateSelection() {
            const annotations = breathingChart.options.plugins.annotation.annotations;
            Object.values(annotations).forEach(ann => {
                if (ann.type === 'box') {
                    const eventId = parseInt(ann.id.replace('box', ''), 10);
                    ann.borderWidth = selectedPhaseIds.has(eventId) ? 3 : 1;
                    ann.borderColor = selectedPhaseIds.has(eventId) ? selectedBorderColor : phaseBorderColors[events.find(e => e.id === eventId).type];
                }
            });
            breathingChart.update();
            updateButtonStates();
        }
        
        async function refreshTable() {
            const response = await fetch('/recalculate_table', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: events }) });
            if (response.ok) {
                const data = await response.json();
                document.getElementById('tabla-ciclos-container').innerHTML = data.table_html;
                updateChart(events, data.cycle_events);
                
                // Update respiration analysis section
                const container = document.getElementById('analisis-respiracion-container');
                if (data.respiration_analysis) {
                    container.innerHTML = `
                        <p>Based on <strong>${data.respiration_analysis.num_cycles}</strong> respiratory cycles.</p>
                        <ul>
                            <li><strong>Depth Score:</strong> ${data.respiration_analysis.scores.Depth} / 100</li>
                            <li><strong>Stability Score:</strong> ${data.respiration_analysis.scores.Stability} / 100</li>
                            <li><strong>Internal Balance Score:</strong> ${data.respiration_analysis.scores['Internal Balance']} / 100</li>
                        </ul>
                        <h4><strong>Final Score:</strong> ${data.respiration_analysis.scores.Final} / 100</h4>
                        <hr>
                        <h5>Quick Diagnosis</h5>
                        <p>The pillar with the most room for improvement is: <strong>${data.respiration_analysis.weakest_pillar}</strong>.</p>
                        <p><strong>Recommendation:</strong> ${data.respiration_analysis.recommendation}</p>
                    `;
                } else {
                    container.innerHTML = '<p>No sufficient data to generate an analysis.</p>';
                }
            } else {
                document.getElementById('tabla-ciclos-container').innerHTML = `<div class="alert alert-danger">Could not update table.</div>`;
            }
        }

        function relabelSubsequentPhases(startIndex) {
            if (startIndex >= events.length) return;
            let alternator = true;
            for (let i = startIndex - 1; i >= 0; i--) {
                if (events[i].type !== 'apnea') { alternator = events[i].type === 'exhalation'; break; }
            }
            for (let i = startIndex; i < events.length; i++) {
                if (events[i].type !== 'apnea') { events[i].type = alternator ? 'inhalation' : 'exhalation'; alternator = !alternator; }
            }
        }

        btnDelete.addEventListener('click', () => {
            if (selectedPhaseIds.size === 0) return;
            let minIndex = events.length;
            selectedPhaseIds.forEach(id => { minIndex = Math.min(minIndex, events.findIndex(e => e.id === id)); });
            events = events.filter(e => !selectedPhaseIds.has(e.id));
            if (minIndex < events.length) relabelSubsequentPhases(minIndex);
            selectedPhaseIds.clear();
            refreshTable();
        });

        btnMerge.addEventListener('click', () => {
            if (selectedPhaseIds.size < 2) return;
            const selected = events.filter(e => selectedPhaseIds.has(e.id)).sort((a, b) => a.start - b.start);
            const newEvent = { 
                id: Math.max(...events.map(e => e.id)) + 1,
                start: selected[0].start, 
                end: selected[selected.length - 1].end, 
                type: selected[0].type 
            };
            events = events.filter(e => !selectedPhaseIds.has(e.id));
            events.push(newEvent);
            events.sort((a, b) => a.start - b.start);
            selectedPhaseIds.clear();
            selectedPhaseIds.add(newEvent.id);
            refreshTable();
        });

        // Function to save graph data
        async function saveGraphData() {
            const signalCanvas = document.getElementById('signal-chart');
            const breathingCanvas = document.getElementById('breathing-chart');

            // Create a temporary canvas to combine both charts
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = Math.max(signalCanvas.width, breathingCanvas.width);
            combinedCanvas.height = signalCanvas.height + breathingCanvas.height;

            const ctx = combinedCanvas.getContext('2d');
            ctx.fillStyle = 'white'; // Set background to white
            ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

            ctx.drawImage(signalCanvas, 0, 0);
            ctx.drawImage(breathingCanvas, 0, signalCanvas.height);

            const imageData = combinedCanvas.toDataURL('image/png');
            const filenamePrefix = window.audioFilename.substring(0, window.audioFilename.lastIndexOf('.'));

            const response = await fetch('/save_graph_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageData, filename_prefix: filenamePrefix })
            });
            if (!response.ok) {
                console.error('Failed to save graph data.');
            }
        }

        // Function to save table data
        async function saveTableData() {
            const table = document.getElementById('tabla-ciclos-container').querySelector('table');
            if (!table) {
                console.error('No table found to save.');
                return;
            }

            let csv = [];
            for (let i = 0; i < table.rows.length; i++) {
                let row = [], cols = table.rows[i].querySelectorAll('td, th');
                for (let j = 0; j < cols.length; j++) {
                    row.push(cols[j].innerText);
                }
                csv.push(row.join(','));
            }
            const csvContent = csv.join('\n');
            const filenamePrefix = window.audioFilename.substring(0, window.audioFilename.lastIndexOf('.'));

            const response = await fetch('/save_table_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv_data: csvContent, filename_prefix: filenamePrefix })
            });
            if (!response.ok) {
                console.error('Failed to save table data.');
            }
        }

        // Call save functions after initial load
        saveGraphData();
        saveTableData();

        // Modify refreshTable to also save data
        const originalRefreshTable = refreshTable;
        refreshTable = async () => {
            await originalRefreshTable();
            saveGraphData();
            saveTableData();
        };
    }

    // Handle info modal content
    $('#infoModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Button that triggered the modal
        var title = button.data('title'); // Extract info from data-* attributes
        var content = button.data('content');
        var modal = $(this);
        modal.find('.modal-title').text(title);
        modal.find('.modal-body').text(content);
    });
});