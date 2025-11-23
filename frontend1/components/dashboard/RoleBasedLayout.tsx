'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building2, 
  Settings, 
  FileText, 
  BarChart3, 
  Shield, 
  Bell, 
  Wrench,
  Menu,
  Home,
  LogOut,
  FolderOpen,
  CheckSquare,
  Calendar,
  UserCheck,
  Headphones,
  DollarSign,
  Code,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUserWithFallback, UserRole, getRoleDisplayName } from '@/lib/auth';

// Type guard function to check if a string is a valid UserRole
const isUserRole = (role: string): role is UserRole => {
  return [
    'superadmin',
    'admin',
    'organization_admin',
    'project_manager',
    'manager',
    'developer',
    'sales',
    'support',
    'verifier',
    'user',
    'organization',
    'org_admin'
  ].includes(role);
};

interface RoleBasedLayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

const getNavigationForRole = (role: UserRole) => {
  const baseNavigation = [
    { 
      name: 'Overview', 
      href: role === 'superadmin' ? '/superadmin' : '/organization/dashboard', 
      icon: Home, 
      current: false 
    },
    { 
      name: 'Messages', 
      href: '/organization/messaging', 
      icon: MessageSquare, 
      current: false 
    },
  ];

  // Add a default empty array for any role not explicitly defined
  const roleSpecificNavigation: Record<string, any[]> = {
    superadmin: [
      { name: 'Users', href: '/superadmin/users', icon: Users, current: false },
      { name: 'Organizations', href: '/superadmin/organizations', icon: Building2, current: false },
      { name: 'Billing Overview', href: '/superadmin/billing', icon: DollarSign, current: false },
      { name: 'System Settings', href: '/superadmin/settings', icon: Settings, current: false },
      { name: 'Audit Logs', href: '/superadmin/logs', icon: FileText, current: false },
      { name: 'Reports', href: '/superadmin/reports', icon: BarChart3, current: false },
      { name: 'Roles & Permissions', href: '/superadmin/roles', icon: Shield, current: false },
      { name: 'Notifications', href: '/superadmin/notifications', icon: Bell, current: false },
      { name: 'Maintenance', href: '/superadmin/maintenance', icon: Wrench, current: false },
    ],
    admin: [
      { name: 'Members', href: '/organization/members', icon: Users, current: false },
      { name: 'Projects', href: '/organization/projects', icon: FolderOpen, current: false },
      { name: 'Clients', href: '/clients', icon: Users, current: false },
      { name: 'Billing', href: '/organization/billing', icon: DollarSign, current: false },
      { name: 'Settings', href: '/organization/settings', icon: Settings, current: false },
      { name: 'Reports', href: '/organization/reports', icon: BarChart3, current: false },
    ],
    manager: [
      { name: 'Projects', href: '/projects', icon: FolderOpen, current: false },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, current: false },
      { name: 'Team', href: '/team', icon: Users, current: false },
      { name: 'Calendar', href: '/calendar', icon: Calendar, current: false },
      { name: 'Reports', href: '/reports', icon: BarChart3, current: false },
    ],
    developer: [
      { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare, current: false },
      { name: 'Projects', href: '/projects', icon: FolderOpen, current: false },
      { name: 'Code Reviews', href: '/reviews', icon: Code, current: false },
      { name: 'Calendar', href: '/calendar', icon: Calendar, current: false },
      { name: 'Performance', href: '/performance', icon: BarChart3, current: false },
    ],
    sales: [
      { name: 'Clients', href: '/clients', icon: Users, current: false },
      { name: 'Pipeline', href: '/pipeline', icon: BarChart3, current: false },
      { name: 'Deals', href: '/deals', icon: DollarSign, current: false },
      { name: 'Calendar', href: '/calendar', icon: Calendar, current: false },
      { name: 'Reports', href: '/reports', icon: FileText, current: false },
    ],
    support: [
      { name: 'Tickets', href: '/tickets', icon: Headphones, current: false },
      { name: 'Knowledge Base', href: '/kb', icon: FileText, current: false },
      { name: 'Customers', href: '/customers', icon: Users, current: false },
      { name: 'Reports', href: '/reports', icon: BarChart3, current: false },
    ],
    verifier: [
      { name: 'Verification Queue', href: '/queue', icon: CheckSquare, current: false },
      { name: 'History', href: '/history', icon: FileText, current: false },
      { name: 'Statistics', href: '/stats', icon: BarChart3, current: false },
    ],
    // Default navigation for regular users
    user: [
      // { name: 'My Dashboard', href: '/organization/user/dashboard', icon: Home, current: true },
      { name: 'My Tasks', href: '/organization/user/tasks', icon: CheckSquare, current: false },
      { name: 'Projects', href: '/organization/user/projects', icon: FolderOpen, current: false },
      { name: 'Calendar', href: '/organization/user/calendar', icon: Calendar, current: false },
      { name: 'Profile', href: '/organization/user/profile', icon: UserCheck, current: false },
    ],
    
    // Project manager navigation
    project_manager: [
      { name: 'Dashboard', href: '/manager/dashboard', icon: Home, current: true },
      { name: 'Projects', href: '/manager/projects', icon: FolderOpen, current: false },
      { name: 'Clients', href: '/clients', icon: Users, current: false },
      { name: 'Tasks', href: '/manager/tasks', icon: CheckSquare, current: false },
      { name: 'Team', href: '/manager/team', icon: Users, current: false },
      { name: 'Calendar', href: '/manager/calendar', icon: Calendar, current: false },
      { name: 'Reports', href: '/manager/reports', icon: BarChart3, current: false },
    ],
    
    // Salesperson navigation
    salesperson: [
      { name: 'Dashboard', href: '/sales/dashboard', icon: Home, current: true },
      { name: 'Leads', href: '/sales/leads', icon: UserCheck, current: false },
      { name: 'Deals', href: '/sales/deals', icon: DollarSign, current: false },
      { name: 'Calendar', href: '/sales/calendar', icon: Calendar, current: false },
      { name: 'Targets', href: '/sales/targets', icon: BarChart3, current: false },
    ],
  };

  // Fallback to empty array if role doesn't exist in the mapping
  const roleNav = roleSpecificNavigation[role] || [];
  return [...baseNavigation, ...roleNav];
};

