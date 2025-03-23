import React from "react";
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveMapContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fixedHeight?: boolean;
  aspectRatio?: "square" | "video" | "wide" | "ultra-wide" | "custom";
  customRatio?: string;
}

export function ResponsiveMapContainer({ 
  children, 
  className,
  style,
  fixedHeight = false,
  aspectRatio = "video", // Default 16:9
  customRatio,
}: ResponsiveMapContainerProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Determine padding-bottom based on aspect ratio
  let paddingBottom = "56.25%"; // Default 16:9 (video)
  
  if (aspectRatio === "square") {
    paddingBottom = "100%"; // 1:1
  } else if (aspectRatio === "wide") {
    paddingBottom = "41.84%"; // 21:9 (widescreen)
  } else if (aspectRatio === "ultra-wide") {
    paddingBottom = "32.25%"; // 32:9 (ultra-wide)
  } else if (aspectRatio === "custom" && customRatio) {
    paddingBottom = customRatio;
  }
  
  if (fixedHeight) {
    // Fixed height for different devices
    let height = '550px';
    
    if (isMobile) {
      height = '350px';
    } else if (isTablet) {
      height = '450px';
    }
    
    return (
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden shadow-sm w-full",
          className
        )}
        style={{
          ...style,
          height
        }}
      >
        {children}
      </div>
    );
  }
  
  // Responsive with aspect ratio
  return (
    <div 
      className={cn("relative w-full", className)} 
      style={{ 
        paddingBottom, 
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