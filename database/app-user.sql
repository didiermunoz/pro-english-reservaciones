-- Usuario de MySQL con permisos mínimos para la API (no uses root en producción).
-- Ejecútalo una vez como administrador y cambia la contraseña por una aleatoria larga.
-- Si la API corre en otro servidor, reemplaza 'localhost' por la IP o el host de ese servidor.
CREATE USER IF NOT EXISTS 'pro_english_app'@'localhost' IDENTIFIED BY 'cambia-esta-contraseña';
GRANT SELECT, INSERT, UPDATE, DELETE ON flex_english_db.* TO 'pro_english_app'@'localhost';
-- La demo (DEMO_AUTO_SETUP) usa GET_LOCK, que no requiere permisos extra.
-- Las migraciones (CREATE/ALTER) se ejecutan con un usuario administrador, no con este.
FLUSH PRIVILEGES;
