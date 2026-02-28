import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings, Crown, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return null;
  }

  const userName = user.name || 'User';
  const initials = userName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-800/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-sm font-semibold text-white">
          {initials}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-surface-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-64 py-2 rounded-2xl bg-surface-800 border border-surface-700 shadow-2xl shadow-black/30 z-50"
            >
              <div className="px-4 py-3 border-b border-surface-700">
                <p className="font-medium text-white">{userName}</p>
                <p className="text-sm text-surface-400">{user.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  Upgrade to Pro
                </button>
              </div>

              <div className="border-t border-surface-700 pt-1">
                <button
                  onClick={async () => {
                    await logout();
                    // Force full page reload to clear all cached state
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
