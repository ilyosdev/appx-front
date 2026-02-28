import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface GitTreeNode {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha?: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  parentShas?: string[];
}

export interface GitBranch {
  name: string;
  sha: string;
  isDefault: boolean;
  isCurrent: boolean;
}

export interface GitDiffEntry {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

interface UseGitStorageReturn {
  tree: GitTreeNode[];
  history: GitCommit[];
  branches: GitBranch[];
  currentBranch: string;
  isLoading: boolean;
  error: string | null;
  fetchTree: (ref?: string) => Promise<GitTreeNode[]>;
  fetchHistory: (limit?: number) => Promise<GitCommit[]>;
  getDiff: (fromRef: string, toRef: string) => Promise<GitDiffEntry[]>;
  createBranch: (name: string, fromRef?: string) => Promise<GitBranch>;
  getBranches: () => Promise<GitBranch[]>;
  getFileContent: (path: string, ref?: string) => Promise<string>;
}

export function useGitStorage(projectId: string): UseGitStorageReturn {
  const [tree, setTree] = useState<GitTreeNode[]>([]);
  const [history, setHistory] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(
    async (ref?: string): Promise<GitTreeNode[]> => {
      if (!projectId) return [];
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}/git/tree`, {
          params: ref ? { ref } : undefined,
        });
        const data = res.data.data ?? res.data;
        const nodes: GitTreeNode[] = Array.isArray(data) ? data : data.tree ?? [];
        setTree(nodes);
        return nodes;
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to fetch file tree";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  const fetchHistory = useCallback(
    async (limit?: number): Promise<GitCommit[]> => {
      if (!projectId) return [];
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}/git/history`, {
          params: limit ? { limit } : undefined,
        });
        const data = res.data.data ?? res.data;
        const commits: GitCommit[] = Array.isArray(data)
          ? data
          : data.commits ?? [];
        setHistory(commits);
        return commits;
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to fetch commit history";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  const getDiff = useCallback(
    async (fromRef: string, toRef: string): Promise<GitDiffEntry[]> => {
      if (!projectId) return [];
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/projects/${projectId}/git/diff`, {
          params: { from: fromRef, to: toRef },
        });
        const data = res.data.data ?? res.data;
        return Array.isArray(data) ? data : data.files ?? [];
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to fetch diff";
        setError(msg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  const createBranch = useCallback(
    async (name: string, fromRef?: string): Promise<GitBranch> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.post(`/projects/${projectId}/git/branches`, {
          name,
          from: fromRef,
        });
        const branch: GitBranch = res.data.data ?? res.data;
        setBranches((prev) => [...prev, branch]);
        return branch;
      } catch (err: any) {
        const msg =
          err.response?.data?.message || "Failed to create branch";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId],
  );

  const getBranches = useCallback(async (): Promise<GitBranch[]> => {
    if (!projectId) return [];
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/git/branches`);
      const data = res.data.data ?? res.data;
      const branchList: GitBranch[] = Array.isArray(data)
        ? data
        : data.branches ?? [];
      setBranches(branchList);

      const current = branchList.find((b) => b.isCurrent);
      if (current) setCurrentBranch(current.name);

      return branchList;
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Failed to fetch branches";
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const getFileContent = useCallback(
    async (path: string, ref?: string): Promise<string> => {
      if (!projectId) return "";
      try {
        const res = await api.get(
          `/projects/${projectId}/git/content`,
          { params: { path, ref } },
        );
        return res.data.data?.content ?? res.data.content ?? "";
      } catch {
        return "";
      }
    },
    [projectId],
  );

  return {
    tree,
    history,
    branches,
    currentBranch,
    isLoading,
    error,
    fetchTree,
    fetchHistory,
    getDiff,
    createBranch,
    getBranches,
    getFileContent,
  };
}
