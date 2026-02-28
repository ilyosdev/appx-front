import { useState } from "react";
import { FileCode, ChevronDown, ChevronUp, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileChange {
  filePath: string;
  action: "created" | "modified" | "deleted";
  timestamp?: string;
}

interface FileChangeLogProps {
  changes: FileChange[];
  className?: string;
}

export function FileChangeLog({ changes, className }: FileChangeLogProps) {
  const [expanded, setExpanded] = useState(true);

  if (changes.length === 0) return null;

  return (
    <div className={cn("border-t border-surface-800/50", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-[10px] text-surface-400 hover:text-surface-300 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3 h-3" />
          <span className="font-medium">
            {changes.length} file{changes.length !== 1 ? "s" : ""} changed
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {changes.map((change) => (
            <div
              key={change.filePath}
              className="flex items-center gap-2 px-2 py-1 rounded text-[10px]"
            >
              {change.action === "created" ? (
                <Plus className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <Pencil className="w-3 h-3 text-amber-400 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "truncate font-mono",
                  change.action === "created"
                    ? "text-emerald-300"
                    : "text-amber-300",
                )}
              >
                {change.filePath}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
