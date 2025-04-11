import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [open, setOpen] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <SidebarProvider 
      defaultOpen={true} 
      open={open} 
      onOpenChange={setOpen}
    >
      <div className="flex min-h-screen bg-background">
        {/* Botón de menú móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-4 z-50 md:hidden"
          onClick={() => setOpenMobile(!openMobile)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Sidebar */}
        <Sidebar openMobile={openMobile} setOpenMobile={setOpenMobile} />

        {/* Contenido principal */}
        <SidebarInset>
          <ScrollArea className="h-full">
            <div className="container mx-auto py-8 px-4 md:py-6 md:px-6">
              {children}
            </div>
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}