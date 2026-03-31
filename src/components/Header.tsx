import { Link, useRouterState } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'

export default function Header() {
  const { location } = useRouterState()

  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="app-header-title">
          Tool Library
        </Link>
        <nav className="app-header-nav" aria-label="Main navigation">
          <Link
            to="/"
            className="app-header-nav-link"
            data-active={location.pathname === '/' ? 'true' : undefined}
          >
            Search
          </Link>
          <Link
            to="/my-tools"
            className="app-header-nav-link"
            data-active={location.pathname.startsWith('/my-tools') ? 'true' : undefined}
          >
            My Tools
          </Link>
          <Link
            to="/profile"
            className="app-header-nav-link"
            data-active={location.pathname === '/profile' ? 'true' : undefined}
          >
            Profile
          </Link>
        </nav>
        <div className="app-header-actions">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
