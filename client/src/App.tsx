import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders";
import OrdersList from "@/pages/orders/list";
import NewOrder from "@/pages/orders/new";
import OrderDetails from "@/pages/orders/details";
import OrderStatus from "@/pages/orders/status";
import Routes from "@/pages/routes";
import RouteDetails from "@/pages/routes/RouteDetails";
import Zones from "@/pages/zones";
import Users from "@/pages/users";
import Payments from "@/pages/payments";
import RegisterPayment from "@/pages/payments/register";
import PaymentsList from "@/pages/payments/list";
import PaymentsHistory from "@/pages/payments/history";
import Billing from "@/pages/billing";
import TutorialPage from "@/pages/tutorial";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Entregas from "@/pages/entregas";
import DevolucionEnvases from "@/pages/envases/devolucion";
import BalanceEnvases from "@/pages/envases/balance";
import Faltantes from "@/pages/envases/faltantes";
import AsignarResponsabilidad from "@/pages/envases/asignar-responsabilidad";
import InventoryPage from "@/pages/inventory";
import WarehousesPage from "@/pages/inventory/warehouses";
import ProductionRegistration from "@/pages/inventory/production";
import RecurringOrdersPage from "@/pages/recurring-orders";
import RecurringOrderForm from "@/pages/recurring-orders/[id]";
import DriverView from "@/pages/drivers/DriverView";
import CommissionsPage from "@/pages/commissions";
import SimpleCommissionsPage from "@/pages/commissions/simple";
import CommissionDetailsPage from "@/pages/commissions/details";
import ResponsiveCommissionDetailsPage from "@/pages/commissions/responsive-details";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import VehicleLoadingPage from "@/pages/vehicle-loading";
import RouteSettlementPage from "@/pages/routes/settlements";
import VehicleSettlementPage from "./pages/vehicle-settlement";
import TrucksPage from "./pages/routes/trucks";
import { CenteredLogo } from "@/components/common/CenteredLogo";
import { CompanyFooter } from "@/components/common/CompanyFooter";
import { DesignCredit } from "@/components/common/DesignCredit";
import TestPage from "@/pages/test-page";
import TestPrintPayment from "@/pages/test-print-payment";
import LandingPage from "@/pages/landing";
import PlanesPage from "@/pages/landing/planes";
import SoportePage from "@/pages/landing/soporte";
import ContactPage from "@/pages/landing/contact";
import RegisterInterestPage from "@/pages/landing/register-interest";

// PWA Pages
import MobileApp from "@/pages/mobile-app";
import MobileRoute from "@/pages/mobile-app/ruta";
import MobileDeliveries from "@/pages/mobile-app/entregas";
import MobilePendingRoutes from "@/pages/mobile-app/rutas-pendientes";
import MobileRoutesInProgress from "@/pages/mobile-app/rutas-en-progreso";
import MobileBottleReturns from "@/pages/mobile-app/envases";
import MobilePayments from "@/pages/mobile-app/payments";
// Lazy loaded components
const MobileMap = lazy(() => import("@/pages/mobile-app/mapa"));
// El componente MobilePaymentsHistory no está disponible
// import MobilePaymentsHistory from "@/pages/mobile-app/payments/history";

