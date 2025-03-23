import React from "react";

interface ResponsiveMapContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveMapContainer({ 
  children, 
  className = "",
  style = {}
}: ResponsiveMapContainerProps) {
  return (
    <div 
      className={`w-full relative ${className}`} 
      style={{ 
        height: "400px", 
        ...style 
      }}
    >
      {children}
    </div>
  );
}