import React from 'react';
import ReactDOM from 'react-dom';

interface PrintContentProps {
  children: React.ReactNode;
  onAfterPrint?: () => void;
}

/**
 * Componente que maneja la impresión de contenido aislado
 * Renderiza el contenido en un portal fuera del DOM principal
 * y lanza window.print() automáticamente
 */
export const PrintContent: React.FC<PrintContentProps> = ({ children, onAfterPrint }) => {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Activar impresión cuando el componente se monta
  React.useEffect(() => {
    setIsPrinting(true);
  }, []);

  // Manejar la impresión cuando isPrinting cambia a true
  React.useEffect(() => {
    if (isPrinting) {
      console.log('[PrintContent] Iniciando impresión...');
      
      // Pequeño timeout para asegurarse de que el contenido está renderizado
      setTimeout(() => {
        console.log('[PrintContent] Ejecutando window.print()');
        window.print();
        
        // Esperar a que la impresión termine antes de notificar
        setTimeout(() => {
          console.log('[PrintContent] Impresión completada');
          setIsPrinting(false);
          if (onAfterPrint) onAfterPrint();
        }, 500);
      }, 300);
    }
  }, [isPrinting, onAfterPrint]);

  // Si no estamos imprimiendo, no renderizar nada
  if (!isPrinting) return null;

  // Crear portal para la impresión
  return ReactDOM.createPortal(
    <div 
      className="print-container"
      ref={contentRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        backgroundColor: 'white',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 0;
              margin: 0;
            }
            @page {
              size: 80mm auto; 
              margin: 0;
            }
          }
        `}
      </style>
      <div 
        className="print-content" 
        style={{
          width: '80mm',
          padding: '10px',
          backgroundColor: 'white'
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default PrintContent;