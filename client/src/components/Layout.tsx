import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

const links = [
  { to: "/", label: "Resumen", icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" },
  { to: "/movimientos", label: "Movimientos", icon: "M4 6h16M4 12h16M4 18h10" },
  { to: "/categorias", label: "Categorías", icon: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 3.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0Z" }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M9 21.5 14 16l3.5 3.5L23 12" />
            </svg>
          </span>
          <span className="brand-name">Cuentas Claras</span>
        </div>

        <nav className="nav" aria-label="Principal">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className="nav-link">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={link.icon} />
              </svg>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="profile">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="profile-text">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
