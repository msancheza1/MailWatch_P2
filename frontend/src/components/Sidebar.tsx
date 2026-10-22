import { useEffect, useState } from "react";

import {
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  email: string;
  onLogout: () => void;
  loggingOut: boolean;
  showMetrics: boolean;
}

export default function Sidebar({
  email,
  onLogout,
  loggingOut,
  showMetrics,
}: SidebarProps) {
  const [active, setActive] = useState(
    () => window.location.hash || "#resumen",
  );

  useEffect(() => {
    function updateActive() {
      setActive(window.location.hash || "#resumen");
    }

    window.addEventListener("hashchange", updateActive);

    return () => {
      window.removeEventListener("hashchange", updateActive);
    };
  }, []);

  const links = [
    {
      href: "#resumen",
      label: "Resumen",
      icon: LayoutDashboard,
    },
    {
      href: "#correos",
      label: "Correos",
      icon: Mail,
    },
    {
      href: "#quarantine",
      label: "Cuarentena",
      icon: ShieldAlert,
    },
    ...(showMetrics
      ? [
          {
            href: "#metricas",
            label: "Métricas",
            icon: ChartNoAxesCombined,
          },
        ]
      : []),
    {
      href: "#configuracion",
      label: "Configuración",
      icon: Settings,
    },
  ];

  return (
    <aside className="mw-sidebar">
      <a className="mw-brand" href="#resumen">
        <span className="mw-logo">
          <ShieldCheck size={24} />
        </span>

        <span>MailWatch</span>
      </a>

      <p className="mw-nav-caption">ESPACIO DE TRABAJO</p>

      <nav className="mw-nav" aria-label="Navegación principal">
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className={active === href ? "is-active" : ""}
            aria-current={active === href ? "location" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="mw-sidebar-bottom">
        <div className="mw-account">
          <span className="mw-avatar">
            {email.charAt(0).toUpperCase()}
          </span>

          <div>
            <strong>Tu cuenta</strong>
            <span title={email}>{email}</span>
          </div>
        </div>

        <button
          type="button"
          className="mw-logout"
          onClick={onLogout}
          disabled={loggingOut}
        >
          <LogOut size={18} />

          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}