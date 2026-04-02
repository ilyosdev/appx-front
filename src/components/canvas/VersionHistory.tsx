import { useState, useEffect, useCallback } from "react";
import { GitCommit, RotateCcw, Camera, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Commit {
  hash: string;
  message: string;
  date: string;
}

interface VersionHistoryProps {
  projectId: string;
  className?: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function VersionHistory({ projectId, className }: VersionHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [revertingHash, setRevertingHash] = useState<string | null>(null);
  const [confirmHash, setConfirmHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}/versions`);
      const data = res.data?.data ?? res.data;
      setCommits(data.commits ?? []);
    } catch {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCommits();
  }, [fetchCommits]);

  const handleSnapshot = async () => {
    setSnapshotting(true);
    setError(null);
    try {
      await api.post(`/projects/${projectId}/versions/snapshot`);
      await fetchCommits();
    } catch {
      setError("Failed to create snapshot");
    } finally {
      setSnapshotting(false);
    }
  };

  const handleRevert = async (hash: string) => {
    setRevertingHash(hash);
    setConfirmHash(null);
    setError(null);
    try {
      await api.post(`/projects/${projectId}/versions/revert`, { hash });
      await fetchCommits();
    } catch {
      setError("Failed to revert to selected version");
    } finally {
      setRevertingHash(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-medium text-white">Version History</span>
        </div>
        <button
          onClick={handleSnapshot}
          disabled={snapshotting}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
            "bg-primary-500/15 text-primary-400 hover:bg-primary-500/25",
            snapshotting && "opacity-50 cursor-not-allowed",
          )}
        >
          {snapshotting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Camera className="w-3 h-3" />
          )}
          Snapshot
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            <span className="text-xs text-surface-500">Loading commits...</span>
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-surface-500">
            <GitCommit className="w-8 h-8 opacity-40" />
            <p className="text-sm">No versions yet</p>
            <p className="text-xs text-surface-600">
              Create a snapshot to save the current state
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-700" />

            <div className="space-y-1">
              {commits.map((commit, idx) => (
                <div key={commit.hash} className="relative flex gap-3 group">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-2 shrink-0">
                    <div
                      className={cn(
                        "w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center",
                        idx === 0
                          ? "border-primary-400 bg-primary-400/20"
                          : "border-surface-600 bg-surface-800",
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          idx === 0 ? "bg-primary-400" : "bg-surface-600",
                        )}
                      />
                    </div>
                  </div>

                  {/* Commit info */}
                  <div
                    className={cn(
                      "flex-1 min-w-0 px-3 py-2 rounded-lg transition-colors",
                      "hover:bg-surface-800/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white leading-snug truncate">
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] text-surface-500 font-mono">
                            {commit.hash.slice(0, 7)}
                          </code>
                          <span className="text-[10px] text-surface-600">
                            {relativeTime(commit.date)}
                          </span>
                        </div>
                      </div>

                      {/* Revert button */}
                      {idx > 0 && (
                        <div className="shrink-0">
                          {confirmHash === commit.hash ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRevert(commit.hash)}
                                disabled={revertingHash !== null}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmHash(null)}
                                className="px-2 py-0.5 rounded text-[10px] font-medium text-surface-500 hover:text-surface-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : revertingHash === commit.hash ? (
                            <Loader2 className="w-3.5 h-3.5 text-surface-400 animate-spin" />
                          ) : (
                            <button
                              onClick={() => setConfirmHash(commit.hash)}
                              disabled={revertingHash !== null}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                "text-surface-500 hover:text-surface-300 hover:bg-surface-700/60",
                                "opacity-0 group-hover:opacity-100",
                                revertingHash !== null && "opacity-0 pointer-events-none",
                              )}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Revert
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
