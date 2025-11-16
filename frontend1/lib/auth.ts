// Authentication and role management
export type UserRole = 'superadmin' | 'admin' | 'developer' | 'project_manager' | 'verifier' | 'salesperson' | 'support' | 'user';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// JWT token type
export interface JwtPayload {
  // Standard JWT claims
  sub?: string;           // Subject (user ID)
  email?: string;         // User's email
  name?: string;          // User's full name
  role?: UserRole;        // User's role (fallback)
  exp: number;            // Expiration time
  iat?: number;           // Issued at
  
  // Custom claims
  user_id?: string | number;  // User ID (legacy)
  organization_role?: string; // User's role in the organization
  organization_id?: string;   // Organization ID
  organization_name?: string; // Organization name
  is_staff?: boolean;     // Is staff member
  is_superuser?: boolean; // Is superuser
  
  // Allow any other string keys
  [key: string]: any;
}

export interface User {
  phone: string;
  timezone: string;
  last_name: string;
  first_name: string;
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  organization_role?: UserRole;  // User's role in the organization
  organization?: {
    id: string;
    name: string;
  };
  // For backward compatibility, also include direct organization fields
  organization_id?: string;
  organization_name?: string;
  avatar: string;
  is_superuser?: boolean;
  is_staff?: boolean;
  permissions?: string[];
}

// Token management
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAuthToken = (access: string, refresh: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    console.log('[AUTH] Checking token expiration...');
    
    // Check if token has the expected format
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      console.error('[AUTH] Invalid token format');
      return true;
    }
    
    const parts = token.split('.');
    const base64Url = parts[1];
    
    // Add padding if needed
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    console.log('[AUTH] Decoding token payload...');
    const decodedPayload = atob(paddedBase64);
    console.log('[AUTH] Decoded payload:', decodedPayload);
    
    const payload = JSON.parse(decodedPayload) as JwtPayload;
    
    if (!payload.exp) {
      console.error('[AUTH] No expiration time in token');
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    
    console.log(`[AUTH] Token expiration check - exp: ${payload.exp}, current: ${currentTime}, isExpired: ${isExpired}`);
    
    return isExpired;
  } catch (error) {
    console.error('[AUTH] Error checking token expiration:', error);
    return true;
  }
};

// Parse JWT token
export const parseJwt = (token: string): JwtPayload | null => {
  try {
    console.log('[AUTH] Parsing JWT token...');
    
    // Check if token has the expected format
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      console.error('[AUTH] Invalid token format in parseJwt');
      return null;
    }
    
    const parts = token.split('.');
    const base64Url = parts[1];
    
    // Add padding if needed
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    console.log('[AUTH] Decoding token payload in parseJwt...');
    const decodedPayload = atob(paddedBase64);
    console.log('[AUTH] Decoded payload in parseJwt:', decodedPayload);
    
    const payload = JSON.parse(decodedPayload);
    
    // Validate the payload structure
    if (!payload || typeof payload !== 'object' || !payload.user_id || !payload.role) {
      console.error('[AUTH] Invalid token payload structure:', payload);
      return null;
    }
    
    return payload as JwtPayload;
  } catch (error) {
    console.error('[AUTH] Error parsing JWT token:', error);
    return null;
  }
};

