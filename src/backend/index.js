import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { pool } from './db.js'
import { getClassHours } from './schedule.js'

if (!process.env.TZ) process.env.TZ = 'America/Mexico_City'
const app = express()
app.disable('x-powered-by')
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY))
const port = Number(process.env.PORT || 3000)
const isProduction = process.env.NODE_ENV === 'production'
// Nunca se usa una clave fija: si falta o es la del ejemplo, en producción no arranca y en desarrollo se genera una aleatoria.
const PLACEHOLDER_SECRETS = new Set(['reemplaza-por-una-clave-aleatoria-larga', 'local-development-only-change-before-deploy'])
let jwtSecret = process.env.JWT_SECRET || ''
if (!jwtSecret || PLACEHOLDER_SECRETS.has(jwtSecret) || jwtSecret.length < 32) {
  if (isProduction) throw new Error('Configura JWT_SECRET con una clave aleatoria de al menos 32 caracteres antes de iniciar en producción.')
  jwtSecret = randomBytes(32).toString('hex')
  console.warn('JWT_SECRET no está configurado (o es demasiado corto): se usa una clave temporal y las sesiones se cerrarán al reiniciar la API.')
}
const JWT_OPTIONS = { algorithm: 'HS256' }
const bcryptRounds = 12
const PASSWORD_MIN = 8
const PASSWORD_MAX_BYTES = 72
// Hash ficticio para que el login tarde lo mismo exista o no el usuario (evita enumerar matrículas por tiempo).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), bcryptRounds)
// Huella del hash de contraseña dentro del token: al cambiar o restablecer la contraseña, los tokens anteriores dejan de valer.
const passwordFingerprint = (hash) => createHash('sha256').update(String(hash)).digest('base64url').slice(0, 16)
const signToken = (userId, role, passwordHash, expiresIn) => jwt.sign({ userId, role, pv: passwordFingerprint(passwordHash) }, jwtSecret, { ...JWT_OPTIONS, expiresIn })
const passwordError = (password) => {
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) return 'La contraseña es demasiado larga.'
  return null
}
const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()))

app.use(cors({ origin: (origin, callback) => {
  const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
  callback(null, !origin || allowedOrigins.has(origin) || localDevelopmentOrigin)
} }))
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
    'Cross-Origin-Resource-Policy': 'same-site',
  })
  next()
})
app.use(express.json({ limit: '100kb' }))

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const sendError = (res, status, message, code) => res.status(status).json({ message, code })
const LEVEL_CODES = ['S', 'B', 'I', 'IA', 'A']
const CANCELLATION_MINUTES = 60
const CONTRACT_MODALITIES = ['Presencial', 'En Linea']
const DEFAULT_WEEKLY_HOURS = 6
const RESERVATION_TYPES = ['Clase', 'Rosetta']
const ROSETTA_PLANS = ['ilimitado', 'paquete', 'ninguno']
const DEFAULT_ROSETTA_HOURS = 24
// Rosetta de los estudiantes con plan 'ilimitado' se descuenta de sus horas semanales; con 'paquete' usa su propio contador.
const rosettaCountsWeekly = (plan) => plan === 'ilimitado'
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.', code: 'RATE_LIMIT_EXCEEDED' },
})

const limitMessage = (message) => ({ message, code: 'RATE_LIMIT_EXCEEDED' })
// Límite general por IP. Es amplio porque en la academia muchos alumnos comparten la misma IP (wifi).
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage('Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'),
})
// Acciones sensibles o que escriben en la base: más estrictas.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitMessage('Demasiados intentos. Inténtalo de nuevo en 15 minutos.'),
})
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_WRITE_MAX) || 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: limitMessage('Demasiados cambios en poco tiempo. Espera unos minutos e inténtalo de nuevo.'),
})
app.use('/api', apiLimiter, writeLimiter)

async function getBookableDateKey() {
  const [rows] = await pool.query("SELECT DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL IF(DAYOFWEEK(CURDATE()) = 7, 2, 1) DAY), '%Y-%m-%d') AS bookable")
  return rows[0].bookable
}

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return sendError(res, 401, 'Inicia sesión para continuar.', 'AUTH_REQUIRED')
  let payload
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: [JWT_OPTIONS.algorithm] })
  } catch {
    return sendError(res, 401, 'Sesión inválida o expirada.', 'AUTH_INVALID')
  }
  if (!['student', 'reception', 'tv'].includes(payload.role) || !Number.isInteger(payload.userId)) return sendError(res, 401, 'Sesión inválida o expirada.', 'AUTH_INVALID')
  // Los tokens de TV pertenecen a la cuenta de recepción que los generó.
  const [rows] = payload.role === 'student'
    ? await pool.query('SELECT password FROM estudiantes WHERE id = ?', [payload.userId])
    : await pool.query('SELECT password FROM recepcion WHERE id = ?', [payload.userId])
  if (!rows[0] || passwordFingerprint(rows[0].password) !== payload.pv) return sendError(res, 401, 'Sesión inválida o expirada.', 'AUTH_INVALID')
  req.auth = payload
  next()
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) return sendError(res, 403, role === 'reception' ? 'No tienes permisos de Recepción para acceder a este módulo.' : 'No tienes permisos para acceder a este recurso.', 'FORBIDDEN')
    next()
  }
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth?.role)) return sendError(res, 403, 'No tienes permisos para acceder a este recurso.', 'FORBIDDEN')
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

const ROSETTA_USED_SQL = `(SELECT COUNT(*) FROM reservas rr WHERE rr.estudiante_id = e.id AND rr.tipo = 'Rosetta' AND rr.estado IN ('Confirmada', 'Completada'))`
function serializeRosetta(row) {
  const plan = ROSETTA_PLANS.includes(row.rosetta_plan) ? row.rosetta_plan : 'ninguno'
  const usedHours = Number(row.rosetta_usadas || 0)
  const totalHours = plan === 'paquete' ? Number(row.rosetta_horas_total) : null
  return { plan, usedHours, totalHours, remainingHours: plan === 'paquete' ? Math.max(0, totalHours - usedHours) : null }
}
async function getStudent(userId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.matricula, e.nombre_completo, e.nivel, e.debe_cambiar_password,
      e.rosetta_plan, e.rosetta_horas_total, ${ROSETTA_USED_SQL} AS rosetta_usadas,
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
    level: row.nivel || null,
    role: 'student',
    mustChangePassword: Boolean(row.debe_cambiar_password),
    rosetta: serializeRosetta(row),
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
      r.estado AS status, r.tipo AS type, l.titulo AS lesson
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
    type: row.type,
    lesson: row.type === 'Rosetta' ? 'Rosetta' : row.lesson || 'Clase',
  }))
}

