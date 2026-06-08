import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Create the base API instance
// Use relative path so Vite can proxy /api to the backend in development.
const api = axios.create({ baseURL: '/api' });

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('highland_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 1. CLIENTS API HOOKS (Buyers & Sellers)
 */
export const useClientsApi = () => {
  const queryClient = useQueryClient();
  return {
    getClients: (params: any) => useQuery({
      queryKey: ['clients', params],
      queryFn: async () => (await api.get('/clients', { params })).data
    }),
    createClient: useMutation({
      mutationFn: async (data: any) => await api.post('/clients', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
    }),
    updateClient: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/clients/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
    }),
    deleteClient: useMutation({
      mutationFn: async (id: string) => await api.delete(`/clients/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
    })
  };
};

/**
 * 2. PROJECTS API HOOKS (Inventory Management)
 */
export const useProjectsApi = () => {
  const queryClient = useQueryClient();
  return {
    getProjects: (params: any = {}) => useQuery({
      queryKey: ['projects', params],
      queryFn: async () => (await api.get('/projects', { params })).data
    }),
    createProject: useMutation({
      mutationFn: async (data: any) => await api.post('/projects', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    }),
    updateProject: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/projects/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    }),
    deleteProject: useMutation({
      mutationFn: async (id: string) => await api.delete(`/projects/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    })
  };
};

/**
 * 3. INVOICES API HOOKS (Sales Records)
 */
export const useInvoicesApi = () => {
  const queryClient = useQueryClient();
  return {
    getInvoices: (params: any) => useQuery({
      queryKey: ['invoices', params],
      queryFn: async () => (await api.get('/invoices', { params })).data
    }),
    createInvoice: useMutation({
      mutationFn: async (data: any) => await api.post('/invoices', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }),
    updateInvoice: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/invoices/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }),
    deleteInvoice: useMutation({
      mutationFn: async (id: string) => await api.delete(`/invoices/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
    })
  };
};

/**
 * 4. RECEIPTS API HOOKS (Payment Vouchers)
 */
export const useReceiptsApi = () => {
  const queryClient = useQueryClient();
  return {
    getReceipts: (params: any) => useQuery({
      queryKey: ['receipts', params],
      queryFn: async () => (await api.get('/receipts', { params })).data
    }),
    createReceipt: useMutation({
      mutationFn: async (data: any) => await api.post('/receipts', data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['receipts'] as const });
        queryClient.invalidateQueries({ queryKey: ['invoices'] as const });
      }
    }),
    updateReceipt: useMutation({
      mutationFn: async ({ id, ...data }: any) => await api.put(`/receipts/${id}`, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['receipts'] as const });
        queryClient.invalidateQueries({ queryKey: ['invoices'] as const });
      }
    }),
    deleteReceipt: useMutation({
      mutationFn: async (id: string) => await api.delete(`/receipts/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['receipts'] as const });
        queryClient.invalidateQueries({ queryKey: ['invoices'] as const });
      }
    })
  };
};

/**
 * 5. AGREEMENTS API HOOKS (Legal Contracts)
 */
