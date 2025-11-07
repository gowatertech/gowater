/**
 * Utilidades para manejo de fechas en zona horaria de República Dominicana (UTC-4)
 * 
 * IMPORTANTE: Usar estas funciones para garantizar consistencia de zona horaria
 * en toda la aplicación, especialmente al enviar fechas al servidor.
 */

/**
 * Obtiene la fecha y hora actual (timestamp UTC real)
 * Para mostrar al usuario, usar formatDateRD o formatTodayRD que aplicarán la zona horaria RD
 * @returns Date object con el timestamp UTC actual
 */
export function getNowRD(): Date {
  return new Date();
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
 * Retorna un Date que representa medianoche (00:00) en RD como timestamp UTC
 * RD está en UTC-4, así que medianoche en RD es 04:00 UTC
 * @returns Date object que representa medianoche en RD (en timestamp UTC)
 */
export function getTodayRD(): Date {
  const now = new Date();
  
  // Obtener la fecha actual en timezone RD
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  // Construir medianoche en RD como timestamp UTC
  // RD está en UTC-4, así que medianoche en RD (00:00 RD) = 04:00 UTC
  const year = parseInt(dateParts.year);
  const month = parseInt(dateParts.month) - 1; // Los meses en Date van de 0-11
  const day = parseInt(dateParts.day);
  
  // Crear fecha a medianoche UTC + 4 horas (para RD que es UTC-4)
  const today = new Date(Date.UTC(year, month, day, 4, 0, 0, 0));
  return today;
}

/**
 * Interpreta una fecha guardada como "hora local de RD en formato UTC"
 * El backend guarda la hora local de RD con marca UTC, aquí solo la interpretamos
 * @param date - Fecha a interpretar
 * @returns Date object listo para formatear
 */
export function toRD(date: Date | string): Date {
  // El timestamp ya viene con la hora de RD (guardada como UTC)
  // Solo necesitamos convertirlo a Date object
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD en zona horaria RD
 * Útil para inputs de tipo date
 * @returns string en formato YYYY-MM-DD
 */
export function getTodayStringRD(): string {
  // Obtener la fecha actual en timezone RD
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
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
  // NO usar timeZone aquí porque el backend ya devuelve fechas en hora local RD (sin 'Z')
  return inputDate.toLocaleDateString('es-DO', options);
}

/**
 * Formatea la fecha ACTUAL en español (República Dominicana)
 * Equivalente a new Date().toLocaleDateString() pero con zona horaria correcta
 * @param options - Opciones de formateo
 * @returns string formateado con la fecha actual en RD
 */
export function formatTodayRD(
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  // Usar new Date() directamente (timestamp UTC actual) y formatear con zona RD
  return new Date().toLocaleDateString('es-DO', {
    ...options,
    timeZone: 'America/Santo_Domingo'
  });
}

/**
 * Formatea la fecha actual en formato compacto: "dd mm aaaa DÍA"
 * Ejemplo: "01 11 2025 SÁBADO"
 * @returns string formateado
 */
export function formatTodayCompactRD(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-DO', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  const weekday = dateParts.weekday?.toUpperCase() || '';
  return `${dateParts.day} ${dateParts.month} ${dateParts.year} ${weekday}`;
}

/**
 * Formatea una fecha/hora a string legible en español (República Dominicana)
 * Detecta automáticamente si el timestamp es UTC (con 'Z') o local
 * @param date - Fecha/hora a formatear
 * @param options - Opciones de formateo
 * @returns string formateado con fecha y hora
 */
export function formatDateTimeRD(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Si el string original termina en 'Z', es UTC y necesitamos especificar timeZone
  const isUTC = typeof date === 'string' && date.endsWith('Z');
  
  return inputDate.toLocaleString('es-DO', {
    ...options,
    ...(isUTC && { timeZone: 'America/Santo_Domingo' })
  });
}

/**
 * Formatea solo la hora de una fecha en República Dominicana
 * @param date - Fecha a formatear
 * @param options - Opciones de formateo
 * @returns string formateado con solo la hora
 */
export function formatTimeRD(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  // NO usar timeZone aquí porque el backend ya devuelve fechas en hora local RD (sin 'Z')
  return inputDate.toLocaleTimeString('es-DO', options);
}

/**
 * Obtiene el inicio de la semana (lunes) para la fecha actual en RD timezone
 * @param weekStartsOn - Día de inicio de semana (0=domingo, 1=lunes)
 * @returns string en formato YYYY-MM-DD
 */
export function getStartOfWeekRD(weekStartsOn: 0 | 1 = 1): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });
  
  // Obtener el día de la semana actual (0=domingo, 1=lunes, ..., 6=sábado)
  const dayOfWeek = now.getDay();
  
  // Calcular cuántos días restar para llegar al inicio de la semana
  let daysToSubtract = dayOfWeek - weekStartsOn;
  if (daysToSubtract < 0) {
    daysToSubtract += 7;
  }
  
  // Crear una nueva fecha restando los días necesarios
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysToSubtract);
  
  // Formatear la fecha de inicio en RD timezone
  const startFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const startParts = startFormatter.formatToParts(startDate);
  const startDateParts: Record<string, string> = {};
  startParts.forEach(part => {
    if (part.type !== 'literal') {
      startDateParts[part.type] = part.value;
    }
  });
  
  return `${startDateParts.year}-${startDateParts.month}-${startDateParts.day}`;
}

