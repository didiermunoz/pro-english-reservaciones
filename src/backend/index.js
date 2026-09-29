import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3000)
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-change-before-deploy')
if (!jwtSecret) throw new Error('Configura JWT_SECRET antes de iniciar en producción.')
const bcryptRounds = 12
const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()))

app.use(cors({ origin: (origin, callback) => {
  const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
  callback(null, !origin || allowedOrigins.has(origin) || localDevelopmentOrigin)
} }))
app.use(express.json({ limit: '100kb' }))

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const sendError = (res, status, message, code) => res.status(status).json({ message, code })

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return sendError(res, 401, 'Inicia sesión para continuar.', 'AUTH_REQUIRED')
  try {
    req.auth = jwt.verify(token, jwtSecret)
    next()
  } catch {
    return sendError(res, 401, 'Sesión inválida o expirada.', 'AUTH_INVALID')
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) return sendError(res, 403, role === 'reception' ? 'No tienes permisos de Recepción para acceder a este módulo.' : 'No tienes permisos para acceder a este recurso.', 'FORBIDDEN')
    next()
  }
}

async function requireStudentReady(req, res, next) {
  if (req.auth?.role !== 'student') return sendError(res, 403, 'No tienes permisos para acceder a este recurso.', 'FORBIDDEN')
  const [rows] = await pool.query('SELECT debe_cambiar_password FROM estudiantes WHERE id = ?', [req.auth.userId])
  if (!rows[0]) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
  if (rows[0].debe_cambiar_password) return sendError(res, 403, 'Debes cambiar tu contraseña temporal antes de continuar.', 'PASSWORD_CHANGE_REQUIRED')
  next()
}

async function getStudent(userId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.matricula, e.nombre_completo, e.debe_cambiar_password,
      c.horas_semanales, c.modalidad, c.fecha_inicio, c.fecha_fin, c.activo
     FROM estudiantes e
     LEFT JOIN contratos c ON c.estudiante_id = e.id AND c.activo = TRUE
     WHERE e.id = ? ORDER BY c.id DESC LIMIT 1`,
    [userId],
  )
  return rows[0] || null
}

function serializeStudent(row) {
  return {
    id: row.id,
    matricula: row.matricula,
    name: row.nombre_completo,
    role: 'student',
    mustChangePassword: Boolean(row.debe_cambiar_password),
    contract: row.horas_semanales == null ? null : {
      weeklyHours: row.horas_semanales,
      modality: row.modalidad,
      startDate: row.fecha_inicio,
      endDate: row.fecha_fin,
      active: Boolean(row.activo),
    },
  }
}

async function getStudentReservations(studentId) {
  const [rows] = await pool.query(
    `SELECT r.id, DATE_FORMAT(r.fecha, '%Y-%m-%d') AS dateKey,
      TIME_FORMAT(r.hora_inicio, '%H:%i') AS startTime,
      TIME_FORMAT(r.hora_fin, '%H:%i') AS endTime,
      r.modalidad_asistencia AS modality, r.link_meet AS meetLink,
      r.estado AS status, l.titulo AS lesson
     FROM reservas r LEFT JOIN lecciones l ON l.id = r.leccion_id
     WHERE r.estudiante_id = ? ORDER BY r.fecha, r.hora_inicio`,
    [studentId],
  )
  return rows.map((row) => ({
    id: row.id,
    dateKey: row.dateKey,
    startHour: Number(row.startTime.slice(0, 2)),
    endHour: Number(row.endTime.slice(0, 2)),
    startTime: row.startTime,
    endTime: row.endTime,
    modality: row.modality,
    meetLink: row.meetLink,
    status: row.status,
    lesson: row.lesson || 'Clase',
  }))
}

async function getStaff(userId) {
  const [rows] = await pool.query('SELECT id, nombre, usuario FROM recepcion WHERE id = ?', [userId])
  return rows[0] ? { id: rows[0].id, name: rows[0].nombre, username: rows[0].usuario, role: 'reception' } : null
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1')
  const counts = {}
  for (const table of ['estudiantes', 'recepcion', 'contratos', 'salones', 'lecciones', 'reservas']) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`)
    counts[table] = Number(rows[0].total)
  }
  res.json({
    status: 'ok',
    database: 'connected',
    readyForBooking: counts.recepcion > 0 && counts.salones > 0 && counts.lecciones > 0,
    counts,
  })
}))

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { matricula, password, role = 'student' } = req.body
  if (typeof matricula !== 'string' || !matricula.trim() || typeof password !== 'string' || !password) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  if (!['student', 'reception'].includes(role)) return sendError(res, 400, 'Tipo de acceso inválido.', 'INVALID_ROLE')

  if (role === 'reception') {
    const [rows] = await pool.query('SELECT id, nombre, usuario, password FROM recepcion WHERE usuario = ? LIMIT 1', [matricula.trim()])
    const staff = rows[0]
    if (!staff) return sendError(res, 404, 'La matrícula introducida no está registrada.', 'USER_NOT_FOUND')
    if (!(await bcrypt.compare(password, staff.password))) return sendError(res, 401, 'La contraseña es incorrecta.', 'INVALID_PASSWORD')
    const user = { id: staff.id, name: staff.nombre, username: staff.usuario, role: 'reception' }
    return res.json({ token: jwt.sign({ userId: staff.id, role: 'reception' }, jwtSecret, { expiresIn: '8h' }), user })
  }

  const [rows] = await pool.query('SELECT id, matricula, nombre_completo, password, debe_cambiar_password FROM estudiantes WHERE matricula = ? LIMIT 1', [matricula.trim()])
  const student = rows[0]
  if (!student) return sendError(res, 404, 'La matrícula introducida no está registrada.', 'USER_NOT_FOUND')
  if (!(await bcrypt.compare(password, student.password))) return sendError(res, 401, 'La contraseña es incorrecta.', 'INVALID_PASSWORD')
  const details = await getStudent(student.id)
  const user = serializeStudent(details)
  const reservations = await getStudentReservations(student.id)
  return res.json({ token: jwt.sign({ userId: student.id, role: 'student' }, jwtSecret, { expiresIn: '8h' }), user, reservations })
}))

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  if (req.auth.role === 'reception') {
    const user = await getStaff(req.auth.userId)
    if (!user) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
    return res.json({ user })
  }
  const student = await getStudent(req.auth.userId)
  if (!student) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
  return res.json({ user: serializeStudent(student), reservations: await getStudentReservations(student.id) })
}))

