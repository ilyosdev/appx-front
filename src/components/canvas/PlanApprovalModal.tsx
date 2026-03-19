import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, Sparkles, Palette, Navigation, Check, Loader2, SendHorizontal, MessageCircle, ChevronDown, Globe, Tag, Smartphone, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DesignSystem, ScreenConfig, ColorPalette } from '@/lib/design-system';
import { designSystemApi } from '@/lib/design-system';
import { useModelStore } from '@/stores/modelStore';

interface PlanApprovalModalProps {
  designSystem: DesignSystem;
  projectId: string;
  onApprove: (editedDesignSystem: DesignSystem) => void;
  onCancel: () => void;
  streamingSections?: Record<string, any>;
  isStreaming?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const NAV_TYPE_LABELS: Record<string, string> = {
  bottom_tabs: 'Bottom Tabs',
  hamburger: 'Hamburger Menu',
  top_tabs: 'Top Tabs',
  none: 'None',
};

const sectionAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-surface-700/50" />
        <span className="text-sm font-medium text-surface-500">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-surface-800/60 rounded w-3/4" />
        <div className="h-4 bg-surface-800/60 rounded w-1/2" />
      </div>
    </div>
  );
}

const COLOR_PALETTE_DISPLAY_KEYS: Array<{ key: keyof ColorPalette; label: string }> = [
  { key: 'background', label: 'BG' },
  { key: 'surface', label: 'Surface' },
  { key: 'card', label: 'Card' },
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentLight', label: 'Accent Lt' },
  { key: 'gold', label: 'Gold' },
  { key: 'error', label: 'Error' },
  { key: 'tabActive', label: 'Tab Active' },
];

