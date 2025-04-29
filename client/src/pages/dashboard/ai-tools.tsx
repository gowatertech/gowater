import React, { useState } from 'react';
import { PageWrapper } from '@/components/page-wrapper';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, BrainCircuit, BarChart, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import AIAssistant from '@/components/ai/AIAssistant';
import OrderAnalysisForm from '@/components/ai/OrderAnalysisForm';
import OrderAnalysisResults from '@/components/ai/OrderAnalysisResults';
import { useTitle } from '@/hooks/useTitle';

const AIToolsPage: React.FC = () => {
  useTitle('Herramientas IA');
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Función para manejar el resultado del análisis
  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
  };

  // Función para reiniciar el análisis
  const resetAnalysis = () => {
    setAnalysisData(null);
  };

  return (
    <PageWrapper>
      <div className="flex items-center mb-6">
        <BrainCircuit className="h-8 w-8 mr-2 text-primary" />
        <h1 className="text-3xl font-bold">Herramientas de Inteligencia Artificial</h1>
      </div>

      <p className="text-muted-foreground mb-8">
        Utiliza el poder de la inteligencia artificial para optimizar la gestión del agua y la logística
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="assistant" className="space-y-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="assistant" className="flex items-center gap-2">
                <Bot size={16} />
                Asistente IA
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <BarChart size={16} />
                Análisis de Pedidos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="assistant" className="min-h-[600px]">
              <AIAssistant />
            </TabsContent>
            
            <TabsContent value="analysis" className="min-h-[600px]">
              {analysisData ? (
                <OrderAnalysisResults data={analysisData} onReset={resetAnalysis} />
              ) : (
                <div className="grid place-items-center h-full">
                  <div className="w-full max-w-md">
                    <OrderAnalysisForm onAnalysisComplete={handleAnalysisComplete} />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Más Herramientas IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start">
                  <Users className="h-5 w-5 mr-2 text-blue-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Recomendaciones para Clientes</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Obtén recomendaciones personalizadas para tus clientes basadas en su historial de compras
                    </p>
                    <Button variant="link" className="text-xs px-0 py-1 h-auto mt-1 flex items-center gap-1" disabled>
                      Próximamente <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start">
                  <BarChart className="h-5 w-5 mr-2 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Predicción de Demanda</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Predice la demanda futura de productos basada en patrones históricos y factores estacionales
                    </p>
                    <Button variant="link" className="text-xs px-0 py-1 h-auto mt-1 flex items-center gap-1" disabled>
                      Próximamente <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Más herramientas de IA se agregarán próximamente a la plataforma.
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acerca de Nuestras IA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Nuestras herramientas de inteligencia artificial están diseñadas específicamente para empresas de distribución de agua, considerando:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0">✓</div>
                  <span>Optimización de rutas y logística</span>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0">✓</div>
                  <span>Patrones de consumo y demanda</span>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0">✓</div>
                  <span>Gestión sostenible del agua</span>
                </li>
                <li className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0">✓</div>
                  <span>Relaciones con clientes y retención</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AIToolsPage;