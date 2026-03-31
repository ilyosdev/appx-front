import { useState } from "react";
import { Check, Undo2, Loader2 } from "lucide-react";

interface EditSummaryCardProps {
  changes: string[];
  screenId?: string;
  previousVersionId?: string;
  onUndo?: () => void;
  isUndone?: boolean;
}

export function EditSummaryCard({ changes, previousVersionId, onUndo, isUndone }: EditSummaryCardProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  if (!changes || changes.length === 0) return null;

  const canUndo = !!previousVersionId && !!onUndo && !isUndone;

  const handleUndo = async () => {
    if (!onUndo || isUndoing) return;
    setIsUndoing(true);
    try {
      onUndo();
    } finally {
      // The parent will set isUndone via state update from socket event
      // But clear the loading state after a short delay as fallback
      setTimeout(() => setIsUndoing(false), 3000);
    }
  };

  if (isUndone) {
    return (
      <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-yellow-300">
          <Undo2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Changes reverted</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          {changes.map((change, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-surface-200">
              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
              <span>{change}</span>
            </div>
          ))}
        </div>
        {canUndo && (
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                       text-surface-300 hover:text-surface-100 hover:bg-surface-700/50
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex-shrink-0"
            title="Undo this edit"
          >
            {isUndoing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Undo2 className="w-3 h-3" />
            )}
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
