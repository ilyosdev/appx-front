import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultiFileState } from "@/hooks/useProjectSocket";
import type { ActionLogEvent } from "@/types/canvas";
import { ActionLogStatus } from "@/types/canvas";

type ProgressPhase =
  | "thinking"
  | "planning"
  | "generating"
  | "validating"
  | "done"
  | "error";

function derivePhase(
  statusMessage: string,
  isStreaming: boolean,
  multiFileGenerating: boolean,
): ProgressPhase {
  if (!isStreaming && !multiFileGenerating) return "done";
  const lower = statusMessage.toLowerCase();
  if (lower.includes("validat")) return "validating";
  if (lower.includes("plan")) return "planning";
  if (
    lower.includes("generat") ||
    lower.includes("writing") ||
    lower.includes("applying") ||
    lower.includes("updating") ||
    lower.includes("working on") ||
    multiFileGenerating
  )
    return "generating";
  if (lower.includes("think") || lower.includes("process")) return "thinking";
  return "thinking";
}

function phaseLabel(
  phase: ProgressPhase,
  statusMessage: string,
  multiFileState?: MultiFileState,
): string {
  if (phase === "done") return "Done";
  if (phase === "error") return "Failed";

  // For multi-file, show count
  if (multiFileState?.isGenerating) {
    const { completed, total } = multiFileState.progress;
    const shortName = multiFileState.currentFile
      ? multiFileState.currentFile.split("/").pop()
      : null;
    if (total > 1 && shortName) {
      return `Generating ${shortName}... ${completed + 1} of ${total}`;
    }
    if (shortName) return `Generating ${shortName}...`;
    if (total > 0) return `Generating... ${completed} of ${total}`;
  }

  // Use the status message from the socket if it is descriptive enough
  if (statusMessage && statusMessage !== "Processing...") {
    return statusMessage;
  }

  switch (phase) {
    case "thinking":
      return "Thinking...";
    case "planning":
      return "Planning your changes...";
    case "generating":
      return "Generating code...";
    case "validating":
      return "Validating code...";
    default:
      return "Working...";
  }
}

// ---------------------------------------------------------------------------
// Detail rows for the expandable section
// ---------------------------------------------------------------------------

interface DetailFile {
  name: string;
  status: "done" | "active" | "pending";
}

function buildDetailFiles(multiFileState?: MultiFileState): DetailFile[] {
  if (!multiFileState || multiFileState.files.size === 0) return [];
  const result: DetailFile[] = [];
  for (const [path, state] of multiFileState.files.entries()) {
    const shortName = path.split("/").pop() || path;
    result.push({
      name: shortName,
      status: state.isComplete
        ? "done"
        : path === multiFileState.currentFile
          ? "active"
          : "pending",
    });
  }
  return result;
}

function buildDetailActions(actions?: ActionLogEvent[]): ActionLogEvent[] {
  if (!actions || actions.length === 0) return [];
  // Deduplicate consecutive thinking entries (same as ChatActionLog did)
  const deduped: ActionLogEvent[] = [];
  for (const action of actions) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.type === action.type && prev.type === "thinking") {
      const mergedDuration =
        (prev.metadata?.duration || 0) + (action.metadata?.duration || 0);
      deduped[deduped.length - 1] = {
        ...action,
        metadata: { ...action.metadata, duration: mergedDuration || undefined },
      };
    } else {
      deduped.push(action);
    }
  }
  return deduped;
}

