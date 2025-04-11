import { ReactNode } from "react";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 p-6">
        {children}
      </main>
      <footer className="p-4 text-center text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} Sistema de Pagos. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default MainLayout;