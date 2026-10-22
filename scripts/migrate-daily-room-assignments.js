import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { pool } from '../src/backend/db.js'

try {
  const migration = await readFile(new URL('../database/daily-room-assignments.sql', import.meta.url), 'utf8')
  const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean)
  for (const statement of statements) await pool.query(statement)
  process.stdout.write('Migración de asignaciones diarias aplicada correctamente.\n')
} catch (error) {
  process.stderr.write(`No se pudo aplicar la migración: ${error.message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}
