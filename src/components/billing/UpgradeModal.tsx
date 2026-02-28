import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Check, Loader2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentsApi, PLAN_FEATURES, CREDIT_PACKS } from "@/lib";
import type { PlanType } from "@/lib";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  limitType?: "credits" | "screens" | "projects" | "exports";
  limitMessage?: string;
  creditsNeeded?: number;
  creditsAvailable?: number;
  screensCurrent?: number;
  screensLimit?: number;
}

interface PlanCardProps {
  plan: PlanType;
  currentPlan: PlanType;
  isPopular?: boolean;
  onUpgrade: (plan: PlanType) => void;
  isLoading: boolean;
  loadingPlan: string | null;
}

function PlanCard({
  plan,
  currentPlan,
  isPopular,
  onUpgrade,
  isLoading,
  loadingPlan,
}: PlanCardProps) {
  const features = PLAN_FEATURES[plan];
  const isCurrentPlan = plan === currentPlan;

  const planFeatures = [
    `${features.credits} credits/month`,
    `Up to ${features.screens === Infinity ? "Unlimited" : features.screens} screens`,
    features.projects === Infinity
      ? "Unlimited projects"
      : `${features.projects} project${features.projects !== 1 ? "s" : ""}`,
    features.canPurchaseCredits ? "Purchase credits" : null,
    plan === "pro" ? "Priority support" : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-4 transition-all",
        isCurrentPlan
          ? "bg-primary-500/10 border-primary-500/50"
          : isPopular
            ? "bg-surface-800/80 border-surface-600"
            : "bg-surface-800/50 border-surface-700/50",
      )}
    >
      {isCurrentPlan && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-semibold rounded">
          Current
        </div>
      )}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-semibold rounded">
          Popular
        </div>
      )}

      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">{features.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">
            ${features.price}
          </span>
          <span className="text-surface-400 text-sm">/month</span>
        </div>
        <p className="text-xs text-surface-500 mt-1">
          {plan === "free" && "Try it out"}
          {plan === "starter" && "For designers & creators"}
          {plan === "pro" && "For power users"}
          {plan === "business" && "For teams at scale"}
        </p>
      </div>

      <ul className="space-y-1.5 mb-4 flex-1">
        {planFeatures.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="text-surface-300">{feature}</span>
          </li>
        ))}
        {!features.canPurchaseCredits && (
          <li className="flex items-center gap-2 text-xs">
            <X className="w-3.5 h-3.5 text-surface-600 flex-shrink-0" />
            <span className="text-surface-500">Purchase credits</span>
          </li>
        )}
      </ul>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={isCurrentPlan || isLoading}
        className={cn(
          "w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
          isCurrentPlan
            ? "bg-primary-500/20 text-primary-400 cursor-not-allowed"
            : isPopular
                ? "bg-surface-700 hover:bg-surface-600 text-white"
                : "bg-primary-500 hover:bg-primary-600 text-white",
        )}
      >
        {loadingPlan === plan ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isCurrentPlan ? (
          "Current Plan"
        ) : (
          <>
            Upgrade <span className="ml-1">→</span>
          </>
        )}
      </button>
    </div>
  );
}

interface CreditPackButtonProps {
  pack: (typeof CREDIT_PACKS)[0];
  onPurchase: (packId: string) => void;
  isLoading: boolean;
  loadingPack: string | null;
}

