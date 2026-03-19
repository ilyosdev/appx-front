import { useState, useRef, useLayoutEffect, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ensureHtmlStyles } from "@/lib/htmlUtils";
import { isReactCode } from "@/lib/codeUtils";
import type { ScreenData } from "@/types/canvas";

// Device configuration
const DEVICE_CONFIG = {
  width: 393,
  height: 852,
  borderRadius: 47,
};

const DYNAMIC_ISLAND = {
  width: 126,
  height: 37,
};

const HOME_INDICATOR = {
  width: 134,
  height: 5,
  borderRadius: 2.5,
};

type BuildStatus = "idle" | "building" | "ready" | "error";

interface PhonePreviewPanelProps {
  screen: ScreenData | null;
  buildStatus?: BuildStatus;
  streamingHtml?: string;
  stageMessage?: string;
  progressPercent?: number;
  isRNProject?: boolean;
  expoSessionId?: string | null;
  deploymentWebUrl?: string | null;
  onRebuild?: () => void;
  onFixWithAI?: (screen: ScreenData) => void;
  onRegenerate?: (screen: ScreenData) => void;
  onRunOnDevice?: () => void;
  onFixErrors?: (errorMessage: string) => void;
}

export function PhonePreviewPanel({
  screen,
  buildStatus = "idle",
  streamingHtml,
  stageMessage,
  progressPercent,
  isRNProject,
  expoSessionId,
  deploymentWebUrl,
  onRebuild,
  onFixWithAI,
  onRegenerate,
  onRunOnDevice,
  onFixErrors,
}: PhonePreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale to fit phone in container
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const calculateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      // Phone frame is slightly larger than screen (bezel)
      const frameWidth = DEVICE_CONFIG.width + 24;
      const frameHeight = DEVICE_CONFIG.height + 24;

      const padding = 40;
      const scaleX = (containerWidth - padding) / frameWidth;
      const scaleY = (containerHeight - padding) / frameHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Determine what content to render in the iframe (legacy web projects only)
  const iframeSrc = useMemo(() => {
    if (!screen) return null;

    const contentIsReact =
      screen.contentType === "react" || isReactCode(screen.htmlContent);

    // For legacy web projects: compiledHtml > legacy HTML
    if (contentIsReact && screen.compiledHtml)
      return { type: "srcdoc" as const, content: screen.compiledHtml };
    if (screen.htmlContent && !contentIsReact)
      return {
        type: "srcdoc" as const,
        content: ensureHtmlStyles(screen.htmlContent, { screenId: screen.id }),
      };
    return null;
  }, [screen]);

  const isSkeleton = screen?.buildStatus === "skeleton";

  if (!screen) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center mx-auto">
            <Monitor className="w-7 h-7 text-surface-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-surface-300">
              No screen selected
            </h3>
            <p className="text-xs text-surface-500 max-w-[200px]">
              Select a screen from the list to see its preview here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden">
      {/* Phone preview area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="relative"
        >
          {/* Outer device frame (bezel) */}
          <div
            className="relative bg-surface-900 shadow-2xl ring-1 ring-surface-700/50"
            style={{
              width: DEVICE_CONFIG.width + 24,
              height: DEVICE_CONFIG.height + 24,
              borderRadius: DEVICE_CONFIG.borderRadius + 8,
              padding: 12,
            }}
          >
            {/* Inner screen area */}
            <div
              className="relative bg-black overflow-hidden"
              style={{
                width: DEVICE_CONFIG.width,
                height: DEVICE_CONFIG.height,
                borderRadius: DEVICE_CONFIG.borderRadius,
              }}
            >
              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div
                  className="bg-black flex items-center justify-center"
                  style={{
                    width: DYNAMIC_ISLAND.width,
                    height: DYNAMIC_ISLAND.height,
                    borderRadius: DYNAMIC_ISLAND.height / 2,
                  }}
                >
                  <div className="w-3 h-3 bg-surface-800 rounded-full ring-1 ring-surface-700/50 ml-auto mr-4" />
                </div>
              </div>

              {/* Screen content */}
              <div
                className="w-full h-full bg-white overflow-hidden"
                style={{
                  borderRadius: DEVICE_CONFIG.borderRadius - 2,
                }}
              >
                {screen.isLoading ? (
                  <LoadingOverlay
                    screenName={screen.name}
                    stageMessage={stageMessage}
                    progressPercent={progressPercent}
                    streamingHtml={streamingHtml}
                  />
                ) : screen.hasError ? (
                  <ErrorOverlay
                    screen={screen}
                    onRetry={onRegenerate}
                  />
                ) : iframeSrc ? (
                  <iframe
                    srcDoc={iframeSrc.content}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title={screen.name}
                  />
                ) : buildStatus === "building" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                    <p className="text-surface-400 text-xs">
                      Building preview...
                    </p>
                  </div>
                ) : buildStatus === "error" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                    <p className="text-surface-400 text-xs mb-3">
                      Build failed
                    </p>
                    {onFixWithAI && (
                      <button
                        onClick={() => onFixWithAI(screen)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Fix with AI
                      </button>
                    )}
                  </div>
                ) : isRNProject && deploymentWebUrl ? (
                  <iframe
                    src={deploymentWebUrl}
                    className="w-full h-full border-0 bg-white"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : isRNProject ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900 text-surface-400 p-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-primary-400" />
                    </div>
                    <p className="text-sm font-medium text-surface-200 mb-1">React Native Screen</p>
                    <p className="text-xs text-surface-500 text-center max-w-[220px] mb-4">
                      Preview this screen on your phone with Expo Go
                    </p>
                    {onRunOnDevice && (
                      <button
                        onClick={onRunOnDevice}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Run on Device
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-100 text-surface-500">
                    <Monitor className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No preview available</p>
                  </div>
                )}

                {/* Skeleton overlay */}
                {isSkeleton && !screen.isLoading && iframeSrc && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                    <div className="bg-surface-900/95 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-xl border border-surface-700/50 max-w-[260px]">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-surface-200 text-xs font-medium mb-1">
                          Needs Regeneration
                        </p>
                        <p className="text-surface-500 text-[10px] leading-relaxed">
                          This screen had build errors and was replaced with a
                          placeholder.
                        </p>
                      </div>
                      {onRegenerate && (
                        <button
                          onClick={() => onRegenerate(screen)}
                          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Fix with AI overlay for build errors with existing preview */}
                {buildStatus === "error" && iframeSrc && onFixWithAI && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={() => onFixWithAI(screen)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-lg transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Fix with AI
                    </button>
                  </div>
                )}
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div
                  className="bg-white/30"
                  style={{
                    width: HOME_INDICATOR.width,
                    height: HOME_INDICATOR.height,
                    borderRadius: HOME_INDICATOR.borderRadius,
                  }}
                />
              </div>
            </div>

            {/* Side buttons */}
            <div
              className="absolute -right-0.5 bg-surface-700 rounded-r-sm"
              style={{ top: 120, width: 3, height: 64 }}
            />
            <div
              className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
              style={{ top: 100, width: 3, height: 32 }}
            />
            <div
              className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
              style={{ top: 145, width: 3, height: 32 }}
            />
            <div
              className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
              style={{ top: 70, width: 3, height: 16 }}
            />
          </div>
        </div>
      </div>

      {/* Action bar below phone */}
      {onRebuild && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-surface-800/50">
          <button
            onClick={onRebuild}
            disabled={buildStatus === "building" || !!screen.isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800/50 text-surface-400 hover:text-white hover:bg-surface-800 border border-surface-700/50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                buildStatus === "building" && "animate-spin",
              )}
            />
            Rebuild
          </button>
        </div>
      )}

    </div>
  );
}

