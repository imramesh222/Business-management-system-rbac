import { apiGet } from '@/lib/api-client';
import { 
  ProjectManagerDashboardData, 
  ProjectManagerProject, 
  ProjectManagerTask 
} from '@/types/project-manager';

interface ApiResponse<T> {
  data: T;
  [key: string]: any;
}

/**
 * Fetches the project manager dashboard data
 * @returns Promise with project manager dashboard data
 */
export const fetchProjectManagerDashboard = async (): Promise<ProjectManagerDashboardData> => {
  try {
    const response = await apiGet<ApiResponse<ProjectManagerDashboardData>>('/organization/dashboard/project-manager/');
    return response.data;
  } catch (error) {
    console.error('Error fetching project manager dashboard data:', error);
    throw error;
  }
};

/**
 * Fetches detailed project data for a specific project
 * @param projectId - The ID of the project to fetch
 * @returns Promise with detailed project data
 */
export const fetchProjectDetails = async (projectId: string): Promise<ProjectManagerProject> => {
  try {
    const response = await apiGet<ApiResponse<ProjectManagerProject>>(`/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching project details for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Fetches tasks for a specific project
 * @param projectId - The ID of the project
 * @returns Promise with list of tasks
 */
export const fetchProjectTasks = async (projectId: string): Promise<ProjectManagerTask[]> => {
  try {
    const response = await apiGet<ApiResponse<{ results: ProjectManagerTask[] }>>(`/projects/${projectId}/tasks/`);
    return response.data.results || [];
  } catch (error) {
    console.error(`Error fetching tasks for project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Fetches team member statistics for a project
 * @param projectId - The ID of the project
 * @returns Promise with team member statistics
 */
export const fetchTeamMemberStats = async (projectId: string) => {
  try {
    const response = await apiGet<ApiResponse<any>>(`/projects/${projectId}/team-stats/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team member stats for project ${projectId}:`, error);
    throw error;
  }
};
