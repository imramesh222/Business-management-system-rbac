/**
 * Get the base URL for API requests
 * Uses NEXT_PUBLIC_API_URL from environment variables with a fallback to localhost:8000
 */
export function getApiUrl(path: string = ''): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  // Remove any trailing slashes from the base URL and leading slashes from the path
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
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
