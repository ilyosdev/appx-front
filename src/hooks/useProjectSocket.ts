import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, trackActiveGeneration, updateLastSeq, clearActiveGeneration } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { ActionLogStatus, type ActionLogEvent } from '@/types/canvas';

export interface ScreenState {
  status: 'queued' | 'generating' | 'streaming' | 'complete' | 'error';
  progress: number;
  html: string;
  error?: string;
  thumbnailUrl?: string;
  stage?: string;
  stageMessage?: string;
  statusMessage?: string;
}

export interface ChatState {
  isStreaming: boolean;
  accumulated: string;
  status: string;
  statusMessage: string;
}

export interface ScreenCompleteData {
  screenId: string;
  fileId?: string;  // source_files.id for Code Studio
  tempId: string;
  skeletonId?: string;
  index?: number;
  name: string;
  html: string;
  reactNativeCode?: string;
  thumbnailUrl?: string;
}

export interface ChatCompleteData {
  messageId: string;
  content: string;
  intent?: string;
  screen?: {
    id: string;
    name: string;
    htmlContent: string | null;
    thumbnailUrl: string | null;
  };
  suggestions?: string[];
  pendingRecommendations?: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    category: 'essential' | 'optional';
  }>;
  changeSummary?: string[] | null;
  /** Version ID of the screen state before the edit (for undo) */
  previousVersionId?: string | null;
  /** Screen ID that was edited (for undo) */
  editedScreenId?: string | null;
  actionLogs?: ActionLogEvent[];
  /** Error message when intent could not be fulfilled (e.g. modify_failed) */
  error?: string;
  /** Plan refinement fields */
  planId?: string;
  planSteps?: Array<{ id: number; title: string; description: string; files: string[]; action: string }>;
  planVersion?: number;
}

export interface ScreenErrorData {
  screenId: string;
  tempId: string;
  skeletonId?: string;
  index: number;
  error: string;
  recoverable: boolean;
}

export interface GenerationStartParams {
  screens: Array<{
    name: string;
    purpose: string;
    layoutDescription: string;
    screenType?: string;
    skeletonId?: string;
    dataModel?: string;
    interactions?: string;
    stateManagement?: string;
  }>;
  theme?: Record<string, string>;
  themeMode?: 'light' | 'dark';
  navigation?: {
    type: string;
    tabs: Array<{ name: string; icon: string; screenId: string }>;
  };
  projectVisualDescription?: string;
  modelId?: string;
}

export interface MultiFileStartParams {
  appDescription: string;
  screens: Array<{ name: string; description: string }>;
  theme?: Record<string, string>;
  navigation?: {
    type: string;
    tabs: Array<{ name: string; icon: string; screenId: string }>;
  };
  modelId?: string;
}

export interface MultiFileModifyParams {
  userRequest: string;
  prompt?: string;
  targetFiles?: string[];
  modelId?: string;
}

export interface MultiFileState {
  isGenerating: boolean;
  files: Map<string, { content: string; isComplete: boolean }>;
  currentFile: string | null;
  progress: { completed: number; total: number };
  error: string | null;
  summary?: string | null;
  validation?: Array<{
    screenId?: string;
    screenName?: string;
    status: 'passed' | 'failed' | 'skipped';
    errors?: string[];
  }> | null;
  /** DB message ID for the completed generation (set on multi:complete) */
  completedMessageId?: string | null;
  /** Action logs snapshot from the completed generation */
  completedActionLogs?: ActionLogEvent[] | null;
}

export interface DesignSystemGenerateParams {
  userInput: string;
  referenceImageUrl?: string;
  imageMode?: string;
  modelId?: string;
}

export interface DesignSystemState {
  status: 'idle' | 'generating' | 'complete' | 'error';
  message: string;
  error?: string;
  designSystem?: any;
  sections?: Record<string, any>;
  progress?: number;
}

interface ScreenGenerationState {
  tempId: string;
  skeletonId?: string;
  index: number;
  name: string;
  status: 'queued' | 'generating' | 'complete' | 'error';
  screenId?: string;
  html?: string;
  thumbnailUrl?: string;
}

interface GenerationStateData {
  generationId: string | null;
  screens: ScreenGenerationState[];
  isActive: boolean;
}

interface UseProjectSocketReturn {
  isConnected: boolean;
  isProjectJoined: boolean;
  isReconnecting: boolean;
  connectionError: string | null;

