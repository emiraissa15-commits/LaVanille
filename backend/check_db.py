import sqlite3

conn = sqlite3.connect('sci_vanille.db')
cursor = conn.cursor()

cursor.execute("SELECT username, role FROM users")
users = cursor.fetchall()
print("Users in DB:", users)

conn.close()
