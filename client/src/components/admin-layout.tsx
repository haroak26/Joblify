import type { CSSProperties } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Shield, LayoutDashboard, Users, Gift, ScrollText, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavigation = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Users", href: "/dashboard/admin", icon: Users },
  { label: "Perks", href: "/dashboard/admin", icon: Gift },
  { label: "Audit Logs", href: "/dashboard/admin", icon: ScrollText },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as CSSProperties}>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="p-4 space-y-3">
            <Link href="/dashboard/admin">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sidebar-foreground">Admin Console</p>
                  <p className="text-xs text-muted-foreground">Joblify Control Center</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard">
              <span className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to user dashboard
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {adminNavigation.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.href}
                      className="h-9"
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:hidden">
            <SidebarTrigger />
          </div>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
