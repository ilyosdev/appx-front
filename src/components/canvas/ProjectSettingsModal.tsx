import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { projectsApi, type Project } from '@/lib/projects';
import { Loader2, Check, X, Upload, Trash2, Wand2, FileCode, Globe, Server, Copy, ExternalLink, RefreshCw, Shield, RotateCw, Terminal, Download, Zap, Moon, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { slugify } from '@/lib/slugify';
import { api, rewriteStorageUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { EnvVarsPanel } from './EnvVarsPanel';
import { ContainerLogsPanel } from './ContainerLogsPanel';
import { ContainerResourcesPanel } from './ContainerResourcesPanel';
import { useDeployment } from '@/hooks/useDeployment';
import { useAuthStore } from '@/stores/authStore';
import { useDeployStore, type Deployment, type ScaleMode } from '@/stores/deployStore';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  project: Project;
  onProjectUpdate?: (updates: Partial<Project>) => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export function ProjectSettingsModal({
  isOpen,
  onClose,
  projectId,
  project,
  onProjectUpdate,
}: ProjectSettingsModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { deployment, provision, wake, destroy, scale: _scale } = useDeployment(projectId);
  const userPlan = useAuthStore((s) => s.user?.plan) ?? 'free';
  const isPaidPlan = userPlan === 'starter' || userPlan === 'pro' || userPlan === 'business';

  // Container state
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [alwaysOnLoading, setAlwaysOnLoading] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [subdomainLoading, setSubdomainLoading] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [customDomainStatus, setCustomDomainStatus] = useState<'pending' | 'active' | 'failed' | null>(null);
  const [customDomainLoading, setCustomDomainLoading] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainRemoving, setDomainRemoving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Form state
  const [name, setName] = useState(project.name);
  const [appName, setAppName] = useState(project.appName || '');
  const [slug, setSlug] = useState(project.slug || '');
  const [bundleIdIos, setBundleIdIos] = useState(project.bundleIdIos || '');
  const [bundleIdAndroid, setBundleIdAndroid] = useState(project.bundleIdAndroid || '');
  const [appIconUrl, setAppIconUrl] = useState(project.appIconUrl || '');

  // API docs state
  const [apiDocSpec, setApiDocSpec] = useState('');
  const [apiDocParsed, setApiDocParsed] = useState<{
    title: string;
    endpointCount: number;
    baseUrl: string;
  } | null>(null);
  const [isUploadingApiDoc, setIsUploadingApiDoc] = useState(false);
  const [apiDocError, setApiDocError] = useState('');
  const hasApiDocs = !!project.apiDocumentation;
  const apiFileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset form when modal opens or project changes
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setAppName(project.appName || '');
      setSlug(project.slug || '');
      setBundleIdIos(project.bundleIdIos || '');
      setBundleIdAndroid(project.bundleIdAndroid || '');
      setAppIconUrl(project.appIconUrl || '');
      setSlugStatus('idle');
      // Sync container state from deployment
      setAlwaysOn(deployment?.alwaysOn ?? false);
      setSubdomain(deployment?.subdomain ?? deployment?.appName ?? '');
      setCustomDomain(deployment?.customDomain ?? '');
      setCustomDomainStatus(deployment?.customDomainStatus ?? null);
    }
  }, [isOpen, project, deployment]);

  // Track if form is dirty
  const isDirty =
    name !== project.name ||
    appName !== (project.appName || '') ||
    slug !== (project.slug || '') ||
    bundleIdIos !== (project.bundleIdIos || '') ||
    bundleIdAndroid !== (project.bundleIdAndroid || '') ||
    appIconUrl !== (project.appIconUrl || '');

  // Debounced slug availability check
  const checkSlug = useCallback(
    (value: string) => {
      if (slugCheckTimerRef.current) {
        clearTimeout(slugCheckTimerRef.current);
      }
      if (!value.trim()) {
        setSlugStatus('idle');
        return;
      }
      // If slug hasn't changed from saved value, skip check
      if (value === project.slug) {
        setSlugStatus('available');
        return;
      }
      setSlugStatus('checking');
      slugCheckTimerRef.current = setTimeout(async () => {
        try {
          const result = await projectsApi.checkSlugAvailability(value, projectId);
          setSlugStatus(result.available ? 'available' : 'taken');
        } catch {
          setSlugStatus('error');
        }
      }, 500);
    },
    [projectId, project.slug],
  );

  /** Derive clean bundle ID from a slug, e.g. "momoko-app" → "app.appx.momoko.app" */
  const bundleIdFromSlug = (s: string) => {
    const safe = s.replace(/-/g, '.').replace(/[^a-z0-9.]/g, '');
    return `app.appx.${safe}`;
  };

  const handleSlugChange = (value: string) => {
    // Only allow lowercase alphanumeric and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
    checkSlug(sanitized);
    // Keep bundle IDs in sync with slug
    if (sanitized) {
      const bundleId = bundleIdFromSlug(sanitized);
      setBundleIdIos(bundleId);
      setBundleIdAndroid(bundleId);
    }
  };

  const handleAutoGenerateSlug = () => {
    const generated = slugify(name);
    setSlug(generated);
    checkSlug(generated);
    // Auto-fill bundle IDs from slug
    const bundleId = bundleIdFromSlug(generated);
    setBundleIdIos(bundleId);
    setBundleIdAndroid(bundleId);
  };

  const handleSlugBlur = () => {
    if (slug && !bundleIdIos) {
      setBundleIdIos(bundleIdFromSlug(slug));
    }
    if (slug && !bundleIdAndroid) {
      setBundleIdAndroid(bundleIdFromSlug(slug));
    }
  };

  // Icon upload
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({ title: 'Icon must be smaller than 1MB', variant: 'error' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: 'File must be an image', variant: 'error' });
      return;
    }

    setIsUploadingIcon(true);
    try {
      const result = await projectsApi.uploadIcon(projectId, file);
      setAppIconUrl(result.url);
      toast({ title: 'Icon uploaded', variant: 'success' });
    } catch {
      toast({ title: 'Failed to upload icon', variant: 'error' });
    } finally {
      setIsUploadingIcon(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveIcon = () => {
    setAppIconUrl('');
  };

  // Save all changes
  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    if (slugStatus === 'taken') {
      toast({ title: 'Slug is already taken', variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const updates: Record<string, string | undefined> = {};
      if (name !== project.name) updates.name = name.trim();
      if (appName !== (project.appName || '')) updates.appName = appName.trim() || undefined;
      if (slug !== (project.slug || '')) updates.slug = slug.trim() || undefined;
      if (bundleIdIos !== (project.bundleIdIos || '')) updates.bundleIdIos = bundleIdIos.trim() || undefined;
      if (bundleIdAndroid !== (project.bundleIdAndroid || '')) updates.bundleIdAndroid = bundleIdAndroid.trim() || undefined;
      if (appIconUrl !== (project.appIconUrl || '')) updates.appIconUrl = appIconUrl || undefined;

      await projectsApi.updateSettings(projectId, updates);
      onProjectUpdate?.(updates as Partial<Project>);
      toast({ title: 'Settings saved', variant: 'success' });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Failed to save settings',
        description: err.response?.data?.message || 'Please try again',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApiDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setApiDocError('');
    setIsUploadingApiDoc(true);
    try {
      const text = await file.text();
      const result = await projectsApi.uploadApiDocs(projectId, text);
      setApiDocParsed({
        title: result.title,
        endpointCount: result.endpointCount,
        baseUrl: result.baseUrl,
      });
      toast({ title: `API docs loaded: ${result.endpointCount} endpoints`, variant: 'success' });
      onProjectUpdate?.({ apiDocumentation: 'loaded' } as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid spec';
      setApiDocError(msg);
      toast({ title: 'Failed to parse API docs', description: msg, variant: 'error' });
    } finally {
      setIsUploadingApiDoc(false);
      if (apiFileInputRef.current) apiFileInputRef.current.value = '';
    }
  };

  const handleApiDocPaste = async () => {
    if (!apiDocSpec.trim()) return;
    setApiDocError('');
    setIsUploadingApiDoc(true);
    try {
      const result = await projectsApi.uploadApiDocs(projectId, apiDocSpec);
      setApiDocParsed({
        title: result.title,
        endpointCount: result.endpointCount,
        baseUrl: result.baseUrl,
      });
      setApiDocSpec('');
      toast({ title: `API docs loaded: ${result.endpointCount} endpoints`, variant: 'success' });
      onProjectUpdate?.({ apiDocumentation: 'loaded' } as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid spec';
      setApiDocError(msg);
    } finally {
      setIsUploadingApiDoc(false);
    }
  };

  const handleRemoveApiDocs = async () => {
    try {
      await projectsApi.removeApiDocs(projectId);
      setApiDocParsed(null);
      setApiDocSpec('');
      toast({ title: 'API documentation removed', variant: 'success' });
      onProjectUpdate?.({ apiDocumentation: null } as any);
    } catch {
      toast({ title: 'Failed to remove API docs', variant: 'error' });
    }
  };

  // --- Container handlers ---
  const handleToggleAlwaysOn = async (enabled: boolean) => {
    setAlwaysOnLoading(true);
    try {
      await api.patch(`/projects/${projectId}/container/always-on`, { enabled });
      setAlwaysOn(enabled);
      toast({ title: enabled ? 'Always-on enabled' : 'Always-on disabled', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to update always-on', description: err.response?.data?.message, variant: 'error' });
    } finally {
      setAlwaysOnLoading(false);
    }
  };

  const handleSaveSubdomain = async () => {
    if (!subdomain.trim()) return;
    setSubdomainLoading(true);
    try {
      await api.patch(`/projects/${projectId}/container/subdomain`, { subdomain: subdomain.trim() });
      toast({ title: 'Subdomain saved', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to save subdomain', description: err.response?.data?.message, variant: 'error' });
    } finally {
      setSubdomainLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!customDomain.trim()) return;
    setCustomDomainLoading(true);
    try {
      await api.patch(`/projects/${projectId}/container/domain`, { domain: customDomain.trim() });
      setCustomDomainStatus('pending');
      toast({ title: 'Custom domain added', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to add domain', description: err.response?.data?.message, variant: 'error' });
    } finally {
      setCustomDomainLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    setDomainVerifying(true);
    try {
      const res = await api.post(`/projects/${projectId}/container/domain/verify`);
      const status = res.data?.status ?? res.data?.data?.status;
      setCustomDomainStatus(status || 'pending');
      toast({
        title: status === 'active' ? 'Domain verified!' : 'DNS not ready yet',
        variant: status === 'active' ? 'success' : 'error',
      });
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.response?.data?.message, variant: 'error' });
    } finally {
      setDomainVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    setDomainRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/container/domain`);
      setCustomDomain('');
      setCustomDomainStatus(null);
      toast({ title: 'Custom domain removed', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to remove domain', description: err.response?.data?.message, variant: 'error' });
    } finally {
      setDomainRemoving(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await api.post(`/projects/${projectId}/container/restart`);
      toast({ title: 'Container restarted', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Restart failed', description: err.response?.data?.message || err.message, variant: 'error' });
    } finally {
      setIsRestarting(false);
    }
  };

  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const handleDownloadSource = async () => {
    setIsDownloadingSource(true);
    try {
      const response = await projectsApi.exportSourceCode(projectId);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers['content-disposition'];
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] || `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-source.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Source code downloaded', variant: 'success' });
    } catch (err: any) {
      const msg = err.response?.status === 403 ? 'Export limit reached' : 'Failed to download source code';
      toast({ title: msg, variant: 'error' });
    } finally {
      setIsDownloadingSource(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectId);
      navigate('/dashboard');
    } catch {
      toast({ title: 'Failed to delete project', variant: 'error' });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const iconSrc = appIconUrl ? rewriteStorageUrl(appIconUrl) : undefined;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />
            {/* Drawer */}
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-[580px] bg-surface-900 border-l border-surface-700 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 shrink-0">
                <h2 className="text-lg font-semibold text-white">Project Settings</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-6">
          {/* Section 1: App Identity */}
          <section>
            <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wide mb-3">
              App Identity
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  App Display Name
                  <span className="text-surface-500 font-normal ml-1">(shown on home screen)</span>
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder={name || 'My App'}
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Section 2: URL & IDs */}
          <section>
            <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wide mb-3">
              URL & Identifiers
            </h3>
            <div className="space-y-3">
              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Project URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-stretch flex-1">
                    <span className="inline-flex items-center px-3 rounded-l-lg bg-surface-900 border border-r-0 border-surface-700 text-surface-500 text-sm whitespace-nowrap">
                      appx.uz/app/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      onBlur={handleSlugBlur}
                      placeholder="my-app"
                      className={cn(
                        'flex-1 px-3 py-2 rounded-r-lg bg-surface-800 border border-surface-700 text-white text-sm focus:outline-none focus:ring-2 focus:border-transparent min-w-0',
                        slugStatus === 'available' && 'focus:ring-emerald-500 border-emerald-500/30',
                        slugStatus === 'taken' && 'focus:ring-red-500 border-red-500/30',
                        (slugStatus === 'idle' || slugStatus === 'checking') && 'focus:ring-primary-500',
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSlug}
                    className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors shrink-0"
                    title="Auto-generate from project name"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Slug status */}
                {slugStatus === 'checking' && (
                  <p className="mt-1 text-xs text-surface-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
                  </p>
                )}
                {slugStatus === 'available' && (
                  <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Available
                  </p>
                )}
                {slugStatus === 'taken' && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <X className="w-3 h-3" /> Taken
                  </p>
                )}
              </div>

              {/* Bundle IDs */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  iOS Bundle Identifier
                </label>
                <input
                  type="text"
                  value={bundleIdIos}
                  onChange={(e) => setBundleIdIos(e.target.value)}
                  placeholder="app.appx.my-app"
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                  Android Package Name
                </label>
                <input
                  type="text"
                  value={bundleIdAndroid}
                  onChange={(e) => setBundleIdAndroid(e.target.value)}
                  placeholder="app.appx.my.app"
                  className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Section 3: App Icon */}
          <section>
            <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wide mb-3">
              App Icon
            </h3>
            <div className="flex items-center gap-4">
              {/* Icon preview */}
              <div className="w-20 h-20 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center overflow-hidden shrink-0">
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt="App icon"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-surface-600 text-2xl font-bold">
                    {(appName || name || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingIcon}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isUploadingIcon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploadingIcon ? 'Uploading...' : 'Change Icon'}
                </button>
                {appIconUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-surface-500">
              Recommended: 1024x1024 PNG, max 1MB
            </p>
          </section>

          {/* Environment Variables */}
          <section>
            <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wide mb-3">
              Environment Variables
            </h3>
            <EnvVarsPanel projectId={projectId} />
          </section>

          {/* Section: API Documentation */}
          <section>
            <h3 className="text-sm font-medium text-surface-400 uppercase tracking-wide mb-3">
              API Documentation
            </h3>
            <p className="text-xs text-surface-500 mb-3">
              Upload a Swagger/OpenAPI spec to generate code that calls your real API endpoints.
            </p>

            {(hasApiDocs || apiDocParsed) && !apiDocSpec ? (
              <div className="p-3 rounded-lg bg-surface-800 border border-surface-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-white font-medium">
                      {apiDocParsed?.title || 'API Connected'}
                    </span>
                    {apiDocParsed?.endpointCount && (
                      <span className="text-xs text-surface-500">
                        {apiDocParsed.endpointCount} endpoints
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveApiDocs}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                {apiDocParsed?.baseUrl && (
                  <p className="text-xs text-surface-500 mt-1">{apiDocParsed.baseUrl}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    ref={apiFileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleApiDocUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => apiFileInputRef.current?.click()}
                    disabled={isUploadingApiDoc}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {isUploadingApiDoc ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Swagger JSON
                  </button>
                </div>
                <div>
                  <textarea
                    value={apiDocSpec}
                    onChange={(e) => setApiDocSpec(e.target.value)}
                    placeholder="Or paste your OpenAPI/Swagger JSON here..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-xs font-mono placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none h-24"
                  />
                  {apiDocSpec.trim() && (
                    <button
                      type="button"
                      onClick={handleApiDocPaste}
                      disabled={isUploadingApiDoc}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors disabled:opacity-50"
                    >
                      {isUploadingApiDoc ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileCode className="w-4 h-4" />
                      )}
                      Parse & Save
                    </button>
                  )}
                </div>
                {apiDocError && (
                  <p className="text-xs text-red-400">{apiDocError}</p>
                )}
              </div>
            )}
          </section>

          {/* Container / Sandbox */}
          <section className="pt-4 border-t border-surface-800">
            <h3 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" /> Container / Sandbox
            </h3>
            {!deployment || deployment.status === 'none' ? (
              <div className="bg-surface-900 rounded-lg p-4 text-center">
                <p className="text-sm text-surface-400 mb-3">No container deployed yet</p>
                <button
                  onClick={() => provision()}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors"
                >
                  Deploy Container
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-400">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      deployment.status === 'running' ? 'bg-emerald-400' :
                      deployment.status === 'error' ? 'bg-red-400' :
                      deployment.status === 'sleeping' || deployment.status === 'destroyed' ? 'bg-surface-500' :
                      'bg-yellow-400 animate-pulse'
                    )} />
                    <span className={cn(
                      'text-xs font-medium capitalize',
                      deployment.status === 'running' ? 'text-emerald-400' :
                      deployment.status === 'error' ? 'text-red-400' :
                      'text-surface-300'
                    )}>
                      {deployment.status}
                    </span>
                  </div>
                </div>

                {/* Resource usage & container info */}
                <ContainerResourcesPanel projectId={projectId} isOpen={isOpen} />

                {/* Always-on toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-surface-300 font-medium">Keep alive</span>
                    <p className="text-[10px] text-surface-500">5 credits/day</p>
                  </div>
                  {isPaidPlan ? (
                    <button
                      onClick={() => handleToggleAlwaysOn(!alwaysOn)}
                      disabled={alwaysOnLoading}
                      className={cn(
                        'relative w-9 h-5 rounded-full transition-colors',
                        alwaysOn ? 'bg-primary-500' : 'bg-surface-700',
                        alwaysOnLoading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                        alwaysOn && 'translate-x-4'
                      )} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-surface-500 bg-surface-800 px-2 py-0.5 rounded">Pro plan required</span>
                  )}
                </div>

                {/* Instance Control */}
                <InstanceControlPanel
                  deployment={deployment}
                  isPaidPlan={isPaidPlan}
                  projectId={projectId}
                />

                {/* Web URL */}
                {deployment.webUrl && (
                  <div>
                    <span className="text-xs text-surface-400 block mb-1">Live URL</span>
                    <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-3 py-2">
                      <span className="text-xs text-surface-200 truncate flex-1 font-mono">{deployment.webUrl}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(deployment.webUrl!); toast({ title: 'URL copied!', variant: 'success' }); }}
                        className="text-surface-400 hover:text-white transition-colors flex-shrink-0"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={deployment.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-surface-400 hover:text-white transition-colors flex-shrink-0"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Expo URL */}
                {deployment.expoUrl && (
                  <div>
                    <span className="text-xs text-surface-400 block mb-1">Expo URL</span>
                    <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-3 py-2">
                      <span className="text-xs text-surface-200 truncate flex-1 font-mono">{deployment.expoUrl}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(deployment.expoUrl!); toast({ title: 'URL copied!', variant: 'success' }); }}
                        className="text-surface-400 hover:text-white transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Subdomain field */}
                <div>
                  <span className="text-xs text-surface-400 block mb-1">Subdomain</span>
                  {isPaidPlan ? (
                    <div className="flex items-stretch gap-2">
                      <div className="flex items-stretch flex-1">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="my-app"
                          className="flex-1 px-3 py-1.5 rounded-l-lg bg-surface-800 border border-r-0 border-surface-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
                        />
                        <span className="inline-flex items-center px-2 rounded-r-lg bg-surface-900 border border-l-0 border-surface-700 text-surface-500 text-xs whitespace-nowrap">
                          .myappx.live
                        </span>
                      </div>
                      <button
                        onClick={handleSaveSubdomain}
                        disabled={subdomainLoading || !subdomain.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {subdomainLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-200 font-mono">{deployment.appName}</span>
                      <span className="text-[10px] text-surface-500 bg-surface-800 px-2 py-0.5 rounded">Pro plan required</span>
                    </div>
                  )}
                </div>

                {/* Custom domain */}
                <div>
                  <span className="text-xs text-surface-400 block mb-1">Custom Domain</span>
                  {isPaidPlan ? (
                    <div className="space-y-2">
                      {customDomainStatus ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-surface-900 rounded-lg px-3 py-2">
                            <span className="text-xs text-surface-200 font-mono truncate">{customDomain}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                                customDomainStatus === 'active' && 'bg-emerald-500/10 text-emerald-400',
                                customDomainStatus === 'pending' && 'bg-yellow-500/10 text-yellow-400',
                                customDomainStatus === 'failed' && 'bg-red-500/10 text-red-400',
                              )}>
                                {customDomainStatus}
                              </span>
                            </div>
                          </div>
                          {customDomainStatus === 'pending' && (
                            <div className="bg-surface-900 rounded-lg px-3 py-2 space-y-1.5">
                              <p className="text-[10px] text-surface-400">Add a CNAME record:</p>
                              <div className="flex items-center gap-2 bg-surface-800 rounded px-2 py-1">
                                <span className="text-[10px] text-surface-300 font-mono truncate">{customDomain} → myappx.live</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(`${customDomain} CNAME myappx.live`); toast({ title: 'DNS record copied!', variant: 'success' }); }}
                                  className="text-surface-500 hover:text-white transition-colors flex-shrink-0"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {customDomainStatus !== 'active' && (
                              <button
                                onClick={handleVerifyDomain}
                                disabled={domainVerifying}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-medium hover:bg-primary-500/20 transition-colors disabled:opacity-50"
                              >
                                {domainVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                Verify DNS
                              </button>
                            )}
                            <button
                              onClick={handleRemoveDomain}
                              disabled={domainRemoving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              {domainRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-stretch gap-2">
                          <input
                            type="text"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value.trim())}
                            placeholder="app.coolapp.com"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-white text-xs placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
                          />
                          <button
                            onClick={handleAddDomain}
                            disabled={customDomainLoading || !customDomain.trim()}
                            className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            {customDomainLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add Domain'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-surface-500 bg-surface-800 px-2 py-0.5 rounded">Pro plan required</span>
                  )}
                </div>

                {/* Memory */}
                {deployment.memoryMb && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-400">Memory</span>
                    <span className="text-xs text-surface-200">{deployment.memoryMb} MB</span>
                  </div>
                )}

                {/* Deploy count */}
                {deployment.deployCount != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-400">Deploys</span>
                    <span className="text-xs text-surface-200">{deployment.deployCount}</span>
                  </div>
                )}

                {/* Error message */}
                {deployment.status === 'error' && deployment.errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-400">{deployment.errorMessage}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {deployment.status === 'sleeping' && (
                    <button
                      onClick={() => wake()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-medium hover:bg-primary-500/20 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Wake Up
                    </button>
                  )}
                  {deployment.status === 'error' && (
                    <button
                      onClick={() => provision()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 text-xs font-medium hover:bg-primary-500/20 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Deploy
                    </button>
                  )}
                  {(deployment.status === 'running' || deployment.status === 'warm') && (
                    <button
                      onClick={handleRestart}
                      disabled={isRestarting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                    >
                      {isRestarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                      {isRestarting ? 'Restarting...' : 'Restart'}
                    </button>
                  )}
                  {(deployment.status === 'running' || deployment.status === 'sleeping') && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Destroy this container? You can redeploy later.')) {
                          await destroy();
                          toast({ title: 'Container destroyed', variant: 'success' });
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Destroy
                    </button>
                  )}
                </div>

                {/* Container Logs */}
                <div className="pt-2">
                  <span className="text-xs text-surface-400 flex items-center gap-1.5 mb-2">
                    <Terminal className="w-3.5 h-3.5" /> Container Logs
                  </span>
                  <ContainerLogsPanel projectId={projectId} />
                </div>
              </div>
            )}
          </section>

          {/* Download Source */}
          <section className="pt-4 border-t border-surface-800">
            <h3 className="text-sm font-medium text-surface-200 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </h3>
            <p className="text-xs text-surface-400 mb-3">Download all source files as a zip archive.</p>
            <button
              onClick={handleDownloadSource}
              disabled={isDownloadingSource}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm font-medium hover:bg-primary-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloadingSource ? 'Downloading...' : 'Download Source Code'}
            </button>
          </section>

          {/* Danger Zone */}
          <section className="pt-4 border-t border-surface-800">
            <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              Delete Project
            </button>
          </section>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-800 shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || isSaving || slugStatus === 'taken' || slugStatus === 'checking'}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? All screens and data will be permanently lost. This action cannot be undone."
        confirmLabel="Delete Project"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}

// --- Instance Control Panel ---

const SCALE_MODES: { value: ScaleMode; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Sleep after idle' },
  { value: 'always_on', label: 'Always On', desc: 'Never sleep' },
  { value: 'manual', label: 'Manual', desc: 'You control it' },
];

function InstanceControlPanel({
  deployment,
  isPaidPlan,
  projectId,
}: {
  deployment: Deployment;
  isPaidPlan: boolean;
  projectId: string;
}) {
  const { scale } = useDeployment(projectId);
  const { setDeployment } = useDeployStore();
  const [scaleModeLoading, setScaleModeLoading] = useState(false);

  const currentMode = deployment.scaleMode || 'auto';
  const desired = deployment.desiredInstances ?? (deployment.status === 'running' ? 1 : 0);
  const actual = deployment.actualInstances ?? (deployment.status === 'running' ? 1 : 0);
  const isRunning = deployment.status === 'running';
  const isSleeping = deployment.status === 'sleeping';
  const isTransitioning = deployment.status === 'provisioning' || deployment.status === 'warm' || deployment.status === 'deploying';

  const handleScaleModeChange = async (mode: ScaleMode) => {
    setScaleModeLoading(true);
    try {
      // Optimistic update
      setDeployment(projectId, { ...deployment, scaleMode: mode });
      await api.patch(`/projects/${projectId}/container/scale-mode`, { scaleMode: mode });
    } catch {
      // Revert on error
      setDeployment(projectId, { ...deployment });
    } finally {
      setScaleModeLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="w-3.5 h-3.5 text-surface-400" />
        <span className="text-xs font-medium text-surface-300">Instance Control</span>
      </div>

      {/* Current state: desired vs actual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-[10px] text-surface-500 mb-0.5">Desired</p>
            <span className={cn(
              'text-sm font-bold',
              desired > 0 ? 'text-emerald-400' : 'text-surface-500'
            )}>
              {desired}
            </span>
          </div>
          <div className="text-surface-700">/</div>
          <div className="text-center">
            <p className="text-[10px] text-surface-500 mb-0.5">Actual</p>
            <span className={cn(
              'text-sm font-bold',
              actual > 0 ? 'text-emerald-400' : 'text-surface-500',
              isTransitioning && 'text-yellow-400'
            )}>
              {isTransitioning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
              ) : actual}
            </span>
          </div>
        </div>

        {/* State badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium',
          isRunning && 'bg-emerald-500/10 text-emerald-400',
          isSleeping && 'bg-surface-800 text-surface-400',
          isTransitioning && 'bg-yellow-500/10 text-yellow-400',
        )}>
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            isRunning && 'bg-emerald-400',
            isSleeping && 'bg-surface-500',
            isTransitioning && 'bg-yellow-400 animate-pulse',
          )} />
          {isRunning ? 'Running' : isSleeping ? 'Sleeping' : isTransitioning ? 'Starting...' : deployment.status}
        </div>
      </div>

      {/* Scale mode selector */}
      <div>
        <p className="text-[10px] text-surface-500 mb-1.5">Scale mode</p>
        <div className="flex gap-1">
          {SCALE_MODES.map((mode) => {
            const isActive = currentMode === mode.value;
            const isDisabled = mode.value === 'always_on' && !isPaidPlan;
            return (
              <button
                key={mode.value}
                onClick={() => !isDisabled && handleScaleModeChange(mode.value)}
                disabled={scaleModeLoading || isDisabled}
                title={isDisabled ? 'Paid plan required' : mode.desc}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-surface-800 text-surface-500 border border-transparent hover:text-surface-300 hover:bg-surface-700',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                  scaleModeLoading && 'opacity-50 cursor-wait',
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual sleep/wake buttons */}
      {currentMode === 'manual' && (
        <div className="flex gap-2">
          {isSleeping && (
            <button
              onClick={() => scale(1)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Wake
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => scale(0)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-700 text-surface-400 text-[10px] font-medium hover:bg-surface-700 transition-colors"
            >
              <Moon className="w-3 h-3" />
              Sleep
            </button>
          )}
          {isTransitioning && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Starting...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
