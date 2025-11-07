/**
 * Utilidades para manejar fechas en la zona horaria de República Dominicana
 * Zona horaria: America/Santo_Domingo (UTC-4)
 */

/**
 * Obtiene la fecha y hora actual en República Dominicana
 * Retorna la hora LOCAL de RD para guardar en PostgreSQL timestamp
 * Ejemplo: si en RD son 31-oct 22:24, retorna Date que representa 2025-10-31 22:24:00
 * @returns Date object con hora de RD (SIN conversión UTC)
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
  
  // Construir fecha SIN 'Z' para que se guarde como timestamp local en PostgreSQL
  // CRÍTICO: NO añadir 'Z' porque eso la convierte a UTC y causa desfase de 4 horas
  const rdTimeString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
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
 * Obtiene un timestamp string en zona horaria RD para PostgreSQL
 * Retorna string sin 'Z' para que se guarde como timestamp local
 * Ejemplo: si en RD son 31-oct 22:24, retorna "2025-10-31T22:24:00.000"
 * @returns String en formato ISO pero SIN 'Z' (hora local RD)
 */
export function getTimestampRD(): string {
  const now = new Date();
  
  // Obtener las partes de la fecha/hora en timezone RD directamente
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  // Construir string directamente SIN usar Date object
  // CRÍTICO: NO añadir 'Z' para evitar conversión a UTC
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.${dateParts.fractionalSecond || '000'}`;
}

/**
 * Convierte una fecha en formato YYYY-MM-DD a un par de timestamps
 * que representan el inicio y fin del día en zona horaria RD
 * 
 * RD está en UTC-4, entonces:
 * - Medianoche en RD (00:00) = 04:00 UTC
 * - 23:59:59.999 en RD = 03:59:59.999 UTC del día siguiente
 * 
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Objeto con startOfDay y endOfDay como Date objects en timestamp UTC
 */
export function getDayRangeRD(dateString: string): { startOfDay: Date; endOfDay: Date } {
  // Parsear la fecha manualmente para evitar problemas de timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Crear inicio del día: medianoche en RD = 04:00 UTC del mismo día
  // Ejemplo: 2025-11-06 00:00:00 RD = 2025-11-06 04:00:00 UTC
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
  
  // Crear fin del día: 23:59:59.999 en RD = 03:59:59.999 UTC del día siguiente
  // Ejemplo: 2025-11-06 23:59:59.999 RD = 2025-11-07 03:59:59.999 UTC
  const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 3, 59, 59, 999));
  
  return { startOfDay, endOfDay };
}

/**
 * Combina una fecha específica (YYYY-MM-DD) con la hora actual en zona horaria RD
 * Útil para cuadres de caja donde se selecciona una fecha pero se guarda con la hora actual
 * Retorna un string en formato timestamp SIN 'Z' para PostgreSQL
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns String timestamp en formato "YYYY-MM-DDTHH:mm:ss.SSS" (hora local RD)
 */
export function getDateWithCurrentTimeRD(dateString: string): string {
  const now = new Date();
  
  // Obtener la hora actual en timezone RD
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const timeParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      timeParts[part.type] = part.value;
    }
  });
  
  // Combinar la fecha seleccionada con la hora actual de RD
  // Retornar string directamente SIN usar Date object y SIN 'Z'
  // CRÍTICO: NO añadir 'Z' para que PostgreSQL lo guarde como timestamp local
  return `${dateString}T${timeParts.hour}:${timeParts.minute}:${timeParts.second}.${timeParts.fractionalSecond || '000'}`;
}
