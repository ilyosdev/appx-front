import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Loader2, Check, AlertTriangle, Eye, EyeOff, ImageOff, RefreshCw } from 'lucide-react';
import { projectsApi } from '@/lib/projects';
import { projectsApi as projectsApiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { generateProjectCover, generateScreenThumbnail } from '@/lib/screenshot';

interface ScreenInfo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  htmlContent?: string | null;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  isPublished: boolean;
  screens: ScreenInfo[];
  onPublishSuccess: () => void;
  onRefreshScreens: () => Promise<void>;
}

export function PublishModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  isPublished,
  screens,
  onPublishSuccess,
  onRefreshScreens,
}: PublishModalProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [publishingStep, setPublishingStep] = useState<string | null>(null);

  const maxDescriptionLength = 500;
  const remainingChars = maxDescriptionLength - description.length;

  const screensWithThumbnails = useMemo(() => 
    screens.filter(s => s.thumbnailUrl || s.imageUrl),
    [screens]
  );

  const screensWithoutThumbnails = useMemo(() => 
    screens.filter(s => !s.thumbnailUrl && !s.imageUrl),
    [screens]
  );

  const selectedEligibleScreens = useMemo(() => {
    if (selectedScreenIds.size === 0) {
      return screensWithThumbnails;
    }
    return screens.filter(s => 
      selectedScreenIds.has(s.id) && (s.thumbnailUrl || s.imageUrl)
    );
  }, [screens, selectedScreenIds, screensWithThumbnails]);

  const canPublish = selectedEligibleScreens.length >= 3;

  useEffect(() => {
    if (isOpen) {
      setSelectedScreenIds(new Set(screensWithThumbnails.map(s => s.id)));
    }
  }, [isOpen, screensWithThumbnails]);

  const toggleScreen = (screenId: string) => {
    setSelectedScreenIds(prev => {
      const next = new Set(prev);
      if (next.has(screenId)) {
        next.delete(screenId);
      } else {
        next.add(screenId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedScreenIds(new Set(screensWithThumbnails.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedScreenIds(new Set());
  };

  const handleGenerateThumbnails = useCallback(async () => {
    if (isGeneratingThumbnails) return;

    setIsGeneratingThumbnails(true);
    setError(null);

    try {
      const screensToGenerate = screens.filter(s => !s.thumbnailUrl && !s.imageUrl && s.htmlContent);

      if (screensToGenerate.length === 0) {
        setError('No screens available to generate thumbnails. Screens may be missing content.');
        setIsGeneratingThumbnails(false);
        return;
      }

      const failedScreens: string[] = [];

      for (const screen of screensToGenerate) {
        if (!screen.htmlContent) continue;

        try {
          const blob = await generateScreenThumbnail(screen.htmlContent);
          await projectsApiClient.uploadScreenThumbnail(projectId, screen.id, blob);
        } catch (err) {
          console.error(`Failed to generate thumbnail for screen ${screen.name}:`, err);
          failedScreens.push(screen.name);
        }
      }

      await onRefreshScreens();

      if (failedScreens.length > 0) {
        setError(`Failed to generate thumbnails for: ${failedScreens.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate thumbnails. Please try again.');
    } finally {
      setIsGeneratingThumbnails(false);
    }
  }, [projectId, isGeneratingThumbnails, onRefreshScreens, screens]);

  const handlePublish = useCallback(async () => {
    if (isLoading || !canPublish) return;
    
    setIsLoading(true);
    setError(null);
    setPublishingStep('Preparing screens...');

    try {
      const selectedIds = selectedScreenIds.size > 0 
        ? Array.from(selectedScreenIds).filter(id => {
            const screen = screens.find(s => s.id === id);
            return screen && (screen.thumbnailUrl || screen.imageUrl);
          })
        : undefined;

      const screensForCover = selectedIds 
        ? screens.filter(s => selectedIds.includes(s.id))
        : selectedEligibleScreens;
      
      const imageUrls = screensForCover
        .slice(0, 5)
        .map(s => s.imageUrl || s.thumbnailUrl)
        .filter((url): url is string => !!url);

      if (imageUrls.length < 3) {
        throw new Error('At least 3 screens with images are required to generate a cover');
      }

      setPublishingStep('Generating cover image...');
      const coverBlob = await generateProjectCover(imageUrls);
      
      setPublishingStep('Uploading cover image...');
      const coverResult = await projectsApiClient.uploadCoverImage(projectId, coverBlob);
      
      setPublishingStep('Publishing to gallery...');
      await projectsApi.publish(projectId, {
        galleryDescription: description.trim() || undefined,
        selectedScreenIds: selectedIds,
        coverImageUrl: coverResult.url,
      });
      
      setPublishingStep('Done!');
      onPublishSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to publish project. Please try again.');
    } finally {
      setIsLoading(false);
      setPublishingStep(null);
    }
  }, [projectId, description, isLoading, canPublish, selectedScreenIds, screens, selectedEligibleScreens, onPublishSuccess, onClose]);

  const handleUnpublish = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await projectsApi.unpublish(projectId);
      onPublishSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unpublish project. Please try again.');
    } finally {
      setIsLoading(false);
      setShowUnpublishConfirm(false);
    }
  }, [projectId, isLoading, onPublishSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (isLoading || isGeneratingThumbnails) return;
    setError(null);
    setShowUnpublishConfirm(false);
    onClose();
  }, [isLoading, isGeneratingThumbnails, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-4 bg-surface-900 rounded-2xl border border-surface-700/50 shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  isPublished 
                    ? "bg-emerald-500/10" 
                    : "bg-primary-500/10"
                )}>
                  <Globe className={cn(
                    "w-5 h-5",
                    isPublished ? "text-emerald-400" : "text-primary-400"
                  )} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {isPublished ? 'Manage Publication' : 'Publish to Gallery'}
                  </h2>
                  <p className="text-sm text-surface-400">
                    {isPublished 
                      ? 'Your project is live in the gallery' 
                      : 'Share your design with the community'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading || isGeneratingThumbnails}
                className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/30 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-white truncate">{projectName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-surface-400">
                        {screens.length} total screens
                      </span>
                      {isPublished && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!isPublished && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-300">
                        Select Screens to Publish
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAll}
                          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          Select All
                        </button>
                        <span className="text-surface-600">·</span>
                        <button
                          onClick={deselectAll}
                          className="text-xs text-surface-400 hover:text-surface-300 transition-colors"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-700 bg-surface-800/30">
                      {screens.length === 0 ? (
                        <div className="p-4 text-center text-surface-500 text-sm">
                          No screens in this project
                        </div>
                      ) : (
                        <div className="divide-y divide-surface-700/50">
                          {screens.map((screen) => {
                            const hasThumbnail = screen.thumbnailUrl || screen.imageUrl;
                            const isSelected = selectedScreenIds.has(screen.id);
                            
                            return (
                              <label
                                key={screen.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                                  hasThumbnail 
                                    ? "hover:bg-surface-700/30" 
                                    : "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected && !!hasThumbnail}
                                  disabled={!hasThumbnail}
                                  onChange={() => hasThumbnail && toggleScreen(screen.id)}
                                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 disabled:opacity-50"
                                />
                                <div className="w-8 h-14 rounded-md overflow-hidden bg-surface-700 flex-shrink-0">
                                  {hasThumbnail ? (
                                    <img 
                                      src={screen.thumbnailUrl || screen.imageUrl || ''} 
                                      alt={screen.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-3 h-3 text-surface-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-white truncate block">{screen.name}</span>
                                  {!hasThumbnail && (
                                    <span className="text-xs text-amber-400">No thumbnail</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {screensWithoutThumbnails.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <ImageOff className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-amber-300">
                            {screensWithoutThumbnails.length} screen{screensWithoutThumbnails.length > 1 ? 's' : ''} missing thumbnails
                          </span>
                        </div>
                        <button
                          onClick={handleGenerateThumbnails}
                          disabled={isGeneratingThumbnails}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-amber-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {isGeneratingThumbnails ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Generate
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className={cn(
                      "text-sm px-1",
                      canPublish ? "text-surface-400" : "text-amber-400"
                    )}>
                      {canPublish ? (
                        <>{selectedEligibleScreens.length} screens will be published</>
                      ) : (
                        <>Select at least 3 screens with thumbnails to publish (currently {selectedEligibleScreens.length})</>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium text-surface-300">
                        Gallery Description
                        <span className="text-surface-500 font-normal ml-1">(optional)</span>
                      </span>
                      <span className={cn(
                        "text-xs transition-colors",
                        remainingChars < 50 
                          ? remainingChars < 0 
                            ? "text-red-400" 
                            : "text-amber-400"
                          : "text-surface-500"
                      )}>
                        {remainingChars} characters remaining
                      </span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your project for the gallery. What makes it unique? What problem does it solve?"
                      maxLength={maxDescriptionLength + 50}
                      disabled={isLoading}
                      className={cn(
                        "w-full h-24 px-4 py-3 rounded-xl resize-none",
                        "bg-surface-800 border text-white placeholder-surface-500",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50",
                        "transition-all disabled:opacity-50",
                        remainingChars < 0 
                          ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50"
                          : "border-surface-700"
                      )}
                    />
                  </div>
                </>
              )}

              {isPublished && (
                <div className="p-4 rounded-xl bg-surface-950/50 border border-surface-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-surface-400" />
                    <span className="text-sm font-medium text-surface-300">Status</span>
                  </div>
                  <p className="text-sm text-surface-400 leading-relaxed">
                    Your project is currently visible in the public gallery. Anyone can view and get inspired by your designs.
                  </p>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              {isPublished && showUnpublishConfirm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-200 font-medium mb-1">
                        Are you sure you want to unpublish?
                      </p>
                      <p className="text-xs text-amber-400/80 mb-3">
                        Your project will be removed from the public gallery and won't be visible to other users.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUnpublish}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-amber-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Yes, Unpublish'
                          )}
                        </button>
                        <button
                          onClick={() => setShowUnpublishConfirm(false)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-surface-800 bg-surface-900/50">
              {isPublished ? (
                <>
                  <button
                    onClick={() => setShowUnpublishConfirm(true)}
                    disabled={isLoading || showUnpublishConfirm}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <EyeOff className="w-4 h-4" />
                    Unpublish
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-surface-800 text-white hover:bg-surface-700 transition-colors disabled:opacity-50"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleClose}
                    disabled={isLoading || isGeneratingThumbnails}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isLoading || !canPublish || remainingChars < 0}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[180px] justify-center",
                      "bg-primary-500 text-white shadow-lg shadow-primary-500/20",
                      "hover:bg-primary-400 hover:shadow-primary-500/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    )}
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{publishingStep || 'Publishing...'}</span>
                        </div>
                        <span className="text-xs text-primary-200 mt-0.5">This may take ~10 seconds</span>
                      </div>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        Publish to Gallery
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
