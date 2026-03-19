import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ImagePlus, Upload, Link as LinkIcon, X, CheckCircle, Copy, AlertCircle, Coins, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { projectsApi } from '../lib/projects';
import { paymentsApi } from '../lib/payments';
import { useAuthStore } from '../stores/authStore';
import { useBillingStore } from '../stores/billingStore';
import { useModelStore } from '../stores/modelStore';
import { styleExtractionApi, type VisualInspiration } from '../lib/style-extraction';

const EXAMPLE_PROMPTS = [
  'Fintech app for managing crypto portfolio with real-time price alerts and portfolio analytics',
  'Food delivery app with restaurant discovery, live order tracking, and social reviews',
  'Meditation app with daily reminders, sleep sounds, and progress tracking for mindfulness',
];

const MIN_DESCRIPTION_LENGTH = 50;

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openUpgradeModal, openCreditModal } = useBillingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [appDescription, setAppDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Credits state
  const [credits, setCredits] = useState<number | null>(null);
  const [canPurchaseCredits, setCanPurchaseCredits] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Reference image state
  const [showInspiration, setShowInspiration] = useState(false);
  const [inspirationMethod, setInspirationMethod] = useState<'upload' | 'url' | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inspiration, setInspiration] = useState<VisualInspiration | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [replicateMode, setReplicateMode] = useState<'replicate' | 'inspire'>('replicate');

  // API/Swagger integration state
  const [showApiConnect, setShowApiConnect] = useState(false);
  const [swaggerUrl, setSwaggerUrl] = useState('');

  const isValid = appDescription.length >= MIN_DESCRIPTION_LENGTH;

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload image to server
      const uploadResponse = await styleExtractionApi.uploadImage(file);
      const uploadedImageUrl = uploadResponse.imageUrl;
      setReferenceImageUrl(uploadedImageUrl);

      // Get visual inspiration from image (now includes detected screens)
      const inspirationResponse = await styleExtractionApi.getVisualInspiration(uploadedImageUrl, '');
      setInspiration(inspirationResponse.data.data);
    } catch (err: any) {
      console.error('Style extraction failed:', err);
      setError(err?.response?.data?.message || 'Failed to analyze image');
      setPreviewUrl(null);
      setReferenceImageUrl(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Handle URL submit
  const handleUrlSubmit = useCallback(async () => {
    if (!imageUrl.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setPreviewUrl(imageUrl);
    setReferenceImageUrl(imageUrl);

    try {
      const inspirationResponse = await styleExtractionApi.getVisualInspiration(imageUrl, '');
      setInspiration(inspirationResponse.data.data);
    } catch (err: any) {
      console.error('Style extraction failed:', err);
      setError(err?.response?.data?.message || 'Failed to analyze image');
      setPreviewUrl(null);
      setReferenceImageUrl(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageUrl]);

  // Clear inspiration
  const clearInspiration = useCallback(() => {
    setInspiration(null);
    setPreviewUrl(null);
    setImageUrl('');
    setInspirationMethod(null);
    setReferenceImageUrl(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    if (!isAuthenticated) {
      sessionStorage.setItem('pendingAppDescription', appDescription);
      if (inspiration) {
        sessionStorage.setItem('pendingInspiration', JSON.stringify(inspiration));
      }
      navigate('/login', {
        state: { from: { pathname: '/project/new' }, message: 'Please sign in to generate your app' },
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStage('Creating project...');
    setError(null);

    try {
      // Check credits BEFORE creating project (costs 1 credit per operation)
      const PROJECT_CREATE_COST = 1;
      if (credits !== null && credits < PROJECT_CREATE_COST) {
        openUpgradeModal();
        setError('You need more credits to generate this project.');
        setIsSubmitting(false);
        setSubmitStage(null);
        return;
      }

      const appName = appDescription.slice(0, 50).trim() + (appDescription.length > 50 ? '...' : '');

      // Check if we have detected screens from the screenshot analysis
      const detectedScreens = inspiration?.detectedScreens;
      const hasDetectedScreens = detectedScreens && detectedScreens.length > 0;
      const shouldReplicate = replicateMode === 'replicate' && hasDetectedScreens;

      const response = await projectsApi.create({
        name: appName,
        description: appDescription,
        appPurpose: appDescription,
        // Single onboarding page only (users can create more via chat), or 0 if replicating screens
        onboardingSteps: shouldReplicate ? 0 : 1,
        paywallVariations: 0,
        language: 'en',
        currency: 'USD',
        platform: 'ios',
        // Pass reference image URL if uploaded
        ...(referenceImageUrl && { referenceImageUrl }),
        // Only pass detected screens when in replicate mode
        ...(shouldReplicate && {
          detectedScreens,
          replicateReference: true,
        }),
        ...(inspiration && {
          stylePreferences: {
            aesthetic: inspiration.combinedInspiration || inspiration.aiObservations,
          },
        }),
        // Pass Swagger/API documentation URL
        ...(swaggerUrl.trim() && { apiDocumentation: swaggerUrl.trim() }),
      });

      const projectId = response.data.data.id;
      sessionStorage.removeItem('pendingAppDescription');
      sessionStorage.removeItem('pendingInspiration');

      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;

      navigate(`/project/${projectId}/canvas`, {
        state: {
          isNewProject: true,
          pendingDesignSystem: {
            userInput: appDescription,
            referenceImageUrl: referenceImageUrl || undefined,
            imageMode: referenceImageUrl ? (replicateMode === 'replicate' ? 'clone' : 'inspire') : undefined,
            modelId,
          },
        },
      });
    } catch (err: any) {
      console.error('Failed to create project:', err);
      
      const rawMessage = err?.response?.data?.message || err?.message || '';
      const errorMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage || '');
      const isCreditsError = errorMessage.toLowerCase().includes('insufficient credits') || 
                            errorMessage.toLowerCase().includes('credits remaining');
      
      if (isCreditsError) {
        openUpgradeModal();
        setError('You need more credits to generate this project.');
      } else {
        setError(errorMessage || 'Failed to create project. Please try again.');
      }
      setIsSubmitting(false);
      setSubmitStage(null);
    }
  }, [isValid, isAuthenticated, navigate, appDescription, inspiration, replicateMode, referenceImageUrl, openUpgradeModal, credits]);

  // Restore description and inspiration if returning from login
  useEffect(() => {
    const savedDescription = sessionStorage.getItem('pendingAppDescription');
    if (savedDescription) {
      setAppDescription(savedDescription);
    }
    const savedInspiration = sessionStorage.getItem('pendingInspiration');
    if (savedInspiration) {
      try {
        setInspiration(JSON.parse(savedInspiration));
        setShowInspiration(true);
      } catch (e) {
        console.error('Failed to restore inspiration:', e);
      }
    }
  }, []);

  // Auto-detect locale for defaults
  useEffect(() => {
    // Could add locale detection here if needed
  }, []);

  // Fetch credits when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingCredits(true);
      paymentsApi.getLimits()
        .then((response) => {
          // Response structure: { data: { credits: { remaining: number }, canPurchaseCredits: boolean } }
          const limits = response.data?.data || response.data;
          setCredits(limits?.credits?.remaining ?? null);
          setCanPurchaseCredits(limits?.canPurchaseCredits ?? false);
        })
        .catch((err) => {
          console.error('Failed to fetch credits:', err);
        })
        .finally(() => {
          setIsLoadingCredits(false);
        });
    }
  }, [isAuthenticated]);

  const charCount = appDescription.length;
  const progress = Math.min((charCount / MIN_DESCRIPTION_LENGTH) * 100, 100);
  const hasCredits = !isAuthenticated || credits === null || credits > 0;
  const canSubmit = isValid && hasCredits && !isSubmitting;

  return (
    <div className="min-h-screen bg-surface-950 text-white overflow-hidden">
      {/* Back button header */}
      <div className="sticky top-0 z-20 bg-surface-950/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-surface-300">AI-Powered Design</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-white via-white to-surface-400 bg-clip-text text-transparent">
              Create Your App
            </span>
          </h1>
          <p className="text-surface-400 text-lg">
            Describe your app and we'll generate beautiful screens
          </p>
          {/* Credit indicator for authenticated users */}
          {isAuthenticated && !isLoadingCredits && credits !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full',
                credits > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              )}
            >
              <Coins className="w-4 h-4" />
              <span className="text-sm font-medium">
                {credits > 0 ? `${credits} credit${credits !== 1 ? 's' : ''} remaining` : 'No credits remaining'}
              </span>
            </motion.div>
          )}
        </motion.header>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Description Input */}
          <div className="relative">
            <textarea
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="Describe your mobile app... e.g., 'A fitness tracking app for busy professionals. Features workout logging, progress charts, and social challenges. Modern, energetic vibe with dark mode.'"
              rows={5}
              disabled={isSubmitting}
              className={cn(
                'w-full px-5 py-4 rounded-2xl bg-white/5 border-2 text-white placeholder:text-surface-500',
                'resize-none outline-none transition-all duration-200',
                'focus:bg-white/[0.07] focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/10',
                isValid ? 'border-primary-500/30' : 'border-white/10',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            />

            {/* Character count */}
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', isValid ? 'bg-emerald-500' : 'bg-primary-500')}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className={cn(
                'text-sm font-medium tabular-nums',
                isValid ? 'text-emerald-400' : charCount > 0 ? 'text-primary-400' : 'text-surface-500'
              )}>
                {isValid ? `${charCount} chars` : `${charCount}/${MIN_DESCRIPTION_LENGTH} min`}
              </span>
            </div>
          </div>

          {/* Example prompts */}
          <div className="space-y-2">
            <p className="text-sm text-surface-400">Need inspiration?</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setAppDescription(prompt)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-surface-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                  {prompt.length > 45 ? prompt.slice(0, 45) + '...' : prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Image Section */}
          <div className="space-y-3">
            {!showInspiration && !inspiration ? (
              <button
                onClick={() => setShowInspiration(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" />
                Add reference image for style inspiration
              </button>
            ) : (
              <AnimatePresence mode="wait">
                {inspiration ? (
                  // Show inspiration result
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
                  >
                    <div className="flex items-start gap-3">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Reference"
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">
                            {inspiration.detectedScreens && inspiration.detectedScreens.length > 0
                              ? `${inspiration.detectedScreens.length} screen${inspiration.detectedScreens.length > 1 ? 's' : ''} detected`
                              : 'Style captured'}
                          </span>
                        </div>
                        {inspiration.detectedScreens && inspiration.detectedScreens.length > 0 ? (
                          <p className="text-xs text-surface-400 line-clamp-2">
                            {inspiration.detectedScreens.map(s => s.name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-surface-400 line-clamp-2">
                            {inspiration.aiObservations || inspiration.combinedInspiration}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={clearInspiration}
                        className="p-1 text-surface-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Replicate/Inspire Toggle */}
                    {inspiration.detectedScreens && inspiration.detectedScreens.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setReplicateMode('replicate')}
                          title="Recreate these exact screens with your description"
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                            replicateMode === 'replicate'
                              ? 'bg-primary-500 text-white'
                              : 'bg-white/5 text-surface-400 hover:bg-white/10'
                          )}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Replicate
                        </button>
                        <button
                          onClick={() => setReplicateMode('inspire')}
                          title="Use the visual style as inspiration for new screens"
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                            replicateMode === 'inspire'
                              ? 'bg-primary-500 text-white'
                              : 'bg-white/5 text-surface-400 hover:bg-white/10'
                          )}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Inspire
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : isAnalyzing ? (
                  // Show analyzing state
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Reference"
                          className="w-12 h-12 rounded-lg object-cover opacity-50"
                        />
                      )}
                      <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                      <span className="text-sm text-surface-300">Analyzing style...</span>
                    </div>
                  </motion.div>
                ) : (
                  // Show upload options
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Add reference image</span>
                      <button
                        onClick={() => setShowInspiration(false)}
                        className="p-1 text-surface-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      {/* Upload button */}
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div
                          className={cn(
                            'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all',
                            inspirationMethod === 'upload'
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                          )}
                        >
                          <Upload className="w-4 h-4 text-surface-400" />
                          <span className="text-sm text-surface-300">Upload</span>
                        </div>
                      </label>

                      {/* URL button */}
                      <button
                        onClick={() => setInspirationMethod(inspirationMethod === 'url' ? null : 'url')}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all',
                          inspirationMethod === 'url'
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        )}
                      >
                        <LinkIcon className="w-4 h-4 text-surface-400" />
                        <span className="text-sm text-surface-300">URL</span>
                      </button>
                    </div>

                    {/* URL input */}
                    <AnimatePresence>
                      {inspirationMethod === 'url' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex gap-2"
                        >
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500"
                          />
                          <button
                            onClick={handleUrlSubmit}
                            disabled={!imageUrl.trim()}
                            className="px-4 py-2 bg-primary-500 hover:bg-primary-400 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Go
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Connect API Section */}
          <div className="space-y-3">
            {!showApiConnect ? (
              <button
                onClick={() => setShowApiConnect(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <LinkIcon className="w-4 h-4" />
                Connect API (Swagger/OpenAPI)
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Connect API</span>
                  <button
                    onClick={() => { setShowApiConnect(false); setSwaggerUrl(''); }}
                    className="p-1 text-surface-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-surface-500">
                  Provide a Swagger/OpenAPI URL and the AI will generate screens with real API integration.
                </p>
                <input
                  type="url"
                  value={swaggerUrl}
                  onChange={(e) => setSwaggerUrl(e.target.value)}
                  placeholder="https://api.example.com/swagger.json"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                />
                {swaggerUrl.trim() && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    API URL will be analyzed during planning
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* No credits warning */}
          {isAuthenticated && credits !== null && credits === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1">
                    You've run out of credits
                  </p>
                  <p className="text-xs text-surface-400 mb-3">
                    {canPurchaseCredits
                      ? 'Purchase more credits to continue creating beautiful app designs.'
                      : 'Upgrade your plan to continue creating beautiful app designs.'}
                  </p>
                  <div className="flex gap-2">
                    {canPurchaseCredits ? (
                      <>
                        <button
                          onClick={() => openCreditModal()}
                          className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Buy Credits
                        </button>
                        <button
                          onClick={() => openUpgradeModal()}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Upgrade Plan
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openUpgradeModal()}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Upgrade Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200',
              canSubmit
                ? 'bg-gradient-to-r from-primary-500 to-cyan-500 text-white shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-[1.01]'
                : 'bg-white/10 text-surface-500 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {submitStage || 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate My App
              </>
            )}
          </button>

          {/* Info */}
          <p className="text-xs text-center text-surface-500">
            {inspiration?.detectedScreens && inspiration.detectedScreens.length > 0 && replicateMode === 'replicate'
              ? `Replicating ${inspiration.detectedScreens.length} screen${inspiration.detectedScreens.length > 1 ? 's' : ''} from your reference. Takes ~2 minutes.`
              : inspiration?.detectedScreens && inspiration.detectedScreens.length > 0 && replicateMode === 'inspire'
              ? 'Using reference style to inspire new designs. Takes ~2 minutes.'
              : 'Generates screens based on your app description. Takes ~2 minutes.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
