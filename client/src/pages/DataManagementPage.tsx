import React, { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  School,
  Users,
  FileHeart,
  Stethoscope,
  UtensilsCrossed,
  Home,
  Settings,
} from "lucide-react";

const resources = [
  {
    key: "schools",
    title: "Schools",
    description: "Maintain master information for every school in your district.",
    icon: School,
    viewLink: "/schools",
    addLink: "/schools",
    badges: ["Admin", "PO"],
  },
  {
    key: "students",
    title: "Students",
    description: "Create, update, or review student profiles and health identifiers.",
    icon: Users,
    viewLink: "/students",
    addLink: "/students/new",
    badges: ["Admin", "ClassTeacher"],
  },
  {
    key: "healthCards",
    title: "Annual Health Cards",
    description: "Update screening data and follow-up recommendations.",
    icon: FileHeart,
    viewLink: "/health-cards",
    addLink: "/students/new",
    badges: ["Admin", "Headmaster"],
  },
  {
    key: "checkups",
    title: "Monthly Checkups",
    description: "Record and edit monthly medical visits, vitals, and referrals.",
    icon: Stethoscope,
    viewLink: "/checkups",
    addLink: "/checkups/new",
    badges: ["MedicalTeam", "ClassTeacher"],
  },
  {
    key: "meals",
    title: "Meal Logs",
    description: "Full CRUD access for mid-day meal tracking including menu proof.",
    icon: UtensilsCrossed,
    viewLink: "/meals",
    addLink: "/meals",
    badges: ["Admin", "Headmaster", "ClassTeacher", "PO"],
  },
  {
    key: "hostel",
    title: "Hostel Attendance",
    description: "Edit hostel stay & vacation logs. Only admins can edit entries here.",
    icon: Home,
    viewLink: "/hostel",
    addLink: "/hostel",
    badges: ["Admin"],
    adminOnly: true,
  },
];

export default function DataManagementPage() {
  const { hasRole, user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = hasRole("Admin");

  // Redirect Admin users away from Data Manager UI
  useEffect(() => {
    if (user?.role === "Admin") setLocation("/");
  }, [user, setLocation]);

  if (user?.role === "Admin") return null;

  return (
    <AppLayout title="Unified Data Management">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Centralized CRUD Console
          </h2>
          <p className="text-muted-foreground max-w-3xl">
            Use this control room to jump into any module with edit rights already applied. Every card gives you quick access to
            existing records and creation flows. Hostel attendance updates remain restricted to administrators for safety.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {resources.map((resource) => {
            const Icon = resource.icon;
            const canEditHostel = resource.key !== "hostel" || isAdmin;

            return (
              <Card key={resource.key} className="flex flex-col h-full border border-border/70 shadow-none">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    {resource.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {resource.badges.map((badge) => (
                      <Badge key={badge} variant="outline" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild variant="secondary" className="flex-1">
                      <Link href={resource.viewLink}>View &amp; Edit Records</Link>
                    </Button>
                    <Button
                      asChild
                      variant="default"
                      className="flex-1"
                      disabled={resource.adminOnly && !isAdmin}
                    >
                      <Link href={resource.addLink}>
                        {resource.adminOnly && !isAdmin ? "Admin Only" : "Add / Create"}
                      </Link>
                    </Button>
                  </div>
                  {resource.key === "hostel" && !isAdmin && (
                    <p className="text-xs text-amber-600 dark:text-amber-300">
                      Editing hostel attendance is restricted. Contact an administrator for updates.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

