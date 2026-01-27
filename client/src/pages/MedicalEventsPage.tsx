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
import { Link } from "wouter";
import {
  Calendar,
  Plus,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";

const medicalEventSchema = z.object({
  teamId: z.string().min(1, "Medical team is required"),
  name: z.string().min(1, "Event name is required"),
  eventDate: z.coerce.date(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type MedicalEventForm = z.infer<typeof medicalEventSchema>;

interface MedicalTeam {
  id: string;
  name: string;
}

interface MedicalEvent {
  id: string;
  teamId: string;
  name: string;
  eventDate: string;
  location?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export default function MedicalEventsPage() {
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const { toast } = useToast();

  const eventForm = useForm<MedicalEventForm>({
    resolver: zodResolver(medicalEventSchema),
    defaultValues: {
      teamId: "",
      name: "",
      eventDate: new Date(),
      location: "",
      notes: "",
    },
  });

  // Fetch medical teams for dropdown
  const { data: teamsData } = useQuery({
    queryKey: ["/api/medical-teams"],
    queryFn: async () => {
      const res = await fetch("/api/medical-teams", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch medical teams");
      return res.json();
    },
  });

  // Fetch medical events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/medical-events"],
    queryFn: async () => {
      const res = await fetch("/api/medical-events", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch medical events");
      return res.json();
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: MedicalEventForm) => {
      const res = await fetch("/api/medical-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create event");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-events"] });
      setIsEventDialogOpen(false);
      eventForm.reset();
      toast({
        title: "Success",
        description: `Event created successfully! ${result.createdCount} student checkup records were generated.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onCreateEvent = (data: MedicalEventForm) => {
    createEventMutation.mutate(data);
  };

  const teams = teamsData?.teams || [];
  const events = eventsData?.events || [];

  const getTeamName = (teamId: string) => {
    const team = teams.find((t: MedicalTeam) => t.id === teamId);
    return team?.name || "Unknown Team";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  return (
    <AppLayout title="Medical Events">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Medical Events</h2>
            <p className="text-muted-foreground">Schedule and manage medical checkup events</p>
          </div>
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Medical Event</DialogTitle>
              </DialogHeader>
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(onCreateEvent)} className="space-y-4">
                  <FormField
                    control={eventForm.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical Team</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select medical team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams.map((team: MedicalTeam) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={eventForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Monthly Health Checkup - January 2026" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={eventForm.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={eventForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., School Health Room" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={eventForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional instructions or notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createEventMutation.isPending}>
                      {createEventMutation.isPending ? "Creating..." : "Create Event"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events List */}
        <div className="grid gap-6">
          {eventsLoading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first medical event to start scheduling checkups.
                </p>
                <Button onClick={() => setIsEventDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {events.map((event: MedicalEvent) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{event.name}</CardTitle>
                          <Badge variant={isUpcoming(event.eventDate) ? "default" : "secondary"}>
                            {isUpcoming(event.eventDate) ? "Upcoming" : "Past"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.eventDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {getTeamName(event.teamId)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.notes && (
                          <p className="text-sm text-muted-foreground">{event.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/medical-events/${event.id}/checkups`}>
                          <Button size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Checkups
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}