function CreditPackButton({
  pack,
  onPurchase,
  isLoading,
  loadingPack,
}: CreditPackButtonProps) {
  return (
    <button
      onClick={() => onPurchase(pack.id)}
      disabled={isLoading}
      className={cn(
        "flex flex-col items-center p-3 rounded-lg border transition-all",
        pack.badge
          ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
          : "bg-surface-800/50 border-surface-700/50 hover:border-surface-600",
      )}
    >
      {pack.badge && (
        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-semibold rounded mb-1">
          {pack.badge}
        </span>
      )}
      <span className="text-sm font-semibold text-white">{pack.credits}</span>
      <span className="text-[10px] text-surface-400">credits</span>
      <span className="text-base font-bold text-white mt-1">
        ${pack.priceUsd}
      </span>
      {loadingPack === pack.id && (
        <Loader2 className="w-3 h-3 animate-spin text-primary-400 mt-1" />
      )}
    </button>
  );
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  limitType,
  creditsNeeded,
  creditsAvailable,
  screensCurrent,
  screensLimit,
}: UpgradeModalProps) {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const isCreditsLimit = limitType === "credits";
  const isScreensLimit = limitType === "screens";
  const canPurchaseCredits = PLAN_FEATURES[currentPlan].canPurchaseCredits;

  const handleUpgrade = async (plan: PlanType) => {
    if (plan === "free" || plan === currentPlan) return;

    setLoadingPlan(plan);
    try {
      const response = await paymentsApi.createCheckout(
        plan as "starter" | "pro" | "business",
      );
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create checkout:", error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchaseCredits = async (packId: string) => {
    setLoadingPack(packId);
    try {
      const response = await paymentsApi.purchaseCredits(packId);
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to create credit purchase:", error);
    } finally {
      setLoadingPack(null);
    }
  };

  const getTitle = () => {
    if (isCreditsLimit) return "Insufficient Credits";
    if (isScreensLimit) return "Screen Limit Reached";
    if (limitType === "projects") return "Project Limit Reached";
    if (limitType === "exports") return "Export Limit Reached";
    return "Upgrade Your Plan";
  };

  const getSubtitle = () => {
    if (isCreditsLimit)
      return "You don't have enough credits to complete this action.";
    if (isScreensLimit)
      return "You've reached the maximum screens for your plan.";
    if (limitType === "projects")
      return "You've reached the maximum projects for your plan.";
    if (limitType === "exports")
      return "You've reached the export limit for your plan.";
    return "Unlock more features by upgrading your plan.";
  };

  const isLoading = loadingPlan !== null || loadingPack !== null;

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-surface-900 rounded-2xl border border-surface-700/50 shadow-2xl overflow-hidden">
              <div className="relative p-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center mb-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                      isCreditsLimit ? "bg-amber-500/20" : "bg-red-500/20",
                    )}
                  >
                    {isCreditsLimit ? (
                      <Crown className="w-7 h-7 text-amber-400" />
                    ) : (
                      <AlertTriangle className="w-7 h-7 text-red-400" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
                  <p className="text-surface-400 text-sm mt-1">
                    {getSubtitle()}
                  </p>
                </div>

                {isCreditsLimit && creditsNeeded !== undefined && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-600/10 border border-rose-500/30 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-400" />
                      <span className="text-sm text-rose-400 font-medium">
                        Credits needed: {creditsNeeded}
                      </span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      Your balance: {creditsAvailable ?? 0}
                    </span>
                  </div>
                )}

                {isScreensLimit &&
                  screensCurrent !== undefined &&
                  screensLimit !== undefined && (
                    <div className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-600/10 border border-rose-500/30 mb-4">
                      <span className="text-sm text-white font-medium">
                        Screens used: {screensCurrent}/{screensLimit}
                      </span>
                    </div>
                  )}
              </div>

              <div className="px-6 pb-4">
                <div className="grid grid-cols-3 gap-3">
                  <PlanCard
                    plan="starter"
                    currentPlan={currentPlan}
                    isPopular
                    onUpgrade={handleUpgrade}
                    isLoading={isLoading}
                    loadingPlan={loadingPlan}
                  />
                  <PlanCard
                    plan="pro"
                    currentPlan={currentPlan}
                    onUpgrade={handleUpgrade}
                    isLoading={isLoading}
                    loadingPlan={loadingPlan}
                  />
                  <PlanCard
                    plan="business"
                    currentPlan={currentPlan}
                    onUpgrade={handleUpgrade}
                    isLoading={isLoading}
                    loadingPlan={loadingPlan}
                  />
                </div>
              </div>

              {canPurchaseCredits && isCreditsLimit && (
                <div className="px-6 pb-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-surface-700" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-surface-900 px-3 text-xs text-surface-500 uppercase tracking-wider">
                        Or buy credits
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {CREDIT_PACKS.map((pack) => (
                      <CreditPackButton
                        key={pack.id}
                        pack={pack}
                        onPurchase={handlePurchaseCredits}
                        isLoading={isLoading}
                        loadingPack={loadingPack}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate("/pricing");
                  }}
                  className="w-full text-center text-sm text-surface-400 hover:text-white transition-colors"
                >
                  View full pricing details
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
