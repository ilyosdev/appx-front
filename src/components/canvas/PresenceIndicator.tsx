import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OnlineUser } from "@/stores/collaborationStore";

interface PresenceIndicatorProps {
  onlineUsers: OnlineUser[];
  maxAvatars?: number;
  className?: string;
}

/** Color palette for avatar backgrounds when no image is available. */
const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-violet-500/20 text-violet-400",
  "bg-rose-500/20 text-rose-400",
  "bg-amber-500/20 text-amber-400",
  "bg-cyan-500/20 text-cyan-400",
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(user: OnlineUser): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  }
  return user.email.charAt(0).toUpperCase();
}

export function PresenceIndicator({
  onlineUsers,
  maxAvatars = 5,
  className,
}: PresenceIndicatorProps) {
  const visible = useMemo(
    () => onlineUsers.slice(0, maxAvatars),
    [onlineUsers, maxAvatars],
  );
  const overflow = onlineUsers.length - maxAvatars;

  if (onlineUsers.length === 0) return null;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center -space-x-2">
        <AnimatePresence mode="popLayout">
          {visible.map((user) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, scale: 0.5, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative group"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full border-2 border-surface-950 flex items-center justify-center text-xs font-medium cursor-default",
                  getColorForUser(user.userId),
                )}
              >
                {getInitials(user)}
              </div>

              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-950" />

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <p className="text-xs font-medium text-white">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-surface-400">Online</p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="w-2 h-2 bg-surface-800 border-r border-b border-surface-700 rotate-45" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {overflow > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-7 h-7 rounded-full border-2 border-surface-950 bg-surface-700 flex items-center justify-center text-xs font-medium text-surface-300 cursor-default"
          >
            +{overflow}
          </motion.div>
        )}
      </div>
    </div>
  );
}
