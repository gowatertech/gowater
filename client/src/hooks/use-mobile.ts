
import { useState, useEffect } from 'react';

// Definición de breakpoints
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Hook para las características de dispositivo móvil
 */
export function useMobile() {
  const isMobile = useIsMobile();
  const [isDarkMode, setIsDarkMode] = useState(
    typeof window !== 'undefined' 
      ? localStorage.getItem('darkMode') === 'true'
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Guardar preferencia en localStorage
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return {
    isMobile,
    isDarkMode,
    toggleDarkMode
  };
}

const breakpoints = {
  xs: 480,  // Extra small devices (phones)
  sm: 640,  // Small devices (large phones, small tablets)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (desktops)
  xl: 1280  // Extra large devices (large desktops)
};

/**
 * Hook para detectar si la pantalla es menor que un breakpoint específico
 */
export function useBreakpoint(breakpoint: Breakpoint = "md") {
  const [isSmaller, setIsSmaller] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoints[breakpoint] : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsSmaller(window.innerWidth < breakpoints[breakpoint]);
    };

    window.addEventListener('resize', handleResize);
    
    // Llamada inicial para establecer el valor correcto
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isSmaller;
}

/**
 * Hook para detectar si es un dispositivo móvil (< 768px)
 */
export function useIsMobile() {
  return useBreakpoint("md");
}

/**
 * Hook para detectar si es un tablet (< 1024px pero >= 768px)
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(
    typeof window !== 'undefined' 
      ? window.innerWidth < breakpoints.lg && window.innerWidth >= breakpoints.md
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsTablet(
        window.innerWidth < breakpoints.lg && window.innerWidth >= breakpoints.md
      );
    };

    window.addEventListener('resize', handleResize);
    
    // Llamada inicial para establecer el valor correcto
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isTablet;
}

/**
 * Hook para detectar si es un escritorio (>= 1024px)
 */
export function useIsDesktop() {
  return !useBreakpoint("lg");
}
