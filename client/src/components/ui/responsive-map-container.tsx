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
        paddingBottom: "75%", // Proporción 4:3 
        ...style 
      }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-full rounded-md overflow-hidden border border-border"
      >
        {children}
      </div>
    </div>
  );
}