import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  ChevronRight,
  MessageSquare,
  Loader2,
  Send,
  X,
  Pencil,
  MousePointer,
  Paperclip,
  ListChecks,
  Sparkles,
  Smartphone,
  ChevronDown,
  ArrowDown,
  Dumbbell,
  ChefHat,
  Users,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  chatApi,
  type ChatStreamCallbacks,
  type StreamScreen,
  type ChangedFile,
} from "@/lib/chat";
import type { ChatCompleteData, MultiFileStartParams, MultiFileModifyParams, MultiFileState } from "@/hooks/useProjectSocket";
import { useAuthStore } from "@/stores/authStore";
import { useBillingStore } from "@/stores/billingStore";
import { useChatStore } from "@/stores/chatStore";
import type { ScreenData, RecommendationItem, LocalMessage, GenerationStatus, ActionLogEvent } from "@/types/canvas";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatProgressIndicator } from "./ChatProgressIndicator";
import { ScreenListWidget } from "@/components/chat/ScreenListWidget";
import { useElementSelection } from "@/hooks/useElementSelection";
import { FeaturePicker } from "./FeaturePicker";
import { useFeatureCatalog } from "@/hooks/useFeatures";
import { ModelSelector } from "../chat/ModelSelector";
import { useModelStore } from "@/stores/modelStore";

function EditModeIndicator({
  screenName,
  onCancel,
}: {
  screenName: string;
  onCancel: () => void;
}) {
  return (
    <div className="mx-3 mt-3 mb-2 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-primary-300">
            EDIT MODE
          </span>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-surface-300">
        Editing: <span className="font-medium text-white">{screenName}</span>
      </p>
    </div>
  );
}

