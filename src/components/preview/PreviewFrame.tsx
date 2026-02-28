import { useRef, useLayoutEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  usePreviewStore,
  DEVICES,
  type DeviceType,
  type Orientation,
} from "@/stores/previewStore";

const DYNAMIC_ISLAND = { width: 126, height: 37 };
const HOME_INDICATOR = { width: 134, height: 5, borderRadius: 2.5 };

interface PreviewFrameProps {
  children: ReactNode;
}

export function PreviewFrame({ children }: PreviewFrameProps) {
  const { selectedDevice, orientation, zoom } = usePreviewStore();
  const device = DEVICES[selectedDevice];
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(1);

  const isLandscape = orientation === "landscape";
  const screenW = isLandscape ? device.height : device.width;
  const screenH = isLandscape ? device.width : device.height;

  // Auto-scale to fit container
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const calc = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const frameW = screenW + 24;
      const frameH = screenH + 24;
      const pad = 32;
      const sx = (cw - pad) / frameW;
      const sy = (ch - pad) / frameH;
      setAutoScale(Math.min(sx, sy, 1));
    };

    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [screenW, screenH]);

  const finalScale = autoScale * zoom;
  const isAndroid = selectedDevice === "pixel8";

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden p-4"
    >
      <div
        style={{
          transform: `scale(${finalScale})`,
          transformOrigin: "center center",
        }}
        className="relative transition-transform duration-200"
      >
        {/* Outer bezel */}
        <div
          className={cn(
            "relative bg-surface-900 shadow-2xl ring-1 ring-surface-700/50",
          )}
          style={{
            width: screenW + 24,
            height: screenH + 24,
            borderRadius: device.borderRadius + 8,
            padding: 12,
          }}
        >
          {/* Inner screen */}
          <div
            className="relative bg-black overflow-hidden"
            style={{
              width: screenW,
              height: screenH,
              borderRadius: device.borderRadius,
            }}
          >
            {/* Dynamic Island / Notch (iOS only) */}
            {!isAndroid && !isLandscape && (
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
            )}

            {/* Android status bar indicator */}
            {isAndroid && !isLandscape && (
              <div className="absolute top-0 left-0 right-0 h-6 bg-black z-20 pointer-events-none flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-surface-700" />
              </div>
            )}

            {/* Screen content area */}
            <div
              className="w-full h-full bg-white overflow-hidden"
              style={{ borderRadius: device.borderRadius - 2 }}
            >
              {children}
            </div>

            {/* Home indicator */}
            {!isLandscape && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div
                  className={cn(
                    isAndroid ? "bg-white/20" : "bg-white/30",
                  )}
                  style={{
                    width: HOME_INDICATOR.width,
                    height: HOME_INDICATOR.height,
                    borderRadius: HOME_INDICATOR.borderRadius,
                  }}
                />
              </div>
            )}
          </div>

          {/* Side buttons (iOS style) */}
          {!isAndroid && (
            <>
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
            </>
          )}

          {/* Side buttons (Android style) */}
          {isAndroid && (
            <>
              <div
                className="absolute -right-0.5 bg-surface-700 rounded-r-sm"
                style={{ top: 150, width: 3, height: 80 }}
              />
              <div
                className="absolute -right-0.5 bg-surface-700 rounded-r-sm"
                style={{ top: 100, width: 3, height: 40 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { DEVICES };
export type { DeviceType, Orientation };
