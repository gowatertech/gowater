
import { useState, useEffect } from 'react';

export default function useMediaQuery(query: string): boolean {
  // Para evitar problemas en SSR, inicializamos a false
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Nos aseguramos de que estamos en un navegador
    if (typeof window === 'undefined') return;
    
    // Creamos el objeto mediaQueryList
    const media = window.matchMedia(query);
    
    // Establecemos el valor inicial
    setMatches(media.matches);
    
    // Definimos el manejador para cambios en el mediaQueryList
    const updateMatches = () => setMatches(media.matches);
    
    // Añadimos el event listener
    // Usando addListener o addEventListener según el navegador
    if (media.addEventListener) {
      media.addEventListener('change', updateMatches);
    } else {
      // Para compatibilidad con navegadores más antiguos
      // @ts-ignore - ya que es una API obsoleta
      media.addListener(updateMatches);
    }
    
    // Limpieza para evitar memory leaks
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', updateMatches);
      } else {
        // @ts-ignore - ya que es una API obsoleta
        media.removeListener(updateMatches);
      }
    };
  }, [query]); // Solo query, no matches para evitar loops
  
  return matches;
}
