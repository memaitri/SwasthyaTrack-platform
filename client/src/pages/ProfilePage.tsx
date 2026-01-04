import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { User, Save, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: async () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      // Update auth context
      const updatedRes = await apiRequest("GET", "/api/profile");
      const updated = await updatedRes.json();
      localStorage.setItem("user", JSON.stringify(updated));
      window.location.reload(); // Refresh to update auth context
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  if (profile && !formData.fullName) {
    setFormData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      username: profile.username || "",
    });
  }

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AppLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              View and edit your profile details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{profile?.fullName || "User"}</h3>
                <p className="text-sm text-muted-foreground">{profile?.role || ""}</p>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                {isEditing ? (
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-foreground">{profile?.username || "N/A"}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-foreground">{profile?.fullName || "N/A"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-foreground">{profile?.email || "N/A"}</p>
                )}
              </div>

              <div>
                <Label>Role</Label>
                <p className="mt-1 text-sm text-foreground">{profile?.role || "N/A"}</p>
                <p className="text-xs text-muted-foreground mt-1">Role cannot be changed</p>
              </div>

              {profile?.schoolId && (
                <div>
                  <Label>School</Label>
                  <p className="mt-1 text-sm text-foreground">{profile?.schoolName || "N/A"}</p>
                </div>
              )}

              {profile?.classSection && (
                <div>
                  <Label>Assigned Class</Label>
                  <p className="mt-1 text-sm text-foreground">{profile.classSection}</p>
                </div>
              )}

              {profile?.district && (
                <div>
                  <Label>District</Label>
                  <p className="mt-1 text-sm text-foreground">{profile.district}</p>
                </div>
              )}

              {profile?.block && (
                <div>
                  <Label>Block</Label>
                  <p className="mt-1 text-sm text-foreground">{profile.block}</p>
                </div>
              )}

              {profile?.region && (
                <div>
                  <Label>Region</Label>
                  <p className="mt-1 text-sm text-foreground">{profile.region}</p>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      fullName: profile?.fullName || "",
                      email: profile?.email || "",
                      username: profile?.username || "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

