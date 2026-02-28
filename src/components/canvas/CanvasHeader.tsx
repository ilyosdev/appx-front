import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Sparkles,
  Settings,
  Smartphone,
  Loader2,
  Palette,
  Coins,
  Globe,
  Check,
  Rocket,
  Send,
  Code2,
  Eye,
  BarChart3,
  Crown,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useBillingStore } from "@/stores/billingStore";
import { PLAN_FEATURES } from "@/lib/payments";
import type { PlanType } from "@/lib/payments";
import { useExpoPreviewStore } from "@/stores/expoPreviewStore";
import { cn } from "@/lib/utils";
import { useCollaboration } from "@/hooks/useCollaboration";
import { InviteModal } from "@/components/collaboration/InviteModal";
import { AccessBadge } from "@/components/collaboration/AccessBadge";
import { ShareButton } from "./ShareButton";
import { PresenceIndicator } from "./PresenceIndicator";
import { GitHubButton } from "./GitHubButton";

// Keep ConnectionIndicator export for backward compat (used nowhere after refactor, but safe)
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
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-400">Reconnecting...</span>
      </div>
    );
  }

  if (error || !isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs text-red-400">Offline</span>
      </div>
    );
  }

  // When connected, render nothing (clean header)
  return null;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Not saved yet";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60)
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

interface CanvasHeaderProps {
  projectId?: string;
  projectName: string;
  onExport: () => void;
  onDesignSystem: () => void;
  onSettings: () => void;
  onPublish: () => void;
  isPublished?: boolean;
  lastSavedAt?: string;
  socketConnected?: boolean;
  socketReconnecting?: boolean;
  socketError?: string | null;
  publishedUrl?: string | null;
  onDeploymentComplete?: (url: string) => void;
}

