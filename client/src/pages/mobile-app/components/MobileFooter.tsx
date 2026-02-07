import { useLocation } from "wouter";
import { Home, Truck, FileText, Users, User } from "lucide-react";

interface MobileFooterProps {
  darkMode?: boolean;
}

export const MobileFooter: React.FC<MobileFooterProps> = ({ darkMode = false }) => {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === "/mobile-app") {
      return location === "/mobile-app" || location === "/mobile-app/";
    }
    return location.startsWith(path);
  };

  const tabs = [
    { path: "/mobile-app", icon: Home, label: "Inicio" },
    { path: "/mobile-app/rutas-pendientes", icon: Truck, label: "Rutas", matchPaths: ["/mobile-app/rutas", "/mobile-app/ruta"] },
    { path: "/mobile-app/entregas", icon: FileText, label: "Entregas" },
    { path: "/mobile-app/clientes", icon: Users, label: "Clientes" },
    { path: "/mobile-app/perfil", icon: User, label: "Perfil" },
  ];

  const isTabActive = (tab: typeof tabs[0]) => {
    if (isActive(tab.path)) return true;
    if (tab.matchPaths) {
      return tab.matchPaths.some(p => location.startsWith(p));
    }
    return false;
  };

  return (
    <footer className={`mobile-footer fixed bottom-0 left-0 right-0 w-full border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
    }`}>
      <nav className="flex justify-around items-center px-1 py-1.5">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-0 ${
                active 
                  ? 'text-blue-600 bg-blue-50' 
                  : darkMode 
                    ? 'text-gray-500 hover:text-gray-300' 
                    : 'text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setLocation(tab.path)}
              data-testid={`button-footer-${tab.label.toLowerCase()}`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium leading-none ${active ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {active && (
                <div className="h-0.5 w-4 bg-blue-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </footer>
  );
};
