import { useEffect, useMemo, useRef } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { Loader2, AlertCircle } from "lucide-react";

import { usePreviewStore } from "@/stores/previewStore";
import { buildSandpackFiles, getSandpackSetup } from "@/lib/preview/sandpack-setup";
import { PreviewFrame } from "./PreviewFrame";
import { PreviewToolbar } from "./PreviewToolbar";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";

interface WebPreviewProps {
  /** React Native code to preview */
  code: string | null;
  /** Callback when user clicks "Open in Expo Go" */
  onOpenExpo?: () => void;
  /** Callback when the preview encounters an error that needs AI fix */
  onFixWithAI?: () => void;
  /** Whether the screen is currently being generated */
  isGenerating?: boolean;
  /** Stage message during generation */
  stageMessage?: string;
}

export function WebPreview({
  code,
  onOpenExpo,
  onFixWithAI,
  isGenerating,
  stageMessage,
}: WebPreviewProps) {
  const { previewMode, setIsLoading, setErrors, clearErrors } = usePreviewStore();

  // Build sandpack files from the RN code
  const files = useMemo(() => buildSandpackFiles(code), [code]);
  const setup = useMemo(() => getSandpackSetup(), []);

  // Key to force remount when code changes substantially
  const codeHash = useMemo(() => {
    if (!code) return "empty";
    // Simple hash: first 100 chars + length
    return `${code.slice(0, 100)}-${code.length}`;
  }, [code]);

  // Show generation overlay
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PreviewToolbar onOpenExpo={onOpenExpo} isLoading />
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
              <p className="text-xs text-surface-500 mt-1">
                Preview will update automatically
              </p>
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
        <PreviewToolbar onOpenExpo={onOpenExpo} />
        <div className="flex-1 flex items-center justify-center bg-surface-950">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-surface-800/50 border border-surface-700/50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-surface-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-300">
                No code to preview
              </p>
              <p className="text-xs text-surface-500 max-w-[200px] mx-auto">
                Select a screen or generate one using the chat.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If in device mode, show a prompt to open Expo
  if (previewMode === "device") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PreviewToolbar onOpenExpo={onOpenExpo} />
        <div className="flex-1 flex items-center justify-center bg-surface-950">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-200">
                Test on Real Device
              </p>
              <p className="text-xs text-surface-500 max-w-[220px] mx-auto mt-1">
                Preview this screen natively on your phone via Expo Go.
              </p>
            </div>
            {onOpenExpo && (
              <button
                onClick={onOpenExpo}
                className="px-4 py-2.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-primary-500/20"
              >
                Open Expo Preview
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PreviewToolbar onRefresh={() => {}} onOpenExpo={onOpenExpo} />

      <PreviewErrorBoundary onFix={onFixWithAI}>
        <SandpackProvider
          key={codeHash}
          template="react"
          files={files}
          customSetup={setup}
          options={{
            externalResources: [
              "https://fonts.googleapis.com/css2?family=Material+Icons&display=swap",
            ],
            classes: {
              "sp-wrapper": "!h-full",
              "sp-layout": "!h-full !border-0 !bg-transparent !rounded-none",
              "sp-preview-container": "!h-full",
              "sp-preview-iframe": "!h-full",
            },
          }}
          theme="dark"
        >
          <SandpackPreviewWrapper
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => {
              setIsLoading(false);
              clearErrors();
            }}
            onError={(msg) => setErrors([{ message: msg }])}
            onFixWithAI={onFixWithAI}
          />
        </SandpackProvider>
      </PreviewErrorBoundary>
    </div>
  );
}

/**
 * Inner component that has access to useSandpack context.
 * Wraps the SandpackPreview inside the phone frame.
 */
function SandpackPreviewWrapper({
  onLoadStart,
  onLoadEnd,
  onError,
  onFixWithAI,
}: {
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onError: (msg: string) => void;
  onFixWithAI?: () => void;
}) {
  const { sandpack, listen } = useSandpack();
  const hasLoaded = useRef(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listenRef = useRef(listen);
  listenRef.current = listen;

  // Stable refs for callbacks to avoid re-triggering the effect
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  const onErrorRef = useRef(onError);
  onLoadStartRef.current = onLoadStart;
  onLoadEndRef.current = onLoadEnd;
  onErrorRef.current = onError;

  // Track activeFile separately to avoid depending on unstable `listen` ref
  const activeFile = sandpack.activeFile;

  useEffect(() => {
    onLoadStartRef.current();
    hasLoaded.current = false;

    const stopListening = listenRef.current((msg) => {
      if (msg.type === "done") {
        hasLoaded.current = true;
        onLoadEndRef.current();
      }
      // Sandpack error messages
      if (msg.type === "action" && (msg as any).action === "show-error") {
        const errorMsg = (msg as any).message || "Unknown error";
        onErrorRef.current(errorMsg);
      }
    });

    // Fallback timeout: if loading takes > 15s, stop showing spinner
    errorTimeoutRef.current = setTimeout(() => {
      if (!hasLoaded.current) {
        onLoadEndRef.current();
      }
    }, 15000);

    return () => {
      stopListening();
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const sandpackErrors = (sandpack as any).errors;
  const hasErrors = sandpackErrors && sandpackErrors.length > 0;

  return (
    <PreviewFrame>
      <div className="w-full h-full relative">
        {/* Sandpack Preview (hidden editor, only preview) */}
        <SandpackPreview
          showNavigator={false}
          showRefreshButton={false}
          showOpenInCodeSandbox={false}
          style={{ height: "100%", width: "100%" }}
        />

        {/* Loading overlay */}
        {!hasLoaded.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Loading preview...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasErrors && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-red-50 border-t border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-red-700">Build Error</p>
                <p className="text-xs text-red-600 mt-0.5 line-clamp-3 font-mono">
                  {sandpackErrors[0]?.message || "Unknown error"}
                </p>
              </div>
              {onFixWithAI && (
                <button
                  onClick={onFixWithAI}
                  className="flex-shrink-0 px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors"
                >
                  Fix
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PreviewFrame>
  );
}
