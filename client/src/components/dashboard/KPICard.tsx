import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface KPICardProps { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
  color?: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-600 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-600 dark:text-purple-400" },
};

export function KPICard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  onClick,
  color
}: KPICardProps) {
  const { t } = useTranslation();
  const colors = colorMap[color || "blue"] || colorMap.blue;
  
  return (
    <Card 
      className={`rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] ${onClick ? 'cursor-pointer' : ''}`} 
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
            {trend && (
              <div className={`flex items-center mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                trendUp 
                  ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/40' 
                  : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/40'
              }`}>
                {trendUp ? (
                  <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                ) : (
                  <TrendingUp className="h-3 w-3 mr-1 transform rotate-180 flex-shrink-0" />
                )}
                <span className="truncate">{trend} {t("vs anterior")}</span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 ${colors.bg}`}>
            {React.cloneElement(icon as React.ReactElement, {
              className: `h-5 w-5 sm:h-6 sm:w-6 ${colors.text}`
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
