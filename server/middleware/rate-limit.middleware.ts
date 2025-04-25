import { Request, Response, NextFunction } from 'express';

/**
 * Una simple implementación de rate limiting en memoria para proteger
 * contra ataques de fuerza bruta. En un entorno de producción real, 
 * se debería usar una solución más robusta como Redis.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// Key: IP, Value: información de rate limit
const rateLimitByIP = new Map<string, RateLimitEntry>();

// Key: IP+path, Value: información de rate limit específica para rutas sensibles
const rateLimitByPath = new Map<string, RateLimitEntry>();

// Configuración para endpoints generales
const GENERAL_MAX_REQUESTS = 100;  // Máximo de solicitudes permitidas en la ventana de tiempo
const GENERAL_WINDOW_MS = 60 * 1000;  // Ventana de tiempo en ms (1 minuto)

// Configuración para endpoints de login/autenticación
const LOGIN_MAX_REQUESTS = 5;  // Máximo de intentos de login permitidos
const LOGIN_WINDOW_MS = 5 * 60 * 1000;  // Ventana de tiempo en ms (5 minutos)
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000;  // Tiempo de bloqueo tras exceder límite (15 minutos)

// Limpiar entradas expiradas periódicamente
setInterval(() => {
  const now = Date.now();
  rateLimitByIP.forEach((entry, key) => {
    if (entry.resetTime < now && !entry.blockedUntil) {
      rateLimitByIP.delete(key);
    }
  });
  
  rateLimitByPath.forEach((entry, key) => {
    if ((entry.resetTime < now && !entry.blockedUntil) || 
        (entry.blockedUntil && entry.blockedUntil < now)) {
      rateLimitByPath.delete(key);
    }
  });
}, 10 * 60 * 1000); // Limpiar cada 10 minutos

/**
 * Middleware general de rate limiting para todas las rutas
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Obtener o crear entrada para esta IP
  let entry = rateLimitByIP.get(ip);
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + GENERAL_WINDOW_MS
    };
    rateLimitByIP.set(ip, entry);
  }
  
  // Verificar si la entrada debe reiniciarse
  if (entry.resetTime < now) {
    entry.count = 0;
    entry.resetTime = now + GENERAL_WINDOW_MS;
  }
  
  // Incrementar contador
  entry.count++;
  
  // Verificar límite
  if (entry.count > GENERAL_MAX_REQUESTS) {
    console.log(`Rate limit excedido para IP: ${ip}`);
    return res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes, por favor intente más tarde'
    });
  }
  
  // Establecer headers de rate limit
  res.setHeader('X-RateLimit-Limit', GENERAL_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (GENERAL_MAX_REQUESTS - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
  
  next();
}

/**
 * Middleware específico para rutas de login/autenticación
 */
export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // Solo aplicar a rutas de login y registro
  if (req.path !== '/api/login' && req.path !== '/api/register' && req.path !== '/api/forgot-password') {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  
  // Obtener o crear entrada para esta IP+path
  let entry = rateLimitByPath.get(key);
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + LOGIN_WINDOW_MS
    };
    rateLimitByPath.set(key, entry);
  }
  
  // Verificar si está bloqueado
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const waitTimeMinutes = Math.ceil((entry.blockedUntil - now) / (60 * 1000));
    console.log(`Intento de login bloqueado para ${key}. Bloqueado por ${waitTimeMinutes} minutos más.`);
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos fallidos. Por favor intente nuevamente en ${waitTimeMinutes} minutos.`
    });
  }
  
  // Verificar si la entrada debe reiniciarse
  if (entry.resetTime < now) {
    entry.count = 0;
    entry.resetTime = now + LOGIN_WINDOW_MS;
    delete entry.blockedUntil;
  }
  
  // Incrementar contador
  entry.count++;
  
  // Verificar límite
  if (entry.count > LOGIN_MAX_REQUESTS) {
    console.log(`Rate limit de login excedido para ${key}. Bloqueando por ${LOGIN_BLOCK_DURATION/60000} minutos.`);
    entry.blockedUntil = now + LOGIN_BLOCK_DURATION;
    return res.status(429).json({
      success: false,
      message: `Demasiados intentos fallidos. Por favor intente nuevamente en ${LOGIN_BLOCK_DURATION/60000} minutos.`
    });
  }
  
  // Establecer headers de rate limit
  res.setHeader('X-RateLimit-Limit', LOGIN_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', (LOGIN_MAX_REQUESTS - entry.count).toString());
  res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
  
  next();
}