function Router() {
  const [location] = useLocation();
  
  // No envolver en DashboardLayout si estamos en la app móvil PWA
  const isMobileApp = location.startsWith("/mobile-app");
  
  // Registrar el Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registrado con éxito:', registration);
          })
          .catch(error => {
            console.error('Error al registrar el Service Worker:', error);
          });
      });
    }
  }, []);
  
  // Agregar el enlace al manifest.json en el head para PWA
  useEffect(() => {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
    
    // Meta tags para PWA
    const metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = '#2563eb';
    document.head.appendChild(metaThemeColor);
    
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(metaViewport);
    
    // Apple specific tags para PWA en iOS
    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    document.head.appendChild(appleCapable);
    
    const appleStatusBar = document.createElement('meta');
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
    appleStatusBar.content = 'black-translucent';
    document.head.appendChild(appleStatusBar);
    
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/images/icons/apple-touch-icon.svg';
    document.head.appendChild(appleTouchIcon);
    
    // Crear elementos link para diferentes tamaños de íconos Apple usando HTML directo
    const iconSizes = ['180x180', '152x152', '120x120', '76x76'];
    const touchIcons: HTMLElement[] = [];
    
    iconSizes.forEach(size => {
      const linkElement = document.createElement('link');
      linkElement.rel = 'apple-touch-icon';
      // Usar setAttribute en lugar de asignar directamente
      linkElement.setAttribute('sizes', size);
      linkElement.href = '/images/icons/apple-touch-icon.svg';
      document.head.appendChild(linkElement);
      touchIcons.push(linkElement);
    });
    
    // Apple Splash Screen
    const appleSplashScreen = document.createElement('meta');
    appleSplashScreen.name = 'apple-mobile-web-app-title';
    appleSplashScreen.content = 'GoWater Driver';
    document.head.appendChild(appleSplashScreen);
    
    return () => {
      document.head.removeChild(manifestLink);
      document.head.removeChild(metaThemeColor);
      document.head.removeChild(metaViewport);
      document.head.removeChild(appleCapable);
      document.head.removeChild(appleStatusBar);
      document.head.removeChild(appleTouchIcon);
      // Eliminar los íconos de touch
      touchIcons.forEach(icon => document.head.removeChild(icon));
      document.head.removeChild(appleSplashScreen);
    };
  }, []);

  // Importación de componentes de la plataforma
  const PlatformLogin = lazy(() => import("@/pages/platform/PlatformLogin"));
  const PlatformDashboard = lazy(() => import("@/pages/platform/PlatformDashboard"));
  
  // Companies (Empresas)
  const PlatformCompanies = lazy(() => import("@/pages/platform/companies"));
  const PlatformCompanyForm = lazy(() => import("@/pages/platform/companies/[id]"));
  
  // Plans (Planes)
  const PlatformPlans = lazy(() => import("@/pages/platform/plans"));
  const PlatformPlanForm = lazy(() => import("@/pages/platform/plans/[id]"));
  
  // Users (Usuarios)
  const PlatformUsers = lazy(() => import("@/pages/platform/users"));
  const PlatformUserForm = lazy(() => import("@/pages/platform/users/[id]"));
  
  // Invoices (Facturas)
  const PlatformInvoices = lazy(() => import("@/pages/platform/invoices"));
  const PlatformInvoiceForm = lazy(() => import("@/pages/platform/invoices/[id]"));
  
  // Settings (Configuración)
  const PlatformSettings = lazy(() => import("@/pages/platform/settings"));
  
  // Empresas Interesadas
  const InterestedCompanies = lazy(() => import("@/pages/platform/interested-companies"));
  const EmpresasInteresadas = lazy(() => import("@/pages/platform/empresas-interesadas"));

  // Si estamos en la app móvil, renderizar directamente sin el DashboardLayout
  if (isMobileApp) {
    return (
      <Switch>
        <Route path="/mobile-app" component={MobileApp} />
        <Route path="/mobile-app/rutas-pendientes" component={MobilePendingRoutes} />
        <Route path="/mobile-app/ruta" component={MobileRoute} />
        <Route path="/mobile-app/entregas" component={MobileDeliveries} />
        <Route path="/mobile-app/envases" component={MobileBottleReturns} />
        <Route path="/mobile-app/pagos" component={MobilePayments} />
        <Route path="/mobile-app/payments" component={MobilePayments} />
        <Route path="/mobile-app/mapa">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <MobileMap />
          </Suspense>
        </Route>
      </Switch>
    );
  }
  
  // Si estamos en la página de landing, planes, soporte, contacto o registro de interés, renderizar sin DashboardLayout
  if ((location === "/" || location === "/planes" || location === "/soporte" || location === "/contact" || location === "/register-interest") && !location.startsWith("/dashboard")) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/planes" component={PlanesPage} />
        <Route path="/soporte" component={SoportePage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/register-interest" component={RegisterInterestPage} />
      </Switch>
    );
  }
  
  // Si estamos en la sección de plataforma, renderizar sin DashboardLayout
  if (location.startsWith("/platform")) {
    return (
      <Switch>
        <Route path="/platform/login">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformLogin />
          </Suspense>
        </Route>
        <Route path="/platform/dashboard">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformDashboard />
          </Suspense>
        </Route>
        
        {/* Rutas de Empresas */}
        <Route path="/platform/companies/new">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformCompanyForm />
          </Suspense>
        </Route>
        <Route path="/platform/companies/:id">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformCompanyForm />
          </Suspense>
        </Route>
        <Route path="/platform/companies">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformCompanies />
          </Suspense>
        </Route>
        
        {/* Rutas de Planes */}
        <Route path="/platform/plans/new">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformPlanForm />
          </Suspense>
        </Route>
        <Route path="/platform/plans/:id">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformPlanForm />
          </Suspense>
        </Route>
        <Route path="/platform/plans">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformPlans />
          </Suspense>
        </Route>
        
        {/* Rutas de Usuarios */}
        <Route path="/platform/users/new">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformUserForm />
          </Suspense>
        </Route>
        <Route path="/platform/users/:id">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformUserForm />
          </Suspense>
        </Route>
        <Route path="/platform/users">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformUsers />
          </Suspense>
        </Route>
        
        {/* Rutas de Facturas */}
        <Route path="/platform/invoices/new">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformInvoiceForm />
          </Suspense>
        </Route>
        <Route path="/platform/invoices/:id">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformInvoiceForm />
          </Suspense>
        </Route>
        <Route path="/platform/invoices">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformInvoices />
          </Suspense>
        </Route>
        
        {/* Rutas de Empresas Interesadas */}
        <Route path="/platform/interested-companies">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <InterestedCompanies />
          </Suspense>
        </Route>
        
        <Route path="/platform/empresas-interesadas">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <EmpresasInteresadas />
          </Suspense>
        </Route>

        {/* Ruta de Configuración */}
        <Route path="/platform/settings">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformSettings />
          </Suspense>
        </Route>
        
        {/* Ruta por defecto de la plataforma */}
        <Route path="/platform">
          <Suspense fallback={<div className="loading">Cargando...</div>}>
            <PlatformLogin />
          </Suspense>
        </Route>
      </Switch>
    );
  }

  // Para la aplicación web normal, usar el DashboardLayout
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/billing" component={Billing} />
        <Route path="/payments" component={Payments} />
        <Route path="/payments/register" component={RegisterPayment} />
        <Route path="/payments/list" component={PaymentsList} />
        <Route path="/payments/history" component={PaymentsHistory} />
        <Route path="/customers" component={Customers} />

        {/* Inventory Routes - Specific routes first */}
        <Route path="/inventory/warehouses" component={WarehousesPage} />
        <Route path="/inventory/production" component={ProductionRegistration} />
        <Route path="/inventory/products" component={InventoryPage} />
        <Route path="/inventory" component={InventoryPage} />

        <Route path="/orders" component={Orders} />
        <Route path="/orders/list" component={OrdersList} />
        <Route path="/orders/new" component={NewOrder} />
        <Route path="/orders/details/:id" component={OrderDetails} />
        <Route path="/orders/status/:id" component={OrderStatus} />
        <Route path="/routes/settlements" component={RouteSettlementPage} />
        <Route path="/vehicle-settlement" component={VehicleSettlementPage} />
        <Route path="/routes/trucks" component={TrucksPage} />
        <Route path="/vehicle-loading" component={VehicleLoadingPage} />
        <Route path="/routes/:id" component={RouteDetails} />
        <Route path="/routes" component={Routes} />
        <Route path="/zones" component={Zones} />
        <Route path="/users" component={Users} />
        <Route path="/entregas" component={Entregas} />
        <Route path="/drivers" component={DriverView} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/reports" component={Reports} />
        <Route path="/reports/:type" component={Reports} />

        {/* Rutas para bottles (envases) */}
        <Route path="/bottles/return" component={DevolucionEnvases} />
        <Route path="/bottles/balance" component={BalanceEnvases} />
        <Route path="/bottles/missing" component={Faltantes} />
        <Route path="/bottles/assign-responsibility" component={AsignarResponsabilidad} />

        {/* Rutas para pedidos recurrentes */}
        <Route path="/recurring-orders/new" component={RecurringOrderForm} />
        <Route path="/recurring-orders/:id" component={RecurringOrderForm} />
        <Route path="/recurring-orders" component={RecurringOrdersPage} />
        
        {/* Rutas para comisiones */}
        <Route path="/commissions/details/:id" component={ResponsiveCommissionDetailsPage} />
        <Route path="/commissions/details-old/:id" component={CommissionDetailsPage} />
        <Route path="/commissions/test" component={lazy(() => import('./pages/commissions/test-commissions'))} />
        <Route path="/commissions/simple" component={lazy(() => import('./pages/commissions/simple-generator'))} />
        <Route path="/commissions/simple-old" component={SimpleCommissionsPage} />
        <Route path="/commissions" component={CommissionsPage} />
        
        {/* Páginas de prueba de impresión */}
        <Route path="/test-print" component={TestPage} />
        <Route path="/test-print-payment" component={TestPrintPayment} />
        <Route path="/test-billing" component={lazy(() => import('./pages/test-billing'))} />

        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  // Obtener la ubicación actual para determinar si mostrar el logo
  const [location] = useLocation();
  
  // No mostrar el logo en páginas de la plataforma, app móvil, landing page o páginas públicas
  const isPlatformRoute = location.startsWith("/platform");
  const isMobileApp = location.startsWith("/mobile-app");
  const isPublicPage = location === "/" || location === "/planes" || location === "/soporte" || location === "/contact" || location === "/register-interest";
  const shouldShowLogo = !isPlatformRoute && !isMobileApp && !isPublicPage;
  
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
        {shouldShowLogo && <CenteredLogo size="medium" showName={true} companyName="GoWater" />}
        {/* Componentes personalizados desactivados para el panel de administración */}
      </QueryClientProvider>
    </I18nextProvider>
  );
}