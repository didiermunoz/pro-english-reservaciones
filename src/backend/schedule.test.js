import assert from 'node:assert/strict'
import test from 'node:test'
import { getClassHours } from './schedule.js'

test('lunes a viernes hay clases de 7:00 a 21:00', () => {
  for (const dateKey of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) {
    assert.deepEqual(getClassHours(dateKey), { startHour: 7, endHour: 21 })
  }
})

test('sábado hay clases de 8:00 a 15:00', () => {
  assert.deepEqual(getClassHours('2026-11-21'), { startHour: 8, endHour: 15 })
})

test('domingo no hay clases', () => {
  assert.equal(getClassHours('2026-11-22'), null)
})
