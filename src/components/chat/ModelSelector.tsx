import { useEffect, useState, useRef } from 'react';
import { useModelStore } from '../../stores/modelStore';
import { Sparkles, ChevronDown, Cpu, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  google: Zap,
  anthropic: Brain,
  openai: Cpu,
};

export function ModelSelector() {
  const { availableModels, loading, hasFetched: _hasFetched, fetchModels, setSelectedModel, getEffectiveModel } = useModelStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      fetchModels();
    }
  }, [loading, fetchModels]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveModel = getEffectiveModel();

  if (loading || availableModels.length === 0) {
    return null;
  }

  const ProviderIcon = PROVIDER_ICONS[effectiveModel?.provider || 'google'] || Sparkles;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-medium
                   bg-surface-800/50 hover:bg-surface-700/50 border border-surface-700/50 transition-colors"
      >
        <ProviderIcon className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-surface-200">{effectiveModel?.displayName || 'Model'}</span>
        {effectiveModel?.isFree && <span className="text-emerald-400 text-[10px]">FREE</span>}
        <ChevronDown className={cn("w-3 h-3 text-surface-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-60 bg-surface-900 border border-surface-700 rounded-lg shadow-xl z-50 py-1">
          {availableModels.map((model) => {
            const ModelIcon = PROVIDER_ICONS[model.provider] || Sparkles;
            const isSelected = model.id === effectiveModel?.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-surface-800 transition-colors",
                  isSelected && "bg-primary-500/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <ModelIcon className={cn("w-4 h-4", isSelected ? "text-primary-400" : "text-surface-400")} />
                  <span className="text-sm font-medium text-white">{model.displayName}</span>
                  {model.isFree && (
                    <span className="ml-auto text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 bg-emerald-500/10 rounded">FREE</span>
                  )}
                  {!model.isFree && (
                    <span className="ml-auto text-xs text-surface-400">1 credit</span>
                  )}
                </div>
                <p className="text-xs text-surface-500 mt-0.5 pl-6 capitalize">{model.provider}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
