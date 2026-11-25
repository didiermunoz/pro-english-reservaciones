-- Rosetta: clase especial que el alumno reserva por su cuenta desde la agenda.
-- Ejecútala UNA vez con un usuario administrador de MySQL (no con el usuario de la app).
--
-- Planes de Rosetta por estudiante:
--   'ilimitado' -> estudiantes antiguos (matrícula menor a 8882). Rosetta sin límite propio,
--                  pero cada hora se descuenta de sus horas semanales normales.
--   'paquete'   -> estudiantes nuevos que aceptaron Rosetta. Tienen un contador aparte
--                  (rosetta_horas_total, 24 por defecto) que NO toca sus horas de clase.
--   'ninguno'   -> no toman Rosetta.
--
-- 1) Antes de migrar, revisa qué estudiantes quedarán como ilimitados:
--    SELECT id, matricula, nombre_completo FROM estudiantes
--    WHERE matricula REGEXP '^[0-9]+$' AND CAST(matricula AS UNSIGNED) < 8882;
--    Y cuáles tienen matrícula no numérica (quedarán como 'ninguno'; ajústalos desde Recepción):
--    SELECT id, matricula, nombre_completo FROM estudiantes WHERE matricula NOT REGEXP '^[0-9]+$';

ALTER TABLE estudiantes
    ADD COLUMN rosetta_plan ENUM('ilimitado', 'paquete', 'ninguno') NOT NULL DEFAULT 'ninguno',
    ADD COLUMN rosetta_horas_total INT NOT NULL DEFAULT 24;

ALTER TABLE salones
    ADD COLUMN es_rosetta BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE reservas
    ADD COLUMN tipo ENUM('Clase', 'Rosetta') NOT NULL DEFAULT 'Clase',
    MODIFY leccion_id INT NULL;

-- 2) Estudiantes antiguos: Rosetta ilimitado.
UPDATE estudiantes
SET rosetta_plan = 'ilimitado'
WHERE matricula REGEXP '^[0-9]+$' AND CAST(matricula AS UNSIGNED) < 8882;

-- 3) Salón de Rosetta. El cupo por hora es su "Aforo máximo"; ajústalo en Recepción > Salones.
INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima, es_rosetta)
SELECT 'Rosetta', 'Rosetta', 'Rosetta', 10, TRUE
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM salones WHERE es_rosetta = TRUE);
