import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/highways", label: "Rodovias" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/", label: "Upload de Inspeções", end: true },
  { to: "/history", label: "Histórico" },
  { to: "/settings", label: "Configurações" },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <span className="font-semibold text-slate-900">GreenWay Vision</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
