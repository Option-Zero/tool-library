import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="app-header-title">
          Tool Library
        </Link>
        <div className="app-header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