async function getStaff(userId) {
  const [rows] = await pool.query('SELECT id, nombre, usuario FROM recepcion WHERE id = ?', [userId])
  return rows[0] ? { id: rows[0].id, name: rows[0].nombre, username: rows[0].usuario, role: 'reception' } : null
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function requireDateKey(value) {
  if (!isValidDateKey(value)) throw Object.assign(new Error('Fecha inválida.'), { status: 400 })
  return value
}

async function getDailyRoomAssignments(date) {
  const [rooms] = await pool.query(
    `SELECT s.id, s.nombre_salon AS name, s.capacidad_maxima AS capacity,
      COALESCE(d.profesor_manana, s.profesor_manana) AS morningTeacher,
      COALESCE(d.profesor_tarde, s.profesor_tarde) AS afternoonTeacher
     FROM salones s LEFT JOIN asignaciones_diarias_salon d ON d.salon_id = s.id AND d.fecha = ?
     WHERE s.es_rosetta = FALSE
     ORDER BY s.nombre_salon`,
    [date],
  )
  const [blocks] = await pool.query(
    `SELECT b.id, b.salon_id AS roomId, b.leccion_id AS lessonId,
      l.titulo AS lessonTitle, l.tipo AS lessonType,
      TIME_FORMAT(b.hora_inicio, '%H:%i') AS startTime,
      TIME_FORMAT(b.hora_fin, '%H:%i') AS endTime
     FROM bloques_diarios_salon b JOIN lecciones l ON l.id = b.leccion_id
     WHERE b.fecha = ? ORDER BY b.salon_id, b.hora_inicio`,
    [date],
  )
  const [attendees] = await pool.query(
    `SELECT a.bloque_id AS blockId, e.id, e.matricula, e.nombre_completo AS name
     FROM alumnos_bloque_diario a JOIN estudiantes e ON e.id = a.estudiante_id
     JOIN bloques_diarios_salon b ON b.id = a.bloque_id
     WHERE b.fecha = ? ORDER BY e.nombre_completo`,
    [date],
  )
  const attendeesByBlock = new Map()
  for (const attendee of attendees) {
    const list = attendeesByBlock.get(attendee.blockId) || []
    list.push({ id: attendee.id, matricula: attendee.matricula, name: attendee.name })
    attendeesByBlock.set(attendee.blockId, list)
  }
  const roomsById = new Map(rooms.map((room) => [room.id, { ...room, blocks: [] }]))
  for (const block of blocks) {
    roomsById.get(block.roomId)?.blocks.push({ ...block, students: attendeesByBlock.get(block.id) || [] })
  }
  return [...roomsById.values()]
}

function validateDailyRoomPayload(rooms) {
  if (!Array.isArray(rooms)) throw Object.assign(new Error('La lista de salones es obligatoria.'), { status: 400 })
  const roomIds = new Set()
  const studentIntervals = new Map()
  const referencedStudentIds = new Set()
  const referencedLessonIds = new Set()
  for (const room of rooms) {
    const roomId = Number(room.roomId)
    if (!Number.isInteger(roomId) || roomId < 1 || roomIds.has(roomId)) throw Object.assign(new Error('La asignación contiene salones inválidos o repetidos.'), { status: 400 })
    roomIds.add(roomId)
    for (const teacher of [room.morningTeacher, room.afternoonTeacher]) {
      if (typeof teacher !== 'string' || teacher.trim().length > 100) throw Object.assign(new Error('El nombre del profesor debe tener como máximo 100 caracteres.'), { status: 400 })
    }
    if (!Array.isArray(room.blocks)) throw Object.assign(new Error('Los bloques de horario del salón son inválidos.'), { status: 400 })
    const intervals = []
    for (const block of room.blocks) {
      const lessonId = Number(block.lessonId)
      const startTime = String(block.startTime || '')
      const endTime = String(block.endTime || '')
      if (!Number.isInteger(lessonId) || lessonId < 1) throw Object.assign(new Error('Selecciona una lección para cada bloque.'), { status: 400 })
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) {
        throw Object.assign(new Error('Cada bloque debe tener un horario válido y una hora de fin posterior al inicio.'), { status: 400 })
      }
      if (intervals.some((interval) => startTime < interval.end && endTime > interval.start)) throw Object.assign(new Error('Hay bloques de horario solapados en un salón.'), { status: 409 })
      intervals.push({ start: startTime, end: endTime })
      referencedLessonIds.add(lessonId)
      if (!Array.isArray(block.studentIds)) throw Object.assign(new Error('La lista de estudiantes del bloque es inválida.'), { status: 400 })
      const studentIds = [...new Set(block.studentIds.map(Number))]
      block.validatedStudentIds = studentIds
      for (const studentId of studentIds) {
        if (!Number.isInteger(studentId) || studentId < 1) throw Object.assign(new Error('La asignación contiene estudiantes inválidos.'), { status: 400 })
        const studentBlocks = studentIntervals.get(studentId) || []
        if (studentBlocks.some((interval) => startTime < interval.end && endTime > interval.start)) throw Object.assign(new Error('Un estudiante no puede estar asignado a dos salones al mismo tiempo.'), { status: 409 })
        studentBlocks.push({ start: startTime, end: endTime })
        studentIntervals.set(studentId, studentBlocks)
        referencedStudentIds.add(studentId)
      }
    }
  }
  return { roomIds, referencedLessonIds, referencedStudentIds }
}

