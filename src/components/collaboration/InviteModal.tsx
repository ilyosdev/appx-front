import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  X,
  Loader2,
  AlertTriangle,
  Check,
  Mail,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: "editor" | "viewer") => Promise<void>;
  projectName: string;
}

export function InviteModal({
  isOpen,
  onClose,
  onInvite,
  projectName,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleInvite = useCallback(async () => {
    if (!email.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onInvite(email.trim(), role);
      setSuccess(true);
      setEmail("");
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send invitation. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, role, isLoading, onInvite]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setEmail("");
    setError(null);
    setSuccess(false);
    onClose();
  }, [isLoading, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInvite();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 bg-surface-900 rounded-2xl border border-surface-700/50 shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-500/10">
                  <UserPlus className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Invite Collaborator
                  </h2>
                  <p className="text-sm text-surface-400">{projectName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="colleague@example.com"
                    disabled={isLoading}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl",
                      "bg-surface-800 border text-white placeholder-surface-500",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50",
                      "transition-all disabled:opacity-50",
                      "border-surface-700",
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300">
                  Role
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white text-sm hover:border-surface-600 transition-colors"
                  >
                    <span>
                      {role === "editor"
                        ? "Editor - Can edit screens and code"
                        : "Viewer - Can view only"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-surface-400" />
                  </button>
                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-surface-800 border border-surface-700 rounded-xl shadow-xl overflow-hidden">
                      <button
                        onClick={() => {
                          setRole("editor");
                          setShowRoleDropdown(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors",
                          role === "editor"
                            ? "bg-primary-500/10 text-primary-300"
                            : "text-surface-300 hover:bg-surface-700",
                        )}
                      >
                        <div className="flex-1 text-left">
                          <p className="font-medium">Editor</p>
                          <p className="text-xs text-surface-500">
                            Can edit screens, modify code, and chat
                          </p>
                        </div>
                        {role === "editor" && (
                          <Check className="w-4 h-4 text-primary-400" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRole("viewer");
                          setShowRoleDropdown(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors",
                          role === "viewer"
                            ? "bg-primary-500/10 text-primary-300"
                            : "text-surface-300 hover:bg-surface-700",
                        )}
                      >
                        <div className="flex-1 text-left">
                          <p className="font-medium">Viewer</p>
                          <p className="text-xs text-surface-500">
                            Can view screens and code, but not edit
                          </p>
                        </div>
                        {role === "viewer" && (
                          <Check className="w-4 h-4 text-primary-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Invitation sent successfully
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800 bg-surface-900/50">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={isLoading || !email.trim()}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "bg-primary-500 text-white shadow-lg shadow-primary-500/20",
                  "hover:bg-primary-400 hover:shadow-primary-500/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
