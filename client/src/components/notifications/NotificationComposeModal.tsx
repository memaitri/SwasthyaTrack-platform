import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface NotificationComposeModalProps {
  children: React.ReactNode;
}

export function NotificationComposeModal({ children }: NotificationComposeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    receiverRole: "",
    receiverSchoolId: "",
    receiverClassSection: "",
    type: "manual",
    title: "",
    message: "",
    isImportant: false,
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/notifications/create", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
      setOpen(false);
      setFormData({
        receiverRole: "",
        receiverSchoolId: "",
        receiverClassSection: "",
        type: "manual",
        title: "",
        message: "",
        isImportant: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.receiverRole || !formData.title || !formData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    sendNotificationMutation.mutate(formData);
  };

  const canSendToRole = (role: string) => {
    if (user?.role === "Admin") return true;
    if (user?.role === "PO" && (role === "Headmaster" || role === "MedicalTeam")) return true;
    if (user?.role === "Headmaster" && role === "ClassTeacher") return true;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receiverRole">Send to Role *</Label>
            <Select
              value={formData.receiverRole}
              onValueChange={(value) => setFormData({ ...formData, receiverRole: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient role" />
              </SelectTrigger>
              <SelectContent>
                {["Headmaster", "ClassTeacher", "MedicalTeam"].map((role) => (
                  <SelectItem key={role} value={role} disabled={!canSendToRole(role)}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Notification Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Message</SelectItem>
                <SelectItem value="system">System Alert</SelectItem>
                <SelectItem value="health_alert">Health Alert</SelectItem>
                <SelectItem value="meal_alert">Meal Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter notification title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter notification message"
              rows={4}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isImportant"
              checked={formData.isImportant}
              onCheckedChange={(checked) => setFormData({ ...formData, isImportant: checked as boolean })}
            />
            <Label htmlFor="isImportant">Mark as important</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendNotificationMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}