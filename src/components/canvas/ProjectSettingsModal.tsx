import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { projectsApi, type Project } from '@/lib/projects';
import { Loader2, Check, X, Upload, Trash2, Wand2, Key, FileCode, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { slugify } from '@/lib/slugify';
import { rewriteStorageUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { EnvVarsPanel } from './EnvVarsPanel';

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
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
    }
  }, [isOpen, project]);

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
      <Modal isOpen={isOpen} onClose={onClose} title="Project Settings" size="lg">
        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-surface-800">
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
      </Modal>

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
