import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Definir los tipos de paletas de color inspiradas en agua
export type WaterTheme = 
  | 'ocean'      // Azul profundo
  | 'aquamarine' // Turquesa claro
  | 'lake'       // Azul lago
  | 'tropical'   // Azul tropical
  | 'arctic'     // Azul glaciar
  | 'classic';   // Tema original

// Definir los valores HSL para cada tema
export const themeValues = {
  ocean: {
    primary: 'hsl(200 70% 35%)',
    name: 'Océano Profundo',
    description: 'Un tema azul oscuro inspirado en las profundidades del océano'
  },
  aquamarine: {
    primary: 'hsl(160 70% 45%)',
    name: 'Aguamarina',
    description: 'Un verde-azulado refrescante como aguas cristalinas'
  },
  lake: {
    primary: 'hsl(210 60% 50%)',
    name: 'Lago Azul',
    description: 'Un azul sereno inspirado en lagos tranquilos'
  },
  tropical: {
    primary: 'hsl(190 80% 50%)',
    name: 'Agua Tropical',
    description: 'Un azul brillante como las aguas tropicales'
  },
  arctic: {
    primary: 'hsl(220 70% 55%)',
    name: 'Glaciar Ártico',
    description: 'Un azul frío como las aguas del Ártico'
  },
  classic: {
    primary: 'hsl(0 0% 9%)',
    name: 'Clásico',
    description: 'El tema original de GoWater'
  }
};

interface ThemeState {
  theme: WaterTheme;
  appearance: 'light' | 'dark' | 'system';
  radius: number;
  setTheme: (theme: WaterTheme) => void;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setRadius: (radius: number) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'ocean',
      appearance: 'light',
      radius: 0.5,
      setTheme: (theme) => set({ theme }),
      setAppearance: (appearance) => set({ appearance }),
      setRadius: (radius) => set({ radius }),
      applyTheme: () => {
        const { theme, appearance, radius } = get();
        const themeConfig = {
          variant: 'professional', // Mantenemos la variante profesional
          primary: themeValues[theme].primary,
          appearance,
          radius
        };

        // Actualizamos theme.json a través de localStorage
        localStorage.setItem('theme-config', JSON.stringify(themeConfig));
        
        // Actualiza meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', themeValues[theme].primary);
        }
        
        // Recargamos la página para aplicar el nuevo tema
        window.location.reload();
      }
    }),
    {
      name: 'gowater-theme', // nombre para localStorage
    }
  )
);

export const useTheme = () => {
  return useThemeStore();
};