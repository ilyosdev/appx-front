import { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, HardDrive, Clock, Rocket, Wifi, WifiOff, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ContainerMetrics {
  appName: string;
  status: string;
  memoryMb: number;
  cpuMillicores: number;
  deployCount: number;
  lastDeployedAt: string | null;
  lastActivityAt: string | null;
  alwaysOn: boolean;
  webUrl: string | null;
  expoUrl: string | null;
  bundleServer: {
    status: string;
    hmrClients: number;
    lastBuild: string | null;
    expoUrl: string | null;
  } | null;
}

interface ContainerResourcesPanelProps {
  projectId: string;
  isOpen: boolean;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatUptime(lastActivityAt: string | null): string {
  if (!lastActivityAt) return '--';
  const diff = Date.now() - new Date(lastActivityAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ContainerResourcesPanel({ projectId, isOpen }: ContainerResourcesPanelProps) {
  const [metrics, setMetrics] = useState<ContainerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchMetrics = useCallback(async () => {
    try {
      setError(false);
      const res = await api.get(`/projects/${projectId}/container/metrics`);
      setMetrics(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchMetrics();

    intervalRef.current = setInterval(fetchMetrics, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="bg-surface-900 rounded-lg p-3 animate-pulse">
        <div className="h-3 bg-surface-800 rounded w-24 mb-3" />
        <div className="space-y-2">
          <div className="h-2 bg-surface-800 rounded w-full" />
          <div className="h-2 bg-surface-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="bg-surface-900 rounded-lg p-3 text-center">
        <p className="text-[10px] text-surface-500">Could not load metrics</p>
      </div>
    );
  }

  if (!metrics) return null;

  // Estimate CPU usage from cpuMillicores allocation (show as allocated)
  const cpuPct = Math.min((metrics.cpuMillicores / 1000) * 100, 100);
  // Memory: show allocated vs plan limit
  const memUsed = metrics.memoryMb;

  return (
    <div className="bg-surface-900 rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Resources</span>
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            metrics.status === 'running' ? 'bg-emerald-400' :
            metrics.status === 'error' ? 'bg-red-400' :
            metrics.status === 'sleeping' ? 'bg-surface-500' :
            'bg-yellow-400 animate-pulse'
          )} />
          <span className={cn(
            'text-[10px] font-medium capitalize',
            metrics.status === 'running' ? 'text-emerald-400' :
            metrics.status === 'error' ? 'text-red-400' :
            'text-surface-400'
          )}>
            {metrics.status}
          </span>
        </div>
      </div>

      {/* CPU */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-surface-500" />
            <span className="text-[10px] text-surface-400">CPU</span>
          </div>
          <span className="text-[10px] text-surface-300 font-mono">{metrics.cpuMillicores}m / 1000m</span>
        </div>
        <ProgressBar
          value={metrics.cpuMillicores}
          max={1000}
          color={cpuPct > 80 ? 'bg-red-400' : cpuPct > 50 ? 'bg-yellow-400' : 'bg-primary-400'}
        />
      </div>

      {/* Memory */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-surface-500" />
            <span className="text-[10px] text-surface-400">Memory</span>
          </div>
          <span className="text-[10px] text-surface-300 font-mono">{memUsed}MB</span>
        </div>
        <ProgressBar
          value={memUsed}
          max={memUsed}
          color={memUsed > 512 ? 'bg-red-400' : memUsed > 256 ? 'bg-yellow-400' : 'bg-cyan-400'}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center">
          <Rocket className="w-3 h-3 text-surface-500 mx-auto mb-0.5" />
          <p className="text-[10px] text-surface-200 font-medium">{metrics.deployCount}</p>
          <p className="text-[9px] text-surface-500">Deploys</p>
        </div>
        <div className="text-center">
          <Clock className="w-3 h-3 text-surface-500 mx-auto mb-0.5" />
          <p className="text-[10px] text-surface-200 font-medium">{formatTime(metrics.lastDeployedAt)}</p>
          <p className="text-[9px] text-surface-500">Last deploy</p>
        </div>
        <div className="text-center">
          <Activity className="w-3 h-3 text-surface-500 mx-auto mb-0.5" />
          <p className="text-[10px] text-surface-200 font-medium">{formatUptime(metrics.lastActivityAt)}</p>
          <p className="text-[9px] text-surface-500">Active</p>
        </div>
      </div>

      {/* Bundle Server */}
      <div className="pt-2 border-t border-surface-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-surface-400">Bundle Server</span>
          {metrics.bundleServer ? (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">{metrics.bundleServer.status}</span>
              {metrics.bundleServer.hmrClients > 0 && (
                <span className="text-[9px] text-surface-400 bg-surface-800 px-1.5 py-0.5 rounded-full">
                  {metrics.bundleServer.hmrClients} HMR
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3 h-3 text-surface-500" />
              <span className="text-[10px] text-surface-500">Offline</span>
            </div>
          )}
        </div>
        {metrics.bundleServer?.lastBuild && (
          <p className="text-[9px] text-surface-500 mt-1">Last build: {formatTime(metrics.bundleServer.lastBuild)}</p>
        )}
      </div>

      {/* Container info */}
      <div className="pt-2 border-t border-surface-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-surface-500">Container</span>
          <span className="text-[10px] text-surface-300 font-mono">{metrics.appName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-surface-500">Always-on</span>
          <span className={cn(
            'text-[10px] font-medium',
            metrics.alwaysOn ? 'text-primary-400' : 'text-surface-400'
          )}>
            {metrics.alwaysOn ? 'Enabled' : 'Off'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-surface-500">Memory limit</span>
          <span className="text-[10px] text-surface-300 font-mono">{metrics.memoryMb}MB</span>
        </div>
      </div>
    </div>
  );
}
