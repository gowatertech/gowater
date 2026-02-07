import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [openMobile, setOpenMobile] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    console.log("DashboardLayout - Current location:", location);
  }, [location]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gray-50">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-4 z-50 md:hidden bg-white/90 backdrop-blur-sm shadow-md hover:bg-white border border-gray-200 rounded-lg"
          onClick={() => setOpenMobile(!openMobile)}
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </Button>

        <Sidebar openMobile={openMobile} setOpenMobile={setOpenMobile} />

        <SidebarInset>
          <ScrollArea className="h-full">
            <div className="container mx-auto py-8 px-4 md:py-6 md:px-6">
              <DashboardHeader title="Panel de Control" />
              {children}
            </div>
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
