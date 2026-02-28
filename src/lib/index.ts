export { api, getApiBaseUrl, tokenStorage, setBillingErrorHandler, clearBillingErrorHandler } from './api';
export type { ApiResponse, ApiErrorResponse } from './api';

export { authApi } from './auth';
export type {
  RegisterDto,
  LoginDto,
  AuthTokens,
  AuthUser,
  AuthResponse,
  PlanType,
} from './auth';

export { paymentsApi, PLAN_FEATURES, CREDIT_PACKS, formatLimit, getUsagePercentage } from './payments';
export type {
  SubscriptionDto,
  UserLimitsDto,
  CreditPackDto,
  CreditTransactionDto,
  CheckoutUrlData,
} from './payments';

export { projectsApi } from './projects';
export type { 
  CreateProjectDto, 
  UpdateProjectDto, 
  Project, 
  ProjectStatus,
  StyleOption, 
  Screen, 
  ProjectWithScreens,
  PaginatedProjects,
  ListProjectsParams,
} from './projects';

export { chatApi } from './chat';
export type { 
  MessageRole, 
  ChatMessage, 
  ChatMessageMetadata,
  SuggestedAction,
  SendMessageDto,
  ChatContext,
  ChatHistory,
  ChatHistoryParams,
  StreamChunk,
  ChatStreamCallbacks,
} from './chat';

export { cn, formatDate } from './utils';