app.post('/api/auth/change-password', authenticate, requireRole('student'), asyncRoute(async (req, res) => {
  const password = String(req.body.password || '')
  if (password.length < 8) return sendError(res, 400, 'La nueva contraseña debe tener al menos 8 caracteres.', 'PASSWORD_TOO_SHORT')
  const hashedPassword = await bcrypt.hash(password, bcryptRounds)
  await pool.query('UPDATE estudiantes SET password = ?, debe_cambiar_password = FALSE WHERE id = ?', [hashedPassword, req.auth.userId])
  res.json({ message: 'Contraseña actualizada correctamente.' })
}))

app.get('/api/student/profile', authenticate, requireRole('student'), asyncRoute(async (req, res) => {
  const student = await getStudent(req.auth.userId)
  if (!student) return sendError(res, 404, 'Estudiante no encontrado.', 'STUDENT_NOT_FOUND')
  res.json({ user: serializeStudent(student), reservations: await getStudentReservations(student.id) })
}))

app.patch('/api/student/profile', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  await pool.query('UPDATE estudiantes SET nombre_completo = ? WHERE id = ?', [name, req.auth.userId])
  const student = await getStudent(req.auth.userId)
  res.json({ user: serializeStudent(student) })
}))

app.get('/api/student/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.get('/api/student/availability', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const dates = String(req.query.dates || '').split(',').filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(0, 7)
  if (!dates.length) return sendError(res, 400, 'Selecciona fechas válidas.', 'INVALID_DATES')
  const placeholders = dates.map(() => '?').join(', ')
  const [roomRows] = await pool.query('SELECT COALESCE(SUM(capacidad_maxima), 0) AS capacity FROM salones')
  const capacity = Number(roomRows[0].capacity)
  const [reservationRows] = await pool.query(
    `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS dateKey, HOUR(hora_inicio) AS hour,
      COUNT(*) AS occupied, SUM(estudiante_id = ?) AS mine
     FROM reservas WHERE fecha IN (${placeholders}) AND estado = 'Confirmada'
     GROUP BY fecha, HOUR(hora_inicio)`,
    [req.auth.userId, ...dates],
  )
  const occupied = new Map(reservationRows.map((row) => [`${row.dateKey}-${row.hour}`, row]))
  const slots = dates.flatMap((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00`)
    const startHour = date.getDay() === 6 ? 8 : 7
    const endHour = date.getDay() === 6 ? 15 : 20
    return Array.from({ length: endHour - startHour }, (_, index) => {
      const hour = startHour + index
      const entry = occupied.get(`${dateKey}-${hour}`)
      return { dateKey, hour, available: capacity > 0 && Number(entry?.occupied || 0) < capacity, reservedByStudent: Number(entry?.mine || 0) > 0 }
    })
  })
  res.json({ slots })
}))

app.post('/api/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const { slots, modalidad } = req.body
  if (!Array.isArray(slots) || slots.length === 0) return sendError(res, 400, 'Selecciona al menos un horario.', 'SLOTS_REQUIRED')
  const student = await getStudent(req.auth.userId)
  if (!student?.horas_semanales) return sendError(res, 409, 'No hay un contrato activo con horas disponibles.', 'CONTRACT_REQUIRED')
  const attendanceMode = modalidad === 'online' ? 'En Linea' : 'Presencial'
  if (student.modalidad !== 'Hibrida' && student.modalidad !== attendanceMode) return sendError(res, 400, 'La modalidad no coincide con tu contrato.', 'MODALITY_MISMATCH')

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [lessons] = await connection.query('SELECT id FROM lecciones ORDER BY orden LIMIT 1')
    if (!lessons[0]) throw Object.assign(new Error('No hay lecciones configuradas.'), { status: 409 })
    for (const slot of slots) {
      const dateKey = String(slot.dateKey || slot.id || '').slice(0, 10)
      const startHour = Number(slot.hour)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(startHour) || startHour < 7 || startHour > 19) {
        throw Object.assign(new Error('Horario inválido.'), { status: 400 })
      }
      const [countRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND estado IN ('Confirmada', 'Completada')
         AND YEARWEEK(fecha, 3) = YEARWEEK(?, 3)`,
        [req.auth.userId, dateKey],
      )
      if (Number(countRows[0].total) >= student.horas_semanales) throw Object.assign(new Error('Excediste las horas semanales contratadas.'), { status: 409 })
      const [existing] = await connection.query(
        `SELECT id FROM reservas WHERE estudiante_id = ? AND fecha = ? AND estado = 'Confirmada'
         AND hora_inicio < ? AND hora_fin > ? LIMIT 1`,
        [req.auth.userId, dateKey, `${String(startHour + 1).padStart(2, '0')}:00:00`, `${String(startHour).padStart(2, '0')}:00:00`],
      )
      if (existing[0]) throw Object.assign(new Error('Ya tienes una reserva que coincide con ese horario.'), { status: 409 })
      const start = `${String(startHour).padStart(2, '0')}:00:00`
      const end = `${String(startHour + 1).padStart(2, '0')}:00:00`
      const [rooms] = await connection.query(
        `SELECT s.id FROM salones s LEFT JOIN reservas r ON r.salon_id = s.id AND r.fecha = ?
         AND r.estado = 'Confirmada' AND r.hora_inicio < ? AND r.hora_fin > ?
         GROUP BY s.id, s.capacidad_maxima HAVING COUNT(r.id) < s.capacidad_maxima ORDER BY s.id LIMIT 1`,
        [dateKey, end, start],
      )
      if (!rooms[0]) throw Object.assign(new Error('No hay salones disponibles para uno de los horarios.'), { status: 409 })
      await connection.query(
        'INSERT INTO reservas (estudiante_id, salon_id, leccion_id, fecha, hora_inicio, hora_fin, modalidad_asistencia) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.auth.userId, rooms[0].id, lessons[0].id, dateKey, start, end, attendanceMode],
      )
    }
    await connection.commit()
    res.status(201).json({ reservations: await getStudentReservations(req.auth.userId) })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}))

