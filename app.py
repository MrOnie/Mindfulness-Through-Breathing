from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory, send_file
import os
import json
import shutil
from werkzeug.utils import secure_filename
from analisis_audio import perform_initial_analysis, analyze_respiration, build_respiratory_cycles_table, save_analysis_results, CONFIG
from datetime import datetime
from database import save_analysis_to_db, update_analysis_in_db, get_analysis_details

app = Flask(__name__)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'wav', 'mp3'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def relabel_events(events):
    """
    Sorts events and re-labels them to enforce a strict cyclical pattern:
    inhalation -> apnea -> exhalation -> apnea.
    """
    events.sort(key=lambda x: x['start'])
    
    # Define the target 4-phase cycle
    phase_cycle = ['inhalation', 'apnea', 'exhalation', 'apnea']
    
    for i, event in enumerate(events):
        # Assign the type based on the position in the cycle
        event['type'] = phase_cycle[i % 4]
        
    return events

def _get_updated_data_response(analysis_data, db_id):
    """Helper function to generate the full JSON response for UI updates."""
    df_table, cycle_events = build_respiratory_cycles_table(analysis_data['events'])
    table_html = df_table.to_html(classes='table table-striped', index=False)
    respiration_analysis = analyze_respiration(df_table)
    
    update_analysis_in_db(db_id, analysis_data, df_table, respiration_analysis)
    
    analysis_data['cycle_events'] = cycle_events

    return jsonify({
        'success': True,
        'analysis_data': analysis_data,
        'table_html': table_html,
        'respiration_analysis': respiration_analysis
    })

@app.route('/get_audio/<int:db_id>/<filename>')
def get_audio(db_id, filename):
    details = get_analysis_details(db_id)
    if not details:
        return "Audio not found!", 404
    session_folder = details['session_folder_path']
    return send_from_directory(session_folder, filename)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'audio_file' not in request.files: return render_template('index.html', error="No file part")
        file = request.files['audio_file']
        if file.filename == '': return render_template('index.html', error="No selected file")
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            participant_name = secure_filename(request.form.get('participantName', 'unknown_participant'))
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            session_folder_name = f"{participant_name}_{os.path.splitext(filename)[0]}_{timestamp}"
            session_folder_path = os.path.join(app.config['RESULTS_FOLDER'], session_folder_name)
            os.makedirs(session_folder_path, exist_ok=True)

            audio_filepath = os.path.join(session_folder_path, filename)
            file.save(audio_filepath)
            
            analysis_data, error = perform_initial_analysis(audio_filepath)
            if error: return render_template('index.html', error=error)
            
            # Store original events for comparison in export
            analysis_data['original_events'] = analysis_data['events'].copy()
            analysis_data['session_folder'] = session_folder_path
            analysis_data['audio_filename'] = filename

            json_path = os.path.join(session_folder_path, 'segmentation_data.json')
            with open(json_path, 'w') as f: json.dump(analysis_data, f, indent=4)

            df_table, cycle_events = build_respiratory_cycles_table(analysis_data['events'])
            initial_table_html = df_table.to_html(classes='table table-striped', index=False)
            respiration_analysis = analyze_respiration(df_table)
            analysis_data['cycle_events'] = cycle_events

            db_id = save_analysis_to_db(session_folder_path, analysis_data, df_table, respiration_analysis, participant_name)
            analysis_data['db_id'] = db_id

            with open(json_path, 'w') as f: json.dump(analysis_data, f, indent=4)

            return render_template('index.html', filename=filename, analysis_data=analysis_data, initial_table=initial_table_html, respiration_analysis=respiration_analysis, default_config=CONFIG)

    return render_template('index.html', filename=None)

