export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
