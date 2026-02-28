import { create } from "zustand";
import type { PlanType } from "@/lib";

type LimitType = "credits" | "screens" | "projects" | "exports";

interface BillingState {
  // Upgrade modal state
  showUpgradeModal: boolean;
  upgradeLimitType: LimitType | undefined;
  upgradeLimitMessage: string | undefined;

  // Credit purchase modal state
  showCreditModal: boolean;

  // User plan info
  currentPlan: PlanType;
  creditsBalance: number;

  // Credits/limits context for modal display
  creditsNeeded: number | undefined;
  creditsAvailable: number | undefined;
  screensCurrent: number | undefined;
  screensLimit: number | undefined;

  // Actions
  openUpgradeModal: (
    limitType?: LimitType,
    message?: string,
    context?: {
      creditsNeeded?: number;
      creditsAvailable?: number;
      screensCurrent?: number;
      screensLimit?: number;
    },
  ) => void;
  closeUpgradeModal: () => void;
  openCreditModal: () => void;
  closeCreditModal: () => void;
  setUserPlan: (plan: PlanType, credits: number) => void;

  // Handle API error - determines which modal to show
  handleBillingError: (
    errorCode: string,
    message: string,
    currentPlan: PlanType,
    errorData?: {
      required?: number;
      available?: number;
      current?: number;
      limit?: number;
    },
  ) => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  showUpgradeModal: false,
  upgradeLimitType: undefined,
  upgradeLimitMessage: undefined,
  showCreditModal: false,
  currentPlan: "free",
  creditsBalance: 0,
  creditsNeeded: undefined,
  creditsAvailable: undefined,
  screensCurrent: undefined,
  screensLimit: undefined,

  openUpgradeModal: (limitType, message, context) =>
    set({
      showUpgradeModal: true,
      upgradeLimitType: limitType,
      upgradeLimitMessage: message,
      creditsNeeded: context?.creditsNeeded,
      creditsAvailable: context?.creditsAvailable,
      screensCurrent: context?.screensCurrent,
      screensLimit: context?.screensLimit,
    }),

  closeUpgradeModal: () =>
    set({
      showUpgradeModal: false,
      upgradeLimitType: undefined,
      upgradeLimitMessage: undefined,
      creditsNeeded: undefined,
      creditsAvailable: undefined,
      screensCurrent: undefined,
      screensLimit: undefined,
    }),

  openCreditModal: () => set({ showCreditModal: true }),

  closeCreditModal: () => set({ showCreditModal: false }),

  setUserPlan: (plan, credits) =>
    set({ currentPlan: plan, creditsBalance: credits }),

  handleBillingError: (errorCode, message, _currentPlan, errorData) => {
    switch (errorCode) {
      case "INSUFFICIENT_CREDITS":
        set({
          showUpgradeModal: true,
          upgradeLimitType: "credits",
          upgradeLimitMessage:
            message ||
            "You've run out of credits. Upgrade or purchase credits to continue.",
          creditsNeeded: errorData?.required,
          creditsAvailable: errorData?.available,
        });
        break;

      case "DAILY_LIMIT_EXCEEDED":
        set({
          showUpgradeModal: true,
          upgradeLimitType: "credits",
          upgradeLimitMessage:
            message ||
            "You've reached your daily generation limit on the free plan. Upgrade for unlimited generations.",
        });
        break;

      case "SCREEN_LIMIT_EXCEEDED":
      case "LIMIT_EXCEEDED":
        set({
          showUpgradeModal: true,
          upgradeLimitType: "screens",
          upgradeLimitMessage:
            message ||
            "You've reached your screen limit. Upgrade to create more screens.",
          screensCurrent: errorData?.current,
          screensLimit: errorData?.limit,
        });
        break;

      case "PROJECT_LIMIT_EXCEEDED":
        set({
          showUpgradeModal: true,
          upgradeLimitType: "projects",
          upgradeLimitMessage:
            message ||
            "You've reached your project limit. Upgrade to create more projects.",
        });
        break;

      case "EXPORT_LIMIT_EXCEEDED":
        set({
          showUpgradeModal: true,
          upgradeLimitType: "exports",
          upgradeLimitMessage:
            message ||
            "You've reached your export limit. Upgrade for unlimited exports.",
        });
        break;

      default:
        // Generic limit exceeded
        set({
          showUpgradeModal: true,
          upgradeLimitType: undefined,
          upgradeLimitMessage:
            message || "You've reached a plan limit. Upgrade to continue.",
        });
    }
  },
}));
