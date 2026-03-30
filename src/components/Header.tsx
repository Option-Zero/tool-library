import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'

export default function Header() {
  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="app-header-title">
          Tool Library
        </Link>
        <div className="app-header-actions">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