async function ensureDemoSetup(studentId) {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_AUTO_SETUP !== 'true') return

  const connection = await pool.getConnection()
  let lockAcquired = false
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK('pro_english_demo_setup', 10) AS acquired")
    lockAcquired = Number(lockRows[0].acquired) === 1
    if (!lockAcquired) throw Object.assign(new Error('No se pudo preparar la sesión de demostración.'), { status: 503 })

    await connection.beginTransaction()
    const [students] = await connection.query('SELECT id FROM estudiantes WHERE id = ? FOR UPDATE', [studentId])
    if (!students[0]) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })

    const [contracts] = await connection.query('SELECT id FROM contratos WHERE estudiante_id = ? AND activo = TRUE LIMIT 1', [studentId])
    if (!contracts[0]) {
      const weeklyHours = Math.max(1, Math.min(20, Number(process.env.DEMO_CONTRACT_WEEKLY_HOURS) || 6))
      await connection.query(
        `INSERT INTO contratos (estudiante_id, horas_semanales, modalidad, fecha_inicio, fecha_fin, activo)
         VALUES (?, ?, 'Presencial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), TRUE)`,
        [studentId, weeklyHours],
      )
    }

    const [rooms] = await connection.query('SELECT id FROM salones LIMIT 1')
    if (!rooms[0]) {
      await connection.query(
        'INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima) VALUES (?, ?, ?, ?)',
        ['Salón Demo', 'Instructor Demo', 'Instructor Demo', 10],
      )
    }

    const [lessons] = await connection.query('SELECT id FROM lecciones LIMIT 1')
    if (!lessons[0]) {
      const [orderRows] = await connection.query('SELECT COALESCE(MAX(orden), 0) + 1 AS nextOrder FROM lecciones')
      await connection.query(
        'INSERT INTO lecciones (orden, titulo, tipo) VALUES (?, ?, ?)',
        [Number(orderRows[0].nextOrder), 'Lección de demostración', 'Leccion'],
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('pro_english_demo_setup')")
    connection.release()
  }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1')
  if (process.env.NODE_ENV === 'production') return res.json({ status: 'ok', database: 'connected' })
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

app.post('/api/auth/login', loginLimiter, asyncRoute(async (req, res) => {
  const { matricula, password, role = 'student' } = req.body
  if (typeof matricula !== 'string' || !matricula.trim() || typeof password !== 'string' || !password) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  if (!['student', 'reception'].includes(role)) return sendError(res, 400, 'Tipo de acceso inválido.', 'INVALID_ROLE')

  if (role === 'reception') {
    const [rows] = await pool.query('SELECT id, nombre, usuario, password FROM recepcion WHERE usuario = ? LIMIT 1', [matricula.trim()])
    const staff = rows[0]
    const validPassword = await bcrypt.compare(password, staff?.password || DUMMY_PASSWORD_HASH)
    if (!staff || !validPassword) return sendError(res, 401, 'Usuario o contraseña incorrectos.', 'INVALID_CREDENTIALS')
    const user = { id: staff.id, name: staff.nombre, username: staff.usuario, role: 'reception' }
    return res.json({ token: signToken(staff.id, 'reception', staff.password, '8h'), user })
  }

  const [rows] = await pool.query('SELECT id, matricula, nombre_completo, password, debe_cambiar_password FROM estudiantes WHERE matricula = ? LIMIT 1', [matricula.trim()])
  const student = rows[0]
  const validPassword = await bcrypt.compare(password, student?.password || DUMMY_PASSWORD_HASH)
  if (!student || !validPassword) return sendError(res, 401, 'Usuario o contraseña incorrectos.', 'INVALID_CREDENTIALS')
  await ensureDemoSetup(student.id)
  const details = await getStudent(student.id)
  const user = serializeStudent(details)
  const reservations = await getStudentReservations(student.id)
  return res.json({ token: signToken(student.id, 'student', student.password, '8h'), user, reservations })
}))

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  if (!['student', 'reception'].includes(req.auth.role)) return sendError(res, 403, 'No tienes permisos para acceder a este recurso.', 'FORBIDDEN')
  if (req.auth.role === 'reception') {
    const user = await getStaff(req.auth.userId)
    if (!user) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
    return res.json({ user })
  }
  const student = await getStudent(req.auth.userId)
  if (!student) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
  return res.json({ user: serializeStudent(student), reservations: await getStudentReservations(student.id) })
}))

app.post('/api/auth/change-password', sensitiveLimiter, authenticate, requireRole('student'), asyncRoute(async (req, res) => {
  const password = String(req.body.password || '')
  const invalid = passwordError(password)
  if (invalid) return sendError(res, 400, invalid, 'INVALID_PASSWORD')
  const [rows] = await pool.query('SELECT password, debe_cambiar_password FROM estudiantes WHERE id = ?', [req.auth.userId])
  if (!rows[0]) return sendError(res, 401, 'La cuenta ya no está disponible.', 'ACCOUNT_NOT_FOUND')
  // Fuera del cambio obligatorio de contraseña temporal, se exige la contraseña actual (un token robado no basta).
  if (!rows[0].debe_cambiar_password && !(await bcrypt.compare(String(req.body.currentPassword || ''), rows[0].password))) {
    return sendError(res, 400, 'La contraseña actual no es correcta.', 'INVALID_CURRENT_PASSWORD')
  }
  const hashedPassword = await bcrypt.hash(password, bcryptRounds)
  await pool.query('UPDATE estudiantes SET password = ?, debe_cambiar_password = FALSE WHERE id = ?', [hashedPassword, req.auth.userId])
  // El token anterior queda invalidado; se entrega uno nuevo para no cerrar la sesión actual.
  const student = await getStudent(req.auth.userId)
  res.json({
    message: 'Contraseña actualizada correctamente.',
    token: signToken(req.auth.userId, 'student', hashedPassword, '8h'),
    user: serializeStudent(student),
    reservations: await getStudentReservations(req.auth.userId),
  })
}))

app.get('/api/student/profile', authenticate, requireRole('student'), asyncRoute(async (req, res) => {
  const student = await getStudent(req.auth.userId)
  if (!student) return sendError(res, 404, 'Estudiante no encontrado.', 'STUDENT_NOT_FOUND')
  res.json({ user: serializeStudent(student), reservations: await getStudentReservations(student.id) })
}))

app.patch('/api/student/profile', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  if (!name) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  if (name.length > 150) return sendError(res, 400, 'El nombre debe tener como máximo 150 caracteres.', 'NAME_TOO_LONG')
  await pool.query('UPDATE estudiantes SET nombre_completo = ? WHERE id = ?', [name, req.auth.userId])
  const student = await getStudent(req.auth.userId)
  res.json({ user: serializeStudent(student) })
}))

