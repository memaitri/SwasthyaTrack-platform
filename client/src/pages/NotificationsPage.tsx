import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotificationComposeModal } from "@/components/notifications/NotificationComposeModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bell, CheckCircle, AlertTriangle, Utensils, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    isRead: undefined as boolean | undefined,
    type: undefined as string | undefined,
  });

  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ["/api/notifications/by-role", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.isRead !== undefined) params.append("isRead", filters.isRead.toString());
      if (filters.type) params.append("type", filters.type);
      const res = await apiRequest("GET", `/api/notifications/by-role?${params}`);
      return res.json();
    },
    retry: 1 // Retry once on failure
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-read", { notificationId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/by-role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-all-read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/by-role"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const canSendNotifications = user?.role === "PO" || user?.role === "Headmaster";

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "system":
        return <Bell className="h-4 w-4" />;
      case "health_alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "meal_alert":
        return <Utensils className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "system":
        return "bg-blue-100 text-blue-800";
      case "health_alert":
        return "bg-red-100 text-red-800";
      case "meal_alert":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user || (user.role !== "PO" && user.role !== "Headmaster" && user.role !== "ClassTeacher")) {
    return (
      <AppLayout title="Notifications">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">You don't have access to notifications.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Notifications">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Manage your notifications and messages</p>
          </div>
          {canSendNotifications && (
            <NotificationComposeModal>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </NotificationComposeModal>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="unreadOnly"
              checked={filters.isRead === false}
              onCheckedChange={(checked) => setFilters({ ...filters, isRead: checked ? false : undefined })}
            />
            <label htmlFor="unreadOnly" className="text-sm">Unread only</label>
          </div>

          <Select
            value={filters.type || "all"}
            onValueChange={(value) => setFilters({ ...filters, type: value === "all" ? undefined : value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="manual">Manual Messages</SelectItem>
              <SelectItem value="system">System Alerts</SelectItem>
              <SelectItem value="health_alert">Health Alerts</SelectItem>
              <SelectItem value="meal_alert">Meal Alerts</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="ml-auto"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Your Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading notifications...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                Error loading notifications: {error.message}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications found
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${!notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {notification.isImportant && (
                              <Badge variant="destructive" className="text-xs">Important</Badge>
                            )}
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                disabled={markAsReadMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark as Read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}