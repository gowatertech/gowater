import { useTheme, themeValues, WaterTheme } from "@/hooks/use-theme";
import { Droplet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ThemeSwitcher() {
  const { theme, setTheme, applyTheme } = useTheme();
  
  const handleSelectTheme = (themeKey: WaterTheme) => {
    setTheme(themeKey);
    applyTheme();
  };
  
  return (
    <div className="p-2">
      <div className="mb-2 px-2 pb-2 border-b">
        <h4 className="text-sm font-medium">Temas GoWater</h4>
        <p className="text-xs text-muted-foreground">Selecciona un tema inspirado en agua</p>
      </div>
      
      <div className="grid grid-cols-1 gap-1">
        {Object.entries(themeValues).map(([key, value]) => {
          const themeKey = key as WaterTheme;
          const isSelected = theme === themeKey;
          
          return (
            <button
              key={key}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left",
                isSelected ? "bg-primary/10" : "hover:bg-muted"
              )}
              onClick={() => handleSelectTheme(themeKey)}
            >
              <div 
                className="h-5 w-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: value.primary }}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span>{value.name}</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-2 px-2 pt-2 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs"
          onClick={() => window.location.href = '/settings'}
        >
          Más configuraciones de tema
        </Button>
      </div>
    </div>
  );
}