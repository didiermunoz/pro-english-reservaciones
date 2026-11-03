import { Link } from 'react-router-dom'

/** Renders the academy brand; `footer` is retained for existing callers. */
export default function StudentBrand({ footer = false }) {
  return (
    <Link className="student-brand" to="/home" aria-label="Pro English Academy Sur, inicio">
      <img
        src="/logo_og.png"
        alt="Pro English Academy Sur"
        className="brand-logo"
      />
      <span>Pro English Academy Sur</span>
    </Link>
  )
}
