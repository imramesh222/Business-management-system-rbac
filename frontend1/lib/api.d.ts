/**
 * Type declarations for the API module
 */

declare module '@/lib/api' {
  /**
   * Get the base URL for API requests
   * @param path - The API endpoint path (optional)
   * @returns The full API URL
   */
  export function getApiUrl(path?: string): string;

  /**
   * Get the default headers for API requests
   * @returns An object containing the default headers
   */
  export function getDefaultHeaders(): HeadersInit;

  /**
   * Handle API responses and throw errors for non-OK responses
   * @template T - The expected response data type
   * @param response - The fetch Response object
   * @returns A promise that resolves to the response data
   * @throws {Error} If the response is not OK
   */
  export function handleApiResponse<T>(response: Response): Promise<T>;
}
