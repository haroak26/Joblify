import { Link, useLocation } from "wouter";
import { Home, Briefcase, Wand2, Calendar, LogOut, Sparkles, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionResponse {
  subscription: { plan: string };
  limits: { hasScheduleAccess: boolean };
}

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: Briefcase,
  },
  {
    title: "Generator",
    url: "/dashboard/generator",
    icon: Wand2,
  },
  {
    title: "Schedules",
    url: "/dashboard/schedules",
    icon: Calendar,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();
  
  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });
  
  const planLabel = subscriptionQuery.data?.subscription?.plan === "plus" ? "Plus" : "Free";

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location === "/dashboard";
    }
    return location === url || location.startsWith(url + "/");
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const logoHref = user ? "/dashboard" : "/";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-5">
        <Link href={logoHref}>
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="w-9 h-9 bg-sidebar-accent rounded-xl flex items-center justify-center border border-sidebar-border transition-transform group-hover:-rotate-3">
              <Sparkles className="w-5 h-5 text-sidebar-accent-foreground" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-sidebar-foreground" data-testid="text-sidebar-logo">
                Joblify
              </span>
              <p className="text-xs text-sidebar-foreground/60">Freelance command center</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.url)}
                  className={`h-10 px-3 rounded-md transition-all duration-200 ${
                    isActive(item.url) 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                    <item.icon className={`w-4 h-4 ${isActive(item.url) ? 'text-sidebar-accent-foreground' : ''}`} />
                    <span className="text-[14px]">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        {!isLoading && user && (
          <div className="space-y-4">
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive("/dashboard/account")}
                  className={`h-11 px-4 rounded-xl transition-all duration-200 ${
                    isActive("/dashboard/account") 
                      ? 'bg-foreground text-background shadow-lg' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href="/dashboard/account" data-testid="link-nav-account">
                    <User className="w-4 h-4" />
                    <span className="text-[14px] font-semibold">Account</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-sidebar-accent/30 rounded-2xl border border-sidebar-border/50 group">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate text-sidebar-foreground" data-testid="text-username">{user.username}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-70">{planLabel}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 rounded-lg text-muted-foreground hover:bg-background hover:text-red-500 transition-all active:scale-95"
                title="Log out"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
