import type { View } from '../App.js';
import { initialsOf } from '../lib/format.js';
import {
  IconDashboard,
  IconLogout,
  IconMail,
  IconQuarantine,
  IconSettings,
  IconShield,
} from './Icons.js';

interface SidebarProps {
  view: View;
  onView: (view: View) => void;
  counts: { inbox: number; quarantine: number };
  user: { name: string; address: string };
}

export function Sidebar({ view, onView, counts, user }: SidebarProps) {
  const items = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <IconDashboard />, badge: undefined },
    { id: 'inbox' as const, label: 'Bandeja', icon: <IconMail />, badge: counts.inbox },
    { id: 'quarantine' as const, label: 'Cuarentena', icon: <IconQuarantine />, badge: counts.quarantine },
    { id: 'settings' as const, label: 'Configuración', icon: <IconSettings />, badge: undefined },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__drag" />

      <div className="brand">
        <span className="brand__mark">
          <IconShield size={21} />
        </span>
        <span className="brand__name">MailWatch</span>
      </div>

      <nav className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav__item"
            aria-current={view === item.id}
            onClick={() => onView(item.id)}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="nav__badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="account">
        <div className="account__row">
          <span className="account__avatar">{initialsOf(user.name)}</span>
          <span className="account__who">
            <span className="account__name">{user.name}</span>
            <span className="account__mail" title={user.address}>
              {user.address}
            </span>
          </span>
        </div>
        <button type="button" className="account__out">
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
