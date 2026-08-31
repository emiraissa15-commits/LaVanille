import sqlite3

conn = sqlite3.connect('sci_vanille.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in DB:", [t[0] for t in tables])

    if ('inspections',) in tables:
        cursor.execute("SELECT COUNT(*) FROM inspections")
        count = cursor.fetchone()[0]
        print(f"Number of inspections: {count}")
    else:
        print("Table 'inspections' does not exist!")

except Exception as e:
    print(f"Error: {e}")

conn.close()
