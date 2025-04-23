import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Droplet, Menu } from "lucide-react";

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
                  <SheetClose asChild>
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full">Iniciar sesión</Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/platform/login">
                      <Button variant="outline" className="w-full">Login ADM</Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/mobile-app/login">
                      <Button variant="outline" className="w-full">Login APP</Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/register-interest">
                      <Button className="w-full">Registrar interés</Button>
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Action buttons */}
        <div className="hidden md:flex gap-4 items-center">
          <Link href="/dashboard">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link href="/platform/login">
            <Button variant="ghost">Login ADM</Button>
          </Link>
          <Link href="/mobile-app/login">
            <Button variant="ghost">Login APP</Button>
          </Link>
          <Link href="/register-interest">
            <Button>Registrar interés</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}