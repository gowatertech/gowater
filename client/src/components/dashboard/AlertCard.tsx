import React from "react";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertItem {
  id: string;
  type: "warning" | "info" | "success";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertCardProps {
  alerts: AlertItem[];
}

export function AlertCard({ alerts }: AlertCardProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Mapeo de colores según el tipo de alerta
  const typeStyles = {
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      icon: AlertCircle,
      iconColor: "text-yellow-600 dark:text-yellow-400"
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      icon: Clock,
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      icon: CheckCircle,
      iconColor: "text-green-600 dark:text-green-400"
    }
  };

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const { bg, icon: Icon, iconColor } = typeStyles[alert.type];
        
        return (
          <li 
            key={alert.id}
            className={`flex items-center justify-between p-2 ${bg} rounded-md`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <span className="text-sm">{alert.message}</span>
            </div>
            
            {alert.action && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={alert.action.onClick}
              >
                {alert.action.label}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}