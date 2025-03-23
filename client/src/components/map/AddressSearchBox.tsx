import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    }
  };
}

interface AddressSearchBoxProps {
  onLocationSelected: (lat: number, lng: number, address: string) => void;
}

export function AddressSearchBox({ onLocationSelected }: AddressSearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Referencias para los servicios de Google Maps
  const autoCompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  
  // Elemento de mapa oculto necesario para el servicio Places
  const dummyMapElementRef = useRef<HTMLDivElement>(null);
  
  // Inicializar servicios de Google Maps al montar el componente
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      // Crear token de sesión para optimización de costos de la API
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
      
      // Inicializar servicio de autocompletado
      autoCompleteService.current = new google.maps.places.AutocompleteService();
      
      // Crear un elemento div oculto para el servicio Places
      if (dummyMapElementRef.current) {
        placesService.current = new google.maps.places.PlacesService(dummyMapElementRef.current);
      }
    }
  }, []);

  const searchAddress = async () => {
    if (!query.trim() || !autoCompleteService.current) return;

    setIsSearching(true);
    setError(null);
    setShowResults(true);

    try {
      // Configurar parámetros para la búsqueda
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        // Solo incluir el sessionToken si existe
        ...(sessionToken.current && { sessionToken: sessionToken.current }),
        // Restringir a República Dominicana
        componentRestrictions: { country: "do" },
        // Tipos de resultados que queremos obtener
        types: ['address', 'establishment', 'geocode']
      };

      // Usar el servicio de autocompletado para buscar lugares
      autoCompleteService.current.getPlacePredictions(
        request, 
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setResults(predictions);
          } else {
            setResults([]);
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              setError("Error en la búsqueda. Intente con otros términos.");
              console.error("Error de Places API:", status);
            }
          }
          setIsSearching(false);
        }
      );
    } catch (err) {
      setError("No se pudo realizar la búsqueda. Intente nuevamente.");
      console.error("Error al buscar dirección:", err);
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchAddress();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (!placesService.current) {
      setError("El servicio de lugares no está disponible");
      return;
    }
    
    // Conseguir los detalles del lugar seleccionado para obtener las coordenadas
    placesService.current.getDetails(
      {
        placeId: result.place_id,
        fields: ['geometry', 'formatted_address', 'name'],
        ...(sessionToken.current && { sessionToken: sessionToken.current })
      },
      (placeResult, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeResult && placeResult.geometry && placeResult.geometry.location) {
          const lat = placeResult.geometry.location.lat();
          const lng = placeResult.geometry.location.lng();
          const address = placeResult.formatted_address || result.description;
          
          onLocationSelected(lat, lng, address);
          setShowResults(false);
          setQuery(address); // Actualizar el input con la dirección completa
          
          // Generar un nuevo token de sesión para la siguiente búsqueda
          sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        } else {
          setError("No se pudieron obtener las coordenadas del lugar seleccionado");
          console.error("Error al obtener detalles del lugar:", status);
        }
      }
    );
  };

  return (
    <div className="w-full relative">
      {/* Elemento div oculto necesario para el servicio Places */}
      <div ref={dummyMapElementRef} className="hidden"></div>
      
      <div className="flex space-x-2">
        <Input
          placeholder="Buscar dirección..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          onClick={searchAddress}
          disabled={isSearching}
          type="button"
          variant="outline"
          size="sm"
          className="px-3"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Buscar</span>
        </Button>
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-y-auto">
          <ul className="divide-y">
            {results.map((result) => (
              <li
                key={result.place_id}
                className="p-2 hover:bg-muted cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{result.structured_formatting.main_text}</span>
                    <span className="text-xs text-muted-foreground">{result.structured_formatting.secondary_text}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResults && results.length === 0 && !isSearching && (
        <p className="text-muted-foreground text-xs mt-1">
          No se encontraron resultados para "{query}"
        </p>
      )}
    </div>
  );
}