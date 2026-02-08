import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Eye
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
  const queryClient = useQueryClient();

  // Get notifications including stored notifications from database
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ["/api/notifications/by-role"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/by-role?limit=20");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: true, // Ensure query is enabled
    retry: 1 // Retry once on failure
  });

  // Get unread count
  const { data: unreadCount } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread-count");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: true, // Ensure query is enabled
    retry: 1 // Retry once on failure
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-read", { notificationId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/by-role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    }
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read and it's a stored notification (has proper ID format)
    if (!notification.isRead && !notification.id.startsWith('card-') && !notification.id.startsWith('no-card-')) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle shared report notifications
    // Note: Shared report functionality has been removed
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
              ) : error ? (
                <div className="p-4 text-center text-sm text-red-500">
                  Error loading notifications: {error.message}
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
                    // Navigate to notifications page
                    window.location.href = '/notifications';
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