import { useEffect, useCallback, useRef } from 'react';
import { useDeployStore, type Deployment, type DeploymentStatus } from '@/stores/deployStore';
import { api } from '@/lib/api';
import { projectsApi } from '@/lib/projects';
import { getSocket } from '@/lib/socket';

interface UseDeploymentReturn {
  deployment: Deployment | undefined;
  status: DeploymentStatus;
  isLoading: boolean;
  wake: () => Promise<void>;
  destroy: () => Promise<void>;
  provision: () => Promise<void>;
  scale: (instances: 0 | 1) => Promise<void>;
}

export function useDeployment(projectId: string | undefined): UseDeploymentReturn {
  const { setDeployment, updateStatus, bumpRevision, getDeployment, removeDeployment } = useDeployStore();
  const fetchedRef = useRef(false);

  // Fetch initial state on mount
  useEffect(() => {
    if (!projectId || fetchedRef.current) return;
    fetchedRef.current = true;

    api
      .get<{ data: any }>(`/projects/${projectId}/container/status`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (data?.status && data.status !== 'none') {
          setDeployment(projectId, {
            id: data.id,
            projectId,
            appName: data.appName || '',
            webUrl: data.webUrl || null,
            expoUrl: data.expoUrl || null,
            status: data.status as DeploymentStatus,
            errorMessage: data.errorMessage,
            deployCount: data.deployCount,
            lastDeployedAt: data.lastDeployedAt,
            lastActivityAt: data.lastActivityAt,
            memoryMb: data.memoryMb,
            desiredInstances: data.desiredInstances,
            actualInstances: data.actualInstances,
            scaleMode: data.scaleMode,
            alwaysOn: data.alwaysOn,
          });
        }
      })
      .catch(() => {
        // No deployment exists yet — that's fine
      });

    return () => {
      fetchedRef.current = false;
    };
  }, [projectId, setDeployment]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !projectId) return;

    const handleReady = (data: {
      projectId: string;
      appName: string;
      webUrl: string;
      expoUrl: string;
    }) => {
      if (data.projectId !== projectId) return;
      setDeployment(projectId, {
        projectId,
        appName: data.appName,
        webUrl: data.webUrl,
        expoUrl: data.expoUrl,
        status: 'running',
      });
      // Bump revision to trigger iframe refresh
      bumpRevision(projectId);
    };

    const handleError = (data: { projectId: string; error: string }) => {
      if (data.projectId !== projectId) return;
      updateStatus(projectId, 'error', data.error);
    };

    const handleStatus = (data: {
      projectId: string;
      status: DeploymentStatus;
      error?: string;
      webUrl?: string;
    }) => {
      if (data.projectId !== projectId) return;
      if (data.webUrl) {
        const existing = getDeployment(projectId);
        setDeployment(projectId, {
          ...existing,
          projectId,
          appName: existing?.appName || '',
          webUrl: data.webUrl,
          expoUrl: existing?.expoUrl ?? null,
          status: data.status,
        });
      } else {
        updateStatus(projectId, data.status, data.error);
      }
    };

    const handleScale = (data: {
      projectId: string;
      desiredInstances: number;
      actualInstances: number;
      status: DeploymentStatus;
      scaleMode?: string;
    }) => {
      if (data.projectId !== projectId) return;
      const existing = getDeployment(projectId);
      if (existing) {
        setDeployment(projectId, {
          ...existing,
          desiredInstances: data.desiredInstances,
          actualInstances: data.actualInstances,
          status: data.status,
          scaleMode: (data.scaleMode as Deployment['scaleMode']) || existing.scaleMode,
        });
      }
    };

    socket.on('deploy:ready', handleReady);
    socket.on('deploy:error', handleError);
    socket.on('deploy:status', handleStatus);
    socket.on('deploy:scale', handleScale);

    return () => {
      socket.off('deploy:ready', handleReady);
      socket.off('deploy:error', handleError);
      socket.off('deploy:status', handleStatus);
      socket.off('deploy:scale', handleScale);
    };
  }, [projectId, setDeployment, updateStatus, bumpRevision, getDeployment]);

  const deployment = projectId ? getDeployment(projectId) : undefined;

  const wake = useCallback(async () => {
    if (!projectId) return;
    updateStatus(projectId, 'provisioning');
    try {
      const res = await api.post(
        `/projects/${projectId}/container/wake`,
      );
      const wakeData = res.data?.data ?? res.data;
      updateStatus(projectId, wakeData?.status || 'running');
    } catch (err: any) {
      updateStatus(projectId, 'error', err.message);
    }
  }, [projectId, updateStatus]);

  const destroy = useCallback(async () => {
    if (!projectId) return;
    try {
      await api.delete(`/projects/${projectId}/container`);
      removeDeployment(projectId);
    } catch (err: any) {
      console.error('Failed to destroy container:', err);
    }
  }, [projectId, removeDeployment]);

  const provision = useCallback(async () => {
    if (!projectId) return;
    updateStatus(projectId, 'provisioning');
    try {
      const res = await api.post(
        `/projects/${projectId}/container/provision`,
      );
      const data = res.data?.data ?? res.data;
      setDeployment(projectId, {
        id: data.id,
        projectId,
        appName: data.appName || '',
        webUrl: data.webUrl || null,
        expoUrl: data.expoUrl || null,
        status: data.status as DeploymentStatus,
      });
    } catch (err: any) {
      updateStatus(projectId, 'error', err.message);
    }
  }, [projectId, setDeployment, updateStatus]);

  const scale = useCallback(async (instances: 0 | 1) => {
    if (!projectId) return;
    const existing = getDeployment(projectId);
    if (existing) {
      // Optimistic update: set desired immediately
      setDeployment(projectId, {
        ...existing,
        desiredInstances: instances,
        status: instances === 1 ? 'provisioning' : existing.status,
      });
    }
    try {
      const result = await projectsApi.scaleContainer(projectId, instances);
      const current = getDeployment(projectId);
      if (current) {
        setDeployment(projectId, {
          ...current,
          desiredInstances: result.desiredInstances,
          actualInstances: result.actualInstances,
          status: result.status as DeploymentStatus,
        });
      }
    } catch (err: any) {
      // Revert optimistic update
      if (existing) {
        setDeployment(projectId, existing);
      }
      updateStatus(projectId, 'error', err.message);
    }
  }, [projectId, getDeployment, setDeployment, updateStatus]);

  return {
    deployment,
    status: deployment?.status || 'none',
    isLoading: deployment?.status === 'provisioning' || deployment?.status === 'deploying',
    wake,
    destroy,
    provision,
    scale,
  };
}
