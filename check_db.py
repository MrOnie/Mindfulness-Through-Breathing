
import sqlite3
import json

DATABASE_FILE = 'mindfulness_analysis.db'

def view_all_data():
    """Connects to the database and prints all analysis sessions."""
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()

        print("--- Querying all analysis sessions ---")
        cursor.execute("SELECT * FROM analysis_sessions ORDER BY analysis_timestamp DESC")
        
        rows = cursor.fetchall()

        if not rows:
            print("No data found in the database.")
            return

        for row in rows:
            print(f"\n--- Session ID: {row[0]} ---")
            print(f"  Filename: {row[1]}")
            print(f"  Timestamp: {row[2]}")
            print(f"  Duration: {row[3]:.2f}s")
            
            # Parse and print some of the analysis data
            analysis = json.loads(row[7]) # respiration_analysis_json is at index 7
            print("  Scores:")
            for pillar, score in analysis['scores'].items():
                print(f"    - {pillar}: {score}")
            print(f"  Recommendation: {analysis['recommendation']}")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    view_all_data()
