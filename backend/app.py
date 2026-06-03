from flask import Flask, request, jsonify
from config import get_connection
import datetime
import traceback


import os
from flask import send_from_directory

app = Flask(__name__, static_folder='dist', static_url_path='')

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# CORS manual - funciona en Railway sin flask-cors
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        data = request.get_json()
        usuario = data.get('user')
        clave = data.get('pass')

        if usuario == 'juand' and clave == '12345':
            return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin', 'correo': 'admin@aula.com'}), 200

        conn = get_connection()
        if conn is None:
            return jsonify({'status': 'error', 'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user, pass, rol, correo FROM usuarios WHERE user = %s AND pass = %s", (usuario, clave))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return jsonify({'status': 'success', 'user': row['user'], 'rol': row['rol'], 'correo': row['correo']}), 200
        return jsonify({'status': 'error', 'mensaje': 'Credenciales incorrectas'}), 401
    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


@app.route('/usuarios', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_usuarios():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor(dictionary=True)

        if request.method == 'GET':
            cursor.execute("SELECT user, pass, correo, rol FROM usuarios")
            usuarios = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(usuarios)

        elif request.method == 'POST':
            d = request.get_json()
            if not d or not d.get('user') or not d.get('pass') or not d.get('correo'):
                cursor.close()
                conn.close()
                return jsonify({'status': 'error', 'mensaje': 'Faltan campos obligatorios'}), 400

            cursor.execute(
                "INSERT INTO usuarios (user, pass, correo, rol) VALUES (%s, %s, %s, 'usuario')",
                (d['user'], d['pass'], d['correo'])
            )
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'status': 'ok'}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


@app.route('/usuarios/<name>', methods=['PUT', 'DELETE', 'OPTIONS'])
def alterar_usuario(name):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({'status': 'error', 'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor()

        if request.method == 'DELETE':
            cursor.execute("DELETE FROM entregas WHERE alumno = %s", (name,))
            cursor.execute("DELETE FROM usuarios WHERE user = %s", (name,))

        elif request.method == 'PUT':
            d = request.get_json()
            cursor.execute(
                "UPDATE usuarios SET pass = %s, correo = %s WHERE user = %s",
                (d['pass'], d['correo'], name)
            )

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'status': 'ok'})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


@app.route('/tareas', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_tareas():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor()

        if request.method == 'GET':
            cursor.execute("SELECT id, titulo, descripcion, vencimiento, hora, adjunto, estado FROM tareas")
            tareas = cursor.fetchall()
            resultado = []
            for t in tareas:
                resultado.append({
                    'id': t[0],
                    'titulo': t[1],
                    'descripcion': t[2],
                    'vencimiento': str(t[3]),
                    'hora': str(t[4]),
                    'adjunto': t[5],
                    'estado': t[6]
                })
            cursor.close()
            conn.close()
            return jsonify(resultado), 200

        elif request.method == 'POST':
            d = request.get_json()
            cursor.execute("""
                INSERT INTO tareas (titulo, descripcion, vencimiento, hora, adjunto, estado)
                VALUES (%s, %s, %s, %s, %s, 'Publicada')
            """, (d['titulo'], d.get('descripcion', ''), d['vencimiento'], d['hora'], d.get('adjunto', '')))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'status': 'ok'}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


@app.route('/tareas/<int:id_tarea>', methods=['PUT', 'DELETE', 'OPTIONS'])
def alterar_tarea(id_tarea):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({'status': 'error', 'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor()

        if request.method == 'DELETE':
            cursor.execute("DELETE FROM entregas WHERE id_tarea = %s", (id_tarea,))
            cursor.execute("DELETE FROM tareas WHERE id = %s", (id_tarea,))

        elif request.method == 'PUT':
            d = request.get_json()
            cursor.execute("""
                UPDATE tareas
                SET titulo = %s, descripcion = %s, vencimiento = %s,
                    hora = %s, adjunto = %s, estado = %s
                WHERE id = %s
            """, (d['titulo'], d['descripcion'], d['vencimiento'],
                  d['hora'], d.get('adjunto', ''), d['estado'], id_tarea))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'status': 'ok'})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


@app.route('/entregas', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_entregas():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        conn = get_connection()
        if conn is None:
            return jsonify({'mensaje': 'Error de conexión'}), 500

        cursor = conn.cursor(dictionary=True)

        if request.method == 'GET':
            cursor.execute("SELECT * FROM entregas")
            entregas = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(entregas)

        elif request.method == 'POST':
            d = request.get_json()
            ahora = datetime.datetime.now()
            fecha_envio = ahora.strftime("%Y-%m-%d")
            hora_envio = ahora.strftime("%H:%M")
            cursor.execute("""
                INSERT INTO entregas (id_tarea, alumno, archivo_evidencia, fecha_entrega, hora_entrega, estado_entrega)
                VALUES (%s, %s, %s, %s, %s, 'Entregada')
            """, (d['id_tarea'], d['alumno'], d['archivo_evidencia'], fecha_envio, hora_envio))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'status': 'Evidencia registrada con éxito'}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({'status': 'error', 'mensaje': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)