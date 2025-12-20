'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, clearAuthToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, User as UserIcon, Settings, FolderOpen, 
  Calendar, FileText, Users, BarChart2, MessageSquare, Bell, Briefcase, 
  ClipboardList, Tag, CreditCard, FileCheck, FileClock, FileSearch, 
  FileBarChart, FilePlus, FileEdit, FileArchive, FileX, FileClock as FileClockIcon, 
  Clock,
  Ticket} from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  // Common navigation items for all roles
  const commonNavigation = [
    { 
      name: 'Overview', 
      href: '/organization/overview', 
      icon: LayoutDashboard,
      match: (path: string) => path === '/organization/overview' 
    },
    // { 
    //   name: 'Profile', 
    //   href: '/organization/profile', 
    //   icon: UserIcon,
    //   match: (path: string) => path === '/organization/profile' || path === '/profile'
    // }
  ];

  // Role-specific navigation items
  const roleBasedNavigation = {
    // Project Manager
    project_manager: [
      { 
        name: 'Projects', 
        href: '/organization/project/projects', 
        icon: FolderOpen,
        match: (path: string) => path.startsWith('/organization/project/projects')
      },
      { 
        name: 'Messaging', 
        href: '/organization/project/messaging', 
        icon: MessageSquare,
        match: (path: string) => path.startsWith('/organization/project/messaging')
      },
      { 
        name: 'Tasks', 
        href: '/organization/project/tasks', 
        icon: ClipboardList,
        match: (path: string) => path.startsWith('/organization/project/tasks')
      },
      // { 
      //   name: 'Team', 
      //   href: '/organization/project/team', 
      //   icon: Users,
      //   match: (path: string) => path.startsWith('/organization/project/team')
      // }
      // { 
      //   name: 'Reports', 
      //   href: '/organization/project/reports', 
      //   icon: BarChart2,
      //   match: (path: string) => path.startsWith('/organization/project/reports')
      // },
      
    ],
    // Developer
    developer: [
      { 
        name: 'My Tasks', 
        href: '/organization/developer/tasks', 
        icon: ClipboardList,
        match: (path: string) => path.startsWith('/organization/developer/tasks')
      },
      { 
        name: 'Projects', 
        href: '/organization/developer/projects', 
        icon: FolderOpen,
        match: (path: string) => path.startsWith('/organization/developer/projects')
      },
      { 
        name: 'Time Tracking', 
        href: '/organization/developer/time', 
        icon: Clock,
        match: (path: string) => path.startsWith('/organization/developer/time')
      }
    ],
    // Sales
    sales: [
      { 
        name: 'Leads', 
        href: '/organization/sales/leads', 
        icon: Users,
        match: (path: string) => path.startsWith('/organization/sales/leads')
      },
      { 
        name: 'Deals', 
        href: '/organization/sales/deals', 
        icon: Briefcase,
        match: (path: string) => path.startsWith('/organization/sales/deals')
      },
      { 
        name: 'Customers', 
        href: '/organization/sales/customers', 
        icon: Users,
        match: (path: string) => path.startsWith('/organization/sales/customers')
      }
    ],
    // Support
    support: [
      { 
        name: 'Tickets', 
        href: '/organization/support/tickets', 
        icon: Ticket,
        match: (path: string) => path.startsWith('/organization/support/tickets')
      },
      { 
        name: 'Knowledge Base', 
        href: '/organization/support/knowledge-base', 
        icon: FileText,
        match: (path: string) => path.startsWith('/organization/support/knowledge-base')
      }
    ],
    // Verifier
    verifier: [
      { 
        name: 'Documents', 
        href: '/organization/verifier/documents', 
        icon: FileCheck,
        match: (path: string) => path.startsWith('/organization/verifier/documents')
      },
      { 
        name: 'Pending Review', 
        href: '/organization/verifier/pending', 
        icon: FileClockIcon,
        match: (path: string) => path.startsWith('/organization/verifier/pending')
      },
      { 
        name: 'Verified', 
        href: '/organization/verifier/verified', 
        icon: FileCheck,
        match: (path: string) => path.startsWith('/organization/verifier/verified')
      }
    ]
  };

  // Get the user's role from organization_role or fallback to role
  const userRole = user?.organization_role?.toLowerCase() || user?.role?.toLowerCase() || 'user';
  
  // Filter out superadmin and organization_admin roles
  const filteredRole = ['superadmin', 'organization_admin'].includes(userRole) 
    ? 'user' 
    : userRole;

  // Combine common navigation with role-specific navigation
  const navigation = [
    ...commonNavigation,
    ...(roleBasedNavigation[filteredRole as keyof typeof roleBasedNavigation] || [])
  ]

  // Check if current path matches the navigation item
  const isActive = (itemHref: string, matchFn?: (path: string) => boolean) => {
    if (matchFn) {
      return matchFn(pathname);
    }
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  };

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">ProjectK</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      isActive(item.href, item.match)
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-200'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex flex-col space-y-2">
            <div className="text-base font-medium text-gray-800">
              {user?.name || 'User'}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500 capitalize">
                {userRole.replace('_', ' ')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 text-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}