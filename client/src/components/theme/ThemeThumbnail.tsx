import { useTheme, themeValues } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Droplet } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

export function ThemeThumbnail() {
  const { theme } = useTheme();
  const themeInfo = themeValues[theme];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
          <div 
            className="h-4 w-4 rounded-full mr-1"
            style={{ backgroundColor: themeInfo.primary }}
          ></div>
          <span className="text-xs">{themeInfo.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="end">
        <ThemeSwitcher />
      </PopoverContent>
    </Popover>
  );
}