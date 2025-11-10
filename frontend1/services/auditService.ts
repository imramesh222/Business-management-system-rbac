import { getApiUrl, handleApiResponse } from '@/lib/api';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  category: 'user' | 'system' | 'security' | 'organization';
}

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export const getAuditLogs = async (params: GetAuditLogsParams = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.category) queryParams.append('category', params.category);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(`${getApiUrl()}/audit-logs?${queryParams}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  });

  return handleApiResponse<{ data: AuditLog[]; total: number }>(response);
};

export const exportAuditLogs = async (format: 'csv' | 'pdf' | 'json' = 'csv', params: Omit<GetAuditLogsParams, 'page' | 'limit'> = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.category) queryParams.append('category', params.category);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await fetch(`${getApiUrl()}/audit-logs/export?format=${format}&${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export audit logs');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

export const getAuditLogStats = async () => {
  const response = await fetch(`${getApiUrl()}/audit-logs/stats`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  });

  return handleApiResponse<{
    total: number;
    byStatus: { status: string; count: number }[];
    byCategory: { category: string; count: number }[];
    byDay: { date: string; count: number }[];
  }>(response);
};
