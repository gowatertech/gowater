import { useState } from "react";
import { useTheme, themeValues, WaterTheme } from "@/hooks/use-theme";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Droplet, Moon, Sun, Monitor, Check } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function ThemeSelector() {
  const { 
    theme: currentTheme, 
    appearance: currentAppearance, 
    radius: currentRadius,
    setTheme, 
    setAppearance, 
    setRadius, 
    applyTheme 
  } = useTheme();
  
  // Estados locales para preview antes de aplicar
  const [selectedTheme, setSelectedTheme] = useState<WaterTheme>(currentTheme);
  const [selectedAppearance, setSelectedAppearance] = useState<'light' | 'dark' | 'system'>(currentAppearance);
  const [selectedRadius, setSelectedRadius] = useState<number>(currentRadius);
  
  // Verificar si se han realizado cambios
  const hasChanges = currentTheme !== selectedTheme || 
                     currentAppearance !== selectedAppearance || 
                     currentRadius !== selectedRadius;
  
  // Manejar cambio de tema
  const handleThemeChange = (theme: WaterTheme) => {
    setSelectedTheme(theme);
    setTheme(theme);
  };
  
  // Manejar cambio de apariencia
  const handleAppearanceChange = (appearance: 'light' | 'dark' | 'system') => {
    setSelectedAppearance(appearance);
    setAppearance(appearance);
  };
  
  // Manejar cambio de radio
  const handleRadiusChange = (value: number[]) => {
    const radius = value[0];
    setSelectedRadius(radius);
    setRadius(radius);
  };
  
  // Aplicar cambios
  const handleApplyChanges = () => {
    applyTheme();
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Personalización de Tema</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Personaliza la apariencia de GoWater con temas inspirados en agua.
            </p>
          </div>
          
          <Tabs defaultValue="themes" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="themes">Temas</TabsTrigger>
              <TabsTrigger value="appearance">Apariencia</TabsTrigger>
              <TabsTrigger value="radius">Bordes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="themes" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(themeValues).map(([key, value]) => {
                  const themeKey = key as WaterTheme;
                  const isSelected = selectedTheme === themeKey;
                  
                  return (
                    <div 
                      key={key}
                      className={`
                        border rounded-lg p-4 cursor-pointer relative overflow-hidden transition-all
                        ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}
                      `}
                      onClick={() => handleThemeChange(themeKey)}
                    >
                      {/* Indicador de selección */}
                      {isSelected && (
                        <Badge className="absolute top-2 right-2 bg-primary">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      )}
                      
                      {/* Color preview */}
                      <div 
                        className="h-16 rounded-md mb-3 relative overflow-hidden"
                        style={{ 
                          backgroundColor: value.primary,
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' style='fill: rgba(255, 255, 255, 0.2);'/%3E%3C/svg%3E\")",
                          backgroundSize: "cover",
                          backgroundPosition: "center" 
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Droplet className="h-8 w-8 text-white drop-shadow-md" />
                        </div>
                      </div>
                      
                      {/* Información del tema */}
                      <h4 className="font-medium">{value.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{value.description}</p>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="appearance">
              <RadioGroup 
                defaultValue={selectedAppearance}
                onValueChange={(value) => handleAppearanceChange(value as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem 
                    value="light" 
                    id="light" 
                    className="peer sr-only" 
                    aria-label="Modo claro"
                  />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Claro</span>
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem 
                    value="dark" 
                    id="dark" 
                    className="peer sr-only" 
                    aria-label="Modo oscuro"
                  />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Oscuro</span>
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem 
                    value="system" 
                    id="system" 
                    className="peer sr-only" 
                    aria-label="Usar configuración del sistema"
                  />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Monitor className="mb-3 h-6 w-6" />
                    <span className="text-sm font-medium">Sistema</span>
                  </Label>
                </div>
              </RadioGroup>
            </TabsContent>
            
            <TabsContent value="radius">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="radius">Radio de bordes: {selectedRadius.toFixed(1)}</Label>
                  <Slider
                    id="radius"
                    min={0}
                    max={2}
                    step={0.1}
                    defaultValue={[selectedRadius]}
                    onValueChange={handleRadiusChange}
                    aria-label="Seleccionar radio de bordes"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <div 
                      className="border w-full h-16 rounded-none bg-primary/10"
                      style={{ borderRadius: '0rem' }}
                    ></div>
                    <span className="text-xs text-center block">Sin bordes</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div 
                      className="border w-full h-16 bg-primary/10"
                      style={{ borderRadius: `${selectedRadius}rem` }}
                    ></div>
                    <span className="text-xs text-center block">Seleccionado</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div 
                      className="border w-full h-16 rounded-full bg-primary/10"
                      style={{ borderRadius: '9999px' }}
                    ></div>
                    <span className="text-xs text-center block">Máximo</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleApplyChanges}
              disabled={!hasChanges}
            >
              Aplicar cambios
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}