  chatState: ChatState;
  sendMessage: (message: string, screenId?: string, parentScreenId?: string, planMode?: boolean, enabledFeatures?: string[], imageUrls?: string[], modelId?: string, planId?: string) => void;

  screenStates: Map<string, ScreenState>;
  startGeneration: (params: GenerationStartParams) => Promise<void>;
  cancelGeneration: (screenIds?: string[]) => void;

  // Multi-file generation
  multiFileState: MultiFileState;
  startMultiFileGeneration: (params: MultiFileStartParams) => void;
  modifyMultiFile: (params: MultiFileModifyParams) => void;

  // Action logs
  actionLogs: ActionLogEvent[];
  isActionLogActive: boolean;

  onScreenComplete: (callback: (data: ScreenCompleteData) => void) => void;
  onScreenError: (callback: (data: ScreenErrorData) => void) => void;
  onChatComplete: (callback: (data: ChatCompleteData) => void) => void;
  onChatError: (callback: (error: string, code?: string) => void) => void;
  retryScreen: (screen: { name: string; purpose: string; layoutDescription: string; skeletonId: string }) => void;

  // Edit undo
  emitEditUndo: (screenId: string, versionId: string) => void;
  onEditUndone: (callback: (data: { screenId: string; versionId: string; screen: any }) => void) => void;

  // Design system generation
  designSystemState: DesignSystemState;
  generateDesignSystem: (params: DesignSystemGenerateParams) => void;
}

