import React from 'react';
import { useLocation } from 'wouter';
import { User, UserCog, MapPin, Phone, Calendar, Mail, FileText, Clock, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatDateRD } from '@/lib/date-utils';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { MobileHeader } from '../components/MobileHeader';
import { MobileFooter } from '../components/MobileFooter';
import { useCompanySettings } from '@/hooks/use-company-settings';

export default function MobileProfile() {
  const [, setLocation] = useLocation();
  const { user, logout, isLoading } = useCurrentUser();
  const { companyName } = useCompanySettings();
  const { toast } = useToast();

  // Redirigir si no hay usuario
  if (!isLoading && !user) {
    setLocation('/mobile-app/login');
    return null;
  }

  // Si está cargando, mostrar pantalla de carga
  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary/5">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="font-medium text-primary">Cargando perfil...</h3>
        </div>
      </div>
    );
  }

  // Obtener iniciales para el avatar
  const getInitials = () => {
    if (user && user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return 'U';
  };

  // Función para formatear fecha
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No disponible';
    try {
      return formatDateRD(dateString, { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    try {
      // Convertimos la función logout (que podría ser void) a una promesa
      await Promise.resolve(logout());
      toast({ 
        title: "Sesión cerrada", 
        description: "Has cerrado sesión correctamente" 
      });
      
      // Limpiar el historial actual para prevenir navegación hacia atrás después de cerrar sesión
      // Primero reemplazar la entrada actual
      window.history.replaceState(null, "", "/mobile-app/login");
      
      // Redireccionar a la página de login reemplazando la entrada en el historial
      setLocation('/mobile-app/login', { replace: true });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "No se pudo cerrar la sesión", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Cabecera */}
      <MobileHeader 
        user={user as any} 
        darkMode={false} 
        onToggleDarkMode={() => {}} 
        onSyncData={() => {}}
        companyName={companyName}
      />

      {/* Contenido */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <Card className="mb-4 overflow-hidden">
          <div className="bg-primary text-white p-6 flex flex-col items-center">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md mb-2">
              <AvatarFallback className="text-xl bg-primary-foreground text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-primary-200">{user.role === 'driver' ? 'Conductor' : user.role === 'assistant' ? 'Asistente' : user.role}</p>
          </div>
          
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="p-4 flex items-center space-x-3">
                <UserCog className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">ID de Usuario</p>
                  <p className="font-medium">{user.id}</p>
                </div>
              </div>
              
              <div className="p-4 flex items-center space-x-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre de usuario</p>
                  <p className="font-medium">{user.username || 'N/A'}</p>
                </div>
              </div>
              
              {user.phone && (
                <div className="p-4 flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
              
              {user.email && (
                <div className="p-4 flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
              )}
              
              {user.license && (
                <div className="p-4 flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Licencia</p>
                    <p className="font-medium">{user.license}</p>
                  </div>
                </div>
              )}
              
              {user.licenseExpiry && (
                <div className="p-4 flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expira</p>
                    <p className="font-medium">{formatDate(user.licenseExpiry)}</p>
                  </div>
                </div>
              )}
              
              {user.emergencyContact && (
                <div className="p-4 flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contacto de emergencia</p>
                    <p className="font-medium">{user.emergencyContact}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Información de la empresa */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Empresa</h2>
            </div>
            <p className="text-sm">
              Trabajas para <span className="font-semibold">{companyName || 'GoWater'}</span>
            </p>
            <p className="text-sm text-muted-foreground">ID de empresa: {user.companyId || 'N/A'}</p>
          </CardContent>
        </Card>
        
        {/* Información de la cuenta */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Información de cuenta</h2>
            </div>
            {user.createdAt && (
              <p className="text-sm">
                Fecha de registro: <span className="font-medium">{formatDate(user.createdAt)}</span>
              </p>
            )}
            <p className="text-sm">
              Estado: <span className={`font-medium ${user.active ? "text-green-600" : "text-red-600"}`}>
                {user.active ? "Activo" : "Inactivo"}
              </span>
            </p>
          </CardContent>
        </Card>
        
        <Separator className="my-4" />
        
        {/* Botón de cerrar sesión */}
        <Button 
          variant="destructive" 
          className="w-full py-5" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </main>
      
      {/* Footer móvil */}
      <MobileFooter />
    </div>
  );
}