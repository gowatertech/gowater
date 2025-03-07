export interface GeocodingResult {
  latitude: number;
  longitude: number;
  display_name: string;
  confidence: number;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // Usar Nominatim API (OpenStreetMap)
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'GoWater-App/1.0',
          'Accept-Language': 'es,en' // Preferir resultados en español
        }
      }
    );

    if (!response.ok) {
      console.error('Error en geocoding:', response.statusText);
      return null;
    }

    const results = await response.json();
    
    if (!results || results.length === 0) {
      console.log('No se encontraron resultados para la dirección:', address);
      return null;
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      display_name: result.display_name,
      confidence: result.importance || 0
    };
  } catch (error) {
    console.error('Error en geocoding:', error);
    return null;
  }
}
