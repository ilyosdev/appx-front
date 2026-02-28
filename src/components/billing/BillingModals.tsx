import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useBillingStore } from "@/stores/billingStore";
import { UpgradeModal } from "./UpgradeModal";
import { CreditPurchaseModal } from "./CreditPurchaseModal";
import { setBillingErrorHandler, clearBillingErrorHandler } from "@/lib";
import type { PlanType } from "@/lib";

/**
 * Global billing modals component.
 * Renders upgrade and credit purchase modals based on billing store state.
 * Should be placed at the app root level.
 */
export function BillingModals() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    showUpgradeModal,
    showCreditModal,
    upgradeLimitType,
    upgradeLimitMessage,
    creditsNeeded,
    creditsAvailable,
    screensCurrent,
    screensLimit,
    closeUpgradeModal,
    closeCreditModal,
    setUserPlan,
    handleBillingError,
    currentPlan: storedPlan,
  } = useBillingStore();

  useEffect(() => {
    setBillingErrorHandler((errorCode, message, errorData) => {
      handleBillingError(errorCode, message, storedPlan, errorData);
    });

    return () => {
      clearBillingErrorHandler();
    };
  }, [handleBillingError, storedPlan]);

  // Sync user plan with billing store when user changes
  useEffect(() => {
    if (user) {
      const plan = (user.plan as PlanType) || "free";
      const credits = parseFloat(user.creditsRemaining || "0");
      setUserPlan(plan, credits);
    }
  }, [user, setUserPlan]);

  // Don't render modals if user is not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const userPlan = (user.plan as PlanType) || "free";
  const creditsBalance = parseFloat(user.creditsRemaining || "0");

  return (
    <>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradeModal}
        currentPlan={userPlan}
        limitType={upgradeLimitType}
        limitMessage={upgradeLimitMessage}
        creditsNeeded={creditsNeeded}
        creditsAvailable={creditsAvailable}
        screensCurrent={screensCurrent}
        screensLimit={screensLimit}
      />
      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={closeCreditModal}
        currentPlan={userPlan}
        currentBalance={creditsBalance}
      />
    </>
  );
}
