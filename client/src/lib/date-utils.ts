/**
 * Utilidades para manejo de fechas en zona horaria de República Dominicana (UTC-4)
 * 
 * IMPORTANTE: Usar estas funciones para garantizar consistencia de zona horaria
 * en toda la aplicación, especialmente al enviar fechas al servidor.
 */

/**
 * Obtiene la fecha y hora actual en zona horaria de República Dominicana
 * @returns Date object en zona horaria RD
 */
export function getNowRD(): Date {
  return toRD(new Date());
}

/**
 * Obtiene un timestamp ISO en zona horaria de República Dominicana
 * Útil para enviar al servidor
 * @returns string en formato ISO (ej: "2024-10-31T15:30:00.000Z")
 */
export function getTimestampRD(): string {
  return getNowRD().toISOString();
}

/**
 * Obtiene la fecha de hoy (sin hora) en zona horaria de República Dominicana
 * @returns Date object a las 00:00:00 en zona horaria RD
 */
export function getTodayRD(): Date {
  const now = getNowRD();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Convierte cualquier fecha a zona horaria de República Dominicana
 * @param date - Fecha a convertir
 * @returns Date object en zona horaria RD
 */
export function toRD(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Obtener las partes de la fecha en zona horaria RD
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
  
  const parts = formatter.formatToParts(inputDate);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  // Construir nueva fecha con las partes en RD timezone
  return new Date(
    parseInt(dateParts.year),
    parseInt(dateParts.month) - 1,
    parseInt(dateParts.day),
    parseInt(dateParts.hour),
    parseInt(dateParts.minute),
    parseInt(dateParts.second)
  );
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD en zona horaria RD
 * Útil para inputs de tipo date
 * @returns string en formato YYYY-MM-DD
 */
export function getTodayStringRD(): string {
  const today = getTodayRD();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha a string legible en español (República Dominicana)
 * @param date - Fecha a formatear
 * @param options - Opciones de formateo
 * @returns string formateado
 */
export function formatDateRD(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return inputDate.toLocaleDateString('es-DO', {
    ...options,
    timeZone: 'America/Santo_Domingo'
  });
}
