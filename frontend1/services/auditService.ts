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
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    // Ensure the base URL doesn't end with a slash
    let baseUrl = getApiUrl().trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Get the auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Make the request
    const response = await fetch(`${baseUrl}/activity-logs?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    return handleApiResponse<{ data: AuditLog[]; total: number }>(response);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

// Helper function to convert logs to CSV
const convertToCSV = (logs: AuditLog[]): string => {
  const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP', 'User Agent', 'Status', 'Category'];
  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.id,
      log.timestamp,
      log.user,
      log.action,
      log.resource,
      `"${log.details.replace(/"/g, '""')}"`, // Escape quotes
      log.ip,
      `"${log.userAgent.replace(/"/g, '""')}"`, // Escape quotes
      log.status,
      log.category
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

// Helper function to convert logs to PDF (simple text-based)
const convertToPDF = (logs: AuditLog[]): string => {
  let pdfContent = 'AUDIT LOGS REPORT\n';
  pdfContent += `Generated: ${new Date().toLocaleString()}\n`;
  pdfContent += '='.repeat(80) + '\n\n';

  logs.forEach((log, index) => {
    pdfContent += `[${index + 1}] ${log.timestamp}\n`;
    pdfContent += `User: ${log.user}\n`;
    pdfContent += `Action: ${log.action}\n`;
    pdfContent += `Resource: ${log.resource}\n`;
    pdfContent += `Details: ${log.details}\n`;
    pdfContent += `IP: ${log.ip}\n`;
    pdfContent += `Status: ${log.status.toUpperCase()}\n`;
    pdfContent += `Category: ${log.category}\n`;
    pdfContent += '-'.repeat(80) + '\n\n';
  });

  return pdfContent;
};

export const exportAuditLogs = async (
  format: 'csv' | 'pdf' | 'json' = 'csv', 
  params: Omit<GetAuditLogsParams, 'page' | 'limit'> = {}
) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    // Ensure the base URL doesn't end with a slash
    let baseUrl = getApiUrl().trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Get the auth token
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // First, try the server-side export endpoint
    const exportUrl = `${baseUrl}/activity-logs/export?${queryParams.toString()}&format=${format}`;
    
    try {
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Server-side export is available
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        return { success: true, filename };
      }
    } catch (serverError) {
      console.log('Server-side export not available, falling back to client-side export');
    }

    // Fallback: Fetch all logs and convert on client side
    console.log('Using client-side export...');
    
    // Fetch all logs without pagination
    const fetchUrl = `${baseUrl}/activity-logs?${queryParams.toString()}&limit=10000`;
    const response = await fetch(fetchUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch audit logs for export';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await handleApiResponse<{ data: AuditLog[]; total: number }>(response);
    const logs = result.data;

    // Convert logs to the requested format
    let content: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = convertToCSV(logs);
        mimeType = 'text/csv';
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'json':
        content = JSON.stringify(logs, null, 2);
        mimeType = 'application/json';
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'pdf':
        content = convertToPDF(logs);
        mimeType = 'text/plain'; // Simple text format for PDF fallback
        filename = `audit_logs_${new Date().toISOString().split('T')[0]}.txt`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create blob and trigger download
    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
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