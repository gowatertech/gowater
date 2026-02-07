import { useLocation } from 'wouter';
import { UserCog, MapPin, Phone, Calendar, Mail, FileText, Clock, LogOut, Shield, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  if (!isLoading && !user) {
    setLocation('/mobile-app/login');
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="font-medium text-gray-600">Cargando perfil...</h3>
        </div>
      </div>
    );
  }

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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No disponible';
    try {
      return formatDateRD(dateString, { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'driver': return 'Conductor';
      case 'assistant': return 'Asistente';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  const handleLogout = async () => {
    try {
      await Promise.resolve(logout());
      toast({ 
        title: "Sesión cerrada", 
        description: "Has cerrado sesión correctamente" 
      });
      
      window.history.replaceState(null, "", "/mobile-app/login");
      setLocation('/mobile-app/login', { replace: true });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "No se pudo cerrar la sesión", 
        variant: "destructive" 
      });
    }
  };

  const infoItems = [
    { icon: UserCog, label: 'Nombre de usuario', value: user.username || 'N/A', color: 'text-blue-600', bg: 'bg-blue-100' },
    ...(user.phone ? [{ icon: Phone, label: 'Teléfono', value: user.phone, color: 'text-emerald-600', bg: 'bg-emerald-100' }] : []),
    ...(user.email ? [{ icon: Mail, label: 'Correo electrónico', value: user.email, color: 'text-purple-600', bg: 'bg-purple-100' }] : []),
    ...(user.license ? [{ icon: FileText, label: 'Licencia', value: user.license, color: 'text-amber-600', bg: 'bg-amber-100' }] : []),
    ...(user.licenseExpiry ? [{ icon: Calendar, label: 'Vencimiento licencia', value: formatDate(user.licenseExpiry), color: 'text-red-600', bg: 'bg-red-100' }] : []),
    ...(user.emergencyContact ? [{ icon: Phone, label: 'Contacto emergencia', value: user.emergencyContact, color: 'text-rose-600', bg: 'bg-rose-100' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <MobileHeader 
        title="Mi Perfil"
        showBackButton
        onBackButtonClick={() => setLocation('/mobile-app')}
        user={user as any} 
        companyName={companyName}
      />

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-center mb-5 shadow-lg shadow-blue-500/20">
          <Avatar className="h-20 w-20 border-4 border-white/30 shadow-xl mx-auto mb-3">
            <AvatarFallback className="text-xl bg-white/20 text-white font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mt-2">
            <Shield className="h-3 w-3 text-blue-200" />
            <span className="text-xs text-blue-100 font-medium">{getRoleLabel(user.role)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-blue-600" />
              Información personal
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {infoItems.map((item, idx) => (
              <div key={idx} className="px-4 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Empresa
            </h2>
          </div>
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{companyName || 'GoWater'}</p>
              <p className="text-xs text-gray-500">ID: {user.companyId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Cuenta
            </h2>
          </div>
          <div className="px-4 py-3.5 space-y-2">
            {user.createdAt && (
              <p className="text-xs text-gray-500">
                Registrado: <span className="font-medium text-gray-700">{formatDate(user.createdAt)}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-xs font-medium text-gray-700">
                {user.active ? "Cuenta activa" : "Cuenta inactiva"}
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full h-12 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold border border-red-200" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </main>
      
      <MobileFooter />
    </div>
  );
}
