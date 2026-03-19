import { useState, useCallback } from 'react';
import {
  Rocket,
  Globe,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Moon,
  Power,
  Trash2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { useDeployment } from '@/hooks/useDeployment';

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
  onDeploymentComplete?: (url: string) => void;
  variant?: 'card' | 'inline';
}

export function DeploymentPanel({
  projectId,
  projectName,
  onDeploymentComplete,
  variant = 'card',
}: DeploymentPanelProps) {
  const { deployment, status, isLoading, wake, destroy, provision } =
    useDeployment(projectId);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!deployment?.webUrl) return;
    navigator.clipboard.writeText(deployment.webUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [deployment?.webUrl]);

  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    none: { color: 'text-muted-foreground', bg: '', label: 'Not deployed' },
    provisioning: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'Provisioning...',
    },
    warm: {
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      label: 'Container ready',
    },
    deploying: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'Deploying...',
    },
    running: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Live',
    },
    sleeping: {
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
      label: 'Sleeping',
    },
    error: {
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Error',
    },
    destroyed: {
      color: 'text-muted-foreground',
      bg: '',
      label: 'Destroyed',
    },
  };

  const cfg = statusConfig[status] || statusConfig.none;

  const content = (
    <div className="space-y-4">
      {/* No deployment */}
      {(status === 'none' || status === 'destroyed') && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deploy your app to get a live URL. Your app will be accessible with
            automatic HTTPS and instant updates.
          </p>
          <Button onClick={provision} className="w-full gap-2" size="lg">
            <Rocket className="w-4 h-4" />
            Deploy App
          </Button>
        </div>
      )}

      {/* Provisioning / Deploying */}
      {(status === 'provisioning' || status === 'deploying') && (
        <div className="space-y-4">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${cfg.bg}`}
          >
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">{cfg.label}</p>
              <p className="text-xs text-muted-foreground">
                {status === 'provisioning'
                  ? 'Setting up your container...'
                  : 'Pushing code to container...'}
              </p>
            </div>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      {/* Warm (container ready, no code yet) */}
      {status === 'warm' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Container Ready
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                Waiting for code generation to deploy automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Running */}
      {status === 'running' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                App is Live!
              </p>
              {deployment?.webUrl && (
                <a
                  href={deployment.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  {deployment.webUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
              {deployment?.deployCount != null && deployment.deployCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {deployment.deployCount} deployment
                  {deployment.deployCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {deployment?.webUrl && (
              <>
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => window.open(deployment.webUrl!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Site
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
              </>
            )}
            <Button variant="ghost" className="gap-2" onClick={destroy}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Sleeping */}
      {status === 'sleeping' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <Moon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Container Sleeping
              </p>
              <p className="text-xs text-muted-foreground">
                Idle timeout reached. Wake to resume.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={wake} className="flex-1 gap-2">
              <Power className="w-4 h-4" />
              Wake Container
            </Button>
            <Button variant="ghost" onClick={destroy}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Deployment Failed
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                {deployment?.errorMessage || 'An unexpected error occurred.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={provision} className="flex-1 gap-2">
              <Rocket className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10">
            <Rocket className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Deploy</CardTitle>
            <CardDescription>
              Publish {projectName} to the web
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>{content}</CardContent>
    </Card>
  );
}
