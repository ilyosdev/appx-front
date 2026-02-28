import { useState, useCallback, useRef, useEffect } from 'react';
import { Rocket, Globe, ExternalLink, Loader2, CheckCircle, AlertCircle, Plus, X, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Input } from '../ui/Input';
import { api } from '@/lib/api';


type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
  onDeploymentComplete?: (url: string) => void;
  initialUrl?: string | null;
  variant?: 'card' | 'inline';
}

interface DeploymentResponse {
  deploymentId: string;
  status: 'queued' | 'building' | 'ready' | 'error';
  url?: string;
  error?: string;
}

interface DeploymentStatusResponse {
  status: 'queued' | 'building' | 'ready' | 'error';
  url?: string;
  error?: string;
  progress?: number;
}

export function DeploymentPanel({
  projectId,
  projectName,
  onDeploymentComplete,
  initialUrl,
  variant = 'card',
}: DeploymentPanelProps) {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>(
    initialUrl ? 'success' : 'idle'
  );
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(initialUrl || null);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deploymentIdRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const pollDeploymentStatus = useCallback(async (deploymentId: string) => {
    try {
      const response = await api.get<{ data: DeploymentStatusResponse }>(
        `/projects/${projectId}/deploy/${deploymentId}/status`
      );
      const data = response.data.data;

      switch (data.status) {
        case 'queued':
          setProgress('Queued for deployment...');
          break;
        case 'building':
          setProgress(`Building... ${data.progress ? `${data.progress}%` : ''}`);
          break;
        case 'ready':
          setDeploymentStatus('success');
          setDeploymentUrl(data.url || null);
          setProgress('Deployment complete!');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (data.url && onDeploymentComplete) {
            onDeploymentComplete(data.url);
          }
          break;
        case 'error':
          setDeploymentStatus('error');
          setError(data.error || 'Deployment failed. Please try again.');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          break;
      }
    } catch (err: any) {
      console.error('Failed to poll deployment status:', err);
      // Don't stop polling on transient errors
    }
  }, [projectId, onDeploymentComplete]);

  const handleDeploy = useCallback(async () => {
    if (deploymentStatus === 'deploying') return;

    setDeploymentStatus('deploying');
    setError(null);
    setDeploymentUrl(null);
    setProgress('Initiating deployment...');

    try {
      const response = await api.post<{ data: DeploymentResponse }>(
        `/projects/${projectId}/deploy`
      );
      const data = response.data.data;

      deploymentIdRef.current = data.deploymentId;

      if (data.status === 'ready' && data.url) {
        setDeploymentStatus('success');
        setDeploymentUrl(data.url);
        setProgress('Deployment complete!');
        if (onDeploymentComplete) {
          onDeploymentComplete(data.url);
        }
        return;
      }

      if (data.status === 'error') {
        setDeploymentStatus('error');
        setError(data.error || 'Deployment failed. Please try again.');
        return;
      }

      // Start polling for status
      setProgress('Building your application...');
      pollingIntervalRef.current = setInterval(() => {
        pollDeploymentStatus(data.deploymentId);
      }, 3000);

    } catch (err: any) {
      setDeploymentStatus('error');
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to start deployment. Please try again.'
      );
    }
  }, [projectId, deploymentStatus, onDeploymentComplete, pollDeploymentStatus]);

  const handleAddCustomDomain = useCallback(async () => {
    if (!customDomain.trim() || isAddingDomain) return;

    // Basic domain validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain.trim())) {
      setDomainError('Please enter a valid domain name');
      return;
    }

    setIsAddingDomain(true);
    setDomainError(null);

    try {
      await api.post(`/projects/${projectId}/domain`, {
        domain: customDomain.trim(),
      });
      setShowCustomDomain(false);
      setCustomDomain('');
      // Optionally refresh deployment info to show the new domain
    } catch (err: any) {
      setDomainError(
        err.response?.data?.message ||
        'Failed to add custom domain. Please verify DNS settings.'
      );
    } finally {
      setIsAddingDomain(false);
    }
  }, [projectId, customDomain, isAddingDomain]);

  const resetDeployment = useCallback(() => {
    setDeploymentStatus('idle');
    setError(null);
    setProgress('');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const content = (
    <div className="space-y-4">
      {/* Idle State */}
      {deploymentStatus === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Deploy your project to Vercel and get a live URL instantly.
            Your app will be accessible worldwide with automatic HTTPS.
          </p>
          <Button
            onClick={handleDeploy}
            className="w-full gap-2"
            size="lg"
          >
            <Rocket className="w-4 h-4" />
            Publish to Vercel
          </Button>
        </div>
      )}

      {/* Deploying State */}
      {deploymentStatus === 'deploying' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-100 dark:bg-surface-800">
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">Deploying...</p>
              <p className="text-xs text-muted-foreground">{progress}</p>
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

      {/* Success State */}
      {deploymentStatus === 'success' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Deployment Successful!
              </p>
              {deploymentUrl && (
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  {deploymentUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Custom Domain Section */}
          {!showCustomDomain ? (
            <button
              onClick={() => setShowCustomDomain(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add custom domain
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Custom Domain</label>
                <button
                  onClick={() => {
                    setShowCustomDomain(false);
                    setCustomDomain('');
                    setDomainError(null);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={customDomain}
                  onChange={(e) => {
                    setCustomDomain(e.target.value);
                    setDomainError(null);
                  }}
                  placeholder="example.com"
                  error={domainError || undefined}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCustomDomain}
                  disabled={!customDomain.trim() || isAddingDomain}
                  variant="secondary"
                >
                  {isAddingDomain ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Point your domain's DNS to Vercel to complete setup.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {deploymentUrl && (
              <>
                <Button
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => window.open(deploymentUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Site
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(deploymentUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              className="gap-2"
              onClick={handleDeploy}
            >
              <Rocket className="w-4 h-4" />
              Redeploy
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {deploymentStatus === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Deployment Failed
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                {error}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDeploy}
              className="flex-1 gap-2"
            >
              <Rocket className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={resetDeployment}
            >
              Cancel
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
            <CardTitle className="text-lg">Deploy to Vercel</CardTitle>
            <CardDescription>
              Publish {projectName} to the web
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
