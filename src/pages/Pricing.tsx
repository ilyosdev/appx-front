import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Crown,
  Zap,
  Users,
  Loader2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { hasActiveSubscription } from '@/lib/auth';
import { paymentsApi, PLAN_FEATURES, CREDIT_PACKS } from '@/lib';

type PlanKey = 'free' | 'starter' | 'pro' | 'business';

interface PlanCardProps {
  plan: PlanKey;
  currentPlan: PlanKey;
  isPopular?: boolean;
  onSelect: (plan: PlanKey) => void;
  isLoading: boolean;
}

function PlanCard({ plan, currentPlan, isPopular, onSelect, isLoading }: PlanCardProps) {
  const features = PLAN_FEATURES[plan];
  const isCurrentPlan = plan === currentPlan;

  const planIcons: Record<PlanKey, typeof Users> = {
    free: Users,
    starter: Zap,
    pro: Crown,
    business: Sparkles,
  };

  const Icon = planIcons[plan];

  const allFeatures = [
    { label: `${features.credits} credits/month`, included: true },
    { label: `Up to ${features.screens === Infinity ? 'Unlimited' : features.screens} screens`, included: true },
    { label: `${features.projects === Infinity ? 'Unlimited' : features.projects} project${features.projects !== 1 ? 's' : ''}`, included: true },
    { label: features.codeExports === Infinity ? 'Unlimited code exports' : `${features.codeExports} code exports`, included: true },
    { label: `${features.support} support`, included: true },
    { label: 'Purchase additional credits', included: features.canPurchaseCredits },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative rounded-2xl p-6 border transition-all',
        isPopular
          ? 'bg-gradient-to-b from-primary-500/20 to-primary-600/5 border-primary-500/50 shadow-xl shadow-primary-500/10'
          : 'bg-surface-800/50 border-surface-700/50 hover:border-surface-600'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
          Most Popular
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
          Current Plan
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'p-2 rounded-lg',
          isPopular ? 'bg-primary-500/20' : 'bg-surface-700/50'
        )}>
          <Icon className={cn('w-5 h-5', isPopular ? 'text-primary-400' : 'text-surface-400')} />
        </div>
        <h3 className="text-xl font-bold text-white">{features.name}</h3>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">${features.price}</span>
        <span className="text-surface-400">/month</span>
      </div>

      <p className="text-sm text-surface-400 mb-6">
        {plan === 'free' && 'Try it out before you commit'}
        {plan === 'starter' && 'For designers and solo creators'}
        {plan === 'pro' && 'For power users and growing teams'}
        {plan === 'business' && 'For teams and agencies at scale'}
      </p>

      <ul className="space-y-3 mb-6">
        {allFeatures.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            {feature.included ? (
              <Check className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-surface-600 shrink-0 mt-0.5" />
            )}
            <span className={cn(
              'text-sm',
              feature.included ? 'text-surface-300' : 'text-surface-500'
            )}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || isLoading}
        className={cn(
          'w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
          isCurrentPlan
            ? 'bg-surface-700/50 text-surface-400 cursor-not-allowed'
            : plan === 'free'
            ? 'bg-surface-700 hover:bg-surface-600 text-white'
            : isPopular
            ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25'
            : 'bg-surface-700 hover:bg-surface-600 text-white'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : plan === 'free' ? (
          'Get Started Free'
        ) : (
          `Get ${features.name}`
        )}
      </button>
    </motion.div>
  );
}

interface CreditPackCardProps {
  pack: typeof CREDIT_PACKS[0];
  canPurchase: boolean;
  onPurchase: (packId: string) => void;
  isLoading: boolean;
}

