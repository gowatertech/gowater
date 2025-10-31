/**
 * Utilidades para manejar fechas en la zona horaria de República Dominicana
 * Zona horaria: America/Santo_Domingo (UTC-4)
 */

/**
 * Obtiene la fecha y hora actual en la zona horaria de República Dominicana
 * @returns Date object con la hora local de RD
 */
export function getNowRD(): Date {
  // Crear fecha en zona horaria de República Dominicana
  const now = new Date();
  const rdTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santo_Domingo' }));
  return rdTime;
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
 * Formatea una fecha para PostgreSQL en zona horaria de RD
 * @returns String en formato ISO que PostgreSQL interpreta correctamente
 */
export function getTimestampRD(): string {
  return getNowRD().toISOString();
}
