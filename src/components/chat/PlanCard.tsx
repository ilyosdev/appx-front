import { useState } from "react";
import { Play, Loader2, Send, FileText, FilePlus, FileMinus, FileEdit, Check, ChevronDown, ChevronUp } from "lucide-react";
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

/** Parse "Theme: Dark, Navigation: Tab Bar" style summary into key-value pairs */
function parseSummaryChips(summary: string): Record<string, string> | null {
  const result: Record<string, string> = {};
  const knownKeys = ["theme", "navigation", "nav", "mode", "style", "color scheme", "layout"];
  const lines = summary.split(/[,\n]+/);

  let matched = 0;
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const val = line.slice(colonIdx + 1).trim();
    if (knownKeys.includes(key) && val) {
      // Normalize key display
      const displayKey = key === "nav" ? "navigation" : key === "color scheme" ? "theme" : key;
      result[displayKey] = val;
      matched++;
    }
  }

  return matched > 0 ? result : null;
}

export function PlanCard({
  understanding,
  steps,
  summary,
  version,
  planId,
  onRefinePlan,
  onConfirmPlan,
  isPlanImplementing,
  isImplemented,
}: PlanCardProps) {
  const [refinementInput, setRefinementInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isImplemented);

  const handleRefinementSubmit = () => {
    if (!refinementInput.trim() || !onRefinePlan) return;
    setIsSubmitting(true);
    onRefinePlan(planId, refinementInput.trim());
    setRefinementInput("");
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

  // --- Data extraction ---

  // App name: first line of understanding, fallback to first step title
  const understandingLines = (understanding ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const appName = understandingLines[0] || steps[0]?.title || "App Plan";

  // Tagline: second line of understanding, fallback to summary
  const tagline = understandingLines[1] || (summary && !summary.includes(":") ? summary : null) || null;

  // Metadata chips from summary
  const chips = summary ? parseSummaryChips(summary) : null;
  // If summary doesn't parse into chips, show it as fallback text (only if no tagline already set from understanding)
  const summaryFallback = !chips && summary && understandingLines.length < 2 ? summary : null;

  // Separate create steps (screen rows) from modify/delete steps (accordion)
  const createSteps = steps.filter((s) => s.action === "create");
  const otherSteps = steps.filter((s) => s.action !== "create");

  return (
    <div className="bg-surface-900 rounded-xl overflow-hidden border border-surface-800">
      {/* Header: app name + tagline */}
      <div className="px-4 pt-3.5 pb-3 border-b border-surface-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-white leading-tight">{appName}</h3>
            {(tagline || summaryFallback) && (
              <p className="text-[11px] text-surface-400 mt-1 italic leading-relaxed">
                {tagline || summaryFallback}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-surface-500 font-medium">v{version}</span>
            {isImplemented && (
              <span className="text-[10px] text-emerald-400 font-medium">Implemented</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Metadata chips */}
        {chips && Object.keys(chips).length > 0 && (
          <div className="flex gap-2">
            {Object.entries(chips).map(([key, value]) => (
              <div key={key} className="bg-surface-950 rounded-lg px-3 py-2 flex-1 min-w-0">
                <div className="text-[8px] text-surface-500 uppercase tracking-wider font-semibold">
                  {key}
                </div>
                <div className="text-xs text-surface-200 mt-1 truncate">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Screen rows */}
        {createSteps.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] text-surface-500 uppercase tracking-wider font-semibold mb-1.5">
              Screens ({createSteps.length})
            </div>
            {createSteps.map((step) => (
              <div
                key={step.id}
                className="bg-surface-950 rounded-lg px-3 py-2.5 flex justify-between items-center"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <span className="text-xs text-white font-medium">{step.title}</span>
                  {step.description && (
                    <span className="text-[10px] text-surface-500 ml-2 leading-relaxed">
                      {step.description}
                    </span>
                  )}
                </div>
                {isImplemented && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accordion: View full plan */}
      <div className="border-t border-surface-800">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          View full plan
        </button>

        {isExpanded && (
          <div className="px-4 pb-3 space-y-1.5">
            {steps.map((step) => {
              const badge = ACTION_BADGE[step.action] || ACTION_BADGE.modify;
              const BadgeIcon = badge.icon;
              return (
                <div key={step.id} className="flex items-start gap-2 py-1">
                  <span className="flex-shrink-0 w-5 h-5 rounded-md bg-surface-800 flex items-center justify-center text-[10px] font-bold text-surface-400 mt-0.5">
                    {step.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-surface-200">{step.title}</span>
                      <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded", badge.className)}>
                        <BadgeIcon className="w-2.5 h-2.5" />
                        {badge.label}
                      </span>
                    </div>
                    {step.files.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {step.files.map((file) => (
                          <span
                            key={file}
                            className="inline-flex items-center gap-0.5 text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded font-mono"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            {file}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-surface-400 leading-relaxed mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {otherSteps.length === 0 && createSteps.length === 0 && (
              <p className="text-xs text-surface-500 italic">No steps defined.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions — only show if not implemented */}
      {!isImplemented && (
        <div className="px-4 py-3 border-t border-surface-800 space-y-2">
          {onRefinePlan && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Refine: e.g. 'Make it 3 tabs instead of 4'"
                disabled={isSubmitting || isPlanImplementing}
                className="flex-1 bg-surface-950 border border-surface-700/50 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 disabled:opacity-50"
              />
              <button
                onClick={handleRefinementSubmit}
                disabled={!refinementInput.trim() || isSubmitting || isPlanImplementing}
                className="flex-shrink-0 p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
