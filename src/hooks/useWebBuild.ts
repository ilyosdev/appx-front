import { useCallback, useState } from "react";

export type WebBuildStatus = "idle" | "building" | "ready" | "failed";

interface UseWebBuildReturn {
  buildStatus: WebBuildStatus;
  buildUrl: string | null;
  buildError: string | null;
  triggerBuild: (sessionId: string) => Promise<void>;
  clearBuild: () => void;
}

/**
 * Stub: expo-preview web builds have been removed.
 * The Railover deployment pipeline replaces this functionality.
 * This hook is kept as a no-op to avoid breaking WebPreview.tsx.
 */
export function useWebBuild(): UseWebBuildReturn {
  const [_] = useState(0); // keep react hook count stable

  const triggerBuild = useCallback(async (_sessionId: string) => {
    // No-op: expo-preview-server removed
  }, []);

  const clearBuild = useCallback(() => {
    // No-op
  }, []);

  return {
    buildStatus: "idle",
    buildUrl: null,
    buildError: null,
    triggerBuild,
    clearBuild,
  };
}
