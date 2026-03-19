import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Eye,
  FilePlus,
  FileEdit,
  Code,
  CheckCircle,
  Wrench,
  Image,
  Search,
  Terminal,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActionLogType,
  ActionLogStatus,
  type ActionLogEvent,
} from "@/types/canvas";

function getActionIcon(type: ActionLogType) {
  switch (type) {
    case ActionLogType.THINKING:
      return Brain;
    case ActionLogType.ANALYZING:
      return Eye;
    case ActionLogType.READ_FILE:
      return Eye;
    case ActionLogType.CREATE_FILE:
      return FilePlus;
    case ActionLogType.EDIT_FILE:
      return FileEdit;
    case ActionLogType.GENERATE_CODE:
      return Code;
    case ActionLogType.VALIDATE:
      return CheckCircle;
    case ActionLogType.FIX_ERROR:
      return Wrench;
    case ActionLogType.GENERATE_IMAGE:
      return Image;
    case ActionLogType.SEARCH:
      return Search;
    case ActionLogType.RUN_COMMAND:
      return Terminal;
    default:
      return Code;
  }
}

function getActionLabel(action: ActionLogEvent): string {
  const dur = action.metadata?.duration;
  const durStr = dur ? ` for ${(dur / 1000).toFixed(1)}s` : "";

  switch (action.type) {
    case ActionLogType.THINKING:
      return `Thought${durStr}`;
    case ActionLogType.ANALYZING:
      return "Analyzing project context";
    case ActionLogType.READ_FILE:
      return `Read ${action.metadata?.fileName || "file"}`;
    case ActionLogType.CREATE_FILE:
      return `Created ${action.metadata?.fileName || "file"}`;
    case ActionLogType.EDIT_FILE:
      return `Edited ${action.metadata?.fileName || "file"}`;
    case ActionLogType.GENERATE_CODE:
      return action.metadata?.summary || "Generating code";
    case ActionLogType.VALIDATE:
      return "Validating code";
    case ActionLogType.FIX_ERROR:
      return action.metadata?.summary || "Fixing errors";
    case ActionLogType.GENERATE_IMAGE:
      return `Generated image${action.metadata?.summary ? `: ${action.metadata.summary}` : ""}`;
    case ActionLogType.SEARCH:
      return `Searched: ${action.metadata?.query || ""}`;
    case ActionLogType.RUN_COMMAND:
      return `Running: ${action.metadata?.summary || "command"}`;
    default:
      return action.type;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface ChatActionLogProps {
  actions: ActionLogEvent[];
  isGenerating: boolean;
}

export function ChatActionLog({ actions, isGenerating }: ChatActionLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const prevGeneratingRef = useRef(isGenerating);

  // Auto-collapse when generation completes, auto-expand when it starts
  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating) {
      // Generation just finished - collapse
      setIsExpanded(false);
    } else if (!prevGeneratingRef.current && isGenerating) {
      // Generation just started - expand
      setIsExpanded(true);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  if (actions.length === 0) return null;

  // Deduplicate consecutive actions of the same type (e.g. multiple "Thought" entries)
  const deduped: ActionLogEvent[] = [];
  for (const action of actions) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      prev.type === action.type &&
      prev.type === ActionLogType.THINKING
    ) {
      // Merge: keep the latest status, sum durations
      const mergedDuration =
        (prev.metadata?.duration || 0) + (action.metadata?.duration || 0);
      deduped[deduped.length - 1] = {
        ...action,
        metadata: { ...action.metadata, duration: mergedDuration || undefined },
      };
    } else if (
      prev &&
      prev.type === action.type &&
      prev.type === ActionLogType.GENERATE_CODE &&
      prev.status === ActionLogStatus.STARTED &&
      action.status === ActionLogStatus.STARTED
    ) {
      // Merge duplicate "Generating N files..." entries
      deduped[deduped.length - 1] = action;
    } else {
      deduped.push(action);
    }
  }

  const completedCount = deduped.filter(
    (a) => a.status === ActionLogStatus.COMPLETED,
  ).length;
  const failedCount = deduped.filter(
    (a) => a.status === ActionLogStatus.FAILED,
  ).length;
  const inProgressCount = deduped.filter(
    (a) => a.status === ActionLogStatus.STARTED,
  ).length;

  const summaryParts: string[] = [];
  if (completedCount > 0) summaryParts.push(`${completedCount} completed`);
  if (failedCount > 0) summaryParts.push(`${failedCount} failed`);
  if (inProgressCount > 0) summaryParts.push(`${inProgressCount} in progress`);
  const summaryText = summaryParts.join(", ");

  return (
    <div className="ml-9 mt-1 mb-1">
      {/* Collapse toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-surface-400 transition-colors group w-full"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="font-medium">
          Actions
        </span>
        <span className="text-surface-600">
          ({summaryText})
        </span>
        {isGenerating && inProgressCount > 0 && (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin ml-auto" />
        )}
      </button>

      {/* Expandable action list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 flex flex-col gap-px">
              <AnimatePresence initial={false}>
                {deduped.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionRow({ action }: { action: ActionLogEvent }) {
  const Icon = getActionIcon(action.type);
  const label = getActionLabel(action);
  const isStarted = action.status === ActionLogStatus.STARTED;
  const isCompleted = action.status === ActionLogStatus.COMPLETED;
  const isFailed = action.status === ActionLogStatus.FAILED;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1.5 py-px px-1 rounded text-[11px]"
    >
      {/* Status indicator */}
      {isStarted && (
        <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
      )}
      {isCompleted && (
        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      )}
      {isFailed && (
        <X className="w-3 h-3 text-red-400 flex-shrink-0" />
      )}

      {/* Action type icon */}
      <Icon
        className={cn(
          "w-3 h-3 flex-shrink-0",
          isStarted && "text-blue-400",
          isCompleted && "text-surface-500",
          isFailed && "text-red-400",
        )}
      />

      {/* Label */}
      <span
        className={cn(
          "truncate",
          isStarted && "text-surface-300",
          isCompleted && "text-surface-500",
          isFailed && "text-red-300",
        )}
      >
        {label}
      </span>

      {/* Duration */}
      {isCompleted && action.metadata?.duration != null && (
        <span className="text-surface-600 flex-shrink-0 ml-auto tabular-nums">
          {formatDuration(action.metadata.duration)}
        </span>
      )}

      {/* Error message */}
      {isFailed && action.metadata?.error && (
        <span className="text-red-400/70 truncate ml-auto text-[10px]">
          {action.metadata.error}
        </span>
      )}
    </motion.div>
  );
}
