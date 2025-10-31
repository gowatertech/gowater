import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  MapPin, 
  FileText, 
  Mail, 
  Building2, 
  Shield,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { CustomerWithDetails } from "@shared/schema";

interface CustomerStatsProps {
  customers: CustomerWithDetails[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calcular estadísticas
  const total = customers.length;
  const withCoordinates = customers.filter(c => c.coordinates && c.coordinates.trim() !== "").length;
  const withoutCoordinates = total - withCoordinates;
  const withRNC = customers.filter(c => c.rnc && c.rnc.trim() !== "").length;
  const withEmail = customers.filter(c => c.email && c.email.trim() !== "").length;
  const withLogo = customers.filter(c => c.logo).length;
  const charityClients = customers.filter(c => c.isCharity).length;

  // Calcular porcentaje de completitud (basado en campos importantes)
  const completenessScore = total > 0 
    ? Math.round(((withCoordinates + withRNC + withEmail + withLogo) / (total * 4)) * 100)
    : 0;

  const coordinatesPercentage = total > 0 ? Math.round((withCoordinates / total) * 100) : 0;

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="pb-3 bg-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2 font-bold">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Estadísticas de Clientes
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 sm:hidden"
            data-testid="button-toggle-stats"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Total de clientes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Clientes</span>
              <Badge variant="secondary" className="font-bold" data-testid="stat-total-customers">
                {total}
              </Badge>
            </div>
          </div>

          {/* Ubicación GPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Con Ubicación</span>
              </div>
              <span className="text-sm font-bold text-green-600" data-testid="stat-with-coordinates">
                {withCoordinates}/{total}
              </span>
            </div>
            <Progress value={coordinatesPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {coordinatesPercentage}%
            </p>
          </div>

          {/* Sin ubicación */}
          <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Sin Ubicación</span>
            </div>
            <Badge variant="destructive" className="font-bold" data-testid="stat-without-coordinates">
              {withoutCoordinates}
            </Badge>
          </div>

          {/* Separador */}
          <div className="border-t pt-3 space-y-3">
            {/* Con RNC */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Con RNC</span>
              </div>
              <span className="text-sm font-semibold">{withRNC}</span>
            </div>

            {/* Con Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Con Email</span>
              </div>
              <span className="text-sm font-semibold">{withEmail}</span>
            </div>

            {/* Con Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Con Logo</span>
              </div>
              <span className="text-sm font-semibold">{withLogo}</span>
            </div>

            {/* Benéficos */}
            {charityClients > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-pink-500" />
                  <span className="text-sm">Benéficos</span>
                </div>
                <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400">
                  {charityClients}
                </Badge>
              </div>
            )}
          </div>

          {/* Completitud general */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completitud</span>
              <span className="text-sm font-bold text-primary" data-testid="stat-completeness">
                {completenessScore}%
              </span>
            </div>
            <Progress value={completenessScore} className="h-2" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
