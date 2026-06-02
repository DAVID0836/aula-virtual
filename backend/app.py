from flask import Flask, request, jsonify
from flask_cors import CORS
from config import get_connection
import datetime

app = Flask(__name__)

# Configuramos CORS global permitiendo explícitamente los métodos y cabeceras del preflight
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # Manejo explícito de la petición OPTIONS (Preflight) por si el middleware falla
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight_ok'}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Payload vacío'}), 400

        usuario = data.get('user')
        clave = data.get('pass')

        # Hardcoded fallback para pruebas de conectividad
        if usuario == 'juand' and clave == '12345':
            return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin'}), 200

        # Bloque de consulta segura
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user, pass, rol, correo FROM usuarios WHERE user = %s AND pass = %s", (usuario, clave))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return jsonify({'status': 'success', 'user': row['user'], 'rol': row['rol']}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Credenciales inválidas'}), 401

    except Exception as e:
        # Forzamos una respuesta JSON estructurada con código 500 para evitar caídas mudas
        return jsonify({'status': 'error', 'message': f'Internal Server Error: {str(e)}'}), 500
