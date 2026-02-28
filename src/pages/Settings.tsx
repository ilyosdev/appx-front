import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Crown,
  Zap,
  ExternalLink,
  Coins,
  Loader2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { paymentsApi, PLAN_FEATURES, formatLimit, getUsagePercentage } from '@/lib';
import type { UserLimitsDto, PlanType } from '@/lib';
import { UpgradeModal, CreditPurchaseModal } from '@/components/billing';
import { DashboardLayout } from '@/components/layout';

type SettingsTab = 'profile' | 'notifications' | 'billing' | 'submissions' | 'subscription';

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-surface-400">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl bg-surface-800/50 border border-surface-700/50', className)}>
      {children}
    </div>
  );
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuthStore();

  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [limits, setLimits] = useState<UserLimitsDto | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const currentPlan = (user?.plan as PlanType) || 'free';
  const creditsBalance = parseFloat(user?.creditsRemaining || '0');

  useEffect(() => {
    if (searchParams.get('success') === 'subscription' || searchParams.get('success') === 'credits') {
      refreshUser();
    }
  }, [searchParams, refreshUser]);

  useEffect(() => {
    if (activeTab === 'billing' || activeTab === 'subscription') {
      fetchLimits();
    }
  }, [activeTab]);

  const fetchLimits = async () => {
    setLimitsLoading(true);
    try {
      const response = await paymentsApi.getLimits();
      const responseData = response.data as UserLimitsDto & { data?: UserLimitsDto };
      const data = responseData.data ?? responseData;
      setLimits(data);
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await paymentsApi.createPortalSession();
      const url = response.data?.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const displayUser = user || { name: 'User', email: 'user@example.com' };
  const initials = (displayUser.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl space-y-8">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SettingsSection
                title="Profile Information"
                description="Update your account details and profile picture."
              >
                <SettingsCard>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-white">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{displayUser.name}</p>
                      <p className="text-sm text-surface-400">{displayUser.email}</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-surface-700 text-white text-sm font-medium hover:bg-surface-600 transition-colors">
                      Change Photo
                    </button>
                  </div>
                </SettingsCard>

                <SettingsCard>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        defaultValue={displayUser.name || ''}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={displayUser.email}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                      />
                    </div>
                  </div>
                </SettingsCard>
              </SettingsSection>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SettingsSection
                title="Notification Preferences"
                description="Choose how you want to be notified about updates."
              >
                <SettingsCard>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Email Notifications</p>
                      <p className="text-sm text-surface-400">Receive updates via email</p>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors',
                        emailNotifications ? 'bg-primary-500' : 'bg-surface-700'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                          emailNotifications && 'translate-x-6'
                        )}
                      />
                    </button>
                  </div>
                </SettingsCard>

                <SettingsCard>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Push Notifications</p>
                      <p className="text-sm text-surface-400">Receive browser notifications</p>
                    </div>
                    <button
                      onClick={() => setPushNotifications(!pushNotifications)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors',
                        pushNotifications ? 'bg-primary-500' : 'bg-surface-700'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                          pushNotifications && 'translate-x-6'
                        )}
                      />
                    </button>
                  </div>
                </SettingsCard>
              </SettingsSection>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SettingsSection
                title="Usage & Limits"
                description="Track your usage across all resources."
              >
                {limitsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  </div>
                ) : limits ? (
                  <div className="space-y-4">
                    <SettingsCard>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-primary-400" />
                          <p className="font-medium text-white">Credits</p>
                        </div>
                        <p className="text-sm text-surface-400">
                          {limits.credits?.remaining ?? 0} / {limits.credits?.monthlyAllocation ?? 0} this month
                        </p>
                      </div>
                      <div className="w-full h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${limits.credits?.monthlyAllocation ? Math.min((limits.credits.remaining / limits.credits.monthlyAllocation) * 100, 100) : 0}%` }}
                        />
                      </div>
                      {PLAN_FEATURES[currentPlan].canPurchaseCredits && (
                        <button
                          onClick={() => setShowCreditsModal(true)}
                          className="mt-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          Buy more credits
                        </button>
                      )}
                    </SettingsCard>

                    <div className="grid grid-cols-2 gap-4">
                      <SettingsCard>
                        <p className="text-sm text-surface-400 mb-1">Projects</p>
                        <p className="font-semibold text-white">
                          {formatLimit(limits.projects?.used ?? 0, limits.projects?.limit ?? 0, limits.projects?.isUnlimited ?? false)}
                        </p>
                        {!limits.projects?.isUnlimited && (
                          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${getUsagePercentage(limits.projects?.used ?? 0, limits.projects?.limit ?? 0, limits.projects?.isUnlimited ?? false)}%` }}
                            />
                          </div>
                        )}
                      </SettingsCard>

                      <SettingsCard>
                        <p className="text-sm text-surface-400 mb-1">Screens</p>
                        <p className="font-semibold text-white">
                          {formatLimit(limits.screens?.used ?? 0, limits.screens?.limit ?? 0, limits.screens?.isUnlimited ?? false)}
                        </p>
                        {!limits.screens?.isUnlimited && (
                          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${getUsagePercentage(limits.screens?.used ?? 0, limits.screens?.limit ?? 0, limits.screens?.isUnlimited ?? false)}%` }}
                            />
                          </div>
                        )}
                      </SettingsCard>

                      <SettingsCard>
                        <p className="text-sm text-surface-400 mb-1">Code Exports</p>
                        <p className="font-semibold text-white">
                          {formatLimit(limits.codeExports?.used ?? 0, limits.codeExports?.limit ?? 0, limits.codeExports?.isUnlimited ?? false)}
                        </p>
                        {!limits.codeExports?.isUnlimited && (
                          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${getUsagePercentage(limits.codeExports?.used ?? 0, limits.codeExports?.limit ?? 0, limits.codeExports?.isUnlimited ?? false)}%` }}
                            />
                          </div>
                        )}
                      </SettingsCard>

                      <SettingsCard>
                        <p className="text-sm text-surface-400 mb-1">Figma Exports</p>
                        <p className="font-semibold text-white">
                          {formatLimit(limits.figmaExports?.used ?? 0, limits.figmaExports?.limit ?? 0, limits.figmaExports?.isUnlimited ?? false)}
                        </p>
                        {!limits.figmaExports?.isUnlimited && (
                          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-pink-500 rounded-full transition-all"
                              style={{ width: `${getUsagePercentage(limits.figmaExports?.used ?? 0, limits.figmaExports?.limit ?? 0, limits.figmaExports?.isUnlimited ?? false)}%` }}
                            />
                          </div>
                        )}
                      </SettingsCard>
                    </div>
                  </div>
                ) : (
                  <SettingsCard>
                    <p className="text-surface-400 text-center py-4">Failed to load usage data</p>
                  </SettingsCard>
                )}
              </SettingsSection>

              {currentPlan !== 'free' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="px-4 py-2 rounded-xl bg-surface-700 text-white text-sm font-medium hover:bg-surface-600 transition-colors flex items-center gap-2"
                  >
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Manage Billing
                  </button>
                </div>
              )}

              <div className="text-center">
                <Link
                  to="/pricing"
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Compare all plans
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === 'subscription' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SettingsSection
                title="Current Plan"
                description="Manage your subscription and plan details."
              >
                <SettingsCard className="relative overflow-hidden">
                  <div className={cn(
                    "absolute inset-0",
                    currentPlan === 'pro'
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10"
                      : currentPlan === 'starter'
                      ? "bg-gradient-to-r from-primary-500/10 to-cyan-500/10"
                      : "bg-surface-800/30"
                  )} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        currentPlan === 'pro' ? "bg-amber-500/20" : currentPlan === 'starter' ? "bg-primary-500/20" : "bg-surface-700"
                      )}>
                        {currentPlan === 'pro' ? (
                          <Crown className="w-5 h-5 text-amber-400" />
                        ) : currentPlan === 'starter' ? (
                          <Zap className="w-5 h-5 text-primary-400" />
                        ) : (
                          <User className="w-5 h-5 text-surface-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{PLAN_FEATURES[currentPlan].name} Plan</p>
                        <p className="text-sm text-surface-400">
                          {currentPlan === 'free' ? 'Free' : `$${PLAN_FEATURES[currentPlan].price}/month`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPlan !== 'pro' && (
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white text-sm font-semibold hover:from-primary-400 hover:to-cyan-400 transition-colors"
                        >
                          Upgrade
                        </button>
                      )}
                      {currentPlan !== 'free' && (
                        <button
                          onClick={handleManageBilling}
                          disabled={portalLoading}
                          className="px-4 py-2 rounded-xl bg-surface-700 text-white text-sm font-medium hover:bg-surface-600 transition-colors flex items-center gap-2"
                        >
                          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                          Manage
                        </button>
                      )}
                    </div>
                  </div>
                </SettingsCard>
              </SettingsSection>

              <div className="text-center">
                <Link
                  to="/pricing"
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Compare all plans
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === 'submissions' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SettingsSection
                title="Dev Submissions"
                description="Track projects you've submitted to our developers."
              >
                {/* Empty state — will be replaced with real data when backend is ready */}
                <SettingsCard>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-4">
                      <Package className="w-7 h-7 text-surface-500" />
                    </div>
                    <h4 className="text-base font-semibold text-white mb-1">No submissions yet</h4>
                    <p className="text-sm text-surface-400 max-w-sm">
                      Submit a project from the Canvas to get started. Our fullstack developers will build your AI-designed app into a working product.
                    </p>
                  </div>
                </SettingsCard>
              </SettingsSection>
            </motion.div>
          )}

        <div className="pt-4">
          {(activeTab === 'profile' || activeTab === 'notifications') && (
            <button className="px-6 py-2.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition-colors">
              Save Changes
            </button>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={currentPlan}
      />

      <CreditPurchaseModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        currentPlan={currentPlan}
        currentBalance={creditsBalance}
      />
    </DashboardLayout>
  );
}
