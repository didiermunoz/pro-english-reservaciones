-- Antes del ALTER, ejecuta SELECT id, estudiante_id FROM contratos WHERE modalidad = 'Hibrida'; y actualiza esos contratos manualmente.
ALTER TABLE contratos
    MODIFY modalidad ENUM('Presencial', 'En Linea') NOT NULL;
