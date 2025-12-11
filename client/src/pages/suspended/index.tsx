import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function SuspendedPage() {
  const { logout, companyStatus } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4" data-testid="suspended-page">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-suspended-title">
            Cuenta Suspendida
          </CardTitle>
          <CardDescription className="text-base" data-testid="text-company-name">
            {companyStatus?.name || "Su empresa"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200" data-testid="text-suspension-reason">
              {companyStatus?.suspensionReason || "Su cuenta ha sido suspendida por falta de pago o incumplimiento de términos de servicio."}
            </p>
          </div>
          
          {companyStatus?.suspendedAt && (
            <div className="text-center text-sm text-muted-foreground">
              Suspendida desde: {new Date(companyStatus.suspendedAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          )}
          
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm text-center text-muted-foreground">
              Para reactivar su cuenta, por favor contacte a nuestro equipo de soporte:
            </p>
            
            <div className="flex flex-col gap-2">
              <a 
                href="mailto:soporte@gowater.tech" 
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-email-support"
              >
                <Mail className="w-4 h-4" />
                soporte@gowater.tech
              </a>
              <a 
                href="tel:+18095551234" 
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-phone-support"
              >
                <Phone className="w-4 h-4" />
                +1 (809) 555-1234
              </a>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}