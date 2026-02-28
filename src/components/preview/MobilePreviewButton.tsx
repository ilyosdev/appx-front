import { Smartphone, Loader2 } from "lucide-react";
import { useExpoPreviewStore } from "@/stores/expoPreviewStore";
import { clsx } from "clsx";

interface MobilePreviewButtonProps {
  className?: string;
}

export function MobilePreviewButton({ className }: MobilePreviewButtonProps) {
  const { currentStatus, openModal } = useExpoPreviewStore();

  const isCreating = currentStatus === "creating";
  const isActive =
    currentStatus === "active" || currentStatus === "updating";

  return (
    <button
      onClick={openModal}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
        isActive
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
          : "text-surface-400 hover:text-white hover:bg-surface-800",
        className,
      )}
    >
      {isCreating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <div className="relative">
          <Smartphone className="w-4 h-4" />
          {isActive && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      )}
      <span className="text-sm">
        {isCreating ? "Starting..." : isActive ? "Live" : "Preview"}
      </span>
    </button>
  );
}
