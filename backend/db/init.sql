CREATE DATABASE IF NOT EXISTS testdb;

USE testdb;

CREATE TABLE IF NOT EXISTS usuarios (
    user VARCHAR(50) NOT NULL PRIMARY KEY,
    pass VARCHAR(50) NOT NULL,
    correo VARCHAR(255),
    rol VARCHAR(20) DEFAULT 'usuario'
);

CREATE TABLE IF NOT EXISTS tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    vencimiento DATE,
    hora VARCHAR(10),
    adjunto VARCHAR(255) DEFAULT '',
    estado VARCHAR(50) DEFAULT 'Publicada'
);

CREATE TABLE IF NOT EXISTS entregas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea INT NOT NULL,
    alumno VARCHAR(50) NOT NULL,
    archivo_evidencia VARCHAR(255),
    fecha_entrega DATE,
    hora_entrega VARCHAR(10),
    estado_entrega VARCHAR(50) DEFAULT 'Entregada'
);