import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, getCurrentUserWithFallback } from '@/lib/auth';

// Check if the code is running on the server
const isServer = typeof window === 'undefined';

// List of public paths that don't require authentication
const publicPaths = ['/login', '/register', '/_next', '/favicon.ico'];

// Global roles that exist outside organizations
const GLOBAL_ROLES = ['superadmin', 'user'] as const;

// Organization-specific roles
const ORG_ROLES = [
  'admin',
  'salesperson',
  'verifier',
  'project_manager',
  'support',
  'developer'
] as const;

// All possible roles
type UserRole = typeof GLOBAL_ROLES[number] | typeof ORG_ROLES[number];

// List of protected paths and their allowed roles
const protectedPaths: Record<string, UserRole[]> = {
  // Superadmin dashboard - only for global superadmins
  '/superadmin': ['superadmin'],
  
  // Organization dashboard - for org admins and superadmins
  '/organization/dashboard': ['admin', 'superadmin'],
  
  // Organization management - for org admins and superadmins
  '/organization/members': ['admin', 'superadmin'],
  '/organization/settings': ['admin', 'superadmin'],
  '/organization/billing': ['admin', 'superadmin'],
  
  // Project management - for project managers and above
  '/organization/projects': ['project_manager', 'admin', 'superadmin'],
  
  // Reports - for admins and superadmins
  '/organization/reports': ['admin', 'superadmin'],
  
  // Main dashboard - for all authenticated users
  '/dashboard': ['user', 'admin', 'superadmin', ...ORG_ROLES],
  
  // Role-based dashboards
  '/user/dashboard': ['user'],
  '/admin/dashboard': ['admin', 'superadmin'],
  '/manager/dashboard': ['project_manager'],
  '/developer/dashboard': ['developer'],
  '/sales/dashboard': ['salesperson'],
  '/support/dashboard': ['support'],
  '/verifier/dashboard': ['verifier'],
  
  // Legacy organization routes (keep for backward compatibility)
  '/projects': ['project_manager', 'admin', 'superadmin'],
  '/sales': ['salesperson', 'admin', 'superadmin'],
  '/support': ['support', 'admin', 'superadmin'],
  '/verification': ['verifier', 'admin', 'superadmin']
};

// Get the base path from a URL path
function getBasePath(path: string): string {
  // Special handling for organization routes
  if (path.startsWith('/organization/')) {
    // For organization routes, use the first two segments (e.g., '/organization/members')
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `/${parts[0]}/${parts[1]}`;
    }
    return `/${parts[0]}`;
  }
  
  // For all other paths, just use the first segment
  const parts = path.split('/').filter(Boolean);
  // Special case: root path
  if (parts.length === 0) return '/';
  // For paths like '/dashboard', return as is
  if (parts.length === 1) return `/${parts[0]}`;
  // For other paths, return the first segment
  return `/${parts[0]}`;
}

// Get the appropriate dashboard path based on user role
function getDashboardPath(role: string): string {
  const rolePaths: Record<string, string> = {
    'superadmin': '/admin/dashboard',
    'admin': '/admin/dashboard',
    'project_manager': '/manager/dashboard',
    'developer': '/developer/dashboard',
    'salesperson': '/sales/dashboard',
    'support': '/support/dashboard',
    'verifier': '/verifier/dashboard',
    'user': '/user/dashboard'
  };

  return rolePaths[role] || '/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const basePath = getBasePath(pathname);
  
  console.log(`[MIDDLEWARE] Path: ${pathname}, Base Path: ${basePath}`);
  
  // Skip middleware for API routes, static files, and public paths
  if (
    pathname.startsWith('/api') || 
    pathname.includes('.') ||
    publicPaths.some(publicPath => pathname.startsWith(publicPath))
  ) {
    console.log(`[MIDDLEWARE] Skipping middleware for path: ${pathname}`);
    return NextResponse.next();
  }

  // Skip authentication check for protected paths during SSR
  // Let the client-side handle the redirection if needed
  if (isServer) {
    console.log('[MIDDLEWARE] Server-side rendering, skipping auth check');
    return NextResponse.next();
  }

  // Client-side authentication check
  console.log('[MIDDLEWARE] Client-side, checking authentication...');
  const isLoggedIn = isAuthenticated();
  console.log(`[MIDDLEWARE] Is authenticated: ${isLoggedIn}`);
  
  // Handle unauthenticated users
  if (!isLoggedIn) {
    console.log('[MIDDLEWARE] User not authenticated, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get current user with detailed debug logging
  const user = getCurrentUserWithFallback();
  console.log('[MIDDLEWARE] Current user:', JSON.stringify(user, null, 2));
  
  // Debug: Log raw token and parsed JWT
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      console.log('[MIDDLEWARE] Raw token:', token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('[MIDDLEWARE] JWT Payload:', JSON.stringify(payload, null, 2));
        console.log('[MIDDLEWARE] JWT Role:', payload.role);
      } catch (e) {
        console.error('[MIDDLEWARE] Error parsing JWT:', e);
      }
    }
  }
  
  if (!user) {
    console.log('[MIDDLEWARE] No user found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Debug: Log all available user properties
  console.log('[MIDDLEWARE] User role:', user.role);
  console.log('[MIDDLEWARE] User ID:', user.id);
  console.log('[MIDDLEWARE] User email:', user.email);
  
  // Check if user.role exists and is a valid role
  if (!user.role) {
    console.error('[MIDDLEWARE] User role is missing!');
  } else if (![...GLOBAL_ROLES, ...ORG_ROLES].includes(user.role.toLowerCase())) {
    console.error(`[MIDDLEWARE] Invalid user role: ${user.role}`);
    console.error(`[MIDDLEWARE] Valid roles:`, [...GLOBAL_ROLES, ...ORG_ROLES]);
  }

  // Debug: Log all protected paths and their allowed roles
  console.log('[MIDDLEWARE] All protected paths and roles:', JSON.stringify(protectedPaths, null, 2));
  
  // Check if user has access to the requested path
  const allowedRoles = protectedPaths[basePath];
  console.log(`[MIDDLEWARE] Checking access for path: ${basePath}`);
  console.log(`[MIDDLEWARE] User role: ${user.role}, Allowed roles:`, allowedRoles);
  
  if (allowedRoles) {
    const normalizedUserRole = user.role.toLowerCase() as UserRole;
    
    // Special case: superadmin has access to everything
    if (normalizedUserRole === 'superadmin') {
      console.log(`[MIDDLEWARE] Superadmin access granted to ${basePath}`);
      return NextResponse.next();
    }
    
    // Check if user's role is in the allowed roles for this path
    const hasAccess = allowedRoles.includes(normalizedUserRole);
    
    if (!hasAccess) {
      console.log(`[MIDDLEWARE] Access denied for role ${normalizedUserRole} at path ${basePath}`);
      console.log(`[MIDDLEWARE] Allowed roles for this path:`, allowedRoles);
      
      // Redirect to appropriate dashboard based on role
      const dashboardPath = getDashboardPath(normalizedUserRole);
      console.log(`[MIDDLEWARE] Redirecting to dashboard: ${dashboardPath}`);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    
    console.log(`[MIDDLEWARE] Access granted: User ${normalizedUserRole} has access to ${basePath}`);
  } else {
    console.log(`[MIDDLEWARE] No role restrictions for path: ${basePath}`);
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
