import { useState, useRef, useEffect } from "react";
import {
  Github,
  ExternalLink,
  ArrowUpFromLine,
  ArrowDownToLine,
  Loader2,
  Check,
  AlertCircle,
  Unlink,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGitHub, type GitHubSyncStatus } from "@/hooks/useGitHub";

interface GitHubButtonProps {
  projectId: string;
  className?: string;
}

function getSyncStatusLabel(syncStatus: GitHubSyncStatus): {
  label: string;
  color: string;
} {
  switch (syncStatus) {
    case "synced":
      return { label: "Synced", color: "text-emerald-400" };
    case "ahead":
      return { label: "Ahead", color: "text-amber-400" };
    case "behind":
      return { label: "Behind", color: "text-blue-400" };
    case "diverged":
      return { label: "Diverged", color: "text-red-400" };
    case "not_connected":
    default:
      return { label: "Not connected", color: "text-surface-400" };
  }
}

export function GitHubButton({ projectId, className }: GitHubButtonProps) {
  const {
    status,
    isLoading,
    error,
    isAvailable,
    getAuthUrl,
    push,
    pull,
    disconnect,
    isPushing,
    isPulling,
  } = useGitHub(projectId);

  const [showDropdown, setShowDropdown] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const handleConnect = async () => {
    setConnectLoading(true);
    try {
      const url = await getAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // Error handled by hook
    } finally {
      setConnectLoading(false);
    }
  };

  const handlePush = async () => {
    try {
      await push();
    } catch {
      // Error handled by hook
    }
  };

  const handlePull = async () => {
    try {
      await pull();
    } catch {
      // Error handled by hook
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowDropdown(false);
    } catch {
      // Error handled by hook
    }
  };

  const isConnected = status?.connected === true;
  const syncInfo = getSyncStatusLabel(status?.syncStatus ?? "not_connected");

  if (!isAvailable && !isConnected) return null;

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Main button */}
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isLoading || connectLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {connectLoading || isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Github className="w-4 h-4" />
          )}
          Connect GitHub
        </button>
      ) : (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium"
        >
          <Github className="w-4 h-4" />
          <span className="max-w-[120px] truncate text-xs">
            {status.repoFullName?.split("/")[1] || "GitHub"}
          </span>
          {status.syncStatus === "synced" && (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {(status.syncStatus === "ahead" || status.syncStatus === "behind") && (
            <span className={cn("text-xs font-medium", syncInfo.color)}>
              {status.syncStatus === "ahead"
                ? `+${status.aheadBy}`
                : `-${status.behindBy}`}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
        </button>
      )}

      {/* Dropdown for connected state */}
      {showDropdown && isConnected && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl shadow-black/40 py-2 z-50">
          {/* Repo info */}
          <div className="px-4 pb-2 border-b border-surface-800/50">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-surface-400" />
              <span className="text-sm font-medium text-white truncate">
                {status.repoFullName}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs font-medium", syncInfo.color)}>
                {syncInfo.label}
              </span>
              {status.lastSyncedAt && (
                <span className="text-xs text-surface-500">
                  Last synced:{" "}
                  {new Date(status.lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handlePush}
              disabled={isPushing || status.syncStatus === "synced"}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPushing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="w-4 h-4" />
              )}
              Push to GitHub
              {status.aheadBy > 0 && (
                <span className="ml-auto text-xs text-amber-400">
                  {status.aheadBy} commit{status.aheadBy > 1 ? "s" : ""}
                </span>
              )}
            </button>

            <button
              onClick={handlePull}
              disabled={isPulling || status.syncStatus === "synced"}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPulling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="w-4 h-4" />
              )}
              Pull from GitHub
              {status.behindBy > 0 && (
                <span className="ml-auto text-xs text-blue-400">
                  {status.behindBy} commit{status.behindBy > 1 ? "s" : ""}
                </span>
              )}
            </button>

            {status.repoUrl && (
              <a
                href={status.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open on GitHub
              </a>
            )}
          </div>

          {/* Disconnect */}
          <div className="pt-1 border-t border-surface-800/50">
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Unlink className="w-4 h-4" />
              Disconnect
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
