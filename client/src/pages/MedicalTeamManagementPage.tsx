import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Building,
  Stethoscope,
} from "lucide-react";

const medicalTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  defaultMedications: z.array(z.string()).optional(),
});

const medicalTeamMemberSchema = z.object({
  role: z.enum(["Doctor", "Pharmacist", "Nurse", "Technician", "Other"]),
  fullName: z.string().min(1, "Full name is required"),
  designation: z.string().min(1, "Designation is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  regNumber: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  facility: z.string().optional(),
  notes: z.string().optional(),
});

type MedicalTeamForm = z.infer<typeof medicalTeamSchema>;
type MedicalTeamMemberForm = z.infer<typeof medicalTeamMemberSchema>;

interface MedicalTeam {
  id: string;
  name: string;
  defaultMedications: string[];
  createdAt: string;
  updatedAt: string;
}

interface MedicalTeamMember {
  id: string;
  teamId: string;
  role: string;
  fullName: string;
  designation: string;
  phone: string;
  email?: string;
  regNumber?: string;
  licenseExpiry?: string;
  facility?: string;
  notes?: string;
  createdAt: string;
}

export default function MedicalTeamManagementPage() {
  const [selectedTeam, setSelectedTeam] = useState<MedicalTeam | null>(null);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MedicalTeamMember | null>(null);
  const { toast } = useToast();

  const teamForm = useForm<MedicalTeamForm>({
    resolver: zodResolver(medicalTeamSchema),
    defaultValues: {
      name: "",
      defaultMedications: [],
    },
  });

  const memberForm = useForm<MedicalTeamMemberForm>({
    resolver: zodResolver(medicalTeamMemberSchema),
    defaultValues: {
      role: "Doctor",
      fullName: "",
      designation: "",
      phone: "",
      email: "",
      regNumber: "",
      facility: "",
      notes: "",
    },
  });

  // Fetch medical teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["/api/medical-teams"],
    queryFn: async () => {
      const res = await fetch("/api/medical-teams", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch medical teams");
      return res.json();
    },
  });

  // Fetch team members for selected team
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/medical-teams", selectedTeam?.id, "members"],
    queryFn: async () => {
      if (!selectedTeam) return [];
      const res = await fetch(`/api/medical-teams/${selectedTeam.id}/members`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json();
    },
    enabled: !!selectedTeam,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: MedicalTeamForm) => {
      const res = await fetch("/api/medical-teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create team");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-teams"] });
      setIsTeamDialogOpen(false);
      teamForm.reset();
      toast({ title: "Success", description: "Medical team created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (data: MedicalTeamMemberForm) => {
      if (!selectedTeam) throw new Error("No team selected");
      const res = await fetch(`/api/medical-teams/${selectedTeam.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-teams", selectedTeam?.id, "members"] });
      setIsMemberDialogOpen(false);
      memberForm.reset();
      setEditingMember(null);
      toast({ title: "Success", description: "Team member added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async (data: MedicalTeamMemberForm) => {
      if (!editingMember) throw new Error("No member selected");
      const res = await fetch(`/api/medical-team-members/${editingMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-teams", selectedTeam?.id, "members"] });
      setIsMemberDialogOpen(false);
      memberForm.reset();
      setEditingMember(null);
      toast({ title: "Success", description: "Team member updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/medical-team-members/${memberId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to delete member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-teams", selectedTeam?.id, "members"] });
      toast({ title: "Success", description: "Team member deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onCreateTeam = (data: MedicalTeamForm) => {
    createTeamMutation.mutate(data);
  };

  const onCreateMember = (data: MedicalTeamMemberForm) => {
    if (editingMember) {
      updateMemberMutation.mutate(data);
    } else {
      createMemberMutation.mutate(data);
    }
  };

  const handleEditMember = (member: MedicalTeamMember) => {
    setEditingMember(member);
    memberForm.reset({
      role: member.role as any,
      fullName: member.fullName,
      designation: member.designation,
      phone: member.phone,
      email: member.email || "",
      regNumber: member.regNumber || "",
      licenseExpiry: member.licenseExpiry ? new Date(member.licenseExpiry) : undefined,
      facility: member.facility || "",
      notes: member.notes || "",
    });
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirm("Are you sure you want to delete this team member?")) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  const teams = teamsData?.teams || [];
  const members = membersData || [];

  return (
    <AppLayout title="Medical Team Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Medical Team Management</h2>
            <p className="text-muted-foreground">Manage medical teams and their members</p>
          </div>
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Medical Team</DialogTitle>
              </DialogHeader>
              <Form {...teamForm}>
                <form onSubmit={teamForm.handleSubmit(onCreateTeam)} className="space-y-4">
                  <FormField
                    control={teamForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Primary Health Team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTeamMutation.isPending}>
                      {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Medical Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div>Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No teams found. Create your first team.
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map((team: MedicalTeam) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTeam?.id === team.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {new Date(team.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Team Members
                  {selectedTeam && <span className="text-muted-foreground">- {selectedTeam.name}</span>}
                </CardTitle>
                {selectedTeam && (
                  <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingMember ? "Edit Team Member" : "Add Team Member"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...memberForm}>
                        <form onSubmit={memberForm.handleSubmit(onCreateMember)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={memberForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Doctor">Doctor</SelectItem>
                                      <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                                      <SelectItem value="Nurse">Nurse</SelectItem>
                                      <SelectItem value="Technician">Technician</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={memberForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Dr. John Smith" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={memberForm.control}
                              name="designation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Designation</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Senior Physician" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={memberForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input placeholder="9876543210" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={memberForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="doctor@hospital.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={memberForm.control}
                              name="regNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Registration Number (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="MCI12345" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={memberForm.control}
                              name="facility"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Facility (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City Hospital" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={memberForm.control}
                              name="licenseExpiry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Expiry (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={memberForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Additional notes..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsMemberDialogOpen(false);
                                setEditingMember(null);
                                memberForm.reset();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
                            >
                              {createMemberMutation.isPending || updateMemberMutation.isPending
                                ? "Saving..."
                                : editingMember
                                ? "Update Member"
                                : "Add Member"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTeam ? (
                <div className="text-center text-muted-foreground py-8">
                  Select a team to view its members
                </div>
              ) : membersLoading ? (
                <div>Loading members...</div>
              ) : members.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No members found. Add the first team member.
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member: MedicalTeamMember) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{member.fullName}</h3>
                            <Badge variant="secondary">{member.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{member.designation}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {member.phone}
                            </div>
                            {member.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {member.email}
                              </div>
                            )}
                            {member.facility && (
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {member.facility}
                              </div>
                            )}
                          </div>
                          {member.regNumber && (
                            <p className="text-sm text-muted-foreground">
                              Registration: {member.regNumber}
                            </p>
                          )}
                          {member.licenseExpiry && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              License expires: {new Date(member.licenseExpiry).toLocaleDateString()}
                            </div>
                          )}
                          {member.notes && (
                            <p className="text-sm text-muted-foreground">{member.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditMember(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={deleteMemberMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}