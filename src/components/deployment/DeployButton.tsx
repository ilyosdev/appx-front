import { useState, useCallback } from 'react';
import { Rocket, Globe, ExternalLink, Loader2, Copy, Check, Crown } from 'lucide-react';
import { DeployModal } from './DeployModal';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { PLAN_FEATURES } from '@/lib/payments';
import type { PlanType } from '@/lib/payments';

interface DeployButtonProps {
  projectId: string;
  projectName: string;
  publishedUrl?: string | null;
  onDeploymentComplete?: (url: string) => void;
}

export function DeployButton({
  projectId,
  projectName,
  publishedUrl,
  onDeploymentComplete,
}: DeployButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user } = useAuthStore();
  const { openUpgradeModal } = useBillingStore();

  const userPlan = (user?.plan as PlanType) || 'free';
  const hasDeploy = PLAN_FEATURES[userPlan]?.githubConnect ?? false;

  const handleClick = useCallback(() => {
    if (!hasDeploy) {
      openUpgradeModal(
        undefined,
        'Upgrade to Pro to deploy your app',
      );
      return;
    }
    setIsModalOpen(true);
  }, [hasDeploy, openUpgradeModal]);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publishedUrl]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (publishedUrl) {
      window.open(publishedUrl, '_blank');
    }
  }, [publishedUrl]);

  const handleDeploymentComplete = useCallback((url: string) => {
    setIsDeploying(false);
    onDeploymentComplete?.(url);
  }, [onDeploymentComplete]);

  // Extract domain from URL for display
  let displayDomain: string | null = null;
  try {
    displayDomain = publishedUrl ? new URL(publishedUrl).hostname : null;
  } catch {
    displayDomain = publishedUrl || null;
  }

  // Deploying state
  if (isDeploying) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-400 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Deploying...</span>
      </button>
    );
  }

  // Deployed state: show URL pill
  if (publishedUrl && displayDomain) {
    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-white hover:bg-surface-800 hover:border-surface-600 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-sm truncate max-w-[160px]">{displayDomain}</span>
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:bg-surface-700 transition-colors"
            title="Copy URL"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-surface-500 hover:text-surface-300" />
            )}
          </button>
          <button
            onClick={handleOpen}
            className="p-0.5 rounded hover:bg-surface-700 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-surface-500 hover:text-surface-300" />
          </button>
        </button>

        <DeployModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectId={projectId}
          projectName={projectName}
          publishedUrl={publishedUrl}
          onDeploymentComplete={handleDeploymentComplete}
        />
      </>
    );
  }

  // Idle state: show deploy button
  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-400 hover:text-white hover:bg-surface-800 hover:border-surface-600 transition-colors"
      >
        <Rocket className="w-4 h-4" />
        <span className="text-sm">Deploy</span>
        {!hasDeploy && (
          <Crown className="w-3.5 h-3.5 text-amber-400" />
        )}
      </button>

      {hasDeploy && (
        <DeployModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectId={projectId}
          projectName={projectName}
          publishedUrl={publishedUrl}
          onDeploymentComplete={handleDeploymentComplete}
        />
      )}
    </>
  );
}
