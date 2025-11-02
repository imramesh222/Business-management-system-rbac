import { apiGet } from './apiService';

// Base interfaces that match the backend response
export interface SystemService {
  name: string;
  status: 'running' | 'stopped' | string;
  pid?: number;
  memory_mb?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  system: {
    os: string;
    hostname: string;
    python_version: string;
  };
  cpu: {
    usage_percent: number;
    cores: number;
  };
  memory: {
    used_gb: number;
    total_gb: number;
    usage_percent: number;
  };
  disk: {
    used_gb: number;
    total_gb: number;
    usage_percent: number;
  };
  uptime: string;
  database: {
    status: string;
    tables: number;
  };
  services: SystemService[];
}

// Frontend-specific types
export interface FrontendSystemService extends Omit<SystemService, 'status'> {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastChecked?: string;
}

export interface FrontendSystemHealth extends Omit<SystemHealth, 'services' | 'database' | 'cpu' | 'memory' | 'disk' | 'uptime'> {
  services: FrontendSystemService[];
  database: {
    status: 'connected' | 'disconnected';
    size: number;
    tables: number;
  };
  server: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: string;
  };
}

const defaultSystemHealth: FrontendSystemHealth = {
  status: 'unhealthy',
  timestamp: new Date().toISOString(),
  system: {
    os: 'Unknown',
    hostname: 'localhost',
    python_version: 'unknown'
  },
  database: {
    status: 'disconnected',
    size: 0,
    tables: 0
  },
  server: {
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: '0:00:00'
  },
  services: []
};

export const fetchSystemHealth = async (): Promise<FrontendSystemHealth> => {
  try {
    // Fetch raw system health data from the backend
    const response = await apiGet<SystemHealth>('/dashboard/system/health/');
    
    if (!response) {
      console.warn('Empty response from system health endpoint');
      return defaultSystemHealth;
    }
    
    // Transform the response to match our frontend types
    const frontendData: FrontendSystemHealth = {
      status: response.status || 'unhealthy',
      timestamp: response.timestamp || new Date().toISOString(),
      system: {
        os: response.system?.os || 'Unknown',
        hostname: response.system?.hostname || 'localhost',
        python_version: response.system?.python_version || 'unknown'
      },
      database: {
        status: response.database?.status?.toLowerCase() === 'connected' ? 'connected' : 'disconnected',
        size: (response.disk?.used_gb || 0) * 1024 * 1024 * 1024, // Convert GB to bytes
        tables: response.database?.tables || 0
      },
      server: {
        cpu: response.cpu?.usage_percent || 0,
        memory: response.memory?.usage_percent || 0,
        disk: response.disk?.usage_percent || 0,
        uptime: response.uptime || '0:00:00'
      },
      services: Array.isArray(response.services) 
        ? response.services.map(service => ({
            name: service.name || 'Unknown Service',
            status: service.status === 'running' ? 'up' : 'down',
            pid: service.pid,
            memory_mb: service.memory_mb,
            responseTime: 0, // Not provided by backend
            lastChecked: new Date().toISOString()
          }))
        : []
    };
    
    return frontendData;
  } catch (error) {
    console.error('Error fetching system health:', error);
    // Return default system health instead of throwing
    return {
      ...defaultSystemHealth,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      system: {
        ...defaultSystemHealth.system,
        hostname: 'error'
      }
    };
  }
};
