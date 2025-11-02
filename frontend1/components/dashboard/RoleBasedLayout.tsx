'use client';

import { useState } from 'react';
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
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUserWithFallback, UserRole, getRoleDisplayName } from '@/lib/auth';

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

const getNavigationForRole = (role: UserRole) => {
  const baseNavigation = [
    { 
      name: 'Overview', 
      href: role === 'superadmin' ? '/superadmin' : '/organization/dashboard', 
      icon: Home, 
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
    // Default navigation for users with 'user' role or any other undefined role
    user: [
      { name: 'Dashboard', href: '/dashboard', icon: Home, current: true },
      { name: 'Profile', href: '/profile', icon: UserCheck, current: false },
      { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare, current: false },
      { name: 'Calendar', href: '/calendar', icon: Calendar, current: false },
    ],
  };

  // Fallback to empty array if role doesn't exist in the mapping
  const roleNav = roleSpecificNavigation[role] || [];
  return [...baseNavigation, ...roleNav];
};

export function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = getCurrentUserWithFallback();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Show loading state if user is not available
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Get navigation items and update current based on pathname
  const navigation = getNavigationForRole(currentUser.role).map(item => {
    // Special handling for organization dashboard
    if (item.href === '/organization/dashboard') {
      const isOrgDashboard = pathname === '/organization/dashboard' || 
                          (pathname.startsWith('/organization/') && 
                          !pathname.startsWith('/organization/members') &&
                          !pathname.startsWith('/organization/projects') &&
                          !pathname.startsWith('/organization/billing') &&
                          !pathname.startsWith('/organization/settings') &&
                          !pathname.startsWith('/organization/reports'));
      
      return {
        ...item,
        current: isOrgDashboard
      };
    }
    
    // Special handling for superadmin dashboard
    if (item.href === '/superadmin') {
      const isSuperadminDashboard = pathname === '/superadmin' || 
                                 (pathname.startsWith('/superadmin/') && 
                                 !pathname.startsWith('/superadmin/users') &&
                                 !pathname.startsWith('/superadmin/organizations') &&
                                 !pathname.startsWith('/superadmin/billing') &&
                                 !pathname.startsWith('/superadmin/settings') &&
                                 !pathname.startsWith('/superadmin/logs') &&
                                 !pathname.startsWith('/superadmin/reports') &&
                                 !pathname.startsWith('/superadmin/roles') &&
                                 !pathname.startsWith('/superadmin/notifications') &&
                                 !pathname.startsWith('/superadmin/maintenance'));
      
      return {
        ...item,
        current: isSuperadminDashboard
      };
    }
    
    // For all other items, use exact or startsWith matching
    const isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && 
                     item.href !== '/' && 
                     pathname.charAt(item.href.length) === '/');
    
    return { ...item, current: isActive };
  });

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      superadmin: 'bg-purple-600',
      admin: 'bg-blue-600',
      manager: 'bg-green-600',
      developer: 'bg-orange-600',
      sales: 'bg-pink-600',
      support: 'bg-teal-600',
      verifier: 'bg-indigo-600'
    };
    return colors[role];
  };

  const handleLogout = () => {
    // Clear auth tokens and redirect to projectk page
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/projectk';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("flex items-center justify-center h-16 px-4", getRoleColor(currentUser.role))}>
          <h1 className="text-xl font-bold text-white">{getRoleDisplayName(currentUser.role)}</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200",
                    item.current
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 w-full p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-400" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", getRoleColor(currentUser.role))}>
                  <span className="text-white text-sm font-medium">{currentUser.avatar}</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
                  <p className="text-xs text-gray-500">{getRoleDisplayName(currentUser.role)}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}