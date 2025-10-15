import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const sidebarItems = [
  { name: "Canciones", href: "/dashboard/songs" },
  { name: "SetLists", href: "/dashboard/setlists" },
  { name: "Eventos", href: "/dashboard/events" },
  // { name: "Usuarios", href: "/dashboard/users" },
  // { name: "Configuración", href: "/dashboard/settings" },
];

export default function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-blanco-soft text-gray-800">
      {/* Overlay para móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 terracota-gradient text-blanco flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
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
              onClick={() => setIsSidebarOpen(false)}
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
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Header móvil */}
        <div className="lg:hidden bg-terracota text-blanco p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-blanco/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-lg font-bold">🎶 Song Bank</div>
          <div className="w-10"></div> {/* Spacer para centrar */}
        </div>

        <div className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
