import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl"

const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
}

export function useBreakpoint(breakpoint: Breakpoint = "md") {
  const [isBelow, setIsBelow] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const breakpointValue = BREAKPOINTS[breakpoint]
    const mql = window.matchMedia(`(max-width: ${breakpointValue - 1}px)`)

    const onChange = () => {
      setIsBelow(window.innerWidth < breakpointValue)
    }

    mql.addEventListener("change", onChange)
    setIsBelow(window.innerWidth < breakpointValue)

    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return {
    isBelow,
    isAbove: isBelow === undefined ? undefined : !isBelow
  }
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);

    // Llamada inicial para establecer el valor correcto
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}

export function useIsTablet() {
  const { isBelow: isBelowLg } = useBreakpoint("lg")
  const { isBelow: isBelowMd } = useBreakpoint("md")
  return !!isBelowLg && !isBelowMd
}

export function useIsDesktop() {
  const { isAbove } = useBreakpoint("lg")
  return !!isAbove
}
import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Llamada inicial para establecer el estado correcto

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
};
