import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
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
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Verify2FA from "@/pages/verify-2fa";
import Onboarding from "@/pages/onboarding";
import ResumeBuilder from "@/pages/dashboard/resume-builder";
import Resumes from "@/pages/dashboard/resumes";
import CreateResume from "@/pages/dashboard/create-resume";
import Account from "@/pages/dashboard/account";
import Home from "@/pages/dashboard/home";
import JobMatch from "@/pages/dashboard/job-match";
import JobTailor from "@/pages/dashboard/job-tailor";
import ResumeReview from "@/pages/dashboard/resume-review";
import AtsScanner from "@/pages/dashboard/ats-scanner";
import CoverLetter from "@/pages/dashboard/cover-letter";
import AIInterview from "@/pages/dashboard/ai-interview";
import FeatureCoverLetter from "@/pages/features/cover-letter";
import FeatureAtsScanner from "@/pages/features/ats-scanner";
import AdminDashboard from "@/pages/dashboard/admin";
import AdminUserDetails from "@/pages/dashboard/admin-user-details";

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.isAdmin) {
    return <AdminDashboard />;
  }
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/why-us" component={WhyUs} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/verify-2fa" component={Verify2FA} />
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardRedirect />
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
            <Resumes />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resumes/create">
        <ProtectedRoute>
          <CreateResume />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resume-builder/:id">
        <ProtectedRoute>
          <ResumeBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/job-match">
        <ProtectedRoute>
          <DashboardLayout>
            <JobMatch />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/job-tailor">
        <ProtectedRoute>
          <DashboardLayout>
            <JobTailor />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resume-review">
        <ProtectedRoute>
          <DashboardLayout>
            <ResumeReview />
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
            <CoverLetter />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/ai-interview">
        <ProtectedRoute>
          <DashboardLayout>
            <AIInterview />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/admin">
        <ProtectedRoute requireAdmin={true}>
          <DashboardLayout>
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/admin/users/:userId">
        <ProtectedRoute requireAdmin={true}>
          <DashboardLayout>
            <AdminUserDetails />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/features/cover-letter" component={FeatureCoverLetter} />
      <Route path="/features/ats-scanner" component={FeatureAtsScanner} />
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
