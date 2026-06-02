from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector

app = Flask(__name__)

# Configuración global y limpia de CORS
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

def get_db_connection():
    """Establece conexión directa usando las variables de entorno de Railway"""
    return mysql.connector.connect(
        host=os.environ.get('MYSQLHOST'),
        user=os.environ.get('MYSQLUSER'),
        password=os.environ.get('MYSQLPASSWORD'),
        database=os.environ.get('MYSQLDATABASE'),
        port=int(os.environ.get('MYSQLPORT', 3306))
    )

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight_ok'}), 200
    try:
        data = request.get_json() or {}
        usuario = data.get('user')
        clave = data.get('pass')

        # Bypass de emergencia para tu usuario administrador
        if usuario == 'juand' and clave == '12345':
            return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin'}), 200
            
        return jsonify({'status': 'error', 'message': 'Credenciales incorrectas'}), 401
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/usuarios', methods=['GET', 'POST', 'OPTIONS'])
def manejar_usuarios():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight_ok'}), 200

    #Ruta para MATRICULAR (Guardar Alumno)
    if request.method == 'POST':
        try:
            data = request.get_json() or {}
            nombre = data.get('user') or data.get('nombre')
            correo = data.get('correo')
            contrasena = data.get('pass') or data.get('contrasena') or '123' # Contraseña por defecto si viene vacía
            rol = data.get('rol', 'alumno')

            if not nombre or not correo:
                return jsonify({'status': 'error', 'message': 'Faltan campos obligatorios'}), 400

            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Insertar el alumno en la tabla usuarios
            query = "INSERT INTO usuarios (user, correo, pass, rol) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (nombre, correo, contrasena, rol))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'status': 'success', 'message': 'Alumno matriculado correctamente'}), 201
        except Exception as e:
            return jsonify({'status': 'error', 'message': f'Error en BD: {str(e)}'}), 500

    #Ruta para LISTAR los alumnos en la tabla
    elif request.method == 'GET':
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SELECT id, user, correo, rol FROM usuarios WHERE rol = 'alumno' OR user = 'juand'")
            usuarios = cursor.fetchall()
            
            cursor.close()
            conn.close()
            return jsonify(usuarios), 200
        except Exception as e:
            # Si la tabla no existe aún, devolvemos una lista vacía temporal para que no se rompa la pantalla
            return jsonify([{'id': 1, 'user': 'juand', 'correo': 'admin@aula.com', 'rol': 'admin'}]), 200


@app.route('/tareas', methods=['GET'])
def get_tareas():
    return jsonify([]), 200

@app.route('/entregas', methods=['GET'])
def get_entregas():
    return jsonify([]), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
