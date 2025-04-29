import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, MoveRight, Bot, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const AIAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente virtual especializado en gestión del agua y logística. Puedo ayudarte con preguntas sobre distribución de agua, optimización de rutas, buenas prácticas y más. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    // Agregar la pregunta del usuario al historial
    setMessages(prev => [...prev, {
      role: 'user',
      content: query,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await apiRequest({
        url: '/api/ai/assistant/ask',
        method: 'POST',
        data: { question: query }
      });

      // Agregar la respuesta del asistente al historial
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error al consultar al asistente de IA:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener una respuesta del asistente. Por favor, intenta nuevamente más tarde.",
        variant: "destructive"
      });

      // Agregar un mensaje de error al historial
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Lo siento, no pude procesar tu pregunta en este momento. Por favor, intenta nuevamente más tarde.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! Soy tu asistente virtual especializado en gestión del agua y logística. Puedo ayudarte con preguntas sobre distribución de agua, optimización de rutas, buenas prácticas y más. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <Card className="flex flex-col h-full border-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Bot className="text-primary" size={24} />
            Asistente IA 
          </CardTitle>
          <CardDescription>
            Tu asistente especializado en gestión del agua y logística
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto pb-2 pr-2">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  <div className="mb-1 whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs ${
                    message.role === 'user'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  } text-right`}>
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg p-3 max-w-[80%] bg-muted flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Generando respuesta...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 pt-0">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Textarea 
              placeholder="Escribe tu pregunta aquí..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[60px] flex-grow"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !query.trim()}
              className="h-[60px] px-3"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
          <div className="flex justify-between w-full">
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearConversation}
              className="text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Nueva conversación
            </Button>
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs flex items-center gap-1 ml-auto"
              onClick={() => window.open('/dashboard/ai-tools', '_blank')}
            >
              Más herramientas IA <MoveRight className="h-3 w-3" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AIAssistant;