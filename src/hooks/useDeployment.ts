import { useEffect, useCallback, useRef } from 'react';
import { useDeployStore, type Deployment, type DeploymentStatus } from '@/stores/deployStore';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface UseDeploymentReturn {
  deployment: Deployment | undefined;
  status: DeploymentStatus;
  isLoading: boolean;
  wake: () => Promise<void>;
  destroy: () => Promise<void>;
  provision: () => Promise<void>;
}

export function useDeployment(projectId: string | undefined): UseDeploymentReturn {
  const { setDeployment, updateStatus, getDeployment, removeDeployment } = useDeployStore();
  const fetchedRef = useRef(false);

  // Fetch initial state on mount
  useEffect(() => {
    if (!projectId || fetchedRef.current) return;
    fetchedRef.current = true;

    api
      .get<{ data: any }>(`/projects/${projectId}/container/status`)
      .then((res) => {
        const data = res.data.data;
        if (data.status && data.status !== 'none') {
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
    };

    const handleError = (data: { projectId: string; error: string }) => {
      if (data.projectId !== projectId) return;
      updateStatus(projectId, 'error', data.error);
    };

    const handleStatus = (data: {
      projectId: string;
      status: DeploymentStatus;
      error?: string;
    }) => {
      if (data.projectId !== projectId) return;
      updateStatus(projectId, data.status, data.error);
    };

    socket.on('deploy:ready', handleReady);
    socket.on('deploy:error', handleError);
    socket.on('deploy:status', handleStatus);

    return () => {
      socket.off('deploy:ready', handleReady);
      socket.off('deploy:error', handleError);
      socket.off('deploy:status', handleStatus);
    };
  }, [projectId, setDeployment, updateStatus]);

  const deployment = projectId ? getDeployment(projectId) : undefined;

  const wake = useCallback(async () => {
    if (!projectId) return;
    updateStatus(projectId, 'provisioning');
    try {
      const res = await api.post<{ data: any }>(
        `/projects/${projectId}/container/wake`,
      );
      updateStatus(projectId, res.data.data.status || 'running');
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
      const res = await api.post<{ data: any }>(
        `/projects/${projectId}/container/provision`,
      );
      const data = res.data.data;
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

  return {
    deployment,
    status: deployment?.status || 'none',
    isLoading: deployment?.status === 'provisioning' || deployment?.status === 'deploying',
    wake,
    destroy,
    provision,
  };
}
