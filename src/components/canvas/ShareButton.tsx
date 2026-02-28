import { useState, useRef, useEffect } from "react";
import { Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Collaborator, ProjectOwner } from "@/stores/collaborationStore";

interface ShareButtonProps {
  collaboratorCount: number;
  collaborators: Collaborator[];
  owner: ProjectOwner | null;
  onInvite: () => void;
  className?: string;
}

export function ShareButton({
  collaboratorCount,
  collaborators,
  owner,
  onInvite,
  className,
}: ShareButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const acceptedCollabs = collaborators.filter((c) => c.status === "accepted");

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium"
      >
        <Users className="w-4 h-4" />
        Share
        {collaboratorCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
            {collaboratorCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-surface-900 border border-surface-700/50 rounded-xl shadow-2xl shadow-black/40 py-2 z-50">
          {/* Header */}
          <div className="px-4 pb-2 mb-1 border-b border-surface-800/50">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">
              People with access
            </p>
          </div>

          {/* Owner */}
          {owner && (
            <div className="flex items-center gap-3 px-4 py-2">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.name || owner.email}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-medium flex-shrink-0">
                  {(owner.name || owner.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {owner.name || owner.email}
                </p>
              </div>
              <span className="text-xs text-amber-400 font-medium">Owner</span>
            </div>
          )}

          {/* Collaborators */}
          {acceptedCollabs.map((collab) => (
            <div key={collab.id} className="flex items-center gap-3 px-4 py-2">
              {collab.avatarUrl ? (
                <img
                  src={collab.avatarUrl}
                  alt={collab.name || collab.email}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-medium flex-shrink-0">
                  {(collab.name || collab.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {collab.name || collab.email}
                </p>
              </div>
              <span className="text-xs text-surface-400 capitalize">
                {collab.role}
              </span>
            </div>
          ))}

          {acceptedCollabs.length === 0 && !owner && (
            <div className="px-4 py-3 text-sm text-surface-500 text-center">
              No collaborators yet
            </div>
          )}

          {/* Invite button */}
          <div className="mt-1 pt-2 border-t border-surface-800/50 px-3">
            <button
              onClick={() => {
                onInvite();
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite people
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
