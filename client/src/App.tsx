import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Onboarding from "@/pages/onboarding";
import DashboardHome from "@/pages/dashboard/home";
import MyJobs from "@/pages/dashboard/jobs";
import JobDetails from "@/pages/dashboard/job-details";
import Generator from "@/pages/dashboard/generator";
import Schedules from "@/pages/dashboard/schedules";
import Account from "@/pages/dashboard/account";
import ResumeDashboard from "@/pages/dashboard/resumes";
import ResumeEditor from "@/pages/dashboard/resume-editor";
import ResumeChat from "@/pages/dashboard/resume-chat";
import AtsScanner from "@/pages/dashboard/ats-scanner";
import CoverLetterGenerator from "@/pages/dashboard/cover-letter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardHome />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/jobs/:id">
        <ProtectedRoute>
          <DashboardLayout>
            <JobDetails />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/jobs">
        <ProtectedRoute>
          <DashboardLayout>
            <MyJobs />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/generator">
        <ProtectedRoute>
          <DashboardLayout>
            <Generator />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/schedules">
        <ProtectedRoute>
          <DashboardLayout>
            <Schedules />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/account">
        <ProtectedRoute>
          <DashboardLayout>
            <Account />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resumes">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resumes/:id/edit">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeEditor />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resumes/:id/chat">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeChat />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resumes/new">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeChat />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/ats-scanner">
        <ProtectedRoute>
          <DashboardLayout>
            <AtsScanner />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/cover-letter">
        <ProtectedRoute>
          <DashboardLayout>
            <CoverLetterGenerator />
          </DashboardLayout>
        </ProtectedRoute>
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
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
