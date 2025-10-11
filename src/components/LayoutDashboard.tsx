import Link from "next/link";
import { useRouter } from "next/router";

const sidebarItems = [
  { name: "Canciones", href: "/dashboard/songs" },
  { name: "SetLists", href: "/dashboard/setlists" },
  { name: "Eventos", href: "/dashboard/events" },
  { name: "Usuarios", href: "/dashboard/users" },
  { name: "Configuración", href: "/dashboard/settings" },
];

export default function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-blanco-soft text-gray-800">
      {/* Sidebar */}
      <aside className="w-72 terracota-gradient text-blanco flex flex-col shadow-xl">
        <div className="p-6 border-b border-blanco/20">
          <div className="text-2xl font-bold mb-1">🎶 Song Bank</div>
          <div className="text-sm text-blanco-soft opacity-90">Iglesia Alabanza Quitumbe</div>
        </div>
        <nav className="flex-1 p-4">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${
                router.pathname === item.href
                  ? "bg-blanco text-terracota font-semibold shadow-md"
                  : "hover:bg-blanco/20 hover:translate-x-1"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Logout button */}
        <div className="p-4 border-t border-blanco/20">
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }
            }}
            className="w-full bg-blanco/20 text-blanco px-4 py-2 rounded-xl hover:bg-blanco/30 transition-all duration-200"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
