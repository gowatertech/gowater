import { ArrowLeft, Bell, RefreshCw, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { User } from "@/hooks/use-current-user";
import { formatTodayCompactRD } from "@/lib/date-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackButtonClick?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  companyName?: string;
  user?: User | null;
  onSyncData?: () => Promise<void> | void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBackButton = false,
  onBackButtonClick,
  darkMode = false,
  onToggleDarkMode,
  companyName,
  user,
  onSyncData
}) => {
  const isDetailView = !!title;
  
  const getInitials = () => {
    if (user && user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="mobile-header sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 text-white shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBackButtonClick}
                className="h-9 w-9 rounded-xl text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : user ? (
              <Avatar className="h-10 w-10 border-2 border-white/30 shadow-md">
                <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            ) : null}
            
            <div>
              {isDetailView ? (
                <h1 className="font-bold text-base">{title}</h1>
              ) : (
                <>
                  {user && (
                    <h1 className="font-bold text-base leading-tight">
                      Hola, {user.name?.split(' ')[0]}
                    </h1>
                  )}
                  {companyName && (
                    <p className="text-blue-200 text-xs">{companyName}</p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {onToggleDarkMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleDarkMode}
                className="h-9 w-9 rounded-xl text-white hover:bg-white/20"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}

            {onSyncData && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSyncData}
                className="h-9 w-9 rounded-xl text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            
            <OfflineSyncIndicator 
              driverId={user?.id}
              darkMode={true}
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-white hover:bg-white/20 relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-400 rounded-full border border-white/50" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
