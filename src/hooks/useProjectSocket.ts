import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';

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
}

export interface MultiFileStartParams {
  appDescription: string;
  screens: Array<{ name: string; description: string }>;
  theme?: Record<string, string>;
  navigation?: {
    type: string;
    tabs: Array<{ name: string; icon: string; screenId: string }>;
  };
}

export interface MultiFileModifyParams {
  prompt: string;
  targetFiles?: string[];
}

export interface MultiFileState {
  isGenerating: boolean;
  files: Map<string, { content: string; isComplete: boolean }>;
  currentFile: string | null;
  progress: { completed: number; total: number };
  error: string | null;
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
  isReconnecting: boolean;
  connectionError: string | null;

  chatState: ChatState;
  sendMessage: (message: string, screenId?: string, parentScreenId?: string, planMode?: boolean) => void;

  screenStates: Map<string, ScreenState>;
  startGeneration: (params: GenerationStartParams) => void;
  cancelGeneration: (screenIds?: string[]) => void;

  // Multi-file generation
  multiFileState: MultiFileState;
  startMultiFileGeneration: (params: MultiFileStartParams) => void;
  modifyMultiFile: (params: MultiFileModifyParams) => void;

  onScreenComplete: (callback: (data: ScreenCompleteData) => void) => void;
  onScreenError: (callback: (data: ScreenErrorData) => void) => void;
  onChatComplete: (callback: (data: ChatCompleteData) => void) => void;
  onChatError: (callback: (error: string, code?: string) => void) => void;
  retryScreen: (screen: { name: string; purpose: string; layoutDescription: string; skeletonId: string }) => void;
}

export function useProjectSocket(projectId: string | undefined, wsUrl?: string): UseProjectSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
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

  const socketRef = useRef<Socket | null>(null);
  const screenCompleteCallbackRef = useRef<((data: ScreenCompleteData) => void) | null>(null);
  const screenErrorCallbackRef = useRef<((data: ScreenErrorData) => void) | null>(null);
  const chatCompleteCallbackRef = useRef<((data: ChatCompleteData) => void) | null>(null);
  const chatErrorCallbackRef = useRef<((error: string, code?: string) => void) | null>(null);
  
  const activeGenerationIdRef = useRef<string | null>(null);
  const hasRequestedSyncRef = useRef(false);

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
        
        if (activeGenerationIdRef.current && !hasRequestedSyncRef.current) {
          console.log('[Socket] Requesting generation state sync after reconnect');
          hasRequestedSyncRef.current = true;
          socket.emit('generation:sync', { generationId: activeGenerationIdRef.current });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        setIsConnected(false);
        hasRequestedSyncRef.current = false;
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
        chatCompleteCallbackRef.current?.(data);
      });

      socket.on('chat:error', (data: { error: string; code?: string }) => {
        setChatState(prev => ({
          ...prev,
          isStreaming: false,
          status: 'error',
          statusMessage: data.error,
        }));
        chatErrorCallbackRef.current?.(data.error, data.code);
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
      });

      // ---------- Multi-file generation events ----------
      socket.on('generation:multi:started', (data: { generationId: string; totalFiles: number; files: string[] }) => {
        console.log('[Socket] Multi-file generation started:', data.generationId, 'files:', data.totalFiles);
        setMultiFileState({
          isGenerating: true,
          files: new Map(data.files.map(f => [f, { content: '', isComplete: false }])),
          currentFile: null,
          progress: { completed: 0, total: data.totalFiles },
          error: null,
        });
      });

      socket.on('generation:file:start', (data: { filePath: string; index: number; total: number }) => {
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

      socket.on('generation:file:chunk', (data: { filePath: string; chunk: string; accumulated?: string }) => {
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

      socket.on('generation:file:complete', (data: { filePath: string; content: string; index: number }) => {
        console.log('[Socket] File generation complete:', data.filePath);
        setMultiFileState(prev => {
          const files = new Map(prev.files);
          files.set(data.filePath, { content: data.content, isComplete: true });
          const completed = Array.from(files.values()).filter(f => f.isComplete).length;
          return {
            ...prev,
            files,
            progress: { ...prev.progress, completed },
          };
        });
      });

      socket.on('generation:multi:complete', (data: { generationId: string; files: Array<{ filePath: string; content: string }> }) => {
        console.log('[Socket] Multi-file generation complete:', data.generationId, 'files:', data.files.length);
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
          };
        });
      });

      socket.on('generation:multi:error', (data: { generationId?: string; error: string; code?: string }) => {
        console.error('[Socket] Multi-file generation error:', data.error);
        if (data.code === 'INSUFFICIENT_CREDITS' || data.code === 'DAILY_LIMIT_EXCEEDED' || data.code === 'LIMIT_EXCEEDED') {
          const { handleBillingError, currentPlan } = useBillingStore.getState();
          handleBillingError(data.code, data.error, currentPlan, data as any);
        }
        setMultiFileState(prev => ({
          ...prev,
          isGenerating: false,
          error: data.error,
        }));
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
      disconnectSocket();
      socketRef.current = null;
    };
  }, [projectId, wsUrl]);

  const sendMessage = useCallback((message: string, screenId?: string, parentScreenId?: string, planMode?: boolean) => {
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

    socketRef.current.emit('chat:send', { message, screenId, parentScreenId, planMode });
  }, []);

  const startGeneration = useCallback((params: GenerationStartParams) => {
    console.log('[Socket] startGeneration called', { connected: socketRef.current?.connected, screenCount: params.screens.length });
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot start generation - not connected');
      return;
    }
    
    activeGenerationIdRef.current = null;
    hasRequestedSyncRef.current = false;
    
    socketRef.current.emit('generation:start', params);
  }, []);

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
  }, []);

  const onChatError = useCallback((callback: (error: string, code?: string) => void) => {
    chatErrorCallbackRef.current = callback;
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
    });

    socketRef.current.emit('generation:multi:start', params);
  }, []);

  const modifyMultiFile = useCallback((params: MultiFileModifyParams) => {
    console.log('[Socket] modifyMultiFile called', { connected: socketRef.current?.connected, targetFiles: params.targetFiles });
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot modify multi-file - not connected');
      return;
    }

    setMultiFileState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      currentFile: null,
    }));

    socketRef.current.emit('generation:multi:modify', params);
  }, []);

  const retryScreen = useCallback((screen: { name: string; purpose: string; layoutDescription: string; skeletonId: string }) => {
    if (!socketRef.current?.connected) {
      console.error('[Socket] Cannot retry - not connected');
      return;
    }
    console.log('[Socket] Retrying screen:', screen.name);
    socketRef.current.emit('generation:retry', { screen });
  }, []);

  return {
    isConnected,
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
    onScreenComplete,
    onScreenError,
    onChatComplete,
    onChatError,
    retryScreen,
  };
}
