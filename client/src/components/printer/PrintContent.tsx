import React, { useEffect, useRef } from 'react';

interface PrintContentProps {
  children: React.ReactNode;
  onAfterPrint?: () => void;
}

/**
 * Componente que encapsula contenido para impresión
 * Se encarga de manejar los estilos y de llamar a window.print()
 */
export const PrintContent: React.FC<PrintContentProps> = ({ children, onAfterPrint }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Añadimos una pequeña demora para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      if (contentRef.current) {
        console.log('[PrintContent] Iniciando impresión');
        
        // Crear una hoja de estilo específica para impresión
        const style = document.createElement('style');
        style.textContent = `
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body * { visibility: hidden; }
            #print-content, #print-content * { visibility: visible; }
            #print-content { 
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm; 
              padding: 5mm 2mm;
            }
          }
        `;
        document.head.appendChild(style);
        
        // Llamar a la función de impresión
        window.print();
        
        // Remover el estilo después de imprimir
        document.head.removeChild(style);
        
        console.log('[PrintContent] Finalizando impresión');
        
        // Llamar al callback después de la impresión
        if (onAfterPrint) {
          onAfterPrint();
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [onAfterPrint]);
  
  return (
    <div 
      id="print-content" 
      ref={contentRef}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: '80mm',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
};