const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function request(path, options = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || 'No fue posible completar la operación.')
    error.status = response.status
    error.code = body.code
    throw error
  }
  return body
}

export const api = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: (token) => request('/auth/me', {}, token),
  changePassword: (token, password) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ password }) }, token),
  updateProfile: (token, updates) => request('/student/profile', { method: 'PATCH', body: JSON.stringify(updates) }, token),
  availability: (token, dates) => request(`/student/availability?dates=${encodeURIComponent(dates.join(','))}`, {}, token),
  createReservations: (token, slots, modalidad) => request('/reservations', { method: 'POST', body: JSON.stringify({ slots, modalidad }) }, token),
  cancelReservation: (token, id) => request(`/reservations/${id}`, { method: 'DELETE' }, token),
  cancelReservations: (token, ids) => request('/reservations', { method: 'DELETE', body: JSON.stringify({ ids }) }, token),
  updateReservation: (token, id, updates) => request(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, token),
  updateReceptionReservation: (token, id, status) => request(`/reception/reservations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  receptionStudents: (token) => request('/reception/students', {}, token),
  receptionRooms: (token) => request('/reception/rooms', {}, token),
  receptionLessons: (token) => request('/reception/lessons', {}, token),
  createLesson: (token, lesson) => request('/reception/lessons', { method: 'POST', body: JSON.stringify(lesson) }, token),
  updateLesson: (token, id, lesson) => request(`/reception/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(lesson) }, token),
  deleteLesson: (token, id) => request(`/reception/lessons/${id}`, { method: 'DELETE' }, token),
  createRoom: (token, room) => request('/reception/rooms', { method: 'POST', body: JSON.stringify(room) }, token),
  updateRoom: (token, id, room) => request(`/reception/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(room) }, token),
  deleteRoom: (token, id) => request(`/reception/rooms/${id}`, { method: 'DELETE' }, token),
  createStudent: (token, student) => request('/reception/students', { method: 'POST', body: JSON.stringify(student) }, token),
  updateStudent: (token, id, student) => request(`/reception/students/${id}`, { method: 'PATCH', body: JSON.stringify(student) }, token),
  deleteStudent: (token, id) => request(`/reception/students/${id}`, { method: 'DELETE' }, token),
  receptionReservations: (token, date) => request(`/reception/reservations?date=${encodeURIComponent(date)}`, {}, token),
}