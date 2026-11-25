-- Tipo de clase por salón y hora (Lesson / Chat / Club) en lugar del catálogo de lecciones.
-- Ejecútala UNA vez con un usuario administrador de MySQL (por ejemplo root en Workbench).
-- La tabla "lecciones" se conserva por el historial, pero la aplicación ya no la usa.
ALTER TABLE bloques_diarios_salon
    ADD COLUMN tipo_clase ENUM('Lesson', 'Chat', 'Club') NULL,
    ADD COLUMN numero_leccion INT NULL;
