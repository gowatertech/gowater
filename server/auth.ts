import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { setCurrentCompanyId } from './company-db';
import connectPg from 'connect-pg-simple';
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

// Extender el tipo Request para incluir el usuario tipado
declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      username?: string;
      email?: string | null;
      role: string;
      companyId?: number | null;
      active?: boolean;
      isPlatformUser?: boolean;
    }
  }
}

/**
 * Configuración principal de autenticación para Express
 */
export function setupAuth(app: Express) {
  // Configurar opciones de sesión
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'gowater-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    },
    store: new PostgresSessionStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true
    })
  };

  // Configurar middleware de sesión
  app.use(session(sessionOptions));
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware global para mantener el companyId en el contexto
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && (req.user as any).companyId) {
      // Almacenar companyId en la sesión cada vez para mantenerlo sincronizado
      req.session.companyId = (req.user as any).companyId;
      
      // Establecer en el contexto para las consultas a la base de datos
      setCurrentCompanyId((req.user as any).companyId);
      console.log(`Sesión activa - CompanyId: ${(req.user as any).companyId}`);
    } else if (req.session && req.session.companyId) {
      // Si no hay usuario pero sí hay companyId en sesión, usarlo (durante transición de página por ejemplo)
      setCurrentCompanyId(req.session.companyId);
      console.log(`Sesión sin usuario, usando companyId de sesión: ${req.session.companyId}`);
    } else {
      // Limpiar el contexto si no hay companyId
      setCurrentCompanyId(undefined);
    }
    next();
  });
  
  // Configurar estrategia de autenticación local (username/email + password)
  passport.use(new LocalStrategy({
    usernameField: 'email',    // Usar email como campo de usuario
    passwordField: 'password'  // Campo de contraseña estándar
  }, async (email, password, done) => {
    try {
      // Primero, buscar en la tabla users (usuarios de compañía)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      // Si no se encuentra en users, buscar en platform_users
      if (!user) {
        const { platformDb } = await import('./platform-db');
        const { platformUsers } = await import('@shared/platform-schema');
        
        const [platformUser] = await platformDb
          .select()
          .from(platformUsers)
          .where(eq(platformUsers.email, email));
        
        if (!platformUser) {
          console.log(`Intento de login fallido: Usuario con email ${email} no encontrado`);
          return done(null, false, { message: 'Usuario no encontrado' });
        }
        
        // Usuario de plataforma encontrado - procesarlo
        if (!platformUser.active) {
          console.log(`Intento de login fallido: Usuario de plataforma con email ${email} inactivo`);
          return done(null, false, { message: 'Usuario inactivo' });
        }
        
        // Verificar la contraseña del usuario de plataforma
        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(password, platformUser.password);
        } catch (error) {
          console.log(`Error al comparar contraseñas de plataforma:`, error);
          isPasswordValid = false;
        }
        
        if (!isPasswordValid) {
          console.log(`Intento de login fallido: Contraseña incorrecta para usuario de plataforma ${email}`);
          return done(null, false, { message: 'Contraseña incorrecta' });
        }
        
        // Login exitoso para usuario de plataforma
        console.log(`✅ Login exitoso (Platform) - Usuario: ${email}, ID: ${platformUser.id}, Role: ${platformUser.role}`);
        
        // Devolver el usuario sin la contraseña, agregando un flag para identificar que es de plataforma
        const { password: _pwd, ...userWithoutPassword } = platformUser;
        return done(null, { ...userWithoutPassword, isPlatformUser: true });
      }
      
      if (!user.active) {
        console.log(`Intento de login fallido: Usuario con email ${email} inactivo`);
        return done(null, false, { message: 'Usuario inactivo' });
      }
      
      // Verificar la contraseña
      let isPasswordValid = false;
      
      // Verificar si es una contraseña en texto plano (legado)
      if (password === user.password) {
        isPasswordValid = true;
        
        // Actualizar a formato hash por seguridad
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, user.id));
          console.log(`⚠️ Contraseña de ${email} actualizada de texto plano a hash`);
        } catch (error) {
          console.error(`Error al actualizar contraseña a hash:`, error);
        }
      } else {
        // Verificar como contraseña hasheada
        try {
          isPasswordValid = await bcrypt.compare(password, user.password);
        } catch (error) {
          // Si falla la comparación, probablemente no es un hash bcrypt
          console.log(`Error al comparar contraseñas:`, error);
          isPasswordValid = false;
        }
      }
      
      if (!isPasswordValid) {
        console.log(`Intento de login fallido: Contraseña incorrecta para ${email}`);
        return done(null, false, { message: 'Contraseña incorrecta' });
      }
      
      // Registrar el login exitoso
      console.log(`✅ Login exitoso - Usuario: ${email}, ID: ${user.id}, Empresa: ${user.companyId}`);
      
      // Devolver el usuario sin la contraseña
      const { password: _pwd, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      console.error('Error en autenticación:', error);
      return done(error);
    }
  }));
  
  // Serializar usuario (guardar en sesión)
  passport.serializeUser((user: any, done) => {
    // Si es un usuario de plataforma, guardar también el flag
    if (user.isPlatformUser) {
      done(null, { id: user.id, isPlatformUser: true });
    } else {
      done(null, user.id);
    }
  });
  
  // Deserializar usuario (recuperar de sesión)
  passport.deserializeUser(async (data: any, done) => {
    try {
      // Si data es un objeto con isPlatformUser, es un usuario de plataforma
      if (typeof data === 'object' && data.isPlatformUser) {
        const { platformDb } = await import('./platform-db');
        const { platformUsers } = await import('@shared/platform-schema');
        
        const [platformUser] = await platformDb
          .select()
          .from(platformUsers)
          .where(eq(platformUsers.id, data.id));
        
        if (!platformUser) {
          return done(null, false);
        }
        
        // Devolver el usuario de plataforma sin la contraseña
        const { password: _pwd, ...userWithoutPassword } = platformUser;
        return done(null, { ...userWithoutPassword, isPlatformUser: true });
      }
      
      // Si es un número, es un ID de usuario regular
      const id = typeof data === 'number' ? data : data.id;
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      if (!user) {
        return done(null, false);
      }
      
      // Devolver el usuario sin la contraseña
      const { password: _pwd, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });
  
  // Rutas de autenticación
  
  // Login
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Error en autenticación:', err);
        return res.status(500).json({
          success: false,
          message: 'Error en el servidor durante autenticación'
        });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Credenciales inválidas'
        });
      }
      
      // Iniciar sesión manualmente
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Error al iniciar sesión:', loginErr);
          return res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
          });
        }
        
        // Establecer companyId en la sesión
        req.session.companyId = user.companyId;
        
        // Establecer companyId en el contexto global
        setCurrentCompanyId(user.companyId);
        
        return res.status(200).json({
          success: true,
          message: 'Login exitoso',
          user
        });
      });
    })(req, res, next);
  });
  
  // Login para la aplicación móvil
  app.post('/api/mobile/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error('Error en autenticación móvil:', err);
        return res.status(500).json({
          success: false,
          message: 'Error en el servidor durante autenticación'
        });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info?.message || 'Credenciales inválidas'
        });
      }
      
      // Verificar que el usuario tiene un rol permitido en la app móvil
      const mobileRoles = ['driver', 'assistant'];
      if (!mobileRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Tu rol no tiene permiso para acceder a la aplicación móvil'
        });
      }
      
      // Iniciar sesión
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Error al iniciar sesión móvil:', loginErr);
          return res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
          });
        }
        
        // Establecer companyId en la sesión
        req.session.companyId = user.companyId;
        
        // Establecer companyId en el contexto global
        setCurrentCompanyId(user.companyId);
        
        return res.status(200).json({
          success: true,
          message: 'Login exitoso',
          user
        });
      });
    })(req, res, next);
  });
  
  // Logout
  app.post('/api/logout', (req, res) => {
    // Limpiar el companyId del contexto antes de destruir la sesión
    setCurrentCompanyId(undefined);
    
    req.logout((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al cerrar sesión'
        });
      }
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Error al destruir sesión:', sessionErr);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Sesión cerrada correctamente'
        });
      });
    });
  });
  
  // Logout para móvil (misma implementación)
  app.post('/api/mobile/logout', (req, res) => {
    // Limpiar el companyId del contexto antes de destruir la sesión
    setCurrentCompanyId(undefined);
    
    req.logout((err) => {
      if (err) {
        console.error('Error al cerrar sesión móvil:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al cerrar sesión'
        });
      }
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Error al destruir sesión móvil:', sessionErr);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Sesión cerrada correctamente'
        });
      });
    });
  });
  
  // Obtener usuario actual
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    // Devolver información del usuario completa incluyendo companyId de sesión
    return res.status(200).json({
      success: true,
      user: req.user,
      companyId: req.session.companyId || (req.user as Express.User).companyId
    });
  });
  
  // Obtener usuario actual para móvil
  app.get('/api/mobile/me', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    // Verificar rol para app móvil
    const mobileRoles = ['driver', 'assistant'];
    if (!mobileRoles.includes((req.user as Express.User).role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a la aplicación móvil'
      });
    }
    
    return res.status(200).json({
      success: true,
      user: req.user,
      companyId: req.session.companyId || (req.user as Express.User).companyId
    });
  });
  
  // Endpoint para obtener el companyId actual (útil para diagnóstico)
  app.get('/api/companyid', (req, res) => {
    const companyId = req.session.companyId || (req.user ? (req.user as Express.User).companyId : null);
    
    if (!companyId) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró un ID de empresa asociado a la sesión actual'
      });
    }
    
    return res.status(200).json({
      success: true,
      companyId
    });
  });
}

// Middleware para proteger rutas - requiere autenticación
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado. Por favor inicie sesión para continuar.'
    });
  }
  next();
}

// Middleware para verificar compañía - requiere companyId
export function requireCompany(req: Request, res: Response, next: NextFunction) {
  const companyId = req.session.companyId || (req.user ? (req.user as Express.User).companyId : null);
  
  if (!companyId) {
    return res.status(403).json({
      success: false,
      message: 'No se pudo determinar la empresa asociada a esta sesión'
    });
  }
  
  // Sincronizar companyId con el contexto global
  setCurrentCompanyId(companyId);
  next();
}

// Middleware para verificar roles específicos
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }
    
    const userRole = (req.user as Express.User).role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `No tienes permiso para acceder a este recurso. Se requiere uno de estos roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
}