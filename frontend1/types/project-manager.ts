// Types for Project Manager Dashboard

export interface ProjectManagerClient {
  id: string;
  name: string;
}

export interface ProjectManagerProject {
  id: string;
  title: string;
  status: string;
  client: ProjectManagerClient;
  progress: number;
  deadline: string | null;
  total_tasks: number;
  completed_tasks: number;
  team_members: ProjectManagerTeamMember[];
}

export interface ProjectManagerTeamMember {
  id: string;
  name: string;
  role: string;
  tasks_assigned: number;
  tasks_completed: number;
}

export interface ProjectManagerTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project: {
    id: string;
    title: string;
  };
  assigned_to: {
    id: string | null;
    name: string;
  } | null;
}

export interface ProjectManagerStats {
  total_projects: number;
  active_projects: number;
  total_team_members: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
}

export interface ProjectManagerDashboardData {
  projects: ProjectManagerProject[];
  recent_tasks: ProjectManagerTask[];
  stats: ProjectManagerStats;
}
