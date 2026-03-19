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
} from "lucide-react";
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

export function PreviewConsole({
  onFixErrors,
  defaultExpanded = false,
}: PreviewConsoleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [logs, setLogs] = useState<PreviewLogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  // Listen for iframe console output (web preview mode)
  // Handles both "console" (forwarded by SelfHostedPreview) and "__preview_console__" (direct from iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const d = event.data;
      if (!d || typeof d !== "object") return;
      const isConsole = (d.type === "console" || d.type === "__preview_console__") && d.level && d.message;
      if (!isConsole) return;

      const level = (["log", "warn", "error", "info"].includes(d.level)
        ? d.level === "info" ? "log" : d.level
        : "log") as PreviewLogEntry["level"];
      setLogs((prev) =>
        [
          ...prev,
          {
            timestamp: Date.now(),
            level,
            message: typeof d.message === "string"
              ? d.message
              : JSON.stringify(d.message),
          },
        ].slice(-200),
      );
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (expanded && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, expanded]);

  // Auto-expand when errors appear
  useEffect(() => {
    if (logs.some((l) => l.level === "error") && !expanded) {
      setExpanded(true);
    }
  }, [logs, expanded]);

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  const handleFixErrors = useCallback(() => {
    if (!onFixErrors) return;
    const errorLogs = logs.filter((l) => l.level === "error");
    if (errorLogs.length === 0) return;
    // Prioritize actual build failures over version warnings
    const buildErrors = errorLogs.filter((l) =>
      l.message.includes('Unable to resolve') ||
      l.message.includes('Bundling failed') ||
      l.message.includes('SyntaxError') ||
      l.message.includes('TypeError') ||
      l.message.includes('Cannot find') ||
      l.message.includes('is not defined') ||
      l.message.includes('Module not found')
    );
    const relevantErrors = buildErrors.length > 0 ? buildErrors : errorLogs;
    const uniqueErrors = [...new Set(relevantErrors.map((l) => l.message))];
    const errorSummary = uniqueErrors.slice(0, 10).join("\n\n");
    onFixErrors(
      `Fix these preview errors in the generated code:\n\n${errorSummary}\n\nPlease fix all the errored files and ensure the app compiles and renders without crashes.`,
    );
  }, [logs, onFixErrors]);

  return (
    <div className="border-t border-surface-800/50 bg-surface-950/90 flex-shrink-0">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-surface-500" />
          <span className="text-[11px] font-medium text-surface-400">
            Console
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
            Web
          </span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold tabular-nums">
              {errorCount}
            </span>
          )}
          {warnCount > 0 && errorCount === 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold tabular-nums">
              {warnCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expanded && errorCount > 0 && onFixErrors && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFixErrors();
              }}
              className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 text-[10px] font-medium transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" />
              Fix Errors
            </button>
          )}
          {expanded && logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLogs([]);
                lastLogTimestamp.current = 0;
              }}
              className="p-0.5 rounded text-surface-600 hover:text-surface-400 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-surface-600" />
          ) : (
            <ChevronUp className="w-3 h-3 text-surface-600" />
          )}
        </div>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="max-h-40 overflow-y-auto bg-[#0d1117] px-3 py-2 font-mono border-t border-surface-800/30">
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
                  (log.level === "log" || log.level === "info") && "text-surface-500",
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
      )}
    </div>
  );
}
