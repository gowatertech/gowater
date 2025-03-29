import React from "react";
import { cn } from "@/lib/utils";

interface WaterProgressBarProps {
  progress: number; // De 0 a 100
  total: number;
  completed: number;
  className?: string;
  darkMode?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function WaterProgressBar({
  progress,
  total,
  completed,
  className,
  darkMode = false,
  showPercentage = true,
  size = "md",
  label
}: WaterProgressBarProps) {
  const heightClass = 
    size === "sm" ? "h-2" : 
    size === "lg" ? "h-6" : 
    "h-4";
  
  // Aseguramos que el progreso esté entre 0 y 100
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {showPercentage && (
            <span className="text-sm font-medium text-muted-foreground">
              {completed} / {total} ({Math.round(safeProgress)}%)
            </span>
          )}
        </div>
      )}
      <div className={cn(
        "relative w-full overflow-hidden rounded-full bg-primary/10",
        heightClass
      )}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-in-out",
            "bg-gradient-to-r from-blue-300 to-blue-500 relative animate-pulse"
          )}
          style={{ width: `${safeProgress}%` }}
        >
          {/* Efecto de onda en la parte superior */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={cn(
              "absolute inset-0 animate-wave",
              darkMode ? "opacity-20" : "opacity-30"
            )}>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}