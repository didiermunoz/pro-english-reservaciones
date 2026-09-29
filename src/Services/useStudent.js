import { useContext } from 'react'
import { StudentContext } from './StudentContextBase'

export function useStudent() {
  const context = useContext(StudentContext)
  if (!context) throw new Error('useStudent debe utilizarse dentro de StudentProvider')
  return context
}