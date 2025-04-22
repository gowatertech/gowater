import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplet, Menu, CheckCircle2, ChevronRight, Users, Truck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Definir el tipo de Plan
interface Plan {
  id: number;
  name: string;
  price: string;
  description: string;
  maxUsers: number;
  maxTrucks: number;
  features: string[];
  isActive: boolean;
}

// Componente de header con navegación (reutilizado de la landing page)
function Header() {
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

        {/* Menú de navegación principal */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" className="font-medium">Inicio</Button>
          </Link>
          <Link href="/planes">
            <Button variant="ghost" className="font-medium bg-primary/10">Planes</Button>
          </Link>
          <Link href="/soporte">
            <Button variant="ghost" className="font-medium">Soporte</Button>
          </Link>
          <Link href="/demo">
            <Button variant="ghost" className="font-medium">Demo</Button>
          </Link>
          <Link href="/contacto">
            <Button variant="ghost" className="font-medium">Contáctanos</Button>
          </Link>
        </div>

        {/* Menú móvil (hamburguesa) */}
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
                    <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Inicio</div>
                  </Link>
                  <Link href="/planes">
                    <div className="block p-2 text-base font-medium bg-primary/10 rounded-md">Planes</div>
                  </Link>
                  <Link href="/soporte">
                    <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Soporte</div>
                  </Link>
                  <Link href="/demo">
                    <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Demo</div>
                  </Link>
                  <Link href="/contacto">
                    <div className="block p-2 text-base font-medium hover:bg-muted rounded-md">Contáctanos</div>
                  </Link>
                </nav>
                <div className="pt-6 border-t space-y-4">
                  <Link href="/platform/login">
                    <Button variant="outline" className="w-full">Iniciar sesión</Button>
                  </Link>
                  <Link href="/platform/register">
                    <Button className="w-full">Registrarse</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Botones de acción */}
        <div className="hidden md:flex gap-4 items-center">
          <Link href="/platform/login">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link href="/platform/register">
            <Button>Registrarse</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

// Componente de tarjeta de plan
function PlanCard({ plan, recommended = false }: { plan: Plan, recommended?: boolean }) {
  // Determinar colores basados en el nivel del plan
  let colorClass = "bg-blue-50 border-blue-100";
  let hoverClass = "hover:border-blue-300";
  let buttonVariant: "default" | "outline" = "outline";
  let textColorClass = "text-blue-600";
  let btnText = "Seleccionar plan";
  
  if (plan.name.toLowerCase().includes("profesional")) {
    colorClass = "bg-green-50 border-green-100";
    hoverClass = "hover:border-green-300";
    textColorClass = "text-green-600";
    buttonVariant = "default";
    btnText = "Plan recomendado";
  } else if (plan.name.toLowerCase().includes("empresarial")) {
    colorClass = "bg-purple-50 border-purple-100";
    hoverClass = "hover:border-purple-300";
    textColorClass = "text-purple-600";
  } else if (plan.name.toLowerCase().includes("basico") && plan.price === "1.00") {
    colorClass = "bg-amber-50 border-amber-100";
    hoverClass = "hover:border-amber-300";
    textColorClass = "text-amber-600";
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300 relative h-full flex flex-col",
      colorClass,
      hoverClass,
      recommended && "shadow-lg border-green-300"
    )}>
      {recommended && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 hover:bg-green-700">
          Recomendado
        </Badge>
      )}
      <CardHeader>
        <CardTitle className={cn("text-xl font-bold", textColorClass)}>{plan.name}</CardTitle>
        <CardDescription className="mt-2 min-h-[50px]">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground mb-1">/mes</span>
        </div>

        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
            <span className="text-sm">Hasta <strong>{plan.maxUsers}</strong> usuarios</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground/70 flex-shrink-0" />
            <span className="text-sm">Hasta <strong>{plan.maxTrucks}</strong> vehículos</span>
          </div>
        </div>

        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-2">Características incluidas:</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4">
        <Link href={`/platform/register?plan=${plan.id}`} className="w-full">
          <Button 
            variant={buttonVariant} 
            className={cn(
              "w-full",
              buttonVariant === "outline" && textColorClass
            )}
          >
            {btnText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Componente de esqueleto para carga
function PlanCardSkeleton() {
  return (
    <Card className="border-2 border-muted h-full flex flex-col">
      <CardHeader>
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <Skeleton className="h-8 w-20" />
        
        <div className="pt-4 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>

        <div className="pt-3 border-t">
          <Skeleton className="h-5 w-40 mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

// Componente de footer (reutilizado de la landing page)
function Footer() {
  return (
    <footer className="py-12 md:py-16 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-md bg-blue-50">
                <Droplet className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                GoWater
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Soluciones de gestión de rutas y productos para empresas de distribución de agua.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Producto</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/features" className="text-muted-foreground hover:text-foreground">Características</Link></li>
              <li><Link href="/planes" className="text-muted-foreground hover:text-foreground">Planes y precios</Link></li>
              <li><Link href="/demo" className="text-muted-foreground hover:text-foreground">Solicitar demo</Link></li>
              <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Seguridad</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Soporte</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="text-muted-foreground hover:text-foreground">Centro de ayuda</Link></li>
              <li><Link href="/documentation" className="text-muted-foreground hover:text-foreground">Documentación</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contacto</Link></li>
              <li><Link href="/status" className="text-muted-foreground hover:text-foreground">Estado del sistema</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">Acerca de nosotros</Link></li>
              <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
              <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Trabaja con nosotros</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GoWater. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

// Componente principal de la página de planes
export default function PlanesPage() {
  // Obtener los datos de los planes desde la API
  const { data: plansData, isLoading, error } = useQuery<{ data: Plan[] }>({ 
    queryKey: ['/api/platform/plans'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  
  // Datos seguros para acceder
  const plans = plansData || { data: [] };

  // Determinar el plan recomendado (Plan Profesional)
  const getRecommendedPlanId = (plansList: Plan[] | undefined) => {
    if (!plansList || plansList.length === 0) return null;
    
    // Busca el plan profesional
    const professionalPlan = plansList.find(plan => 
      plan.name.toLowerCase().includes("profesional")
    );
    
    return professionalPlan?.id || null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-6xl/none">
              Seleccione el <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-primary">plan perfecto</span> para su empresa
            </h1>
            <p className="mt-4 text-muted-foreground max-w-3xl mx-auto md:text-xl">
              Ofrecemos diferentes planes para adaptarnos a sus necesidades, desde pequeñas empresas hasta grandes corporaciones.
            </p>
          </div>
        </section>

        {/* Planes */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            {error ? (
              <div className="text-center py-12 border rounded-lg bg-red-50">
                <p className="text-red-600">Ha ocurrido un error al cargar los planes. Por favor, intente de nuevo más tarde.</p>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2">
                {isLoading ? (
                  // Mostrar esqueletos durante la carga
                  Array(3).fill(0).map((_, index) => (
                    <PlanCardSkeleton key={index} />
                  ))
                ) : (
                  // Mostrar tarjetas de planes
                  plans?.data?.filter((plan: Plan) => plan.isActive).map((plan: Plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan}
                      recommended={plan.id === getRecommendedPlanId(plans?.data)}
                    />
                  ))
                )}
              </div>
            )}

            <div className="mt-16 text-center">
              <h2 className="text-2xl font-bold mb-4">¿Necesita una solución personalizada?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                Si necesita características específicas o tiene requisitos especiales, podemos ofrecerle un plan personalizado adaptado a sus necesidades.
              </p>
              <Link href="/contacto">
                <Button size="lg" variant="outline" className="px-8">
                  Contáctenos para un plan personalizado
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 md:py-24 bg-muted/20">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12">Preguntas frecuentes</h2>
            
            <div className="grid gap-8 lg:grid-cols-2">
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-xl">¿Puedo cambiar de plan más adelante?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Sí, puede actualizar o cambiar su plan en cualquier momento. Los cambios se aplicarán al inicio del siguiente período de facturación.</p>
                </CardContent>
              </Card>
              
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-xl">¿Ofrecen período de prueba?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Sí, ofrecemos un período de prueba gratuito de 14 días para que pueda evaluar nuestro servicio antes de comprometerse.</p>
                </CardContent>
              </Card>
              
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-xl">¿Cómo funciona la facturación?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>La facturación es mensual y se realiza al inicio de cada período. Aceptamos tarjetas de crédito y transferencias bancarias.</p>
                </CardContent>
              </Card>
              
              <Card className="bg-background">
                <CardHeader>
                  <CardTitle className="text-xl">¿Necesito instalar algún software?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>No, nuestra plataforma funciona completamente en la nube. Solo necesita un navegador web actualizado para acceder a todas las funcionalidades.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
              Comience hoy mismo
            </h2>
            <p className="mt-4 mb-8 text-primary-foreground/80 md:text-xl max-w-[700px] mx-auto">
              Optimice sus operaciones de distribución de agua con nuestra plataforma especializada
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/platform/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Registrarse ahora
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Solicitar demostración
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}