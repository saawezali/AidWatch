import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Crisis API
export const crisisApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    // Filter out undefined values
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) : undefined;
    const response = await api.get('/crises', { params: cleanParams });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/crises/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/crises/stats/overview');
    return response.data;
  },
};

// Alerts API
export const alertsApi = {
  list: async (params?: Record<string, string | number | boolean>) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },
  markRead: async (id: string) => {
    const response = await api.patch(`/alerts/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.patch('/alerts/read-all');
    return response.data;
  },
};

// Events API
export const eventsApi = {
  list: async (params?: Record<string, string | number>) => {
    const response = await api.get('/events', { params });
    return response.data;
  },
};
