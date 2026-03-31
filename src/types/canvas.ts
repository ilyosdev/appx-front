/**
 * Types specific to the Canvas page and its components
 */

export interface ScreenData {
  id: string;
  name: string;
  type: string;
  parentScreenId: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  htmlContent: string | null;
  reactCode?: string | null;
  reactNativeCode?: string | null;
  compiledHtml?: string | null;
  reactCodeUrl?: string | null;
  compiledHtmlUrl?: string | null;
  contentType?: 'react' | 'html' | 'react-native';
  /** DB-persisted build status: 'valid' | 'error' | 'skeleton' | 'unknown' */
  buildStatus?: 'valid' | 'error' | 'skeleton' | 'unknown';
  buildErrors?: string[];
  aiPrompt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  designData?: unknown;
  isLoading?: boolean;
  loadingText?: string;
  screenNameForMatching?: string;
  generationIndex?: number;
  skeletonId?: string;
  hasError?: boolean;
  errorMessage?: string;
}

export interface Annotation {
  id: string;
  elementSelector: string;
  x: number;
  y: number;
  text: string;
  elementText?: string; // The actual text content of the clicked element
  elementType?: string; // The type of element (button, text, image, etc.)
}

export interface DragState {
  isPotentialDrag: boolean;
  isDragging: boolean;
  screenId: string | null;
  startX: number;
  startY: number;
  screenStartX: number;
  screenStartY: number;
}

export interface RecommendationItem {
  id: string;
  name: string;
  type: string;
  description: string;
  reasoning?: string;
}

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  error?: boolean;
  warning?: boolean;
  createdScreenId?: string;
  metadata?: {
    screenType?: string;
    thumbnailUrl?: string;
    description?: string;
    isGenerationMessage?: boolean;
    isInitialPrompt?: boolean;
    type?: "progress" | "screen_suggestion" | "reasoning" | "tool_calls" | "artifact" | "inline_progress";
    recommendations?: {
      essential: RecommendationItem[];
      optional: RecommendationItem[];
    };
    changeSummary?: string[];
    previousVersionId?: string;
    editedScreenId?: string;
    editUndone?: boolean;
    [key: string]: unknown;
  };
}

export interface GenerationStatus {
  isGenerating: boolean;
  lastCompletedCount: number;
  pendingRecommendations: {
    essential: RecommendationItem[];
    optional: RecommendationItem[];
  } | null;
}

export interface ActiveSelection {
  x: number;
  y: number;
  width: number;
  height: number;
  elementText?: string;
  elementType?: string;
}

export interface ActivePopup {
  x: number;
  y: number;
  width: number;
  height: number;
  elementText: string;
  elementType: string;
  elementSelector: string;
}

// Action Log types (Rork-style agent activity feed)
export const ActionLogType = {
  THINKING: 'thinking',
  ANALYZING: 'analyzing',
  READ_FILE: 'read_file',
  CREATE_FILE: 'create_file',
  EDIT_FILE: 'edit_file',
  GENERATE_CODE: 'generate_code',
  VALIDATE: 'validate',
  FIX_ERROR: 'fix_error',
  GENERATE_IMAGE: 'generate_image',
  SEARCH: 'search',
  RUN_COMMAND: 'run_command',
} as const;

export type ActionLogType = (typeof ActionLogType)[keyof typeof ActionLogType];

export const ActionLogStatus = {
  STARTED: 'started',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ActionLogStatus = (typeof ActionLogStatus)[keyof typeof ActionLogStatus];

export interface ActionLogEvent {
  id: string;
  type: ActionLogType;
  status: ActionLogStatus;
  timestamp: number;
  metadata?: {
    fileName?: string;
    summary?: string;
    duration?: number;
    toolName?: string;
    query?: string;
    error?: string;
  };
}

// Constants
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_SENSITIVITY = 0.002;
export const DRAG_THRESHOLD = 5;
