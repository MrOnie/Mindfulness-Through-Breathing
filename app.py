from flask import Flask, render_template, request, redirect, url_for, jsonify
import os
from werkzeug.utils import secure_filename
from analisis_audio import perform_initial_analysis, analyze_respiration, build_respiratory_cycles_table, save_analysis_results
from datetime import datetime

app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'wav'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER

# Create necessary folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def index():
    """Handles file uploads and initial visualization."""
    if request.method == 'POST':
        if 'audio_file' not in request.files:
            return redirect(request.url)
        
        file = request.files['audio_file']
        
        if file.filename == '':
            return redirect(request.url)
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            analysis_data, error = perform_initial_analysis(filepath)
            
            if error:
                return render_template('index.html', error=error)
            
            df_table, _ = build_respiratory_cycles_table(analysis_data['events'])
            initial_table_html = df_table.to_html(classes='table table-striped', index=False)
            
            respiration_analysis = analyze_respiration(df_table)

            # --- Save results ---
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            session_folder = os.path.join(app.config['RESULTS_FOLDER'], f"{os.path.splitext(filename)[0]}_{timestamp}")
            save_analysis_results(session_folder, analysis_data['events'], df_table, analysis_data)
            analysis_data['session_folder'] = session_folder # Pass to template

            return render_template('index.html', 
                                   filename=filename,
                                   analysis_data=analysis_data,
                                   initial_table=initial_table_html,
                                   respiration_analysis=respiration_analysis)

    return render_template('index.html', filename=None)

@app.route('/recalculate_table', methods=['POST'])
def recalculate_table():
    """
    Endpoint to recalculate the cycles table and respiration analysis.
    """
    data = request.get_json()
    updated_events = data.get('events')
    analysis_data = data.get('analysis_data')
    session_folder = analysis_data.get('session_folder')

    if not updated_events or not session_folder:
        return jsonify({'error': 'Invalid data provided'}), 400

    df_table, cycle_events = build_respiratory_cycles_table(updated_events)
    table_html = df_table.to_html(classes='table table-striped', index=False)
    
    respiration_analysis = analyze_respiration(df_table)

    # --- Save updated results ---
    save_analysis_results(session_folder, updated_events, df_table, analysis_data)
    
    return jsonify({
        'table_html': table_html, 
        'cycle_events': cycle_events,
        'respiration_analysis': respiration_analysis
    })

if __name__ == '__main__':
    app.run(debug=True)

