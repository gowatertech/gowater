declare module 'csurf' {
  import { RequestHandler } from 'express';
  
  interface CsurfOptions {
    cookie?: boolean | {
      key?: string;
      path?: string;
      httpOnly?: boolean;
      secure?: boolean;
      maxAge?: number;
      domain?: string;
      sameSite?: boolean | 'strict' | 'lax' | 'none';
    };
    ignoreMethods?: string[];
    sessionKey?: string;
    value?: (req: any) => string;
  }
  
  function csurf(options?: CsurfOptions): RequestHandler;
  
  export = csurf;
}

// Extender la interfaz Express Request para incluir el método csrfToken
declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
}