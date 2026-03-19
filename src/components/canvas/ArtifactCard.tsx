import { FilePlus, FileEdit, Code2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtifactFile {
  path: string;
  action: "created" | "modified";
}

interface ArtifactCardProps {
  title: string;
  files: ArtifactFile[];
  summary?: string;
  scopeLabel?: string;
  validation?: {
    passed: number;
    failed: number;
    skipped: number;
  };
  onViewCode?: () => void;
  onRestore?: () => void;
}

export function ArtifactCard({
  title,
  files,
  summary,
  scopeLabel,
  validation,
  onViewCode,
  onRestore,
}: ArtifactCardProps) {
  const createdCount = files.filter((f) => f.action === "created").length;
  const modifiedCount = files.filter((f) => f.action === "modified").length;

  return (
    <div className="ml-9 my-1.5 rounded-lg border border-surface-700/50 bg-surface-800/60 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-surface-700/30">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-surface-200">{title}</h4>
          {scopeLabel && (
            <span className="rounded-full bg-primary-500/10 px-1.5 py-0.5 text-[9px] font-medium text-primary-300">
              {scopeLabel}
            </span>
          )}
        </div>
        <p className="text-[10px] text-surface-500 mt-0.5">
          {createdCount > 0 && `${createdCount} created`}
          {createdCount > 0 && modifiedCount > 0 && " · "}
          {modifiedCount > 0 && `${modifiedCount} modified`}
        </p>
        {summary && (
          <p className="mt-1 text-[10px] text-surface-400 leading-relaxed">
            {summary}
          </p>
        )}
        {validation && (
          <p className="mt-1 text-[10px] text-surface-500">
            Validation: {validation.passed} passed
            {validation.failed > 0 && ` · ${validation.failed} failed`}
            {validation.skipped > 0 && ` · ${validation.skipped} skipped`}
          </p>
        )}
      </div>

      {/* File list */}
      <div className="px-2 py-1.5 max-h-32 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] rounded"
          >
            {file.action === "created" ? (
              <FilePlus className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <FileEdit className="w-3 h-3 text-amber-400 flex-shrink-0" />
            )}
            <span
              className={cn(
                "truncate",
                file.action === "created" ? "text-green-300" : "text-amber-300",
              )}
            >
              {file.path.split("/").pop()}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {(onViewCode || onRestore) && (
        <div className="px-2 py-1.5 border-t border-surface-700/30 flex items-center gap-2">
          {onViewCode && (
            <button
              onClick={onViewCode}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
            >
              <Code2 className="w-3 h-3" />
              View Code
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-surface-400 hover:bg-surface-700/50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
