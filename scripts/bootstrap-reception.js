import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from '../src/backend/db.js'

const username = process.env.BOOTSTRAP_RECEPTION_USERNAME?.trim()
const name = process.env.BOOTSTRAP_RECEPTION_NAME?.trim()
const password = process.env.BOOTSTRAP_RECEPTION_PASSWORD

try {
  if (!username || !name || !password || password.length < 12) {
    throw new Error('Configura usuario, nombre y contraseña de al menos 12 caracteres en BOOTSTRAP_RECEPTION_* dentro de .env.')
  }

  const [existing] = await pool.query('SELECT COUNT(*) AS total FROM recepcion')
  if (Number(existing[0].total) > 0) {
    throw new Error('Ya existe una cuenta de Recepción. El bootstrap solo se permite cuando la tabla está vacía.')
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  await pool.query('INSERT INTO recepcion (nombre, usuario, password) VALUES (?, ?, ?)', [name, username, hashedPassword])
  process.stdout.write('Cuenta inicial de Recepción creada. Elimina BOOTSTRAP_RECEPTION_PASSWORD de .env después de configurar el acceso.\n')
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}
