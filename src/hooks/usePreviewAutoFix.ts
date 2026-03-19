import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface UsePreviewAutoFixOptions {
  screenId?: string;
  projectId?: string;
  enabled?: boolean;
  onFixComplete?: () => void;
}

const MAX_AUTO_FIX_ATTEMPTS = 3;
const ERROR_DEBOUNCE_MS = 2000;
const DEDUP_WINDOW_MS = 10000;

/**
 * Hook that auto-reports preview runtime errors to the backend via socket
 * for AI-powered auto-fixing. Includes debounce, dedup, and attempt limits.
 */
export function usePreviewAutoFix({
  screenId,
  projectId,
  enabled = true,
  onFixComplete,
}: UsePreviewAutoFixOptions) {
  const attemptCountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingErrorsRef = useRef<string[]>([]);
  const lastSentErrorsRef = useRef<string>('');
  const lastSentTimeRef = useRef(0);
  const onFixCompleteRef = useRef(onFixComplete);
  const [fixState, setFixState] = useState<"idle" | "detected" | "fixing" | "fixed" | "failed">("idle");
  const [lastReason, setLastReason] = useState<string | null>(null);
  onFixCompleteRef.current = onFixComplete;

  // Reset attempts when screen changes
  useEffect(() => {
    attemptCountRef.current = 0;
    pendingErrorsRef.current = [];
    lastSentErrorsRef.current = '';
    lastSentTimeRef.current = 0;
    setFixState('idle');
    setLastReason(null);
  }, [screenId]);

  // Listen for fix-complete from backend
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !enabled) return;

    const handleFixComplete = (data: { screenId: string; fixed?: boolean; reason?: string }) => {
      if (data.screenId === screenId) {
        setFixState(data.fixed ? 'fixed' : 'failed');
        setLastReason(data.reason || null);
        onFixCompleteRef.current?.();
      }
    };

    socket.on('preview:fix-complete', handleFixComplete);
    return () => {
      socket.off('preview:fix-complete', handleFixComplete);
    };
  }, [screenId, enabled]);

  const reportError = useCallback(
    (errorMessage: string) => {
      if (!enabled || !screenId || !projectId) return;
      if (attemptCountRef.current >= MAX_AUTO_FIX_ATTEMPTS) return;

      // Skip non-actionable errors
      if (
        errorMessage.includes('[Preview]') ||
        errorMessage.includes('Script error') ||
        errorMessage.includes('ResizeObserver')
      ) {
        return;
      }

      pendingErrorsRef.current.push(errorMessage);
      setFixState('detected');
      setLastReason(errorMessage);

      // Debounce: wait for errors to accumulate (React dev mode double-renders, etc.)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const errors = [...new Set(pendingErrorsRef.current)];
        pendingErrorsRef.current = [];

        if (errors.length === 0) return;

        // Dedup: don't send identical errors within the dedup window
        const errorKey = errors.sort().join('|||');
        const now = Date.now();
        if (
          errorKey === lastSentErrorsRef.current &&
          now - lastSentTimeRef.current < DEDUP_WINDOW_MS
        ) {
          return;
        }

        const socket = getSocket();
        if (!socket?.connected) return;

        attemptCountRef.current += 1;
        lastSentErrorsRef.current = errorKey;
        lastSentTimeRef.current = now;
        setFixState('fixing');

        socket.emit('preview:runtime-error', {
          screenId,
          errors,
          attempt: attemptCountRef.current,
        });
      }, ERROR_DEBOUNCE_MS);
    },
    [enabled, screenId, projectId],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    reportError,
    attemptCount: attemptCountRef.current,
    maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
    fixState,
    lastReason,
  };
}
