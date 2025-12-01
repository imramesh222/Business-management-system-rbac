export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  startDate: string;
  dueDate: string;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  budget: number;
  spent: number;
  clientId?: string;
  clientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatus {
  status: string;
  count: number;
  color: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  cancelled: number;
  overdue: number;
  dueThisWeek: number;
  completedThisWeek: number;
  startedThisWeek: number;
}

export interface ProjectFilter {
  status?: string[];
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
