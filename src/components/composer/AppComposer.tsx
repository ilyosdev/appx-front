import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
  ArrowUp,
  Wand2,
  Copy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { projectsApi } from '../../lib/projects';
import { paymentsApi } from '../../lib/payments';
import { styleExtractionApi } from '../../lib/style-extraction';
import { useAuthStore } from '../../stores/authStore';
import { useBillingStore } from '../../stores/billingStore';
import { useModelStore } from '../../stores/modelStore';

const EXAMPLE_PROMPTS = [
  'Fitness tracker with workouts & charts',
  'Food delivery with live tracking',
  'Meditation app with streaks',
];

const MIN_DESCRIPTION_LENGTH = 50;

interface AppComposerProps {
  showExamples?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
}

export function AppComposer({ showExamples = true, className, variant = 'dark' }: AppComposerProps) {
  const isLight = variant === 'light';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openUpgradeModal, openCreditModal } = useBillingStore();
  const { availableModels, fetchModels, getEffectiveModel, setSelectedModel } = useModelStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const [appDescription, setAppDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'inspire' | 'clone'>('inspire');

  const [credits, setCredits] = useState<number | null>(null);
  const [canPurchaseCredits, setCanPurchaseCredits] = useState(false);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  // Restore pending description from landing page redirect
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingAppDescription');
    if (pending && isAuthenticated) {
      setAppDescription(pending);
      sessionStorage.removeItem('pendingAppDescription');
      setTimeout(adjustTextarea, 0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      paymentsApi.getLimits()
        .then((response) => {
          const limits = response.data?.data || response.data;
          setCredits(limits?.credits?.remaining ?? null);
          setCanPurchaseCredits(limits?.canPurchaseCredits ?? false);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) setShowModelMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const isValid = appDescription.length >= MIN_DESCRIPTION_LENGTH;
  const hasCredits = !isAuthenticated || credits === null || credits > 0;
  const canSubmit = isValid && hasCredits && !isSubmitting;
  const effectiveModel = getEffectiveModel();

  const uploadImage = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      setPreviewUrl(URL.createObjectURL(file));
      const uploadResponse = await styleExtractionApi.uploadImage(file);
      setReferenceImageUrl(uploadResponse.imageUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload image');
      setPreviewUrl(null);
      setReferenceImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadImage(file);
        return;
      }
    }
  }, [uploadImage]);

  const clearImage = useCallback(() => {
    setPreviewUrl(null);
    setReferenceImageUrl(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (!isAuthenticated) {
      sessionStorage.setItem('pendingAppDescription', appDescription);
      navigate('/register', {
        state: { from: { pathname: '/dashboard' }, message: 'Sign up to generate your app' },
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStage('Creating project...');
    setError(null);
    try {
      if (credits !== null && credits < 1) {
        openUpgradeModal();
        setError('You need more credits.');
        setIsSubmitting(false);
        setSubmitStage(null);
        return;
      }
      const appName = appDescription.slice(0, 50).trim() + (appDescription.length > 50 ? '...' : '');

      const response = await projectsApi.create({
        name: appName,
        description: appDescription,
        appPurpose: appDescription,
        onboardingSteps: 1,
        paywallVariations: 0,
        language: 'en',
        currency: 'USD',
        platform: 'ios',
        ...(referenceImageUrl && { referenceImageUrl }),
      });
      const projectId = response.data.data.id;
      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;

      navigate(`/project/${projectId}/canvas`, {
        state: {
          isNewProject: true,
          pendingDesignSystem: {
            userInput: appDescription,
            referenceImageUrl: referenceImageUrl || undefined,
            imageMode: referenceImageUrl ? imageMode : undefined,
            modelId,
          },
        },
      });
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message || err?.message || '';
      const errorMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage || '');
      if (errorMessage.toLowerCase().includes('insufficient credits') || errorMessage.toLowerCase().includes('credits remaining')) {
        openUpgradeModal();
        setError('You need more credits.');
      } else {
        setError(errorMessage || 'Failed to create project.');
      }
      setIsSubmitting(false);
      setSubmitStage(null);
    }
  }, [canSubmit, isAuthenticated, credits, appDescription, referenceImageUrl, imageMode, navigate, openUpgradeModal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={className}>
      <div className="max-w-2xl mx-auto">
        <div className={cn(
          'rounded-2xl border transition-all duration-200',
          isLight ? 'bg-white' : 'bg-[#222225]',
          isSubmitting
            ? 'border-primary-500/40 shadow-lg shadow-primary-500/10'
            : isLight
              ? 'border-gray-200 shadow-[0_2px_20px_rgba(0,0,0,0.06)] hover:border-gray-300 focus-within:border-gray-300 focus-within:shadow-lg focus-within:shadow-black/[0.06]'
              : 'border-surface-700/60 hover:border-surface-600/80 focus-within:border-surface-500/60 focus-within:shadow-lg focus-within:shadow-black/20'
        )}>
          {/* Attached image with inspire/clone toggle */}
          <AnimatePresence>
            {(previewUrl || isUploading) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pt-3">
                  <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg", isLight ? 'bg-gray-50 border border-gray-200' : 'bg-surface-800 border border-surface-700')}>
                    {previewUrl && <img src={previewUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                        <span className={cn("text-xs", isLight ? 'text-gray-500' : 'text-surface-400')}>Uploading...</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1">
                        {/* Inspire / Clone pill toggle */}
                        <div className={cn("flex items-center rounded-md p-0.5", isLight ? 'bg-gray-100' : 'bg-surface-900')}>
                          <button
                            onClick={() => setImageMode('inspire')}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all',
                              imageMode === 'inspire'
                                ? isLight ? 'bg-primary-500/15 text-primary-600' : 'bg-primary-500/20 text-primary-300'
                                : isLight ? 'text-gray-400 hover:text-gray-600' : 'text-surface-500 hover:text-surface-300'
                            )}
                          >
                            <Wand2 className="w-3 h-3" />
                            Inspire
                          </button>
                          <button
                            onClick={() => setImageMode('clone')}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all',
                              imageMode === 'clone'
                                ? isLight ? 'bg-cyan-500/15 text-cyan-600' : 'bg-cyan-500/20 text-cyan-300'
                                : isLight ? 'text-gray-400 hover:text-gray-600' : 'text-surface-500 hover:text-surface-300'
                            )}
                          >
                            <Copy className="w-3 h-3" />
                            Clone
                          </button>
                        </div>
                      </div>
                    )}
                    <button onClick={clearImage} className={cn("p-0.5 transition-colors", isLight ? 'text-gray-400 hover:text-gray-600' : 'text-surface-500 hover:text-surface-300')}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={appDescription}
              onChange={(e) => { setAppDescription(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Describe the mobile app you want to build..."
              rows={1}
              disabled={isSubmitting}
              className={cn(
                'w-full bg-transparent text-[15px] resize-none outline-none leading-relaxed',
                isLight ? 'text-[#1a1615] placeholder:text-gray-400' : 'text-white placeholder:text-surface-500',
                isSubmitting && 'opacity-50'
              )}
              style={{ minHeight: '28px', maxHeight: '200px' }}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center gap-1.5 px-3 pb-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-all", isLight ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800')}
            >
              <Plus className="w-4 h-4" />
            </button>

            {!isAuthenticated && (
              <div ref={modelMenuRef} className="relative">
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all',
                    showModelMenu
                      ? isLight ? 'bg-gray-100 text-[#1a1615]' : 'bg-surface-700 text-white'
                      : isLight ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                  )}
                >
                  <Sparkles className={cn("w-3 h-3", isLight ? 'text-[#3b82f6]' : 'text-primary-400')} />
                  <span>Auto</span>
                </button>
                <AnimatePresence>
                  {showModelMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className={cn("absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-xl overflow-hidden z-50", isLight ? 'bg-white border border-gray-200 shadow-lg' : 'bg-surface-900 border border-surface-700')}
                    >
                      <div className={cn("p-2 border-b", isLight ? 'border-gray-100' : 'border-surface-800')}>
                        <p className={cn("text-[11px] font-medium text-center", isLight ? 'text-[#3b82f6]' : 'text-primary-400')}>Sign in to select a model</p>
                      </div>
                      <div className="p-1.5 opacity-50 pointer-events-none">
                        {availableModels.length > 0 ? availableModels.map((m) => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg">
                            <span className={cn("text-sm", isLight ? 'text-gray-700' : 'text-surface-300')}>{m.displayName}</span>
                            <span className={cn("text-xs", isLight ? 'text-gray-500' : 'text-surface-500')}>{m.isFree ? 'Free' : `${m.creditCost || 1}cr`}</span>
                          </div>
                        )) : (
                          <div className={cn("px-3 py-2 text-xs text-center", isLight ? 'text-gray-500' : 'text-surface-500')}>Loading models...</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {isAuthenticated && availableModels.length > 0 && effectiveModel && (
              <div ref={modelMenuRef} className="relative">
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all',
                    showModelMenu
                      ? isLight ? 'bg-gray-100 text-[#1a1615]' : 'bg-surface-700 text-white'
                      : isLight ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                  )}
                >
                  <Sparkles className={cn("w-3 h-3", isLight ? 'text-[#3b82f6]' : 'text-primary-400')} />
                  <span>{effectiveModel.displayName}</span>
                  <span className={isLight ? 'text-gray-400' : 'text-surface-600'}>{effectiveModel.creditCost}cr</span>
                </button>

                <AnimatePresence>
                  {showModelMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className={cn("absolute bottom-full left-0 mb-2 w-56 rounded-xl py-1 z-50", isLight ? 'bg-white border border-gray-200 shadow-lg' : 'bg-surface-800 border border-surface-700 shadow-2xl shadow-black/30')}
                    >
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => { setSelectedModel(model.id); setShowModelMenu(false); }}
                          className={cn(
                            'w-full text-left px-3 py-2.5 transition-colors',
                            model.id === effectiveModel.id
                              ? isLight ? 'bg-blue-50 text-[#1a1615]' : 'bg-primary-500/10 text-white'
                              : isLight ? 'text-gray-600 hover:bg-gray-50' : 'text-surface-300 hover:bg-surface-700/70'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{model.displayName}</span>
                            <span className={cn("text-xs", isLight ? 'text-gray-500' : 'text-surface-500')}>{model.creditCost}cr</span>
                          </div>
                          {model.description && (
                            <p className={cn("text-[11px] mt-0.5", isLight ? 'text-gray-500' : 'text-surface-500')}>{model.description}</p>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex-1 flex justify-end items-center pr-1">
              {appDescription.length > 0 && !isValid && (
                <span className={cn("text-[11px] tabular-nums", isLight ? 'text-gray-400' : 'text-surface-600')}>
                  {MIN_DESCRIPTION_LENGTH - appDescription.length} more chars
                </span>
              )}
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.05 } : {}}
              whileTap={canSubmit ? { scale: 0.95 } : {}}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200',
                canSubmit
                  ? isLight ? 'bg-[#1a1615] text-white shadow-md shadow-black/10 hover:shadow-black/20' : 'bg-white text-surface-900 shadow-md shadow-white/10 hover:shadow-white/20'
                  : isLight ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-surface-800 text-surface-600 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Status below card */}
        <AnimatePresence>
          {isSubmitting && submitStage && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 mt-3"
            >
              <Loader2 className={cn("w-3.5 h-3.5 animate-spin", isLight ? 'text-[#3b82f6]' : 'text-primary-400')} />
              <span className={cn("text-sm", isLight ? 'text-gray-500' : 'text-surface-400')}>{submitStage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 mt-3 px-1"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isSubmitting && isAuthenticated && credits !== null && credits === 0 && (
          <div className="flex items-center gap-2 mt-3 px-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-sm text-amber-400 flex-1">No credits remaining</span>
            <button
              onClick={() => canPurchaseCredits ? openCreditModal() : openUpgradeModal()}
              className={cn("text-xs font-medium transition-colors", isLight ? 'text-[#3b82f6] hover:text-blue-700' : 'text-primary-400 hover:text-primary-300')}
            >
              {canPurchaseCredits ? 'Buy credits' : 'Upgrade plan'}
            </button>
          </div>
        )}
      </div>

      {/* Example prompts */}
      {showExamples && (
        <div className="max-w-2xl mx-auto mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => { setAppDescription(prompt); setTimeout(adjustTextarea, 0); }}
              disabled={isSubmitting}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full transition-all disabled:opacity-40",
                isLight
                  ? 'bg-white border border-gray-200 text-[#555] hover:text-[#1a1615] hover:bg-gray-50 hover:border-gray-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  : 'bg-surface-800/40 border border-surface-700/40 text-surface-500 hover:text-surface-300 hover:bg-surface-800/70 hover:border-surface-600/60'
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