// Get current user from token
export const getCurrentUser = (): User | null => {
  // Return null on server side
  if (typeof window === 'undefined') return null;
  
  const token = getAccessToken();
  if (!token) return null;
  
  if (isTokenExpired(token)) {
    clearAuthToken();
    return null;
  }
  
  const payload = parseJwt(token);
  if (!payload) return null;
  
  console.log('[AUTH] Decoded JWT payload:', payload);
  
  // Determine the user's role, prioritizing organization_role over role
  const roleFromToken = (payload.organization_role || payload.role || 'user').toLowerCase();
  const userRole = (['superadmin', 'admin', 'developer', 'project_manager', 'verifier', 'salesperson', 'support', 'user'].includes(roleFromToken) 
    ? roleFromToken 
    : 'user') as UserRole;
  
  // Map JWT payload to User interface
  const user: User = {
    id: payload.user_id || payload.sub || `user-${Date.now()}`,
    name: payload.name || payload.email?.split('@')[0] || 'User',
    email: payload.email || '',
    role: userRole,
    avatar: payload.email?.charAt(0).toUpperCase() || 'U',
    is_staff: payload.is_staff || false,
    is_superuser: payload.is_superuser || false,
    organization_role: userRole,
    // Map organization fields
    organization_id: payload.organization_id,
    organization_name: payload.organization_name,
    // Also include organization object for backward compatibility
    organization: payload.organization_id ? {
      id: payload.organization_id,
      name: payload.organization_name || 'Organization'
    } : undefined
  };

  // Add organization details if available in the token
  if (payload.organization_id || payload.organization_name) {
    user.organization = {
      id: String(payload.organization_id || ''),
      name: String(payload.organization_name || 'Unknown Organization')
    };
    
    // If we have an organization role in the token, use it
    if (payload.organization_role) {
      const orgRole = payload.organization_role.toLowerCase();
      if (['superadmin', 'admin', 'developer', 'project_manager', 'verifier', 'salesperson', 'support', 'user'].includes(orgRole)) {
        user.organization_role = orgRole as UserRole;
      }
    }
  }
  
  console.log('[AUTH] Processed user object:', user);

  return user;
};

// Mock user for development (remove in production)
export const getMockUser = (): User => {
  return {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'superadmin',
    avatar: 'A',
    organization: {
      id: '1',
      name: 'Example Corp'
    }
  };
};

// Get current user with fallback to basic user data
export const getCurrentUserWithFallback = (): User | null => {
  // Get the basic user data from the token
  const user = getCurrentUser();
  if (!user) {
    // In development, return a mock user with organization role for testing
    if (process.env.NODE_ENV === 'development') {
      const mockUser = getMockUser();
      // Ensure the mock user includes organization_role if needed
      if (mockUser.role === 'project_manager') {
        mockUser.organization_role = 'project_manager';
      }
      return mockUser;
    }
    return null;
  }
  
  return user;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  // Always return false during server-side rendering
  if (typeof window === 'undefined') {
    console.log('[AUTH] Server-side rendering, not authenticated');
    return false;
  }
  
  try {
    console.log('[AUTH] Checking authentication status...');
    const token = getAccessToken();
    
    if (!token) {
      console.log('[AUTH] No access token found in localStorage');
      console.log('[AUTH] localStorage content:', JSON.stringify(window.localStorage, null, 2));
      return false;
    }
    
    console.log('[AUTH] Access token found, checking expiration...');
    const isExpired = isTokenExpired(token);
    
    if (isExpired) {
      console.log('[AUTH] Token is expired');
      // Try to parse the token to see its contents
      try {
        const tokenData = parseJwt(token);
        console.log('[AUTH] Expired token data:', tokenData);
        if (tokenData?.exp) {
          const expiryDate = new Date(tokenData.exp * 1000);
          console.log(`[AUTH] Token expired on: ${expiryDate.toISOString()}`);
        }
      } catch (e) {
        console.error('[AUTH] Error parsing token:', e);
      }
      return false;
    }
    
    // If we get here, token is valid
    const user = getCurrentUserWithFallback();
    console.log('[AUTH] User is authenticated');
    console.log('[AUTH] User data:', user);
    
    if (!user) {
      console.log('[AUTH] No user data found, not authenticated');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[AUTH] Error in isAuthenticated:', error);
    return false;
  }
};

// Role-based access control
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    superadmin: 9,
    admin: 8,
    project_manager: 7,
    developer: 6,
    salesperson: 5,
    support: 4,
    verifier: 3,
    user: 2
  };
  
  // If either role is not in the hierarchy, default to false for safety
  if (!(userRole in roleHierarchy) || !(requiredRole in roleHierarchy)) {
    console.warn(`Unknown role in permission check: ${userRole} or ${requiredRole}`);
    return false;
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    superadmin: 'Super Admin',
    admin: 'Organization Admin',
    project_manager: 'Project Manager',
    developer: 'Developer',
    salesperson: 'Salesperson',
    support: 'Support Staff',
    verifier: 'Verifier',
    user: 'User'
  };
  
  return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
};

// Check if current user has required role
export const hasRequiredRole = (requiredRole: UserRole): boolean => {
  const user = getCurrentUserWithFallback();
  return user ? hasPermission(user.role, requiredRole) : false;
};