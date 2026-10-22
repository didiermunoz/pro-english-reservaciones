CREATE TABLE IF NOT EXISTS asignaciones_diarias_salon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    salon_id INT NOT NULL,
    profesor_manana VARCHAR(100) NOT NULL DEFAULT '',
    profesor_tarde VARCHAR(100) NOT NULL DEFAULT '',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_asignacion_diaria_salon (fecha, salon_id),
    CONSTRAINT fk_asignacion_diaria_salon FOREIGN KEY (salon_id)
        REFERENCES salones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bloques_diarios_salon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    salon_id INT NOT NULL,
    leccion_id INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_bloques_diarios_fecha_salon_hora (fecha, salon_id, hora_inicio),
    CONSTRAINT fk_bloque_diario_salon FOREIGN KEY (salon_id)
        REFERENCES salones(id) ON DELETE CASCADE,
    CONSTRAINT fk_bloque_diario_leccion FOREIGN KEY (leccion_id)
        REFERENCES lecciones(id)
);

CREATE TABLE IF NOT EXISTS alumnos_bloque_diario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bloque_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    UNIQUE KEY uq_alumno_bloque_diario (bloque_id, estudiante_id),
    KEY idx_alumnos_bloque_diario_estudiante (estudiante_id),
    CONSTRAINT fk_alumno_bloque_diario_bloque FOREIGN KEY (bloque_id)
        REFERENCES bloques_diarios_salon(id) ON DELETE CASCADE,
    CONSTRAINT fk_alumno_bloque_diario_estudiante FOREIGN KEY (estudiante_id)
        REFERENCES estudiantes(id) ON DELETE CASCADE
);
