import { type ReactNode } from "react";
import useRealtimeDashboard from "@/hooks/useRealtimeDashboard";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationComposeModal } from "@/components/notifications/NotificationComposeModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user } = useAuth();

  // Only show notifications for PO, Headmaster, ClassTeacher
  const showNotifications = user?.role === "PO" || user?.role === "Headmaster" || user?.role === "ClassTeacher";

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Enable realtime subscriptions for dashboard roles
  useRealtimeDashboard(!!user && (user.role === "PO" || user.role === "Headmaster" || user.role === "ClassTeacher"));

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 border-b bg-background px-4 h-14 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:flex">
                <Brand variant="small" showTagline={false} />
              </div>
              {title && (
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showNotifications && (
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  {(user?.role === "PO" || user?.role === "Headmaster") && (
                    <NotificationComposeModal>
                      <Button variant="ghost" size="sm">
                        <Send className="h-4 w-4" />
                      </Button>
                    </NotificationComposeModal>
                  )}
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}