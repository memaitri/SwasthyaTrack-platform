import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PODashboard from "@/pages/PODashboard";
import HeadmasterDashboard from "@/pages/HeadmasterDashboard";
import ClassTeacherDashboard from "@/pages/ClassTeacherDashboard";
import MedicalTeamDashboard from "@/pages/MedicalTeamDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import HostelWardenDashboard from "@/pages/HostelWardenDashboard";
import StudentsPage from "@/pages/StudentsPage";
import StudentFormPage from "@/pages/StudentFormPage";
import HealthCardsPage from "@/pages/HealthCardsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";import PendingSchoolsPage from "./pages/PendingSchoolsPage";import MonthlyCheckupsPage from "@/pages/MonthlyCheckupsPage";
import MealLogsPage from "@/pages/MealLogsPage";
import HostelAttendancePage from "@/pages/HostelAttendancePage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import SchoolsPage from "@/pages/SchoolsPage";
import ProfilePage from "@/pages/ProfilePage";
import POSchoolDetailPage from "@/pages/POSchoolDetailPage";
import DataManagementPage from "@/pages/DataManagementPage";
import DataQualityDashboard from "@/pages/DataQualityDashboard";
import NotificationsPage from "@/pages/NotificationsPage";
import type { Role } from "@shared/schema";

function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: Role[] 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "Admin":
      return <AdminDashboard />;
    case "PO":
      return <PODashboard />;
    case "Headmaster":
      return <HeadmasterDashboard />;
    case "ClassTeacher":
      return <ClassTeacherDashboard />;
    case "MedicalTeam":
      return <MedicalTeamDashboard />;
    case "HostelWarden":
      return <HostelWardenDashboard />;
    default:
      return <NotFound />;
  }
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <LoginPage />}
      </Route>

      <Route path="/register">
        {user ? <Redirect to="/" /> : <RegisterPage />}
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute allowedRoles={["Admin"]}>
          <UsersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/schools/pending">
        <ProtectedRoute allowedRoles={["Admin"]}>
          <PendingSchoolsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/schools">
        <ProtectedRoute allowedRoles={["Admin", "PO"]}>
          <SchoolsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/schools/:id">
        <ProtectedRoute allowedRoles={["Admin", "PO"]}>
          <POSchoolDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/students">
        <ProtectedRoute>
          <StudentsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/students/new">
        <ProtectedRoute allowedRoles={["Admin", "ClassTeacher"]}>
          <StudentFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/students/:id">
        <ProtectedRoute>
          <StudentFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/health-cards">
        <ProtectedRoute>
          <HealthCardsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/health-cards/:id">
        <ProtectedRoute>
          <HealthCardsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/health-cards/view/:id">
        <ProtectedRoute>
          <HealthCardsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/approvals">
        <ProtectedRoute allowedRoles={["Headmaster", "Admin"]}>
          <ApprovalsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/checkups">
        <ProtectedRoute>
          <MonthlyCheckupsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/checkups/new">
        <ProtectedRoute>
          <MonthlyCheckupsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/meals">
        <ProtectedRoute allowedRoles={["Admin", "PO", "MedicalTeam", "HostelWarden"]}>
          <MealLogsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/hostel">
        <ProtectedRoute allowedRoles={["PO", "Admin", "HostelWarden"]}>
          <HostelAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/hostel/students">
        <ProtectedRoute allowedRoles={["HostelWarden", "Admin"]}>
          <HostelAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/hostel/attendance">
        <ProtectedRoute allowedRoles={["HostelWarden", "Admin"]}>
          <HostelAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/hostel/vacation">
        <ProtectedRoute allowedRoles={["HostelWarden", "Admin"]}>
          <HostelAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/hostel/check-in">
        <ProtectedRoute allowedRoles={["HostelWarden", "Admin"]}>
          <HostelAttendancePage />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/data-management">
        <ProtectedRoute allowedRoles={["Admin", "PO"]}>
          <DataManagementPage />
        </ProtectedRoute>
      </Route>

      <Route path="/data-quality">
        <ProtectedRoute allowedRoles={["Admin", "PO"]}>
          <DataQualityDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute allowedRoles={["PO", "Headmaster", "ClassTeacher"]}>
          <NotificationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/po/schools/:id">
        <ProtectedRoute allowedRoles={["PO", "Admin"]}>
          <POSchoolDetailPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