app.get('/api/student/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.get('/api/student/availability', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const bookableDateKey = await getBookableDateKey()
  const dates = String(req.query.dates || '').split(',').filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date === bookableDateKey).slice(0, 7)
  if (!dates.length) return sendError(res, 400, 'Selecciona fechas válidas.', 'INVALID_DATES')
  const placeholders = dates.map(() => '?').join(', ')
  // Cupos separados: salones de clase y salón(es) de Rosetta.
  const [roomRows] = await pool.query('SELECT es_rosetta AS isRosetta, COALESCE(SUM(capacidad_maxima), 0) AS capacity FROM salones GROUP BY es_rosetta')
  const capacity = Number(roomRows.find((row) => !row.isRosetta)?.capacity || 0)
  const rosettaCapacity = Number(roomRows.find((row) => row.isRosetta)?.capacity || 0)
  const [reservationRows] = await pool.query(
    `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS dateKey, HOUR(hora_inicio) AS hour, tipo AS type,
      COUNT(*) AS occupied, SUM(estudiante_id = ?) AS mine
     FROM reservas WHERE fecha IN (${placeholders}) AND estado = 'Confirmada'
     GROUP BY fecha, HOUR(hora_inicio), tipo`,
    [req.auth.userId, ...dates],
  )
  const occupied = new Map(reservationRows.map((row) => [`${row.dateKey}-${row.hour}-${row.type}`, row]))
  const slots = dates.flatMap((dateKey) => {
    const hours = getClassHours(dateKey)
    if (!hours) return []
    const { startHour, endHour } = hours
    return Array.from({ length: endHour - startHour }, (_, index) => {
      const hour = startHour + index
      const classEntry = occupied.get(`${dateKey}-${hour}-Clase`)
      const rosettaEntry = occupied.get(`${dateKey}-${hour}-Rosetta`)
      const reservedType = Number(classEntry?.mine || 0) > 0 ? 'Clase' : Number(rosettaEntry?.mine || 0) > 0 ? 'Rosetta' : null
      return {
        dateKey,
        hour,
        available: capacity > 0 && Number(classEntry?.occupied || 0) < capacity,
        rosettaAvailable: rosettaCapacity > 0 && Number(rosettaEntry?.occupied || 0) < rosettaCapacity,
        reservedByStudent: Boolean(reservedType),
        reservedType,
      }
    })
  })
  res.json({ slots })
}))

app.post('/api/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const { slots } = req.body
  if (!Array.isArray(slots) || slots.length === 0) return sendError(res, 400, 'Selecciona al menos un horario.', 'SLOTS_REQUIRED')
  if (slots.length > 14) return sendError(res, 400, 'Selecciona como máximo 14 horarios por solicitud.', 'TOO_MANY_SLOTS')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [students] = await connection.query('SELECT id, rosetta_plan, rosetta_horas_total FROM estudiantes WHERE id = ? FOR UPDATE', [req.auth.userId])
    if (!students[0]) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })
    const rosettaPlan = students[0].rosetta_plan
    const [contracts] = await connection.query(
      'SELECT horas_semanales, modalidad FROM contratos WHERE estudiante_id = ? AND activo = TRUE ORDER BY id DESC LIMIT 1',
      [req.auth.userId],
    )
    const student = contracts[0]
    if (!student?.horas_semanales) throw Object.assign(new Error('No hay un contrato activo con horas disponibles.'), { status: 409 })
    if (!CONTRACT_MODALITIES.includes(student.modalidad)) throw Object.assign(new Error('Tu contrato no tiene una modalidad válida. Contacta a recepción.'), { status: 409 })
    const attendanceMode = student.modalidad
    const [lessons] = await connection.query('SELECT id FROM lecciones ORDER BY orden LIMIT 1')
    const bookableDateKey = await getBookableDateKey()
    for (const slot of slots) {
      const type = slot.type === undefined ? 'Clase' : slot.type
      if (!RESERVATION_TYPES.includes(type)) throw Object.assign(new Error('Tipo de reserva inválido.'), { status: 400 })
      const isRosetta = type === 'Rosetta'
      if (isRosetta && !['ilimitado', 'paquete'].includes(rosettaPlan)) throw Object.assign(new Error('No tienes Rosetta en tu contrato. Pregunta en recepción.'), { status: 403 })
      if (!isRosetta && !lessons[0]) throw Object.assign(new Error('No hay lecciones configuradas.'), { status: 409 })
      const dateKey = String(slot.dateKey || slot.id || '').slice(0, 10)
      const startHour = Number(slot.hour)
      const classHours = getClassHours(dateKey)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(startHour) || !classHours || startHour < classHours.startHour || startHour >= classHours.endHour) {
        throw Object.assign(new Error('La hora seleccionada está fuera del horario de clases de ese día.'), { status: 400 })
      }
      if (dateKey !== bookableDateKey) throw Object.assign(new Error('Solo puedes reservar para el siguiente día de clases.'), { status: 400 })
      if (!isRosetta || rosettaCountsWeekly(rosettaPlan)) {
        const [countRows] = await connection.query(
          `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND estado IN ('Confirmada', 'Completada')
           AND YEARWEEK(fecha, 3) = YEARWEEK(?, 3) AND (tipo = 'Clase' OR ?)`,
          [req.auth.userId, dateKey, rosettaCountsWeekly(rosettaPlan)],
        )
        if (Number(countRows[0].total) >= student.horas_semanales) throw Object.assign(new Error('Excediste las horas semanales contratadas.'), { status: 409 })
      }
      if (isRosetta && rosettaPlan === 'paquete') {
        const [rosettaRows] = await connection.query(
          `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND tipo = 'Rosetta' AND estado IN ('Confirmada', 'Completada')`,
          [req.auth.userId],
        )
        if (Number(rosettaRows[0].total) >= Number(students[0].rosetta_horas_total)) throw Object.assign(new Error(`Ya usaste tus ${students[0].rosetta_horas_total} horas de Rosetta.`), { status: 409 })
      }
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
         WHERE s.es_rosetta = ?
         GROUP BY s.id, s.capacidad_maxima HAVING COUNT(r.id) < s.capacidad_maxima ORDER BY s.id LIMIT 1`,
        [dateKey, end, start, isRosetta],
      )
      if (!rooms[0]) throw Object.assign(new Error(isRosetta ? 'El salón de Rosetta ya está lleno en uno de los horarios.' : 'No hay salones disponibles para uno de los horarios.'), { status: 409 })
      await connection.query(
        'INSERT INTO reservas (estudiante_id, salon_id, leccion_id, fecha, hora_inicio, hora_fin, modalidad_asistencia, tipo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.auth.userId, rooms[0].id, isRosetta ? null : lessons[0].id, dateKey, start, end, attendanceMode, type],
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
  const classHours = getClassHours(dateKey)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !Number.isInteger(startHour) || !classHours || startHour < classHours.startHour || startHour >= classHours.endHour) return sendError(res, 400, 'La hora seleccionada está fuera del horario de clases de ese día.', 'INVALID_SLOT')
  const bookableDateKey = await getBookableDateKey()
  if (dateKey !== bookableDateKey) throw Object.assign(new Error('Solo puedes reservar para el siguiente día de clases.'), { status: 400 })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [students] = await connection.query('SELECT id, rosetta_plan FROM estudiantes WHERE id = ? FOR UPDATE', [req.auth.userId])
    if (!students[0]) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })
    const [contracts] = await connection.query(
      'SELECT horas_semanales FROM contratos WHERE estudiante_id = ? AND activo = TRUE ORDER BY id DESC LIMIT 1',
      [req.auth.userId],
    )
    const student = contracts[0]
    if (!student?.horas_semanales) throw Object.assign(new Error('No hay un contrato activo con horas disponibles.'), { status: 409 })
    // Solo se pueden mover clases normales; Rosetta se cancela y se vuelve a reservar.
    const [current] = await connection.query("SELECT id FROM reservas WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada' AND tipo = 'Clase'", [req.params.id, req.auth.userId])
    if (!current[0]) throw Object.assign(new Error('Reserva no encontrada.'), { status: 404 })
    const [weekCount] = await connection.query(
      `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND estado IN ('Confirmada', 'Completada')
       AND YEARWEEK(fecha, 3) = YEARWEEK(?, 3) AND id <> ? AND (tipo = 'Clase' OR ?)`,
      [req.auth.userId, dateKey, req.params.id, rosettaCountsWeekly(students[0].rosetta_plan)],
    )
    if (Number(weekCount[0].total) >= student.horas_semanales) throw Object.assign(new Error('Excediste las horas semanales contratadas.'), { status: 409 })
    const start = `${String(startHour).padStart(2, '0')}:00:00`
    const end = `${String(startHour + 1).padStart(2, '0')}:00:00`
    const [overlap] = await connection.query(
      `SELECT id FROM reservas WHERE estudiante_id = ? AND fecha = ? AND estado = 'Confirmada'
       AND id <> ? AND hora_inicio < ? AND hora_fin > ? LIMIT 1`,
      [req.auth.userId, dateKey, req.params.id, end, start],
    )
    if (overlap[0]) throw Object.assign(new Error('Ya tienes una reserva que coincide con ese horario.'), { status: 409 })
    const [rooms] = await connection.query(
      `SELECT s.id FROM salones s LEFT JOIN reservas r ON r.salon_id = s.id AND r.fecha = ?
       AND r.estado = 'Confirmada' AND r.id <> ? AND r.hora_inicio < ? AND r.hora_fin > ?
       WHERE s.es_rosetta = FALSE
       GROUP BY s.id, s.capacidad_maxima HAVING COUNT(r.id) < s.capacidad_maxima ORDER BY s.id LIMIT 1`,
      [dateKey, req.params.id, end, start],
    )
    if (!rooms[0]) throw Object.assign(new Error('No hay salones disponibles para ese horario.'), { status: 409 })
    const [result] = await connection.query(
      `UPDATE reservas SET salon_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ? WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada'`,
      [rooms[0].id, dateKey, start, end, req.params.id, req.auth.userId],
    )
    if (!result.affectedRows) throw Object.assign(new Error('Reserva no encontrada.'), { status: 404 })
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.delete('/api/reservations/:id', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT TIMESTAMPDIFF(MINUTE, NOW(), TIMESTAMP(fecha, hora_inicio)) >= ? AS can_cancel
     FROM reservas WHERE id = ? AND estudiante_id = ? AND estado = 'Confirmada'`,
    [CANCELLATION_MINUTES, req.params.id, req.auth.userId],
  )
  if (!rows[0]) return sendError(res, 404, 'Reserva no encontrada.', 'RESERVATION_NOT_FOUND')
  if (!rows[0].can_cancel) return sendError(res, 409, 'Las cancelaciones deben realizarse con al menos 1 hora de anticipación.', 'CANCELLATION_DEADLINE')
  await pool.query(`UPDATE reservas SET estado = 'Cancelada' WHERE id = ? AND estudiante_id = ?`, [req.params.id, req.auth.userId])
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.delete('/api/reservations', authenticate, requireStudentReady, asyncRoute(async (req, res) => {
  if (!Array.isArray(req.body.ids) || req.body.ids.length > 50) return sendError(res, 400, 'Selecciona reservas válidas.', 'INVALID_RESERVATIONS')
  const ids = [...new Set(req.body.ids.map(Number))].filter((id) => Number.isInteger(id) && id > 0)
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
     AND estudiante_id = ? AND TIMESTAMPDIFF(MINUTE, NOW(), TIMESTAMP(fecha, hora_inicio)) < ?`,
    [...ids, req.auth.userId, CANCELLATION_MINUTES],
  )
  if (Number(deadline[0].blocked) > 0) return sendError(res, 409, 'Las cancelaciones deben realizarse con al menos 1 hora de anticipación.', 'CANCELLATION_DEADLINE')
  const [result] = await pool.query(`UPDATE reservas SET estado = 'Cancelada' WHERE id IN (${placeholders}) AND estudiante_id = ? AND estado = 'Confirmada'`, [...ids, req.auth.userId])
  if (result.affectedRows !== ids.length) return sendError(res, 409, 'Una o más reservas cambiaron mientras procesábamos la solicitud.', 'RESERVATION_CONFLICT')
  res.json({ reservations: await getStudentReservations(req.auth.userId) })
}))

