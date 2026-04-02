import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Wifi,
  Rocket,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useDeployment } from "@/hooks/useDeployment";
// cn import removed - not currently used

interface TestPanelProps {
  projectId: string;
}

export function TestPanel({ projectId }: TestPanelProps) {
  const {
    deployment,
    status,
    isLoading,
    provision,
    wake,
    destroy,
  } = useDeployment(projectId);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const activeUrl = deployment?.expoUrl || deployment?.webUrl;

  const handleCopyUrl = () => {
    if (activeUrl) {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isActive = status === "running";
  const isProvisioning = status === "provisioning" || status === "deploying";
  const isSleeping = status === "sleeping";
  const isIdle = status === "none";
  const isError = status === "error";

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
            <p className="text-[10px] text-surface-500">Railover Deploy</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Error */}
        {isError && deployment?.errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{deployment.errorMessage}</p>
            <button
              onClick={() => provision()}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Rocket className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Idle — no deployment yet */}
        {isIdle && !isLoading && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-surface-500" />
            </div>
            <p className="text-xs font-medium text-white">
              Preview on Your Phone
            </p>
            <p className="text-[10px] text-surface-500 max-w-[200px] mx-auto">
              Deploy your app to get a live preview URL you can open on any device.
            </p>
            <button
              onClick={() => provision()}
              className="w-full px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
            >
              Deploy Preview
            </button>
          </div>
        )}

        {/* Sleeping — needs wake */}
        {isSleeping && !isLoading && (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-surface-500" />
            </div>
            <p className="text-xs font-medium text-white">Container Sleeping</p>
            <p className="text-[10px] text-surface-400">
              Your preview container went to sleep due to inactivity.
            </p>
            <button
              onClick={() => wake()}
              className="w-full px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20"
            >
              Wake Up
            </button>
          </div>
        )}

        {/* Provisioning / Deploying */}
        {isProvisioning && (
          <div className="text-center space-y-3 py-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-500/10 flex items-center justify-center animate-pulse">
              <Smartphone className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-white">
                {status === "provisioning" ? "Provisioning Container..." : "Deploying..."}
              </p>
              <p className="text-[10px] text-surface-400 mt-1">
                This may take 15-30 seconds.
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
          </div>
        )}

        {/* Active deployment */}
        {isActive && deployment && (
          <div className="space-y-4">
            {/* QR Code placeholder — deployment URL */}
            <div className="flex justify-center">
              <div className="p-4 bg-surface-800/50 rounded-xl border border-surface-700/50 text-center">
                <div className="w-40 h-40 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Rocket className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs text-emerald-400 font-medium">Live</p>
                    <p className="text-[10px] text-surface-400">Open the URL on your phone</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Running</span>
              </div>
              {deployment.lastDeployedAt && (
                <span className="text-[10px] text-surface-400">
                  Deployed {new Date(deployment.lastDeployedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* URL */}
            {activeUrl && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-800 border border-surface-700/50">
                <code className="flex-1 text-[10px] text-surface-300 truncate font-mono">
                  {activeUrl}
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
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 rounded text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => provision()}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-[10px] disabled:opacity-50"
              >
                <Rocket className="w-3 h-3" />
                Redeploy
              </button>
              <button
                onClick={() => destroy()}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-[10px]"
              >
                <Trash2 className="w-3 h-3" />
                Destroy
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
            <span>How to test on your phone</span>
            {showInstructions ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showInstructions && (
            <div className="mt-2 space-y-1.5 text-[10px] text-surface-400">
              <p>
                <span className="text-surface-300 font-medium">1.</span> Click "Deploy Preview" to start a container
              </p>
              <p>
                <span className="text-surface-300 font-medium">2.</span> Copy the preview URL
              </p>
              <p>
                <span className="text-surface-300 font-medium">3.</span> Open it in Expo Go or your phone's browser
              </p>
              <p>
                <span className="text-surface-300 font-medium">4.</span> Changes deploy automatically when you generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
