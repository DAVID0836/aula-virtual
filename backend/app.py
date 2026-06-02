from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)

# Configuración limpia de CORS a nivel global
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight_ok'}), 200

    try:
        data = request.get_json() or {}
        usuario = data.get('user')
        clave = data.get('pass')

        # BYPASS ABSOLUTO: Respuesta instantánea para juand, sin tocar archivos externos ni BD
        if usuario == 'juand' and clave == '12345':
            return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin'}), 200
        
        # Intento seguro de base de datos
        try:
            from config import get_connection
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT user, pass, rol, correo FROM usuarios WHERE user = %s AND pass = %s", (usuario, clave))
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row:
                return jsonify({'status': 'success', 'user': row['user'], 'rol': row['rol']}), 200
            else:
                return jsonify({'status': 'error', 'message': 'Credenciales incorrectas'}), 401
        except Exception as db_error:
            # Si la BD truena, devolvemos un JSON válido para que el navegador NO tire error de CORS
            return jsonify({'status': 'error', 'message': f'Fallo de conexion BD: {str(db_error)}'}), 500

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
