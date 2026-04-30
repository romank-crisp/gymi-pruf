import Link from 'next/link'
import './CurriculumNavLink.scss'

/**
 * Nav link for the custom Curriculum Tree view.
 *
 * Injected via `admin.components.beforeNavLinks` so it appears above the
 * auto-generated collection groups. Matches Payload's default nav link
 * styling.
 */
export default function CurriculumNavLink() {
  return (
    <Link href="/admin/curriculum" className="curriculum-nav-link">
      <span className="curriculum-nav-link__icon" aria-hidden>
        🌳
      </span>
      <span className="curriculum-nav-link__label">Curriculum Tree</span>
    </Link>
  )
}
