import { useState } from "react";
import { ListChecks, Play, Loader2, Send, FileText, FilePlus, FileMinus, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanStep } from "@/stores/chatStore";

interface PlanCardProps {
  understanding?: string | null;
  steps: PlanStep[];
  summary?: string | null;
  version: number;
  planId: string;
  onRefinePlan?: (planId: string, feedback: string) => void;
  onConfirmPlan?: (planContent: string) => void;
  isPlanImplementing?: boolean;
  isImplemented?: boolean;
}

const ACTION_BADGE: Record<string, { label: string; className: string; icon: typeof FilePlus }> = {
  create: { label: "CREATE", className: "bg-green-500/20 text-green-400", icon: FilePlus },
  modify: { label: "MODIFY", className: "bg-amber-500/20 text-amber-400", icon: FileEdit },
  delete: { label: "DELETE", className: "bg-red-500/20 text-red-400", icon: FileMinus },
};

export function PlanCard({
  understanding,
  steps,
  summary: _summary,
  version,
  planId,
  onRefinePlan,
  onConfirmPlan,
  isPlanImplementing,
  isImplemented,
}: PlanCardProps) {
  const [refinementInput, setRefinementInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRefinementSubmit = () => {
    if (!refinementInput.trim() || !onRefinePlan) return;
    setIsSubmitting(true);
    onRefinePlan(planId, refinementInput.trim());
    setRefinementInput("");
    // isSubmitting will be reset when the new plan arrives (parent re-renders with new steps)
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRefinementSubmit();
    }
  };

  // Build plain text for implementation
  const planContentText = steps
    .map((s) => `${s.id}. ${s.title} [${s.action.toUpperCase()}]\n   Files: ${s.files.join(", ")}\n   ${s.description}`)
    .join("\n\n");

  return (
    <div className="rounded-xl border border-surface-700/50 bg-surface-800/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/30 bg-surface-800/40">
        <ListChecks className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs font-semibold text-primary-300">
          Plan v{version}
        </span>
        {isImplemented && (
          <span className="ml-auto text-[10px] text-green-400 font-medium">Implemented</span>
        )}
      </div>

      {/* Understanding */}
      {understanding && (
        <div className="px-3 py-2 border-b border-surface-700/20">
          <p className="text-xs text-surface-300 italic leading-relaxed">
            "{understanding}"
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="px-3 py-2 space-y-1.5">
        {steps.map((step) => {
          const badge = ACTION_BADGE[step.action] || ACTION_BADGE.modify;
          const BadgeIcon = badge.icon;
          return (
            <div
              key={step.id}
              className="flex items-start gap-2 py-1.5"
            >
              {/* Step number */}
              <span className="flex-shrink-0 w-5 h-5 rounded-md bg-surface-700/50 flex items-center justify-center text-[10px] font-bold text-surface-300 mt-0.5">
                {step.id}
              </span>

              <div className="flex-1 min-w-0">
                {/* Title + action badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-surface-200">
                    {step.title}
                  </span>
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded", badge.className)}>
                    <BadgeIcon className="w-2.5 h-2.5" />
                    {badge.label}
                  </span>
                </div>

                {/* File paths */}
                {step.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {step.files.map((file) => (
                      <span
                        key={file}
                        className="inline-flex items-center gap-0.5 text-[10px] text-surface-500 bg-surface-700/30 px-1.5 py-0.5 rounded font-mono"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {file}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <p className="text-xs text-surface-400 leading-relaxed mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions — only show if not implemented */}
      {!isImplemented && (
        <div className="px-3 py-2.5 border-t border-surface-700/30 space-y-2">
          {/* Inline refinement input */}
          {onRefinePlan && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Refine: e.g. 'Make it 3 tabs instead of 4'"
                disabled={isSubmitting || isPlanImplementing}
                className="flex-1 bg-surface-900/60 border border-surface-700/50 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 disabled:opacity-50"
              />
              <button
                onClick={handleRefinementSubmit}
                disabled={!refinementInput.trim() || isSubmitting || isPlanImplementing}
                className="flex-shrink-0 p-1.5 rounded-lg bg-surface-700/50 hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Implement button */}
          {onConfirmPlan && (
            <button
              onClick={() => onConfirmPlan(planContentText)}
              disabled={isPlanImplementing}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                         bg-primary-500 hover:bg-primary-400 text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlanImplementing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Implementing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Implement Plan
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