export function useProjectSocket(projectId: string | undefined, wsUrl?: string): UseProjectSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isProjectJoined, setIsProjectJoined] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [chatState, setChatState] = useState<ChatState>({
    isStreaming: false,
    accumulated: '',
    status: '',
    statusMessage: '',
  });
  
  const [screenStates, setScreenStates] = useState<Map<string, ScreenState>>(new Map());

  const [multiFileState, setMultiFileState] = useState<MultiFileState>({
    isGenerating: false,
    files: new Map(),
    currentFile: null,
    progress: { completed: 0, total: 0 },
    error: null,
  });

  // Action log state
  const [actionLogs, setActionLogs] = useState<ActionLogEvent[]>([]);
  const [isActionLogActive, setIsActionLogActive] = useState(false);

  // Design system state
  const [designSystemState, setDesignSystemState] = useState<DesignSystemState>({
    status: 'idle',
    message: '',
  });

  const socketRef = useRef<Socket | null>(null);
  const screenCompleteCallbackRef = useRef<((data: ScreenCompleteData) => void) | null>(null);
  const screenErrorCallbackRef = useRef<((data: ScreenErrorData) => void) | null>(null);
  const chatCompleteCallbackRef = useRef<((data: ChatCompleteData) => void) | null>(null);
  const pendingChatCompleteRef = useRef<ChatCompleteData[]>([]);
  const chatErrorCallbackRef = useRef<((error: string, code?: string) => void) | null>(null);
  const pendingChatErrorRef = useRef<Array<{ error: string; code?: string }>>([]);
  
  const activeGenerationIdRef = useRef<string | null>(null);
  const hasRequestedSyncRef = useRef(false);
  const pendingGenerationStartRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  const clearPendingGenerationStart = useCallback((error?: Error) => {
    const pending = pendingGenerationStartRef.current;
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingGenerationStartRef.current = null;

    if (error) {
      pending.reject(error);
    } else {
      pending.resolve();
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;

    hasRequestedSyncRef.current = false;

    try {
      const socket = connectSocket(projectId, wsUrl);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected, checking for active generation...');
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionError(null);
      });

      socket.on('connected', (data: { sessionId: string; projectId: string; userId: string }) => {
        console.log('[Socket] Authenticated:', data);
        setIsProjectJoined(true);
        
        if (activeGenerationIdRef.current && !hasRequestedSyncRef.current) {
          console.log('[Socket] Requesting generation state sync after reconnect');
          hasRequestedSyncRef.current = true;
          socket.emit('generation:sync', { generationId: activeGenerationIdRef.current });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        setIsConnected(false);
        setIsProjectJoined(false);
        hasRequestedSyncRef.current = false;
        clearPendingGenerationStart(new Error('Socket disconnected before generation could start'));
        if (reason === 'io server disconnect') {
          setConnectionError('Server disconnected');
        }
      });

      socket.on('connect_error', (error) => {
        setConnectionError(error.message);
        setIsReconnecting(true);
      });

      socket.io.on('reconnect_attempt', () => {
        setIsReconnecting(true);
      });

      socket.io.on('reconnect', () => {
        setIsReconnecting(false);
        setConnectionError(null);
        hasRequestedSyncRef.current = false;
      });

      socket.io.on('reconnect_failed', () => {
        setIsReconnecting(false);
        setConnectionError('Failed to reconnect after multiple attempts');
      });

      socket.on('error', (data: { code: string; message: string; generationId?: string; required?: number; available?: number; current?: number; limit?: number }) => {
        console.log('[Socket] Error received:', data.code, data.message);
        if (data.code === 'GENERATION_IN_PROGRESS') {
          console.log('[Socket] Generation already in progress, will sync via generation:state');
          if (data.generationId) {
            activeGenerationIdRef.current = data.generationId;
          }
          return;
        }
        // Route billing errors to the billing store for modal display
        if (data.code === 'INSUFFICIENT_CREDITS' || data.code === 'DAILY_LIMIT_EXCEEDED' || data.code === 'LIMIT_EXCEEDED') {
          const { handleBillingError, currentPlan } = useBillingStore.getState();
          handleBillingError(data.code, data.message, currentPlan, data);
          return;
        }
        setConnectionError(data.message);
      });

      socket.on('generation:state', (data: GenerationStateData) => {
        console.log('[Socket] Received generation state sync:', data);
        
        if (data.isActive && data.screens.length > 0) {
          activeGenerationIdRef.current = data.generationId;
          
          data.screens.forEach(screen => {
            if (screen.status === 'complete' && screen.html && screen.screenId) {
              console.log('[Socket] Processing missed screen from sync:', screen.name);
              screenCompleteCallbackRef.current?.({
                screenId: screen.screenId,
                tempId: screen.tempId,
                skeletonId: screen.skeletonId,
                index: screen.index,
                name: screen.name,
                html: screen.html,
                thumbnailUrl: screen.thumbnailUrl,
              });
            }
          });
        }
      });

      socket.on('chat:status', (data: { status: string; message: string; progress?: number }) => {
        setChatState(prev => ({
          ...prev,
          status: data.status,
          statusMessage: data.message,
        }));
      });

      socket.on('chat:stream', (data: { chunk: string; accumulated: string }) => {
        setChatState(prev => ({
          ...prev,
          isStreaming: true,
          accumulated: data.accumulated,
        }));
      });

      socket.on('chat:complete', (data: ChatCompleteData) => {
        setChatState({
          isStreaming: false,
          accumulated: '',
          status: '',
          statusMessage: '',
        });
        setIsActionLogActive(false);
        // Finalize ai:progress-driven multiFileState so the indicator shows "Done"
        setMultiFileState(prev => {
          if (!prev.isGenerating && prev.files.size === 0) return prev;
          const files = new Map(prev.files);
          for (const [path, state] of files) {
            if (!state.isComplete) files.set(path, { ...state, isComplete: true });
          }
          return {
            ...prev,
            isGenerating: false,
            files,
            currentFile: null,
            progress: { completed: files.size, total: files.size },
          };
        });
        // Use server-side canonical action logs if provided, otherwise force-complete remaining
        if (data.actionLogs && data.actionLogs.length > 0) {
          setActionLogs(data.actionLogs);
        } else {
          setActionLogs(prev => prev.map(a =>
            a.status === 'started'
              ? { ...a, status: ActionLogStatus.COMPLETED, timestamp: Date.now() }
              : a
          ));
        }
        if (chatCompleteCallbackRef.current) {
          chatCompleteCallbackRef.current(data);
        } else {
          // Buffer the event — callback may not be registered yet (race condition)
          pendingChatCompleteRef.current.push(data);
        }
      });

      socket.on('chat:error', (data: { error: string; code?: string }) => {
        setChatState(prev => ({
          ...prev,
          isStreaming: false,
          status: 'error',
          statusMessage: data.error,
        }));
        setIsActionLogActive(false);
        // Clear ai:progress-driven multiFileState on error
        setMultiFileState(prev => {
          if (!prev.isGenerating && prev.files.size === 0) return prev;
          return {
            ...prev,
            isGenerating: false,
            currentFile: null,
            error: data.error,
          };
        });
        // Force-complete any remaining "started" actions on error
        setActionLogs(prev => prev.map(a =>
          a.status === 'started'
            ? { ...a, status: ActionLogStatus.FAILED, timestamp: Date.now() }
            : a
        ));
        if (chatErrorCallbackRef.current) {
          chatErrorCallbackRef.current(data.error, data.code);
        } else {
          pendingChatErrorRef.current.push({ error: data.error, code: data.code });
        }
      });

      // ---------- Edit undo events ----------
      socket.on('chat:edit-undone', (data: { screenId: string; versionId: string; screen: any }) => {
        if (editUndoneCallbackRef.current) {
          editUndoneCallbackRef.current(data);
        }
      });

      // ---------- Action log events ----------
      socket.on('action:log', (data: ActionLogEvent) => {
        setIsActionLogActive(true);
        setActionLogs(prev => {
          // If this is an update (completed/failed), find & update the existing entry
          if (data.status !== 'started') {
            // First try exact ID match
            let idx = prev.findIndex(a => a.id === data.id);
            // Fallback: match by type + fileName to handle duplicate IDs from different emitters
            if (idx === -1 && data.metadata?.fileName) {
              idx = prev.findIndex(
                a => a.status === 'started' && a.type === data.type && a.metadata?.fileName === data.metadata?.fileName
              );
            }
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...data };
              return updated;
            }
            // No matching started entry - just add as completed (don't create a duplicate)
            return [...prev, data];
          }
          // New started action - check for duplicate (same type + fileName already started)
          if (data.metadata?.fileName) {
            const existingIdx = prev.findIndex(
              a => a.status === 'started' && a.type === data.type && a.metadata?.fileName === data.metadata?.fileName
            );
            if (existingIdx !== -1) {
              // Already tracking this file - skip duplicate
              return prev;
            }
          }
          return [...prev, data];
        });
      });

      // Replay cached action logs on reconnect
      socket.on('action:log:history', (logs: ActionLogEvent[]) => {
        if (logs && logs.length > 0) {
          console.log('[Socket] Received action log history:', logs.length, 'entries');
          setIsActionLogActive(true);
          setActionLogs(logs);
        }
      });

      socket.on('screen:queued', (data: { screenId: string; tempId: string; skeletonId?: string; index: number; name: string; position: number; total: number }) => {
        setScreenStates(prev => {
          const next = new Map(prev);
          next.set(data.tempId, {
            status: 'queued',
            progress: 0,
            html: '',
          });
          return next;
        });
      });

      socket.on('screen:progress', (data: { screenId: string; tempId: string; skeletonId?: string; index: number; progress: number; stage: string; message?: string }) => {
        setScreenStates(prev => {
          const next = new Map(prev);
          const key = data.tempId || data.screenId;
          const current = next.get(key) || { status: 'generating', progress: 0, html: '' };
          next.set(key, {
            ...current,
            status: 'generating',
            progress: data.progress,
            stage: data.stage,
            stageMessage: data.message,
          });
          return next;
        });
      });

      socket.on('screen:stream', (data: { screenId: string; tempId: string; skeletonId?: string; index: number; chunk: string; fullContent?: string; status?: string }) => {
        setScreenStates(prev => {
          const next = new Map(prev);
          const key = data.tempId || data.screenId;
          const current = next.get(key) || { status: 'streaming', progress: 0, html: '' };
          next.set(key, {
            ...current,
            status: 'streaming',
            html: data.fullContent || (current.html + (data.chunk || '')),
            ...(data.status ? { statusMessage: data.status } : {}),
          });
          return next;
        });
      });

      socket.on('screen:complete', (data: ScreenCompleteData) => {
        console.log('[Socket] screen:complete event received:', { 
          screenId: data.screenId, 
          name: data.name, 
          skeletonId: data.skeletonId, 
          index: data.index 
        });
        
        setScreenStates(prev => {
          const next = new Map(prev);
          const key = data.tempId || data.screenId;
          next.set(key, {
            status: 'complete',
            progress: 100,
            html: data.html,
            thumbnailUrl: data.thumbnailUrl,
          });
          return next;
        });
        screenCompleteCallbackRef.current?.(data);
      });

      socket.on('screen:error', (data: ScreenErrorData) => {
        console.log('[Socket] screen:error received:', data);
        clearActiveGeneration();
        setScreenStates(prev => {
          const next = new Map(prev);
          const key = data.tempId || data.screenId;
          next.set(key, {
            status: 'error',
            progress: 0,
            html: '',
            error: data.error,
          });
          return next;
        });
        screenErrorCallbackRef.current?.(data);
      });

      socket.on('generation:started', (data: { generationId: string; screens: Array<{ tempId: string; skeletonId?: string; index: number; name: string }>; total: number }) => {
        console.log('[Socket] Generation started:', data.generationId, 'screens:', data.total);
        activeGenerationIdRef.current = data.generationId;
        trackActiveGeneration(data.generationId);
        clearPendingGenerationStart();
        
        data.screens.forEach(screen => {
          setScreenStates(prev => {
            const next = new Map(prev);
            next.set(screen.tempId, {
              status: 'queued',
              progress: 0,
              html: '',
            });
            return next;
          });
        });
      });

      socket.on('generation:complete', (data: { generationId: string; completedCount: number; failedCount: number }) => {
        console.log('[Socket] Generation complete:', data.generationId, 'completed:', data.completedCount, 'failed:', data.failedCount);
        if (activeGenerationIdRef.current === data.generationId) {
          activeGenerationIdRef.current = null;
        }
        clearActiveGeneration();
        setIsActionLogActive(false);
        // Force-complete any remaining "started" actions
        setActionLogs(prev => prev.map(a =>
          a.status === 'started'
            ? { ...a, status: ActionLogStatus.COMPLETED, timestamp: Date.now() }
            : a
        ));
      });

      // ---------- Multi-file generation events ----------
      socket.on('generation:multi:started', (data: { generationId?: string; totalFiles?: number; screenCount?: number; files?: string[] }) => {
        const total = data.totalFiles || data.screenCount || 0;
        const fileList = data.files || [];
        console.log('[Socket] Multi-file generation started:', data.generationId, 'files:', total);
        if (data.generationId) trackActiveGeneration(data.generationId);
        clearPendingGenerationStart();
        setMultiFileState({
          isGenerating: true,
          files: new Map(fileList.map(f => [f, { content: '', isComplete: false }])),
          currentFile: null,
          progress: { completed: 0, total },
          error: null,
          summary: null,
          validation: null,
        });
      });

      socket.on('generation:file:start', (data: { filePath: string; index: number; total: number; seq?: number }) => {
        if (data.seq != null) updateLastSeq(data.seq);
        console.log('[Socket] File generation started:', data.filePath, `(${data.index + 1}/${data.total})`);
        setMultiFileState(prev => {
          const files = new Map(prev.files);
          if (!files.has(data.filePath)) {
            files.set(data.filePath, { content: '', isComplete: false });
          }
          return {
            ...prev,
            currentFile: data.filePath,
            progress: { ...prev.progress, total: data.total },
          };
        });
      });

      socket.on('generation:file:chunk', (data: { filePath: string; chunk: string; accumulated?: string; seq?: number }) => {
        if (data.seq != null) updateLastSeq(data.seq);
        setMultiFileState(prev => {
          const files = new Map(prev.files);
          const existing = files.get(data.filePath) || { content: '', isComplete: false };
          files.set(data.filePath, {
            content: data.accumulated || (existing.content + (data.chunk || '')),
            isComplete: false,
          });
          return { ...prev, files };
        });
      });

      socket.on('generation:file:complete', (data: { filePath: string; content?: string; fullContent?: string; index: number; seq?: number }) => {
        if (data.seq != null) updateLastSeq(data.seq);
        console.log('[Socket] File generation complete:', data.filePath);
        setMultiFileState(prev => {
          const files = new Map(prev.files);
          files.set(data.filePath, { content: data.content || data.fullContent || '', isComplete: true });
          const completed = Array.from(files.values()).filter(f => f.isComplete).length;
          return {
            ...prev,
            files,
            progress: { ...prev.progress, completed },
          };
        });
      });

      socket.on('generation:multi:complete', (data: {
        generationId: string;
        messageId?: string;
        files: Array<{ filePath: string; content: string }>;
        summary?: string;
        validation?: Array<{
          screenId?: string;
          screenName?: string;
          status: 'passed' | 'failed' | 'skipped';
          errors?: string[];
        }>;
        actionLogs?: ActionLogEvent[];
      }) => {
        console.log('[Socket] Multi-file generation complete:', data.generationId, 'files:', data.files.length);
        clearActiveGeneration();
        setMultiFileState(prev => {
          const files = new Map(prev.files);
          // Ensure all files are stored with final content
          for (const file of data.files) {
            files.set(file.filePath, { content: file.content, isComplete: true });
          }
          return {
            isGenerating: false,
            files,
            currentFile: null,
            progress: { completed: files.size, total: files.size },
            error: null,
            summary: data.summary || null,
            validation: data.validation || null,
            completedMessageId: data.messageId || null,
            completedActionLogs: data.actionLogs || null,
          };
        });
        // Mark action log as inactive and force-complete any remaining started actions
        setIsActionLogActive(false);
        if (data.actionLogs && data.actionLogs.length > 0) {
          // Use server-side canonical action logs (already deduplicated)
          setActionLogs(data.actionLogs);
        } else {
          // Force-complete any remaining "started" actions
          setActionLogs(prev => prev.map(a =>
            a.status === 'started'
              ? { ...a, status: ActionLogStatus.COMPLETED, timestamp: Date.now() }
              : a
          ));
        }
      });

      socket.on('generation:multi:error', (data: { generationId?: string; error: string; code?: string }) => {
        console.error('[Socket] Multi-file generation error:', data.error);
        clearActiveGeneration();
        clearPendingGenerationStart(new Error(data.error));
        if (data.code === 'INSUFFICIENT_CREDITS' || data.code === 'DAILY_LIMIT_EXCEEDED' || data.code === 'LIMIT_EXCEEDED') {
          const { handleBillingError, currentPlan } = useBillingStore.getState();
          handleBillingError(data.code, data.error, currentPlan, data as any);
        }
        setMultiFileState(prev => ({
          ...prev,
          isGenerating: false,
          error: data.error,
        }));
        setIsActionLogActive(false);
        // Force-fail any remaining "started" actions on error
        setActionLogs(prev => prev.map(a =>
          a.status === 'started'
            ? { ...a, status: ActionLogStatus.FAILED, timestamp: Date.now(), metadata: { ...a.metadata, error: data.error } }
            : a
        ));
      });

      // ---------- Streaming resume events ----------
      // On reconnect, backend replays missed events via this channel
      socket.on('generation:stream-event', (data: { type: string; filePath?: string; fullContent?: string; index?: number; total?: number; seq?: number; phase?: string; message?: string }) => {
        if (data.seq != null) updateLastSeq(data.seq);
        // Replay file:complete events into multiFileState
        if (data.type === 'file:complete' && data.filePath) {
          setMultiFileState(prev => {
            const files = new Map(prev.files);
            files.set(data.filePath!, { content: data.fullContent || '', isComplete: true });
            const completed = Array.from(files.values()).filter(f => f.isComplete).length;
            return { ...prev, files, progress: { ...prev.progress, completed } };
          });
        }
      });

      socket.on('generation:resume-empty', (data: { generationId: string; message: string }) => {
        console.log('[Socket] Resume empty:', data.message);
        clearActiveGeneration();
      });

      // ---------- Structured AI progress events ----------
      // The backend emits 'ai:progress' for per-file progress during generation.
      // Feed these into multiFileState so ChatProgressIndicator can display them.
      socket.on('ai:progress', (data: { type: string; task: string; status: 'pending' | 'in_progress' | 'completed'; index: number; total: number; timestamp: number }) => {
        setMultiFileState(prev => {
          // Don't overwrite an already-active multi-file generation that was
          // started via generation:multi:started — those have their own
          // file:start / file:complete flow.
          // ai:progress fires for BOTH multi-file and single-screen agentic
          // generations, but we only need to synthesize state when the
          // multi-file pipeline didn't already set isGenerating.
          const files = new Map(prev.files);
          const filePath = data.task;

          if (data.status === 'in_progress') {
            if (!files.has(filePath)) {
              files.set(filePath, { content: '', isComplete: false });
            }
            return {
              ...prev,
              isGenerating: true,
              files,
              currentFile: filePath,
              progress: { completed: data.index, total: data.total },
            };
          }

          if (data.status === 'completed') {
            const existing = files.get(filePath);
            if (existing) {
              files.set(filePath, { ...existing, isComplete: true });
            } else {
              files.set(filePath, { content: '', isComplete: true });
            }
            const completed = data.index + 1;
            const isDone = completed >= data.total;
            return {
              ...prev,
              isGenerating: !isDone,
              files,
              currentFile: isDone ? null : prev.currentFile,
              progress: { completed, total: data.total },
            };
          }

          // 'pending' status — just register the file
          if (!files.has(filePath)) {
            files.set(filePath, { content: '', isComplete: false });
          }
          return {
            ...prev,
            isGenerating: true,
            files,
            progress: { ...prev.progress, total: data.total },
          };
        });
      });

      // ---------- Design system generation events ----------
      socket.on('design-system:status', (data: { status: string; message: string }) => {
        setDesignSystemState({ status: 'generating', message: data.message });
      });

      socket.on('design-system:section', (data: { section: string; data: any; progress: number }) => {
        setDesignSystemState(prev => ({
          ...prev,
          status: 'generating',
          message: `Planning: ${data.section}...`,
          sections: { ...(prev.sections || {}), [data.section]: data.data },
          progress: data.progress,
        }));
      });

      socket.on('design-system:complete', (data: { designSystem: any; cost: number }) => {
        setDesignSystemState({ status: 'complete', message: 'Planning complete', designSystem: data.designSystem });
        setIsActionLogActive(false);
      });

      socket.on('design-system:error', (data: { error: string; code?: string }) => {
        setDesignSystemState({ status: 'error', message: data.error, error: data.error });
        setIsActionLogActive(false);
        if (data.code === 'INSUFFICIENT_CREDITS' || data.code === 'DAILY_LIMIT_EXCEEDED') {
          const { handleBillingError, currentPlan } = useBillingStore.getState();
          handleBillingError(data.code, data.error, currentPlan, data as any);
        }
      });

      socket.on('credits:update', (data: { balance: number }) => {
        console.log('[Socket] Credits updated:', data.balance);
        useAuthStore.getState().setCreditsBalance(data.balance);
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(errorMessage);
    }

    return () => {
      clearPendingGenerationStart(new Error('Socket connection cleaned up'));
      disconnectSocket();
      socketRef.current = null;
    };
  }, [projectId, wsUrl, clearPendingGenerationStart]);

  const sendMessage = useCallback((message: string, screenId?: string, parentScreenId?: string, planMode?: boolean, enabledFeatures?: string[], imageUrls?: string[], modelId?: string, planId?: string) => {
    if (!socketRef.current?.connected) {
      chatErrorCallbackRef.current?.('Not connected to server', 'NOT_CONNECTED');
      return;
    }

    setChatState({
      isStreaming: true,
      accumulated: '',
      status: 'sending',
      statusMessage: 'Sending...',
    });

    // Reset action logs for new conversation turn
    setActionLogs([]);
    setIsActionLogActive(true);
    // NOTE: Do NOT reset multiFileState here — it kills the preview overlay.
    // multiFileState is reset naturally by chat:complete / chat:error handlers.

    socketRef.current.emit('chat:send', { message, screenId, parentScreenId, planMode, enabledFeatures, imageUrls, modelId, planId });
  }, []);

  const editUndoneCallbackRef = useRef<((data: { screenId: string; versionId: string; screen: any }) => void) | null>(null);

  const emitEditUndo = useCallback((screenId: string, versionId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('chat:edit-undo', { screenId, versionId });
  }, []);

  const onEditUndone = useCallback((callback: (data: { screenId: string; versionId: string; screen: any }) => void) => {
    editUndoneCallbackRef.current = callback;
  }, []);

  const startGeneration = useCallback((params: GenerationStartParams) => {
    console.log('[Socket] startGeneration called', { connected: socketRef.current?.connected, screenCount: params.screens.length });
    if (!socketRef.current?.connected) {
      const error = new Error('Not connected to server');
      console.error('[Socket] Cannot start generation - not connected');
      setConnectionError(error.message);
      return Promise.reject(error);
    }

    if (pendingGenerationStartRef.current) {
      clearPendingGenerationStart(new Error('A generation start request is already pending'));
    }

    activeGenerationIdRef.current = null;
    hasRequestedSyncRef.current = false;

    return new Promise<void>((resolve, reject) => {
      pendingGenerationStartRef.current = {
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          pendingGenerationStartRef.current = null;
          reject(new Error('Timed out waiting for generation to start'));
        }, 15000),
      };

      socketRef.current?.emit('generation:start', { ...params, modelId: params.modelId });
    });
  }, [clearPendingGenerationStart]);

  const cancelGeneration = useCallback((screenIds?: string[]) => {
    if (!socketRef.current?.connected) return;
    activeGenerationIdRef.current = null;
    socketRef.current.emit('generation:cancel', { screenIds });
  }, []);

  const onScreenComplete = useCallback((callback: (data: ScreenCompleteData) => void) => {
    screenCompleteCallbackRef.current = callback;
  }, []);

  const onScreenError = useCallback((callback: (data: ScreenErrorData) => void) => {
    screenErrorCallbackRef.current = callback;
  }, []);

  const onChatComplete = useCallback((callback: (data: ChatCompleteData) => void) => {
    chatCompleteCallbackRef.current = callback;
    // Replay buffered events that arrived before callback was registered.
    // Use queueMicrotask so the calling component's useEffect has finished
    // and refs (e.g. assistantMessageIdRef) are set before we deliver.
    if (pendingChatCompleteRef.current.length > 0) {
      const buffered = [...pendingChatCompleteRef.current];
      pendingChatCompleteRef.current = [];
      queueMicrotask(() => {
        for (const data of buffered) {
          chatCompleteCallbackRef.current?.(data);
        }
      });
    }
  }, []);

  const onChatError = useCallback((callback: (error: string, code?: string) => void) => {
    chatErrorCallbackRef.current = callback;
    // Replay buffered errors that arrived before callback was registered.
    // Use queueMicrotask so the calling component's useEffect has finished
    // and refs (e.g. assistantMessageIdRef) are set before we deliver.
    if (pendingChatErrorRef.current.length > 0) {
      const buffered = [...pendingChatErrorRef.current];
      pendingChatErrorRef.current = [];
      queueMicrotask(() => {
        for (const item of buffered) {
          chatErrorCallbackRef.current?.(item.error, item.code);
        }
      });
    }
  }, []);

  const startMultiFileGeneration = useCallback((params: MultiFileStartParams) => {
    console.log('[Socket] startMultiFileGeneration called', { connected: socketRef.current?.connected, screenCount: params.screens.length });
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot start multi-file generation - not connected');
      return;
    }

    // Reset multi-file state
    setMultiFileState({
      isGenerating: true,
      files: new Map(),
      currentFile: null,
      progress: { completed: 0, total: params.screens.length },
      error: null,
      summary: null,
      validation: null,
    });
    setActionLogs([]);
    setIsActionLogActive(true);

    socketRef.current.emit('generation:multi:start', { ...params, modelId: params.modelId });
  }, []);

  const modifyMultiFile = useCallback((params: MultiFileModifyParams) => {
    console.log('[Socket] modifyMultiFile called', { connected: socketRef.current?.connected, targetFiles: params.targetFiles });
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot modify multi-file - not connected');
      return;
    }

    const userRequest = params.userRequest || params.prompt;
    if (!userRequest?.trim()) {
      console.error('[Socket] Cannot modify multi-file - missing userRequest');
      return;
    }

    setMultiFileState(prev => ({
      ...prev,
      isGenerating: true,
      files: new Map(),
      progress: { completed: 0, total: 0 },
      error: null,
      currentFile: null,
      summary: null,
      validation: null,
    }));
    setActionLogs([]);
    setIsActionLogActive(true);

    socketRef.current.emit('generation:multi:modify', {
      userRequest,
      targetFiles: params.targetFiles,
      modelId: params.modelId,
    });
  }, []);

  const retryScreen = useCallback((screen: { name: string; purpose: string; layoutDescription: string; skeletonId: string }) => {
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot retry - not connected');
      return;
    }
    console.log('[Socket] Retrying screen:', screen.name);
    socketRef.current.emit('generation:retry', { screen });
  }, []);

  const generateDesignSystem = useCallback((params: DesignSystemGenerateParams) => {
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot generate design system - not connected');
      return;
    }
    console.log('[Socket] Starting design system generation via socket');
    setDesignSystemState({ status: 'generating', message: 'Planning your app...' });
    setActionLogs([]);
    setIsActionLogActive(true);
    socketRef.current.emit('design-system:generate', params);
  }, []);

  return {
    isConnected,
    isProjectJoined,
    isReconnecting,
    connectionError,
    chatState,
    sendMessage,
    screenStates,
    startGeneration,
    cancelGeneration,
    multiFileState,
    startMultiFileGeneration,
    modifyMultiFile,
    actionLogs,
    isActionLogActive,
    onScreenComplete,
    onScreenError,
    onChatComplete,
    onChatError,
    retryScreen,
    emitEditUndo,
    onEditUndone,
    designSystemState,
    generateDesignSystem,
  };
}
