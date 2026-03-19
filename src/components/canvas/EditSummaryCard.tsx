import { Check } from "lucide-react";

interface EditSummaryCardProps {
  changes: string[];
}

export function EditSummaryCard({ changes }: EditSummaryCardProps) {
  if (!changes || changes.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5">
      <div className="flex flex-col gap-1.5">
        {changes.map((change, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-surface-200">
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
            <span>{change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
