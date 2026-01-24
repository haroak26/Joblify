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
import Account from "@/pages/dashboard/account";

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardHome} />
        <Route path="/dashboard/jobs" component={MyJobs} />
        <Route path="/dashboard/generator" component={Generator} />
        <Route path="/dashboard/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" nest>
        {() => <DashboardRouter />}
      </Route>
      <Route path="/dashboard/:rest*" nest>
        {() => <DashboardRouter />}
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
