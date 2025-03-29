import React, { useEffect, useState } from "react";
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveMapContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  fixedHeight?: boolean;
  fullHeight?: boolean;
  aspectRatio?: "square" | "video" | "wide" | "ultra-wide" | "custom";
  customRatio?: string;
  minHeight?: string;
}

export function ResponsiveMapContainer({ 
  children, 
  className,
  style,
  fixedHeight = false,
  fullHeight = false,
  aspectRatio = "video", // Default 16:9
  customRatio,
  minHeight,
}: ResponsiveMapContainerProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const [windowHeight, setWindowHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  
  // Add window resize listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
  
  if (fullHeight) {
    // Dynamically calculate height based on viewport
    const calculatedHeight = isMobile 
      ? `${windowHeight * 0.5}px` // 50% of viewport on mobile
      : isTablet 
        ? `${windowHeight * 0.6}px` // 60% of viewport on tablet
        : `${windowHeight * 0.7}px`; // 70% of viewport on desktop
    
    return (
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden shadow-sm w-full responsive-map-container",
          className
        )}
        style={{
          ...style,
          height: calculatedHeight,
          minHeight: minHeight || (isMobile ? '300px' : '400px')
        }}
      >
        {children}
      </div>
    );
  }
  
  if (fixedHeight) {
    // Fixed height for different devices - reduciendo las alturas
    let height = '400px';
    
    if (isMobile) {
      height = '250px';
    } else if (isTablet) {
      height = '300px';
    }
    
    return (
      <div 
        className={cn(
          "relative rounded-lg overflow-hidden shadow-sm w-full responsive-map-container",
          className
        )}
        style={{
          ...style,
          height,
          minHeight: minHeight || '200px'
        }}
      >
        {children}
      </div>
    );
  }
  
  // Responsive with aspect ratio
  return (
    <div 
      className={cn("relative w-full responsive-map-container", className)} 
      style={{ 
        paddingBottom, 
        ...style,
        minHeight: minHeight
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