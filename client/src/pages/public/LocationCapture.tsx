import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocationSelector } from "@/components/map/LocationSelector";
import { MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface TokenData {
  customerName: string;
  customerAddress: string;
  currentCoordinates?: string;
}

export default function PublicLocationCapture() {
  const { token } = useParams();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [coordinates, setCoordinates] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await fetch(`/api/public/location/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Token inválido o expirado");
          return;
        }

        const data = await response.json();
        console.log('[PublicLocationCapture] Token data recibida:', data);
        setTokenData(data);
        if (data.currentCoordinates) {
          console.log('[PublicLocationCapture] Estableciendo coordenadas:', data.currentCoordinates);
          setCoordinates(data.currentCoordinates);
        } else {
          console.log('[PublicLocationCapture] No hay coordenadas actuales');
        }
      } catch (err) {
        setError("Error al cargar la información");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchTokenData();
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!coordinates) {
      setError("Por favor selecciona tu ubicación en el mapa");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/public/location/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Error al guardar la ubicación");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Error al enviar la ubicación");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle>Ubicación Compartida</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              ¡Gracias! Tu ubicación ha sido compartida correctamente.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Puedes cerrar esta ventana.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Compartir Mi Ubicación</CardTitle>
                <CardDescription>
                  {tokenData?.customerName && `Cliente: ${tokenData.customerName}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">
                📍 Cómo compartir tu ubicación:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Busca tu dirección en el cuadro de búsqueda</li>
                <li>O <strong>arrastra el marcador rojo</strong> a tu ubicación exacta en el mapa</li>
                <li>Haz clic en "Compartir Mi Ubicación" cuando termines</li>
              </ol>
            </div>

            <div className="h-[400px] border rounded-md overflow-hidden">
              <LocationSelector
                value={coordinates}
                onChange={setCoordinates}
              />
            </div>

            {coordinates && (
              <div className="text-sm text-muted-foreground bg-gray-100 p-3 rounded-md">
                <p className="font-medium">Ubicación seleccionada:</p>
                <p className="font-mono text-xs mt-1">{coordinates}</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!coordinates || isSubmitting}
              className="w-full"
              size="lg"
              data-testid="button-share-location"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-5 w-5" />
                  Compartir Mi Ubicación
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
