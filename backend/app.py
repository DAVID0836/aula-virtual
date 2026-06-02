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

        if usuario == 'juand' and clave == '12345':
            return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin'}), 200
        return jsonify({'status': 'error', 'message': 'Credenciales incorrectas'}), 401
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# --- NUEVAS RUTAS PARA EL DASHBOARD (QUITAR LOS 404) ---

@app.route('/usuarios', methods=['GET'])
def get_usuarios():
    # Devuelve una lista simulada para que React pinte el contador en la interfaz
    return jsonify([
        {'id': 1, 'user': 'juand', 'rol': 'admin'}
    ]), 200

@app.route('/tareas', methods=['GET'])
def get_tareas():
    # Devuelve una lista vacía o con datos para rellenar el dashboard
    return jsonify([]), 200

@app.route('/entregas', methods=['GET'])
def get_entregas():
    return jsonify([]), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080)) # Escuchando nativo en el 8080 de Railway
    app.run(host='0.0.0.0', port=port)
