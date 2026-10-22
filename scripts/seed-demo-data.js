import { pool } from '../src/backend/db.js'

const toDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-')

const minutes = (time) => {
  const [hours, mins] = time.split(':').map(Number)
  return hours * 60 + mins
}
const overlaps = (firstStart, firstEnd, secondStart, secondEnd) => (
  firstStart < secondEnd && firstEnd > secondStart
)

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Los datos de demostración no se pueden cargar en producción.')
  }

  const connection = await pool.getConnection()
  let lockAcquired = false
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK('pro_english_demo_seed', 10) AS acquired")
    lockAcquired = Number(lockRows[0].acquired) === 1
    if (!lockAcquired) throw new Error('No se pudo reservar la base de datos para cargar los datos de demostración.')

    await connection.beginTransaction()
    const [migrationTables] = await connection.query(
      `SELECT COUNT(*) AS total FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name IN ('asignaciones_diarias_salon', 'bloques_diarios_salon', 'alumnos_bloque_diario')`,
    )
    if (Number(migrationTables[0].total) !== 3) {
      throw new Error('Faltan las tablas de asignación diaria. Ejecuta primero npm run db:migrate:daily-rooms.')
    }

    const [students] = await connection.query(
      `SELECT e.id, e.nombre_completo AS name, c.id AS contractId,
        c.horas_semanales AS weeklyHours, c.modalidad AS modality
       FROM estudiantes e
       LEFT JOIN contratos c ON c.id = (
         SELECT c2.id FROM contratos c2
         WHERE c2.estudiante_id = e.id AND c2.activo = TRUE
         ORDER BY c2.id DESC LIMIT 1
       )
       ORDER BY e.id`,
    )
    if (!students.length) throw new Error('No hay estudiantes registrados para preparar reservas de demostración.')

    let [rooms] = await connection.query(
      'SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones ORDER BY id',
    )
    if (!rooms.length) {
      await connection.query(
        `INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima)
         VALUES ('Salón Demo', 'Instructor de mañana', 'Instructor de tarde', 10)`,
      )
      const [createdRooms] = await connection.query(
        'SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones ORDER BY id',
      )
      rooms = createdRooms
    }

    const roomNames = new Set(rooms.map((room) => room.name))
    for (let number = 1; number <= 8; number += 1) {
      const name = `Salón ${number}`
      if (roomNames.has(name)) continue
      await connection.query(
        'INSERT INTO salones (nombre_salon, profesor_manana, profesor_tarde, capacidad_maxima) VALUES (?, ?, ?, ?)',
        [name, 'Instructor de mañana', 'Instructor de tarde', 12],
      )
    }
    rooms = (await connection.query(
      'SELECT id, nombre_salon AS name, profesor_manana AS morningTeacher, profesor_tarde AS afternoonTeacher, capacidad_maxima AS capacity FROM salones ORDER BY id',
    ))[0]
    const numberedRooms = rooms
      .filter((room) => /^Salón [1-8]$/.test(room.name))
      .sort((first, second) => Number(first.name.slice(6)) - Number(second.name.slice(6)))

    const [lessons] = await connection.query('SELECT id FROM lecciones ORDER BY orden')
    if (!lessons.length) {
      const [orderRows] = await connection.query('SELECT COALESCE(MAX(orden), 0) + 1 AS nextOrder FROM lecciones')
      await connection.query(
        'INSERT INTO lecciones (orden, titulo, tipo) VALUES (?, ?, ?)',
        [Number(orderRows[0].nextOrder), 'Lección de demostración', 'Leccion'],
      )
      const [createdLessons] = await connection.query('SELECT id FROM lecciones ORDER BY orden')
      lessons.push(...createdLessons)
    }

    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const monday = new Date(today)
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const weekStartKey = toDateKey(monday)
    const weekEnd = new Date(monday)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndKey = toDateKey(weekEnd)
    const todayKey = toDateKey(today)

    const [reservationRows] = await connection.query(
      `SELECT id, estudiante_id AS studentId, salon_id AS roomId, leccion_id AS lessonId,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS dateKey,
        TIME_FORMAT(hora_inicio, '%H:%i') AS startTime,
        TIME_FORMAT(hora_fin, '%H:%i') AS endTime, estado AS status
       FROM reservas
       WHERE fecha >= ? AND fecha < ? AND estado IN ('Confirmada', 'Completada')`,
      [weekStartKey, weekEndKey],
    )
    const bookings = reservationRows.map((row) => ({
      ...row,
      studentId: Number(row.studentId),
      roomId: Number(row.roomId),
      lessonId: Number(row.lessonId),
    })    )
    const createdToday = []
    for (const [index, student] of students.entries()) {
      let weeklyHours = Number(student.weeklyHours)
      if (!student.contractId) {
        weeklyHours = Math.max(1, Math.min(20, Number(process.env.DEMO_CONTRACT_WEEKLY_HOURS) || 6))
        await connection.query(
          `INSERT INTO contratos (estudiante_id, horas_semanales, modalidad, fecha_inicio, fecha_fin, activo)
           VALUES (?, ?, 'Hibrida', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), TRUE)`,
          [student.id, weeklyHours],
        )
      }
      const currentBookings = bookings.filter((booking) => booking.studentId === Number(student.id))
      const targetByProfile = [1, Math.max(1, Math.ceil(weeklyHours / 2)), weeklyHours]
      const target = Math.min(weeklyHours, targetByProfile[index % targetByProfile.length])
      let remaining = Math.max(0, target - currentBookings.length)
      if (!remaining) continue

      const candidateDates = Array.from({ length: 6 }, (_, dayOffset) => {
        const date = new Date(monday)
        date.setDate(date.getDate() + dayOffset)
        return date
      }).sort((first, second) => {
        const firstKey = toDateKey(first)
        const secondKey = toDateKey(second)
        const rank = (key) => key === todayKey ? 0 : key > todayKey ? 1 : 2
        return rank(firstKey) - rank(secondKey) || first.getTime() - second.getTime()
      })
      const candidates = candidateDates.flatMap((date) => {
        const dateKey = toDateKey(date)
        const firstHour = date.getDay() === 6 ? 8 : 7
        const lastHour = date.getDay() === 6 ? 14 : 19
        const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, offset) => firstHour + offset)
        if (dateKey === todayKey) {
          const preferredHours = [10, 11, 12, 13, 14, 15, 16, 17].filter((hour) => hour >= firstHour && hour <= lastHour)
          return [...preferredHours, ...hours.filter((hour) => !preferredHours.includes(hour))].map((startHour) => ({
            dateKey,
            startHour,
          }))
        }
        return hours.map((startHour) => ({
          dateKey,
          startHour,
        }))
      }).sort((first, second) => (
        ((key) => key === todayKey ? 0 : key > todayKey ? 1 : 2)(first.dateKey)
          - ((key) => key === todayKey ? 0 : key > todayKey ? 1 : 2)(second.dateKey)
        || first.dateKey.localeCompare(second.dateKey)
        || (first.dateKey === todayKey
          ? (first.startHour - 10 + 24) % 24 - (second.startHour - 10 + 24) % 24
          : first.startHour - second.startHour)
      ))

      for (const candidate of candidates) {
        if (!remaining) break
        const startTime = `${String(candidate.startHour).padStart(2, '0')}:00`
        const endTime = `${String(candidate.startHour + 1).padStart(2, '0')}:00`
        const startMinutes = minutes(startTime)
        const endMinutes = minutes(endTime)
        if (bookings.some((booking) => (
          booking.studentId === Number(student.id)
          && booking.dateKey === candidate.dateKey
          && booking.status !== 'Cancelada'
          && overlaps(startMinutes, endMinutes, minutes(booking.startTime), minutes(booking.endTime))
        ))) continue

        const availableRoom = rooms.find((room) => {
          const roomBookings = bookings.filter((booking) => (
            booking.roomId === Number(room.id)
            && booking.dateKey === candidate.dateKey
            && overlaps(startMinutes, endMinutes, minutes(booking.startTime), minutes(booking.endTime))
          ))
          return roomBookings.length < Number(room.capacity)
        })
        if (!availableRoom) continue

        const lessonId = Number(lessons[(index + target - remaining) % lessons.length].id)
        const attendanceMode = student.modality === 'En Linea' ? 'En Linea' : 'Presencial'
        const status = candidate.dateKey < todayKey ? 'Completada' : 'Confirmada'
        const [result] = await connection.query(
          `INSERT INTO reservas
            (estudiante_id, salon_id, leccion_id, fecha, hora_inicio, hora_fin, modalidad_asistencia, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [student.id, availableRoom.id, lessonId, candidate.dateKey, `${startTime}:00`, `${endTime}:00`, attendanceMode, status],
        )
        const booking = {
          id: Number(result.insertId),
          studentId: Number(student.id),
          roomId: Number(availableRoom.id),
          lessonId,
          dateKey: candidate.dateKey,
          startTime,
          endTime,
          status,
        }
        bookings.push(booking)
        if (candidate.dateKey === todayKey) createdToday.push(booking)
        remaining -= 1
      }
    }

    for (const room of numberedRooms) {
      await connection.query(
        `INSERT IGNORE INTO asignaciones_diarias_salon (fecha, salon_id, profesor_manana, profesor_tarde)
         VALUES (?, ?, ?, ?)`,
        [todayKey, room.id, room.morningTeacher || '', room.afternoonTeacher || ''],
      )
    }

    const [existingBlocks] = await connection.query(
      `SELECT id, salon_id AS roomId, leccion_id AS lessonId,
        TIME_FORMAT(hora_inicio, '%H:%i') AS startTime,
        TIME_FORMAT(hora_fin, '%H:%i') AS endTime
       FROM bloques_diarios_salon WHERE fecha = ? ORDER BY hora_inicio, id`,
      [todayKey],
    )
    if (existingBlocks.length > numberedRooms.length) {
      throw new Error(`Hay ${existingBlocks.length} bloques para hoy, pero solo hay 8 salones de demostración disponibles.`)
    }

    if (existingBlocks.length) {
      for (const [index, block] of existingBlocks.entries()) {
        const room = numberedRooms[index]
        if (!room) throw new Error('Falta un salón numerado para distribuir los bloques de hoy.')
        const [attendees] = await connection.query(
          'SELECT estudiante_id AS studentId FROM alumnos_bloque_diario WHERE bloque_id = ?',
          [block.id],
        )
        if (attendees.length > Number(room.capacity)) {
          throw new Error(`El bloque ${block.id} supera el aforo de ${room.name}.`)
        }
        await connection.query('UPDATE bloques_diarios_salon SET salon_id = ? WHERE id = ?', [room.id, block.id])
        const studentIds = attendees.map((attendee) => Number(attendee.studentId))
        if (!studentIds.length) continue
        const placeholders = studentIds.map(() => '?').join(', ')
        await connection.query(
          `UPDATE reservas SET salon_id = ?
           WHERE fecha = ? AND leccion_id = ? AND hora_inicio = ? AND hora_fin = ?
           AND estudiante_id IN (${placeholders}) AND estado IN ('Confirmada', 'Completada')`,
          [room.id, todayKey, block.lessonId, `${block.startTime}:00`, `${block.endTime}:00`, ...studentIds],
        )
      }
    } else {
      const [todaysReservations] = await connection.query(
        `SELECT r.salon_id AS roomId, r.leccion_id AS lessonId,
          TIME_FORMAT(r.hora_inicio, '%H:%i') AS startTime,
          TIME_FORMAT(r.hora_fin, '%H:%i') AS endTime,
          r.estudiante_id AS studentId
         FROM reservas r
         WHERE r.fecha = ? AND r.estado IN ('Confirmada', 'Completada')
         ORDER BY r.salon_id, r.hora_inicio, r.leccion_id, r.estudiante_id`,
        [todayKey],
      )
      const groups = new Map()
      for (const booking of todaysReservations) {
        const key = `${booking.roomId}|${booking.lessonId}|${booking.startTime}|${booking.endTime}`
        const group = groups.get(key) || { ...booking, students: [] }
        group.students.push(Number(booking.studentId))
        groups.set(key, group)
      }
      if (groups.size > numberedRooms.length) {
        throw new Error(`Hay ${groups.size} grupos de clase para hoy, pero solo hay 8 salones de demostración disponibles.`)
      }
      for (const [index, group] of [...groups.values()].entries()) {
        const room = numberedRooms[index]
        if (!room) throw new Error('Falta un salón numerado para asignar una clase de hoy.')
        if (group.students.length > Number(room.capacity)) {
          throw new Error(`El grupo de ${group.students.length} alumnos supera el aforo de ${room.name}.`)
        }
        const studentPlaceholders = group.students.map(() => '?').join(', ')
        await connection.query(
          `UPDATE reservas SET salon_id = ?
           WHERE fecha = ? AND leccion_id = ? AND hora_inicio = ? AND hora_fin = ?
           AND estudiante_id IN (${studentPlaceholders}) AND estado IN ('Confirmada', 'Completada')`,
          [room.id, todayKey, group.lessonId, `${group.startTime}:00`, `${group.endTime}:00`, ...group.students],
        )
        const [result] = await connection.query(
          `INSERT INTO bloques_diarios_salon (fecha, salon_id, leccion_id, hora_inicio, hora_fin)
           VALUES (?, ?, ?, ?, ?)`,
          [todayKey, room.id, group.lessonId, `${group.startTime}:00`, `${group.endTime}:00`],
        )
        for (const studentId of group.students) {
          await connection.query(
            'INSERT IGNORE INTO alumnos_bloque_diario (bloque_id, estudiante_id) VALUES (?, ?)',
            [result.insertId, studentId],
          )
        }
      }
    }

    await connection.commit()
    const insertedCount = bookings.length - reservationRows.length
    process.stdout.write(
      `Datos de demostración listos: ${students.length} estudiantes revisados, ${insertedCount} reservas nuevas y ${createdToday.length} reservas para hoy.\n`,
    )
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('pro_english_demo_seed')")
    connection.release()
  }
}

try {
  await seedDemoData()
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}