@app.route('/save_results', methods=['POST'])
def save_results_endpoint():
    data = request.get_json()
    db_id = data.get('db_id')
    export_format = data.get('export_format', 'all')  # Default to all formats

    if not db_id:
        return jsonify({'success': False, 'error': 'Database ID is required'}), 400

    details = get_analysis_details(db_id)
    if not details:
        return jsonify({'success': False, 'error': 'Analysis not found'}), 404

    session_folder_path = details['session_folder_path']
    participant_name = details.get('participant_name', 'participant')
    json_path = os.path.join(session_folder_path, 'segmentation_data.json')

    try:
        with open(json_path, 'r') as f:
            analysis_data = json.load(f)

        events = analysis_data.get('events', [])
        df_table, _ = build_respiratory_cycles_table(events)
        respiration_analysis = analyze_respiration(df_table)

        # This function saves the file(s) to the server's disk.
        save_analysis_results(session_folder_path, events, df_table, analysis_data, respiration_analysis, export_format)

        # Now, instead of returning JSON, we send the generated file.
        file_map = {
            'pdf': 'comprehensive_breathing_analysis_report.pdf',
            'csv': 'respiratory_cycles.csv',
            'excel': 'respiratory_cycles.xlsx'
        }

        if export_format in file_map:
            file_path = os.path.join(session_folder_path, file_map[export_format])
            if not os.path.exists(file_path):
                return jsonify({'error': f'{export_format.upper()} file not found after generation.'}), 404
            return send_file(file_path, as_attachment=True)

        elif export_format in ['png', 'all']:
            # For multiple files, create a zip archive and send it.
            archive_name = f"{participant_name}_breathing_analysis_{export_format}"
            archive_path_base = os.path.join(app.config['RESULTS_FOLDER'], archive_name)
            shutil.make_archive(archive_path_base, 'zip', session_folder_path)
            return send_file(f"{archive_path_base}.zip", as_attachment=True)

        return jsonify({'error': 'Invalid export format specified.'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/recalculate', methods=['POST'])
def recalculate():
    data = request.get_json()
    db_id = data.get('db_id')
    details = get_analysis_details(db_id)
    session_folder, audio_filename = details['session_folder_path'], details['audio_filename']
    audio_filepath = os.path.join(session_folder, audio_filename)
    json_path = os.path.join(session_folder, 'segmentation_data.json')
    
    if os.path.exists(json_path): shutil.copy(json_path, json_path + '.bak')

    apnea_threshold_factor = float(data.get('apnea_threshold', 0.1))
    analysis_data, error = perform_initial_analysis(audio_filepath, apnea_threshold_factor=apnea_threshold_factor)
    if error: return jsonify({'error': f'Recalculation failed: {error}'}), 500

    # Store original events for comparison in export
    analysis_data['original_events'] = analysis_data['events'].copy()
    analysis_data.update({'db_id': db_id, 'session_folder': session_folder, 'audio_filename': audio_filename, 'apnea_threshold_factor': apnea_threshold_factor})
    with open(json_path, 'w') as f: json.dump(analysis_data, f, indent=4)
    
    return _get_updated_data_response(analysis_data, db_id)

@app.route('/undo', methods=['POST'])
def undo():
    data = request.get_json()
    db_id = data.get('db_id')
    details = get_analysis_details(db_id)
    session_folder = details['session_folder_path']
    json_path = os.path.join(session_folder, 'segmentation_data.json')
    backup_path = json_path + '.bak'

    if data.get('check'):
        return jsonify({'undo_available': os.path.exists(backup_path)})

    if not os.path.exists(backup_path): return jsonify({'error': 'No state to undo'}), 404

    shutil.move(backup_path, json_path)

    with open(json_path, 'r') as f: analysis_data = json.load(f)
    
    return _get_updated_data_response(analysis_data, db_id)

@app.route('/merge', methods=['POST'])
def merge():
    data = request.get_json()
    db_id = data.get('db_id')
    segment_ids_to_merge = set(data.get('segment_ids', []))
    details = get_analysis_details(db_id)
    session_folder = details['session_folder_path']
    json_path = os.path.join(session_folder, 'segmentation_data.json')

    shutil.copy(json_path, json_path + '.bak')

    with open(json_path, 'r') as f: analysis_data = json.load(f)
    
    events = analysis_data['events']
    selected_events = sorted([e for e in events if e['id'] in segment_ids_to_merge], key=lambda x: x['start'])
    if not selected_events: return jsonify({'error': 'Segments not found'}), 404

    new_event_id = max(e['id'] for e in events) + 1
    new_event = {
        'id': new_event_id,
        'start': selected_events[0]['start'],
        'end': selected_events[-1]['end'],
        'type': selected_events[0]['type']
    }

    analysis_data['events'] = [e for e in events if e['id'] not in segment_ids_to_merge] + [new_event]
    
    analysis_data['events'] = relabel_events(analysis_data['events'])

    with open(json_path, 'w') as f: json.dump(analysis_data, f, indent=4)

    return _get_updated_data_response(analysis_data, db_id)

@app.route('/delete', methods=['POST'])
def delete():
    data = request.get_json()
    db_id = data.get('db_id')
    segment_ids_to_delete = set(data.get('segment_ids', []))
    details = get_analysis_details(db_id)
    session_folder = details['session_folder_path']
    json_path = os.path.join(session_folder, 'segmentation_data.json')

    shutil.copy(json_path, json_path + '.bak')

    with open(json_path, 'r') as f: analysis_data = json.load(f)

    analysis_data['events'] = [e for e in analysis_data['events'] if e['id'] not in segment_ids_to_delete]

    analysis_data['events'] = relabel_events(analysis_data['events'])

    with open(json_path, 'w') as f: json.dump(analysis_data, f, indent=4)

    return _get_updated_data_response(analysis_data, db_id)

@app.route('/split', methods=['POST'])
def split():
    data = request.get_json()
    db_id = data.get('db_id')
    segment_id_to_split = data.get('segment_id')
    split_time = data.get('split_time')

    if not all([db_id, segment_id_to_split, isinstance(split_time, (int, float))]):
        return jsonify({'success': False, 'error': 'Invalid request data'}), 400

    details = get_analysis_details(db_id)
    if not details:
        return jsonify({'success': False, 'error': 'Analysis not found'}), 404

    session_folder = details['session_folder_path']
    json_path = os.path.join(session_folder, 'segmentation_data.json')

    shutil.copy(json_path, json_path + '.bak')

    with open(json_path, 'r') as f:
        analysis_data = json.load(f)

    events = analysis_data['events']
    
    event_to_split_index = -1
    for i, event in enumerate(events):
        if event['id'] == segment_id_to_split:
            event_to_split_index = i
            break
    
    if event_to_split_index == -1:
        return jsonify({'success': False, 'error': 'Segment not found'}), 404

    event_to_split = events[event_to_split_index]

    # Ensure the split time is valid and creates two non-zero-length segments
    if not (event_to_split['start'] < split_time < event_to_split['end']):
        return jsonify({'success': False, 'error': 'Split time must be within the segment bounds'}), 400

    original_end = event_to_split['end']
    original_type = event_to_split['type']
    
    # 1. Modify original event to be the first half
    event_to_split['end'] = split_time

    # 2. Create new event for the second half
    new_event_id = max(e['id'] for e in events) + 1
    new_event = {
        'id': new_event_id,
        'start': split_time,
        'end': original_end,
        'type': original_type  # Inherit type, relabel_events will adjust it
    }

    # 3. Insert the new event right after the first half
    analysis_data['events'].insert(event_to_split_index + 1, new_event)
    
    # 4. Relabel events to enforce the alternating inhalation/exhalation pattern
    analysis_data['events'] = relabel_events(analysis_data['events'])

    with open(json_path, 'w') as f:
        json.dump(analysis_data, f, indent=4)

    return _get_updated_data_response(analysis_data, db_id)

@app.route('/recalculate_scores', methods=['POST'])
def recalculate_scores():
    data = request.get_json()
    db_id = data.get('db_id')
    custom_config = data.get('config', {})

    details = get_analysis_details(db_id)
    if not details:
        return jsonify({'success': False, 'error': 'Analysis not found'}), 404

    session_folder = details['session_folder_path']
    json_path = os.path.join(session_folder, 'segmentation_data.json')

    with open(json_path, 'r') as f:
        analysis_data = json.load(f)

    # We only need to recalculate scores, not the entire analysis
    df_table, _ = build_respiratory_cycles_table(analysis_data['events'])
    respiration_analysis = analyze_respiration(df_table, custom_config=custom_config)

    # Optionally, save the new scores to the DB
    update_analysis_in_db(db_id, analysis_data, df_table, respiration_analysis)

    return jsonify({'success': True, 'respiration_analysis': respiration_analysis})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)