export function RoleBasedLayout({ children, userRole: propUserRole }: RoleBasedLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const user = getCurrentUserWithFallback();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Safely get the user's role
  const getUserRole = (): UserRole => {
    if (propUserRole) return propUserRole;  // Use prop if provided
    const role = (user.organization_role || user.role || 'user').toLowerCase();
    return isUserRole(role) ? role : 'user';
  };

  const layoutRole = getUserRole();
  
  // Type assertion for navigation
  const navigation = getNavigationForRole(layoutRole).map(item => {
    const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && 
                     item.href !== '/' && 
                     pathname.charAt(item.href.length) === '/');
    
    return { ...item, current: isActive };
  });
  
  // Determine if the current role is an admin role
  const isAdminRole = ['superadmin', 'admin', 'organization_admin'].includes(layoutRole);
  
  // Determine if the current role should use the simplified layout
  const useSimplifiedLayout = ['user', 'salesperson', 'verifier', 'support', 'developer'].includes(layoutRole);

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      superadmin: 'bg-purple-600',
      admin: 'bg-blue-600',
      project_manager: 'bg-green-600',
      developer: 'bg-orange-600',
      salesperson: 'bg-pink-600',
      support: 'bg-teal-600',
      verifier: 'bg-indigo-600',
      user: 'bg-gray-600'
    };
    return colors[role] || 'bg-gray-500';
  };

  const handleLogout = () => {
    // Clear auth tokens and redirect to projectk page
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/projectk';
    }
  };

  if (useSimplifiedLayout) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile menu button */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="text-sm font-medium text-gray-900">
              {typeof user.organization === 'object' && user.organization !== null 
                ? user.organization.name 
                : 'My Workspace'}
            </div>
            <div className="w-6"></div> {/* Spacer for alignment */}
          </div>
        </div>

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 overflow-y-auto",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="flex flex-col h-full">
            {/* Logo and close button */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center">
                <span className="text-lg font-semibold text-gray-800">
                  {typeof user.organization === 'object' ? user.organization.name : 'My Workspace'}
                </span>
              </div>
              <button
                type="button"
                className="md:hidden text-gray-500 hover:text-gray-600"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md',
                    item.current 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5',
                      item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </a>
              ))}
            </nav>

            {/* User profile */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className={cn(
                    'inline-flex items-center justify-center h-9 w-9 rounded-full',
                    getRoleColor(layoutRole as UserRole) || 'bg-gray-400'
                  )}>
                    <span className="text-white font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{getRoleDisplayName(layoutRole as UserRole)}</p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-500"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-64 pt-14 min-h-screen">
          <main className="p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Admin layout (original layout)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform",
        "bg-white border-r border-gray-200 overflow-y-auto",
        "transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <span className="text-xl font-semibold text-gray-800">
                {isAdminRole ? 'Admin' : 'Manager'} Dashboard
              </span>
            </div>
            <button
              type="button"
              className="md:hidden text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  item.current
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                )}
              >
                <item.icon
                  className={cn(
                    item.current ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-6 w-6'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </a>
            ))}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className={cn(
                  'inline-flex items-center justify-center h-10 w-10 rounded-full',
                  getRoleColor(layoutRole) || 'bg-gray-400'
                )}>
                  <span className="text-white font-medium">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.name || 'User'}</p>
                <p className="text-xs text-gray-500">{getRoleDisplayName(layoutRole)}</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-500"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <div className="bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-800">
                {isAdminRole ? 'Admin' : 'Manager'} Dashboard
              </h1>
            </div>
            <div className="w-6"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 pt-16 min-h-screen">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}