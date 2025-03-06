
import React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  showOn?: "xs" | "sm" | "md" | "lg" | "xl" | "mobile" | "desktop" | "all"
  hideOn?: "xs" | "sm" | "md" | "lg" | "xl" | "mobile" | "desktop" | "none"
}

export function ResponsiveDisplay({
  children,
  showOn = "all",
  hideOn = "none",
  className,
  ...props
}: ResponsiveDisplayProps) {
  // Mapeo de reglas de visibilidad
  const showRules = {
    xs: "block",
    sm: "hidden sm:block",
    md: "hidden md:block",
    lg: "hidden lg:block",
    xl: "hidden xl:block",
    mobile: "block md:hidden",
    desktop: "hidden md:block",
    all: "block",
  }

  const hideRules = {
    xs: "hidden xs:block",
    sm: "sm:hidden",
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
    mobile: "md:block hidden",
    desktop: "md:hidden",
    none: "",
  }

  return (
    <div
      className={cn(
        showRules[showOn],
        hideRules[hideOn],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Componentes de conveniencia
export function MobileOnly({ children, className, ...props }: Omit<ResponsiveDisplayProps, "showOn" | "hideOn">) {
  return (
    <ResponsiveDisplay showOn="mobile" hideOn="desktop" className={className} {...props}>
      {children}
    </ResponsiveDisplay>
  )
}

export function DesktopOnly({ children, className, ...props }: Omit<ResponsiveDisplayProps, "showOn" | "hideOn">) {
  return (
    <ResponsiveDisplay showOn="desktop" hideOn="mobile" className={className} {...props}>
      {children}
    </ResponsiveDisplay>
  )
}
