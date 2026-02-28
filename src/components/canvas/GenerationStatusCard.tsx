import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationStatus, RecommendationItem } from "@/types/canvas";

interface GenerationStatusCardProps {
  activeProgress: {
    overallProgress: number;
    currentScreen?: { name: string };
  } | null;
  generationStatus: GenerationStatus;
  onGenerateRecommended?: (screenIds: string[]) => void;
  onDismissRecommendations?: (screenIds: string[]) => void;
}

export function GenerationStatusCard({
  activeProgress,
  generationStatus,
  onGenerateRecommended,
  onDismissRecommendations,
}: GenerationStatusCardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isGenerating = activeProgress && activeProgress.overallProgress < 100;
  const hasRecommendations =
    generationStatus.pendingRecommendations &&
    (generationStatus.pendingRecommendations.essential.length > 0 ||
      generationStatus.pendingRecommendations.optional.length > 0);

  // Initialize selected IDs when recommendations change
  useEffect(() => {
    if (generationStatus.pendingRecommendations) {
      setSelectedIds(
        generationStatus.pendingRecommendations.essential.map((r) => r.id),
      );
    }
  }, [generationStatus.pendingRecommendations]);

  // Only show when generating or has recommendations
  if (!isGenerating && !hasRecommendations) {
    return null;
  }

  const allRecommendations: RecommendationItem[] = hasRecommendations
    ? [
        ...generationStatus.pendingRecommendations!.essential,
        ...generationStatus.pendingRecommendations!.optional,
      ]
    : [];

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleGenerate = () => {
    if (selectedIds.length > 0) {
      onGenerateRecommended?.(selectedIds);
    }
  };

  const handleDismiss = () => {
    onDismissRecommendations?.(allRecommendations.map((r) => r.id));
  };

  return (
    <div className="flex-shrink-0 px-3 py-2 border-t border-surface-700/50">
      {isGenerating && activeProgress && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white truncate">
                {activeProgress.currentScreen?.name || "Generating..."}
              </span>
              <span className="text-xs text-surface-400 ml-2">
                {Math.round(activeProgress.overallProgress)}%
              </span>
            </div>
            <div className="w-full bg-surface-700 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${activeProgress.overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {hasRecommendations && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">
              {allRecommendations.length} screen suggestions
            </span>
            <button
              onClick={handleDismiss}
              className="text-xs text-surface-500 hover:text-surface-300"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allRecommendations.map((rec) => (
              <button
                key={rec.id}
                onClick={() => toggleSelection(rec.id)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-all truncate max-w-[140px]",
                  selectedIds.includes(rec.id)
                    ? "bg-primary-500/30 text-primary-300 border border-primary-500/50"
                    : "bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600",
                )}
                title={rec.name}
              >
                {selectedIds.includes(rec.id) && (
                  <Check className="w-3 h-3 inline mr-1" />
                )}
                {rec.name.length > 18
                  ? rec.name.slice(0, 18) + "..."
                  : rec.name}
              </button>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleGenerate}
              className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-400 transition-all"
            >
              Generate {selectedIds.length} screen
              {selectedIds.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
