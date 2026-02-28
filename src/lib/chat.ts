import { api, getApiBaseUrl, tokenStorage } from './api';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  projectId: string;
  role: MessageRole;
  message: string; // Backend sends 'message', not 'content'
  content?: string; // Deprecated: kept for backward compatibility
  screenId?: string;
  createdScreenId?: string; // Link to the screen this message created
  metadata?: ChatMessageMetadata;
  createdAt: string;
}

export interface ChatMessageMetadata {
  suggestedActions?: SuggestedAction[];
  referencedScreens?: string[];
  tokenCount?: number;
  type?: 'progress' | 'screen_suggestion';
  recommendations?: ScreenRecommendation[];
  [key: string]: any; // Allow additional progress data fields
}

export interface ScreenRecommendation {
  id: string;
  name: string;
  type: string;
  description: string;
  reasoning?: string;
  category: 'essential' | 'optional';
  thumbnailUrl?: string;
}

export interface SuggestedAction {
  type: 'modify' | 'regenerate' | 'export' | 'navigate';
  label: string;
  payload?: Record<string, unknown>;
}

export interface SelectedElementDto {
  elementType: string;
  innerText?: string;
  selector: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  screenPath?: string;
  screenName?: string;
}

export interface SendMessageDto {
  message: string;
  screenId?: string;
  parentScreenId?: string;
  context?: ChatContext;
  selectedElement?: SelectedElementDto;
  screenPath?: string;
  screenName?: string;
  imageUrls?: string[];
  planMode?: boolean;
}

export interface ChatContext {
  selectedElements?: string[];
  currentScreen?: string;
  previousMessages?: number;
}

export interface ChatHistory {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChatHistoryParams {
  limit?: number;
  cursor?: string;
  screenId?: string;
}

export interface StreamScreen {
  id: string;
  projectId: string;
  generationId: string | null;
  parentScreenId: string | null;
  name: string;
  type: string;
  version: number;
  orderIndex: number;
  canvasX: number | null;
  canvasY: number | null;
  canvasZone: string | null;
  width: number;
  height: number;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  htmlContent: string | null;
  layoutData: unknown;
  designData: unknown;
  designTokens: unknown;
  exports: unknown;
  aiPrompt: string | null;
  sortOrder: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ChangedFile {
  path: string;
  content: string;
}

export interface StreamChunk {
  code?: string;
  current?: number;
  limit?: number;
  required?: number;
  available?: number;
  type: 'content' | 'action' | 'done' | 'error' | 'status';
  content?: string;
  action?: SuggestedAction;
  messageId?: string;
  error?: string;
  screen?: StreamScreen;
  intent?: string;
  suggestions?: string[];
  pendingRecommendations?: ScreenRecommendation[];
  changedFiles?: ChangedFile[];
  status?: string;
  message?: string; // User-friendly status message
}

export interface ChatStreamCallbacks {
  onContent?: (content: string, accumulated: string) => void;
  onAction?: (action: SuggestedAction) => void;
  onComplete?: (messageId: string, fullContent: string, screen?: StreamScreen, pendingRecommendations?: ScreenRecommendation[], changedFiles?: ChangedFile[]) => void;
  onError?: (error: string, errorData?: { code?: string; current?: number; limit?: number; required?: number; available?: number }) => void;
  onConnectionError?: (event: Event) => void;
  onStatus?: (status: string, message?: string) => void;
}

export const chatApi = {
  getHistory: (projectId: string, params?: ChatHistoryParams) => 
    api.get<ChatHistory>(`/projects/${projectId}/chat/history`, { params }),

  sendMessage: (projectId: string, data: SendMessageDto) => 
    api.post<ChatMessage>(`/projects/${projectId}/chat/send`, data),

  streamMessage: (
    projectId: string, 
    data: SendMessageDto,
    callbacks: ChatStreamCallbacks
  ): AbortController => {
    const token = tokenStorage.getAccessToken();
    const baseUrl = getApiBaseUrl();
    const abortController = new AbortController();

    const url = `${baseUrl}/projects/${projectId}/chat/stream?token=${token}`;

    let accumulatedContent = '';

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: data.message,
        screenId: data.screenId,
        parentScreenId: data.parentScreenId,
        selectedElement: data.selectedElement,
        screenPath: data.screenPath,
        screenName: data.screenName,
        imageUrls: data.imageUrls,
        planMode: data.planMode,
      }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                try {
                  const chunk: StreamChunk = JSON.parse(jsonStr);

                  switch (chunk.type) {
                    case 'status':
                      callbacks.onStatus?.(chunk.status || 'processing', chunk.message);
                      break;
                    case 'content':
                      if (chunk.content) {
                        accumulatedContent += chunk.content;
                        callbacks.onContent?.(chunk.content, accumulatedContent);
                      }
                      break;
                    case 'action':
                      if (chunk.action) {
                        callbacks.onAction?.(chunk.action);
                      }
                      break;
                    case 'done':
                      accumulatedContent = chunk.content || accumulatedContent;
                      callbacks.onComplete?.(
                        chunk.messageId || '',
                        accumulatedContent,
                        chunk.screen,
                        chunk.pendingRecommendations,
                        chunk.changedFiles
                      );
                      break;
                    case 'error':
                      callbacks.onError?.(chunk.error || 'Unknown error', chunk.code ? { code: chunk.code, current: chunk.current, limit: chunk.limit, required: chunk.required, available: chunk.available } : undefined);
                      break;
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE chunk:', parseError);
                }
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          callbacks.onConnectionError?.(error);
        }
      });

    return abortController;
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/ai/upload-style-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.imageUrl;
  },

  deleteMessage: (projectId: string, messageId: string) =>
    api.delete(`/projects/${projectId}/chat/messages/${messageId}`),

  clearHistory: (projectId: string) =>
    api.delete(`/projects/${projectId}/chat/history`),

  regenerateResponse: (projectId: string, messageId: string) =>
    api.post<ChatMessage>(`/projects/${projectId}/chat/messages/${messageId}/regenerate`),

  applyAction: (projectId: string, action: SuggestedAction) =>
    api.post(`/projects/${projectId}/chat/apply-action`, action),

  // Subscribe to chat progress updates
  subscribeChatProgress: (
    projectId: string,
    callbacks: {
      onProgressUpdate: (messageId: string, progressData: any) => void;
      onConnectionError: (event: Event) => void;
    }
  ): EventSource => {
    const token = tokenStorage.getAccessToken();
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/projects/${projectId}/chat/progress-stream?token=${token}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'progress_update') {
        callbacks.onProgressUpdate(parsed.messageId, parsed.progressData);
      }
    };

    eventSource.onerror = callbacks.onConnectionError;

    return eventSource;
  },

  // Generate recommended screens
  generateRecommendedScreens: async (projectId: string, screenIds: string[]): Promise<void> => {
    await api.post(`/projects/${projectId}/screens/generate-recommended`, { screenIds });
  },
};


