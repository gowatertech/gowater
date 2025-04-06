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
}

export function KPICard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  onClick 
}: KPICardProps) {
  const { t } = useTranslation();
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`} 
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
            {trend && (
              <div className={`flex items-center mt-1 text-xs ${
                trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full flex-shrink-0 ml-2">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}