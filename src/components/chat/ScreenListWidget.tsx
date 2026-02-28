import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Edit3,
  Eye,
  Plus,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';

type ScreenStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface ScreenListItem {
  id: string;
  name: string;
  type: string;
  description: string;
  status: ScreenStatus;
  thumbnailUrl?: string | null;
  order: number;
}

interface RecommendationItem {
  id: string;
  name: string;
  type: string;
  description: string;
  reasoning?: string;
}

interface ProgressData {
  stage: 'context' | 'style' | 'screens' | 'illustrations';
  overallProgress: number;
  screensStatus: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
  currentScreen?: {
    screenId: string;
    screenName: string;
    screenType: string;
    substage: string;
    progress: number;
  };
}

interface ScreenListWidgetProps {
  // For progress mode (default)
  screens?: ScreenListItem[];
  progressData?: ProgressData | null;
  isGenerating?: boolean;
  onViewScreen?: (screenId: string) => void;
  onUpdateBrief?: (screenId: string, brief: string) => Promise<void>;
  onGenerateAll?: () => void;
  // For recommendations mode
  mode?: 'progress' | 'recommendations';
  recommendations?: {
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null;
  onAddRecommendedScreen?: (screenId: string) => void;
  onAddAllRecommendations?: (screenIds: string[]) => void;
  className?: string;
}

const typeLabels: Record<string, string> = {
  onboarding: 'onboarding',
  dashboard: 'dashboard',
  settings: 'settings',
  profile: 'profile',
  paywall: 'paywall',
  landing: 'landing',
  list: 'list',
  detail: 'detail',
  form: 'form',
  custom: 'custom',
};

const statusConfig: Record<ScreenStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-surface-400', label: 'Pending' },
  generating: { icon: Loader2, color: 'text-primary-400', label: 'Generating' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
};

function ScreenListItemCard({
  screen,
  index,
  isExpanded,
  onToggleExpand,
  onViewScreen,
  onUpdateBrief,
  isCurrentlyGenerating,
}: {
  screen: ScreenListItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewScreen?: (screenId: string) => void;
  onUpdateBrief?: (screenId: string, brief: string) => Promise<void>;
  isCurrentlyGenerating: boolean;
}) {
  const [editedBrief, setEditedBrief] = useState(screen.description);
  const [isSaving, setIsSaving] = useState(false);

  const typeLabel = typeLabels[screen.type?.toLowerCase()] || screen.type || 'custom';
  const statusInfo = statusConfig[screen.status];
  const StatusIcon = statusInfo.icon;

  const handleSaveBrief = useCallback(async () => {
    if (!onUpdateBrief || editedBrief === screen.description) return;
    setIsSaving(true);
    try {
      await onUpdateBrief(screen.id, editedBrief);
    } finally {
      setIsSaving(false);
    }
  }, [screen.id, editedBrief, screen.description, onUpdateBrief]);

  const truncatedDesc = screen.description && screen.description.length > 60
    ? screen.description.slice(0, 60) + '...'
    : screen.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        'border rounded-lg transition-all',
        isCurrentlyGenerating
          ? 'bg-primary-500/10 border-primary-500/30'
          : screen.status === 'completed'
          ? 'bg-surface-800/50 border-surface-700/50'
          : 'bg-surface-900/50 border-surface-800/50'
      )}
    >
      {/* Main Row */}
      <button
        onClick={onToggleExpand}
        className="w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-surface-800/30 transition-colors rounded-t-lg"
      >
        {/* Order Number */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-700 flex items-center justify-center text-[10px] font-medium text-surface-300">
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-white truncate flex-1">
              {screen.name}
            </span>
            <Badge variant="info" className="text-[9px] px-1.5 py-0 flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              <span className="ml-0.5">{typeLabel}</span>
            </Badge>
          </div>
          {truncatedDesc && !isExpanded && (
            <p className="text-xs text-surface-400 leading-relaxed line-clamp-1">
              {truncatedDesc}
            </p>
          )}
        </div>

        {/* Status + Expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusIcon
            className={cn(
              'w-4 h-4',
              statusInfo.color,
              screen.status === 'generating' && 'animate-spin'
            )}
          />
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-surface-500" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-surface-800/50 space-y-3">
              {/* Editable Brief */}
              <div>
                <label className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-1 block">
                  Screen Brief
                </label>
                <textarea
                  value={editedBrief}
                  onChange={(e) => setEditedBrief(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-surface-900 border border-surface-700 rounded-lg text-surface-200 placeholder-surface-500 focus:outline-none focus:border-primary-500/50 resize-none"
                  rows={3}
                  placeholder="Describe what this screen should contain..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {onUpdateBrief && editedBrief !== screen.description && (
                  <button
                    onClick={handleSaveBrief}
                    disabled={isSaving}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white hover:bg-primary-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Edit3 className="w-3 h-3" />
                    )}
                    Update Brief
                  </button>
                )}
                {screen.status === 'completed' && onViewScreen && (
                  <button
                    onClick={() => onViewScreen(screen.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-700 text-white hover:bg-surface-600 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3 h-3" />
                    View Screen
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RecommendationItemCard({
  recommendation,
  index,
  onAdd,
}: {
  recommendation: RecommendationItem;
  index: number;
  onAdd?: (id: string) => void;
}) {
  const typeLabel = typeLabels[recommendation.type?.toLowerCase()] || recommendation.type || 'custom';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="border rounded-lg bg-surface-800/50 border-surface-700/50 p-3"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">
              {recommendation.name}
            </span>
            <Badge variant="info" className="text-[9px] px-1.5 py-0 flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              <span className="ml-0.5">{typeLabel}</span>
            </Badge>
          </div>
          {recommendation.description && (
            <p className="text-xs text-surface-400 leading-relaxed line-clamp-2">
              {recommendation.description}
            </p>
          )}
        </div>

        {/* Add Button */}
        {onAdd && (
          <button
            onClick={() => onAdd(recommendation.id)}
            className="flex-shrink-0 p-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 transition-colors"
            title="Add this screen"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ScreenListWidget({
  screens = [],
  progressData,
  isGenerating = false,
  onViewScreen,
  onUpdateBrief,
  onGenerateAll,
  mode = 'progress',
  recommendations,
  onAddRecommendedScreen,
  onAddAllRecommendations,
  className,
}: ScreenListWidgetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = useCallback((screenId: string) => {
    setExpandedId(prev => prev === screenId ? null : screenId);
  }, []);

  // RECOMMENDATIONS MODE - Show essential screens only
  if (mode === 'recommendations') {
    const essentialScreens = recommendations?.essential || [];

    // Don't render if no recommendations
    if (essentialScreens.length === 0) {
      return null;
    }

    return (
      <div className={cn('bg-surface-900/90 border border-surface-800/60 rounded-xl overflow-hidden', className)}>
        {/* Recommendations Header */}
        <div className="px-4 py-3 border-b border-surface-800/60">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-medium text-white">
              Screen Recommendations
            </span>
            <span className="text-xs text-surface-400 ml-auto">
              {essentialScreens.length} suggested
            </span>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="px-3 py-3 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
          {essentialScreens.map((rec, index) => (
            <RecommendationItemCard
              key={rec.id}
              recommendation={rec}
              index={index}
              onAdd={onAddRecommendedScreen}
            />
          ))}
        </div>

        {/* Add All Button */}
        {onAddAllRecommendations && essentialScreens.length > 0 && (
          <div className="px-3 pb-3 pt-1 border-t border-surface-800/60">
            <button
              onClick={() => onAddAllRecommendations(essentialScreens.map(r => r.id))}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add All Recommendations
            </button>
          </div>
        )}
      </div>
    );
  }

  // PROGRESS MODE (default) - Show screens with generation status
  const sortedScreens = [...screens].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completedCount = screens.filter(s => s.status === 'completed').length;
  const totalCount = screens.length;

  if (screens.length === 0 && !progressData) {
    return null;
  }

  const overallProgress = progressData?.overallProgress ?? (completedCount / totalCount) * 100;
  const currentScreenId = progressData?.currentScreen?.screenId;

  return (
    <div className={cn('bg-surface-900/90 border border-surface-800/60 rounded-xl overflow-hidden', className)}>
      {/* Progress Header */}
      <div className="px-4 py-3 border-b border-surface-800/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white">
            {isGenerating ? 'Generating Screens...' : 'Screen Progress'}
          </span>
          <span className="text-xs text-surface-400">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        <Progress value={overallProgress} gradient className="h-1.5" />
        {progressData?.currentScreen && (
          <p className="text-[10px] text-primary-400 mt-1.5">
            Currently: {progressData.currentScreen.screenName}
          </p>
        )}
      </div>

      {/* Screen List */}
      <div className="px-3 py-3 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
        {sortedScreens.map((screen, index) => (
          <ScreenListItemCard
            key={screen.id}
            screen={screen}
            index={index}
            isExpanded={expandedId === screen.id}
            onToggleExpand={() => handleToggleExpand(screen.id)}
            onViewScreen={onViewScreen}
            onUpdateBrief={onUpdateBrief}
            isCurrentlyGenerating={currentScreenId === screen.id || (isGenerating && screen.status === 'generating')}
          />
        ))}
      </div>

      {/* Generate All Button */}
      {onGenerateAll && screens.some(s => s.status === 'pending') && !isGenerating && (
        <div className="px-3 pb-3 pt-1 border-t border-surface-800/60">
          <button
            onClick={onGenerateAll}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-400 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate All Screens
          </button>
        </div>
      )}
    </div>
  );
}

export default ScreenListWidget;
