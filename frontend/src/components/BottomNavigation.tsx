import { CalendarDays, Clock3, Handshake, Search, Settings2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Календарь', icon: CalendarDays, end: true },
  { to: '/availability', label: 'Время', icon: Search },
  { to: '/meetings', label: 'Встречи', icon: Clock3 },
  { to: '/friends', label: 'Друны', icon: Handshake },
  { to: '/settings', label: 'Профиль', icon: Settings2 },
]

export function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="Основная навигация">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? 'is-active' : '')}
        >
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
