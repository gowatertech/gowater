/**
 * Utilidades para manejar fechas en la zona horaria de República Dominicana
 * Zona horaria: America/Santo_Domingo (UTC-4)
 */

/**
 * Obtiene la fecha y hora actual en UTC (hora del servidor)
 * PostgreSQL guarda en UTC, y el frontend convierte a RD timezone para mostrar
 * @returns Date object en UTC
 */
export function getNowRD(): Date {
  return new Date(); // Simplemente devolver la hora actual en UTC
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
