import { api } from './api';

// Backend wraps responses in { data: T }
interface ApiResponse<T> {
  data: T;
}

export type PlanType = 'free' | 'starter' | 'pro' | 'business';

export interface SubscriptionDto {
  id: string | null;
  plan: 'free' | 'starter' | 'pro' | 'business';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

export interface UserLimitsDto {
  plan: string;
  credits: {
    remaining: number;
    monthlyAllocation: number;
    resetAt: string | null;
  };
  projects: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  screens: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  codeExports: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  figmaExports: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  canPurchaseCredits: boolean;
}

export interface CreditPackDto {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  stripePriceId: string;
  badge?: string;
}

export interface CreditTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface CheckoutUrlData {
  url: string;
}

export const PLAN_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    credits: 5,
    screens: 5,
    projects: 1,
    codeExports: 0,
    figmaExports: 0,
    support: 'Community',
    canPurchaseCredits: false,
    githubConnect: false,
    codeExport: false,
    dailyGenerationLimit: 5,
  },
  starter: {
    name: 'Starter',
    price: 25,
    credits: 100,
    screens: 50,
    projects: 3,
    codeExports: Infinity,
    figmaExports: 0,
    support: 'Email',
    canPurchaseCredits: true,
    githubConnect: false,
    codeExport: true,
  },
  pro: {
    name: 'Pro',
    price: 50,
    credits: 250,
    screens: Infinity,
    projects: 10,
    codeExports: Infinity,
    figmaExports: 0,
    support: 'Priority',
    canPurchaseCredits: true,
    githubConnect: true,
    codeExport: true,
  },
  business: {
    name: 'Business',
    price: 100,
    credits: 500,
    screens: Infinity,
    projects: Infinity,
    codeExports: Infinity,
    figmaExports: Infinity,
    support: 'Dedicated',
    canPurchaseCredits: true,
    githubConnect: true,
    codeExport: true,
  },
};

export const BUILD_SUBMISSION_PRICES = {
  general: { priceUsd: 79, estimatedDays: '1-2 weeks' },
  priority: { priceUsd: 199, estimatedDays: 'up to 1 week' },
} as const;

export const CREDIT_PACKS = [
  { id: 'pack_100', credits: 100, priceUsd: 5, name: 'Starter Pack' },
  { id: 'pack_500', credits: 500, priceUsd: 20, name: 'Growth Pack' },
  { id: 'pack_1500', credits: 1500, priceUsd: 50, name: 'Power Pack', badge: 'Best Value' },
];

export const paymentsApi = {
  getSubscription: () =>
    api.get<ApiResponse<SubscriptionDto>>('/payments/subscription'),

  getLimits: () =>
    api.get<ApiResponse<UserLimitsDto>>('/payments/limits'),

  getCreditsBalance: () =>
    api.get<ApiResponse<{ balance: number }>>('/payments/credits/balance'),

  getCreditsHistory: (limit = 20, offset = 0) =>
    api.get<ApiResponse<CreditTransactionDto[]>>(`/payments/credits/history?limit=${limit}&offset=${offset}`),

  getCreditPacks: () =>
    api.get<ApiResponse<CreditPackDto[]>>('/payments/credit-packs'),

  createCheckout: (plan: 'starter' | 'pro' | 'business', successUrl?: string) =>
    api.post<ApiResponse<CheckoutUrlData>>('/payments/create-checkout', { plan, successUrl }),

  createPortalSession: () =>
    api.post<ApiResponse<CheckoutUrlData>>('/payments/create-portal'),

  purchaseCredits: (packId: string) =>
    api.post<ApiResponse<CheckoutUrlData>>('/payments/purchase-credits', { packId }),

  syncSubscription: () =>
    api.post<ApiResponse<SubscriptionDto>>('/payments/sync-subscription'),

  cancelSubscription: () =>
    api.post<ApiResponse<{ success: boolean }>>('/payments/cancel-subscription'),
};

export function formatLimit(used: number, limit: number, isUnlimited: boolean): string {
  if (isUnlimited) return `${used} / Unlimited`;
  return `${used} / ${limit}`;
}

export function getUsagePercentage(used: number, limit: number, isUnlimited: boolean): number {
  if (isUnlimited) return 0;
  return Math.min((used / limit) * 100, 100);
}
