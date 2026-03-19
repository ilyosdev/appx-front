import { create } from 'zustand';
import { fetchAiModels, type AiModel } from '../lib/models';

interface ModelStore {
  availableModels: AiModel[];
  selectedModelId: string | null; // per-message override (null = use default)
  loading: boolean;
  hasFetched: boolean;

  fetchModels: () => Promise<void>;
  setSelectedModel: (modelId: string | null) => void;
  getEffectiveModelId: () => string;
  getEffectiveModel: () => AiModel | undefined;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  availableModels: [],
  selectedModelId: null,
  loading: false,
  hasFetched: false,

  fetchModels: async () => {
    if (get().loading) return;
    if (get().hasFetched && get().availableModels.length > 0) return;
    set({ loading: true });
    try {
      const models = await fetchAiModels();
      const modelArray = Array.isArray(models) ? models : [];
      set({ availableModels: modelArray, loading: false, hasFetched: true });
    } catch (e) {
      console.error('[ModelStore] Failed to fetch AI models:', e);
      set({ loading: false, hasFetched: false });
    }
  },

  setSelectedModel: (modelId) => set({ selectedModelId: modelId }),

  getEffectiveModelId: () => {
    const { selectedModelId, availableModels } = get();
    if (selectedModelId) return selectedModelId;
    const models = Array.isArray(availableModels) ? availableModels : [];
    return models[0]?.id || '';
  },

  getEffectiveModel: () => {
    const { availableModels } = get();
    const models = Array.isArray(availableModels) ? availableModels : [];
    const modelId = get().getEffectiveModelId();
    return models.find(m => m.id === modelId);
  },
}));
