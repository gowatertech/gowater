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
  const rdDate = getNowRD();
  
  // Obtener partes de la fecha
  const year = rdDate.getFullYear();
  const month = String(rdDate.getMonth() + 1).padStart(2, '0');
  const day = String(rdDate.getDate()).padStart(2, '0');
  const hour = String(rdDate.getHours()).padStart(2, '0');
  const minute = String(rdDate.getMinutes()).padStart(2, '0');
  const second = String(rdDate.getSeconds()).padStart(2, '0');
  const ms = String(rdDate.getMilliseconds()).padStart(3, '0');
  
  // CRÍTICO: NO añadir 'Z' para evitar conversión a UTC
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}`;
}
