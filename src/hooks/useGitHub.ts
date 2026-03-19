import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export type GitHubSyncStatus = "synced" | "ahead" | "behind" | "diverged" | "not_connected";

export interface GitHubStatus {
  connected: boolean;
  repoFullName: string | null;
  repoUrl: string | null;
  defaultBranch: string | null;
  syncStatus: GitHubSyncStatus;
  aheadBy: number;
  behindBy: number;
  lastSyncedAt: string | null;
}

export interface GitHubRepo {
  fullName: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
}

interface UseGitHubReturn {
  status: GitHubStatus | null;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  getStatus: () => Promise<GitHubStatus | null>;
  getAuthUrl: () => Promise<string>;
  connectRepo: (repoFullName: string) => Promise<void>;
  createRepo: (name: string, isPrivate: boolean) => Promise<GitHubRepo>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  disconnect: () => Promise<void>;
  isPushing: boolean;
  isPulling: boolean;
}

export function useGitHub(projectId: string): UseGitHubReturn {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const getStatus = useCallback(async (): Promise<GitHubStatus | null> => {
    if (!projectId) return null;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/github/projects/${projectId}/github/repo-status`);
      const data: GitHubStatus = res.data.data ?? res.data;
      setStatus(data);
      return data;
    } catch (err: any) {
      // 404 means not connected, which is not an error state
      if (err.response?.status === 404) {
        const disconnected: GitHubStatus = {
          connected: false,
          repoFullName: null,
          repoUrl: null,
          defaultBranch: null,
          syncStatus: "not_connected",
          aheadBy: 0,
          behindBy: 0,
          lastSyncedAt: null,
        };
        setStatus(disconnected);
        return disconnected;
      }
      const msg = err.response?.data?.message || "Failed to get GitHub status";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const getAuthUrl = useCallback(async (): Promise<string> => {
    const res = await api.get("/github/auth-url", {
      params: { projectId },
    });
    return res.data.data?.url ?? res.data.url;
  }, [projectId]);

  const connectRepo = useCallback(
    async (repoFullName: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.post(`/github/projects/${projectId}/github/connect`, {
          repoFullName,
        });
        const data: GitHubStatus = res.data.data ?? res.data;
        setStatus(data);
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to connect repository";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  const createRepo = useCallback(
    async (name: string, isPrivate: boolean): Promise<GitHubRepo> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.post(`/github/projects/${projectId}/github/create-repo`, {
          name,
          isPrivate,
        });
        const repo: GitHubRepo = res.data.data ?? res.data;
        // Auto-refresh status after creating and connecting
        await getStatus();
        return repo;
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to create repository";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, getStatus],
  );

  const push = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    setIsPushing(true);
    setError(null);
    try {
      await api.post(`/github/projects/${projectId}/github/push`);
      await getStatus();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to push to GitHub";
      setError(msg);
      throw err;
    } finally {
      setIsPushing(false);
    }
  }, [projectId, getStatus]);

  const pull = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    setIsPulling(true);
    setError(null);
    try {
      await api.post(`/github/projects/${projectId}/github/pull`);
      await getStatus();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to pull from GitHub";
      setError(msg);
      throw err;
    } finally {
      setIsPulling(false);
    }
  }, [projectId, getStatus]);

  const disconnect = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/github/projects/${projectId}/github/disconnect`);
      setStatus({
        connected: false,
        repoFullName: null,
        repoUrl: null,
        defaultBranch: null,
        syncStatus: "not_connected",
        aheadBy: 0,
        behindBy: 0,
        lastSyncedAt: null,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Failed to disconnect GitHub";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Check if GitHub integration is configured
  useEffect(() => {
    api.get("/github/config-status")
      .then((res) => {
        const configured = res.data.data?.configured ?? res.data.configured;
        setIsAvailable(!!configured);
      })
      .catch(() => setIsAvailable(false));
  }, []);

  // Auto-fetch status on mount
  useEffect(() => {
    if (projectId && isAvailable) {
      getStatus();
    }
  }, [projectId, isAvailable, getStatus]);

  return {
    status,
    isLoading,
    error,
    isAvailable,
    getStatus,
    getAuthUrl,
    connectRepo,
    createRepo,
    push,
    pull,
    disconnect,
    isPushing,
    isPulling,
  };
}
