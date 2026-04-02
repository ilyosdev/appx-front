import { api } from './api';

export interface AiModel {
  id: string;
  displayName: string;
  provider: string;
  openrouterId: string | null;
  isFree: boolean;
  creditCost?: number;
  description?: string;
}

// User-facing: fetch available models
export async function fetchAiModels(): Promise<AiModel[]> {
  const { data } = await api.get('/payments/ai-models');
  return data.data ?? data;
}

// Admin model endpoints moved to admin/ project
