import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Loader2,
  Code2,
  Eye,
  ChevronDown,
  Trash2,
  Rocket,
  Check,
  History,
} from "lucide-react";
import { useDeployment } from "@/hooks/useDeployment";
import { cn } from "@/lib/utils";
import { useCollaboration } from "@/hooks/useCollaboration";
import { InviteModal } from "@/components/collaboration/InviteModal";
import { AccessBadge } from "@/components/collaboration/AccessBadge";
import { PresenceIndicator } from "./PresenceIndicator";
import { GitHubButton } from "./GitHubButton";

// ConnectionIndicator — always visible dot
interface ConnectionIndicatorProps {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
}

export function ConnectionIndicator({
  isConnected,
  isReconnecting,
  error,
}: ConnectionIndicatorProps) {
  if (isReconnecting) {
    return (
      <div className="flex items-center" title="Reconnecting...">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      </div>
    );
  }

  if (error || !isConnected) {
    return (
      <div className="flex items-center" title={error || "Disconnected"}>
        <div className="w-2 h-2 rounded-full bg-red-400" />
      </div>
    );
  }

  // Connected: green dot
  return (
    <div className="flex items-center" title="Connected">
      <div className="w-2 h-2 rounded-full bg-emerald-400" />
    </div>
  );
}

interface CanvasHeaderProps {
  projectId?: string;
  projectName: string;
  onExport?: () => void;
  onSettings: () => void;
  onPublish?: () => void;
  isPublished?: boolean;
  lastSavedAt?: string;
  socketConnected?: boolean;
  socketReconnecting?: boolean;
  socketError?: string | null;
  publishedUrl?: string | null;
  onDeploymentComplete?: (url: string) => void;
  /** Active center panel tab */
  centerTab?: "preview" | "code";
  /** Callback to switch center panel tab */
  onCenterTabChange?: (tab: "preview" | "code") => void;
  /** Callback to toggle project-level version history panel */
  onHistory?: () => void;
}

export function CanvasHeader({
  projectId,
  projectName,
  onSettings,
  socketConnected,
  socketReconnecting,
  socketError,
  centerTab = "preview",
  onCenterTabChange,
  onHistory,
}: CanvasHeaderProps) {
  const navigate = useNavigate();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // Close project menu when clicking outside
  useEffect(() => {
    if (!projectMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [projectMenuOpen]);

  // Deployment status
  const {
    deployment: _deployment,
    status: deployStatus,
    provision,
  } = useDeployment(projectId);

  const isDeploying =
    deployStatus === "provisioning" || deployStatus === "deploying";
  const isLive = deployStatus === "running";

  // Collaboration
  const {
    owner: _owner,
    collaborators,
    myAccessLevel,
    onlineUsers,
    showInviteModal,
    openInviteModal: _openInviteModal,
    closeInviteModal,
    inviteCollaborator,
  } = useCollaboration(projectId);

  void (collaborators || []).filter(
    (c: { status: string }) => c.status === "accepted",
  );

  return (
    <>
      <header className="h-12 flex items-center justify-between px-3 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl flex-shrink-0 relative z-20">
        {/* Left: Back + Project name + dropdown caret + connection dot + presence */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Project name with dropdown */}
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setProjectMenuOpen(!projectMenuOpen)}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-surface-800/50 transition-colors"
            >
              <h1 className="text-sm font-semibold text-white truncate max-w-[140px] md:max-w-[200px]">
                {projectName}
              </h1>
              <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
            </button>

            {projectMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl shadow-black/40 py-1 z-50">
                <button
                  onClick={() => {
                    onSettings();
                    setProjectMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-surface-500" />
                  <span>Settings</span>
                </button>
                <div className="my-1 h-px bg-surface-800/50" />
                <button
                  onClick={() => {
                    setProjectMenuOpen(false);
                    if (
                      window.confirm(
                        "Are you sure you want to delete this project? This action cannot be undone.",
                      )
                    ) {
                      navigate("/dashboard");
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-surface-800/50 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {myAccessLevel && myAccessLevel !== "none" && (
            <AccessBadge role={myAccessLevel} size="sm" />
          )}

          {/* Connection indicator — always visible */}
          {socketConnected !== undefined && (
            <ConnectionIndicator
              isConnected={socketConnected}
              isReconnecting={socketReconnecting || false}
              error={socketError || null}
            />
          )}

          {/* Presence indicator -- online collaborators -- hidden on mobile */}
          <div className="hidden md:block">
            <PresenceIndicator onlineUsers={onlineUsers} maxAvatars={5} />
          </div>
        </div>

        {/* Center: Preview / Code pill tabs */}
        <div className="hidden md:flex gap-0.5 bg-surface-900 rounded-[10px] p-[3px]">
          <button
            onClick={() => onCenterTabChange?.("preview")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
              centerTab === "preview"
                ? "bg-surface-700 text-white"
                : "text-surface-400 hover:text-surface-300",
            )}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={() => onCenterTabChange?.("code")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
              centerTab === "code"
                ? "bg-surface-700 text-white"
                : "text-surface-400 hover:text-surface-300",
            )}
          >
            <Code2 className="w-3.5 h-3.5" /> Code
          </button>
        </div>

        {/* Right: GitHub + Publish + Settings gear */}
        <div className="flex items-center gap-2">
          {/* GitHub integration -- hidden on mobile */}
          <div className="hidden md:block">
            {projectId && <GitHubButton projectId={projectId} />}
          </div>

          {/* History button — project-level version history */}
          {onHistory && (
            <button
              onClick={onHistory}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
              title="Version History"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          )}

          {/* Publish button */}
          <button
            onClick={() => {
              if (!isDeploying && !isLive) {
                provision();
              }
            }}
            disabled={isDeploying}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isLive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                : isDeploying
                  ? "bg-surface-800 text-surface-400 border border-surface-700/50 cursor-wait"
                  : "bg-primary-500 text-white hover:bg-primary-400",
            )}
          >
            {isDeploying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isLive ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">
              {deployStatus === "provisioning"
                ? "Publishing..."
                : deployStatus === "deploying"
                  ? "Publishing..."
                  : isLive
                    ? "Published"
                    : "Publish"}
            </span>
          </button>

          {/* Settings gear — opens settings drawer directly */}
          <button
            onClick={() => onSettings()}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Invite modal -- rendered at root level for proper z-index layering */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        onInvite={inviteCollaborator}
        projectName={projectName}
      />
    </>
  );
}

