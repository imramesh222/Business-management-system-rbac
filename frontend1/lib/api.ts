import { API_URL } from '@/constant';

/**
 * Get the full URL for API requests
 * Uses the API_URL constant from the constants file
 */
export function getApiUrl(path: string = ''): string {
  // Remove any trailing slashes from the base URL and leading slashes from the path
  return `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/**
 * Get the default headers for API requests
 */
export function getDefaultHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(typeof window !== 'undefined' && {
      'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
    }),
  };
}

/**
 * Helper function to handle API responses
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Clear auth data and redirect to login on 401
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login?session_expired=1';
    }
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || 
      errorData.message || 
      `API request failed with status ${response.status}`
    );
  }
  return response.json();
}
