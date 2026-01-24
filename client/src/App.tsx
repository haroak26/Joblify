import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/dashboard-layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import DashboardHome from "@/pages/dashboard/home";
import MyJobs from "@/pages/dashboard/jobs";
import Generator from "@/pages/dashboard/generator";
import Schedules from "@/pages/dashboard/schedules";
import Account from "@/pages/dashboard/account";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard">
        <DashboardLayout>
          <DashboardHome />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/jobs">
        <DashboardLayout>
          <MyJobs />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/generator">
        <DashboardLayout>
          <Generator />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/schedules">
        <DashboardLayout>
          <Schedules />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/account">
        <DashboardLayout>
          <Account />
        </DashboardLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
