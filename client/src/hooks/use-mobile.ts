
import { useState, useEffect } from 'react';
import useMediaQuery from './use-media-query';

// Definición de breakpoints
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

const breakpoints = {
  xs: 480,  // Extra small devices (phones)
  sm: 640,  // Small devices (large phones, small tablets)
  md: 768,  // Medium devices (tablets)
  lg: 1024, // Large devices (desktops)
  xl: 1280  // Extra large devices (large desktops)
};

/**
 * Hook para detectar si la pantalla es menor que un breakpoint específico
 * Usa el hook mejorado useMediaQuery para mayor fiabilidad
 */
export function useBreakpoint(breakpoint: Breakpoint = "md") {
  return useMediaQuery(`(max-width: ${breakpoints[breakpoint] - 1}px)`);
}

/**
 * Hook para detectar si es un dispositivo móvil (< 768px)
 */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`);
}

/**
 * Hook para detectar si es un tablet (< 1024px pero >= 768px)
 */
export function useIsTablet() {
  return useMediaQuery(`(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`);
}

/**
 * Hook para detectar si es un escritorio (>= 1024px)
 */
export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
}
