import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ContainerLogsPanelProps {
  projectId: string;
}

const MAX_LINES = 200;
const POLL_INTERVAL = 10_000;

export function ContainerLogsPanel({ projectId }: ContainerLogsPanelProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('lines', String(MAX_LINES));
      const res = await api.get(
        `/projects/${projectId}/container/logs?${params.toString()}`,
      );
      const data = res.data?.data ?? res.data;
      const raw: string = data?.logs ?? '';
      const lines = raw
        .split('\n')
        .filter((l: string) => l.length > 0)
        .slice(-MAX_LINES);
      setLogs(lines);
    } catch {
      // Silently ignore fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [projectId, search]);

  // Fetch on mount and poll every 10s
  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-2">
      {/* Search + Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-900 border border-surface-700 text-white text-xs font-mono placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-lg bg-surface-900 border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-800 transition-colors',
            isLoading && 'opacity-50 cursor-not-allowed',
          )}
          title="Refresh logs"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Terminal-style log viewer */}
      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto rounded-lg bg-[#0d1117] border border-surface-700 p-3 font-mono text-[11px] leading-relaxed select-text"
      >
        {logs.length === 0 ? (
          <p className="text-surface-600 italic">
            {isLoading ? 'Loading logs...' : 'No logs available'}
          </p>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              className={cn(
                'whitespace-pre-wrap break-all',
                line.toLowerCase().includes('error')
                  ? 'text-red-400'
                  : line.toLowerCase().includes('warn')
                    ? 'text-yellow-400'
                    : 'text-emerald-300/80',
              )}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
