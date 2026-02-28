'use client';

import { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RotateCcw, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

// Device configuration types
type DeviceType = 'iphone14pro' | 'iphone15promax' | 'responsive';

interface DeviceConfig {
  width: number;
  height: number;
  borderRadius: number;
  name: string;
}

const DEVICE_CONFIGS: Record<Exclude<DeviceType, 'responsive'>, DeviceConfig> = {
  iphone14pro: {
    width: 393,
    height: 852,
    borderRadius: 47,
    name: 'iPhone 14 Pro',
  },
  iphone15promax: {
    width: 430,
    height: 932,
    borderRadius: 55,
    name: 'iPhone 15 Pro Max',
  },
};

// Dynamic Island dimensions
const DYNAMIC_ISLAND = {
  width: 126,
  height: 37,
  borderRadius: 20,
};

// Home indicator dimensions
const HOME_INDICATOR = {
  width: 134,
  height: 5,
  borderRadius: 2.5,
};

interface DevicePreviewProps {
  url: string | null;
  srcdoc?: string | null;
  isLoading: boolean;
  loadingStage?: string;
  onRefresh?: () => void;
  onOpenExternal?: () => void;
  onNavigate?: (targetPath: string, targetLabel: string, tabIndex?: number) => void;
}

export function DevicePreview({
  url,
  srcdoc,
  isLoading,
  loadingStage,
  onRefresh,
  onOpenExternal,
  onNavigate,
}: DevicePreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('iphone14pro');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const isResponsive = selectedDevice === 'responsive';
  const deviceConfig = isResponsive ? null : DEVICE_CONFIGS[selectedDevice];

  // Calculate scale to fit device frame in container
  // Using useLayoutEffect for DOM measurements to avoid visual flicker
  useLayoutEffect(() => {
    if (!containerRef.current || isResponsive) {
      // Reset scale when switching to responsive mode - this is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScale(1);
      return;
    }

    const calculateScale = () => {
      if (!containerRef.current || !deviceConfig) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Account for padding around device frame (24px on each side)
      const frameWidth = deviceConfig.width + 48;
      const frameHeight = deviceConfig.height + 48;

      // Calculate scale with some padding for breathing room
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
  }, [deviceConfig, isResponsive]);

  // Listen for navigation messages from iframe content
  const stableOnNavigate = useCallback(
    (targetPath: string, targetLabel: string, tabIndex?: number) => {
      onNavigate?.(targetPath, targetLabel, tabIndex);
    },
    [onNavigate],
  );

  useEffect(() => {
    if (!onNavigate) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'navigateToScreen') {
        stableOnNavigate(event.data.targetPath, event.data.targetLabel, event.data.tabIndex);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onNavigate, stableOnNavigate]);

  const deviceButtons = useMemo(
    () => [
      { type: 'iphone14pro' as DeviceType, icon: Smartphone, label: 'iPhone 14 Pro' },
      { type: 'iphone15promax' as DeviceType, icon: Smartphone, label: 'iPhone 15 Pro Max' },
      { type: 'responsive' as DeviceType, icon: Monitor, label: 'Responsive' },
    ],
    []
  );

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2 border-b border-surface-800 bg-surface-900/50 backdrop-blur-sm"
      >
        {/* Device selection */}
        <div className="flex items-center gap-1">
          {deviceButtons.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant={selectedDevice === type ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedDevice(type)}
              className={cn(
                'gap-1.5 text-xs',
                selectedDevice === type
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-white'
              )}
              title={label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || !url}
            className="text-surface-400 hover:text-white"
            title="Refresh preview"
          >
            <RotateCcw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenExternal}
            disabled={!url}
            className="text-surface-400 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Preview container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingState key="loading" loadingStage={loadingStage} />
          ) : isResponsive ? (
            <ResponsivePreview key="responsive" url={url} srcdoc={srcdoc} />
          ) : (
            <DeviceFrame
              key={selectedDevice}
              config={deviceConfig!}
              url={url}
              srcdoc={srcdoc}
              scale={scale}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState({ loadingStage }: { loadingStage?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-4"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-primary-500" />
        </motion.div>
        <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-surface-400 text-sm text-center"
      >
        {loadingStage || 'Loading preview...'}
      </motion.p>
    </motion.div>
  );
}

// Responsive preview component
function ResponsivePreview({ url, srcdoc }: { url: string | null; srcdoc?: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full h-full rounded-lg overflow-hidden bg-white shadow-2xl"
    >
      {srcdoc ? (
        <iframe
          srcDoc={srcdoc}
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : url ? (
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      ) : (
        <EmptyPreview />
      )}
    </motion.div>
  );
}

// Device frame component
function DeviceFrame({
  config,
  url,
  srcdoc,
  scale,
}: {
  config: DeviceConfig;
  url: string | null;
  srcdoc?: string | null;
  scale: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
      className="relative"
    >
      {/* Outer device frame (bezel) */}
      <div
        className={cn(
          'relative bg-surface-900 shadow-2xl',
          'ring-1 ring-surface-700/50',
          'transition-all duration-300'
        )}
        style={{
          width: config.width + 24,
          height: config.height + 24,
          borderRadius: config.borderRadius + 8,
          padding: 12,
        }}
      >
        {/* Inner screen area */}
        <div
          className="relative bg-black overflow-hidden"
          style={{
            width: config.width,
            height: config.height,
            borderRadius: config.borderRadius,
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
                borderBottomLeftRadius: DYNAMIC_ISLAND.borderRadius,
                borderBottomRightRadius: DYNAMIC_ISLAND.borderRadius,
              }}
            >
              {/* Camera lens */}
              <div className="w-3 h-3 bg-surface-800 rounded-full ring-1 ring-surface-700/50 ml-auto mr-4" />
            </div>
          </div>

          {/* Screen content */}
          <div
            className="w-full h-full bg-white overflow-hidden"
            style={{ borderRadius: config.borderRadius - 2 }}
          >
            {srcdoc ? (
              <iframe
                srcDoc={srcdoc}
                className="w-full h-full border-0"
                title="Device Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : url ? (
              <iframe
                src={url}
                className="w-full h-full border-0"
                title="Device Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            ) : (
              <EmptyPreview />
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
        {/* Power button */}
        <div
          className="absolute -right-0.5 bg-surface-700 rounded-r-sm"
          style={{ top: 120, width: 3, height: 64 }}
        />

        {/* Volume buttons */}
        <div
          className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
          style={{ top: 100, width: 3, height: 32 }}
        />
        <div
          className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
          style={{ top: 145, width: 3, height: 32 }}
        />

        {/* Silent switch */}
        <div
          className="absolute -left-0.5 bg-surface-700 rounded-l-sm"
          style={{ top: 70, width: 3, height: 16 }}
        />
      </div>
    </motion.div>
  );
}

// Empty preview placeholder
function EmptyPreview() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-100 text-surface-500">
      <Monitor className="w-12 h-12 mb-3 opacity-50" />
      <p className="text-sm">No preview available</p>
      <p className="text-xs text-surface-400 mt-1">Click Start to build your app preview</p>
    </div>
  );
}
