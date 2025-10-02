/**
 * Server-side validation utilities
 */

/**
 * Safely parse a string or number to an integer
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails
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
 * Safely parse a string or number to a float
 * @param value - Value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
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
 * Validate that a value is a positive integer
 * @param value - Value to validate
 * @returns True if value is a positive integer
 */
export function isPositiveInteger(value: any): boolean {
  const num = safeParseInt(value, -1);
  return num > 0;
}

/**
 * Validate that a value is a non-negative number
 * @param value - Value to validate
 * @returns True if value is non-negative
 */
export function isNonNegativeNumber(value: any): boolean {
  const num = safeParseFloat(value, -1);
  return num >= 0;
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
 * Validate email format
 * @param email - Email to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate that a string is not empty
 * @param value - String to validate
 * @returns True if string is not empty
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
