import { useState, useRef, useEffect } from "react";
import {
  Building2,
  ChevronDown,
  Plus,
  User,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@/stores/collaborationStore";

interface TeamSwitcherProps {
  teams: Team[];
  activeTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
  onCreateTeam: (name: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function TeamSwitcher({
  teams,
  activeTeamId,
  onSelectTeam,
  onCreateTeam,
  isLoading,
  className,
}: TeamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!newTeamName.trim() || createLoading) return;
    setCreateLoading(true);
    try {
      await onCreateTeam(newTeamName.trim());
      setNewTeamName("");
      setIsCreating(false);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
          "bg-surface-800 border border-surface-700 text-surface-300",
          "hover:border-surface-600 hover:text-white",
          "disabled:opacity-50",
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : activeTeam ? (
          <>
            <Building2 className="w-4 h-4 text-primary-400" />
            <span className="max-w-[120px] truncate">{activeTeam.name}</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4" />
            <span>Personal</span>
          </>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-surface-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-30 w-64 bg-surface-800 border border-surface-700 rounded-xl shadow-xl overflow-hidden">
          {/* Personal workspace */}
          <button
            onClick={() => {
              onSelectTeam(null);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors",
              !activeTeamId
                ? "bg-primary-500/10 text-primary-300"
                : "text-surface-300 hover:bg-surface-700",
            )}
          >
            <User className="w-4 h-4" />
            <span className="flex-1 text-left">Personal</span>
            {!activeTeamId && <Check className="w-4 h-4 text-primary-400" />}
          </button>

          {teams.length > 0 && (
            <div className="border-t border-surface-700">
              <p className="px-4 py-2 text-xs font-medium text-surface-500 uppercase tracking-wider">
                Teams
              </p>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    onSelectTeam(team.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors",
                    activeTeamId === team.id
                      ? "bg-primary-500/10 text-primary-300"
                      : "text-surface-300 hover:bg-surface-700",
                  )}
                >
                  {team.avatarUrl ? (
                    <img
                      src={team.avatarUrl}
                      alt={team.name}
                      className="w-5 h-5 rounded-md object-cover"
                    />
                  ) : (
                    <Building2 className="w-4 h-4 text-primary-400" />
                  )}
                  <span className="flex-1 text-left truncate">
                    {team.name}
                  </span>
                  {activeTeamId === team.id && (
                    <Check className="w-4 h-4 text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-surface-700">
            {isCreating ? (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Team name"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-white text-sm placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newTeamName.trim() || createLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white disabled:opacity-50 transition-colors"
                  >
                    {createLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewTeamName("");
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-surface-400 hover:bg-surface-700 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Team
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
