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
  
  // Validar que todos los campos necesarios existan
  if (!dateParts.year || !dateParts.month || !dateParts.day || 
      !dateParts.hour || !dateParts.minute || !dateParts.second) {
    console.error('❌ Error: formatToParts no retornó todos los campos necesarios:', dateParts);
    // Fallback: usar la fecha actual del sistema
    return now;
  }
  
  // Construir fecha SIN 'Z' para que se guarde como timestamp local en PostgreSQL
  // CRÍTICO: NO añadir 'Z' porque eso la convierte a UTC y causa desfase de 4 horas
  const rdTimeString = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
  
  // Validar que la fecha resultante sea válida
  const resultDate = new Date(rdTimeString);
  if (isNaN(resultDate.getTime())) {
    console.error('❌ Error: Fecha inválida generada:', rdTimeString);
    return now;
  }
  
  return resultDate;
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
 * Retorna string con offset de timezone para interpretación correcta
 * Ejemplo: si en RD son 31-oct 22:24, retorna "2025-10-31T22:24:00.000-04:00"
 * @returns String en formato ISO con offset de timezone RD
 */
export function getTimestampRD(): string {
  // Método robusto: obtener componentes UTC y ajustar manualmente
  const now = new Date();
  
  // RD está en UTC-4, entonces restamos 4 horas a UTC
  const rdTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
  
  // Obtener componentes en UTC (que ahora representan hora RD)
  const year = rdTime.getUTCFullYear();
  const month = String(rdTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(rdTime.getUTCDate()).padStart(2, '0');
  const hour = String(rdTime.getUTCHours()).padStart(2, '0');
  const minute = String(rdTime.getUTCMinutes()).padStart(2, '0');
  const second = String(rdTime.getUTCSeconds()).padStart(2, '0');
  const ms = String(rdTime.getUTCMilliseconds()).padStart(3, '0');
  
  // Construir timestamp con offset de RD (-04:00)
  // CRÍTICO: Incluir offset para que PostgreSQL interprete correctamente
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}-04:00`;
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
 * Retorna un string timestamp para usar con sql\`...:timestamp\` (evita conversión de timezone)
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns String timestamp en formato "YYYY-MM-DD HH:mm:ss" (hora local RD)
 */
export function getDateWithCurrentTimeRD(dateString: string): string {
  const now = new Date();
  
  // Obtener la hora actual en timezone RD
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const timeParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      timeParts[part.type] = part.value;
    }
  });
  
  // Retornar string directo (NO Date object) para evitar conversión de timezone
  // Este string se usará con sql`${str}::timestamp` para que PostgreSQL lo guarde literalmente
  return `${dateString} ${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;
}
