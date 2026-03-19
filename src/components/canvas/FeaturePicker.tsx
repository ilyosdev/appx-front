import { useState, useMemo } from "react";
import {
  Search,
  X,
  Check,
  Smartphone,
  Camera,
  Wrench,
  Brain,
  CreditCard,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureCatalog } from "@/hooks/useFeatures";
import { FEATURE_CATEGORIES, type FeatureCategoryId } from "@/types/features";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  device: Smartphone,
  media: Camera,
  utilities: Wrench,
  ai: Brain,
  payments: CreditCard,
  social: Users,
};

interface FeaturePickerProps {
  projectId: string;
  enabledFeatures: string[];
  onToggleFeature: (featureId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function FeaturePicker({
  enabledFeatures,
  onToggleFeature,
  isOpen,
  onClose,
}: FeaturePickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FeatureCategoryId>("all");
  const { data: catalog, isLoading } = useFeatureCatalog();

  const filtered = useMemo(() => {
    if (!catalog) return [];
    let items = catalog;
    if (activeCategory !== "all") {
      items = items.filter((f) => f.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q),
      );
    }
    return items;
  }, [catalog, activeCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-surface-900 border border-surface-700 rounded-xl shadow-xl overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-surface-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-8 pr-8 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-white placeholder-surface-500 focus:outline-none focus:border-blue-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface-700/50">
        {FEATURE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
              activeCategory === cat.id
                ? "bg-blue-500/20 text-blue-400"
                : "text-surface-500 hover:text-surface-300 hover:bg-surface-800",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Feature list */}
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-surface-500">
            Loading features...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-surface-500">
            No features found
          </div>
        ) : (
          filtered.map((feature) => {
            const isEnabled = enabledFeatures.includes(feature.id);
            const CategoryIcon = CATEGORY_ICONS[feature.category] || Wrench;
            return (
              <button
                key={feature.id}
                onClick={() => onToggleFeature(feature.id)}
                className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-surface-800/50 transition-colors border-b border-surface-800/30 last:border-b-0 text-left"
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors",
                    isEnabled
                      ? "bg-blue-500 border-blue-500"
                      : "border-surface-600 bg-transparent",
                  )}
                >
                  {isEnabled && <Check className="w-2.5 h-2.5 text-white" />}
                </div>

                {/* Icon */}
                <CategoryIcon className="w-3.5 h-3.5 mt-0.5 text-surface-400 flex-shrink-0" />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white">
                      {feature.name}
                    </span>
                    {feature.requiresBuild && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-2 h-2" />
                        Build
                      </span>
                    )}
                    {feature.category === 'ai' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                        Uses credits
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-500 leading-tight mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Close button */}
      <div className="px-3 py-1.5 border-t border-surface-700/50 flex items-center justify-between">
        <span className="text-[10px] text-surface-500">
          {enabledFeatures.length} feature{enabledFeatures.length !== 1 ? "s" : ""} enabled
        </span>
        <button
          onClick={onClose}
          className="text-[10px] text-surface-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
