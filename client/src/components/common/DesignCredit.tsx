import React from "react";
import { Palette } from "lucide-react";

/**
 * Componente que muestra el crédito del diseñador en la parte inferior derecha de la pantalla
 * como un elemento fijo en todas las páginas.
 */
export function DesignCredit() {
  return (
    <div className="fixed bottom-16 right-2 z-40 px-2 py-1 bg-background/80 backdrop-blur-sm text-center border rounded-md text-xs text-muted-foreground font-medium flex items-center gap-1 shadow-sm">
      <Palette size={12} className="text-primary" />
      <span>Design by Wally Moya</span>
    </div>
  );
}