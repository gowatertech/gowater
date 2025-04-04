import React from "react";
import { ArrowLeft, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackButtonClick?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  companyName?: string; // Añadido nombre de la empresa
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBackButton = false,
  onBackButtonClick,
  darkMode = false,
  onToggleDarkMode,
  companyName
}) => {
  return (
    <header className={`sticky top-0 z-10 p-4 shadow-sm border-b ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackButtonClick}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div>
            {companyName && (
              <h2 className="text-sm font-semibold text-primary">{companyName}</h2>
            )}
            <h1 className="font-bold text-lg">{title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onToggleDarkMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDarkMode}
              className="h-8 w-8"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};