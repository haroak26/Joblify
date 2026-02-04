import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  
  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          {user && !user.emailVerified && (
            <div className="px-4 pt-4">
              <EmailVerificationBanner email={user.email} />
            </div>
          )}
          <main className="flex-1 overflow-auto pt-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
