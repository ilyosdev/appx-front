import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Zap, Server } from "lucide-react";

import { usePreviewStore } from "@/stores/previewStore";
import { SelfHostedPreview } from "./SelfHostedPreview";
import { PreviewFrame } from "./PreviewFrame";
import { PreviewToolbar } from "./PreviewToolbar";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";
import type { PreviewScreen } from "@/lib/preview/preview-runtime";
import { useWebBuild } from "@/hooks/useWebBuild";
import { usePreviewAutoFix } from "@/hooks/usePreviewAutoFix";

type PreviewQuality = "quick" | "full";

interface WebPreviewProps {
  /** React Native code to preview (single screen) */
  code: string | null;
  /** Multiple screens for tab-bar preview */
  screens?: PreviewScreen[];
  /** Project files for cross-file import resolution */
  files?: Record<string, string>;
  /** Expo session ID for server-side build */
  expoSessionId?: string | null;
  /** Monotonic revision for the current Expo session snapshot */
  expoSessionRevision?: number | null;
  /** Callback when user clicks "Open in Expo Go" */
  onOpenExpo?: () => void;
  /** Callback when the preview encounters an error that needs AI fix */
  onFixWithAI?: () => void;
  /** Callback to trigger AI error fixing from console errors */
  onFixErrors?: (errorMessage: string) => void;
  /** Whether the screen is currently being generated */
  isGenerating?: boolean;
  /** Stage message during generation */
  stageMessage?: string;
  /** Current screen ID for auto-fix targeting */
  screenId?: string;
  /** Current project ID */
  projectId?: string;
  /** Enable automatic error fixing (default true) */
  autoFixEnabled?: boolean;
  /** Compact mode: hide toolbar, show only the phone frame with content */
  compact?: boolean;
}