app.get('/api/reception/students', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.matricula, e.nombre_completo, e.nivel, e.debe_cambiar_password,
      e.rosetta_plan, e.rosetta_horas_total, ${ROSETTA_USED_SQL} AS rosetta_usadas,
      c.horas_semanales, c.modalidad, c.fecha_inicio, c.fecha_fin, c.activo,
      COUNT(CASE WHEN r.estado = 'Confirmada' THEN 1 END) AS active_reservations
     FROM estudiantes e
     LEFT JOIN contratos c ON c.estudiante_id = e.id AND c.activo = TRUE
     LEFT JOIN reservas r ON r.estudiante_id = e.id AND r.estado = 'Confirmada'
     GROUP BY e.id, c.id ORDER BY e.nombre_completo`,
  )
  res.json({ students: rows.map((row) => ({ ...serializeStudent(row), activeReservations: Number(row.active_reservations) })) })
}))

const serializeRoom = (room) => ({ ...room, isRosetta: Boolean(room.isRosetta) })
app.get('/api/reception/rooms', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity, es_rosetta AS isRosetta FROM salones ORDER BY nombre_salon',
  )
  res.json({ rooms: rows.map(serializeRoom) })
}))

app.get('/api/reception/lessons', authenticate, requireRole('reception'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, orden AS lessonOrder, titulo AS title, tipo AS type FROM lecciones ORDER BY orden')
  res.json({ lessons: rows.map(({ lessonOrder, ...lesson }) => ({ ...lesson, order: lessonOrder })) })
}))

app.get('/api/reception/daily-room-assignments', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const date = requireDateKey(String(req.query.date || ''))
  res.json({ date, rooms: await getDailyRoomAssignments(date) })
}))

app.put('/api/reception/daily-room-assignments/:date', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const date = requireDateKey(String(req.params.date || ''))
  const rooms = req.body.rooms
  const { roomIds, referencedLessonIds, referencedStudentIds } = validateDailyRoomPayload(rooms)
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [dbRooms] = await connection.query('SELECT id, capacidad_maxima AS capacity FROM salones WHERE es_rosetta = FALSE ORDER BY id FOR UPDATE')
    if (roomIds.size !== dbRooms.length || dbRooms.some((room) => !roomIds.has(room.id))) {
      throw Object.assign(new Error('La lista de salones cambió. Actualiza los datos e inténtalo de nuevo.'), { status: 409 })
    }
    const capacityByRoom = new Map(dbRooms.map((room) => [room.id, Number(room.capacity)]))
    for (const room of rooms) {
      if (room.blocks.some((block) => block.validatedStudentIds.length > capacityByRoom.get(Number(room.roomId)))) {
        throw Object.assign(new Error(`Un bloque supera el aforo del salón ${room.roomId}.`), { status: 400 })
      }
    }
    if (referencedLessonIds.size) {
      const lessonPlaceholders = [...referencedLessonIds].map(() => '?').join(', ')
      const [knownLessons] = await connection.query(`SELECT id FROM lecciones WHERE id IN (${lessonPlaceholders})`, [...referencedLessonIds])
      if (knownLessons.length !== referencedLessonIds.size) throw Object.assign(new Error('Una o más lecciones ya no existen.'), { status: 400 })
    }
    if (referencedStudentIds.size) {
      const studentPlaceholders = [...referencedStudentIds].map(() => '?').join(', ')
      const [knownStudents] = await connection.query(`SELECT id FROM estudiantes WHERE id IN (${studentPlaceholders})`, [...referencedStudentIds])
      if (knownStudents.length !== referencedStudentIds.size) throw Object.assign(new Error('Uno o más estudiantes ya no existen.'), { status: 400 })
    }

    await connection.query('DELETE FROM bloques_diarios_salon WHERE fecha = ?', [date])
    await connection.query('DELETE FROM asignaciones_diarias_salon WHERE fecha = ?', [date])
    for (const room of rooms) {
      const roomId = Number(room.roomId)
      await connection.query(
        'INSERT INTO asignaciones_diarias_salon (fecha, salon_id, profesor_manana, profesor_tarde) VALUES (?, ?, ?, ?)',
        [date, roomId, room.morningTeacher.trim(), room.afternoonTeacher.trim()],
      )
      for (const block of room.blocks) {
        const [result] = await connection.query(
          'INSERT INTO bloques_diarios_salon (fecha, salon_id, leccion_id, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)',
          [date, roomId, Number(block.lessonId), `${block.startTime}:00`, `${block.endTime}:00`],
        )
        for (const studentId of block.validatedStudentIds) {
          await connection.query('INSERT INTO alumnos_bloque_diario (bloque_id, estudiante_id) VALUES (?, ?)', [result.insertId, studentId])
        }
      }
    }
    await connection.commit()
    res.json({ date, rooms: await getDailyRoomAssignments(date), message: 'Asignaciones diarias guardadas.' })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}))

app.post('/api/reception/tv-token', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT password FROM recepcion WHERE id = ?', [req.auth.userId])
  const token = signToken(req.auth.userId, 'tv', rows[0].password, '16h')
  res.json({ token })
}))

app.get('/api/reception/daily-room-assignments/tv', authenticate, requireAnyRole(['reception', 'tv']), asyncRoute(async (req, res) => {
  const date = requireDateKey(String(req.query.date || ''))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const rooms = (await getDailyRoomAssignments(date))
    .filter((room) => room.blocks.length)
    .map((room) => ({
      ...room,
      blocks: room.blocks.map((block) => ({
        ...block,
        teacher: block.startTime < '13:00' ? room.morningTeacher : room.afternoonTeacher,
        isCurrent: date === today && block.startTime <= currentTime && block.endTime > currentTime,
      })),
    }))
  res.json({ date, currentTime, generatedAt: now.toISOString(), rooms })
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
  const isRosetta = req.body.isRosetta === true
  if (!name || !morningTeacher || !afternoonTeacher || !Number.isInteger(capacity) || capacity < 1) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query(
    'INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima, es_rosetta) VALUES (?, ?, ?, ?, ?)',
    [name, morningTeacher, afternoonTeacher, capacity, isRosetta],
  )
  const [rows] = await pool.query('SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity, es_rosetta AS isRosetta FROM salones WHERE id = ?', [result.insertId])
  res.status(201).json({ room: serializeRoom(rows[0]) })
}))

app.patch('/api/reception/rooms/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const morningTeacher = String(req.body.morningTeacher || '').trim()
  const afternoonTeacher = String(req.body.afternoonTeacher || '').trim()
  const capacity = Number(req.body.capacity)
  const isRosetta = req.body.isRosetta === undefined ? null : req.body.isRosetta === true
  if (!name || !morningTeacher || !afternoonTeacher || !Number.isInteger(capacity) || capacity < 1) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const [result] = await pool.query(
    'UPDATE salones SET nombre_salon = ?, profesor_manana = ?, profesor_tarde = ?, capacidad_maxima = ?, es_rosetta = COALESCE(?, es_rosetta) WHERE id = ?',
    [name, morningTeacher, afternoonTeacher, capacity, isRosetta, req.params.id],
  )
  if (!result.affectedRows) return sendError(res, 404, 'Salón no encontrado.', 'ROOM_NOT_FOUND')
  const [rows] = await pool.query('SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity, es_rosetta AS isRosetta FROM salones WHERE id = ?', [req.params.id])
  res.json({ room: serializeRoom(rows[0]) })
}))

app.delete('/api/reception/rooms/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const [result] = await pool.query('DELETE FROM salones WHERE id = ?', [req.params.id])
  if (!result.affectedRows) return sendError(res, 404, 'Salón no encontrado.', 'ROOM_NOT_FOUND')
  res.status(204).end()
}))

app.post('/api/reception/students', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const matricula = String(req.body.matricula || '').trim()
  const name = String(req.body.name || '').trim()
  const { level } = req.body
  const { modality, contractEnd } = req.body
  const weeklyHours = req.body.weeklyHours === undefined ? DEFAULT_WEEKLY_HOURS : Number(req.body.weeklyHours)
  if (!LEVEL_CODES.includes(level)) return sendError(res, 400, 'Selecciona un nivel válido.', 'INVALID_LEVEL')
  if (!CONTRACT_MODALITIES.includes(modality)) return sendError(res, 400, 'Selecciona una modalidad válida.', 'INVALID_MODALITY')
  if (!Number.isInteger(weeklyHours) || weeklyHours < 1) return sendError(res, 400, 'Las horas semanales deben ser un número entero mayor o igual a 1.', 'INVALID_WEEKLY_HOURS')
  if (!isValidDateKey(contractEnd)) return sendError(res, 400, 'Ingresa una fecha de vencimiento válida.', 'INVALID_CONTRACT_END')
  if (!matricula || !name) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  // Los estudiantes nuevos eligen si toman el paquete de Rosetta (24 h aparte de sus clases).
  if (!['si', 'no'].includes(req.body.rosetta)) return sendError(res, 400, 'Indica si el estudiante toma Rosetta.', 'INVALID_ROSETTA')
  const rosettaPlan = req.body.rosetta === 'si' ? 'paquete' : 'ninguno'
  if (req.body.password !== undefined && passwordError(String(req.body.password))) return sendError(res, 400, passwordError(String(req.body.password)), 'INVALID_PASSWORD')
  const temporaryPassword = String(req.body.password || randomBytes(9).toString('base64url'))
  const password = await bcrypt.hash(temporaryPassword, bcryptRounds)
  const connection = await pool.getConnection()
  let studentId
  try {
    await connection.beginTransaction()
    const [validDates] = await connection.query('SELECT CAST(? AS DATE) >= CURDATE() AS is_valid', [contractEnd])
    if (!validDates[0].is_valid) {
      await connection.rollback()
      return sendError(res, 400, 'Ingresa una fecha de vencimiento válida.', 'INVALID_CONTRACT_END')
    }
    const [result] = await connection.query(
      'INSERT INTO estudiantes (matricula, nombre_completo, nivel, password, debe_cambiar_password, rosetta_plan, rosetta_horas_total) VALUES (?, ?, ?, ?, TRUE, ?, ?)',
      [matricula, name, level, password, rosettaPlan, DEFAULT_ROSETTA_HOURS],
    )
    studentId = result.insertId
    await connection.query(
      'INSERT INTO contratos (estudiante_id, horas_semanales, modalidad, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, CURDATE(), ?, TRUE)',
      [studentId, weeklyHours, modality, contractEnd],
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  const student = await getStudent(studentId)
  res.status(201).json({ student: serializeStudent(student), temporaryPassword })
}))

app.post('/api/reception/students/:id/reset-password', sensitiveLimiter, authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const temporaryPassword = randomBytes(9).toString('base64url')
  const password = await bcrypt.hash(temporaryPassword, bcryptRounds)
  const [result] = await pool.query(
    'UPDATE estudiantes SET password = ?, debe_cambiar_password = TRUE WHERE id = ?',
    [password, req.params.id],
  )
  if (!result.affectedRows) return sendError(res, 404, 'Estudiante no encontrado.', 'STUDENT_NOT_FOUND')
  res.json({ temporaryPassword })
}))

app.patch('/api/reception/students/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const matricula = String(req.body.matricula || '').trim()
  const { level } = req.body
  if (level !== undefined && !LEVEL_CODES.includes(level)) return sendError(res, 400, 'Selecciona un nivel válido.', 'INVALID_LEVEL')
  if (!name || !matricula) return sendError(res, 400, 'Campos obligatorios incompletos.', 'REQUIRED_FIELDS')
  const { modality, contractEnd, rosettaPlan } = req.body
  const weeklyHours = req.body.weeklyHours === undefined ? undefined : Number(req.body.weeklyHours)
  const rosettaTotalHours = req.body.rosettaTotalHours === undefined ? undefined : Number(req.body.rosettaTotalHours)
  if (rosettaPlan !== undefined && !ROSETTA_PLANS.includes(rosettaPlan)) return sendError(res, 400, 'Selecciona un plan de Rosetta válido.', 'INVALID_ROSETTA')
  if (rosettaTotalHours !== undefined && (!Number.isInteger(rosettaTotalHours) || rosettaTotalHours < 0 || rosettaTotalHours > 1000)) return sendError(res, 400, 'Las horas de Rosetta deben ser un número entero entre 0 y 1000.', 'INVALID_ROSETTA_HOURS')
  if ((modality === undefined) !== (contractEnd === undefined)) return sendError(res, 400, 'Indica modalidad y vencimiento.', 'CONTRACT_FIELDS_INCOMPLETE')
  if (weeklyHours !== undefined && (!Number.isInteger(weeklyHours) || weeklyHours < 1)) return sendError(res, 400, 'Las horas semanales deben ser un número entero mayor o igual a 1.', 'INVALID_WEEKLY_HOURS')
  if (modality !== undefined && !CONTRACT_MODALITIES.includes(modality)) return sendError(res, 400, 'Selecciona una modalidad válida.', 'INVALID_MODALITY')
  if (contractEnd !== undefined && !isValidDateKey(contractEnd)) return sendError(res, 400, 'Ingresa una fecha de vencimiento válida.', 'INVALID_CONTRACT_END')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      'UPDATE estudiantes SET nombre_completo = ?, matricula = ?, nivel = COALESCE(?, nivel), rosetta_plan = COALESCE(?, rosetta_plan), rosetta_horas_total = COALESCE(?, rosetta_horas_total) WHERE id = ?',
      [name, matricula, level ?? null, rosettaPlan ?? null, rosettaTotalHours ?? null, req.params.id],
    )
    const [students] = await connection.query('SELECT id FROM estudiantes WHERE id = ?', [req.params.id])
    if (!students[0]) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })
    const [contracts] = await connection.query(
      'SELECT id, DATE_FORMAT(fecha_inicio, \'%Y-%m-%d\') AS fecha_inicio FROM contratos WHERE estudiante_id = ? AND activo = TRUE ORDER BY id DESC LIMIT 1',
      [req.params.id],
    )
    if (contracts[0]) {
      if (contractEnd !== undefined) {
        const [validDates] = await connection.query('SELECT CAST(? AS DATE) >= CURDATE() AS is_valid', [contractEnd])
        if (!validDates[0].is_valid) throw Object.assign(new Error('Ingresa una fecha de vencimiento válida.'), { status: 400 })
        if (contractEnd < contracts[0].fecha_inicio) throw Object.assign(new Error('La fecha de vencimiento no puede ser anterior al inicio del contrato.'), { status: 400 })
      }
      if (modality !== undefined) {
        await connection.query('UPDATE contratos SET modalidad = ?, fecha_fin = ? WHERE id = ?', [modality, contractEnd, contracts[0].id])
      }
      if (weeklyHours !== undefined) await connection.query('UPDATE contratos SET horas_semanales = ? WHERE id = ?', [weeklyHours, contracts[0].id])
    } else if (modality !== undefined) {
      const [validDates] = await connection.query('SELECT CAST(? AS DATE) >= CURDATE() AS is_valid', [contractEnd])
      if (!validDates[0].is_valid) throw Object.assign(new Error('Ingresa una fecha de vencimiento válida.'), { status: 400 })
      await connection.query(
        'INSERT INTO contratos (estudiante_id, horas_semanales, modalidad, fecha_inicio, fecha_fin, activo) VALUES (?, ?, ?, CURDATE(), ?, TRUE)',
        [req.params.id, weeklyHours ?? DEFAULT_WEEKLY_HOURS, modality, contractEnd],
      )
    } else if (weeklyHours !== undefined) {
      throw Object.assign(new Error('No hay un contrato activo para actualizar las horas semanales.'), { status: 409 })
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  const student = await getStudent(req.params.id)
  res.json({ student: serializeStudent(student) })
}))

app.delete('/api/reception/students/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query('DELETE FROM reservas WHERE estudiante_id = ?', [req.params.id])
    await connection.query('DELETE FROM contratos WHERE estudiante_id = ?', [req.params.id])
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
  const status = String(req.query.status || '').trim()
  const allowedStatuses = ['Confirmada', 'Cancelada', 'Completada']
  if (status && !allowedStatuses.includes(status)) return sendError(res, 400, 'Estado de reserva inválido.', 'INVALID_STATUS')
  const params = []
  let where = status ? 'WHERE r.estado = ?' : "WHERE r.estado <> 'Cancelada'"
  if (status) params.push(status)
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendError(res, 400, 'Fecha inválida.', 'INVALID_DATE')
    where += ' AND r.fecha = ?'
    params.push(date)
  }
  const [rows] = await pool.query(
    `SELECT r.id, e.matricula, e.nombre_completo, e.nivel AS level, DATE_FORMAT(r.fecha, '%Y-%m-%d') AS dateKey,
      TIME_FORMAT(r.hora_inicio, '%H:%i') AS startTime, TIME_FORMAT(r.hora_fin, '%H:%i') AS endTime,
      r.estado AS status, r.modalidad_asistencia AS modality, r.tipo AS type, l.titulo AS lesson
     FROM reservas r JOIN estudiantes e ON e.id = r.estudiante_id
     LEFT JOIN lecciones l ON l.id = r.leccion_id ${where}
     ORDER BY r.fecha, r.hora_inicio, e.nombre_completo`,
    params,
  )
  res.json({ reservations: rows.map((row) => ({ ...row, lesson: row.type === 'Rosetta' ? 'Rosetta' : row.lesson, studentId: row.matricula, student: row.nombre_completo })) })
}))

app.patch('/api/reception/reservations/:id', authenticate, requireRole('reception'), asyncRoute(async (req, res) => {
  const allowedStatuses = ['Confirmada', 'Cancelada', 'Completada']
  if (!allowedStatuses.includes(req.body.status)) return sendError(res, 400, 'Estado de reserva inválido.', 'INVALID_STATUS')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [reservations] = await connection.query(
      'SELECT estudiante_id, fecha, estado, tipo FROM reservas WHERE id = ? FOR UPDATE',
      [req.params.id],
    )
    const reservation = reservations[0]
    if (!reservation) throw Object.assign(new Error('Reserva no encontrada.'), { status: 404 })
    if (req.body.status === 'Confirmada' && reservation.estado === 'Cancelada') {
      const [students] = await connection.query('SELECT id, rosetta_plan, rosetta_horas_total FROM estudiantes WHERE id = ? FOR UPDATE', [reservation.estudiante_id])
      if (!students[0]) throw Object.assign(new Error('Estudiante no encontrado.'), { status: 404 })
      const plan = students[0].rosetta_plan
      if (reservation.tipo === 'Rosetta' && plan === 'paquete') {
        const [rosettaRows] = await connection.query(
          `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND tipo = 'Rosetta' AND estado IN ('Confirmada', 'Completada')`,
          [reservation.estudiante_id],
        )
        if (Number(rosettaRows[0].total) >= Number(students[0].rosetta_horas_total)) {
          throw Object.assign(new Error('No se puede reconfirmar: el alumno ya usó todas sus horas de Rosetta.'), { status: 409 })
        }
      } else {
        const [contracts] = await connection.query(
          'SELECT horas_semanales FROM contratos WHERE estudiante_id = ? AND activo = TRUE ORDER BY id DESC LIMIT 1',
          [reservation.estudiante_id],
        )
        if (!contracts[0]?.horas_semanales) throw Object.assign(new Error('No hay un contrato activo con horas disponibles.'), { status: 409 })
        const [weekCount] = await connection.query(
          `SELECT COUNT(*) AS total FROM reservas WHERE estudiante_id = ? AND estado IN ('Confirmada', 'Completada')
           AND YEARWEEK(fecha, 3) = YEARWEEK(?, 3) AND (tipo = 'Clase' OR ?)`,
          [reservation.estudiante_id, reservation.fecha, rosettaCountsWeekly(plan)],
        )
        if (Number(weekCount[0].total) >= contracts[0].horas_semanales) {
          throw Object.assign(new Error('No se puede reconfirmar la reserva: el alumno excedería sus horas semanales contratadas.'), { status: 409 })
        }
      }
    }
    if (reservation.estado !== req.body.status) {
      await connection.query('UPDATE reservas SET estado = ? WHERE id = ?', [req.body.status, req.params.id])
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  res.json({ message: 'Estado de reserva actualizado.' })
}))

app.use((error, req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') {
    const message = req.path.includes('/lessons') ? 'El orden de lección ya está ocupado.' : req.path.includes('/students') ? 'La matrícula ya está registrada.' : 'Ya existe un registro con esos datos.'
    return sendError(res, 409, message, 'DUPLICATE_RECORD')
  }
  if (String(error.code || '').startsWith('ER_ROW_IS_REFERENCED')) return sendError(res, 409, 'No se puede eliminar este registro porque tiene datos asociados.', 'RECORD_IN_USE')
  if (['ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'WARN_DATA_TRUNCATED', 'ER_WARN_DATA_OUT_OF_RANGE'].includes(error.code)) return sendError(res, 400, 'Uno de los campos es demasiado largo o tiene un formato inválido.', 'INVALID_FIELD')
  if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') return sendError(res, error.status || 400, 'La solicitud no tiene un formato válido.', 'INVALID_BODY')
  const status = error.status || 500
  if (status >= 500) {
    console.error('API request failed', {
      method: req.method,
      path: req.path,
      code: error.code || 'UNKNOWN_ERROR',
    })
  }
  const message = status < 500 ? error.message : 'Error interno del servidor.'
  return sendError(res, status, message, status === 500 ? 'INTERNAL_ERROR' : undefined)
})

app.listen(port)