export function PlanApprovalModal({
  designSystem,
  projectId,
  onApprove,
  onCancel,
  streamingSections,
  isStreaming = false,
}: PlanApprovalModalProps) {
  const [editedDesignSystem, setEditedDesignSystem] = useState<DesignSystem>(designSystem);
  const [editedScreens, setEditedScreens] = useState<ScreenConfig[]>(
    designSystem.screens?.map(s => ({ ...s })) || []
  );
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync from parent when full design system arrives (after streaming completes)
  useEffect(() => {
    if (designSystem && designSystem.screens?.length > 0) {
      setEditedDesignSystem(designSystem);
      setEditedScreens(designSystem.screens.map(s => ({ ...s })));
    }
  }, [designSystem]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const duplicateNames = useMemo(() => {
    const names = editedScreens.map(s => s.name.trim().toLowerCase());
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const name of names) {
      if (name && seen.has(name)) dupes.add(name);
      seen.add(name);
    }
    return dupes;
  }, [editedScreens]);

  const hasDuplicates = duplicateNames.size > 0;

  const updateScreen = useCallback((index: number, field: keyof ScreenConfig, value: string) => {
    setEditedScreens(prev =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const removeScreen = useCallback((index: number) => {
    setEditedScreens(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addScreen = useCallback(() => {
    const newScreen: ScreenConfig = {
      id: crypto.randomUUID(),
      name: 'New Screen',
      purpose: '',
      layoutDescription: '',
    };
    setEditedScreens(prev => [...prev, newScreen]);
  }, []);

  const toggleScreenExpanded = useCallback((screenId: string) => {
    setExpandedScreens(prev => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  }, []);

  const summarizeChanges = useCallback((prev: DesignSystem, next: DesignSystem): string => {
    const changes: string[] = [];
    if (prev.themeMode !== next.themeMode) {
      changes.push(`Switched to ${next.themeMode} mode`);
    }
    const colorKeys = ['primary', 'secondary', 'accent', 'background', 'card'] as const;
    const changedColors = colorKeys.filter(k => prev.theme[k] !== next.theme[k]);
    if (changedColors.length > 0) {
      changes.push(`Updated ${changedColors.join(', ')} color${changedColors.length > 1 ? 's' : ''}`);
    }
    if (prev.theme.fontSans !== next.theme.fontSans) {
      changes.push(`Changed font to ${next.theme.fontSans}`);
    }
    if (prev.navigation.type !== next.navigation.type) {
      changes.push(`Changed navigation to ${NAV_TYPE_LABELS[next.navigation.type] || next.navigation.type}`);
    }
    const prevIds = new Set(prev.screens.map(s => s.id));
    const nextIds = new Set(next.screens.map(s => s.id));
    const added = next.screens.filter(s => !prevIds.has(s.id));
    const removed = prev.screens.filter(s => !nextIds.has(s.id));
    if (added.length > 0) changes.push(`Added ${added.map(s => s.name).join(', ')}`);
    if (removed.length > 0) changes.push(`Removed ${removed.map(s => s.name).join(', ')}`);
    const enriched = next.screens.filter(ns => {
      const ps = prev.screens.find(s => s.id === ns.id);
      return ps && (ps.purpose !== ns.purpose || ps.layoutDescription !== ns.layoutDescription);
    });
    if (enriched.length > 0) {
      changes.push(`Enriched ${enriched.map(s => s.name).join(', ')}`);
    }
    return changes.length > 0 ? changes.join('. ') + '.' : 'Plan updated.';
  }, []);

  const handleRefine = useCallback(async () => {
    if (!chatInput.trim() || isRefining) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMsg }]);
    setIsRefining(true);
    try {
      const dsToRefine: DesignSystem = { ...editedDesignSystem, screens: editedScreens };
      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;
      const response = await designSystemApi.refine(projectId, dsToRefine, userMsg, modelId);
      const refined = (response.data as any).data?.designSystem ?? response.data.designSystem;
      if (!refined || !refined.screens) throw new Error('Invalid response from AI');
      const summary = summarizeChanges(dsToRefine, refined);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: summary }]);
      setEditedDesignSystem(refined);
      setEditedScreens(refined.screens.map((s: ScreenConfig) => ({ ...s })));
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Something went wrong';
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Failed to refine: ${errorMsg}` }]);
    } finally {
      setIsRefining(false);
    }
  }, [chatInput, isRefining, editedDesignSystem, editedScreens, projectId, summarizeChanges]);

  const handleApprove = useCallback(() => {
    if (editedScreens.length === 0) return;
    const finalDS: DesignSystem = { ...editedDesignSystem, screens: editedScreens };
    onApprove(finalDS);
  }, [editedScreens, editedDesignSystem, onApprove]);

  // Determine what to show: streaming sections or full design system
  const hasSection = (key: string) => streamingSections?.[key] !== undefined || (editedDesignSystem as any)?.[key] !== undefined;
  const appMetadata = editedDesignSystem.appMetadata || streamingSections?.appMetadata;
  const colorPalette = editedDesignSystem.colorPalette || streamingSections?.colorPalette;
  const reasoning = editedDesignSystem.designReasoning || streamingSections?.designReasoning;
  const apiIntegration = editedDesignSystem.apiIntegration || streamingSections?.apiIntegration;
  const theme = editedDesignSystem.theme;

  // Fallback color swatches from theme (for backward compat when no colorPalette)
  const themeSwatches = [
    { label: 'Primary', value: theme.primary },
    { label: 'Secondary', value: theme.secondary },
    { label: 'Accent', value: theme.accent },
    { label: 'Background', value: theme.background },
    { label: 'Card', value: theme.card },
    { label: 'Destructive', value: theme.destructive },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/95 backdrop-blur-xl"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
          className="bg-surface-900 border border-surface-700/50 rounded-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {appMetadata?.appName || editedDesignSystem.projectName || 'Your App Plan'}
                </h2>
                <p className="text-sm text-surface-400">
                  {appMetadata?.tagline || editedDesignSystem.projectName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isStreaming && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                  <span className="text-xs text-primary-400">Streaming plan...</span>
                </div>
              )}
              <button
                onClick={onCancel}
                className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Two-column body */}
          <div className="flex-1 flex min-h-0">
            {/* Left: Chat */}
            <div className="w-[340px] flex-shrink-0 border-r border-surface-700/50 flex flex-col">
              <div className="px-4 py-3 border-b border-surface-700/30">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-surface-400" />
                  <h3 className="text-sm font-medium text-surface-300">Refine with AI</h3>
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  Change theme, screens, navigation, or enrich screen content
                </p>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <Sparkles className="w-8 h-8 text-surface-700 mb-3" />
                    <p className="text-xs text-surface-500 leading-relaxed">
                      Try things like:<br />
                      <span className="text-surface-400">"make it darker"</span><br />
                      <span className="text-surface-400">"add a Settings screen"</span><br />
                      <span className="text-surface-400">"enrich the Home screen with stats and activity feed"</span><br />
                      <span className="text-surface-400">"use a warmer color palette"</span>
                    </p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'text-xs px-3 py-2 rounded-xl max-w-[90%]',
                      msg.role === 'user'
                        ? 'ml-auto bg-primary-500/20 text-primary-200 border border-primary-500/20'
                        : 'mr-auto bg-surface-800 text-surface-300 border border-surface-700/50'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {isRefining && (
                  <div className="mr-auto flex items-center gap-2 text-xs text-surface-500 px-3 py-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refining plan...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-3 border-t border-surface-700/30">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRefine();
                      }
                    }}
                    placeholder="Describe changes..."
                    disabled={isRefining || isStreaming}
                    className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={!chatInput.trim() || isRefining || isStreaming}
                    className="p-2 rounded-lg bg-primary-500/15 border border-primary-500/30 text-primary-400 hover:bg-primary-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SendHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Plan preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* App Identity */}
              {appMetadata ? (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">App Identity</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/50 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 border border-surface-700 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{appMetadata.displayName?.[0] || 'A'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{appMetadata.appName}</p>
                        <p className="text-xs text-surface-400">{appMetadata.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className="px-2 py-0.5 text-[10px] rounded bg-surface-800 border border-surface-700 text-surface-400">
                        {appMetadata.slug}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] rounded bg-surface-800 border border-surface-700 text-surface-400">
                        {appMetadata.bundleId}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : isStreaming ? (
                <SectionSkeleton label="App Identity" />
              ) : null}

              {/* Design Reasoning */}
              {reasoning ? (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">Design Reasoning</h3>
                  </div>
                  <p className="text-xs text-surface-400 leading-relaxed">{reasoning}</p>
                </motion.div>
              ) : isStreaming ? (
                <SectionSkeleton label="Design Reasoning" />
              ) : null}

              {/* Color Palette */}
              {colorPalette ? (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">Color Palette</h3>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-surface-800 border border-surface-700 text-surface-400">
                      constants/colors.ts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PALETTE_DISPLAY_KEYS.map(({ key, label }) => {
                      const value = colorPalette[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <div
                            title={`${key}: ${value}`}
                            className="w-8 h-8 rounded-lg border border-surface-700 cursor-default shadow-sm"
                            style={{ backgroundColor: value }}
                          />
                          <span className="text-[9px] text-surface-500 leading-none">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : hasSection('theme') ? (
                // Fallback: show theme colors (backward compat)
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">Theme</h3>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-800 border border-surface-700 text-surface-300">
                      {editedDesignSystem.themeMode === 'dark' ? 'Dark' : 'Light'}
                    </span>
                    <div className="flex items-center gap-3">
                      {themeSwatches.map(({ label, value }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <div
                            title={`${label}: ${value}`}
                            className="w-7 h-7 rounded-lg border border-surface-700 cursor-default"
                            style={{ backgroundColor: value }}
                          />
                          <span className="text-[10px] text-surface-500 leading-none">{label}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-surface-500 ml-1">{theme.fontSans}</span>
                  </div>
                </motion.div>
              ) : isStreaming ? (
                <SectionSkeleton label="Color Palette" />
              ) : null}

              {/* Navigation */}
              {hasSection('navigation') ? (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">Navigation</h3>
                  </div>
                  {/* Tab bar mockup */}
                  <div className="rounded-xl bg-surface-800/60 border border-surface-700/50 p-3">
                    <div className="flex items-center gap-1 mb-2">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary-500/15 border border-primary-500/30 text-primary-400">
                        {NAV_TYPE_LABELS[editedDesignSystem.navigation.type] ?? editedDesignSystem.navigation.type}
                      </span>
                    </div>
                    {editedDesignSystem.navigation.type === 'bottom_tabs' && (
                      <div
                        className="flex items-center justify-around rounded-xl px-2 py-2.5 border"
                        style={{
                          backgroundColor: colorPalette?.tabBar || theme.background,
                          borderColor: colorPalette?.tabBarBorder || theme.border,
                        }}
                      >
                        {editedDesignSystem.navigation.tabs.map((tab, i) => (
                          <div key={tab.name} className="flex flex-col items-center gap-1">
                            <div
                              className="w-5 h-5 rounded-full"
                              style={{
                                backgroundColor: i === 0
                                  ? (colorPalette?.tabActive || theme.primary)
                                  : (colorPalette?.tabInactive || theme.muted),
                                opacity: i === 0 ? 1 : 0.5,
                              }}
                            />
                            <span
                              className="text-[10px] font-medium"
                              style={{
                                color: i === 0
                                  ? (colorPalette?.tabActive || theme.primary)
                                  : (colorPalette?.tabInactive || theme.mutedForeground),
                              }}
                            >
                              {tab.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {editedDesignSystem.navigation.type !== 'bottom_tabs' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {editedDesignSystem.navigation.tabs.map((tab) => (
                          <span
                            key={tab.name}
                            className="px-2 py-1 text-xs rounded-md bg-surface-800 border border-surface-700 text-surface-400"
                          >
                            {tab.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : isStreaming ? (
                <SectionSkeleton label="Navigation" />
              ) : null}

              {/* API Integration */}
              {apiIntegration && (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-300">API Integration</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-500">Base URL:</span>
                      <code className="text-xs text-primary-400">{apiIntegration.baseUrl}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-500">Auth:</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface-800 border border-surface-700 text-surface-400">
                        {apiIntegration.authType}
                      </span>
                    </div>
                    {apiIntegration.services?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {apiIntegration.services.map(s => (
                          <span key={s} className="px-1.5 py-0.5 text-[10px] rounded bg-surface-800 border border-surface-700 text-surface-400">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Screens List */}
              {editedScreens.length > 0 ? (
                <motion.div {...sectionAnimation}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-300">Screens</h3>
                    </div>
                    {hasDuplicates && (
                      <span className="text-xs text-yellow-400">
                        Duplicate screen names detected
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {editedScreens.map((screen, index) => {
                      const isDuplicate = duplicateNames.has(screen.name.trim().toLowerCase());
                      return (
                        <motion.div
                          key={screen.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl bg-surface-800/60 border transition-colors',
                            isDuplicate
                              ? 'border-yellow-500/40'
                              : 'border-surface-700/50'
                          )}
                        >
                          <div className="pt-2.5 text-surface-600 cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <input
                              type="text"
                              value={screen.name}
                              onChange={(e) => updateScreen(index, 'name', e.target.value)}
                              placeholder="Screen name"
                              className="w-full px-3 py-1.5 text-sm font-medium bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50 transition-colors"
                            />
                            <textarea
                              value={screen.purpose}
                              onChange={(e) => updateScreen(index, 'purpose', e.target.value)}
                              placeholder="Screen purpose (optional)"
                              rows={2}
                              className="w-full px-3 py-1.5 text-xs bg-surface-800 border border-surface-700 rounded-lg text-surface-300 placeholder-surface-500 focus:outline-none focus:border-primary-500/50 resize-none transition-colors"
                            />
                            {screen.layoutDescription && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleScreenExpanded(screen.id)}
                                  className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                >
                                  <ChevronDown className={cn('w-3 h-3 transition-transform', expandedScreens.has(screen.id) && 'rotate-180')} />
                                  Layout details
                                </button>
                                {expandedScreens.has(screen.id) && (
                                  <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                    {screen.layoutDescription}
                                  </p>
                                )}
                              </div>
                            )}
                            {screen.dataModel && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleScreenExpanded(`${screen.id}-data`)}
                                  className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                >
                                  <ChevronDown className={cn('w-3 h-3 transition-transform', expandedScreens.has(`${screen.id}-data`) && 'rotate-180')} />
                                  Data model
                                </button>
                                {expandedScreens.has(`${screen.id}-data`) && (
                                  <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                    {screen.dataModel}
                                  </p>
                                )}
                              </div>
                            )}
                            {screen.interactions && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleScreenExpanded(`${screen.id}-interactions`)}
                                  className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                >
                                  <ChevronDown className={cn('w-3 h-3 transition-transform', expandedScreens.has(`${screen.id}-interactions`) && 'rotate-180')} />
                                  Interactions
                                </button>
                                {expandedScreens.has(`${screen.id}-interactions`) && (
                                  <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                    {screen.interactions}
                                  </p>
                                )}
                              </div>
                            )}
                            {screen.stateManagement && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleScreenExpanded(`${screen.id}-state`)}
                                  className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                                >
                                  <ChevronDown className={cn('w-3 h-3 transition-transform', expandedScreens.has(`${screen.id}-state`) && 'rotate-180')} />
                                  State management
                                </button>
                                {expandedScreens.has(`${screen.id}-state`) && (
                                  <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                    {screen.stateManagement}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeScreen(index)}
                            disabled={editedScreens.length <= 1}
                            className="pt-2.5 text-surface-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:hover:text-surface-500 disabled:cursor-not-allowed"
                            title={editedScreens.length <= 1 ? 'Cannot remove the last screen' : 'Remove screen'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                  <button
                    onClick={addScreen}
                    className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-surface-400 hover:text-white bg-surface-800/40 hover:bg-surface-800 border border-dashed border-surface-700 hover:border-surface-600 rounded-xl transition-colors w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Add Screen
                  </button>
                </motion.div>
              ) : isStreaming ? (
                <SectionSkeleton label="Screens" />
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700/50">
            <span className="text-sm text-surface-500">
              {editedScreens.length} screen{editedScreens.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-surface-400 hover:text-white transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={editedScreens.length === 0 || isRefining || isStreaming}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Approve & Generate
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
