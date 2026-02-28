import { Link } from "react-router-dom";
import { Sparkles, Coins } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useBillingStore } from "../../stores/billingStore";
import { UserDropdown } from "./UserDropdown";
import { PLAN_FEATURES } from "../../lib/payments";
import type { PlanType } from "../../lib/payments";

function CreditBadge() {
  const { user } = useAuthStore();
  const { openUpgradeModal, openCreditModal } = useBillingStore();

  if (!user) return null;

  const credits = parseFloat(user.creditsRemaining || "0");
  const userPlan = (user.plan as PlanType) || "free";
  const canPurchaseCredits = PLAN_FEATURES[userPlan].canPurchaseCredits;

  const handleClick = () => {
    if (canPurchaseCredits) {
      openCreditModal();
    } else {
      openUpgradeModal(
        "credits",
        "Upgrade to get more credits and unlock credit purchases.",
      );
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 hover:bg-surface-800 hover:border-surface-600 transition-colors"
    >
      <Coins className="w-4 h-4 text-amber-400" />
      <span className="text-sm font-medium text-white">{credits} credits</span>
    </button>
  );
}

export function Header() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-white"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          AppX
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-surface-400 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <CreditBadge />
              <UserDropdown />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-surface-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-400 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
