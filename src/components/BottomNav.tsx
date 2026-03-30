import { Link, useRouterState } from '@tanstack/react-router'
import { Search, Wrench, Bell, User } from 'lucide-react'

const navItems = [
  { to: '/' as const, label: 'Search', icon: Search },
  { to: '/my-tools' as const, label: 'My Tools', icon: Wrench },
  { to: '/notifications' as const, label: 'Alerts', icon: Bell },
  { to: '/profile' as const, label: 'Profile', icon: User },
]

export default function BottomNav() {
  const { location } = useRouterState()

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="bottom-nav-item"
            data-active={location.pathname === to ? 'true' : undefined}
            aria-current={location.pathname === to ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
