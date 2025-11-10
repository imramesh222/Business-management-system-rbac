import { getApiUrl, handleApiResponse } from '@/lib/api';

type ReportType = 'user-activity' | 'billing' | 'system-performance' | 'audit-logs' | 'custom';
type ReportFormat = 'csv' | 'pdf' | 'xlsx' | 'json';

interface ReportParams {
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
}

export const generateReport = async (
  reportType: ReportType,
  format: ReportFormat = 'pdf',
  params: ReportParams = {}
) => {
  try {
    const baseUrl = getApiUrl().replace(/\/+$/, ''); // Remove trailing slashes
    const url = `${baseUrl}/reports/generate/`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify({
        reportType,
        format,
        ...params
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate report');
    }

    // Get the filename from the Content-Disposition header or generate one
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create a blob from the response and trigger download
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
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

export const getAvailableReports = async () => {
  const response = await fetch(`${getApiUrl()}/reports/available`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
  });

  return handleApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    availableFormats: ReportFormat[];
    defaultFormat: ReportFormat;
  }>>(response);
};

export const getReportHistory = async (page = 1, limit = 10) => {
  const response = await fetch(`${getApiUrl()}/reports/history?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
  });

  return handleApiResponse<{
    data: Array<{
      id: string;
      reportType: string;
      format: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      createdAt: string;
      downloadUrl?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(response);
};
