import React from "react";
import { Palette } from "lucide-react";

/**
 * Componente que muestra el crédito del diseñador en la parte inferior derecha de la pantalla
 * como un elemento fijo en todas las páginas.
 */
export function DesignCredit() {
  return (
    <div className="fixed bottom-0 right-0 z-40 px-3 py-1 bg-background/80 backdrop-blur-sm text-center border-t border-l rounded-tl-md text-xs text-muted-foreground font-medium flex items-center gap-1.5 shadow-sm">
      <Palette size={13} className="text-primary" />
      <span>Design by Wally Moya</span>
    </div>
  );
}