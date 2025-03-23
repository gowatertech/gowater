// Definición de tipos para Google Maps API
// Esto permitirá que TypeScript reconozca los tipos de Google Maps

declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps.places {
  class AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (
        predictions: AutocompletePrediction[] | null,
        status: PlacesServiceStatus
      ) => void
    ): void;
  }

  class AutocompleteSessionToken {}

  interface AutocompletePrediction {
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }

  interface AutocompletionRequest {
    input: string;
    sessionToken?: AutocompleteSessionToken;
    componentRestrictions?: {
      country: string | string[];
    };
    types?: string[];
    fields?: string[];
  }

  class PlacesService {
    constructor(attrContainer: HTMLDivElement | google.maps.Map);

    getDetails(
      request: PlaceDetailsRequest,
      callback: (
        result: PlaceResult | null,
        status: PlacesServiceStatus
      ) => void
    ): void;
  }

  interface PlaceDetailsRequest {
    placeId: string;
    fields?: string[];
    sessionToken?: AutocompleteSessionToken;
  }

  interface PlaceResult {
    name?: string;
    place_id?: string;
    formatted_address?: string;
    geometry?: {
      location: google.maps.LatLng;
    };
  }

  enum PlacesServiceStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    NOT_FOUND = 'NOT_FOUND'
  }
}

// Esto es necesario para que TypeScript reconozca este archivo como un módulo
export {};