/** Loading state overlay for the phone screen */
function LoadingOverlay({
  screenName,
  stageMessage,
  progressPercent,
  streamingHtml,
}: {
  screenName: string;
  stageMessage?: string;
  progressPercent?: number;
  streamingHtml?: string;
}) {
  const hasStreamingContent = streamingHtml && streamingHtml.length > 50;

  if (hasStreamingContent) {
    return (
      <div className="w-full h-full relative">
        <iframe
          srcDoc={ensureHtmlStyles(streamingHtml!)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Generating ${screenName}`}
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full p-2 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span className="text-xs text-white/80 pr-1">Building...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-3 border-surface-600 border-t-primary-500 animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary-400" />
      </div>
      <p className="text-sm font-medium text-surface-300 mb-1">
        {stageMessage || `Generating ${screenName}...`}
      </p>
      <p className="text-xs text-surface-500">This may take a moment</p>
      {typeof progressPercent === "number" && progressPercent > 0 && (
        <div className="w-48 mt-4 h-1 bg-surface-700/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Error state overlay */
function ErrorOverlay({
  screen,
  onRetry,
}: {
  screen: ScreenData;
  onRetry?: (screen: ScreenData) => void;
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900 p-6">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-sm font-medium text-surface-200 mb-2">
        Generation Failed
      </p>
      <p className="text-xs text-surface-400 max-w-[240px] text-center mb-4">
        {screen.errorMessage || "An error occurred while generating this screen"}
      </p>
      {onRetry && (
        <button
          onClick={() => onRetry(screen)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Generation
        </button>
      )}
    </div>
  );
}
