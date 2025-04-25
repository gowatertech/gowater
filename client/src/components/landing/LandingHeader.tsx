import React from "react";
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

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-50">
            <Droplet className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            GoWater
          </span>
        </div>

        {/* Main navigation menu */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" className={`font-medium ${isActive("/") ? "bg-primary/10" : ""}`}>Inicio</Button>
          </Link>
          <Link href="/planes">
            <Button variant="ghost" className={`font-medium ${isActive("/planes") ? "bg-primary/10" : ""}`}>Planes</Button>
          </Link>
          <Link href="/soporte">
            <Button variant="ghost" className={`font-medium ${isActive("/soporte") ? "bg-primary/10" : ""}`}>Soporte</Button>
          </Link>
          <a href="#app-mobile" onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById('app-mobile');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}>
            <Button variant="ghost" className="font-medium">App Móvil</Button>
          </a>
          <Link href="/contact">
            <Button 
              variant="ghost" 
              className={`font-medium ${isActive("/contact") && !location.includes("demo") ? "bg-primary/10" : ""}`}
            >
              Contáctanos
            </Button>
          </Link>
        </div>

        {/* Mobile menu (hamburger) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-8">
                  <div className="p-1.5 rounded-md bg-blue-50">
                    <Droplet className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    GoWater
                  </span>
                </div>
                <nav className="space-y-4">
                  <Link href="/">
                    <div className={`block p-2 text-base font-medium rounded-md ${isActive("/") && location === "/" ? "bg-primary/10" : "hover:bg-muted"}`}>Inicio</div>
                  </Link>
                  <Link href="/planes">
                    <div className={`block p-2 text-base font-medium rounded-md ${isActive("/planes") ? "bg-primary/10" : "hover:bg-muted"}`}>Planes</div>
                  </Link>
                  <Link href="/soporte">
                    <div className={`block p-2 text-base font-medium rounded-md ${isActive("/soporte") ? "bg-primary/10" : "hover:bg-muted"}`}>Soporte</div>
                  </Link>
                  <SheetClose asChild>
                    <a href="#app-mobile" onClick={(e) => {
                        e.preventDefault();
                        setTimeout(() => {
                          const element = document.getElementById('app-mobile');
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}>
                      <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">App Móvil</div>
                    </a>
                  </SheetClose>
                  <Link href="/contact">
                    <div className={`block p-2 text-base font-medium rounded-md ${isActive("/contact") && !location.includes("demo") ? "bg-primary/10" : "hover:bg-muted"}`}>Contáctanos</div>
                  </Link>
                </nav>
                <div className="pt-6 border-t space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">ACCESOS</h3>
                  <SheetClose asChild>
                    <Link href="/dashboard">
                      <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Iniciar sesión</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/platform/login">
                      <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                        <ServerCog className="h-4 w-4 text-amber-600" />
                        <span className="font-medium">Administración</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/mobile-app/login">
                      <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                        <Smartphone className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium">App Móvil</span>
                      </div>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/register-interest">
                      <Button className="w-full mt-2">Registrar interés</Button>
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Action buttons */}
        <div className="hidden md:flex gap-4 items-center">
          <div className="relative group">
            <Button variant="ghost" className="group-hover:bg-accent">
              Accesos <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
            </Button>
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-md opacity-0 -translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-200 py-1">
              <Link href="/dashboard">
                <div className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Iniciar sesión</span>
                </div>
              </Link>
              <Link href="/platform/login">
                <div className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                  <ServerCog className="h-4 w-4 text-amber-600" />
                  <span>Administración</span>
                </div>
              </Link>
              <Link href="/mobile-app/login">
                <div className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>App Móvil</span>
                </div>
              </Link>
            </div>
          </div>
          <Link href="/register-interest">
            <Button>Registrar interés</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}