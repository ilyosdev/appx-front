import { Shield, Eye, Pencil, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollaboratorRole } from "@/stores/collaborationStore";

interface AccessBadgeProps {
  role: CollaboratorRole | "none";
  size?: "sm" | "md";
  className?: string;
}

const roleConfig: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bg: string }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  editor: {
    label: "Editor",
    icon: Pencil,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-surface-400",
    bg: "bg-surface-500/10 border-surface-500/20",
  },
  none: {
    label: "No Access",
    icon: Shield,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

export function AccessBadge({ role, size = "sm", className }: AccessBadgeProps) {
  const config = roleConfig[role] || roleConfig.none;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.bg,
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {config.label}
    </span>
  );
}
