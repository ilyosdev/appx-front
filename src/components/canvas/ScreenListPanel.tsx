import { useCallback } from "react";
import {
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Monitor,
  Layout,
  User,
  Settings,
  Search,
  ShoppingCart,
  Home,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScreenData } from "@/types/canvas";

/** Return an icon for the screen based on its name */
function getScreenIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("home") || n.includes("dashboard") || n.includes("main"))
    return Home;
  if (n.includes("profile") || n.includes("account")) return User;
  if (n.includes("settings") || n.includes("preferences")) return Settings;
  if (
    n.includes("search") ||
    n.includes("explore") ||
    n.includes("discover")
  )
    return Search;
  if (
    n.includes("cart") ||
    n.includes("checkout") ||
    n.includes("shop") ||
    n.includes("market")
  )
    return ShoppingCart;
  if (n.includes("detail") || n.includes("product") || n.includes("item"))
    return FileText;
  if (n.includes("layout") || n.includes("list") || n.includes("feed"))
    return Layout;
  return Monitor;
}

interface ScreenListPanelProps {
  screens: ScreenData[];
  selectedId: string | null;
  onSelectScreen: (id: string) => void;
  onAddScreen: () => void;
}

export function ScreenListPanel({
  screens,
  selectedId,
  onSelectScreen,
  onAddScreen,
}: ScreenListPanelProps) {
  const handleClick = useCallback(
    (id: string) => {
      onSelectScreen(id);
    },
    [onSelectScreen],
  );

  // Only show main screens (not variations) for clean list
  const mainScreens = screens.filter((s) => !s.parentScreenId);

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2.5 border-b border-surface-800/50">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          Screens
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
        {mainScreens.map((screen) => {
          const Icon = getScreenIcon(screen.name);
          const isActive = selectedId === screen.id;
          const isLoading = !!screen.isLoading;
          const hasError = !!screen.hasError;
          const hasContent = !!(screen.htmlContent || screen.compiledHtml);

          return (
            <button
              key={screen.id}
              onClick={() => handleClick(screen.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 group",
                isActive
                  ? "bg-primary-500/15 border border-primary-500/30 text-white"
                  : "text-surface-300 hover:bg-surface-800/50 hover:text-white border border-transparent",
              )}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
                  isActive
                    ? "bg-primary-500/20 text-primary-400"
                    : "bg-surface-800/50 text-surface-500 group-hover:text-surface-400",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <span className="flex-1 text-sm font-medium truncate">
                {screen.name}
              </span>

              {/* Status indicator */}
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                ) : hasError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                ) : hasContent ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-2 py-2 border-t border-surface-800/50">
        <button
          onClick={onAddScreen}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Screen</span>
        </button>
      </div>
    </div>
  );
}
