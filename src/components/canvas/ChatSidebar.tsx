import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
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
  Zap,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
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
import type { ScreenData, RecommendationItem, LocalMessage, GenerationStatus } from "@/types/canvas";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { GenerationStatusCard } from "./GenerationStatusCard";
import { ScreenListWidget } from "@/components/chat/ScreenListWidget";
import { useElementSelection } from "@/hooks/useElementSelection";

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
  socketSendMessage?: (message: string, screenId?: string, parentScreenId?: string, planMode?: boolean) => void;
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
  activeProgress: activeProgressProp,
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
  startMultiFileGeneration,
  modifyMultiFile,
  multiFileState,
}: ChatSidebarProps) {
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>("");
  const [input, setInput] = useState("");
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const hasGeneratingScreens = screens && screens.some(s => s.isLoading);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    isGenerating: false,
    lastCompletedCount: 0,
    pendingRecommendations: null,
  });
  const [planMode, setPlanMode] = useState(true);

  // Extract pending planned screens (planning done but skeletons not yet created)
  const pendingPlannedScreens = useMemo(() => {
    if (hasGeneratingScreens) return null; // real screens exist, no gap
    const plannedMsg = [...localMessages].reverse().find(
      m => (m.metadata?.type as string) === 'planned_screens' && m.metadata?.screens
    );
    if (!plannedMsg) return null;
    const plannedScreens = plannedMsg.metadata!.screens as Array<{
      id: string; name: string; type: string; description: string; status: string;
    }>;
    // Null once all planned screens have been created
    if (screens && screens.length > 0) {
      const existingNames = new Set(screens.map(s => s.name.toLowerCase()));
      if (plannedScreens.every(ps => existingNames.has(ps.name.toLowerCase()))) return null;
    }
    return plannedScreens.map((s, i) => ({
      id: s.id,
      name: s.name,
      type: s.type || 'custom',
      description: s.description || '',
      status: 'pending' as const,
      order: i,
    }));
  }, [localMessages, hasGeneratingScreens, screens]);

  const isActiveGeneration = generationStatus.isGenerating || hasGeneratingScreens || !!pendingPlannedScreens;

  const [pendingImages, setPendingImages] = useState<Array<{
    id: string;
    file: File;
    previewUrl: string;
    uploadedUrl: string | null;
    isUploading: boolean;
    error: boolean;
  }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedTriggerRef = useRef<string | null>(null);
  const chatQueryClient = useQueryClient();

  // Element selection state
  const { selectedElement, isSelectionMode, setSelectionMode, clearSelection } = useElementSelection();

  // Compute active progress: prefer prop from Canvas (derived from socket states), fallback to progressMessages
  const activeProgress = useMemo(() => {
    if (activeProgressProp) return activeProgressProp;
    if (!progressMessages) return null;
    for (const [, data] of progressMessages) {
      if ((data as { overallProgress: number }).overallProgress < 100) return data as { overallProgress: number; currentScreen?: { name: string } };
    }
    return null;
  }, [activeProgressProp, progressMessages]);

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["chatHistory", projectId],
    queryFn: async () => {
      const response = await chatApi.getHistory(projectId, { limit: 100 });
      // Backend wraps in { success: true, data: { messages, ... } }
      return (response.data as unknown as { data: { messages: unknown[] } }).data;
    },
    enabled: !!projectId,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache - always fetch fresh data on mount
    refetchOnMount: "always", // Refetch when component mounts
    refetchInterval: !historyInitialized ? 3000 : false, // Poll until history loads
  });

  // Reset history when projectId changes
  useEffect(() => {
    setHistoryInitialized(false);
    setLocalMessages([]);
  }, [projectId]);


  useEffect(() => {
    if (historyData?.messages && !historyInitialized) {
      const mappedMessages = (historyData.messages as Array<{
        id: string;
        role: "user" | "assistant";
        message: string;
        createdScreenId?: string;
        metadata?: LocalMessage["metadata"];
      }>).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.message,
        createdScreenId: msg.createdScreenId,
        metadata: msg.metadata,
      }));
      // Only mark initialized when we actually have messages.
      // Design system generation saves chat messages asynchronously,
      // so the first fetch may return empty — keep polling until messages arrive.
      if (mappedMessages.length > 0) {
        setLocalMessages(mappedMessages);
        setHistoryInitialized(true);
      }
    }
  }, [historyData, historyInitialized]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
  const effectiveScreenIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!onSocketChatComplete) return;

    onSocketChatComplete((data: ChatCompleteData) => {
      const assistantMessageId = assistantMessageIdRef.current;
      const addedSkeletonName = addedSkeletonNameRef.current;

      setLocalMessages((prev) => {
        let newMessages = prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                id: data.messageId || assistantMessageId,
                content: data.content,
                isStreaming: false,
              }
            : msg,
        );

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

      setIsStreaming(false);
      onGenerationEnd?.();
      chatQueryClient.invalidateQueries({ queryKey: ["chatHistory", projectId] });

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
  }, [onSocketChatComplete, onGenerationEnd, onScreenCreated, onRemoveSkeletons, projectId, chatQueryClient]);

  useEffect(() => {
    if (!onSocketChatError) return;

    onSocketChatError((error: string, code?: string) => {
      const assistantMessageId = assistantMessageIdRef.current;
      const addedSkeletonName = addedSkeletonNameRef.current;
      const effectiveScreenId = effectiveScreenIdRef.current;

      if (code === 'LIMIT_EXCEEDED' || code === 'INSUFFICIENT_CREDITS') {
        const { handleBillingError, currentPlan } = useBillingStore.getState();
        handleBillingError(code, error, currentPlan, {});
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

      setIsStreaming(false);
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
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageIdRef.current
            ? { ...msg, content: socketChatState.accumulated, isStreaming: true }
            : msg,
        ),
      );
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
      setStreamingStatus(`Generating ${multiFileState.currentFile}...`);
    }

    // Generation just completed
    if (wasGenerating && !isNowGenerating) {
      const assistantMessageId = assistantMessageIdRef.current;

      if (multiFileState.error) {
        // Error case
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `Error during multi-file generation: ${multiFileState.error}`,
                  isStreaming: false,
                  error: true,
                }
              : msg,
          ),
        );
      } else {
        // Success case
        const fileCount = multiFileState.files.size;
        const fileNames = Array.from(multiFileState.files.keys());
        const screenFiles = fileNames.filter(f => f.includes('/app/') || f.includes('/screen'));
        const utilFiles = fileNames.filter(f => !screenFiles.includes(f));

        let summary = `Generated ${fileCount} files successfully.`;
        if (screenFiles.length > 0) {
          summary += `\n\n**Screens (${screenFiles.length}):** ${screenFiles.map(f => f.split('/').pop()).join(', ')}`;
        }
        if (utilFiles.length > 0) {
          summary += `\n\n**Utilities (${utilFiles.length}):** ${utilFiles.map(f => f.split('/').pop()).join(', ')}`;
        }
        summary += '\n\nSelect a file from the file selector above the preview to browse the generated code.';

        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: summary, isStreaming: false }
              : msg,
          ),
        );
      }

      setIsStreaming(false);
      onGenerationEnd?.();
      assistantMessageIdRef.current = null;
    }
  }, [multiFileState, onGenerationEnd]);

  // Detect whether a user message describes a full app (multi-screen intent)
  const detectMultiAppIntent = useCallback((message: string): boolean => {
    const lower = message.toLowerCase();
    // Keywords that signal the user wants an entire app, not a single screen
    const appKeywords = [
      'build me an app',
      'build an app',
      'create an app',
      'create a app',
      'make me an app',
      'make an app',
      'build me a ',
      'create a multi-screen',
      'multi-screen app',
      'full app',
      'entire app',
      'complete app',
      'application with',
      'application that',
      'build a ',
      'create a ',
    ];
    const hasAppKeyword = appKeywords.some(kw => lower.includes(kw));
    // Also check for phrases like "app that..." or "application for..."
    const appPatterns = /\b(app|application)\b.*\b(that|for|with|to|which)\b/i;
    return hasAppKeyword || appPatterns.test(lower);
  }, []);

  // Parse app description into screens array for multi-file generation
  const parseScreensFromDescription = useCallback((message: string): Array<{ name: string; description: string }> => {
    const screens: Array<{ name: string; description: string }> = [];
    // Look for explicit screen mentions
    const screenPatterns = [
      /(?:with|include|has|having|containing)\s+(?:a\s+)?(?:screens?|pages?)\s*(?:like|such as|:|\-)\s*(.+)/i,
      /(?:screens?|pages?):\s*(.+)/i,
    ];

    let screenList: string | null = null;
    for (const pattern of screenPatterns) {
      const match = message.match(pattern);
      if (match) {
        screenList = match[1];
        break;
      }
    }

    if (screenList) {
      // Split by comma, "and", semicolons
      const items = screenList.split(/[,;]|\band\b/i).map(s => s.trim()).filter(Boolean);
      for (const item of items) {
        const name = item.replace(/\b(screen|page)\b/gi, '').trim();
        if (name) {
          screens.push({ name, description: name });
        }
      }
    }

    // If no explicit screens found, generate sensible defaults from the app type
    if (screens.length === 0) {
      screens.push(
        { name: "Home", description: "Main home/landing screen" },
        { name: "Details", description: "Detail view screen" },
        { name: "Profile", description: "User profile screen" },
        { name: "Settings", description: "App settings screen" },
      );
    }

    return screens;
  }, []);

  const sendMessage = useCallback(
    (
      message: string,
      messageParentScreenId?: string,
      overrideScreenId?: string,
      imageUrls?: string[],
    ) => {
      if (!message.trim() || isStreaming) return;

      // --- Multi-file intent detection ---
      // Only trigger for first message in a new project (no screens, no history)
      const isFirstMessage = localMessages.length === 0 && (!screens || screens.length === 0);
      const effectiveScreenId = overrideScreenId || screenId;
      const effectiveParentScreenId = messageParentScreenId || parentScreenId;

      if (
        isFirstMessage &&
        !effectiveScreenId &&
        !effectiveParentScreenId &&
        startMultiFileGeneration &&
        detectMultiAppIntent(message)
      ) {
        // Route to multi-file generation
        const parsedScreens = parseScreensFromDescription(message);

        const userMessageId = `user-${Date.now()}`;
        const assistantMessageId = `assistant-${Date.now()}`;
        assistantMessageIdRef.current = assistantMessageId;

        setLocalMessages((prev) => [
          ...prev,
          { id: userMessageId, role: "user", content: message },
          {
            id: assistantMessageId,
            role: "assistant",
            content: `Generating a full multi-file app with ${parsedScreens.length} screens: ${parsedScreens.map(s => s.name).join(", ")}...`,
            isStreaming: true,
          },
        ]);
        setIsStreaming(true);
        setStreamingStatus("Starting multi-file generation...");
        onGenerationStart?.();

        startMultiFileGeneration({
          appDescription: message,
          screens: parsedScreens,
        });

        return;
      }

      // --- Multi-file modify: if we already have multi-file content, route modifications there ---
      if (
        modifyMultiFile &&
        multiFileState &&
        multiFileState.files.size > 0 &&
        !multiFileState.isGenerating &&
        !effectiveScreenId &&
        !effectiveParentScreenId
      ) {
        const userMessageId = `user-${Date.now()}`;
        const assistantMessageId = `assistant-${Date.now()}`;
        assistantMessageIdRef.current = assistantMessageId;

        setLocalMessages((prev) => [
          ...prev,
          { id: userMessageId, role: "user", content: message },
          {
            id: assistantMessageId,
            role: "assistant",
            content: "Modifying files...",
            isStreaming: true,
          },
        ]);
        setIsStreaming(true);
        setStreamingStatus("Modifying files...");
        onGenerationStart?.();

        modifyMultiFile({ prompt: message });
        return;
      }

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;
      assistantMessageIdRef.current = assistantMessageId;

      setLocalMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: message,
          ...(imageUrls?.length ? { metadata: { imageUrls } } : {}),
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          isStreaming: true,
        },
      ]);
      setIsStreaming(true);
      setStreamingStatus("Processing...");
      setGenerationStatus((prev) => ({ ...prev, isGenerating: true }));
      onGenerationStart?.();

      effectiveScreenIdRef.current = effectiveScreenId;
      if (effectiveScreenId) {
        onSetScreenLoading?.(effectiveScreenId, true, "Updating screen...");
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

      if (socketConnected && socketSendMessage) {
        socketSendMessage(message, overrideScreenId || screenId, effectiveParentScreenId, planMode);
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
          setLocalMessages((prev) => {
            let newMessages = prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    id: messageId || assistantMessageId,
                    content: fullContent,
                    isStreaming: false,
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
          setIsStreaming(false);
          onGenerationEnd?.();
          chatQueryClient.invalidateQueries({
            queryKey: ["chatHistory", projectId],
          });

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
          setIsStreaming(false);
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
          setIsStreaming(false);
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
      startMultiFileGeneration,
      modifyMultiFile,
      multiFileState,
      detectMultiAppIntent,
      parseScreensFromDescription,
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

    sendMessage(message, undefined, undefined, imageUrls.length > 0 ? imageUrls : undefined);
  }, [input, sendMessage, pendingImages]);

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
            className="flex-1 h-0 min-h-0 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700 hover:scrollbar-thumb-surface-600"
          >
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
              </div>
            ) : localMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  Start a conversation
                </h3>
                <p className="text-xs text-surface-400 text-center max-w-[200px] leading-relaxed mb-4">
                  Describe screens or ask for modifications to your designs.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button
                    onClick={() => { setInput("Create a "); inputRef.current?.focus(); }}
                    className="px-3 py-2 bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-300 hover:text-white transition-colors text-left"
                  >
                    + Create a new screen
                  </button>
                  <button
                    onClick={() => { setInput("Edit the "); inputRef.current?.focus(); }}
                    className="px-3 py-2 bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 rounded-lg text-xs text-surface-300 hover:text-white transition-colors text-left"
                  >
                    Modify a screen
                  </button>
                </div>
              </div>
            ) : (
              localMessages.map((message) => (
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
                />
              ))
            )}
          </div>

          {/* Generation Status Card - above input */}
          <GenerationStatusCard
            activeProgress={activeProgress}
            generationStatus={generationStatus}
            onGenerateRecommended={(screenIds) => {
              setGenerationStatus((prev) => ({
                ...prev,
                pendingRecommendations: null,
              }));
              // Also remove recommendation messages from chat history
              setLocalMessages((prev) =>
                prev.filter((m) => m.metadata?.type !== "screen_suggestion"),
              );
              onGenerateRecommended?.(screenIds);
            }}
            onDismissRecommendations={(screenIds) => {
              setGenerationStatus((prev) => ({
                ...prev,
                pendingRecommendations: null,
              }));
              // Also remove recommendation messages from chat history
              setLocalMessages((prev) =>
                prev.filter((m) => m.metadata?.type !== "screen_suggestion"),
              );
              onDismissRecommendations?.(screenIds);
            }}
          />

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

          {/* Compact generation status indicator */}
          {isActiveGeneration && (() => {
            const total = screens?.filter(s => !s.parentScreenId).length ?? 0;
            const loading = screens?.filter(s => s.isLoading).length ?? 0;
            const done = total - loading;
            const indicatorPct = total > 0 ? (done / total) * 100 : 0;
            const allScreensDone = total > 0 && done === total && hasGeneratingScreens === false;

            return (
              <div className="px-3 py-2 border-t border-surface-800/50">
                <div className={cn(
                  "px-2 py-1.5 rounded-lg bg-surface-800/60 border transition-colors",
                  allScreensDone
                    ? "border-green-500/30"
                    : hasGeneratingScreens
                      ? "border-primary-500/30 animate-pulse"
                      : "border-surface-700/40"
                )}>
                  <div className="flex items-center gap-2">
                    {allScreensDone ? (
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400 flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-xs truncate",
                      allScreensDone ? "text-green-400" : "text-surface-300"
                    )}>
                      {allScreensDone
                        ? 'All screens generated'
                        : hasGeneratingScreens
                          ? `Generating ${done}/${total} screens...`
                          : pendingPlannedScreens
                            ? 'Starting generation...'
                            : streamingStatus || 'Planning screens...'}
                    </span>
                  </div>
                  {/* Thin progress bar */}
                  {total > 0 && (
                    <div className="mt-1.5 h-1 bg-surface-700/50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          allScreensDone ? "bg-green-500" : "bg-primary-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${indicatorPct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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

            {/* Plan mode toggle */}
            {!screenId && !selectedElement && (
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={() => setPlanMode(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                    planMode
                      ? "bg-primary-500/15 text-primary-300 border border-primary-500/30"
                      : "text-surface-500 hover:text-surface-300 border border-transparent hover:border-surface-700/50"
                  )}
                >
                  <ListChecks className="w-3 h-3" />
                  Plan
                </button>
                <button
                  onClick={() => setPlanMode(false)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                    !planMode
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "text-surface-500 hover:text-surface-300 border border-transparent hover:border-surface-700/50"
                  )}
                >
                  <Zap className="w-3 h-3" />
                  Direct
                </button>
              </div>
            )}

            <div className="relative flex items-end gap-2 p-2 rounded-xl bg-surface-800/50 border border-surface-700/50 focus-within:border-primary-500/50 transition-colors">
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors",
                  isStreaming && "cursor-not-allowed opacity-50",
                )}
                title="Attach images"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  editSuggestion
                    ? "Describe your changes..."
                    : isStreaming
                      ? "Waiting..."
                      : selectedElement
                        ? `Describe changes to this ${selectedElement.elementType}...`
                        : screenName
                          ? `Edit "${screenName}" or create new screen...`
                          : "Describe a screen to create or select one to edit..."
                }
                disabled={isStreaming}
                rows={2}
                className={cn(
                  "flex-1 resize-none bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none py-2 px-2 max-h-[150px]",
                  isStreaming && "cursor-not-allowed opacity-50",
                )}
              />
              <button
                onClick={handleSendMessage}
                disabled={isStreaming || !input.trim()}
                className={cn(
                  "flex-shrink-0 p-2 rounded-lg transition-all",
                  isStreaming || !input.trim()
                    ? "bg-surface-700/50 text-surface-500 cursor-not-allowed"
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
