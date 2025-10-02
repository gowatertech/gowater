/**
 * Utility functions for safe data parsing and validation
 */

/**
 * Safely parse a string or number to a number
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed number or default value
 */
export function safeParseFloat(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
}

/**
 * Safely parse a string or number to an integer
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed integer or default value
 */
export function safeParseInt(value: string | number | null | undefined, defaultValue: number = 0): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : Math.floor(value);
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  return defaultValue;
}

/**
 * Safely parse JSON string
 * @param jsonString - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return defaultValue;
  }
}

/**
 * Validate and parse coordinates string in format "lat,lng"
 * @param coordinates - Coordinates string
 * @returns Tuple of [latitude, longitude] or null if invalid
 */
export function parseCoordinates(coordinates: string | null | undefined): [number, number] | null {
  if (!coordinates || typeof coordinates !== 'string') {
    return null;
  }
  
  const parts = coordinates.split(',').map(p => p.trim());
  if (parts.length !== 2) {
    return null;
  }
  
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  
  // Validate latitude and longitude ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('Coordinates out of valid range:', { lat, lng });
    return null;
  }
  
  return [lat, lng];
}

/**
 * Check if a value is a valid number
 * @param value - Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if a string is a valid JSON
 * @param str - String to check
 * @returns True if valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
