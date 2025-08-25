import sqlite3
import json
from datetime import datetime

DATABASE_FILE = 'mindfulness_analysis.db'

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    """
    Creates the necessary tables in the database if they don't already exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            participant_name TEXT,
            analysis_timestamp DATETIME NOT NULL,
            total_duration_seconds REAL NOT NULL,
            sampling_rate INTEGER NOT NULL,
            session_folder TEXT NOT NULL,
            respiratory_cycles_json TEXT,
            respiration_analysis_json TEXT,
            segmentation_events_json TEXT
        );
    ''')
    # Add participant_name column if it doesn't exist
    cursor.execute('''
        PRAGMA table_info(analysis_sessions);
    ''')
    columns = [col[1] for col in cursor.fetchall()]
    if 'participant_name' not in columns:
        cursor.execute('''
            ALTER TABLE analysis_sessions ADD COLUMN participant_name TEXT;
        ''')
    
    conn.commit()
    conn.close()
    print("Database tables checked/created successfully.")

def save_analysis_to_db(session_folder_path, analysis_data, df_table, respiration_analysis, participant_name=None):
    """
    Saves the complete analysis result to the SQLite database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cycles_json = df_table.to_json(orient='records')
    analysis_json = json.dumps(respiration_analysis)
    events_json = json.dumps(analysis_data.get("events"))

    try:
        cursor.execute('''
            INSERT INTO analysis_sessions (
                filename, participant_name, analysis_timestamp, total_duration_seconds, sampling_rate, 
                session_folder, respiratory_cycles_json, respiration_analysis_json, segmentation_events_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analysis_data.get("audio_filename"),
            participant_name,
            datetime.now(),
            analysis_data.get("duration"),
            analysis_data.get("sampling_rate"),
            session_folder_path,
            cycles_json,
            analysis_json,
            events_json
        ))
        
        conn.commit()
        inserted_id = cursor.lastrowid
        print(f"Successfully saved analysis to SQLite with ID: {inserted_id}")
        return inserted_id
    except sqlite3.Error as e:
        print(f"Failed to save analysis to SQLite: {e}")
        return None
    finally:
        conn.close()

def update_analysis_in_db(db_id, analysis_data, df_table, respiration_analysis):
    """
    Updates an existing analysis record in the SQLite database.
    """
    if not db_id:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    cycles_json = df_table.to_json(orient='records')
    analysis_json = json.dumps(respiration_analysis)
    events_json = json.dumps(analysis_data.get("events"))

    try:
        cursor.execute('''
            UPDATE analysis_sessions
            SET 
                respiratory_cycles_json = ?,
                respiration_analysis_json = ?,
                segmentation_events_json = ?
            WHERE id = ?
        ''', (cycles_json, analysis_json, events_json, db_id))
        
        conn.commit()
        print(f"Successfully updated analysis in SQLite for ID: {db_id}")
        return True
    except sqlite3.Error as e:
        print(f"Failed to update analysis in SQLite for ID {db_id}: {e}")
        return False
    finally:
        conn.close()

def get_analysis_details(db_id):
    """
    Retrieves analysis details (like session folder) from the database.
    """
    if not db_id:
        return None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            'SELECT session_folder, filename FROM analysis_sessions WHERE id = ?',
            (db_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                'session_folder_path': row['session_folder'],
                'audio_filename': row['filename']
            }
        return None
    except sqlite3.Error as e:
        print(f"Failed to retrieve analysis details for ID {db_id}: {e}")
        return None
    finally:
        conn.close()

# --- Initialize the database --- 
create_tables()