import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, Plus, GripVertical, Trash2, Sparkles, Palette, Navigation, Check, Loader2, SendHorizontal, MessageCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DesignSystem, ScreenConfig } from '@/lib/design-system';
import { designSystemApi } from '@/lib/design-system';

interface PlanApprovalModalProps {
  designSystem: DesignSystem;
  projectId: string;
  onApprove: (editedDesignSystem: DesignSystem) => void;
  onCancel: () => void;
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

export function PlanApprovalModal({
  designSystem,
  projectId,
  onApprove,
  onCancel,
}: PlanApprovalModalProps) {
  const [editedDesignSystem, setEditedDesignSystem] = useState<DesignSystem>(designSystem);
  const [editedScreens, setEditedScreens] = useState<ScreenConfig[]>(
    designSystem.screens.map(s => ({ ...s }))
  );
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

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

    // Theme changes
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

    // Navigation changes
    if (prev.navigation.type !== next.navigation.type) {
      changes.push(`Changed navigation to ${NAV_TYPE_LABELS[next.navigation.type] || next.navigation.type}`);
    }

    // Screen changes
    const prevIds = new Set(prev.screens.map(s => s.id));
    const nextIds = new Set(next.screens.map(s => s.id));
    const added = next.screens.filter(s => !prevIds.has(s.id));
    const removed = prev.screens.filter(s => !nextIds.has(s.id));
    if (added.length > 0) changes.push(`Added ${added.map(s => s.name).join(', ')}`);
    if (removed.length > 0) changes.push(`Removed ${removed.map(s => s.name).join(', ')}`);

    // Check for purpose/layout changes on existing screens
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
    setChatMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMsg,
    }]);

    setIsRefining(true);
    try {
      const dsToRefine: DesignSystem = {
        ...editedDesignSystem,
        screens: editedScreens,
      };

      const response = await designSystemApi.refine(projectId, dsToRefine, userMsg);
      const refined = (response.data as any).data?.designSystem ?? response.data.designSystem;

      if (!refined || !refined.screens) {
        throw new Error('Invalid response from AI');
      }

      const summary = summarizeChanges(dsToRefine, refined);
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: summary,
      }]);

      setEditedDesignSystem(refined);
      setEditedScreens(refined.screens.map((s: ScreenConfig) => ({ ...s })));
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Something went wrong';
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Failed to refine: ${errorMsg}`,
      }]);
    } finally {
      setIsRefining(false);
    }
  }, [chatInput, isRefining, editedDesignSystem, editedScreens, projectId, summarizeChanges]);

  const handleApprove = useCallback(() => {
    if (editedScreens.length === 0) return;
    const finalDS: DesignSystem = {
      ...editedDesignSystem,
      screens: editedScreens,
    };
    onApprove(finalDS);
  }, [editedScreens, editedDesignSystem, onApprove]);

  const theme = editedDesignSystem.theme;
  const colorSwatches = [
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
                <h2 className="text-lg font-semibold text-white">Your App Plan</h2>
                <p className="text-sm text-surface-400">{editedDesignSystem.projectName}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
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
                    disabled={isRefining}
                    className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={!chatInput.trim() || isRefining}
                    className="p-2 rounded-lg bg-primary-500/15 border border-primary-500/30 text-primary-400 hover:bg-primary-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <SendHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Plan preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Theme Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-surface-400" />
                  <h3 className="text-sm font-medium text-surface-300">Theme</h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-800 border border-surface-700 text-surface-300">
                    {editedDesignSystem.themeMode === 'dark' ? 'Dark' : 'Light'}
                  </span>
                  <div className="flex items-center gap-3">
                    {colorSwatches.map(({ label, value }) => (
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
                  <span className="text-xs text-surface-500 ml-1">
                    {theme.fontSans}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-surface-400" />
                  <h3 className="text-sm font-medium text-surface-300">Navigation</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary-500/15 border border-primary-500/30 text-primary-400">
                    {NAV_TYPE_LABELS[editedDesignSystem.navigation.type] ?? editedDesignSystem.navigation.type}
                  </span>
                  {editedDesignSystem.navigation.tabs.map((tab) => (
                    <span
                      key={tab.name}
                      className="px-2 py-1 text-xs rounded-md bg-surface-800 border border-surface-700 text-surface-400"
                    >
                      {tab.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Screens List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-surface-300">Screens</h3>
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
                          {/* Layout Description toggle */}
                          {screen.layoutDescription && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleScreenExpanded(screen.id)}
                                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                              >
                                <ChevronDown className={cn(
                                  'w-3 h-3 transition-transform',
                                  expandedScreens.has(screen.id) && 'rotate-180'
                                )} />
                                Layout details
                              </button>
                              {expandedScreens.has(screen.id) && (
                                <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                  {screen.layoutDescription}
                                </p>
                              )}
                            </div>
                          )}
                          {/* Data Model */}
                          {screen.dataModel && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleScreenExpanded(`${screen.id}-data`)}
                                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                              >
                                <ChevronDown className={cn(
                                  'w-3 h-3 transition-transform',
                                  expandedScreens.has(`${screen.id}-data`) && 'rotate-180'
                                )} />
                                Data model
                              </button>
                              {expandedScreens.has(`${screen.id}-data`) && (
                                <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                  {screen.dataModel}
                                </p>
                              )}
                            </div>
                          )}
                          {/* Interactions */}
                          {screen.interactions && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleScreenExpanded(`${screen.id}-interactions`)}
                                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                              >
                                <ChevronDown className={cn(
                                  'w-3 h-3 transition-transform',
                                  expandedScreens.has(`${screen.id}-interactions`) && 'rotate-180'
                                )} />
                                Interactions
                              </button>
                              {expandedScreens.has(`${screen.id}-interactions`) && (
                                <p className="mt-1.5 px-3 py-2 text-[11px] leading-relaxed text-surface-500 bg-surface-800/80 border border-surface-700/50 rounded-lg">
                                  {screen.interactions}
                                </p>
                              )}
                            </div>
                          )}
                          {/* State Management */}
                          {screen.stateManagement && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleScreenExpanded(`${screen.id}-state`)}
                                className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                              >
                                <ChevronDown className={cn(
                                  'w-3 h-3 transition-transform',
                                  expandedScreens.has(`${screen.id}-state`) && 'rotate-180'
                                )} />
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
              </div>
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
                disabled={editedScreens.length === 0 || isRefining}
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
