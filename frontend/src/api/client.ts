import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动附加Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('opc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：统一错误处理
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('opc_token');
      localStorage.removeItem('opc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) => api.put('/auth/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

// Payment
export const paymentApi = {
  getPlans: () => api.get('/payment/plans'),
  validateCoupon: (couponCode: string) =>
    api.post('/payment/validate-coupon', { couponCode }),
  createOrder: (plan: string, paymentMethod: string, couponCode?: string) =>
    api.post('/payment/create-order', { plan, paymentMethod, couponCode }),
  callback: (orderId: string, status: string) =>
    api.post('/payment/callback', { orderId, status }),
  getOrder: (id: string) => api.get(`/payment/order/${id}`),
  upgrade: (paymentMethod: string, couponCode?: string) => api.post('/payment/upgrade', { paymentMethod, couponCode }),
  requestInvoice: (data: { orderId: string; title: string; taxNo?: string; email: string }) =>
    api.post('/payment/invoice', data),
};

// Onboarding
export const onboardingApi = {
  getOptions: () => api.get('/onboarding/options'),
  submit: (data: { city: string; industries: string[]; resourcePrefs: string[]; otherIndustry?: string }) =>
    api.post('/onboarding/submit', data),
  update: (data: { city?: string; industries?: string[]; resourcePrefs?: string[] }) =>
    api.put('/onboarding/update', data),
};

// Chat / Diagnosis
export const chatApi = {
  getModels: () => api.get('/chat/models'),
  respond: (data: {
    profile: Record<string, unknown>;
    latestUserMessage: string;
    answers?: Array<Record<string, unknown>>;
    modelId?: string;
  }) => api.post('/chat/respond', data),
  buildReport: (data: {
    profile: Record<string, unknown>;
    answers: Array<Record<string, unknown>>;
  }) => api.post('/chat/report', data),
};

export async function streamChatResponse(
  data: {
    profile: Record<string, unknown>;
    latestUserMessage: string;
    answers?: Array<Record<string, unknown>>;
    modelId?: string;
  },
  handlers: {
    onEvent?: (event: string, payload: any) => void;
    onDelta?: (chunk: string) => void;
    onDone?: () => void;
  }
) {
  const token = localStorage.getItem('opc_token');
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok || !response.body) {
    throw new Error(`stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n');
      let payload = '';
      currentEvent = 'message';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        }
        if (line.startsWith('data:')) {
          payload += line.slice(5).trim();
        }
      }

      if (!payload) continue;
      const parsed = JSON.parse(payload);
      handlers.onEvent?.(currentEvent, parsed);

      if (currentEvent === 'delta') {
        handlers.onDelta?.(parsed.content || '');
      }

      if (currentEvent === 'done') {
        handlers.onDone?.();
      }
    }
  }
}

// Learning
export const learningApi = {
  getPath: () => api.get('/learning/path'),
  getModule: (id: string) => api.get(`/learning/module/${id}`),
  getLesson: (id: string) => api.get(`/learning/lesson/${id}`),
  updateProgress: (lessonId: string, progress: number, completed?: boolean) =>
    api.post(`/learning/lesson/${lessonId}/progress`, { progress, completed }),
  markComplete: (lessonId: string) =>
    api.post(`/learning/lesson/${lessonId}/mark-complete`),
  getStats: () => api.get('/learning/stats'),
};

// Government
export const governmentApi = {
  getPolicies: (params?: Record<string, string>) => api.get('/government/policies', { params }),
  getPolicy: (id: string) => api.get(`/government/policies/${id}`),
  savePolicy: (id: string) => api.post(`/government/policies/${id}/save`),
  getSaved: () => api.get('/government/saved'),
  ask: (data: { question: string; city?: string; policyId?: string }) =>
    api.post('/government/qa', data),
  getQAHistory: () => api.get('/government/qa/history'),
};

// Experts
export const expertsApi = {
  getExperts: (industry?: string) => api.get('/experts', { params: { industry } }),
  getExpert: (id: string) => api.get(`/experts/${id}`),
  createBooking: (data: {
    expertId: string; slotId: string; name: string; wechat: string;
    phone: string; city: string; industry: string; description: string;
  }) => api.post('/experts/bookings', data),
  getMyBookings: () => api.get('/experts/bookings/my'),
  getBooking: (id: string) => api.get(`/experts/bookings/${id}`),
  cancelBooking: (id: string, reason?: string) =>
    api.post(`/experts/bookings/${id}/cancel`, { reason }),
  rateBooking: (id: string, rating: number) =>
    api.post(`/experts/bookings/${id}/rate`, { rating }),
};

// Community
export const communityApi = {
  getPosts: (params?: Record<string, string>) => api.get('/community/posts', { params }),
  getPost: (id: string) => api.get(`/community/posts/${id}`),
  createPost: (data: { title: string; content: string; industry?: string; tags?: string[] }) =>
    api.post('/community/posts', data),
  updatePost: (id: string, data: { title?: string; content?: string }) =>
    api.put(`/community/posts/${id}`, data),
  deletePost: (id: string) => api.delete(`/community/posts/${id}`),
  likePost: (id: string) => api.post(`/community/posts/${id}/like`),
  getComments: (postId: string) => api.get(`/community/posts/${postId}/comments`),
  createComment: (postId: string, content: string, parentId?: string) =>
    api.post(`/community/posts/${postId}/comments`, { content, parentId }),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, status: string) =>
    api.patch(`/admin/users/${id}/status`, { status }),
  getOrders: (params?: Record<string, string>) => api.get('/admin/orders', { params }),
  refundOrder: (id: string, reason: string) =>
    api.post(`/admin/orders/${id}/refund`, { reason }),
  getBookings: (params?: Record<string, string>) => api.get('/admin/bookings', { params }),
  updateBookingStatus: (id: string, status: string) =>
    api.patch(`/admin/bookings/${id}/status`, { status }),
  uploadSummary: (id: string, summaryUrl: string) =>
    api.post(`/admin/bookings/${id}/summary`, { summaryUrl }),
  getEmailLogs: (params?: Record<string, string>) => api.get('/admin/email-logs', { params }),
  retryEmail: (id: string) => api.post(`/admin/email-logs/${id}/retry`),
};
