import { Link, useLocation } from "wouter";
import { Home, Briefcase, Wand2, Calendar, Settings, CreditCard } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainMenuItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Jobs",
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

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location === "/dashboard";
    }
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg" data-testid="text-sidebar-logo">Joblify</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(' ', '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarSeparator />
        <SidebarMenu className="p-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/account")}>
              <Link href="/dashboard/account" data-testid="link-sidebar-account">
                <Settings className="w-4 h-4" />
                <span>Account</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
