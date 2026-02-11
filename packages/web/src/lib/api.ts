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

// Subscriptions API
export interface SubscriptionData {
  email: string;
  name?: string;
  regions: string[];
  crisisTypes: string[];
  minSeverity: number;
  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
}

export interface SubscriptionResponse {
  id: string;
  email: string;
  name: string | null;
  regions: string[];
  crisisTypes: string[];
  minSeverity: number;
  frequency: string;
  isActive: boolean;
  emailVerified: boolean;
}

export const subscriptionsApi = {
  getRegions: async () => {
    const response = await api.get('/subscriptions/regions');
    return response.data;
  },
  
  create: async (data: SubscriptionData) => {
    const response = await api.post('/subscriptions', data);
    return response.data;
  },
  
  verify: async (token: string) => {
    const response = await api.get(`/subscriptions/verify/${token}`);
    return response.data;
  },
  
  getByToken: async (token: string) => {
    const response = await api.get(`/subscriptions/manage/${token}`);
    return response.data;
  },
  
  update: async (token: string, data: Partial<SubscriptionData>) => {
    const response = await api.put(`/subscriptions/manage/${token}`, data);
    return response.data;
  },
  
  unsubscribe: async (token: string) => {
    const response = await api.delete(`/subscriptions/unsubscribe/${token}`);
    return response.data;
  },
  
  resubscribe: async (token: string) => {
    const response = await api.post(`/subscriptions/resubscribe/${token}`);
    return response.data;
  },
};
