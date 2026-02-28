import { useState } from "react";
import {
  Users,
  UserPlus,
  MoreVertical,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  Clock,
} from "lucide-react";
import { AccessBadge } from "./AccessBadge";
import type {
  Collaborator,
  ProjectOwner,
  OnlineUser,
  CollaboratorRole,
} from "@/stores/collaborationStore";

interface CollaboratorsListProps {
  owner: ProjectOwner | null;
  collaborators: Collaborator[];
  onlineUsers: OnlineUser[];
  myAccessLevel: CollaboratorRole | "none";
  onInvite: () => void;
  onRemove: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: "editor" | "viewer") => Promise<void>;
  isLoading?: boolean;
}

export function CollaboratorsList({
  owner,
  collaborators,
  onlineUsers,
  myAccessLevel,
  onInvite,
  onRemove,
  onUpdateRole,
  isLoading,
}: CollaboratorsListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManage = myAccessLevel === "owner";

  const isOnline = (userId: string) =>
    onlineUsers.some((u) => u.userId === userId);

  const handleRemove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await onRemove(userId);
    } finally {
      setActionLoading(null);
      setMenuOpenId(null);
    }
  };

  const handleRoleChange = async (
    userId: string,
    role: "editor" | "viewer",
  ) => {
    setActionLoading(userId);
    try {
      await onUpdateRole(userId, role);
    } finally {
      setActionLoading(null);
      setMenuOpenId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
      </div>
    );
  }

  const acceptedCollabs = collaborators.filter((c) => c.status === "accepted");
  const pendingCollabs = collaborators.filter((c) => c.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-surface-400" />
          <span className="text-sm font-medium text-surface-300">
            Collaborators ({1 + acceptedCollabs.length})
          </span>
          {onlineUsers.length > 0 && (
            <span className="text-xs text-emerald-400">
              {onlineUsers.length} online
            </span>
          )}
        </div>
        {(myAccessLevel === "owner" || myAccessLevel === "editor") && (
          <button
            onClick={onInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </button>
        )}
      </div>

      <div className="space-y-1">
        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-800/30">
            <div className="relative flex-shrink-0">
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.name || owner.email}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-medium">
                  {(owner.name || owner.email).charAt(0).toUpperCase()}
                </div>
              )}
              {isOnline(owner.id) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {owner.name || owner.email}
              </p>
              <p className="text-xs text-surface-500 truncate">{owner.email}</p>
            </div>
            <AccessBadge role="owner" />
          </div>
        )}

        {/* Accepted collaborators */}
        {acceptedCollabs.map((collab) => (
          <div
            key={collab.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-800/30 transition-colors group"
          >
            <div className="relative flex-shrink-0">
              {collab.avatarUrl ? (
                <img
                  src={collab.avatarUrl}
                  alt={collab.name || collab.email}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-medium">
                  {(collab.name || collab.email).charAt(0).toUpperCase()}
                </div>
              )}
              {collab.userId && isOnline(collab.userId) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {collab.name || collab.email}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {collab.email}
              </p>
            </div>
            <AccessBadge role={collab.role} />
            {canManage && collab.userId && (
              <div className="relative">
                <button
                  onClick={() =>
                    setMenuOpenId(
                      menuOpenId === collab.id ? null : collab.id,
                    )
                  }
                  className="p-1.5 rounded-md text-surface-500 hover:text-white hover:bg-surface-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  {actionLoading === collab.userId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreVertical className="w-4 h-4" />
                  )}
                </button>
                {menuOpenId === collab.id && (
                  <div className="absolute right-0 top-8 z-20 w-44 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl">
                    {collab.role !== "editor" && (
                      <button
                        onClick={() =>
                          handleRoleChange(collab.userId!, "editor")
                        }
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Make Editor
                      </button>
                    )}
                    {collab.role !== "viewer" && (
                      <button
                        onClick={() =>
                          handleRoleChange(collab.userId!, "viewer")
                        }
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Make Viewer
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(collab.userId!)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pending invites */}
        {pendingCollabs.length > 0 && (
          <>
            <div className="pt-2 pb-1">
              <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                Pending Invites
              </span>
            </div>
            {pendingCollabs.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-60 group"
              >
                <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-surface-400 text-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-300 truncate">
                    {collab.email}
                  </p>
                  <p className="text-xs text-surface-500">Invite sent</p>
                </div>
                <AccessBadge role={collab.role} />
                {canManage && (
                  <button
                    onClick={() => handleRemove(collab.userId || collab.id)}
                    className="p-1.5 rounded-md text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
