import React from "react";

interface ResponsiveMapContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveMapContainer({ 
  children, 
  className,
  style
}: ResponsiveMapContainerProps) {
  return (
    <div 
      className={`relative w-full ${className || ""}`} 
      style={{ 
        paddingBottom: "56.25%", // Proporción 16:9 más compacta 
        ...style 
      }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-full rounded-md overflow-hidden border border-border shadow-sm"
      >
        {children}
      </div>
    </div>
  );
}