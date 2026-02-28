import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationItem } from "@/types/canvas";

interface RecommendationCardsProps {
  recommendations: {
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  };
  onGenerate: (screenIds: string[]) => void;
  onDismiss: (screenIds: string[]) => void;
}

export function RecommendationCards({
  recommendations,
  onGenerate,
  onDismiss,
}: RecommendationCardsProps) {
  // Flatten recommendations for display, essential first
  const allRecommendations = [
    ...recommendations.essential,
    ...recommendations.optional,
  ];
  // Pre-select essential recommendations
  const [selectedIds, setSelectedIds] = useState<string[]>(
    recommendations.essential.map((r) => r.id),
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const isEssential = (id: string) =>
    recommendations.essential.some((r) => r.id === id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-surface-800 border border-surface-700">
        <Bot className="w-3.5 h-3.5 text-surface-400" />
      </div>
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div className="px-3 py-2 rounded-xl text-sm bg-surface-800/80 text-surface-200 border border-surface-700/50 rounded-tl-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            <span className="font-medium">Recommended Screens</span>
          </div>
          <p className="text-xs text-surface-400 mb-3">
            Based on your project, here are some screens you might want to add:
          </p>
          <div className="space-y-2">
            {allRecommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => toggleSelection(rec.id)}
                className={cn(
                  "p-2 rounded-lg border cursor-pointer transition-all",
                  selectedIds.includes(rec.id)
                    ? "bg-primary-500/20 border-primary-500/50"
                    : "bg-surface-900/50 border-surface-700 hover:border-surface-600",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex-shrink-0 mt-0.5",
                      selectedIds.includes(rec.id)
                        ? "bg-primary-500 border-primary-500"
                        : "border-surface-600",
                    )}
                  >
                    {selectedIds.includes(rec.id) && (
                      <svg
                        className="w-full h-full text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M13 4L6 11L3 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-xs">
                        {rec.name}
                      </span>
                      {isEssential(rec.id) && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary-500/20 text-primary-400 rounded">
                          Essential
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-surface-700 text-surface-400 rounded">
                        {rec.type}
                      </span>
                    </div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {rec.description}
                    </div>
                    {rec.reasoning && (
                      <div className="text-xs text-surface-500 mt-1 italic">
                        {rec.reasoning}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onGenerate(selectedIds)}
              disabled={selectedIds.length === 0}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                selectedIds.length > 0
                  ? "bg-primary-500 text-white hover:bg-primary-400"
                  : "bg-surface-700 text-surface-500 cursor-not-allowed",
              )}
            >
              Generate Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => onDismiss(allRecommendations.map((r) => r.id))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-700 text-surface-300 hover:bg-surface-600 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