function actionLabel(a: ActionLogEvent): string {
  switch (a.type) {
    case "thinking":
      return "Thought";
    case "analyzing":
      return "Analyzing project context";
    case "read_file":
      return `Read ${a.metadata?.fileName || "file"}`;
    case "create_file":
      return `Created ${a.metadata?.fileName || "file"}`;
    case "edit_file":
      return `Edited ${a.metadata?.fileName || "file"}`;
    case "generate_code":
      return a.metadata?.summary || "Generating code";
    case "validate":
      return "Validating code";
    case "fix_error":
      return a.metadata?.summary || "Fixing errors";
    case "generate_image":
      return `Generated image${a.metadata?.summary ? `: ${a.metadata.summary}` : ""}`;
    case "search":
      return `Searched: ${a.metadata?.query || ""}`;
    case "run_command":
      return `Running: ${a.metadata?.summary || "command"}`;
    default:
      return a.type;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ChatProgressIndicatorProps {
  isStreaming: boolean;
  statusMessage: string;
  multiFileState?: MultiFileState;
  actionLogs?: ActionLogEvent[];
  turnStatus?: string; // "idle" | "running" | "success" | "failed" | "needs-retry" | "awaiting-user-plan"
  turnError?: string;
}

export function ChatProgressIndicator({
  isStreaming,
  statusMessage,
  multiFileState,
  actionLogs,
  turnStatus,
  turnError,
}: ChatProgressIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const multiActive = multiFileState?.isGenerating ?? false;
  const active = isStreaming || multiActive;
  const hasError = turnStatus === "failed" || turnStatus === "needs-retry";
  const isPlanReady = turnStatus === "awaiting-user-plan";

  const phase: ProgressPhase = hasError
    ? "error"
    : isPlanReady
      ? "done"
      : derivePhase(statusMessage, isStreaming, multiActive);

  // Show when active, hide 1.5s after completion
  useEffect(() => {
    if (active) {
      setVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (visible && !active) {
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setExpanded(false);
      }, 1500);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active]);

  if (!visible) return null;

  // Build detail rows
  const detailFiles = buildDetailFiles(multiFileState);
  const detailActions = buildDetailActions(actionLogs);
  const hasDetails = detailFiles.length > 0 || detailActions.length > 0;

  // Progress bar percentage (multi-file only)
  const progressPct =
    multiActive && multiFileState
      ? multiFileState.progress.total > 0
        ? (multiFileState.progress.completed / multiFileState.progress.total) *
          100
        : 0
      : null;

  const label = phaseLabel(phase, statusMessage, multiFileState);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="mx-3 mb-2"
        >
          <div
            className={cn(
              "rounded-xl border px-3 py-2 transition-colors duration-300",
              phase === "error"
                ? "border-red-500/25 bg-red-500/5"
                : phase === "done"
                  ? "border-green-500/25 bg-green-500/5"
                  : "border-surface-700/40 bg-surface-900/60",
            )}
          >
            {/* Primary status line */}
            <div className="flex items-center gap-2 min-h-[24px]">
              {/* Animated indicator */}
              {phase === "done" ? (
                <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              ) : phase === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              ) : (
                <span className="relative flex h-3.5 w-3.5 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-30" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary-500" />
                </span>
              )}

              <span
                className={cn(
                  "text-xs font-medium truncate",
                  phase === "done"
                    ? "text-green-400"
                    : phase === "error"
                      ? "text-red-400"
                      : "text-surface-200",
                )}
              >
                {label}
              </span>

              {/* Progress counter badge (multi-file) */}
              {multiActive && multiFileState && multiFileState.progress.total > 0 && (
                <span className="ml-auto rounded-full bg-surface-800/80 border border-surface-700/50 px-1.5 py-0.5 text-[10px] font-medium text-surface-400 tabular-nums flex-shrink-0">
                  {multiFileState.progress.completed}/{multiFileState.progress.total}
                </span>
              )}

              {/* Expand toggle */}
              {hasDetails && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={cn(
                    "p-0.5 rounded text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0",
                    !multiActive && multiFileState && "ml-auto",
                  )}
                >
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Error message */}
            {phase === "error" && turnError && (
              <p className="mt-1 text-[11px] text-red-400/80 truncate">
                {turnError}
              </p>
            )}

            {/* Progress bar (multi-file) */}
            {progressPct !== null && (
              <div className="mt-1.5 h-1 rounded-full bg-surface-800 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    phase === "done" ? "bg-green-500" : "bg-primary-500",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}

            {/* Expandable details */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 pt-1.5 border-t border-surface-700/20 space-y-px max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
                    {/* File-level detail rows */}
                    {detailFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-1.5 py-px px-1 text-[11px]"
                      >
                        {file.status === "done" && (
                          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                        )}
                        {file.status === "active" && (
                          <Loader2 className="w-3 h-3 text-primary-400 animate-spin flex-shrink-0" />
                        )}
                        {file.status === "pending" && (
                          <Clock className="w-3 h-3 text-surface-600 flex-shrink-0" />
                        )}
                        <FileCode className="w-3 h-3 text-surface-500 flex-shrink-0" />
                        <span
                          className={cn(
                            "truncate font-mono",
                            file.status === "done" && "text-surface-500",
                            file.status === "active" && "text-surface-300",
                            file.status === "pending" && "text-surface-600",
                          )}
                        >
                          {file.name}
                        </span>
                      </div>
                    ))}

                    {/* Action log rows */}
                    {detailActions.length > 0 && detailFiles.length > 0 && (
                      <div className="border-t border-surface-700/20 my-1" />
                    )}
                    {detailActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-1.5 py-px px-1 text-[11px]"
                      >
                        {action.status === ActionLogStatus.STARTED && (
                          <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
                        )}
                        {action.status === ActionLogStatus.COMPLETED && (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        )}
                        {action.status === ActionLogStatus.FAILED && (
                          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            "truncate font-mono",
                            action.status === ActionLogStatus.STARTED &&
                              "text-surface-300",
                            action.status === ActionLogStatus.COMPLETED &&
                              "text-surface-500",
                            action.status === ActionLogStatus.FAILED &&
                              "text-red-300",
                          )}
                        >
                          {actionLabel(action)}
                        </span>
                        {action.status === ActionLogStatus.COMPLETED &&
                          action.metadata?.duration != null && (
                            <span className="text-surface-600 ml-auto tabular-nums flex-shrink-0">
                              {action.metadata.duration < 1000
                                ? `${action.metadata.duration}ms`
                                : `${(action.metadata.duration / 1000).toFixed(1)}s`}
                            </span>
                          )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