export function WebPreview({
  code,
  screens,
  files,
  expoSessionId,
  expoSessionRevision,
  onOpenExpo,
  onFixWithAI,
  onFixErrors: _onFixErrors,
  isGenerating,
  stageMessage,
  screenId,
  projectId,
  autoFixEnabled = true,
  compact = false,
}: WebPreviewProps) {
  const { setIsLoading, setErrors, clearErrors } =
    usePreviewStore();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewQuality, setPreviewQuality] =
    useState<PreviewQuality>("full");

  // Auto-fix runtime errors via socket
  const refreshRef = useRef(() => {});
  const { reportError, fixState, lastReason } = usePreviewAutoFix({
    screenId,
    projectId,
    enabled: autoFixEnabled && !isGenerating,
    onFixComplete: () => refreshRef.current(),
  });

  // Server-side web build
  const { buildStatus, buildUrl, buildError, triggerBuild, clearBuild } = useWebBuild();
  const buildRevisionKey = expoSessionId
    ? `${expoSessionId}:${expoSessionRevision ?? 0}`
    : null;

  // Rebuild the native web preview whenever the backing Expo session snapshot changes.
  useEffect(() => {
    if (!expoSessionId || !code || !buildRevisionKey) return;
    setHasLoaded(false);
    setPreviewError(null);
    setIsLoading(true);
    clearErrors();
    triggerBuild(expoSessionId);
  }, [buildRevisionKey, expoSessionId, code, triggerBuild, setIsLoading, clearErrors]);

  useEffect(() => {
    if (expoSessionId) return;
    clearBuild();
    setPreviewQuality("quick");
  }, [expoSessionId, clearBuild]);

  // Auto-trigger full preview build after generation completes
  const wasGenerating = useRef(false);
  useEffect(() => {
    if (isGenerating) {
      wasGenerating.current = true;
    } else if (wasGenerating.current && expoSessionId && code) {
      wasGenerating.current = false;
      // Generation just finished — trigger server-side build
      triggerBuild(expoSessionId);
    }
  }, [isGenerating, expoSessionId, code, triggerBuild]);

  // When build becomes ready, auto-switch to full preview
  useEffect(() => {
    if (buildStatus === "ready" && buildUrl) {
      setPreviewQuality("full");
    }
  }, [buildStatus, buildUrl]);

  useEffect(() => {
    if (buildStatus === "failed") {
      setPreviewQuality("quick");
    }
  }, [buildStatus]);

  useEffect(() => {
    setHasLoaded(false);
  }, [previewQuality, buildUrl]);

  const handleError = useCallback(
    (msg: string) => {
      setPreviewError(msg);
      setErrors([{ message: msg }]);
      // Report to auto-fix system (debounced internally)
      reportError(msg);
    },
    [setErrors, reportError],
  );

  const handleLoad = useCallback(() => {
    setHasLoaded(true);
    setPreviewError(null);
    setIsLoading(false);
    clearErrors();
  }, [setIsLoading, clearErrors]);

  const handleRefresh = useCallback(() => {
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
    setHasLoaded(false);
    setPreviewError(null);
    setIsLoading(true);
    clearErrors();
    // If in full mode and have session, rebuild
    if (previewQuality === "full" && expoSessionId) {
      triggerBuild(expoSessionId);
    }
  }, [setIsLoading, clearErrors, previewQuality, expoSessionId, triggerBuild]);

  // Keep refresh ref in sync
  refreshRef.current = handleRefresh;

  // Show generation overlay
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {!compact && <PreviewToolbar onOpenExpo={onOpenExpo} isLoading />}
        <div className="flex-1 flex items-center justify-center bg-surface-950">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-3 border-surface-600 border-t-primary-500 animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-primary-500/20" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-200">
                {stageMessage || "Generating screen..."}
              </p>
              {!compact && (
                <p className="text-xs text-surface-500 mt-1">
                  Preview will update automatically
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show placeholder if no code
  if (!code) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {!compact && <PreviewToolbar onOpenExpo={onOpenExpo} />}
        <div className="flex-1 flex items-center justify-center bg-surface-950">
          <div className="text-center space-y-3">
            {!compact && (
              <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-surface-500" />
              </div>
            )}
            <div>
              <p className={compact ? "text-xs text-surface-400" : "text-sm font-medium text-surface-300"}>
                No code to preview
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showFullPreview = previewQuality === "full" && !!buildUrl;
  const canUseQuickFallback = !!code;

  const innerContent = (
    <div className="w-full h-full relative">
      {showFullPreview ? (
        <iframe
          key={`full-${refreshKey}`}
          src={buildUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Full App Preview"
          onLoad={() => {
            setHasLoaded(true);
            setPreviewError(null);
            setIsLoading(false);
            clearErrors();
          }}
        />
      ) : (
        <SelfHostedPreview
          key={refreshKey}
          code={code}
          screens={screens}
          files={files}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}

      {!hasLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading preview...</p>
          </div>
        </div>
      )}

      {buildStatus === "building" && !showFullPreview && (
        <div className="absolute top-2 right-2 z-20 px-2 py-1 bg-surface-800/90 backdrop-blur rounded-md flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />
          <span className="text-xs text-surface-300">
            Building native web preview...
          </span>
        </div>
      )}

      {previewError && !compact && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-red-50 border-t border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-red-700">Build Error</p>
              <p className="text-xs text-red-600 mt-0.5 line-clamp-3 font-mono">{previewError}</p>
            </div>
            {onFixWithAI && (
              <button onClick={onFixWithAI} className="flex-shrink-0 px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors">Fix</button>
            )}
          </div>
        </div>
      )}

      {buildError && !showFullPreview && !compact && (
        <div className="absolute top-2 right-2 z-20 px-2 py-1 bg-amber-900/90 backdrop-blur rounded-md">
          <span className="text-xs text-amber-300">Using fallback preview</span>
        </div>
      )}

      {fixState !== "idle" && !compact && (
        <div className="absolute top-2 left-2 z-20 max-w-[260px] rounded-md bg-surface-900/90 px-2.5 py-1.5 backdrop-blur">
          <p className="text-[11px] font-medium text-surface-100">
            {fixState === "detected" && "Detected preview issue"}
            {fixState === "fixing" && "Auto-fixing preview"}
            {fixState === "fixed" && "Preview fixed"}
            {fixState === "failed" && "Preview still broken"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] text-surface-400">
            {fixState === "fixing" ? "Applying a code fix and rebuilding the preview." : lastReason || "Waiting for the next preview update."}
          </p>
        </div>
      )}
    </div>
  );

  // Compact mode: no toolbar, no phone frame — just the raw preview content filling its container
  if (compact) {
    return <div className="w-full h-full overflow-hidden">{innerContent}</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PreviewToolbar onRefresh={handleRefresh} onOpenExpo={onOpenExpo}>
        {(buildUrl || buildStatus !== "idle" || previewQuality === "quick") && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => buildUrl && setPreviewQuality("full")}
              disabled={!buildUrl && buildStatus !== "building"}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                previewQuality === "full"
                  ? "bg-surface-700 text-surface-100"
                  : buildUrl || buildStatus === "building"
                    ? "text-surface-400 hover:text-surface-200"
                    : "text-surface-600 cursor-not-allowed"
              }`}
              title="Primary preview using the real RN web build"
            >
              <Server className="w-3 h-3" />
              Native Web
              {buildStatus === "building" && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
            </button>
            {canUseQuickFallback && (
              <button
                onClick={() => setPreviewQuality("quick")}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  previewQuality === "quick"
                    ? "bg-surface-700 text-surface-100"
                    : "text-surface-400 hover:text-surface-200"
                }`}
                title="Fallback preview using client-side shims"
              >
                <Zap className="w-3 h-3" />
                Fallback
              </button>
            )}
          </div>
        )}
      </PreviewToolbar>

      <PreviewErrorBoundary onFix={onFixWithAI}>
        <PreviewFrame>
          {innerContent}
        </PreviewFrame>
      </PreviewErrorBoundary>
    </div>
  );
}
