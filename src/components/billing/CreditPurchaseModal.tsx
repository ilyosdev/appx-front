import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { paymentsApi, CREDIT_PACKS, PLAN_FEATURES } from '@/lib';
import type { PlanType } from '@/lib';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  currentBalance: number;
}

export function CreditPurchaseModal({
  isOpen,
  onClose,
  currentPlan,
  currentBalance,
}: CreditPurchaseModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const canPurchase = PLAN_FEATURES[currentPlan].canPurchaseCredits;

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    try {
      const response = await paymentsApi.purchaseCredits(packId);
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create credit purchase:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-surface-900 rounded-2xl border border-surface-700/50 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-surface-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/20">
                      <Coins className="w-5 h-5 text-primary-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Buy Credits</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-surface-400 text-sm">
                  Current balance: <span className="text-white font-semibold">{currentBalance} credits</span>
                </p>
              </div>

              <div className="p-6">
                {!canPurchase ? (
                  <div className="text-center py-4">
                    <p className="text-surface-400 mb-4">
                      Credit pack purchases are available for Standard and Pro subscribers.
                    </p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Upgrade to unlock
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {CREDIT_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => handlePurchase(pack.id)}
                        disabled={loading !== null}
                        className={cn(
                          'w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between',
                          pack.badge
                            ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50'
                            : 'bg-surface-800/50 border-surface-700/50 hover:border-surface-600'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {pack.credits.toLocaleString()} Credits
                            </span>
                            {pack.badge && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded">
                                {pack.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-surface-400">{pack.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-white">${pack.priceUsd}</span>
                          {loading === pack.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
