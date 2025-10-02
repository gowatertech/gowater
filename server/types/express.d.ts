import { User } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      name: string;
      email?: string;
      role: string;
      companyId?: number;
      isPlatformUser?: boolean;
      username?: string;
      // Otros campos del usuario (sin contraseña)
    };
    companyId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      // Asegurarse de que el tipo de session incluya nuestros campos personalizados
      session: import('express-session').Session & import('express-session').SessionData;
    }
  }
}