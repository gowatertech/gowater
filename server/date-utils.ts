/**
 * Utilidades para manejar fechas en la zona horaria de República Dominicana
 * Zona horaria: America/Santo_Domingo (UTC-4)
 */

/**
 * Obtiene la fecha y hora actual en República Dominicana
 * Guarda la hora LOCAL de RD como si fuera UTC en PostgreSQL
 * Ejemplo: si en RD son 31-oct 22:24, guarda "2025-10-31T22:24:00.000Z"
 * @returns Date object con hora de RD interpretada como UTC
 */
export function getNowRD(): Date {
  const now = new Date();
  
  // Obtener las partes de la fecha/hora en timezone RD
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  // Construir un timestamp UTC con la hora local de RD
  const rdTimeString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.000Z`;
  return new Date(rdTimeString);
}

/**
 * Obtiene solo la fecha (sin hora) en la zona horaria de República Dominicana
 * @returns Date object con la fecha local de RD a las 00:00:00
 */
export function getTodayRD(): Date {
  const rd = getNowRD();
  rd.setHours(0, 0, 0, 0);
  return rd;
}

/**
 * Convierte una fecha a la zona horaria de República Dominicana
 * @param date - Fecha a convertir
 * @returns Date object en zona horaria de RD
 */
export function toRD(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Santo_Domingo' }));
}

/**
 * Obtiene un timestamp ISO en UTC para PostgreSQL
 * @returns String en formato ISO (UTC)
 */
export function getTimestampRD(): string {
  return new Date().toISOString();
}
