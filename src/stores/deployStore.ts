import { create } from 'zustand';

export type DeploymentStatus =
  | 'none'
  | 'provisioning'
  | 'warm'
  | 'deploying'
  | 'running'
  | 'sleeping'
  | 'error'
  | 'destroyed';

export type ScaleMode = 'auto' | 'always_on' | 'manual';

export interface Deployment {
  id?: string;
  projectId: string;
  appName: string;
  webUrl: string | null;
  expoUrl: string | null;
  status: DeploymentStatus;
  errorMessage?: string | null;
  deployCount?: number;
  lastDeployedAt?: string | null;
  lastActivityAt?: string | null;
  memoryMb?: number;
  alwaysOn?: boolean;
  customDomain?: string | null;
  customDomainStatus?: 'pending' | 'active' | 'failed';
  subdomain?: string | null;
  /** Incremented each time new code is pushed — triggers iframe refresh */
  deployRevision?: number;
  /** Desired number of instances (0 = sleeping, 1 = running) */
  desiredInstances?: number;
  /** Actual number of running instances */
  actualInstances?: number;
  /** Scale mode: auto (sleep after idle), always_on, or manual */
  scaleMode?: ScaleMode;
}

interface DeployState {
  deployments: Map<string, Deployment>;

  setDeployment: (projectId: string, deployment: Deployment) => void;
  updateStatus: (projectId: string, status: DeploymentStatus, error?: string) => void;
  bumpRevision: (projectId: string) => void;
  removeDeployment: (projectId: string) => void;
  getDeployment: (projectId: string) => Deployment | undefined;
  reset: () => void;
}

export const useDeployStore = create<DeployState>((set, get) => ({
  deployments: new Map(),

  setDeployment: (projectId, deployment) => {
    set((state) => {
      const next = new Map(state.deployments);
      next.set(projectId, deployment);
      return { deployments: next };
    });
  },

  updateStatus: (projectId, status, error) => {
    set((state) => {
      const next = new Map(state.deployments);
      const existing = next.get(projectId);
      if (existing) {
        next.set(projectId, { ...existing, status, errorMessage: error || null });
      } else {
        next.set(projectId, {
          projectId,
          appName: '',
          webUrl: null,
          expoUrl: null,
          status,
          errorMessage: error || null,
        });
      }
      return { deployments: next };
    });
  },

  bumpRevision: (projectId) => {
    set((state) => {
      const next = new Map(state.deployments);
      const existing = next.get(projectId);
      if (existing) {
        next.set(projectId, { ...existing, deployRevision: (existing.deployRevision || 0) + 1 });
      }
      return { deployments: next };
    });
  },

  removeDeployment: (projectId) => {
    set((state) => {
      const next = new Map(state.deployments);
      next.delete(projectId);
      return { deployments: next };
    });
  },

  getDeployment: (projectId) => {
    return get().deployments.get(projectId);
  },

  reset: () => {
    set({ deployments: new Map() });
  },
}));
