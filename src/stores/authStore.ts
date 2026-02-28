import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  authApi,
  type AuthUser,
  type LoginDto,
  type RegisterDto,
} from "../lib/auth";
import { tokenStorage } from "../lib/api";
import { paymentsApi } from "../lib/payments";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  setCreditsBalance: (balance: number) => void;
  initialize: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  fetchUser: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (data: LoginDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);
          const { user, accessToken, refreshToken } = response.data.data;

          tokenStorage.setTokens(accessToken, refreshToken);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message = extractErrorMessage(error);
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      register: async (data: RegisterDto) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const { user, accessToken, refreshToken } = response.data.data;

          tokenStorage.setTokens(accessToken, refreshToken);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message = extractErrorMessage(error);
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const refreshToken = tokenStorage.getRefreshToken();
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } finally {
          tokenStorage.clearTokens();
          set({
            ...initialState,
            isInitialized: true,
          });
        }
      },

      refreshUser: async () => {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          set({
            user: response.data.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          tokenStorage.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshCredits: async () => {
        try {
          const response = await paymentsApi.getCreditsBalance();
          const balance = response.data.data.balance;
          set((state) => ({
            user: state.user
              ? { ...state.user, creditsRemaining: String(balance) }
              : null,
          }));
        } catch (error) {
          console.error("Failed to refresh credits:", error);
        }
      },

      setCreditsBalance: (balance: number) => {
        set((state) => ({
          user: state.user
            ? { ...state.user, creditsRemaining: String(balance) }
            : null,
        }));
      },

      initialize: async () => {
        if (get().isInitialized) return;

        const token = tokenStorage.getAccessToken();
        if (!token) {
          set({ isInitialized: true, isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          set({
            user: response.data.data,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          tokenStorage.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: AuthUser) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken: string, refreshToken: string) => {
        tokenStorage.setTokens(accessToken, refreshToken);
      },

      fetchUser: async () => {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          throw new Error('No access token');
        }

        try {
          const response = await authApi.me();
          set({
            user: response.data.data,
            isAuthenticated: true,
            isInitialized: true,
          });
        } catch (error) {
          tokenStorage.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          });
          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
