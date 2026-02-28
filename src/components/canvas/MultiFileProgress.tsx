import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Clock, FileCode, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MultiFileState } from "@/hooks/useProjectSocket";

interface MultiFileProgressProps {
  multiFileState: MultiFileState;
}

function getFileIcon(filePath: string) {
  if (filePath.includes("/app/") || filePath.includes("/screen")) {
    return <FileCode className="w-3.5 h-3.5" />;
  }
  if (filePath.includes("/hook") || filePath.includes("/util") || filePath.includes("/lib")) {
    return <FileCode className="w-3.5 h-3.5" />;
  }
  return <FileCode className="w-3.5 h-3.5" />;
}

function getFileStatus(
  filePath: string,
  fileData: { content: string; isComplete: boolean } | undefined,
  currentFile: string | null
): "pending" | "generating" | "complete" {
  if (!fileData) return "pending";
  if (fileData.isComplete) return "complete";
  if (filePath === currentFile) return "generating";
  if (fileData.content.length > 0) return "generating";
  return "pending";
}

export function MultiFileProgress({ multiFileState }: MultiFileProgressProps) {
  const { isGenerating, files, currentFile, progress, error } = multiFileState;

  const fileList = useMemo(() => {
    return Array.from(files.entries()).map(([filePath, data]) => ({
      filePath,
      content: data.content,
      isComplete: data.isComplete,
      status: getFileStatus(filePath, data, currentFile),
    }));
  }, [files, currentFile]);

  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  if (files.size === 0 && !isGenerating) return null;

  return (
    <div className="border-t border-surface-800/50">
      {/* Progress header */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
            ) : error ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Check className="w-3.5 h-3.5 text-green-400" />
            )}
            <span className={cn(
              "text-xs font-medium",
              error ? "text-red-400" : isGenerating ? "text-surface-300" : "text-green-400"
            )}>
              {error
                ? "Generation failed"
                : isGenerating
                  ? `Generating files (${progress.completed}/${progress.total})`
                  : `All ${progress.total} files ready`
              }
            </span>
          </div>
          <span className="text-[10px] text-surface-500 tabular-nums">
            {progressPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              error ? "bg-red-500" : isGenerating ? "bg-primary-500" : "bg-green-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-xs text-red-400/80 leading-relaxed">
            {error}
          </p>
        )}
      </div>

      {/* File list */}
      <div className="px-3 pb-2.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
        <AnimatePresence mode="popLayout">
          {fileList.map((file, index) => (
            <motion.div
              key={file.filePath}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                file.status === "generating" && "bg-primary-500/5",
                file.status === "complete" && "bg-green-500/5",
              )}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {file.status === "complete" ? (
                  <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-green-400" />
                  </div>
                ) : file.status === "generating" ? (
                  <div className="w-4 h-4 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Loader2 className="w-2.5 h-2.5 text-primary-400 animate-spin" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-surface-700/50 flex items-center justify-center">
                    <Clock className="w-2.5 h-2.5 text-surface-500" />
                  </div>
                )}
              </div>

              {/* File icon */}
              <div className={cn(
                "flex-shrink-0",
                file.status === "complete" ? "text-green-400/70" :
                file.status === "generating" ? "text-primary-400/70" :
                "text-surface-500"
              )}>
                {getFileIcon(file.filePath)}
              </div>

              {/* File path */}
              <span className={cn(
                "truncate font-mono",
                file.status === "complete" ? "text-surface-300" :
                file.status === "generating" ? "text-white" :
                "text-surface-500"
              )}>
                {file.filePath}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
