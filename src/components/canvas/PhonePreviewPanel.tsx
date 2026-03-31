import { useState, useRef, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  RotateCcw,
  Monitor,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";
import type { ScreenData } from "@/types/canvas";

const FRAME_W = 393 + 24; // device + bezel
const FRAME_H = 852 + 24;
const BORDER_RADIUS = 55;

interface PhonePreviewPanelProps {
  screen: ScreenData | null;
  buildStatus?: string;
  streamingHtml?: string;
  stageMessage?: string;
  progressPercent?: number;
  isRNProject?: boolean;
  expoSessionId?: string | null;
  deploymentWebUrl?: string | null;
  /** Incremented externally (e.g. by socket deploy:ready) to force iframe reload */
  deployRevision?: number;
  onRebuild?: () => void;
  onFixWithAI?: (screen: ScreenData) => void;
  onRegenerate?: (screen: ScreenData) => void;
  onRunOnDevice?: () => void;
  onFixErrors?: (errorMessage: string) => void;
}

export function PhonePreviewPanel({
  screen,
  stageMessage,
  progressPercent,
  isRNProject,
  deploymentWebUrl,
  deployRevision = 0,
  onRegenerate,
}: PhonePreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Memoize the URL so the iframe doesn't remount on every parent render
  const stableUrl = useMemo(() => deploymentWebUrl || null, [deploymentWebUrl]);

  // Auto-refresh iframe when new code is deployed (deployRevision changes)
  useEffect(() => {
    if (deployRevision > 0) {
      // Small delay to let Metro rebuild after code push
      const timer = setTimeout(() => setRefreshKey(k => k + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [deployRevision]);

  // Recalculate scale when container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calc = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (cw < 10 || ch < 10) return; // not laid out yet
      const s = Math.min(cw / FRAME_W, ch / FRAME_H, 1);
      setScale(s * 0.92);
    };

    // Run after a frame so layout is stable
    const raf = requestAnimationFrame(() => {
      calc();
      // Also observe ongoing resizes
      const ro = new ResizeObserver(calc);
      ro.observe(el);
      // Store for cleanup
      (el as any).__ro = ro;
    });

    return () => {
      cancelAnimationFrame(raf);
      (el as any).__ro?.disconnect();
    };
  }, []);

  if (!screen && !deploymentWebUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center space-y-3">
          <Monitor className="w-7 h-7 text-surface-500 mx-auto" />
          <h3 className="text-sm font-medium text-surface-300">No screen selected</h3>
        </div>
      </div>
    );
  }

  // Fullscreen mode — iframe only
  if (fullscreen && deploymentWebUrl) {
    return (
      <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden">
        <div className="flex-none flex items-center justify-between px-3 py-2 bg-surface-900/80 border-b border-surface-800/50">
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="text-xs text-surface-500 truncate max-w-[200px]">{new URL(deploymentWebUrl).hostname}</span>
          </div>
          <div className="flex items-center gap-1">
            <IconBtn icon={RefreshCw} onClick={() => setRefreshKey(k => k + 1)} title="Reload" />
            <IconLink icon={ExternalLink} href={deploymentWebUrl} title="Open in new tab" />
            <IconBtn icon={Minimize2} onClick={() => setFullscreen(false)} title="Phone frame" />
          </div>
        </div>
        <iframe key={`fs-${stableUrl}-${refreshKey}`} src={stableUrl!} className="flex-1 border-0 bg-white" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
      </div>
    );
  }

  // Screen content — deployment URL iframe takes priority over loading state
  const content = stableUrl && isRNProject ? (
    <iframe key={`d-${stableUrl}-${refreshKey}`} src={stableUrl} className="w-full h-full border-0 bg-white" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
  ) : !screen && stableUrl ? (
    <iframe key={`d2-${stableUrl}-${refreshKey}`} src={stableUrl} className="w-full h-full border-0 bg-white" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
  ) : !screen ? (
    <div className="w-full h-full flex items-center justify-center bg-surface-900">
      <Monitor className="w-10 h-10 opacity-50 text-surface-500" />
    </div>
  ) : screen.isLoading ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900 p-6">
      <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-4" />
      <p className="text-surface-200 text-sm font-medium">{screen.name}</p>
      {stageMessage && <p className="text-surface-500 text-xs mt-1">{stageMessage}</p>}
      {(progressPercent ?? 0) > 0 && (
        <div className="w-28 h-1 bg-surface-800 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
    </div>
  ) : screen.hasError ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900 p-6">
      <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
      <p className="text-surface-200 text-sm font-medium mb-3">Error</p>
      {onRegenerate && (
        <button onClick={() => onRegenerate(screen)} className="px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  ) : isRNProject && stableUrl ? (
    <iframe key={`d-${stableUrl}-${refreshKey}`} src={stableUrl} className="w-full h-full border-0 bg-white" title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
  ) : isRNProject ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-900">
      <Loader2 className="w-6 h-6 text-primary-400 animate-spin mb-2" />
      <p className="text-surface-300 text-xs">Setting up preview...</p>
    </div>
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-surface-100 text-surface-500">
      <Monitor className="w-10 h-10 opacity-50" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-3 py-1.5 bg-surface-900/50 border-b border-surface-800/30">
        <div>{deploymentWebUrl && <LiveBadge />}</div>
        <div className="flex items-center gap-0.5">
          {deploymentWebUrl && (
            <>
              <IconBtn icon={RefreshCw} onClick={() => setRefreshKey(k => k + 1)} title="Reload" />
              <IconBtn icon={Maximize2} onClick={() => setFullscreen(true)} title="Fullscreen" />
              <IconLink icon={ExternalLink} href={deploymentWebUrl} title="Open in new tab" />
            </>
          )}
        </div>
      </div>

      {/* Phone container — this div MUST have a bounded height */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center"
        style={{ minHeight: 0, overflow: 'hidden' }}
      >
        {/* Scaled phone frame */}
        <div style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: 'center center', flexShrink: 0 }}>
          <div
            className="w-full h-full bg-surface-900 shadow-2xl ring-1 ring-surface-700/50 relative"
            style={{ borderRadius: BORDER_RADIUS, padding: 12 }}
          >
            {/* Dynamic Island */}
            <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-10">
              <div className="bg-black rounded-full" style={{ width: 126, height: 37 }}>
                <div className="w-3 h-3 bg-surface-800 rounded-full ring-1 ring-surface-700/50 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            {/* Screen */}
            <div className="w-full h-full bg-black overflow-hidden relative" style={{ borderRadius: BORDER_RADIUS - 8 }}>
              <div className="absolute inset-0 bg-white overflow-hidden" style={{ borderRadius: BORDER_RADIUS - 10 }}>
                {content}
              </div>
              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-white/30 rounded-full" style={{ width: 134, height: 5 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tiny helpers ---

function LiveBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[10px] text-emerald-400 font-medium">Live</span>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title }: { icon: any; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-md text-surface-500 hover:text-white hover:bg-surface-800 transition-colors" title={title}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function IconLink({ icon: Icon, href, title }: { icon: any; href: string; title: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-surface-500 hover:text-white hover:bg-surface-800 transition-colors" title={title}>
      <Icon className="w-3.5 h-3.5" />
    </a>
  );
}
