import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  creditsRemaining: string;
  subscriptionStatus: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  projectsCount: number;
  screensCount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  freeUsers: number;
  starterUsers: number;
  proUsers: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  plan?: 'free' | 'starter' | 'pro' | 'business';
  creditsRemaining?: number;
}

export interface UpdateUserDto {
  name?: string;
  plan?: 'free' | 'starter' | 'pro' | 'business';
  creditsRemaining?: number;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing';
  isEmailVerified?: boolean;
}

export interface AnalyticsData {
  mrr: {
    total: number;
    breakdown: { plan: string; count: number; revenue: number }[];
  };
  dailyGenerations: { date: string; count: number }[];
  activeUsers: {
    last7Days: number;
    last30Days: number;
  };
  planDistribution: { plan: string; count: number }[];
  credits: {
    totalUsed: number;
    totalGranted: number;
  };
}

const getHeaders = (password: string) => ({
  'x-admin-password': password,
  'Content-Type': 'application/json',
});

// Helper to unwrap nested data (handles both single and double-wrapped responses)
const unwrapData = <T>(response: { data: { data?: T; success?: boolean } | T }): T => {
  const outer = response.data;
  if (outer && typeof outer === 'object' && 'data' in outer) {
    const inner = outer.data;
    // Check for double wrapping
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return (inner as { data: T }).data;
    }
    return inner as T;
  }
  return outer as T;
};

export const adminApi = {
  authenticate: async (password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/auth`, { password });
      return response.data?.success || response.data?.data?.success || false;
    } catch {
      return false;
    }
  },

  getStats: async (password: string): Promise<AdminStats> => {
    const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },

  getUsers: async (
    password: string,
    page = 1,
    limit = 20,
    search?: string
  ): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);

    const response = await axios.get(`${API_BASE_URL}/admin/users?${params}`, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },

  getUser: async (password: string, userId: string): Promise<AdminUser> => {
    const response = await axios.get(`${API_BASE_URL}/admin/users/${userId}`, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },

  createUser: async (password: string, dto: CreateUserDto): Promise<AdminUser> => {
    const response = await axios.post(`${API_BASE_URL}/admin/users`, dto, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },

  updateUser: async (password: string, userId: string, dto: UpdateUserDto): Promise<AdminUser> => {
    const response = await axios.put(`${API_BASE_URL}/admin/users/${userId}`, dto, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },

  deleteUser: async (password: string, userId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
      headers: getHeaders(password),
    });
  },

  getAnalytics: async (password: string): Promise<AnalyticsData> => {
    const response = await axios.get(`${API_BASE_URL}/admin/analytics`, {
      headers: getHeaders(password),
    });
    return unwrapData(response);
  },
};
