
import * as React from "react"

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl"

const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
}

export function useBreakpoint(breakpoint: Breakpoint = "md") {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
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
  const { isBelow } = useBreakpoint("md")
  return !!isBelow
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
