import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/layout/AppShell";
import NewReservationDialog from "@/components/NewReservationDialog";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AccessNotConfigured from "@/pages/AccessNotConfigured";
import Overview from "@/pages/Overview";
import Reservations from "@/pages/Reservations";
import CalendarPage from "@/pages/CalendarPage";
import Attendance from "@/pages/Attendance";
import Staff from "@/pages/Staff";
import Shifts from "@/pages/Shifts";
import SettingsPage from "@/pages/SettingsPage";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import AcceptInvitation from "@/pages/AcceptInvitation";

function DashboardRoutes() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/prenotazioni" component={Reservations} />
        <Route path="/calendario" component={CalendarPage} />
        <Route path="/affluenza" component={Attendance} />
        <Route path="/personale" component={Staff} />
        <Route path="/turni" component={Shifts} />
        <Route path="/impostazioni" component={SettingsPage} />
        <Route><Overview /></Route>
      </Switch>
    </AppShell>
  );
}

function AuthenticatedApp({ restaurantId }: { restaurantId: string }) {
  return <AppDataProvider restaurantId={restaurantId}>
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route><DashboardRoutes /></Route>
    </Switch>
    <NewReservationDialog />
  </AppDataProvider>;
}

function AuthGate() {
  const { loading, user, restaurantId, role, accessError } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user && location !== "/login") navigate("/login", { replace: true });
    if (!loading && user && location === "/login" && restaurantId && role) navigate("/", { replace: true });
  }, [loading, user, restaurantId, role, location, navigate]);

  if (loading) return <main className="auth-loading">Verifica accesso...</main>;
  if (!user) return <Login />;
  if (!restaurantId || !role || accessError) return <AccessNotConfigured />;
  return <AuthenticatedApp restaurantId={restaurantId} />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AuthProvider>
            <Switch>
              <Route path="/accept-invitation" component={AcceptInvitation} />
              <Route><AuthGate /></Route>
            </Switch>
            <Toaster theme="dark" position="top-center" richColors />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
