import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Maximize2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Link } from 'wouter';

const AIAssistantWidget = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await apiRequest({
        url: '/api/ai/assistant/ask',
        method: 'POST',
        data: { question: query }
      });

      setResponse(result.answer);
    } catch (error) {
      console.error('Error al consultar al asistente de IA:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener una respuesta del asistente. Por favor, intenta nuevamente más tarde.",
        variant: "destructive"
      });
      setResponse("Lo siento, no pude procesar tu pregunta en este momento. Por favor, intenta nuevamente más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row justify-between items-center space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Asistente IA
        </CardTitle>
        <Link href="/dashboard/ai-tools">
          <Button variant="ghost" size="icon" title="Ver pantalla completa">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-2 flex-grow overflow-auto">
        {response ? (
          <div className="bg-muted rounded-lg p-3 text-sm h-[150px] overflow-auto whitespace-pre-wrap">
            {response}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg h-[150px] flex items-center justify-center text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Generando respuesta...</span>
              </div>
            ) : (
              <span>Haz una pregunta sobre gestión del agua o logística y obtén ayuda instantánea</span>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 mt-auto">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Textarea 
            placeholder="Pregunta algo..."
            className="min-h-[60px] flex-grow resize-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            className="px-3"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default AIAssistantWidget;