app.patch('/api/reservations/:id', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const dateKey = String(req.body.dateKey || '').slice(0, 10)
  const startHour = Number(req.body.startHour)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(startHour) || startHour < 7 || startHour > 19) return sendError(res, 400, 'Rango de horario inválido.', 'INVALID_SLOT')
  const student = await getStudent(req.auth.userId)
  if (!student?.horas_semanales) return sendError(res, 409, 'No hay un contrato activo con horas disponibles.', 'CONTRACT_REQUIRED')
  const [current] = await pool.query("SELECT id FROM reservas WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada'", [req.params.id, req.auth.userId])
  if (!current[0]) return sendError(res, 404, 'Reserva no encontrada.', 'RESERVATION_NOT_FOUND')
  const [weekCount] = await pool.query(
    `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND estado IN ('Confirmada', 'Completada')
     AND YEARWEEK(fecha, 3) = YEARWEEK(?, 3) AND id <> ?`,
    [req.auth.userId, dateKey, req.params.id],
  )
  if (Number(weekCount[0].total) >= student.horas_semanales) return sendError(res, 409, 'Excediste las horas semanales contratadas.', 'WEEKLY_LIMIT')
  const start = `${String(startHour).padStart(2, '0')}:00:00`
  const end = `${String(startHour + 1).padStart(2, '0')}:00:00`
  const [overlap] = await pool.query(
    `SELECT id FROM reservas WHERE estudiante_id = ? AND fecha = ? AND estado = 'Confirmada'
     AND id <> ? AND hora_inicio < ? AND hora_fin > ? LIMIT 1`,
    [req.auth.userId, dateKey, req.params.id, end, start],
  )
  if (overlap[0]) return sendError(res, 409, 'Ya tienes una reserva que coincide con ese horario.', 'RESERVATION_CONFLICT')
  const [rooms] = await pool.query(
    `SELECT s.id FROM salones s LEFT JOIN reservas r ON r.salon_id = s.id AND r.fecha = ?
     AND r.estado = 'Confirmada' AND r.id <> ? AND r.hora_inicio < ? AND r.hora_fin > ?
     GROUP BY s.id, s.capacidad_maxima HAVING COUNT(r.id) < s.capacidad_maxima ORDER BY s.id LIMIT 1`,
    [dateKey, req.params.id, end, start],
  )
  if (!rooms[0]) return sendError(res, 409, 'No hay salones disponibles para ese horario.', 'ROOMS_FULL')
  const [result] = await pool.query(
    `UPDATE reservas SET salon_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ? WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada'`,
    [rooms[0].id, dateKey, start, end, req.params.id, req.auth.userId],
  )
  if (!result.affectedRows) return sendError(res, 404, 'Reserva no encontrada.', 'RESERVATION_NOT_FOUND')
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.delete('/api/reservations/:id', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS dateKey FROM reservas WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada'`, [req.params.id, req.auth.userId])
  if (!rows[0]) return sendError(res, 404, 'Reserva no encontrada.', 'RESERVATION_NOT_FOUND')
  const [allowed] = await pool.query('SELECT DATEDIFF(?, CURDATE()) >= 1 AS can_cancel', [rows[0].dateKey])
  if (!allowed[0].can_cancel) return sendError(res, 409, 'Las cancelaciones deben realizarse con al menos 1 día de anticipación.', 'CANCELLATION_DEADLINE')
  await pool.query(`UPDATE reservas SET estado = 'Cancelada' WHERE id = ? AND estudiante_id = ?`, [req.params.id, req.auth.userId])
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.delete('/api/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const ids = [...new Set((req.body.ids || []).map(Number))].filter((id) => Number.isInteger(id) && id > 0)
  if (!ids.length) return sendError(res, 400, 'Selecciona reservas válidas.', 'INVALID_RESERVATIONS')
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(
    `SELECT id, DATE_FORMAT(fecha, '%Y-%m-%d') AS dateKey FROM reservas
     WHERE id IN (${placeholders}) AND estudiante_id = ? AND estado = 'Confirmada'`,
    [...ids, req.auth.userId],
  )
  if (rows.length !== ids.length) return sendError(res, 404, 'Una o más reservas no están disponibles.', 'RESERVATION_NOT_FOUND')
  const [deadline] = await pool.query(
    `SELECT COUNT(*) AS blocked FROM reservas WHERE id IN (${placeholders})
     AND estudiante_id = ? AND DATEDIFF(fecha, CURDATE()) < 1`,
    [...ids, req.auth.userId],
  )
  if (Number(deadline[0].blocked) > 0) return sendError(res, 409, 'Las cancelaciones deben realizarse con al menos 1 día de anticipación.', 'CANCELLATION_DEADLINE')
  const [result] = await pool.query(`UPDATE reservas SET estado = 'Cancelada' WHERE id IN (${placeholders}) AND estudiante_id = ? AND estado = 'Confirmada'`, [...ids, req.auth.userId])
  if (result.affectedRows !== ids.length) return sendError(res, 409, 'Una o más reservas cambiaron mientras procesábamos la solicitud.', 'RESERVATION_CONFLICT')
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.get('/api/reception/students', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.matricula, e.nombre_completo, e.debe_cambiar_password,
      c.horas_semanales, c.modalidad, c.fecha_inicio, c.fecha_fin, c.activo,
      COUNT(CASE WHEN r.estado = 'Confirmada' THEN 1 END) AS active_reservations
     FROM estudiantes e
     LEFT JOIN contratos c ON c.estudiante_id = e.id AND c.activo = TRUE
     LEFT JOIN reservas r ON r.estudiante_id = e.id AND r.estado = 'Confirmada'
     GROUP BY e.id, c.id ORDER BY e.nombre_completo`,
  )
  res.json({ students: rows.map((row) => ({ ...serializeStudent(row), activeReservations: Number(row.active_reservations) })) })
}))

app.get('/api/reception/rooms', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones ORDER BY nombre_salon',
  )
  res.json({ rooms: rows })
}))

app.get('/api/reception/lessons', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, orden AS lessonOrder, titulo AS title, tipo AS type FROM lecciones ORDER BY orden')
  res.json({ lessons: rows.map(({ lessonOrder, ...lesson }) => ({ ...lesson, order: lessonOrder })) })
}))

app.post('/api/reception/lessons', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const order = Number(req.body.order)
  const title = String(req.body.title || '').trim()
  const type = String(req.body.type || '')
  const validTypes = ['Leccion', 'Examen Escrito', 'Examen Oral', 'Club Conversacion']
  if (!Number.isInteger(order) || order < 1 || !title || !validTypes.includes(type)) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query('INSERT INTO lecciones (orden, titulo, tipo) VALUES (?, ?, ?)', [order, title, type])
  res.status(201).json({ lesson: { id: result.insertId, order, title, type } })
}))

app.patch('/api/reception/lessons/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const order = Number(req.body.order)
  const title = String(req.body.title || '').trim()
  const type = String(req.body.type || '')
  const validTypes = ['Leccion', 'Examen Escrito', 'Examen Oral', 'Club Conversacion']
  if (!Number.isInteger(order) || order < 1 || !title || !validTypes.includes(type)) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query('UPDATE lecciones SET orden = ?, titulo = ?, tipo = ? WHERE id = ?', [order, title, type, req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Lección no encontrada.', 'LESSON_NOT_FOUND')
  res.json({ lesson: { id: Number(req.params.id), order, title, type } })
}))

app.delete('/api/reception/lessons/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const [result] = await pool.query('DELETE FROM lecciones WHERE id = ?', [req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Lección no encontrada.', 'LESSON_NOT_FOUND')
  res.status(204).end()
}))

app.post('/api/reception/rooms', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const morningTeacher = String(req.body.morningTeacher || '').trim()
  const afternoonTeacher = String(req.body.afternoonTeacher || '').trim()
  const capacity = Number(req.body.capacity)
  if (!name || !morningTeacher || !afternoonTeacher || !Number.isInteger(capacity) || capacity < 1) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query(
    'INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima) VALUES (?, ?, ?, ?)',
    [name, morningTeacher, afternoonTeacher, capacity],
  )
  const [rows] = await pool.query('SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones WHERE id = ?', [result.insertId])
  res.status(201).json({ room: rows[0] })
}))

app.patch('/api/reception/rooms/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const morningTeacher = String(req.body.morningTeacher || '').trim()
  const afternoonTeacher = String(req.body.afternoonTeacher || '').trim()
  const capacity = Number(req.body.capacity)
  if (!name || !morningTeacher || !afternoonTeacher || !Number.isInteger(capacity) || capacity < 1) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query(
    'UPDATE salones SET nombre_salon = ?, profesor_manana = ?, profesor_tarde = ?, capacidad_maxima = ? WHERE id = ?',
    [name, morningTeacher, afternoonTeacher, capacity, req.params.id],
  )
  if (!result.affectedRows) return sendError(res, 404, 'Salón no encontrado.', 'ROOM_NOT_FOUND')
  const [rows] = await pool.query('SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones WHERE id = ?', [req.params.id])
  res.json({ room: rows[0] })
}))

app.delete('/api/reception/rooms/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const [result] = await pool.query('DELETE FROM salones WHERE id = ?', [req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Salón no encontrado.', 'ROOM_NOT_FOUND')
  res.status(204).end()
}))

app.post('/api/reception/students', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const matricula = String(req.body.matricula || '').trim()
  const name = String(req.body.name || '').trim()
  if (!matricula || !name) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const temporaryPassword = String(req.body.password || randomBytes(9).toString('base64url'))
  const password = await bcrypt.hash(temporaryPassword, bcryptRounds)
  const [result] = await pool.query(
    'INSERT INTO estudiantes (matricula, nombre_completo, password, debe_cambiar_password) VALUES (?, ?, ?, TRUE)',
    [matricula, name, password],
  )
  const student = await getStudent(result.insertId)
  res.status(201).json({ student: serializeStudent(student), temporaryPassword })
}))

app.patch('/api/reception/students/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const matricula = String(req.body.matricula || '').trim()
  if (!name || !matricula) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query('UPDATE estudiantes SET nombre_completo = ?, matricula = ? WHERE id = ?', [name, matricula, req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Estudiante no encontrado.', 'STUDENT_NOT_FOUND')
  const student = await getStudent(req.params.id)
  res.json({ student: serializeStudent(student) })
}))

app.delete('/api/reception/students/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query('DELETE FROM reservas WHERE estudiante_id = ?', [req.params.id])
    const [result] = await connection.query('DELETE FROM estudiantes WHERE id = ?', [req.params.id])
    if (!result.affectedRows) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })
    await connection.commit()
    res.status(204).end()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}))

app.get('/api/reception/reservations', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const date = String(req.query.date || '').trim()
  const params = []
  let where = "WHERE r.estado <> 'Cancelada'"
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendError(res, 400, 'Fecha inválida.', 'INVALID_DATE')
    where += ' AND r.fecha = ?'
    params.push(date)
  }
  const [rows] = await pool.query(
    `SELECT r.id, e.matricula, e.nombre_completo, DATE_FORMAT(r.fecha, '%Y-%m-%d') AS dateKey,
      TIME_FORMAT(r.hora_inicio, '%H:%i') AS startTime, TIME_FORMAT(r.hora_fin, '%H:%i') AS endTime,
      r.estado AS status, r.modalidad_asistencia AS modality, l.titulo AS lesson
     FROM reservas r JOIN estudiantes e ON e.id = r.estudiante_id
     LEFT JOIN lecciones l ON l.id = r.leccion_id ${where}
     ORDER BY r.fecha, r.hora_inicio, e.nombre_completo`,
    params,
  )
  res.json({ reservations: rows.map((row) => ({ ...row, studentId: row.matricula, student: row.nombre_completo })) })
}))

app.patch('/api/reception/reservations/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const allowedStatuses = ['Confirmada', 'Cancelada', 'Completada']
  if (!allowedStatuses.includes(req.body.status)) return sendError(res, 400, 'Estado de reserva inválido.', 'INVALID_STATUS')
  const [result] = await pool.query('UPDATE reservas SET estado = ? WHERE id = ?', [req.body.status, req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Reserva no encontrada.', 'RESERVATION_NOT_FOUND')
  res.json({ message: 'Estado de reserva actualizado.' })
}))

app.use((error, _req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    const message = _req.path.includes('/lessons') ? 'El orden de lección ya está ocupado.' : _req.path.includes('/students') ? 'La matrícula ya está registrada.' : 'Ya existe un registro con esos datos.'
    return sendError(res, 409, message, 'DUPLICATE_RECORD')
  }
  if (String(error.code || '').startsWith('ER_ROW_IS_REFERENCED')) return sendError(res, 409, 'No se puede eliminar este registro porque tiene datos asociados.', 'RECORD_IN_USE')
  const status = error.status || 500
  const message = status < 500 ? error.message : 'Error interno del servidor.'
  return sendError(res, status, message, status === 500 ? 'INTERNAL_ERROR' : undefined)
})

app.listen(port)
