import { api } from "./api";

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type PlanType = "free" | "starter" | "pro" | "business";

export type UserRole = 'user' | 'developer' | 'admin' | 'superadmin';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  role?: UserRole;
  plan?: PlanType;
  creditsRemaining?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
  isEmailVerified?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function hasActiveSubscription(user: AuthUser | null): boolean {
  if (!user) return false;
  const plan = user.plan;
  // Free plan users have access (no paywall)
  if (plan === 'free') return true;
  const status = user.subscriptionStatus;
  return (plan === 'starter' || plan === 'pro' || plan === 'business') &&
         (status === 'active' || status === 'past_due' || status === 'trialing');
}

export const authApi = {
  register: (data: RegisterDto) =>
    api.post<ApiResponse<AuthResponse>>("/auth/register", data),

  login: (data: LoginDto) =>
    api.post<ApiResponse<AuthResponse>>("/auth/login", data),

  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>(
      "/auth/refresh",
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  me: () => api.get<ApiResponse<AuthUser>>("/auth/me"),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, password }),

  verifyEmail: (token: string) => api.post("/auth/verify-email", { token }),

  resendVerification: (email: string) =>
    api.post("/auth/resend-verification", { email }),
};
