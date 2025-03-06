
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveMapContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ResponsiveMapContainer({ 
  children, 
  className,
  style,
  ...props 
}: ResponsiveMapContainerProps) {
  const isMobile = useIsMobile();
  
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm w-full map-container-responsive",
        isMobile ? "h-[30vh] max-h-[250px]" : "h-[50vh] max-h-[500px]",
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
