from flask import Flask, request, jsonify
from flask_cors import CORS
from config import get_connection
import datetime

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})
# actualizando cors


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    usuario = data.get('user')
    clave = data.get('pass')

    if usuario == 'juand' and clave == '12345':
        return jsonify({'status': 'success', 'user': 'juand', 'rol': 'admin'}), 200

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user, pass, rol, correo FROM usuarios WHERE user = %s AND pass = %s", (usuario, clave))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return jsonify({'status': 'success', 'user': row['user'], 'rol': row['rol'], 'correo': row['correo']}), 200
    return jsonify({'status': 'error', 'mensaje': 'Credenciales incorrectas'}), 401


@app.route('/usuarios', methods=['GET', 'POST'])
def gestionar_usuarios():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'GET':
        cursor.execute("SELECT user, pass, correo, rol FROM usuarios WHERE rol = 'usuario'")
        usuarios = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(usuarios)

    elif request.method == 'POST':
        d = request.get_json()
        try:
            if not d.get('user') or not d.get('pass') or not d.get('correo'):
                return jsonify({'status': 'error', 'mensaje': 'Faltan campos obligatorios'}), 400
            cursor.execute("INSERT INTO usuarios (user, pass, correo, rol) VALUES (%s, %s, %s, 'usuario')",
                           (d['user'], d['pass'], d['correo']))
            conn.commit()
            return jsonify({'status': 'ok'}), 201
        except Exception as e:
            print(f"Error al matricular: {e}")
            return jsonify({'status': 'error', 'mensaje': 'El alumno ya existe o hubo un error interno'}), 400
        finally:
            cursor.close()
            conn.close()


@app.route('/usuarios/<name>', methods=['PUT', 'DELETE'])
def alterar_usuario(name):
    conn = get_connection()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM entregas WHERE alumno = %s", (name,))
        cursor.execute("DELETE FROM usuarios WHERE user = %s", (name,))

    elif request.method == 'PUT':
        d = request.get_json()
        cursor.execute("UPDATE usuarios SET pass = %s, correo = %s WHERE user = %s",
                       (d['pass'], d['correo'], name))

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/tareas', methods=['GET', 'POST'])
def gestionar_tareas():
    conn = get_connection()
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
        """, (d['titulo'], d['descripcion'], d['vencimiento'], d['hora'], d.get('adjunto', '')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'status': 'ok'}), 201


@app.route('/tareas/<int:id_tarea>', methods=['PUT', 'DELETE'])
def alterar_tarea(id_tarea):
    conn = get_connection()
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
              d['hora'], d['adjunto'], d['estado'], id_tarea))

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'status': 'ok'})



@app.route('/entregas', methods=['GET', 'POST'])
def gestionar_entregas():
    conn = get_connection()
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


if __name__ == '__main__':
    app.run(debug=True, port=5000)
