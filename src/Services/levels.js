export const LEVELS = [
  { code: 'S', name: 'Starter' },
  { code: 'B', name: 'Beginner' },
  { code: 'I', name: 'Intermediate' },
  { code: 'IA', name: 'Intermediate Advanced' },
  { code: 'A', name: 'Advanced' },
]

export const getLevel = (code) => LEVELS.find((level) => level.code === code) || null
