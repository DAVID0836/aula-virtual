import mysql.connector
from mysql.connector import pooling, Error

dbconfig = {
    'host': 'localhost',
    'port': 3307,
    'user': 'root',
    'password': '12345',  
    'database': 'testdb'
}

connection_pool = pooling.MySQLConnectionPool(
    pool_name="mi_pool",
    pool_size=5,
    pool_reset_session=True,
    **dbconfig
)

def get_connection():
    try:
        conn = connection_pool.get_connection()
        conn.ping(reconnect=True, attempts=3, delay=2)
        return conn
    except Error as e:
        print(f"Error de conexión en el Pool: {e}")
        return None