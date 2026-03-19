import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeatureDefinition } from '@/types/features';

export function useFeatureCatalog() {
  return useQuery<FeatureDefinition[]>({
    queryKey: ['features'],
    queryFn: async () => {
      const { data } = await api.get('/ai/features');
      return data.data ?? data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour -- catalog rarely changes
  });
}

export function useProjectFeatures(projectId: string, enabledFeatures: string[]) {
  const queryClient = useQueryClient();

  const toggleFeature = useMutation({
    mutationFn: async (featureId: string) => {
      const newFeatures = enabledFeatures.includes(featureId)
        ? enabledFeatures.filter(f => f !== featureId)
        : [...enabledFeatures, featureId];
      await api.patch(`/projects/${projectId}`, { enabledFeatures: newFeatures });
      return newFeatures;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  return { toggleFeature };
}