function SelectedElementIndicator({
  elementType,
  innerText,
  onClear,
}: {
  elementType: string;
  innerText?: string;
  onClear: () => void;
}) {
  return (
    <div className="mx-3 mt-2 mb-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-xs text-surface-300 truncate">
            Selected: <span className="font-medium text-white">{elementType}</span>
            {innerText && (
              <span className="text-surface-400 ml-1">
                &ldquo;{innerText.slice(0, 25)}{innerText.length > 25 ? "..." : ""}&rdquo;
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onClear}
          className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}


type ChatScope = "screen" | "app";

const APP_WIDE_ACTION_PATTERN =
  /\b(add|update|edit|change|fix|wire|connect|remove|delete|replace|rename|refactor|polish|improve|rework|make|turn|create|build|apply|sync)\b/;
const APP_WIDE_TARGET_PATTERN =
  /\b(app|project|navigation|routes?|tabs?|flows?|checkout|settings|addresses|payment(?:-methods)?|theme|colors?|styles?|images?|placeholders?|preview|all screens|every screen|across the app|throughout the app|whole app|entire app|global)\b/;

function isAppWideRequest(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  if (/\b(whole app|entire app|across the app|throughout the app|all screens|every screen|globally)\b/.test(normalized)) {
    return true;
  }

  return APP_WIDE_ACTION_PATTERN.test(normalized) && APP_WIDE_TARGET_PATTERN.test(normalized);
}

function inferChatScope(params: {
  message: string;
  effectiveScreenId?: string;
  effectiveParentScreenId?: string;
  hasSelectedElement: boolean;
  hasScreens: boolean;
}): ChatScope {
  const {
    message,
    effectiveScreenId,
    effectiveParentScreenId,
    hasSelectedElement,
    hasScreens,
  } = params;

  if (hasSelectedElement) return "screen";
  if (!hasScreens) return "screen";
  // When user has explicitly selected a screen, always route to screen-level edit.
  // This prevents "fix the 5th tab" from being classified as app-wide just because
  // the message mentions "tab" — the user's screen selection is the strongest signal.
  if (effectiveScreenId || effectiveParentScreenId) return "screen";
  if (isAppWideRequest(message)) return "app";
  return "app";
}

export interface ChatSidebarProps {
  projectId: string;
  projectName: string;
  screenId?: string;
  screenName?: string;
  screenPath?: string;
  parentScreenId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** When true, hides the sidebar header/collapse and uses full parent width */
  embedded?: boolean;
  editSuggestion?: string;
  onEditSuggestionConsumed?: () => void;
  triggerMessage?: string;
  triggerScreenId?: string;
  onTriggerMessageConsumed?: () => void;
  onGenerationStart?: () => void;
  onGenerationEnd?: () => void;
  onScreenCreated?: (screen: StreamScreen) => void;
  onAddSkeletons?: (screenNames: string[]) => void;
  onRemoveSkeletons?: (screenNames: string[]) => void;
  onSetScreenLoading?: (
    screenId: string,
    loading: boolean,
    loadingText?: string,
  ) => void;
  onViewScreen?: (screenId: string) => void;
  progressMessages?: Map<string, unknown>;
  /** Active generation progress derived from socket screen states */
  activeProgress?: { overallProgress: number; currentScreen?: { name: string } } | null;
  onGenerateRecommended?: (screenIds: string[]) => void;
  onDismissRecommendations?: (screenIds: string[]) => void;
  screens?: ScreenData[];
  onUpdateScreenBrief?: (screenId: string, brief: string) => Promise<void>;
  initialRecommendations?: {
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null;
  onClearInitialRecommendations?: () => void;
  socketConnected?: boolean;
  socketSendMessage?: (
    message: string,
    screenId?: string,
    parentScreenId?: string,
    planMode?: boolean,
    enabledFeatures?: string[],
    imageUrls?: string[],
    modelId?: string,
    planId?: string,
  ) => void;
  socketChatState?: { isStreaming: boolean; accumulated: string; status: string; statusMessage: string };
  onSocketChatComplete?: (callback: (data: ChatCompleteData) => void) => void;
  onSocketChatError?: (callback: (error: string, code?: string) => void) => void;
  onFilesChanged?: (changedFiles: ChangedFile[]) => void;
  /** Multi-file generation: start full-app generation */
  startMultiFileGeneration?: (params: MultiFileStartParams) => void;
  /** Multi-file generation: modify existing files */
  modifyMultiFile?: (params: MultiFileModifyParams) => void;
  /** Current multi-file generation state */
  multiFileState?: MultiFileState;
  /** Action log events from socket */
  actionLogs?: ActionLogEvent[];
  /** Whether action logging is currently active (generation in progress) */
  isActionLogActive?: boolean;
  /** Enabled feature IDs for this project */
  enabledFeatures?: string[];
  /** Callback when features are toggled */
  onFeaturesChange?: (features: string[]) => void;
  /** Reference image URL from project creation (shown on first user message) */
  referenceImageUrl?: string | null;
  /** Emit undo for a chat edit (screenId, versionId) */
  emitEditUndo?: (screenId: string, versionId: string) => void;
  /** Callback when an edit is undone via socket */
  onEditUndone?: (callback: (data: { screenId: string; versionId: string; screen: any }) => void) => void;
  /** Project files for file-targeting in chat (from /projects/:id/files) */
  projectFiles?: Array<{ path: string; id: string; isScreen?: boolean; screenName?: string | null }>;
}

export function ChatSidebar({
  projectId,
  projectName,
  screenId,
  screenName,
  screenPath,
  parentScreenId,
  isCollapsed,
  onToggleCollapse,
  embedded = false,
  editSuggestion,
  onEditSuggestionConsumed,
  triggerMessage,
  triggerScreenId,
  onTriggerMessageConsumed,
  onGenerationStart,
  onGenerationEnd,
  onScreenCreated,
  onAddSkeletons,
  onRemoveSkeletons,
  onSetScreenLoading,
  onViewScreen,
  progressMessages,
  activeProgress: _activeProgressProp,
  onGenerateRecommended,
  onDismissRecommendations,
  screens,
  onUpdateScreenBrief: _onUpdateScreenBrief,
  initialRecommendations,
  onClearInitialRecommendations,
  socketConnected,
  socketSendMessage,
  socketChatState,
  onSocketChatComplete,
  onSocketChatError,
  onFilesChanged,
  modifyMultiFile,
  multiFileState,
  actionLogs,
  isActionLogActive: _isActionLogActive,
  enabledFeatures = [],
  onFeaturesChange,
  referenceImageUrl,
  emitEditUndo,
  onEditUndone,
  projectFiles,
}: ChatSidebarProps) {
  const {
    messages: localMessages,
    setMessages: setLocalMessages,
    isStreaming,
    setStreaming,
    streamingStatus,
    setStreamingStatus,
    turnState,
    startTurn,
    completeTurn,
    failTurn,
    setAwaitingPlan,
    resetTurn,
    activePlanId,
    setActivePlan,
    clearActivePlan,
  } = useChatStore();
  const [input, setInput] = useState("");
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const historyFetchCountRef = useRef(0);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    isGenerating: false,
    lastCompletedCount: 0,
    pendingRecommendations: null,
  });
  const [planMode, setPlanMode] = useState(false);
  const planModeRef = useRef(planMode);
  useEffect(() => { planModeRef.current = planMode; }, [planMode]);
  const [isPlanImplementing, setIsPlanImplementing] = useState(false);
  const [showFeaturePicker, setShowFeaturePicker] = useState(false);
  const { data: featureCatalog } = useFeatureCatalog();

  // Screen selector: which screen the user wants to target for edits
  // Default to undefined (general mode) — user explicitly picks a screen when they want to edit
  const [chatScreenId, setChatScreenId] = useState<string | undefined>(undefined);
  // File selector: target a specific file path for edits (alternative to screen selection)
  const [chatFilePath, setChatFilePath] = useState<string | undefined>(undefined);
  const [screenDropdownOpen, setScreenDropdownOpen] = useState(false);
  // Which tab is active in the dropdown: 'screens' or 'files'
  const [selectorTab, setSelectorTab] = useState<'screens' | 'files'>('screens');
  const screenDropdownRef = useRef<HTMLDivElement>(null);

  // Close screen dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (screenDropdownRef.current && !screenDropdownRef.current.contains(e.target as Node)) {
        setScreenDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedScreen = screens?.find((s) => s.id === chatScreenId);
  // Derive display filename from chatFilePath
  const selectedFileName = chatFilePath ? chatFilePath.split('/').pop() || chatFilePath : undefined;

  const [pendingImages, setPendingImages] = useState<Array<{
    id: string;
    file: File;
    previewUrl: string;
    uploadedUrl: string | null;
    isUploading: boolean;
    error: boolean;
  }>>([]);
  const [isScrolledAway, setIsScrolledAway] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  // Track message IDs that have already been appended to prevent duplicates
  const processedMessageIdsRef = useRef(new Set<string>());
  // Guard to prevent double-send (ref for synchronous check, survives across renders)
  const sendingRef = useRef(false);
  // Guard to prevent duplicate error handling per turn
  const errorHandledRef = useRef(false);
  const chatQueryClient = useQueryClient();

  // Element selection state
  const { selectedElement, isSelectionMode, setSelectionMode, clearSelection } = useElementSelection();

  const { data: historyData, isLoading: isLoadingHistory, isError: isHistoryError } = useQuery({
    queryKey: ["chatHistory", projectId],
    queryFn: async () => {
      const response = await chatApi.getHistory(projectId, { limit: 100 });
      // Backend wraps in { success: true, data: { messages, ... } }
      return (response.data as unknown as { data: { messages: unknown[] } }).data;
    },
    enabled: !!projectId,
    staleTime: 5000, // Data is fresh for 5 seconds — prevents duplicate fetches on mount
    refetchOnMount: true, // Refetch on mount only if data is stale
    refetchInterval: !historyInitialized ? 3000 : false, // Poll until history loads
    retry: 2, // Retry failed requests twice before giving up
  });

  // Reset history when projectId changes
  useEffect(() => {
    setHistoryInitialized(false);
    setLocalMessages([]);
    resetTurn();
    processedMessageIdsRef.current.clear();
    historyFetchCountRef.current = 0;
  }, [projectId]);


  useEffect(() => {
    if (!historyData?.messages || historyInitialized) return;

    historyFetchCountRef.current += 1;

    // Restore persisted action logs from localStorage
    let savedLogs: Record<string, unknown> = {};
    if (projectId) {
      try {
        savedLogs = JSON.parse(localStorage.getItem(`actionLogs:${projectId}`) || '{}');
      } catch { /* ignore */ }
    }

    const rawMessages = historyData.messages as Array<{
      id: string;
      role: "user" | "assistant";
      message: string;
      createdScreenId?: string;
      metadata?: LocalMessage["metadata"];
    }>;

    let firstUserMessageSeen = false;
    const mappedMessages = rawMessages.map((msg) => {
      // Inject reference image into the first user message if project has one
      const isFirstUser = msg.role === 'user' && !firstUserMessageSeen;
      if (isFirstUser) firstUserMessageSeen = true;
      const existingImageUrls = (msg.metadata?.imageUrls as string[] | undefined) || [];
      const shouldInjectImage = isFirstUser && referenceImageUrl && existingImageUrls.length === 0;

      return {
        id: msg.id,
        role: msg.role,
        content: msg.message,
        createdScreenId: msg.createdScreenId,
        // Mark error messages from DB so they render with error styling
        error: !!(msg.metadata as Record<string, unknown> | undefined)?.error,
        metadata: {
          ...msg.metadata,
          // Inject reference image on first user message
          ...(shouldInjectImage ? { imageUrls: [referenceImageUrl] } : {}),
          // Merge persisted action logs from localStorage if not already in metadata
          ...(msg.role === 'assistant' && !msg.metadata?.actionLogs && savedLogs[msg.id]
            ? { actionLogs: savedLogs[msg.id] }
            : {}),
        },
      };
    });

    if (mappedMessages.length > 0) {
      // Clear processed IDs and re-seed with history message IDs
      processedMessageIdsRef.current.clear();
      for (const msg of mappedMessages) {
        processedMessageIdsRef.current.add(msg.id);
      }
      setLocalMessages(mappedMessages);
      setHistoryInitialized(true);
    } else if (historyFetchCountRef.current >= 5) {
      // After ~15 seconds of polling with no messages, accept that the project
      // has no chat history yet (e.g., new project). Stop polling and show the
      // empty state so the user can start chatting.
      setHistoryInitialized(true);
    }
  }, [historyData, historyInitialized, projectId]);

  // If the history query failed after retries, stop showing skeleton loader.
  // The user can still use chat normally; messages will be saved going forward.
  useEffect(() => {
    if (isHistoryError && !historyInitialized) {
      setHistoryInitialized(true);
    }
  }, [isHistoryError, historyInitialized]);

  // Detect when user scrolls away from bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const isNearBottom = distanceFromBottom < 80;
      userScrolledRef.current = !isNearBottom;
      setIsScrolledAway(!isNearBottom);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth auto-scroll when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (userScrolledRef.current) return;
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, actionLogs]);

  const scrollToBottom = useCallback(() => {
    userScrolledRef.current = false;
    setIsScrolledAway(false);
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editSuggestion && !isStreaming) {
      setInput(editSuggestion);
      onEditSuggestionConsumed?.();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [editSuggestion, isStreaming, onEditSuggestionConsumed]);

  useEffect(() => {
    if (initialRecommendations && !generationStatus.pendingRecommendations) {
      setGenerationStatus((prev) => ({
        ...prev,
        pendingRecommendations: initialRecommendations,
      }));
      onClearInitialRecommendations?.();
    }
  }, [
    initialRecommendations,
    generationStatus.pendingRecommendations,
    onClearInitialRecommendations,
  ]);

  const assistantMessageIdRef = useRef<string | null>(null);
  const addedSkeletonNameRef = useRef<string | null>(null);
  const actionLogsRef = useRef<ActionLogEvent[]>([]);
  actionLogsRef.current = actionLogs ?? [];
  const effectiveScreenIdRef = useRef<string | undefined>(undefined);
  const chatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onSocketChatComplete) return;

    onSocketChatComplete((data: ChatCompleteData) => {
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
      }

      const assistantMessageId = assistantMessageIdRef.current;
      const addedSkeletonName = addedSkeletonNameRef.current;

      // Prefer live action logs (granular per-tool) over server logs (coarse gateway-level)
      // Use ref to avoid stale closure — actionLogs state may already be cleared
      const liveActionLogs = actionLogsRef.current;
      const resolvedActionLogs = liveActionLogs && liveActionLogs.length > (data.actionLogs?.length || 0)
        ? [...liveActionLogs]
        : data.actionLogs;

      setLocalMessages((prev) => {
        // If timeout already fired, the message may have been updated with fallback text.
        // Still find and update it with the real content using the ref (not cleared on timeout).
        const hasMatchingMessage = assistantMessageId && prev.some((msg) => msg.id === assistantMessageId);

        let newMessages: LocalMessage[];

        const isModifyFailed = data.intent === 'modify_failed';

        if (hasMatchingMessage) {
          // Normal path: update the existing placeholder message
          newMessages = prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  id: data.messageId || assistantMessageId,
                  content: data.content,
                  isStreaming: false,
                  ...(isModifyFailed ? { warning: true } : {}),
                  metadata: {
                    ...msg.metadata,
                    executionMode: planModeRef.current ? "Plan" : "Direct",
                    ...(resolvedActionLogs ? { actionLogs: resolvedActionLogs } : {}),
                    ...(data.changeSummary ? { changeSummary: data.changeSummary } : {}),
                    ...(data.previousVersionId ? { previousVersionId: data.previousVersionId } : {}),
                    ...(data.editedScreenId ? { editedScreenId: data.editedScreenId } : {}),
                    ...(data.planId ? { planId: data.planId, planVersion: data.planVersion } : {}),
                    ...(data.planSteps ? { planSteps: data.planSteps } : {}),
                  },
                }
              : msg,
          );
        } else {
          // Race condition recovery: no matching placeholder message found.
          // This happens when chat:complete arrives before the assistant placeholder
          // was added to state, or when the ID doesn't match due to timing.
          // Check broader: streaming recovery may have already appended a message
          // with a different ID or the streaming flag still set.
          const streamingOrAltMatch = prev.some(
            (msg) =>
              msg.id === data.messageId ||
              (msg.role === 'assistant' && msg.isStreaming),
          );
          if (streamingOrAltMatch) {
            // Update the existing streaming/alt message instead of appending a duplicate
            newMessages = prev.map((msg) =>
              (msg.id === data.messageId || (msg.role === 'assistant' && msg.isStreaming))
                ? {
                    ...msg,
                    id: data.messageId || msg.id,
                    content: data.content,
                    isStreaming: false,
                    ...(isModifyFailed ? { warning: true } : {}),
                    metadata: {
                      ...msg.metadata,
                      executionMode: planModeRef.current ? "Plan" : "Direct",
                      ...(data.changeSummary ? { changeSummary: data.changeSummary } : {}),
                    ...(data.previousVersionId ? { previousVersionId: data.previousVersionId } : {}),
                    ...(data.editedScreenId ? { editedScreenId: data.editedScreenId } : {}),
                      ...(resolvedActionLogs ? { actionLogs: resolvedActionLogs } : {}),
                      ...(data.planId ? { planId: data.planId, planVersion: data.planVersion } : {}),
                      ...(data.planSteps ? { planSteps: data.planSteps } : {}),
                    },
                  }
                : msg,
            );
          } else {
            // Truly no match anywhere — append as new message (if not already processed)
            const recoveryId = data.messageId || assistantMessageId || `assistant-recovery-${Date.now()}`;
            if (processedMessageIdsRef.current.has(recoveryId)) {
              newMessages = prev; // skip duplicate
            } else {
              console.warn('[ChatSidebar] chat:complete had no matching assistantMessageId, appending as new message', {
                assistantMessageId,
                dataMessageId: data.messageId,
              });
              processedMessageIdsRef.current.add(recoveryId);
              const newAssistantMessage: LocalMessage = {
                id: recoveryId,
                role: "assistant",
                content: data.content,
                isStreaming: false,
                ...(isModifyFailed ? { warning: true } : {}),
                metadata: {
                  executionMode: planModeRef.current ? "Plan" : "Direct",
                  ...(resolvedActionLogs ? { actionLogs: resolvedActionLogs } : {}),
                  ...(data.changeSummary ? { changeSummary: data.changeSummary } : {}),
                    ...(data.previousVersionId ? { previousVersionId: data.previousVersionId } : {}),
                    ...(data.editedScreenId ? { editedScreenId: data.editedScreenId } : {}),
                  ...(data.planId ? { planId: data.planId, planVersion: data.planVersion } : {}),
                  ...(data.planSteps ? { planSteps: data.planSteps } : {}),
                },
              };
              newMessages = [...prev, newAssistantMessage];
            }
          }
        }

        if (data.pendingRecommendations && data.pendingRecommendations.length > 0) {
          const essential = data.pendingRecommendations
            .filter((r) => r.category === "essential")
            .map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              description: r.description,
            }));
          const optional = data.pendingRecommendations
            .filter((r) => r.category === "optional")
            .map((r) => ({
              id: r.id,
              name: r.name,
              type: r.type,
              description: r.description,
            }));

          const recommendationMessage: LocalMessage = {
            id: `rec-${Date.now()}`,
            role: "assistant",
            content: "",
            metadata: {
              type: "screen_suggestion",
              recommendations: { essential, optional },
            },
          };
          newMessages = [...newMessages, recommendationMessage];

          setGenerationStatus((prev) => ({
            ...prev,
            isGenerating: false,
            lastCompletedCount: data.screen
              ? prev.lastCompletedCount + 1
              : prev.lastCompletedCount,
            pendingRecommendations: { essential, optional },
          }));
        } else {
          setGenerationStatus((prev) => ({
            ...prev,
            isGenerating: false,
            lastCompletedCount: data.screen
              ? prev.lastCompletedCount + 1
              : prev.lastCompletedCount,
          }));
        }

        return newMessages;
      });

      setStreaming(false);
      sendingRef.current = false;
      setIsPlanImplementing(false);

      // Track active plan from structured plan responses
      if (data.planId && data.planSteps && data.planSteps.length > 0) {
        setActivePlan(data.planId, data.planSteps as import("@/stores/chatStore").PlanStep[], data.planVersion || 1);
      }

      if (planModeRef.current && !data.screen) {
        setAwaitingPlan();
      } else {
        completeTurn();
      }
      onGenerationEnd?.();

      // Always clear screen loading state on completion — prevents hanging "Generating screen..." overlay
      const loadingScreenId = effectiveScreenIdRef.current;
      if (loadingScreenId) {
        onSetScreenLoading?.(loadingScreenId, false);
      }

      chatQueryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });

      // Auto-focus input after AI response completes
      setTimeout(() => inputRef.current?.focus(), 150);

      // Scroll to bottom on completion
      scrollToBottom();

      if (data.screen) {
        onScreenCreated?.({
          id: data.screen.id,
          name: data.screen.name,
          htmlContent: data.screen.htmlContent,
          thumbnailUrl: data.screen.thumbnailUrl,
        } as StreamScreen);
        useAuthStore.getState().refreshCredits();
      } else if (addedSkeletonName) {
        onRemoveSkeletons?.([addedSkeletonName]);
      }

      assistantMessageIdRef.current = null;
      addedSkeletonNameRef.current = null;
    });
  }, [onSocketChatComplete, onGenerationEnd, onScreenCreated, onRemoveSkeletons, onSetScreenLoading, projectId, chatQueryClient]);

  // Handle edit undo responses
  useEffect(() => {
    if (!onEditUndone) return;

    onEditUndone((data) => {
      // Mark messages that had this screenId + versionId as undone
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.metadata?.editedScreenId === data.screenId && msg.metadata?.previousVersionId === data.versionId
            ? { ...msg, metadata: { ...msg.metadata, editUndone: true } }
            : msg,
        ),
      );
    });
  }, [onEditUndone]);

  useEffect(() => {
    if (!onSocketChatError) return;

    onSocketChatError((error: string, code?: string) => {
      // Guard: skip if we already handled an error for this turn
      if (errorHandledRef.current) {
        console.warn('[ChatSidebar] Duplicate chat:error ignored (already handled for this turn)');
        return;
      }
      errorHandledRef.current = true;

      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
      }

      const assistantMessageId = assistantMessageIdRef.current;
      const addedSkeletonName = addedSkeletonNameRef.current;
      const effectiveScreenId = effectiveScreenIdRef.current;

      if (code === 'LIMIT_EXCEEDED' || code === 'INSUFFICIENT_CREDITS' || code === 'DAILY_LIMIT_EXCEEDED') {
        const { handleBillingError, currentPlan } = useBillingStore.getState();
        handleBillingError(code, error, currentPlan, {});
      }

      setLocalMessages((prev) => {
        const hasMatchingMessage = assistantMessageId && prev.some((msg) => msg.id === assistantMessageId);
        if (hasMatchingMessage) {
          return prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `Error: ${error}. If generation completed, refresh to see results.`,
                  isStreaming: false,
                  error: true,
                }
              : msg,
          );
        }
        // Race condition recovery: append error as new message if no placeholder found
        const errorRecoveryId = assistantMessageId || `assistant-error-${Date.now()}`;
        if (processedMessageIdsRef.current.has(errorRecoveryId)) {
          return prev; // skip duplicate
        }
        console.warn('[ChatSidebar] chat:error had no matching assistantMessageId, appending as new message');
        processedMessageIdsRef.current.add(errorRecoveryId);
        return [
          ...prev,
          {
            id: errorRecoveryId,
            role: "assistant" as const,
            content: `Error: ${error}. If generation completed, refresh to see results.`,
            isStreaming: false,
            error: true,
          },
        ];
      });

      setStreaming(false);
      sendingRef.current = false;
      setIsPlanImplementing(false);
      failTurn(error, true);
      onGenerationEnd?.();

      if (effectiveScreenId) {
        onSetScreenLoading?.(effectiveScreenId, false);
      }
      if (addedSkeletonName) {
        onRemoveSkeletons?.([addedSkeletonName]);
      }

      chatQueryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });
      chatQueryClient.invalidateQueries({ queryKey: ["screens", projectId] });

      assistantMessageIdRef.current = null;
      addedSkeletonNameRef.current = null;
      effectiveScreenIdRef.current = undefined;
    });
  }, [onSocketChatError, onGenerationEnd, onSetScreenLoading, onRemoveSkeletons, projectId, chatQueryClient]);

  useEffect(() => {
    if (!socketChatState) return;

    if (socketChatState.isStreaming && assistantMessageIdRef.current) {
      const targetId = assistantMessageIdRef.current;
      setLocalMessages((prev) => {
        const hasMatch = prev.some((msg) => msg.id === targetId);
        if (hasMatch) {
          // Normal path: update the existing placeholder
          return prev.map((msg) =>
            msg.id === targetId
              ? { ...msg, content: socketChatState.accumulated, isStreaming: true }
              : msg,
          );
        }
        // Race condition: streaming data arrived but the placeholder message hasn't
        // been committed to state yet (React batching). Append it so content isn't lost.
        // But first check if this message ID was already processed (avoid duplicate).
        if (socketChatState.accumulated) {
          if (processedMessageIdsRef.current.has(targetId)) return prev;
          // Also check if chat:complete already finalized a message with this ID
          const alreadyExists = prev.some((msg) => msg.id === targetId);
          if (alreadyExists) return prev;
          processedMessageIdsRef.current.add(targetId);
          return [
            ...prev,
            {
              id: targetId,
              role: "assistant" as const,
              content: socketChatState.accumulated,
              isStreaming: true,
            },
          ];
        }
        return prev;
      });
    }

    if (socketChatState.statusMessage) {
      setStreamingStatus(socketChatState.statusMessage);

      if (
        socketChatState.statusMessage.startsWith("Generating ") &&
        !addedSkeletonNameRef.current &&
        !effectiveScreenIdRef.current
      ) {
        const screenNameFromStatus = socketChatState.statusMessage
          .replace("Generating ", "")
          .replace("...", "");
        addedSkeletonNameRef.current = screenNameFromStatus.replace(/\s+/g, "_");
        onAddSkeletons?.([addedSkeletonNameRef.current]);
      }
    }
  }, [socketChatState, onAddSkeletons]);

  // Track multi-file generation state changes to update chat messages
  const prevMultiFileGeneratingRef = useRef(false);
  useEffect(() => {
    if (!multiFileState) return;

    const wasGenerating = prevMultiFileGeneratingRef.current;
    const isNowGenerating = multiFileState.isGenerating;
    prevMultiFileGeneratingRef.current = isNowGenerating;

    // Update streaming status during generation
    if (isNowGenerating && multiFileState.currentFile) {
      const { completed, total } = multiFileState.progress;
      const shortName = multiFileState.currentFile.split("/").pop() || multiFileState.currentFile;
      setStreamingStatus(
        total > 0
          ? `Generating ${shortName} (${completed + 1}/${total})...`
          : `Generating ${shortName}...`,
      );
    }

    // Generation just completed
    if (wasGenerating && !isNowGenerating) {
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current);
        chatTimeoutRef.current = null;
      }

      setGenerationStatus((prev) => ({
        ...prev,
        isGenerating: false,
      }));

      const assistantMessageId = assistantMessageIdRef.current;

      if (multiFileState.error) {
        // Error case
        setLocalMessages((prev) => {
          const errorDbId = multiFileState.completedMessageId;
          const hasMatch = prev.some((msg) =>
            (assistantMessageId && msg.id === assistantMessageId) ||
            (errorDbId && msg.id === errorDbId)
          );
          if (hasMatch) {
            return prev.map((msg) =>
              (msg.id === assistantMessageId || (errorDbId && msg.id === errorDbId))
                ? {
                    ...msg,
                    content: `Error during multi-file generation: ${multiFileState.error}`,
                    isStreaming: false,
                    error: true,
                  }
                : msg,
            );
          }
          // Race condition recovery: append error as new message
          const multiErrorId = assistantMessageId || `assistant-multi-error-${Date.now()}`;
          if (processedMessageIdsRef.current.has(multiErrorId)) return prev;
          processedMessageIdsRef.current.add(multiErrorId);
          return [
            ...prev,
            {
              id: multiErrorId,
              role: "assistant" as const,
              content: `Error during multi-file generation: ${multiFileState.error}`,
              isStreaming: false,
              error: true,
            },
          ];
        });
        failTurn(multiFileState.error, true);
      } else {
        // Success case
        const fileCount = multiFileState.files.size;
        const fileNames = Array.from(multiFileState.files.keys());
        const completedLogs = multiFileState.completedActionLogs;
        const hasCreateActions = completedLogs?.some((log) => log.type === "create_file");
        const hasEditActions = completedLogs?.some((log) => log.type === "edit_file");
        const defaultFileAction = hasCreateActions && !hasEditActions ? "created" : "modified";
        const validationSummary = {
          passed: multiFileState.validation?.filter((item) => item.status === "passed").length || 0,
          failed: multiFileState.validation?.filter((item) => item.status === "failed").length || 0,
          skipped: multiFileState.validation?.filter((item) => item.status === "skipped").length || 0,
        };

        // Use the DB messageId from backend so refresh picks up the same message
        const dbMessageId = multiFileState.completedMessageId;
        const summary =
          multiFileState.summary ||
          `${defaultFileAction === "created" ? "Generated" : "Updated"} ${fileCount} files successfully.`;

        setLocalMessages((prev) => {
          const hasMatch = prev.some((msg) =>
            (assistantMessageId && msg.id === assistantMessageId) ||
            (dbMessageId && msg.id === dbMessageId)
          );
          const artifactMetadata = {
            type: "artifact" as const,
            summary,
            files: fileNames.map((path) => ({
              path,
              action: defaultFileAction,
            })),
            validation: validationSummary,
            ...(completedLogs ? { actionLogs: completedLogs } : {}),
          };
          const contentText = defaultFileAction === "created" ? "App generation complete" : "Project update applied";

          if (hasMatch) {
            return prev.map((msg) =>
              (msg.id === assistantMessageId || (dbMessageId && msg.id === dbMessageId))
                ? {
                    ...msg,
                    id: dbMessageId || assistantMessageId || msg.id,
                    content: contentText,
                    isStreaming: false,
                    metadata: {
                      ...(msg.metadata || {}),
                      ...artifactMetadata,
                    },
                  }
                : msg,
            );
          }

          // Consolidation: if the last assistant message is also an artifact/generation result,
          // update it in-place instead of appending a separate bubble.
          const lastAssistantIdx = prev.length - 1;
          const lastMsg = lastAssistantIdx >= 0 ? prev[lastAssistantIdx] : null;
          if (
            lastMsg &&
            lastMsg.role === "assistant" &&
            !lastMsg.isStreaming &&
            lastMsg.metadata?.type === "artifact"
          ) {
            // Merge file lists and update counts
            const existingFiles = (lastMsg.metadata.files as Array<{ path: string; action: string }>) || [];
            const mergedFilesMap = new Map<string, string>();
            for (const f of existingFiles) mergedFilesMap.set(f.path, f.action);
            for (const f of artifactMetadata.files) mergedFilesMap.set(f.path, f.action);
            const mergedFiles = Array.from(mergedFilesMap.entries()).map(([path, action]) => ({ path, action }));
            const mergedSummary = `${defaultFileAction === "created" ? "Generated" : "Updated"} ${mergedFiles.length} files successfully.`;
            const updated = [...prev];
            updated[lastAssistantIdx] = {
              ...lastMsg,
              id: dbMessageId || lastMsg.id,
              content: contentText,
              metadata: {
                ...(lastMsg.metadata || {}),
                ...artifactMetadata,
                summary: mergedSummary,
                files: mergedFiles,
              },
            };
            return updated;
          }

          // Race condition recovery: append as new message
          const multiRecoveryId = dbMessageId || assistantMessageId || `assistant-multi-${Date.now()}`;
          if (processedMessageIdsRef.current.has(multiRecoveryId)) return prev;
          console.warn('[ChatSidebar] multi-file complete had no matching assistantMessageId, appending');
          processedMessageIdsRef.current.add(multiRecoveryId);
          return [
            ...prev,
            {
              id: multiRecoveryId,
              role: "assistant" as const,
              content: contentText,
              isStreaming: false,
              metadata: artifactMetadata,
            },
          ];
        });

        // Persist action logs to localStorage for reload survival
        if (completedLogs && projectId) {
          try {
            const storageKey = `actionLogs:${projectId}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const storageMessageId = dbMessageId || assistantMessageId || `assistant-${Date.now()}`;
            existing[storageMessageId] = completedLogs;
            const keys = Object.keys(existing);
            if (keys.length > 20) {
              for (const k of keys.slice(0, keys.length - 20)) delete existing[k];
            }
            localStorage.setItem(storageKey, JSON.stringify(existing));
          } catch { /* ignore storage errors */ }
        }
        completeTurn();
      }

      setStreaming(false);
      sendingRef.current = false;
      onGenerationEnd?.();
      chatQueryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });
      assistantMessageIdRef.current = null;
      addedSkeletonNameRef.current = null;
      effectiveScreenIdRef.current = undefined;
    }
  }, [multiFileState, onGenerationEnd, projectId, chatQueryClient]);

  const sendMessage = useCallback(
    (
      message: string,
      messageParentScreenId?: string,
      overrideScreenId?: string,
      imageUrls?: string[],
    ) => {
      if (!message.trim() || isStreaming) return;

      // Guard: don't send chat messages while multi-file generation is in progress
      if (multiFileState?.isGenerating) return;

      // Synchronous double-send guard (survives React batching)
      if (sendingRef.current) return;
      sendingRef.current = true;
      // Reset the guard after a short delay to allow the next message
      setTimeout(() => { sendingRef.current = false; }, 500);

      // Reset error-handled flag for the new turn
      errorHandledRef.current = false;

      const effectiveScreenId = overrideScreenId || screenId;
      const effectiveParentScreenId = messageParentScreenId || parentScreenId;
      const resolvedScope = inferChatScope({
        message,
        effectiveScreenId,
        effectiveParentScreenId,
        hasSelectedElement: !!selectedElement,
        hasScreens: (screens?.length || 0) > 0,
      });
      const useMultiFileModify =
        !!modifyMultiFile &&
        !planMode &&
        resolvedScope === "app" &&
        (screens?.length || 0) > 0;

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;
      assistantMessageIdRef.current = assistantMessageId;
      processedMessageIdsRef.current.add(userMessageId);
      processedMessageIdsRef.current.add(assistantMessageId);

      setLocalMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: message,
          metadata: {
            ...(imageUrls?.length ? { imageUrls } : {}),
            executionMode: planMode ? "Plan" : "Direct",
          },
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          isStreaming: true,
        },
      ]);
      setStreaming(true);
      setStreamingStatus("Processing...");
      startTurn(planMode ? "Plan" : "Direct");
      setGenerationStatus((prev) => ({ ...prev, isGenerating: true }));
      // Only signal generation start and set screen loading for non-plan mode
      // Plan mode is analysis-only — it should NOT block the preview
      if (!planMode) {
        onGenerationStart?.();
        effectiveScreenIdRef.current = effectiveScreenId;
        if (effectiveScreenId) {
          onSetScreenLoading?.(effectiveScreenId, true, "Updating screen...");
        }
      } else {
        effectiveScreenIdRef.current = effectiveScreenId;
      }

      let addedSkeletonName: string | null = null;

      if (!effectiveScreenId && !effectiveParentScreenId) {
        const lowerMessage = message.toLowerCase();

        const hasNegation =
          /\b(don'?t|do not|no|not|never|without)\s+(create|generate|make|build|design|add)\b/i.test(
            lowerMessage,
          );

        if (!hasNegation) {
          const patterns = [
            /^create\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+screen|\s+page)?$/i,
            /^generate\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+screen|\s+page)?$/i,
            /^make\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+screen|\s+page)?$/i,
            /^build\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+screen|\s+page)?$/i,
            /^design\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)(?:\s+screen|\s+page)?$/i,
            /^add\s+(?:a\s+)?(?:the\s+)?([a-z0-9\s]+?)\s+screen$/i,
          ];

          for (const pattern of patterns) {
            const match = lowerMessage.match(pattern);
            if (match && match[1]) {
              addedSkeletonName = match[1].trim().replace(/\s+/g, "_");
              break;
            }
          }
        }

        if (addedSkeletonName) {
          addedSkeletonNameRef.current = addedSkeletonName;
          onAddSkeletons?.([addedSkeletonName]);
        }
      }

      if (socketConnected && (socketSendMessage || useMultiFileModify)) {
        const modelId = useModelStore.getState().getEffectiveModelId() || undefined;
        if (useMultiFileModify) {
          setStreamingStatus("Applying project-wide changes...");
          modifyMultiFile?.({
            userRequest: message,
            modelId,
          });
        } else if (socketSendMessage) {
          // Pass activePlanId when in plan mode for refinement detection
          const effectivePlanId = planMode ? (useChatStore.getState().activePlanId || undefined) : undefined;
          socketSendMessage(message, overrideScreenId || screenId, effectiveParentScreenId, planMode, enabledFeatures.length > 0 ? enabledFeatures : undefined, imageUrls, modelId, effectivePlanId);
        }

        // Safety timeout: if chat:complete/chat:error never arrives, auto-recover
        // Multi-file app updates can legitimately take several minutes.
        if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
        const timeoutMs = useMultiFileModify ? 300_000 : 180_000;
        chatTimeoutRef.current = setTimeout(() => {
          chatTimeoutRef.current = null;
          const stuckMessageId = assistantMessageIdRef.current;
          if (!stuckMessageId) return;

          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === stuckMessageId
                ? { ...msg, content: msg.content || "Response may have completed — refreshing...", isStreaming: false }
                : msg,
            ),
          );
          setStreaming(false);
          failTurn("Response timed out before the final event arrived.", true);
          onGenerationEnd?.();
          chatQueryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });
          chatQueryClient.invalidateQueries({ queryKey: ["screens", projectId] });
          // Don't clear assistantMessageIdRef — let chat:complete still update the message if it arrives late
          addedSkeletonNameRef.current = null;
        }, timeoutMs);

        return;
      }

      const callbacks: ChatStreamCallbacks = {
        onStatus: (_status, statusMessage) => {
          if (statusMessage) {
            setStreamingStatus(statusMessage);

            if (statusMessage.startsWith("Generating ") && !addedSkeletonName) {
              const screenNameFromStatus = statusMessage
                .replace("Generating ", "")
                .replace("...", "");
              addedSkeletonName = screenNameFromStatus.replace(/\s+/g, "_");
              addedSkeletonNameRef.current = addedSkeletonName;
              onAddSkeletons?.([addedSkeletonName]);
            }
          }
        },
        onContent: (_, accumulated) => {
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulated, isStreaming: true }
                : msg,
            ),
          );
        },
        onComplete: (
          messageId,
          fullContent,
          screen,
          pendingRecommendations,
          changedFiles,
        ) => {
          // Snapshot current action logs to persist with this message
          const completedActionLogs = actionLogs && actionLogs.length > 0 ? [...actionLogs] : undefined;

          // Persist action logs to localStorage for reload survival
          const finalMessageId = messageId || assistantMessageId;
          if (completedActionLogs && projectId) {
            try {
              const storageKey = `actionLogs:${projectId}`;
              const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
              existing[finalMessageId] = completedActionLogs;
              // Keep only the last 20 messages' logs to limit storage
              const keys = Object.keys(existing);
              if (keys.length > 20) {
                for (const k of keys.slice(0, keys.length - 20)) delete existing[k];
              }
              localStorage.setItem(storageKey, JSON.stringify(existing));
            } catch { /* ignore storage errors */ }
          }

          setLocalMessages((prev) => {
            const changedFileArtifacts = changedFiles?.map((file) => ({
              path: file.path,
              action: "modified" as const,
            }));
            let newMessages = prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    id: finalMessageId,
                    content: fullContent,
                    isStreaming: false,
                    metadata: changedFileArtifacts?.length
                      ? {
                          ...(msg.metadata || {}),
                          type: "artifact" as const,
                          summary: `Updated ${changedFileArtifacts.length} file${changedFileArtifacts.length === 1 ? "" : "s"} from this request.`,
                          files: changedFileArtifacts,
                          ...(completedActionLogs ? { actionLogs: completedActionLogs } : {}),
                        }
                      : {
                          ...(msg.metadata || {}),
                          ...(completedActionLogs ? { actionLogs: completedActionLogs } : {}),
                        },
                  }
                : msg,
            );

            if (pendingRecommendations && pendingRecommendations.length > 0) {
              const essential = pendingRecommendations
                .filter((r) => r.category === "essential")
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  type: r.type,
                  description: r.description,
                  reasoning: r.reasoning,
                }));
              const optional = pendingRecommendations
                .filter((r) => r.category === "optional")
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  type: r.type,
                  description: r.description,
                  reasoning: r.reasoning,
                }));

              const recommendationMessage: LocalMessage = {
                id: `rec-${Date.now()}`,
                role: "assistant",
                content: "",
                metadata: {
                  type: "screen_suggestion",
                  recommendations: { essential, optional },
                },
              };
              newMessages = [...newMessages, recommendationMessage];

              setGenerationStatus((prev) => ({
                ...prev,
                isGenerating: false,
                lastCompletedCount: screen
                  ? prev.lastCompletedCount + 1
                  : prev.lastCompletedCount,
                pendingRecommendations: { essential, optional },
              }));
            } else {
              setGenerationStatus((prev) => ({
                ...prev,
                isGenerating: false,
                lastCompletedCount: screen
                  ? prev.lastCompletedCount + 1
                  : prev.lastCompletedCount,
              }));
            }

            return newMessages;
          });
          setStreaming(false);
          if (planMode && !screen) {
            setAwaitingPlan();
          } else {
            completeTurn();
          }
          onGenerationEnd?.();
          chatQueryClient.invalidateQueries({
            queryKey: ["chatHistory", projectId],
          });

          // Auto-focus input after AI response completes
          setTimeout(() => inputRef.current?.focus(), 150);
          scrollToBottom();

          // Handle source files changed (for Code Studio integration)
          if (changedFiles && changedFiles.length > 0) {
            onFilesChanged?.(changedFiles);
            clearSelection(); // Clear element selection after edit
          }

          if (screen) {
            onScreenCreated?.(screen);
            useAuthStore.getState().refreshCredits();
          } else if (addedSkeletonName) {
            onRemoveSkeletons?.([addedSkeletonName]);
          }
          abortControllerRef.current = null;
          assistantMessageIdRef.current = null;
          addedSkeletonNameRef.current = null;
        },
        onError: (error, errorData) => {
          if (errorData?.code === 'LIMIT_EXCEEDED' || errorData?.code === 'INSUFFICIENT_CREDITS') {
            const { handleBillingError, currentPlan } = useBillingStore.getState();
            handleBillingError(errorData.code, error, currentPlan, errorData);
          }

          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: `Error: ${error}. If generation completed, refresh to see results.`,
                    isStreaming: false,
                    error: true,
                  }
                : msg,
            ),
          );
          setStreaming(false);
          failTurn(error, true);
          onGenerationEnd?.();
          if (effectiveScreenId) {
            onSetScreenLoading?.(effectiveScreenId, false);
          }
          if (addedSkeletonName) {
            onRemoveSkeletons?.([addedSkeletonName]);
          }
          chatQueryClient.invalidateQueries({
            queryKey: ["chatHistory", projectId],
          });
          chatQueryClient.invalidateQueries({
            queryKey: ["screens", projectId],
          });
          abortControllerRef.current = null;
          assistantMessageIdRef.current = null;
          addedSkeletonNameRef.current = null;
        },
        onConnectionError: () => {
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      "Connection lost. Generation may have completed - refresh to check.",
                    isStreaming: false,
                    error: true,
                  }
                : msg,
            ),
          );
          setStreaming(false);
          failTurn("Connection lost before the turn completed.", true);
          onGenerationEnd?.();
          if (effectiveScreenId) {
            onSetScreenLoading?.(effectiveScreenId, false);
          }
          if (addedSkeletonName) {
            onRemoveSkeletons?.([addedSkeletonName]);
          }
          chatQueryClient.invalidateQueries({
            queryKey: ["chatHistory", projectId],
          });
          chatQueryClient.invalidateQueries({
            queryKey: ["screens", projectId],
          });
          abortControllerRef.current = null;
          assistantMessageIdRef.current = null;
          addedSkeletonNameRef.current = null;
        },
      };

      abortControllerRef.current = chatApi.streamMessage(
        projectId,
        {
          message,
          screenId: overrideScreenId || screenId,
          parentScreenId: effectiveParentScreenId,
          // Include selected element for source_files editing
          selectedElement: selectedElement
            ? {
                elementType: selectedElement.elementType,
                innerText: selectedElement.innerText,
                selector: selectedElement.selector,
                boundingBox: selectedElement.boundingBox,
                screenPath: selectedElement.screenPath,
                screenName: selectedElement.screenName,
              }
            : undefined,
          screenPath: screenPath || selectedElement?.screenPath,
          screenName: screenName || selectedElement?.screenName,
          imageUrls,
          planMode,
        },
        callbacks,
      );
    },
    [
      isStreaming,
      projectId,
      screenId,
      screenPath,
      screenName,
      parentScreenId,
      onGenerationStart,
      onGenerationEnd,
      onScreenCreated,
      onAddSkeletons,
      onRemoveSkeletons,
      onSetScreenLoading,
      onFilesChanged,
      socketConnected,
      socketSendMessage,
      chatQueryClient,
      selectedElement,
      clearSelection,
      planMode,
      localMessages,
      screens,
      multiFileState,
      enabledFeatures,
      modifyMultiFile,
    ],
  );

  useEffect(() => {
    // Only process trigger if it's new and not currently streaming
    if (
      triggerMessage &&
      !isStreaming &&
      triggerMessage !== lastProcessedTriggerRef.current
    ) {
      lastProcessedTriggerRef.current = triggerMessage;
      sendMessage(triggerMessage, undefined, triggerScreenId);
      onTriggerMessageConsumed?.();
    }
    // Reset ref when trigger is consumed
    if (!triggerMessage) {
      lastProcessedTriggerRef.current = null;
    }
  }, [
    triggerMessage,
    triggerScreenId,
    isStreaming,
    sendMessage,
    onTriggerMessageConsumed,
  ]);

  const handleSendMessage = useCallback(() => {
    const message = input.trim();
    if (!message) return;

    // Collect uploaded image URLs
    const imageUrls = pendingImages
      .filter((img) => img.uploadedUrl && !img.error)
      .map((img) => img.uploadedUrl!);

    setInput("");
    // Clean up preview URLs
    for (const img of pendingImages) {
      URL.revokeObjectURL(img.previewUrl);
    }
    setPendingImages([]);

    // If a file is targeted (not a screen), resolve screen ID from file if possible,
    // and prepend file context to the message so the AI pipeline targets that file.
    let effectiveMessage = message;
    let effectiveOverrideScreenId = chatScreenId;

    if (chatFilePath && !chatScreenId) {
      // Try to find a screen that corresponds to this file path
      const matchingFile = projectFiles?.find(f => f.path === chatFilePath);
      if (matchingFile?.isScreen) {
        // Find the screen by name to get its ID
        const matchedScreen = screens?.find(s =>
          s.name === matchingFile.screenName ||
          matchingFile.path.toLowerCase().includes(s.name.toLowerCase().replace(/\s+/g, '-'))
        );
        if (matchedScreen) {
          effectiveOverrideScreenId = matchedScreen.id;
        }
      }
      // Prepend file path context so the AI targets that specific file
      effectiveMessage = `[File: ${chatFilePath}]\n${message}`;
    }

    sendMessage(effectiveMessage, undefined, effectiveOverrideScreenId, imageUrls.length > 0 ? imageUrls : undefined);
  }, [input, sendMessage, pendingImages, chatScreenId, chatFilePath, projectFiles, screens]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const handleImageSelect = useCallback(async (fileList: FileList) => {
    const newImages = Array.from(fileList).map((file) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null as string | null,
      isUploading: true,
      error: false,
    }));

    setPendingImages((prev) => [...prev, ...newImages]);

    // Upload each in parallel
    for (const img of newImages) {
      chatApi.uploadImage(img.file)
        .then((url) => {
          setPendingImages((prev) =>
            prev.map((p) =>
              p.id === img.id ? { ...p, uploadedUrl: url, isUploading: false } : p
            )
          );
        })
        .catch(() => {
          setPendingImages((prev) =>
            prev.map((p) =>
              p.id === img.id ? { ...p, isUploading: false, error: true } : p
            )
          );
        });
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        imageFiles.forEach((f) => dt.items.add(f));
        handleImageSelect(dt.files);
      }
    },
    [handleImageSelect],
  );

  const removeImage = useCallback((imageId: string) => {
    setPendingImages((prev) => {
      const img = prev.find((p) => p.id === imageId);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((p) => p.id !== imageId);
    });
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col h-full transition-all duration-300",
        embedded
          ? "w-full bg-transparent"
          : cn(
              "border-r border-surface-800/50 bg-surface-950/80 backdrop-blur-xl",
              isCollapsed ? "w-16" : "w-80",
            ),
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between p-3 border-b border-surface-800/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white truncate">
                  {projectName}
                </h2>
                <p className="text-[10px] text-surface-500">AI Assistant</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors flex-shrink-0"
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform",
                !isCollapsed && "rotate-180",
              )}
            />
          </button>
        </div>
      )}

      {/* Chat title for embedded mode */}
      {embedded && (
        <div className="px-3 py-2.5 border-b border-surface-800/50">
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
            AI Chat
          </h3>
        </div>
      )}

      {(!isCollapsed || embedded) && (
        <>
          {/* Selection Mode Toggle -- hidden in embedded mode (no canvas) */}
          {!embedded && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/30">
              <button
                onClick={() => setSelectionMode(!isSelectionMode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isSelectionMode
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-surface-800/50 text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent"
                )}
              >
                <MousePointer className="w-3.5 h-3.5" />
                {isSelectionMode ? "Exit Select" : "Select Element"}
              </button>
              {isSelectionMode && (
                <span className="text-[10px] text-surface-500">
                  Click an element to select
                </span>
              )}
            </div>
          )}

          {/* Selected Element Indicator */}
          {selectedElement && (
            <SelectedElementIndicator
              elementType={selectedElement.elementType}
              innerText={selectedElement.innerText}
              onClear={clearSelection}
            />
          )}

          {editSuggestion && screenName && (
            <EditModeIndicator
              screenName={screenName}
              onCancel={() => {
                onEditSuggestionConsumed?.();
              }}
            />
          )}

          <div
            ref={scrollRef}
            className="flex-1 h-0 min-h-0 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700 hover:scrollbar-thumb-surface-600"
          >
            {(isLoadingHistory || (!historyInitialized && !isHistoryError && localMessages.length === 0)) ? (
              <div className="space-y-4 py-4 animate-pulse">
                {/* Skeleton: assistant message */}
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-800 flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-[75%]">
                    <div className="h-3 bg-surface-800 rounded-full w-full" />
                    <div className="h-3 bg-surface-800 rounded-full w-4/5" />
                    <div className="h-3 bg-surface-800 rounded-full w-3/5" />
                  </div>
                </div>
                {/* Skeleton: user message */}
                <div className="flex gap-2 flex-row-reverse">
                  <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex-shrink-0" />
                  <div className="space-y-2 max-w-[65%]">
                    <div className="h-3 bg-surface-800 rounded-full w-full" />
                    <div className="h-3 bg-surface-800 rounded-full w-3/4" />
                  </div>
                </div>
                {/* Skeleton: assistant message */}
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-800 flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-[70%]">
                    <div className="h-3 bg-surface-800 rounded-full w-full" />
                    <div className="h-3 bg-surface-800 rounded-full w-5/6" />
                  </div>
                </div>
                {/* Skeleton: user message */}
                <div className="flex gap-2 flex-row-reverse">
                  <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex-shrink-0" />
                  <div className="space-y-2 max-w-[60%]">
                    <div className="h-3 bg-surface-800 rounded-full w-full" />
                  </div>
                </div>
              </div>
            ) : localMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-cyan-500/10 flex items-center justify-center mb-4 border border-primary-500/20">
                  <Sparkles className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-surface-200 mb-1.5">
                  What would you like to build?
                </h3>
                <p className="text-sm text-surface-500 mb-5">
                  Describe your app and I'll generate the screens for you.
                </p>
                <div className="flex flex-col gap-2.5 w-full">
                  {([
                    { text: 'A fitness tracking app', desc: 'Track workouts, set goals, view progress', icon: Dumbbell },
                    { text: 'A recipe sharing app', desc: 'Browse recipes, save favorites, share with friends', icon: ChefHat },
                    { text: 'A task manager with teams', desc: 'Organize tasks, assign to members, track deadlines', icon: Users },
                  ] as const).map(({ text, desc, icon: Icon }) => (
                    <button
                      key={text}
                      onClick={() => { setInput(text); inputRef.current?.focus(); }}
                      className="group text-left px-4 py-3 rounded-xl bg-surface-800/40 border border-surface-700/50
                                 hover:bg-surface-800/70 hover:border-surface-600/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
                                 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5
                                        group-hover:bg-primary-500/20 transition-colors">
                          <Icon className="w-4 h-4 text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-300 group-hover:text-white transition-colors">
                            {text}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">
                            {desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              localMessages.filter((msg, idx, arr) => arr.findIndex((m) => m.id === msg.id) === idx).map((message, index) => (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    onScreenClick={onViewScreen}
                    progressMessages={progressMessages}
                    onGenerateRecommended={onGenerateRecommended}
                    onDismissRecommendations={onDismissRecommendations}
                    streamingStatus={
                      message.isStreaming ? streamingStatus : undefined
                    }
                    screens={screens}
                    onViewScreen={onViewScreen}
                    onRetry={message.error ? (() => {
                      // Find the preceding user message to re-send
                      const userMsg = localMessages.slice(0, index).reverse().find(m => m.role === 'user');
                      if (!userMsg || !socketSendMessage) return;

                      // Replace the failed assistant message with a fresh streaming placeholder
                      const retryAssistantId = `assistant-retry-${Date.now()}`;
                      assistantMessageIdRef.current = retryAssistantId;
                      setLocalMessages(prev => prev.map(m =>
                        m.id === message.id
                          ? { ...m, id: retryAssistantId, content: '', isStreaming: true, error: false }
                          : m
                      ));
                      setStreaming(true);
                      setStreamingStatus('Retrying...');
                      startTurn(planModeRef.current ? 'Plan' : 'Direct');
                      setGenerationStatus(prev => ({ ...prev, isGenerating: true }));
                      onGenerationStart?.();

                      // Re-send with original parameters from the user message metadata
                      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;
                      const imgUrls = userMsg.metadata?.imageUrls as string[] | undefined;
                      const retryPlanId = planModeRef.current ? (useChatStore.getState().activePlanId || undefined) : undefined;
                      socketSendMessage(userMsg.content, screenId, parentScreenId, planModeRef.current, enabledFeatures.length > 0 ? enabledFeatures : undefined, imgUrls, modelId, retryPlanId);
                    }) : undefined}
                    liveActionLogs={message.isStreaming ? actionLogs : undefined}
                    isPlanImplementing={isPlanImplementing}
                    onRefinePlan={socketSendMessage ? (planId: string, feedback: string) => {
                      // Send refinement as a plan-mode message with the planId
                      const refinementAssistantId = `assistant-refine-${Date.now()}`;
                      const refinementUserId = `user-refine-${Date.now()}`;
                      assistantMessageIdRef.current = refinementAssistantId;
                      processedMessageIdsRef.current.add(refinementAssistantId);
                      processedMessageIdsRef.current.add(refinementUserId);

                      setLocalMessages((prev) => [
                        ...prev,
                        {
                          id: refinementUserId,
                          role: "user",
                          content: feedback,
                          metadata: { executionMode: "Plan" },
                        },
                        {
                          id: refinementAssistantId,
                          role: "assistant",
                          content: "",
                          isStreaming: true,
                        },
                      ]);
                      setStreaming(true);
                      setStreamingStatus("Refining plan...");
                      planModeRef.current = true;
                      startTurn("Plan");

                      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;
                      socketSendMessage(feedback, screenId, parentScreenId, true, undefined, undefined, modelId, planId);
                    } : undefined}
                    onConfirmPlan={socketSendMessage ? (planContent: string) => {
                      // Find the original user message that triggered this plan
                      const userMsg = localMessages.slice(0, index).reverse().find(m => m.role === 'user');
                      if (!userMsg) return;

                      // Mark this plan message as implemented so the button disappears
                      setLocalMessages((prev) =>
                        prev.map((m) =>
                          m.id === message.id
                            ? { ...m, metadata: { ...m.metadata, planImplemented: true } }
                            : m,
                        ),
                      );

                      setIsPlanImplementing(true);
                      clearActivePlan();

                      // Create a new assistant placeholder for the implementation
                      const implAssistantId = `assistant-impl-${Date.now()}`;
                      assistantMessageIdRef.current = implAssistantId;
                      processedMessageIdsRef.current.add(implAssistantId);

                      setLocalMessages((prev) => [
                        ...prev,
                        {
                          id: implAssistantId,
                          role: "assistant",
                          content: "",
                          isStreaming: true,
                        },
                      ]);
                      setStreaming(true);
                      setStreamingStatus("Implementing plan...");
                      // Temporarily switch to Direct mode so the response is tagged correctly
                      planModeRef.current = false;
                      startTurn("Direct");
                      setGenerationStatus((prev) => ({ ...prev, isGenerating: true }));
                      // Do NOT call onGenerationStart or onSetScreenLoading here —
                      // keep the existing preview visible until actual code arrives.
                      // The screen:complete handler will update the preview naturally.

                      const effectiveScreenId = chatScreenId || screenId;
                      effectiveScreenIdRef.current = effectiveScreenId;

                      // Re-send the original user message in direct mode with the plan as context
                      const implementMessage = `Implement this plan:\n\n${planContent}\n\nOriginal request: ${userMsg.content}`;
                      const modelId = useModelStore.getState().getEffectiveModelId() || undefined;
                      socketSendMessage(implementMessage, effectiveScreenId, parentScreenId, false, enabledFeatures.length > 0 ? enabledFeatures : undefined, undefined, modelId);
                    } : undefined}
                    onUndoEdit={emitEditUndo ? (editScreenId, versionId) => {
                      emitEditUndo(editScreenId, versionId);
                    } : undefined}
                    onEditMessage={(messageId, newContent) => {
                      // Update the message text and remove all subsequent messages
                      setLocalMessages((prev) => {
                        const msgIndex = prev.findIndex((m) => m.id === messageId);
                        if (msgIndex === -1) return prev;
                        const updated = [...prev.slice(0, msgIndex), { ...prev[msgIndex], content: newContent }];
                        return updated;
                      });
                      // Re-send the edited message
                      if (socketSendMessage) {
                        socketSendMessage(newContent);
                      }
                    }}
                  />
              ))
            )}

            {/* Scroll anchor */}
            <div ref={scrollAnchorRef} className="h-0 w-0" />
          </div>

          {/* Scroll-to-bottom pill */}
          {isScrolledAway && localMessages.length > 0 && (
            <div className="flex justify-center -mt-8 mb-1 relative z-20">
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           bg-surface-800/90 border border-surface-700/60 text-xs text-surface-300
                           hover:bg-surface-700 hover:text-white shadow-lg shadow-black/30
                           transition-all duration-200 backdrop-blur-sm"
              >
                <ArrowDown className="w-3 h-3" />
                New messages
              </button>
            </div>
          )}

          {/* Generation Status Card removed — duplicate of planned_screens card in chat */}

          {/* Screen Recommendations Widget - shows pending recommendations */}
          {generationStatus.pendingRecommendations && (
            <div className="px-3 py-2 border-t border-surface-700/50">
              <ScreenListWidget
                mode="recommendations"
                recommendations={generationStatus.pendingRecommendations}
                onAddRecommendedScreen={(screenIdToAdd) => {
                  onGenerateRecommended?.([screenIdToAdd]);
                }}
                onAddAllRecommendations={(screenIds) => {
                  setGenerationStatus((prev) => ({
                    ...prev,
                    pendingRecommendations: null,
                  }));
                  setLocalMessages((prev) =>
                    prev.filter(
                      (m) => m.metadata?.type !== "screen_suggestion",
                    ),
                  );
                  onGenerateRecommended?.(screenIds);
                }}
              />
            </div>
          )}

          {/* Compact generation status indicator removed — used stale canvas data, duplicated planning card */}

          <div className="px-3 py-3 border-t border-surface-800/50">
            {/* Pending image thumbnails */}
            {pendingImages.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2 px-1">
                {pendingImages.map((img) => (
                  <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-surface-700/50 group">
                    <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    {img.isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                    {img.error && (
                      <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Plan refinement hint */}
            {turnState.status === "awaiting-user-plan" && activePlanId && (
              <div className="text-[10px] text-surface-500 mb-1 px-1">
                Type feedback to refine the plan, or click "Implement Plan" above
              </div>
            )}

            {/* Consolidated progress indicator */}
            <ChatProgressIndicator
              isStreaming={isStreaming}
              statusMessage={streamingStatus}
              multiFileState={multiFileState}
              actionLogs={actionLogs}
              turnStatus={turnState.status}
              turnError={turnState.lastError || undefined}
            />

            {/* Active feature pills */}
            {enabledFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {enabledFeatures.map(featureId => {
                  const feature = featureCatalog?.find(f => f.id === featureId);
                  return feature ? (
                    <span
                      key={featureId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px]"
                    >
                      {feature.name}
                      <button
                        onClick={() => {
                          if (onFeaturesChange) {
                            onFeaturesChange(enabledFeatures.filter(f => f !== featureId));
                          }
                        }}
                        className="hover:text-blue-300"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Feature picker popover */}
            <div className="relative">
              <FeaturePicker
                projectId={projectId}
                enabledFeatures={enabledFeatures}
                onToggleFeature={(featureId) => {
                  if (onFeaturesChange) {
                    const newFeatures = enabledFeatures.includes(featureId)
                      ? enabledFeatures.filter(f => f !== featureId)
                      : [...enabledFeatures, featureId];
                    onFeaturesChange(newFeatures);
                  }
                }}
                isOpen={showFeaturePicker}
                onClose={() => setShowFeaturePicker(false)}
              />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleImageSelect(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Unified input box */}
            <div className="rounded-xl bg-surface-800/50 border border-surface-700/50 focus-within:border-primary-500/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  editSuggestion
                    ? "Describe your changes..."
                    : isStreaming
                      ? "Waiting..."
                      : selectedElement
                        ? `Describe changes to this ${selectedElement.elementType}...`
                        : selectedScreen
                          ? `Describe changes to "${selectedScreen.name}"...`
                          : chatFilePath
                            ? `Describe changes to ${selectedFileName}...`
                            : screenName
                              ? `Edit "${screenName}" or create new screen...`
                              : "Describe the mobile app you want to build..."
                }
                disabled={isStreaming}
                rows={2}
                className={cn(
                  "w-full resize-none bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none pt-3 pb-1 px-3.5 max-h-[150px]",
                  isStreaming && "cursor-not-allowed opacity-50",
                )}
              />

              {/* Bottom toolbar — single row */}
              <div className="flex items-center gap-1 px-1.5 pb-1.5">
                {/* Attach */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming}
                  className={cn(
                    "flex-shrink-0 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors",
                    isStreaming && "cursor-not-allowed opacity-50",
                  )}
                  title="Attach images"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

                {/* Compact screen/file selector */}
                {((screens && screens.length > 0) || (projectFiles && projectFiles.length > 0)) && (
                  <div ref={screenDropdownRef} className="relative">
                    {/* Active selection pill */}
                    {chatScreenId && selectedScreen ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/10 border border-primary-500/25">
                        <Smartphone className="w-3 h-3 text-primary-400 flex-shrink-0" />
                        <span className="text-[11px] text-primary-300 font-medium truncate max-w-[80px]">
                          {selectedScreen.name}
                        </span>
                        <button
                          onClick={() => setChatScreenId(undefined)}
                          className="p-0.5 rounded text-surface-400 hover:text-white transition-colors flex-shrink-0"
                          title="Clear screen selection"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : chatFilePath && selectedFileName ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                        <FileCode className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className="text-[11px] text-emerald-300 font-medium truncate max-w-[80px] font-mono">
                          {selectedFileName}
                        </span>
                        <button
                          onClick={() => setChatFilePath(undefined)}
                          className="p-0.5 rounded text-surface-400 hover:text-white transition-colors flex-shrink-0"
                          title="Clear file selection"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setScreenDropdownOpen(!screenDropdownOpen)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-surface-400 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                      >
                        <Smartphone className="w-3 h-3 flex-shrink-0" />
                        <span>Target</span>
                        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", screenDropdownOpen && "rotate-180")} />
                      </button>
                    )}

                    {/* Dropdown with Screens / Files tabs */}
                    {screenDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-56 max-h-64 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex border-b border-surface-700">
                          <button
                            onClick={() => setSelectorTab('screens')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors",
                              selectorTab === 'screens'
                                ? "text-white border-b border-primary-400 bg-surface-800/50"
                                : "text-surface-500 hover:text-surface-300"
                            )}
                          >
                            <Smartphone className="w-3 h-3" />
                            Screens
                          </button>
                          <button
                            onClick={() => setSelectorTab('files')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors",
                              selectorTab === 'files'
                                ? "text-white border-b border-emerald-400 bg-surface-800/50"
                                : "text-surface-500 hover:text-surface-300"
                            )}
                          >
                            <FileCode className="w-3 h-3" />
                            Files
                          </button>
                        </div>

                        {/* Tab content */}
                        <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
                          {selectorTab === 'screens' ? (
                            screens && screens.length > 0 ? (
                              screens.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setChatScreenId(s.id);
                                    setChatFilePath(undefined);
                                    setScreenDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-surface-800 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-white truncate">{s.name}</span>
                                    <span className="ml-auto text-[10px] text-surface-500 flex-shrink-0">{s.type}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-xs text-surface-500">No screens yet</p>
                            )
                          ) : (
                            projectFiles && projectFiles.length > 0 ? (
                              projectFiles
                                .filter(f => !f.path.endsWith('/'))
                                .map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => {
                                      setChatFilePath(f.path);
                                      setChatScreenId(undefined);
                                      setScreenDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-surface-800 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileCode className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs font-medium text-white truncate block font-mono">
                                          {f.path.split('/').pop()}
                                        </span>
                                        <span className="text-[10px] text-surface-500 truncate block font-mono">
                                          {f.path.split('/').slice(0, -1).join('/')}
                                        </span>
                                      </div>
                                      {f.isScreen && (
                                        <span className="text-[9px] text-primary-400 bg-primary-500/10 px-1 py-0.5 rounded flex-shrink-0">screen</span>
                                      )}
                                    </div>
                                  </button>
                                ))
                            ) : (
                              <p className="px-3 py-2 text-xs text-surface-500">No files yet</p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Model selector */}
                <ModelSelector />

                {/* Plan toggle */}
                <button
                  onClick={() => setPlanMode(!planMode)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all",
                    planMode
                      ? "bg-primary-500/15 text-primary-300 border border-primary-500/30"
                      : "text-surface-500 hover:text-surface-300 border border-transparent hover:border-surface-700/50"
                  )}
                >
                  <ListChecks className="w-3 h-3" />
                  Plan
                </button>

                {/* Send — right-aligned */}
                <div className="ml-auto">
                  <button
                    onClick={handleSendMessage}
                    disabled={isStreaming || !input.trim()}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      isStreaming || !input.trim()
                        ? "text-surface-500 cursor-not-allowed"
                        : "bg-primary-500 text-white hover:bg-primary-400 shadow-lg shadow-primary-500/20",
                    )}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4">
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center hover:bg-primary-500/30 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-primary-400" />
          </button>
        </div>
      )}
    </div>
  );
}
