import mysql.connector
from mysql.connector import pooling, Error
import os

dbconfig = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': int(os.environ.get('DB_PORT', 3307)),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', '12345'),
    'database': os.environ.get('DB_NAME', 'testdb')
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