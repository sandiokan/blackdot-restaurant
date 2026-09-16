import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/layout/AppShell";
import NewReservationDialog from "@/components/NewReservationDialog";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Overview from "@/pages/Overview";
import Reservations from "@/pages/Reservations";
import CalendarPage from "@/pages/CalendarPage";
import Attendance from "@/pages/Attendance";
import Staff from "@/pages/Staff";
import Shifts from "@/pages/Shifts";
import SettingsPage from "@/pages/SettingsPage";
import Onboarding from "@/pages/Onboarding";

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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppDataProvider>
            <Switch>
              <Route path="/onboarding" component={Onboarding} />
              <Route><DashboardRoutes /></Route>
            </Switch>
            <NewReservationDialog />
            <Toaster theme="dark" position="top-center" richColors />
          </AppDataProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
