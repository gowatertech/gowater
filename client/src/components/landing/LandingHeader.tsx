import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { 
  Droplet, 
  Menu, 
  ChevronDown, 
  Building2, 
  ServerCog, 
  Smartphone 
} from "lucide-react";

export function LandingHeader() {
  const [location] = useLocation();
  const [isAccesosOpen, setIsAccesosOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccesosOpen(false);
      }
    };

    if (isAccesosOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccesosOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 shadow-lg">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-white/20">
            <Droplet className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-semibold text-white">
            GoWater
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-1">
          <Link href="/">
            <Button variant="ghost" className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/") ? "bg-white/15" : ""}`}>Inicio</Button>
          </Link>
          <Link href="/planes">
            <Button variant="ghost" className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/planes") ? "bg-white/15" : ""}`}>Planes</Button>
          </Link>
          <Link href="/soporte">
            <Button variant="ghost" className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/soporte") ? "bg-white/15" : ""}`}>Soporte</Button>
          </Link>
          <Link href="/mobile-app/login">
            <Button variant="ghost" className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/mobile-app") ? "bg-white/15" : ""}`}>App Móvil</Button>
          </Link>
          <Link href="/contact">
            <Button 
              variant="ghost" 
              className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/contact") && !location.includes("demo") ? "bg-white/15" : ""}`}
            >
              Contáctanos
            </Button>
          </Link>
          <Link href="/privacy">
            <Button variant="ghost" className={`font-medium text-white hover:bg-white/10 hover:text-white ${isActive("/privacy") ? "bg-white/15" : ""}`}>Privacidad</Button>
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 p-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-white/20">
                    <Droplet className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-semibold text-white">
                    GoWater
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <nav className="space-y-1">
                  <Link href="/">
                    <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/") && location === "/" ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>Inicio</div>
                  </Link>
                  <Link href="/planes">
                    <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/planes") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>Planes</div>
                  </Link>
                  <Link href="/soporte">
                    <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/soporte") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>Soporte</div>
                  </Link>
                  <SheetClose asChild>
                    <Link href="/mobile-app/login">
                      <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/mobile-app") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>App Móvil</div>
                    </Link>
                  </SheetClose>
                  <Link href="/contact">
                    <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/contact") && !location.includes("demo") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>Contáctanos</div>
                  </Link>
                  <Link href="/privacy">
                    <div className={`block p-3 text-base font-medium rounded-xl transition-colors ${isActive("/privacy") ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50"}`}>Privacidad</div>
                  </Link>
                </nav>
                <div className="pt-6 border-t space-y-2">
                  <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-3">Accesos</h3>
                  <SheetClose asChild>
                    <Link href="/auth/login">
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">Iniciar sesión</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/platform/login">
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                          <ServerCog className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="font-medium">Administración</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/mobile-app/login">
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="font-medium">App Móvil</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/register-interest">
                      <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl h-11 font-semibold">Registrar interés</Button>
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:flex gap-3 items-center">
          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="ghost" 
              className={`text-white hover:bg-white/10 hover:text-white ${isAccesosOpen ? "bg-white/15" : ""}`}
              onClick={() => setIsAccesosOpen(!isAccesosOpen)}
              data-testid="button-accesos"
            >
              Accesos <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
            </Button>
            {isAccesosOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl bg-white shadow-xl py-2 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                <Link href="/auth/login">
                  <div 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setIsAccesosOpen(false)}
                    data-testid="link-iniciar-sesion"
                  >
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Iniciar sesión</span>
                  </div>
                </Link>
                <Link href="/platform/login">
                  <div 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setIsAccesosOpen(false)}
                    data-testid="link-administracion"
                  >
                    <ServerCog className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Administración</span>
                  </div>
                </Link>
                <Link href="/mobile-app/login">
                  <div 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setIsAccesosOpen(false)}
                    data-testid="link-app-movil"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">App Móvil</span>
                  </div>
                </Link>
              </div>
            )}
          </div>
          <Link href="/register-interest">
            <Button 
              className="bg-white text-blue-600 hover:bg-white/90 font-semibold rounded-xl shadow-sm"
              data-testid="button-registrar-interes"
            >
              Registrar interés
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
