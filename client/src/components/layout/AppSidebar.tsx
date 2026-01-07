import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  School,
  FileHeart,
  Stethoscope,
  UtensilsCrossed,
  Home,
  FileText,
  LogOut,
  Settings,
  UserCog,
  ClipboardList,
  User,
} from "lucide-react";

const roleMenuItems = {
  Admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    // Admin should retain Approvals and Dashboard only — remove management pages
    { title: "Approvals", url: "/approvals", icon: ClipboardList },
  ],
  PO: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Schools", url: "/schools", icon: School },
    { title: "Students", url: "/students", icon: Users },
    { title: "Hostel Attendance", url: "/hostel", icon: Home },
    { title: "Data Manager", url: "/data-management", icon: Settings },
    { title: "Reports", url: "/reports", icon: FileText },
  ],
  Headmaster: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Students", url: "/students", icon: Users },
    { title: "Health Cards", url: "/health-cards", icon: FileHeart },
    { title: "Approvals", url: "/approvals", icon: ClipboardList },
    { title: "Reports", url: "/reports", icon: FileText },
  ],
  ClassTeacher: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Students", url: "/students", icon: Users },
    { title: "Health Cards", url: "/health-cards", icon: FileHeart },
    { title: "Monthly Checkups", url: "/checkups", icon: Stethoscope },
  ],
  MedicalTeam: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Students", url: "/students", icon: Users },
    { title: "Monthly Checkups", url: "/checkups", icon: Stethoscope },
  ],
  HostelWarden: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "All Students", url: "/hostel/students", icon: Users },
  ],
};

const roleBadgeColors = {
  Admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Headmaster: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ClassTeacher: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  MedicalTeam: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  HostelWarden: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const menuItems = roleMenuItems[user.role as keyof typeof roleMenuItems] || [];
  const badgeColor = roleBadgeColors[user.role as keyof typeof roleBadgeColors] || "";

  const getInitials = (name?: string) => {
    if (!name || typeof name !== "string") return "U"; // fallback
    return name
      .trim()
      .split(" ")
      .map((n) => n[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Brand variant="small" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(user.fullName || user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName || user.email}</span>
            <Badge variant="outline" className={`w-fit text-xs ${badgeColor}`}>
              {user.role}
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            asChild
          >
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
