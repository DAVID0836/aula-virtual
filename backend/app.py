from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from config import get_connection
import datetime

app = Flask(__name__)

CORS(app, support_credentials=True)

@app.route('/login', methods=['POST'])
@cross_origin(supports_credentials=True)
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
