import React from "react";
import { useLocation } from "wouter";

interface CenteredLogoProps {
  size?: "small" | "medium" | "large";
  showName?: boolean;
  companyName?: string;
}

/**
 * Componente que muestra el logo de GoWater centrado en la pantalla
 * como una superposición fija.
 */
export function CenteredLogo({
  size = "medium",
  showName = true,
  companyName = "GoWater",
}: CenteredLogoProps) {
  const [location] = useLocation();
  
  // No mostrar el logo en rutas de la aplicación móvil
  const isMobileApp = location.startsWith("/mobile-app");
  if (isMobileApp) return null;
  
  // Tamaños del logo basados en la prop size
  const logoSizes = {
    small: "h-12 w-12",
    medium: "h-16 w-16",
    large: "h-20 w-20",
  };

  // Tamaños del texto basados en la prop size
  const textSizes = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-xl",
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 -translate-y-8">
      <div className="flex flex-col items-center justify-center">
        {/* Logo SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className={`${logoSizes[size]} opacity-50`}
        >
          {/* Fondo circular */}
          <circle cx="256" cy="256" r="256" fill="#2563eb" />
          
          {/* Icono de gota de agua */}
          <path
            d="M256 96c-48 96-160 128-160 208 0 88 64 112 160 112s160-24 160-112c0-80-112-112-160-208z"
            fill="#ffffff"
          />
          
          {/* Detalles internos de la gota */}
          <path
            d="M304 304c0 26.5-21.5 48-48 48s-48-21.5-48-48 21.5-48 48-48 48 21.5 48 48z"
            fill="#2563eb"
          />
        </svg>

        {/* Nombre de la empresa */}
        {showName && (
          <div className={`${textSizes[size]} font-bold text-primary opacity-50 mt-1`}>
            {companyName}
          </div>
        )}
      </div>
    </div>
  );
}