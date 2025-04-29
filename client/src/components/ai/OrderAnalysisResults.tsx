import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderAnalysisResultsProps {
  data: {
    analysis: {
      keyInsights: string[];
      opportunityAreas: string[];
      recommendations: string[];
    };
    metadata: {
      period: {
        startDate: string;
        endDate: string;
      };
      ordersCount: number;
      zoneId: number | null;
    };
  };
  onReset: () => void;
}

const OrderAnalysisResults: React.FC<OrderAnalysisResultsProps> = ({ data, onReset }) => {
  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Resultados del Análisis</h2>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Nuevo Análisis
        </Button>
      </div>

      <div className="bg-muted/40 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Análisis de {data.metadata.ordersCount} pedidos desde el {formatDate(data.metadata.period.startDate)} 
          hasta el {formatDate(data.metadata.period.endDate)}
          {data.metadata.zoneId ? ' en la zona seleccionada.' : ' en todas las zonas.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="text-yellow-500" size={20} />
              Insights Clave
            </CardTitle>
            <CardDescription>
              Hallazgos importantes detectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-5">
              {data.analysis.keyInsights.map((insight, index) => (
                <li key={index} className="text-sm">{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="text-blue-500" size={20} />
              Áreas de Oportunidad
            </CardTitle>
            <CardDescription>
              Dónde enfocar para mejorar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-5">
              {data.analysis.opportunityAreas.map((area, index) => (
                <li key={index} className="text-sm">{area}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="text-green-500" size={20} />
              Recomendaciones
            </CardTitle>
            <CardDescription>
              Acciones sugeridas a implementar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 list-disc pl-5">
              {data.analysis.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm">{recommendation}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Nota:</strong> Este análisis es generado por inteligencia artificial y debe usarse como una guía. Siempre valide estos insights con su conocimiento del negocio y contexto local.
        </p>
      </div>
    </div>
  );
};

export default OrderAnalysisResults;