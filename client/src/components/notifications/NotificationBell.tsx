import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  FileText,
  Share2,
  Clock,
  User,
  Eye,
  Download
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isImportant: boolean;
  createdAt: string;
  metadata?: any;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // Get notifications including shared reports
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications?limit=20");
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get unread count
  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread-count");
      return res.json();
    },
    refetchInterval: 30000
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      try {
        await apiRequest("PUT", `/api/notifications/${notification.id}/read`);
        // Refresh notifications
        // queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Handle shared report notifications
    if (notification.metadata?.reportId) {
      try {
        const res = await apiRequest("GET", `/api/reports/shared/${notification.metadata.reportId}`);
        const reportData = await res.json();
        console.log("Shared report data:", reportData);
        // In production, open the report in a modal or new tab
      } catch (error) {
        console.error("Failed to access shared report:", error);
      }
    }
  };

  const notificationsList = notifications?.notifications || [];
  const unreadCountValue = unreadCount?.count || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCountValue > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCountValue > 99 ? "99+" : unreadCountValue}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Notifications {unreadCountValue > 0 && `(${unreadCountValue} unread)`}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notificationsList.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-1">
                  {notificationsList.map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.title.includes('Shared Report') ? (
                            <Share2 className="h-4 w-4 text-blue-500" />
                          ) : notification.type === 'health_alert' ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <Bell className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          {notificationsList.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to notifications page or shared reports
                    window.location.href = '#shared-reports';
                  }}
                >
                  View All Notifications
                </Button>
              </div>
            </>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;