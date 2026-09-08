export default function StudentBrand({ footer = false }) {
  return (
    <a className="student-brand" href="/dashboard" aria-label="Flex English Academy, inicio">
      <span className="brand-mark" aria-hidden="true">⚡</span>
      <span>{footer ? 'FLEX ENGLISH' : 'PRO ENGLISH'} <strong>ACADEMY</strong></span>
    </a>
  )
}
