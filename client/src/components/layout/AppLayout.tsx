import { type ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import useRealtimeDashboard from "@/hooks/useRealtimeDashboard";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { NotificationComposeModal } from "@/components/notifications/NotificationComposeModal";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Only show notifications for PO, Headmaster, ClassTeacher
  const showNotifications = user?.role === "PO" || user?.role === "Headmaster" || user?.role === "ClassTeacher";

  const { data: unreadCountData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread-count");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: showNotifications,
  });

  const { data: notificationsData, refetch } = useQuery({
    queryKey: ["/api/notifications/by-role"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/by-role");
      return res.json();
    },
    enabled: showNotifications && notificationsOpen,
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.count || 0;

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
                <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      <div className="flex gap-2">
                        {(user?.role === "PO" || user?.role === "Headmaster") && (
                          <NotificationComposeModal>
                            <Button variant="ghost" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </NotificationComposeModal>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNotificationsOpen(false);
                            setLocation("/notifications");
                          }}
                        >
                          View All
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-96">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No notifications
                        </div>
                      ) : (
                        <div className="divide-y">
                          {notifications.slice(0, 5).map((notif: any) => (
                            <div
                              key={notif.id}
                              className={`p-4 hover:bg-muted/50 cursor-pointer ${!notif.isRead ? 'bg-blue-50' : ''}`}
                              onClick={async () => {
                                if (!notif.isRead) {
                                  try {
                                    await apiRequest("PATCH", "/api/notifications/mark-read", { notificationId: notif.id });
                                    refetch();
                                  } catch (error) {
                                    console.error("Failed to mark notification as read:", error);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`h-2 w-2 rounded-full mt-2 ${!notif.isRead ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{notif.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(notif.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
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
