import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LogOut, Plus, Grid3x3, Target, History, LayoutGrid, Mic } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Start onboarding if user hasn't completed it
  useEffect(() => {
    if (user && !onboardingLoading && !onboardingCompleted) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, onboardingLoading, onboardingCompleted]);

  const taskItems = [
    {
      title: 'Add New Task',
      icon: Plus,
      path: '/add-task',
    },
    {
      title: 'Voice Mode',
      icon: Mic,
      path: '/voice',
    },
  ];

  const viewItems = [
    {
      title: 'Matrix',
      icon: Grid3x3,
      path: '/matrix',
    },
    {
      title: 'Focus',
      icon: Target,
      path: '/focus',
    },
    {
      title: 'Kanban',
      icon: LayoutGrid,
      path: '/kanban',
    },
  ];

  const accountItems = [
    {
      title: 'History',
      icon: History,
      path: '/history',
    },
  ];

  return (
    <SidebarProvider>
      <OnboardingTour
        run={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      <Sidebar collapsible="icon" data-onboarding="sidebar">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Grid3x3 className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Vertex</span>
              <span className="truncate text-xs text-muted-foreground">Time Grid</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tasks</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {taskItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.title}
                    >
                      <button
                        onClick={() => navigate(item.path)}
                        className="w-full"
                        data-onboarding={item.path === '/add-task' ? 'add-task' : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Views</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {viewItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.title}
                    >
                      <button
                        onClick={() => navigate(item.path)}
                        className="w-full"
                        data-onboarding={
                          item.path === '/matrix' ? 'matrix' :
                          item.path === '/focus' ? 'focus' :
                          item.path === '/kanban' ? 'kanban' : undefined
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {accountItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path}
                      tooltip={item.title}
                    >
                      <button
                        onClick={() => navigate(item.path)}
                        className="w-full"
                        data-onboarding={item.path === '/history' ? 'history' : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                onClick={signOut}
                tooltip="Sign Out"
              >
                <button className="w-full">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

