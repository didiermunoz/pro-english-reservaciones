CREATE TABLE recepcion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contratos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    horas_semanales INT NOT NULL DEFAULT 6,
    modalidad ENUM('Presencial', 'En Linea', 'Hibrida') NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);

CREATE TABLE lecciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden INT NOT NULL UNIQUE,
    titulo VARCHAR(100) NOT NULL,
    tipo ENUM('Leccion', 'Examen Escrito', 'Examen Oral', 'Club Conversacion') NOT NULL
);

CREATE TABLE salones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_salon VARCHAR(50) NOT NULL,
    profesor_manana VARCHAR(100) NOT NULL,
    profesor_tarde VARCHAR(100) NOT NULL,
    capacidad_maxima INT NOT NULL DEFAULT 10
);

CREATE TABLE reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estudiante_id INT NOT NULL,
    salon_id INT NOT NULL,
    leccion_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    modalidad_asistencia ENUM('Presencial', 'En Linea') NOT NULL,
    link_meet VARCHAR(255) NULL,
    estado ENUM('Confirmada', 'Cancelada', 'Completada') DEFAULT 'Confirmada',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    FOREIGN KEY (salon_id) REFERENCES salones(id),
    FOREIGN KEY (leccion_id) REFERENCES lecciones(id)
);