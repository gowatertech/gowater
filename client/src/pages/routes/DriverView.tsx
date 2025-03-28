/* 
 * Este archivo es un componente de redirección para mantener la compatibilidad
 * con la ruta existente /routes/driver-view. El componente real está en /pages/drivers
 */

/**
 * Esta es simplemente una redirección al componente real en /pages/drivers/DriverView
 */
import DriverViewComponent from "@/pages/drivers/DriverView";

export default function DriverView() {
  return <DriverViewComponent />;
}