export function CanvasHeader({
  projectId,
  projectName,
  onExport,
  onDesignSystem,
  onSettings,
  onPublish,
  isPublished,
  lastSavedAt,
  socketConnected,
  socketReconnecting,
  socketError,
}: CanvasHeaderProps) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Plan gating
  const { user } = useAuthStore();
  const { openUpgradeModal } = useBillingStore();
  const userPlan = (user?.plan as PlanType) || 'free';
  const canEditCode = PLAN_FEATURES[userPlan].codeExport;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  // Expo preview store
  const { currentStatus, openModal: openExpoModal } = useExpoPreviewStore();
  const isExpoActive =
    currentStatus === "active" || currentStatus === "updating";
  const isExpoCreating = currentStatus === "creating";

  // Collaboration
  const {
    owner,
    collaborators,
    myAccessLevel,
    onlineUsers,
    showInviteModal,
    openInviteModal,
    closeInviteModal,
    inviteCollaborator,
  } = useCollaboration(projectId);

  const acceptedCollaborators = (collaborators || []).filter(
    (c: { status: string }) => c.status === "accepted",
  );

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl flex-shrink-0">
        {/* Left: Back + Project name + Access badge */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white">
                  {projectName}
                </h1>
                {myAccessLevel !== "none" && (
                  <AccessBadge role={myAccessLevel} size="sm" />
                )}
              </div>
              <p className="text-xs text-surface-500">
                Last saved {formatRelativeTime(lastSavedAt)}
              </p>
            </div>
          </div>

          {/* Disconnected indicator -- only show when NOT connected */}
          {socketConnected !== undefined && (
            <ConnectionIndicator
              isConnected={socketConnected}
              isReconnecting={socketReconnecting || false}
              error={socketError || null}
            />
          )}

          {/* Presence indicator -- online collaborators */}
          <PresenceIndicator onlineUsers={onlineUsers} maxAvatars={5} />
        </div>

        {/* Center: Code / Preview / Analytics tabs */}
        <div className="flex items-center gap-0.5 bg-surface-800/40 rounded-lg p-0.5">
          <button
            onClick={() => {
              if (!canEditCode) {
                openUpgradeModal('exports', 'Upgrade to access the code editor.');
                return;
              }
              if (projectId) navigate(`/project/${projectId}/code`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
            {!canEditCode && <Crown className="w-3 h-3 text-cyan-400" />}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-700/60 text-white"
            disabled
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-surface-500 cursor-not-allowed opacity-50"
            disabled
            title="Coming soon"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>

        {/* Right: GitHub + Share + Run on Device + Export + Settings */}
        <div className="flex items-center gap-2">
          {/* GitHub integration */}
          {projectId && <GitHubButton projectId={projectId} />}

          {/* Share button with collaborator dropdown */}
          <ShareButton
            collaboratorCount={acceptedCollaborators.length}
            collaborators={collaborators}
            owner={owner}
            onInvite={openInviteModal}
          />

          {/* Run on Device -- hero CTA */}
          <button
            onClick={openExpoModal}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg",
              isExpoActive
                ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20"
                : "bg-primary-500 text-white hover:bg-primary-400 shadow-primary-500/20",
            )}
          >
            {isExpoCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <div className="relative">
                <Smartphone className="w-4 h-4" />
                {isExpoActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </div>
            )}
            {isExpoCreating
              ? "Starting..."
              : isExpoActive
                ? "Live on Device"
                : "Run on Device"}
          </button>

          {/* Export */}
          <button
            onClick={() => {
              if (!canEditCode) {
                openUpgradeModal('exports', 'Upgrade to export your code.');
                return;
              }
              onExport();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
            {!canEditCode && <Crown className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Settings dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors",
                settingsOpen && "bg-surface-800 text-white",
              )}
            >
              <Settings className="w-5 h-5" />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl shadow-black/40 py-1 z-50">
                <DropdownItem
                  icon={Palette}
                  label="Design System"
                  onClick={() => {
                    onDesignSystem();
                    setSettingsOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Coins}
                  label="Credits"
                  onClick={() => {
                    // Open credits via billing store
                    const { user } = useAuthStore.getState();
                    const userPlan = (user?.plan as PlanType) || "free";
                    const canPurchase =
                      PLAN_FEATURES[userPlan].canPurchaseCredits;
                    if (canPurchase) {
                      useBillingStore.getState().openCreditModal();
                    } else {
                      useBillingStore
                        .getState()
                        .openUpgradeModal(
                          "credits",
                          "Upgrade to get more credits and unlock credit purchases.",
                        );
                    }
                    setSettingsOpen(false);
                  }}
                />
                <DropdownItem
                  icon={isPublished ? Check : Globe}
                  label={isPublished ? "Published" : "Publish"}
                  onClick={() => {
                    onPublish();
                    setSettingsOpen(false);
                  }}
                  accent={isPublished ? "emerald" : undefined}
                />

                <div className="my-1 h-px bg-surface-800/50" />

                <DropdownItem
                  icon={Rocket}
                  label="Deploy"
                  onClick={() => {
                    // DeployButton used to be inline; now accessible via settings.
                    // For now, open the settings modal which contains deploy.
                    onSettings();
                    setSettingsOpen(false);
                  }}
                />
                <DropdownItem
                  icon={Send}
                  label="Submit to Dev"
                  onClick={() => {
                    onSettings();
                    setSettingsOpen(false);
                  }}
                />

                <div className="my-1 h-px bg-surface-800/50" />

                <DropdownItem
                  icon={Settings}
                  label="Project Settings"
                  onClick={() => {
                    onSettings();
                    setSettingsOpen(false);
                  }}
                />
              </div>
            )}
          </div>
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

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  accent?: "emerald";
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-colors text-left"
    >
      <Icon
        className={cn(
          "w-4 h-4",
          accent === "emerald" ? "text-emerald-400" : "text-surface-500",
        )}
      />
      <span
        className={cn(
          accent === "emerald" && "text-emerald-400",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// CanvasCreditBadge removed from header -- credits now in Settings dropdown
