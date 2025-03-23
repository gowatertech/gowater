import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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

  const searchAddress = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setShowResults(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&countrycodes=do&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "es",
            "User-Agent": "GoWater_App/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error en la búsqueda de direcciones");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError("No se pudo realizar la búsqueda. Intente nuevamente.");
      console.error("Error al buscar dirección:", err);
    } finally {
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
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onLocationSelected(lat, lng, result.display_name);
    setShowResults(false);
  };

  return (
    <div className="w-full relative">
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
                  <span className="text-sm">{result.display_name}</span>
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