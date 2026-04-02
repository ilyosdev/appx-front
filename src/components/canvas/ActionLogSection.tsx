import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FilePlus,
  Pencil,
  Search,
  AlertCircle,
  Wrench,
  Code2,
  Brain,
  CheckCircle,
  Settings,
  Loader2,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionLogEvent } from "@/types/canvas";
import { ActionLogStatus } from "@/types/canvas";

function getActionIcon(type: string) {
  switch (type) {
    case "thinking": return Brain;
    case "analyzing": return Search;
    case "read_file": return Eye;
    case "create_file": return FilePlus;
    case "edit_file": return Pencil;
    case "validate": return CheckCircle;
    case "fix_error": return Wrench;
    case "search": return Search;
    case "generate_code": return Code2;
    case "generate_image": return Image;
    case "run_command": return Settings;
    default: return Code2;
  }
}

function getActionLabel(action: ActionLogEvent): string {
  switch (action.type) {
    case "thinking": {
      const dur = action.metadata?.duration;
      if (dur) {
        return `Thought for ${dur < 1000 ? `${dur}ms` : `${(dur / 1000).toFixed(0)}s`}`;
      }
      return "Thinking";
    }
    case "analyzing": return "Analyzed project context";
    case "read_file": return `Read ${action.metadata?.fileName || "file"}`;
    case "create_file": return `Created ${action.metadata?.fileName || "file"}`;
    case "edit_file": return `Edited ${action.metadata?.fileName || "file"}`;
    case "generate_code": return action.metadata?.summary || "Generated code";
    case "validate": return "Verified build";
    case "fix_error": return action.metadata?.summary || "Fixed errors";
    case "search": return `Searched: ${action.metadata?.query || "files"}`;
    case "run_command": return action.metadata?.summary || "Ran command";
    case "generate_image": return action.metadata?.summary || "Generated image";
    default: return action.metadata?.summary || action.type;
  }
}

function dedupeActions(actions: ActionLogEvent[]): ActionLogEvent[] {
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

interface ActionLogSectionProps {
  actionLogs: ActionLogEvent[];
  defaultExpanded?: boolean;
}

export function ActionLogSection({ actionLogs, defaultExpanded = false }: ActionLogSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!actionLogs || actionLogs.length === 0) return null;

  const actions = dedupeActions(actionLogs);
  const actionCount = actions.length;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-surface-400 hover:text-surface-300 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
        )}
        <span className="font-medium">
          {actionCount} action{actionCount !== 1 ? "s" : ""}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-1 pl-2.5 border-l border-surface-700/20 space-y-px max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
              {actions.map((action) => {
                const Icon = getActionIcon(action.type);
                const isInProgress = action.status === ActionLogStatus.STARTED;
                const isFailed = action.status === ActionLogStatus.FAILED;
                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-1.5 py-0.5 text-[11px]"
                  >
                    {isInProgress ? (
                      <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    ) : (
                      <Icon
                        className="w-3 h-3 text-surface-500 flex-shrink-0"
                      />
                    )}
                    <span
                      className={cn(
                        "truncate",
                        isFailed && "text-red-300",
                        isInProgress && "text-surface-300",
                        !isFailed && !isInProgress && "text-surface-500",
                      )}
                    >
                      {getActionLabel(action)}
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
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
