-- Asignación de salones por hora: la lección de cada salón pasa a ser opcional.
-- Ejecútala UNA vez con un usuario administrador de MySQL (por ejemplo root en Workbench).
ALTER TABLE bloques_diarios_salon
  MODIFY leccion_id INT NULL;