function CreditPackCard({ pack, canPurchase, onPurchase, isLoading }: CreditPackCardProps) {
  return (
    <div className={cn(
      'relative rounded-xl p-6 border transition-all text-center',
      pack.badge
        ? 'bg-gradient-to-b from-amber-500/10 to-amber-600/5 border-amber-500/30'
        : 'bg-surface-800/50 border-surface-700/50'
    )}>
      {pack.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full">
          {pack.badge}
        </div>
      )}

      <div className="text-2xl font-bold text-white mb-1">
        {pack.credits.toLocaleString()} Credits
      </div>
      <div className="text-3xl font-bold text-white mb-4">
        ${pack.priceUsd}
      </div>

      <button
        onClick={() => onPurchase(pack.id)}
        disabled={!canPurchase || isLoading}
        className={cn(
          'w-full py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2',
          canPurchase
            ? 'bg-surface-700 hover:bg-surface-600 text-white'
            : 'bg-surface-800 text-surface-500 cursor-not-allowed'
        )}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buy'}
      </button>
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout, refreshUser } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const currentPlan = (user?.plan as PlanKey) || 'free';
  const canPurchaseCredits = PLAN_FEATURES[currentPlan].canPurchaseCredits;
  const creditsBalance = parseFloat(user?.creditsRemaining || '0');
  const isCheckoutSuccess = searchParams.get('checkout') === 'success';
  const isRegistrationFlow = isAuthenticated && user?.plan === 'free' && !isCheckoutSuccess;

  const [checkoutTimedOut, setCheckoutTimedOut] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState<string | null>(null);

  // Handle return from Stripe checkout — poll for subscription activation
  useEffect(() => {
    if (!isCheckoutSuccess || !isAuthenticated) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~60 seconds

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          await paymentsApi.syncSubscription();
        } catch (err) {
          console.warn('sync-subscription failed, will retry:', err);
        }
        await refreshUser();
        const freshUser = useAuthStore.getState().user;
        if (freshUser && hasActiveSubscription(freshUser)) {
          const planName = PLAN_FEATURES[freshUser.plan as PlanKey]?.name || freshUser.plan;
          setActivatedPlan(planName ?? null);
          // Show the success screen for 2 seconds before redirecting
          await new Promise(r => setTimeout(r, 2000));
          if (!cancelled) {
            navigate('/dashboard', { replace: true });
          }
          return;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
      // Timed out — redirect to dashboard anyway (webhook may be delayed)
      if (!cancelled) {
        setCheckoutTimedOut(true);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [isCheckoutSuccess, isAuthenticated, refreshUser, navigate]);

  // Show processing screen while waiting for webhook
  if (isCheckoutSuccess && isAuthenticated) {
    if (activatedPlan) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're on the {activatedPlan} plan!</h2>
            <p className="text-surface-400">Redirecting to your dashboard...</p>
          </div>
        </div>
      );
    }

    if (checkoutTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-white mb-2">Payment received!</h2>
            <p className="text-surface-400 mb-6">
              Your subscription is being activated. It may take a moment to reflect in your account. If your plan hasn't updated within a few minutes, please contact support.
            </p>
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-surface-800 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Setting up your account...</h2>
          <p className="text-surface-400">This usually takes a few seconds.</p>
        </div>
      </div>
    );
  }

  const handleSelectPlan = async (plan: PlanKey) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    if (plan === currentPlan) return;

    if (plan === 'free') {
      navigate('/register');
      return;
    }

    setLoadingPlan(plan);
    try {
      const successUrl = isRegistrationFlow
        ? `${window.location.origin}/pricing?checkout=success`
        : undefined;
      const response = await paymentsApi.createCheckout(plan as 'starter' | 'pro' | 'business', successUrl);
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePurchaseCredits = async (packId: string) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    setLoadingPack(packId);
    try {
      const response = await paymentsApi.purchaseCredits(packId);
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create credit purchase:', error);
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            {isRegistrationFlow ? (
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Log out</span>
              </button>
            ) : (
              <Link
                to={isAuthenticated ? '/dashboard' : '/'}
                className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Pricing</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          {isRegistrationFlow && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Choose a plan to get started
            </div>
          )}
          <h2 className="text-3xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-surface-400 max-w-2xl mx-auto">
            All plans include access to our AI-powered design generation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
          <PlanCard
            plan="free"
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            isLoading={loadingPlan === 'free'}
          />
          <PlanCard
            plan="starter"
            currentPlan={currentPlan}
            isPopular
            onSelect={handleSelectPlan}
            isLoading={loadingPlan === 'starter'}
          />
          <PlanCard
            plan="pro"
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            isLoading={loadingPlan === 'pro'}
          />
          <PlanCard
            plan="business"
            currentPlan={currentPlan}
            onSelect={handleSelectPlan}
            isLoading={loadingPlan === 'business'}
          />
        </div>

        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">
            Need more credits?
          </h3>
          <p className="text-surface-400 mb-2">
            Starter and Pro subscribers can purchase additional credit packs anytime.
          </p>
          {isAuthenticated && (
            <p className="text-surface-500 text-sm">
              Your current balance: <span className="text-white font-semibold">{creditsBalance} credits</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {CREDIT_PACKS.map((pack) => (
            <CreditPackCard
              key={pack.id}
              pack={pack}
              canPurchase={canPurchaseCredits}
              onPurchase={handlePurchaseCredits}
              isLoading={loadingPack === pack.id}
            />
          ))}
        </div>

        {!canPurchaseCredits && isAuthenticated && (
          <p className="text-center text-surface-500 text-sm mt-4">
            Upgrade to Starter or Pro to purchase additional credits.
          </p>
        )}

      </main>
    </div>
  );
}
