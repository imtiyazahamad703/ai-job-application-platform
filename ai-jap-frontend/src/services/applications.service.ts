import { api } from './api.service';

export interface Application {
  _id: string;
  userId: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location: string;
    url: string;
  };
  personaId: string;
  status: 'PENDING' | 'PROCESSING' | 'APPLIED' | 'FAILED' | 'INTERVIEWING' | 'REJECTED' | 'OFFER';
  platform: string;
  logs: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const applicationsService = {
  getApplications: async (): Promise<Application[]> => {
    const response = await api.get('/applications');
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<Application> => {
    const response = await api.patch(`/applications/${id}/status`, { status });
    return response.data;
  },
};
