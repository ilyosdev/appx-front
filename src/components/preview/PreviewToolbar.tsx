import {
  Smartphone,
  Monitor,
  RotateCcw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePreviewStore,
  DEVICES,
  type DeviceType,
} from "@/stores/previewStore";

interface PreviewToolbarProps {
  onRefresh?: () => void;
  onOpenExpo?: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const DEVICE_OPTIONS: { value: DeviceType; label: string; icon: typeof Smartphone }[] = [
  { value: "iphone15", label: "iPhone 15", icon: Smartphone },
  { value: "iphone15promax", label: "iPhone 15 Pro Max", icon: Smartphone },
  { value: "pixel8", label: "Pixel 8", icon: Smartphone },
  { value: "ipadmini", label: "iPad Mini", icon: Monitor },
];

export function PreviewToolbar({
  onRefresh,
  onOpenExpo,
  isLoading,
  children,
}: PreviewToolbarProps) {
  const {
    previewMode,
    setPreviewMode,
    selectedDevice,
    setSelectedDevice,
    orientation,
    toggleOrientation,
    zoom,
    setZoom,
  } = usePreviewStore();

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/50 bg-surface-950/90 backdrop-blur-sm flex-shrink-0">
      {/* Left: Preview mode toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-surface-800/50 rounded-lg p-0.5">
          <ModeButton
            active={previewMode === "web"}
            onClick={() => setPreviewMode("web")}
            icon={Globe}
            label="Web"
          />
          <ModeButton
            active={false}
            onClick={() => {
              setPreviewMode("web");
              onOpenExpo?.();
            }}
            icon={Smartphone}
            label="Device"
          />
        </div>

        {/* Device selector (only in web mode) */}
        {previewMode === "web" && (
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value as DeviceType)}
            className="text-xs bg-surface-800/50 border border-surface-700/50 text-surface-300 rounded-lg px-2 py-1.5 outline-none focus:border-primary-500/50 cursor-pointer"
          >
            {DEVICE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({DEVICES[d.value].width}x{DEVICES[d.value].height})
              </option>
            ))}
          </select>
        )}

        {children}
      </div>

      {/* Right: Controls */}
      {previewMode === "web" && (
        <div className="flex items-center gap-1">
          {/* Orientation toggle */}
          <ToolbarButton
            onClick={toggleOrientation}
            title={`Switch to ${orientation === "portrait" ? "landscape" : "portrait"}`}
          >
            <RotateCcw className={cn(
              "w-3.5 h-3.5",
              orientation === "landscape" && "rotate-90",
            )} />
          </ToolbarButton>

          {/* Zoom controls */}
          <ToolbarButton
            onClick={() => setZoom(zoom - 0.1)}
            disabled={zoom <= 0.25}
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </ToolbarButton>
          <span className="text-xs text-surface-500 min-w-[3rem] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarButton
            onClick={() => setZoom(zoom + 0.1)}
            disabled={zoom >= 2}
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </ToolbarButton>

          {/* Divider */}
          <div className="w-px h-5 bg-surface-700/50 mx-1" />

          {/* Refresh */}
          <ToolbarButton
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh preview"
          >
            <RefreshCw className={cn(
              "w-3.5 h-3.5",
              isLoading && "animate-spin",
            )} />
          </ToolbarButton>

          {/* Open on device */}
          {onOpenExpo && (
            <button
              onClick={onOpenExpo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-surface-400 hover:text-white bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 rounded-lg transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Expo Go</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active
          ? "bg-primary-500/15 text-primary-300"
          : "text-surface-400 hover:text-surface-200",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 text-surface-400 hover:text-white hover:bg-surface-800 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
