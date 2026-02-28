import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  useExpoPreviewStore,
  type ExpoSession,
  type SessionStatus,
} from "@/stores/expoPreviewStore";

interface UseExpoPreviewReturn {
  status: SessionStatus;
  session: ExpoSession | null;
  error: string | null;
  remainingTime: number | null;
  createSession: (
    code: string,
    screenName: string,
    screenId?: string,
  ) => Promise<void>;
  updateSession: (code: string) => Promise<void>;
  destroySession: () => Promise<void>;
  autoPreview: boolean;
  setAutoPreview: (enabled: boolean) => void;
}

export function useExpoPreview(
  projectId: string | undefined,
): UseExpoPreviewReturn {
  const store = useExpoPreviewStore();
  const session = projectId
    ? (store.sessions.get(projectId) ?? null)
    : null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Countdown timer for session expiry
  useEffect(() => {
    if (!session?.expiresAt) {
      setRemainingTime(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
        ),
      );
      setRemainingTime(remaining);
      if (remaining <= 0) {
        store.setStatus("expired");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt, store]);

  const createSession = useCallback(
    async (code: string, screenName: string, screenId?: string) => {
      if (!projectId) return;
      store.setStatus("creating");
      store.setError(null);

      try {
        const response = await api.post("/expo-preview/sessions", {
          projectId,
          screenId,
          reactNativeCode: code,
          screenName,
        }, { timeout: 120000 }); // 2 minutes for Metro cold-start
        const data = response.data.data || response.data;
        store.setSession(projectId, {
          sessionId: data.sessionId,
          expoUrl: data.expoUrl,
          qrCodeDataUrl: data.qrCodeDataUrl,
          port: data.port,
          status: "running",
          expiresAt: data.expiresAt,
        });
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const message =
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          "Failed to create preview session";
        store.setError(message);
      }
    },
    [projectId, store],
  );

  const updateSession = useCallback(
    async (code: string) => {
      if (!projectId || !session) return;

      // Debounce updates (500ms)
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        store.setStatus("updating");
        try {
          await api.patch(
            `/expo-preview/sessions/${session.sessionId}`,
            {
              reactNativeCode: code,
            },
            { timeout: 60000 }, // 1 minute for code update
          );
          store.setStatus("active");
        } catch (err: unknown) {
          const axiosErr = err as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          const message =
            axiosErr.response?.data?.message ||
            axiosErr.message ||
            "Failed to update session";
          store.setError(message);
        }
      }, 500);
    },
    [projectId, session, store],
  );

  const destroySession = useCallback(async () => {
    if (!projectId || !session) return;
    try {
      await api.delete(`/expo-preview/sessions/${session.sessionId}`);
    } catch {
      // Ignore errors on destroy — session may already be expired
    }
    store.removeSession(projectId);
  }, [projectId, session, store]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    status: store.currentStatus,
    session,
    error: store.currentError,
    remainingTime,
    createSession,
    updateSession,
    destroySession,
    autoPreview: store.autoPreview,
    setAutoPreview: store.setAutoPreview,
  };
}
