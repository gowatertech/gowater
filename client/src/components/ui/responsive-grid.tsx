
import React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: string
}

export function ResponsiveGrid({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = "gap-4",
  className,
  ...props
}: ResponsiveGridProps) {
  // Generar clases de columnas basadas en los breakpoints
  const columnClasses = Object.entries(columns)
    .map(([breakpoint, count]) => {
      if (breakpoint === "xs") return `grid-cols-${count}`
      return `${breakpoint}:grid-cols-${count}`
    })
    .join(" ")

  return (
    <div
      className={cn("grid", columnClasses, gap, className)}
      {...props}
    >
      {children}
    </div>
  )
}
