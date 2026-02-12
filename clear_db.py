import sqlite3

DATABASE_FILE = 'mindfulness_analysis.db'

def clear_database():
    """Deletes all data from the analysis_sessions table without dropping the table."""
    try:
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM analysis_sessions")
        conn.commit()
        
        deleted_count = cursor.rowcount
        print(f" Database cleared successfully.")
        print(f"  Deleted records: {deleted_count}")
        
    except sqlite3.Error as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    clear_database()
