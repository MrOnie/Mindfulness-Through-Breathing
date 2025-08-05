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
    A single 'analysis_sessions' table will store all relevant data.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            analysis_timestamp DATETIME NOT NULL,
            total_duration_seconds REAL NOT NULL,
            sampling_rate INTEGER NOT NULL,
            session_folder TEXT NOT NULL,
            respiratory_cycles_json TEXT, -- Store the DataFrame as JSON
            respiration_analysis_json TEXT, -- Store the analysis dictionary as JSON
            segmentation_events_json TEXT -- Store the events list as JSON
        );
    ''')
    
    conn.commit()
    conn.close()
    print("Database tables checked/created successfully.")

def save_analysis_to_db(analysis_data, df_table, respiration_analysis):
    """
    Saves the complete analysis result to the SQLite database.

    Args:
        analysis_data (dict): The main dictionary from the audio analysis.
        df_table (pd.DataFrame): The respiratory cycles table.
        respiration_analysis (dict): The dictionary with scores and recommendations.

    Returns:
        int: The ID of the inserted row or None if saving fails.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Convert complex objects to JSON strings for storage
    cycles_json = df_table.to_json(orient='records')
    analysis_json = json.dumps(respiration_analysis)
    events_json = json.dumps(analysis_data.get("events"))

    try:
        cursor.execute('''
            INSERT INTO analysis_sessions (
                filename, analysis_timestamp, total_duration_seconds, sampling_rate, 
                session_folder, respiratory_cycles_json, respiration_analysis_json, segmentation_events_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            analysis_data.get("filename"),
            datetime.now(),
            analysis_data.get("duration"),
            analysis_data.get("sampling_rate"),
            analysis_data.get("session_folder"),
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

def update_analysis_in_db(db_id, updated_events, df_table, respiration_analysis):
    """
    Updates an existing analysis record in the SQLite database.

    Args:
        db_id (int): The ID of the record to update.
        updated_events (list): The updated list of segmentation events.
        df_table (pd.DataFrame): The recalculated respiratory cycles table.
        respiration_analysis (dict): The recalculated analysis with new scores.

    Returns:
        bool: True if the update was successful, False otherwise.
    """
    if not db_id:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    # Convert objects to JSON
    cycles_json = df_table.to_json(orient='records')
    analysis_json = json.dumps(respiration_analysis)
    events_json = json.dumps(updated_events)

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

# --- Initialize the database --- 
# This function will be called once when the application starts.
create_tables()