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
import WhyUs from "@/pages/why-us";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsAndConditions from "@/pages/terms-and-conditions";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import AIResumeBuilderFeature from "@/pages/features/ai-resume-builder";
import ATSScannerFeature from "@/pages/features/ats-scanner";
import CoverLetterFeature from "@/pages/features/cover-letter";
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
import ResumeBuilderWizard from "@/pages/dashboard/resume-builder-wizard";
import AtsScanner from "@/pages/dashboard/ats-scanner";
import CoverLetterGenerator from "@/pages/dashboard/cover-letter";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/why-us" component={WhyUs} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/features/ai-resume-builder" component={AIResumeBuilderFeature} />
      <Route path="/features/ats-scanner" component={ATSScannerFeature} />
      <Route path="/features/cover-letter" component={CoverLetterFeature} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
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
      <Route path="/dashboard/resume-chat">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeChat />
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
            <ResumeBuilderWizard />
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
