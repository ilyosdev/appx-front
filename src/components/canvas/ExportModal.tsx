import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Download, Github, Globe, Loader2, Crown } from 'lucide-react';
import { projectsApi } from '@/lib/projects';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { PLAN_FEATURES } from '@/lib/payments';
import type { PlanType } from '@/lib/payments';
import { DeploymentPanel } from '../deployment/DeploymentPanel';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ExportModal({ isOpen, onClose, projectId, projectName }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuthStore();
  const { openUpgradeModal } = useBillingStore();
  const userPlan = (user?.plan as PlanType) || 'free';
  const features = PLAN_FEATURES[userPlan];
  const canExport = features.codeExport;

  const handleDownloadCode = async () => {
    if (!canExport) {
      openUpgradeModal('exports', 'Code export is available on paid plans. Upgrade to download your code.');
      return;
    }
    setIsExporting(true);
    try {
      const response = await projectsApi.exportCode(projectId);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleProFeature = (feature: string) => {
    openUpgradeModal('exports', `${feature} is available on paid plans. Upgrade to unlock it.`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Project" size="md">
      <div className="space-y-3">
        <button
          onClick={handleDownloadCode}
          disabled={isExporting}
          className={`w-full flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 hover:bg-surface-800 hover:border-surface-600 transition-colors text-left ${!canExport ? 'opacity-60' : ''}`}
        >
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            {isExporting ? <Loader2 className="w-5 h-5 text-primary-400 animate-spin" /> : <Download className="w-5 h-5 text-primary-400" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Download Code (ZIP)</span>
              {!canExport && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 rounded flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  STARTER
                </span>
              )}
            </div>
            <div className="text-xs text-surface-400">Export all screens as React Native components</div>
          </div>
        </button>

        <button
          onClick={() => features.githubConnect ? null : handleProFeature('GitHub integration')}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 hover:bg-surface-800 hover:border-surface-600 transition-colors text-left opacity-60"
        >
          <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0">
            <Github className="w-5 h-5 text-surface-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-surface-300">Connect GitHub</span>
              {!features.githubConnect && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 rounded">PRO</span>
              )}
            </div>
            <div className="text-xs text-surface-500">Push code directly to a repository</div>
          </div>
        </button>

        {features.githubConnect ? (
          <DeploymentPanel projectId={projectId} projectName={projectName} />
        ) : (
          <button
            onClick={() => handleProFeature('Vercel deployment')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 hover:bg-surface-800 hover:border-surface-600 transition-colors text-left opacity-60"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-surface-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-surface-300">Deploy to Vercel</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 rounded">PRO</span>
              </div>
              <div className="text-xs text-surface-500">Deploy your project live with one click</div>
            </div>
          </button>
        )}
      </div>
    </Modal>
  );
}
