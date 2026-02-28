import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  RefreshCcw,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wifi,
} from "lucide-react";
import { useExpoPreview } from "@/hooks/useExpoPreview";
import { cn } from "@/lib/utils";

interface TestPanelProps {
  projectId: string;
  getCurrentCode: () => string | null;
  getCurrentScreenName: () => string;
  getCurrentScreenId?: () => string | undefined;
}

export function TestPanel({
  projectId,
  getCurrentCode,
  getCurrentScreenName,
  getCurrentScreenId,
}: TestPanelProps) {
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

  const handleCreateSession = async () => {
    const code = getCurrentCode();
    if (!code) return;
    const screenName = getCurrentScreenName();
    const screenId = getCurrentScreenId?.();
    await createSession(code, screenName, screenId);
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
    <div className="h-full flex flex-col bg-surface-950/80 backdrop-blur-xl overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center">
            <Smartphone className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Test on Phone</h3>
            <p className="text-[10px] text-surface-500">Expo Go</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Idle / Expired — start session */}
        {(isIdle || isExpired) && !isCreating && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-surface-500" />
            </div>
            {isExpired ? (
              <>
                <p className="text-xs font-medium text-white">Session Expired</p>
                <p className="text-[10px] text-surface-400">
                  Your preview session has timed out.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-white">
                  Preview on Your Phone
                </p>
                <p className="text-[10px] text-surface-500 max-w-[200px] mx-auto">
                  Scan the QR code with Expo Go to see your app running natively.
                </p>
              </>
            )}
            <button
              onClick={handleCreateSession}
              className="w-full px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
            >
              {isExpired ? "Start New Session" : "Start Preview"}
            </button>
          </div>
        )}

        {/* Creating */}
        {isCreating && (
          <div className="text-center space-y-3 py-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-500/10 flex items-center justify-center animate-pulse">
              <Smartphone className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-white">Starting Metro Bundler...</p>
              <p className="text-[10px] text-surface-400 mt-1">
                This may take 15-30 seconds.
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
          </div>
        )}

        {/* Active session */}
        {isActive && session && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-2.5 bg-white rounded-xl">
                <img
                  src={session.qrCodeDataUrl}
                  alt="Scan with Expo Go"
                  className="w-40 h-40"
                />
              </div>
            </div>

            {/* Status + Timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Active</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-surface-400">
                <Clock className="w-3 h-3" />
                <span>{formatTime(remainingTime)}</span>
              </div>
            </div>

            {/* Expo URL */}
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-800 border border-surface-700/50">
              <code className="flex-1 text-[10px] text-surface-300 truncate font-mono">
                {session.expoUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 p-1 rounded text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Auto-sync */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <p className="text-[10px] font-medium text-white">Auto-sync</p>
                  <p className="text-[10px] text-surface-500">Push changes to phone</p>
                </div>
              </div>
              <button
                onClick={() => setAutoPreview(!autoPreview)}
                className={cn(
                  "relative w-8 h-4.5 rounded-full transition-colors",
                  autoPreview ? "bg-primary-500" : "bg-surface-600",
                )}
                style={{ width: 32, height: 18 }}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform",
                    autoPreview ? "translate-x-[15px]" : "translate-x-0.5",
                  )}
                  style={{ width: 14, height: 14 }}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRefreshCode}
                disabled={status === "updating"}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-[10px] disabled:opacity-50"
              >
                <RefreshCcw
                  className={cn(
                    "w-3 h-3",
                    status === "updating" && "animate-spin",
                  )}
                />
                {status === "updating" ? "Syncing..." : "Sync Now"}
              </button>
              <button
                onClick={() => destroySession()}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-[10px]"
              >
                End
              </button>
            </div>
          </div>
        )}

        {/* Browser disclaimer */}
        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-start gap-2">
            <Wifi className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              Browser preview is limited. Native features (camera, GPS, animations) only work on a real device via Expo Go.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="pt-3 border-t border-surface-800/50">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center justify-between w-full text-[10px] text-surface-400 hover:text-surface-300 transition-colors"
          >
            <span>How to install Expo Go</span>
            {showInstructions ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showInstructions && (
            <div className="mt-2 space-y-1.5 text-[10px] text-surface-400">
              <p>
                <span className="text-surface-300 font-medium">1.</span> Download "Expo Go" from App Store or Play Store
              </p>
              <p>
                <span className="text-surface-300 font-medium">2.</span> Open Expo Go on your phone
              </p>
              <p>
                <span className="text-surface-300 font-medium">3.</span> Scan the QR code with your camera
              </p>
              <p>
                <span className="text-surface-300 font-medium">4.</span> The app will hot-reload as you make changes
              </p>
              <p className="text-surface-500 italic">
                Your phone and computer must be on the same Wi-Fi network.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