export const useAgreementsApi = () => {
  const queryClient = useQueryClient();
  return {
    getAgreements: () => useQuery({
      queryKey: ['agreements'],
      queryFn: async () => (await api.get('/agreements')).data
    }),
    createAgreement: useMutation({
      mutationFn: async (data: any) => await api.post('/agreements', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agreements'] })
    }),
    updateAgreement: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/agreements/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agreements'] })
    }),
    deleteAgreement: useMutation({
      mutationFn: async (id: string) => await api.delete(`/agreements/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agreements'] })
    })
  };
};

/**
 * 6. REPORTS & ANALYTICS API HOOKS (Merged)
 */
export const useReportsApi = () => {
  const queryClient = useQueryClient();
  return {
    // Daily Activity Reports
    getReports: () => useQuery({
      queryKey: ['reports'],
      queryFn: async () => (await api.get('/reports')).data
    }),
    createReport: useMutation({
      mutationFn: async (data: any) => await api.post('/reports', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    updateReport: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/reports/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    deleteReport: useMutation({
      mutationFn: async (id: string) => await api.delete(`/reports/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    submitReport: useMutation({
      mutationFn: async (id: string) => await api.post(`/reports/${id}/submit`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    approveReportAssistant: useMutation({
      mutationFn: async ({ id, comments, approved }: any) => await api.post(`/reports/${id}/approve-assistant`, { comments, approved }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    approveReportDirector: useMutation({
      mutationFn: async ({ id, comments, approved }: any) => await api.post(`/reports/${id}/approve-director`, { comments, approved }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] })
    }),
    // Master Ledger Analytics
    getBuyersLedger: () => useQuery({
      queryKey: ['buyers-ledger'],
      queryFn: async () => (await api.get('/clients/reports')).data
    }),
    getProjectsAnalysis: () => useQuery({
      queryKey: ['projects-analysis'],
      queryFn: async () => (await api.get('/projects/reports')).data
    })
  };
};

/**
 * 7. REQUISITIONS API HOOKS (Finance)
 */
export const useRequisitionsApi = () => {
  const queryClient = useQueryClient();
  return {
    getRequisitions: () => useQuery({
      queryKey: ['requisitions'],
      queryFn: async () => (await api.get('/requisitions')).data
    }),
    createRequisition: useMutation({
      mutationFn: async (data: any) => await api.post('/requisitions', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }),
    updateRequisition: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/requisitions/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }),
    deleteRequisition: useMutation({
      mutationFn: async (id: string) => await api.delete(`/requisitions/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }),
    submitRequisition: useMutation({
      mutationFn: async (id: string) => await api.post(`/requisitions/${id}/submit`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }),
    approveRequisitionAssistant: useMutation({
      mutationFn: async ({ id, comments, approved }: any) => await api.post(`/requisitions/${id}/approve-assistant`, { comments, approved }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    }),
    approveRequisitionDirector: useMutation({
      mutationFn: async ({ id, comments, approved }: any) => await api.post(`/requisitions/${id}/approve-director`, { comments, approved }),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    })
  };
};

/**
 * 8. SETTINGS & USER MANAGEMENT
 */
export const useSettingsApi = () => {
  const queryClient = useQueryClient();
  return {
    getSettings: () => useQuery({
      queryKey: ['settings'],
      queryFn: async () => (await api.get('/settings')).data
    }),
    updateSettings: useMutation({
      mutationFn: async (data: any) => await api.put('/settings', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
    })
  };
};

export const useUsersApi = () => {
  const queryClient = useQueryClient();
  return {
    getUsers: () => useQuery({
      queryKey: ['users'],
      queryFn: async () => (await api.get('/users')).data
    }),
    fetchUser: async (id: string) => (await api.get(`/users/${id}`)).data,
    updateUser: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/users/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    }),
    createUser: useMutation({
      mutationFn: async (data: any) => (await api.post('/users', data)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    }),
    deleteUser: useMutation({
      mutationFn: async (id: string) => await api.delete(`/users/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    })
    ,
    forceResetUser: useMutation({
      mutationFn: async ({ id, newPassword }: any) => (await api.post(`/users/${id}/force-reset`, { newPassword })).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    })
  };
};

/**
 * 8. SMS API HOOKS (Customer Communication)
 */
export const useSmsApi = () => {
  const queryClient = useQueryClient();
  return {
    getSms: () => useQuery({
      queryKey: ['sms'],
      queryFn: async () => (await api.get('/sms')).data
    }),
    createSms: useMutation({
      mutationFn: async (data: any) => await api.post('/sms', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms'] })
    }),
    updateSms: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/sms/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms'] })
    }),
    deleteSms: useMutation({
      mutationFn: async (id: string) => await api.delete(`/sms/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms'] })
    }),
    sendBulkSmsByType: useMutation({
      mutationFn: async (data: any) => await api.post('/sms/send-by-type', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms'] })
    })
    ,
    sendCustomSms: useMutation({
      mutationFn: async (data: any) => await api.post('/sms/send-custom', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms'] })
    })
  };
};

export const useLeadsApi = () => {
  const queryClient = useQueryClient();
  return {
    getLeads: () => useQuery({
      queryKey: ['leads'],
      queryFn: async () => (await api.get('/leads')).data
    }),
    createLead: useMutation({
      mutationFn: async (data: any) => await api.post('/leads', data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    }),
    updateLead: useMutation({
      mutationFn: async ({ id, data }: any) => await api.put(`/leads/${id}`, data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    }),
    deleteLead: useMutation({
      mutationFn: async (id: string) => await api.delete(`/leads/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    })
  };
};

/**
 * 9. DASHBOARD STATS
 */
export const useStatsApi = () => {
  return {
    getStats: () => useQuery({
      queryKey: ['stats'],
      queryFn: async () => (await api.get('/stats')).data
    })
  };
};

/**
 * 10. NOTIFICATIONS API
 */
export const useNotificationsApi = () => {
  const queryClient = useQueryClient();
  return {
    getNotifications: () => useQuery({
      queryKey: ['notifications'],
      queryFn: async () => (await api.get('/notifications')).data
    }),
    getUnreadCount: () => useQuery({
      queryKey: ['notifications-unread'],
      queryFn: async () => (await api.get('/notifications/unread/count')).data
    }),
    createNotification: useMutation({
      mutationFn: async (data: any) => (await api.post('/notifications', data)).data,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      }
    }),
    markAsRead: useMutation({
      mutationFn: async (id: string) => (await api.put(`/notifications/${id}/read`, {})).data,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      }
    }),
    markAllAsRead: useMutation({
      mutationFn: async () => (await api.put('/notifications/read-all', {})).data,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      }
    }),
    deleteNotification: useMutation({
      mutationFn: async (id: string) => await api.delete(`/notifications/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      }
    })
  };
};

/**
 * COMPATIBILITY ALIASES 
 */
export const useDailyReportsApi = useReportsApi;