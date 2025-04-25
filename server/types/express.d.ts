import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      // Define las propiedades personalizadas para req
      session: any;
    }
    
    // Extendemos la interfaz de sesión para incluir nuestras propiedades
    interface Session {
      user?: Omit<User, 'password'>;
      companyId?: number;
    }
  }
}

export {};