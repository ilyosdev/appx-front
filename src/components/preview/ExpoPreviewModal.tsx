import { useState } from "react";
import {
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Smartphone,
  RefreshCcw,
  Clock,
  Zap,
} from "lucide-react";
import { useExpoPreviewStore } from "@/stores/expoPreviewStore";
import { useExpoPreview } from "@/hooks/useExpoPreview";
import { clsx } from "clsx";

interface ExpoPreviewModalProps {
  projectId: string;
  getCurrentCode: () => string | null;
  getCurrentScreenName: () => string;
  getCurrentScreenId?: () => string | undefined;
}

export function ExpoPreviewModal({
  projectId,
  getCurrentCode,
  getCurrentScreenName,
  getCurrentScreenId,
}: ExpoPreviewModalProps) {
  const { showModal, closeModal } = useExpoPreviewStore();
  const {
    status,
    session,
    error,
    remainingTime,
    createSession,
    updateSession,
    destroySession,
    autoPreview,
    setAutoPreview,
  } = useExpoPreview(projectId);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  if (!showModal) return null;

  const handleCreateSession = async () => {
    const code = getCurrentCode();
    if (!code) return;
    const screenName = getCurrentScreenName();
    const screenId = getCurrentScreenId?.();
    await createSession(code, screenName, screenId);
  };

  const handleEndSession = async () => {
    await destroySession();
  };

  const handleRefreshCode = async () => {
    const code = getCurrentCode();
    if (code && session) {
      await updateSession(code);
    }
  };

  const handleCopyUrl = () => {
    if (session?.expoUrl) {
      navigator.clipboard.writeText(session.expoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isActive = status === "active" || status === "updating";
  const isExpired = status === "expired";
  const isIdle = status === "idle";
  const isCreating = status === "creating";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md bg-surface-900 rounded-2xl border border-surface-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Mobile Preview
              </h2>
              <p className="text-xs text-surface-400">
                Preview on your phone via Expo Go
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* No Session / Idle State */}
          {(isIdle || isExpired) && !isCreating && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-800 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-surface-500" />
              </div>
              {isExpired ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Session Expired
                    </p>
                    <p className="text-xs text-surface-400 mt-1">
                      Your preview session has timed out.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSession}
                    className="w-full px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors"
                  >
                    Start New Session
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Preview on Your Phone
                    </p>
                    <p className="text-xs text-surface-400 mt-1">
                      Scan the QR code with Expo Go to see your app running
                      natively.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSession}
                    className="w-full px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
                  >
                    Start Preview Session
                  </button>
                </>
              )}
            </div>
          )}

          {/* Creating State */}
          {isCreating && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-500/10 flex items-center justify-center animate-pulse">
                <Smartphone className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Starting Metro Bundler...
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  This may take 15-30 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Active Session */}
          {isActive && session && (
            <div className="space-y-5">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-2xl">
                  <img
                    src={session.qrCodeDataUrl}
                    alt="Scan with Expo Go"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Status + Timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">
                    Session Active
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {formatTime(remainingTime)}</span>
                </div>
              </div>

              {/* Expo URL + Copy */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-800 border border-surface-700">
                <code className="flex-1 text-xs text-surface-300 truncate font-mono">
                  {session.expoUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="flex-shrink-0 p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-white">
                      Auto-sync on save
                    </p>
                    <p className="text-xs text-surface-500">
                      Push code changes to phone automatically
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoPreview(!autoPreview)}
                  className={clsx(
                    "relative w-9 h-5 rounded-full transition-colors",
                    autoPreview ? "bg-primary-500" : "bg-surface-600",
                  )}
                >
                  <div
                    className={clsx(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      autoPreview ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleRefreshCode}
                  disabled={status === "updating"}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-sm disabled:opacity-50"
                >
                  <RefreshCcw
                    className={clsx(
                      "w-4 h-4",
                      status === "updating" && "animate-spin",
                    )}
                  />
                  {status === "updating" ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                >
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* Expo Go Instructions (collapsible) */}
          <div className="mt-5 pt-4 border-t border-surface-800">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center justify-between w-full text-xs text-surface-400 hover:text-surface-300 transition-colors"
            >
              <span>How to install Expo Go</span>
              {showInstructions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            {showInstructions && (
              <div className="mt-3 space-y-2 text-xs text-surface-400">
                <p>
                  <strong className="text-surface-300">1.</strong> Download
                  &quot;Expo Go&quot; from the App Store (iOS) or Play Store
                  (Android)
                </p>
                <p>
                  <strong className="text-surface-300">2.</strong> Open the
                  Expo Go app on your phone
                </p>
                <p>
                  <strong className="text-surface-300">3.</strong> Scan the QR
                  code above with your phone&apos;s camera
                </p>
                <p>
                  <strong className="text-surface-300">4.</strong> The app will
                  load and hot-reload as you make changes
                </p>
                <p className="text-surface-500 italic">
                  Note: Your phone and computer must be on the same Wi-Fi
                  network.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
