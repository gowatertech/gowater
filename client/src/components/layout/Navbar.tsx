import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { HomeIcon, CreditCard, Users, Settings, FileText, BarChart } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: HomeIcon },
    { href: "/clients", label: "Clientes", icon: Users },
    { href: "/payments", label: "Pagos", icon: CreditCard },
    { href: "/reports", label: "Reportes", icon: BarChart },
    { href: "/receipts", label: "Recibos", icon: FileText },
    { href: "/settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <nav className="bg-blue-700 text-white py-4 px-4 flex justify-between items-center shadow-md">
      <div className="flex items-center">
        <h1 className="text-xl font-bold mr-12">Sistema de Pagos</h1>
        <ul className="flex items-center space-x-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a className={cn(
                    "px-3 py-2 flex items-center rounded-md hover:bg-blue-600 transition-colors",
                    isActive && "bg-blue-800 font-medium"
                  )}>
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;