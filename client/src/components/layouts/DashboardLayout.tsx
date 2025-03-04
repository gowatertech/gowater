import { Sidebar } from "./Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-background">
        <ScrollArea className="h-full">
          <div className="container mx-auto py-8 px-4">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