/**
 * Obtiene el fin de la semana (domingo) para la fecha actual en RD timezone
 * @param weekStartsOn - Día de inicio de semana (0=domingo, 1=lunes)
 * @returns string en formato YYYY-MM-DD
 */
export function getEndOfWeekRD(weekStartsOn: 0 | 1 = 1): string {
  const now = new Date();
  
  // Obtener el día de la semana actual (0=domingo, 1=lunes, ..., 6=sábado)
  const dayOfWeek = now.getDay();
  
  // Calcular cuántos días sumar para llegar al final de la semana
  let daysToAdd = (weekStartsOn === 1 ? 7 : 6) - dayOfWeek;
  if (weekStartsOn === 1 && dayOfWeek === 0) {
    // Si es domingo y la semana empieza en lunes, el domingo es el último día
    daysToAdd = 0;
  }
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  // Crear una nueva fecha sumando los días necesarios
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + daysToAdd);
  
  // Formatear la fecha de fin en RD timezone
  const endFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const endParts = endFormatter.formatToParts(endDate);
  const endDateParts: Record<string, string> = {};
  endParts.forEach(part => {
    if (part.type !== 'literal') {
      endDateParts[part.type] = part.value;
    }
  });
  
  return `${endDateParts.year}-${endDateParts.month}-${endDateParts.day}`;
}

/**
 * Convierte una fecha en formato YYYY-MM-DD a un Date object representando
 * medianoche de esa fecha en zona horaria RD (como timestamp UTC)
 * @param dateString - Fecha en formato YYYY-MM-DD (del input type="date")
 * @returns Date object que representa medianoche de esa fecha en RD
 */
export function parseDateStringRD(dateString: string): Date {
  // Parsear la fecha manualmente para evitar problemas de timezone
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Crear fecha a medianoche UTC + 4 horas (para RD que es UTC-4)
  // Esto representa medianoche en RD como timestamp UTC
  const date = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
  return date;
}

/**
 * Formatea un timestamp UTC a fecha/hora en zona horaria de República Dominicana
 * Útil para timestamps que vienen del servidor en formato UTC (con 'Z')
 * @param date - Timestamp UTC a formatear
 * @param options - Opciones de formateo
 * @returns string formateado con fecha y hora en RD
 */
export function formatUTCtoRD(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  // Especificar timeZone para convertir de UTC a RD
  return inputDate.toLocaleString('es-DO', {
    ...options,
    timeZone: 'America/Santo_Domingo'
  });
}
