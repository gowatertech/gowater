import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CenteredLogo } from "@/components/common/CenteredLogo";
import { Badge } from "@/components/ui/badge";
import { 
  Route, 
  Truck, 
  BarChart2, 
  Users, 
  Phone, 
  Package, 
  Droplet, 
  LogIn, 
  Info, 
  MessageSquare, 
  PlayCircle,
  ExternalLink,
  ArrowRight
} from "lucide-react";

// Import assets
import bottleImage from "@assets/IMG_0433.jpeg";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  
  // Function to handle login navigation
  const navigateToLogin = () => {
    // For now, navigate to the dashboard. Can be changed to a login page later.
    setLocation("/");
  };
  
  // Function to handle demo navigation
  const navigateToDemo = () => {
    // Navigate to the demo page, you can change this to your actual demo route
    setLocation("/tutorial");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* NavBar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <CenteredLogo size="small" showName={true} companyName="GoWater" />
          </div>
          
          <Tabs defaultValue="home" className="hidden md:block">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="home" onClick={() => window.scrollTo(0, 0)}>
                Inicio
              </TabsTrigger>
              <TabsTrigger value="plans" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                Planes
              </TabsTrigger>
              <TabsTrigger value="features" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Funcionalidades
              </TabsTrigger>
              <TabsTrigger value="demo" onClick={navigateToDemo}>
                Demo
              </TabsTrigger>
              <TabsTrigger value="contact" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                Contacto
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={navigateToDemo} className="hidden md:flex items-center gap-1">
              <PlayCircle className="h-4 w-4" />
              Demo
            </Button>
            <Button onClick={navigateToLogin}>
              <LogIn className="mr-2 h-4 w-4" />
              Acceder
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden container pb-2">
          <Tabs defaultValue="home" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="home" onClick={() => window.scrollTo(0, 0)}>
                Inicio
              </TabsTrigger>
              <TabsTrigger value="plans" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
                Planes
              </TabsTrigger>
              <TabsTrigger value="features" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Funciones
              </TabsTrigger>
              <TabsTrigger value="demo" onClick={navigateToDemo}>
                Demo
              </TabsTrigger>
              <TabsTrigger value="contact" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                Contacto
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-12 md:py-24 lg:py-32 space-y-8">
          <div className="mx-auto flex flex-col items-center space-y-4 text-center">
            <Badge className="py-1 text-sm" variant="secondary">
              Gestión integral de rutas y productos
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
              El sistema definitivo para su distribución de <span className="text-primary">agua</span>
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Una plataforma completa para la gestión de rutas, clientes y productos, diseñada específicamente para empresas de distribución de agua y otros productos.
            </p>
          </div>
          
          <div className="mx-auto grid items-center gap-6 md:grid-cols-2 lg:gap-12">
            <img
              src={bottleImage}
              alt="Imagen de botellones de agua"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
              width={550}
              height={310}
            />
            <div className="space-y-4">
              <ul className="grid gap-4">
                <li>
                  <div className="flex items-start gap-2">
                    <Route className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Optimización de rutas</h3>
                      <p className="text-sm text-muted-foreground">
                        Planifique rutas eficientes para sus vehículos de entrega y reduzca costos operativos.
                      </p>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="flex items-start gap-2">
                    <Droplet className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Control de envases</h3>
                      <p className="text-sm text-muted-foreground">
                        Gestione el ciclo completo de sus envases retornables con seguimiento en tiempo real.
                      </p>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="flex items-start gap-2">
                    <Users className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Gestión multi-empresas</h3>
                      <p className="text-sm text-muted-foreground">
                        Plataforma multi-tenant que permite administrar múltiples empresas desde una única interfaz.
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button onClick={navigateToLogin} size="lg">
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={navigateToDemo} variant="outline" size="lg">
                  Ver demostración
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Plans Section */}
        <section id="plans" className="bg-muted/50 py-12 md:py-24 lg:py-32">
          <div className="container space-y-12 px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Badge variant="outline" className="px-3 py-1">
                  Planes Flexibles
                </Badge>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Escoja el plan que mejor se adapte a sus necesidades
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Ofrecemos diferentes planes según el tamaño de su empresa y sus necesidades específicas.
                </p>
              </div>
            </div>
            
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 lg:gap-12">
              {/* Basic Plan */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-col space-y-1.5">
                  <CardTitle>Básico</CardTitle>
                  <CardDescription>
                    Ideal para pequeñas empresas que inician operaciones
                  </CardDescription>
                  <div className="text-3xl font-bold">$49/mes</div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Hasta 50 clientes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>2 usuarios</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Gestión de rutas básica</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Control de inventario</span>
                    </li>
                  </ul>
                  <Button className="mt-auto" variant="outline">Más información</Button>
                </CardContent>
              </Card>
              
              {/* Professional Plan */}
              <Card className="flex flex-col border-primary">
                <CardHeader className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <CardTitle>Profesional</CardTitle>
                    <Badge>Popular</Badge>
                  </div>
                  <CardDescription>
                    Para empresas en crecimiento con mayor volumen de operaciones
                  </CardDescription>
                  <div className="text-3xl font-bold">$99/mes</div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Hasta 200 clientes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>5 usuarios</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Optimización de rutas avanzada</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Gestión completa de envases</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Reportes avanzados</span>
                    </li>
                  </ul>
                  <Button className="mt-auto">Comenzar ahora</Button>
                </CardContent>
              </Card>
              
              {/* Enterprise Plan */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-col space-y-1.5">
                  <CardTitle>Empresarial</CardTitle>
                  <CardDescription>
                    Para empresas grandes con necesidades complejas
                  </CardDescription>
                  <div className="text-3xl font-bold">$199/mes</div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Clientes ilimitados</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Usuarios ilimitados</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Gestión multi-empresas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>API personalizada</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 shrink-0 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Soporte prioritario 24/7</span>
                    </li>
                  </ul>
                  <Button className="mt-auto" variant="outline">Contactar ventas</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-12 md:py-24 lg:py-32">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Funcionalidades principales
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Conozca todas las herramientas que nuestra plataforma ofrece para optimizar sus operaciones diarias.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 mt-16 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Route className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Gestión de rutas</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Planifique y optimice sus rutas de entrega diarias. Monitoree en tiempo real el progreso de sus conductores.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Truck className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Carga de vehículos</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Organice la carga de sus vehículos de manera eficiente, asegurando que cada conductor lleve lo necesario.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Package className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Control de inventario</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Gestione su inventario de productos y envases en tiempo real, con alertas automáticas de stock bajo.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Gestión de clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Mantenga una base de datos actualizada de sus clientes, con histórico de pedidos y preferencias.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <BarChart2 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Reportes y análisis</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Obtenga informes detallados sobre ventas, entregas, comisiones y más para tomar decisiones fundamentadas.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Droplet className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Control de envases</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Seguimiento completo del ciclo de vida de sus envases retornables, desde la entrega hasta la devolución.</p>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Contact Section */}
        <section id="contact" className="bg-muted/50 py-12 md:py-24 lg:py-32">
          <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                ¿Tiene alguna pregunta?
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Contáctenos para obtener más información sobre cómo nuestro sistema puede ayudar a su empresa.
              </p>
            </div>
            <div className="flex flex-col gap-4 min-[400px]:flex-row lg:justify-end">
              <Button className="gap-1" size="lg">
                <Phone className="h-4 w-4 mr-1" />
                Llámenos
                <span className="hidden sm:inline"> (+1) 234-567-890</span>
              </Button>
              <Button variant="outline" className="gap-1" size="lg">
                <MessageSquare className="h-4 w-4 mr-1" />
                Enviar mensaje
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between md:py-12">
          <div className="flex flex-col gap-2">
            <CenteredLogo size="small" showName={true} companyName="GoWater" />
            <p className="text-sm text-muted-foreground md:text-base">
              La solución definitiva para distribuidores de agua.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8">
            <a
              href="#"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Términos de servicio
            </a>
            <a
              href="#"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Política de privacidad
            </a>
            <a
              href="#"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Soporte
            </a>
          </div>
        </div>
        <div className="container pb-8 text-center text-sm text-muted-foreground">
          <p>© 2025 GoWater. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}