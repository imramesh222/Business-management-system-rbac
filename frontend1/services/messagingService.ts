import { getApiUrl } from '@/lib/api';

export const deleteMessage = async (messageId: string, token: string): Promise<void> => {
  const response = await fetch(getApiUrl(`messaging/messages/${messageId}/`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete message');
  }
};
