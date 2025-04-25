import { Request, Response, NextFunction } from 'express';

// Estructura simple para el rate limiting por IP
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// Mapa para almacenar los intentos por IP
const ipAttempts = new Map<string, RateLimitEntry>();

// Configuración de límites
const MAX_ATTEMPTS = 5; // Máximo de intentos permitidos
const WINDOW_MS = 15 * 60 * 1000; // Ventana de tiempo (15 minutos)
const BLOCK_DURATION_MS = 30 * 60 * 1000; // Duración del bloqueo (30 minutos)

/**
 * Middleware para limitar la cantidad de intentos de login por IP
 * Protege contra ataques de fuerza bruta
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Obtener la IP del cliente
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Obtener la hora actual
  const now = Date.now();
  
  // Verificar si la IP está en el mapa y obtener sus datos
  let entry = ipAttempts.get(clientIp);
  
  // Si no existe entrada para esta IP, crearla
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + WINDOW_MS
    };
    ipAttempts.set(clientIp, entry);
  }
  
  // Verificar si la IP está bloqueada
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const remainingTimeMin = Math.ceil((entry.blockedUntil - now) / 60000);
    console.log(`IP ${clientIp} bloqueada. Tiempo restante: ${remainingTimeMin} minutos`);
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos. Por favor, intenta de nuevo en ${remainingTimeMin} minutos.`
    });
  }
  
  // Si el tiempo de reset ya pasó, reiniciar contador
  if (entry.resetTime <= now) {
    entry.count = 0;
    entry.resetTime = now + WINDOW_MS;
    // Si estaba bloqueada, quitar el bloqueo
    if (entry.blockedUntil) {
      delete entry.blockedUntil;
    }
  }
  
  // Incrementar contador de intentos
  entry.count++;
  
  // Si excede el máximo de intentos, bloquear la IP
  if (entry.count > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    console.log(`IP ${clientIp} bloqueada por ${BLOCK_DURATION_MS/60000} minutos por exceder intentos`);
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos. Por favor, intenta de nuevo en ${BLOCK_DURATION_MS/60000} minutos.`
    });
  }
  
  // Agregar encabezados para informar sobre el límite
  res.setHeader('X-RateLimit-Limit', MAX_ATTEMPTS.toString());
  res.setHeader('X-RateLimit-Remaining', (MAX_ATTEMPTS - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
  
  // Permitir la solicitud si no excede el límite
  next();
}

/**
 * Middleware específico para rutas de login/autenticación
 */
export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Solo aplicar en rutas de login
  if (req.path === '/api/login' && req.method === 'POST') {
    return rateLimitMiddleware(req, res, next);
  }
  
  // Para otras rutas, pasar directamente
  next();
}