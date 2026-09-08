import { LayoutDashboard, ShieldAlert, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col bg-[#312b2b] p-6 text-white">
      <h1 className="mb-10 text-2xl font-bold">🛡 MailWatch</h1>

      <nav className="flex-1 space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-400 p-3 text-black">
          <LayoutDashboard size={20} />
          Dashboard
        </div>

        <div className="flex items-center gap-3 p-3 opacity-80">
          <ShieldAlert size={20} />
          Cuarentena
        </div>

        <div className="flex items-center gap-3 p-3 opacity-80">
          <Settings size={20} />
          Configuración
        </div>
      </nav>

      <div>
        <div className="mb-4">Ana Martínez</div>

        <button className="flex w-full justify-center gap-3 rounded-xl bg-white/10 p-3">
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
