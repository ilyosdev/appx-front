import { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
  Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PreviewLogEntry {
  timestamp: number;
  level: "log" | "warn" | "error" | "info";
  message: string;
}

interface PreviewConsoleProps {
  /** Callback to trigger AI error fixing */
  onFixErrors?: (errorMessage: string) => void;
  /** Whether the console should start expanded */
  defaultExpanded?: boolean;
  /** @deprecated No longer used — kept for backward compat */
  sessionId?: string | null;
}

const LS_KEY = "appx-console-collapsed";

function readCollapsedFromStorage(defaultExpanded: boolean): boolean {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  return !defaultExpanded;
}

export function PreviewConsole({
  onFixErrors,
  defaultExpanded = false,
}: PreviewConsoleProps) {
  const [collapsed, setCollapsed] = useState(() =>
    readCollapsedFromStorage(defaultExpanded)
  );
  // Track whether user manually collapsed so we don't auto-expand
  const userCollapsedRef = useRef(false);
  const [errorPulse, setErrorPulse] = useState(false);
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const prevErrorCountRef = useRef(0);

  // Sync defaultExpanded prop changes (only on first mount intent)
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === null) {
      // No stored preference — honour the prop
      setCollapsed(!defaultExpanded);
    }
  }, [defaultExpanded]);

  // Persist collapsed state
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      userCollapsedRef.current = next; // next=true means user just collapsed
      try {
        localStorage.setItem(LS_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Listen for iframe console output
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const d = event.data;
      if (!d || typeof d !== "object") return;
      const isConsole =
        (d.type === "console" || d.type === "__preview_console__") &&
        d.level &&
        d.message;
      if (!isConsole) return;

      const level = (
        ["log", "warn", "error", "info"].includes(d.level)
          ? d.level === "info"
            ? "log"
            : d.level
          : "log"
      ) as PreviewLogEntry["level"];

      setLogs((prev) =>
        [
          ...prev,
          {
            timestamp: Date.now(),
            level,
            message:
              typeof d.message === "string"
                ? d.message
                : JSON.stringify(d.message),
          },
        ].slice(-200)
      );
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-scroll to bottom when expanded
  useEffect(() => {
    if (!collapsed && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, collapsed]);

  // Auto-expand on first error; pulse badge if user manually collapsed
  useEffect(() => {
    const errorCount = logs.filter((l) => l.level === "error").length;
    const hadErrors = prevErrorCountRef.current > 0;
    const newErrors = errorCount > prevErrorCountRef.current;
    prevErrorCountRef.current = errorCount;

    if (!newErrors) return;

    if (!hadErrors && !userCollapsedRef.current) {
      // First error ever and user hasn't manually collapsed — auto-expand
      setCollapsed(false);
      try {
        localStorage.setItem(LS_KEY, "false");
      } catch {
        // ignore
      }
    } else if (collapsed) {
      // User is watching something else — pulse the badge
      setErrorPulse(true);
      setTimeout(() => setErrorPulse(false), 1200);
    }
  }, [logs, collapsed]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  const handleFixErrors = useCallback(() => {
    if (!onFixErrors) return;
    const errorLogs = logs.filter((l) => l.level === "error");
    if (errorLogs.length === 0) return;
    const buildErrors = errorLogs.filter(
      (l) =>
        l.message.includes("Unable to resolve") ||
        l.message.includes("Bundling failed") ||
        l.message.includes("SyntaxError") ||
        l.message.includes("TypeError") ||
        l.message.includes("Cannot find") ||
        l.message.includes("is not defined") ||
        l.message.includes("Module not found")
    );
    const relevantErrors = buildErrors.length > 0 ? buildErrors : errorLogs;
    const uniqueErrors = [...new Set(relevantErrors.map((l) => l.message))];
    const errorSummary = uniqueErrors.slice(0, 10).join("\n\n");
    onFixErrors(
      `Fix these preview errors in the generated code:\n\n${errorSummary}\n\nPlease fix all the errored files and ensure the app compiles and renders without crashes.`
    );
  }, [logs, onFixErrors]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLogs([]);
    prevErrorCountRef.current = 0;
  }, []);

  return (
    <div className="border-t border-surface-800 bg-surface-950 flex-shrink-0 flex flex-col">
      {/* ── Header bar (always visible) ── */}
      <div
        className="h-9 flex items-center justify-between px-3 gap-2 cursor-pointer hover:bg-surface-800/30 transition-colors select-none"
        onClick={toggle}
      >
        {/* Left: icon + label + counts */}
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          <span className="text-[11px] font-medium text-surface-400">
            Console
          </span>

          {errorCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold tabular-nums flex-shrink-0 transition-all",
                errorPulse && "scale-125 bg-red-500/40"
              )}
            >
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold tabular-nums flex-shrink-0">
              {warnCount}
            </span>
          )}

          {/* Fix with AI — text link in collapsed state */}
          {collapsed && errorCount > 0 && onFixErrors && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFixErrors();
              }}
              className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors ml-1"
            >
              <Wrench className="w-3 h-3" />
              Fix with AI
            </button>
          )}
        </div>

        {/* Right: actions + expand/collapse toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!collapsed && logs.length > 0 && (
            <button
              onClick={handleClear}
              className="p-0.5 rounded text-surface-600 hover:text-surface-400 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {collapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-surface-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-surface-600" />
          )}
        </div>
      </div>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="console-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden flex flex-col border-t border-surface-800/30"
          >
            {/* Log area */}
            <div className="flex-1 overflow-y-auto bg-[#0d1117] px-3 py-2 font-mono min-h-0">
              {logs.length === 0 ? (
                <p className="text-[10px] text-surface-600 italic">
                  No console output yet
                </p>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={`${log.timestamp}-${i}`}
                    className={cn(
                      "text-[10px] leading-[1.6] py-px flex items-start gap-1.5",
                      log.level === "error" && "text-red-400",
                      log.level === "warn" && "text-amber-400",
                      (log.level === "log" || log.level === "info") &&
                        "text-surface-500"
                    )}
                  >
                    {log.level === "error" ? (
                      <XCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                    ) : log.level === "warn" ? (
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                    ) : (
                      <Info className="w-3 h-3 flex-shrink-0 mt-px opacity-40" />
                    )}
                    <span className="break-all whitespace-pre-wrap min-w-0">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>

            {/* Fix with AI button — bottom of expanded panel */}
            {errorCount > 0 && onFixErrors && (
              <div className="flex justify-center py-1.5 border-t border-surface-800/30 bg-surface-950">
                <button
                  onClick={handleFixErrors}
                  className="px-3 py-1 rounded-md bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 text-[10px] font-medium transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Fix with AI
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
