import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Loader2,
  RefreshCw,
  Palette,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { DesignSystem, DesignSystemFile } from "@/lib/design-system";
import { designSystemApi } from "@/lib/design-system";

interface DesignSystemPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  designSystem: DesignSystem | null | undefined;
  onFilesUpdated: (files?: DesignSystemFile[]) => void;
}

// Categorize files into components vs config
function categorizeFiles(files: DesignSystemFile[]) {
  const components: DesignSystemFile[] = [];
  const configs: DesignSystemFile[] = [];

  for (const file of files) {
    const name = file.path.split("/").pop() || file.path;
    if (
      name.endsWith(".config.js") ||
      name.endsWith(".config.ts") ||
      name === "theme.ts" ||
      name === "theme.js" ||
      name === "global.css"
    ) {
      configs.push(file);
    } else {
      components.push(file);
    }
  }

  return { components, configs };
}

// Important theme color keys to display as swatches
const THEME_COLOR_KEYS = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "card", label: "Card" },
  { key: "muted", label: "Muted" },
  { key: "destructive", label: "Destructive" },
  { key: "border", label: "Border" },
] as const;

export function DesignSystemPanel({
  isOpen,
  onClose,
  projectId,
  designSystem,
  onFilesUpdated,
}: DesignSystemPanelProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const files = designSystem?.files || [];
  const { components, configs } = categorizeFiles(files);
  const hasFiles = files.length > 0;

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await designSystemApi.generateComponents(projectId);
      const newFiles: DesignSystemFile[] =
        response.data?.data?.files || (response.data as any)?.files || [];
      onFilesUpdated(newFiles);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate components";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, onFilesUpdated]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Design System"
      size="lg"
      className="max-h-[85vh] flex flex-col"
    >
      <div className="overflow-y-auto -mx-6 px-6 flex-1">
        {/* No design system at all */}
        {!designSystem && (
          <div className="text-center py-12">
            <Palette className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            <p className="text-sm text-surface-400 mb-2">
              No design system generated yet
            </p>
            <p className="text-xs text-surface-500">
              Start by creating your project and generating screens. The design
              system will be created automatically.
            </p>
          </div>
        )}

        {/* Design system exists */}
        {designSystem && (
          <div className="space-y-6">
            {/* Theme Colors */}
            <section>
              <h3 className="text-sm font-medium text-surface-300 mb-3">
                Theme Colors
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {THEME_COLOR_KEYS.map(({ key, label }) => {
                  const color =
                    designSystem.theme?.[
                      key as keyof typeof designSystem.theme
                    ];
                  if (!color || typeof color !== "string") return null;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
                    >
                      <div
                        className="w-5 h-5 rounded-md border border-zinc-700 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-surface-400 truncate">
                          {label}
                        </p>
                        <p className="text-[10px] text-surface-500 font-mono truncate">
                          {color}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Typography & Spacing */}
            <section>
              <h3 className="text-sm font-medium text-surface-300 mb-3">
                Typography & Spacing
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {designSystem.theme?.fontSans && (
                  <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <p className="text-xs text-surface-500">Font</p>
                    <p className="text-sm text-surface-300">
                      {designSystem.theme.fontSans}
                    </p>
                  </div>
                )}
                {designSystem.theme?.fontHeading && (
                  <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <p className="text-xs text-surface-500">Heading Font</p>
                    <p className="text-sm text-surface-300">
                      {designSystem.theme.fontHeading}
                    </p>
                  </div>
                )}
                {designSystem.theme?.radius && (
                  <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <p className="text-xs text-surface-500">Border Radius</p>
                    <p className="text-sm text-surface-300">
                      {designSystem.theme.radius}
                    </p>
                  </div>
                )}
                {designSystem.themeMode && (
                  <div className="px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <p className="text-xs text-surface-500">Theme Mode</p>
                    <p className="text-sm text-surface-300 capitalize">
                      {designSystem.themeMode}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Component Files */}
            {hasFiles && components.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-surface-300 mb-3">
                  Components ({components.length} files)
                </h3>
                <div className="space-y-1">
                  {components.map((file) => (
                    <FileItem
                      key={file.path}
                      file={file}
                      isExpanded={expandedFiles.has(file.path)}
                      onToggle={() => toggleFile(file.path)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Config Files */}
            {hasFiles && configs.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-surface-300 mb-3">
                  Config Files ({configs.length} files)
                </h3>
                <div className="space-y-1">
                  {configs.map((file) => (
                    <FileItem
                      key={file.path}
                      file={file}
                      isExpanded={expandedFiles.has(file.path)}
                      onToggle={() => toggleFile(file.path)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={handleGenerate}
                    className="text-xs text-red-300 underline mt-1 hover:text-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Generate / Regenerate Button */}
            <div className="pt-2 pb-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 hover:text-primary-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating components...
                  </>
                ) : hasFiles ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Components
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    Generate Components
                  </>
                )}
              </button>
              {!hasFiles && (
                <p className="text-xs text-surface-500 text-center mt-2">
                  Generate reusable Button, Card, Input, Header, and BottomNav
                  components from your design system
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FileItem({
  file,
  isExpanded,
  onToggle,
}: {
  file: DesignSystemFile;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const fileName = file.path.split("/").pop() || file.path;

  return (
    <div className="rounded-lg border border-zinc-800/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
        )}
        <FileCode2 className="w-4 h-4 text-surface-500 flex-shrink-0" />
        <span className="text-sm text-surface-300 truncate">{fileName}</span>
        <span className="ml-auto text-xs text-surface-600">
          {isExpanded ? "Hide" : "View"}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800/50">
          <pre className="p-3 text-xs text-zinc-300 font-mono bg-zinc-950 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
            {file.content}
          </pre>
        </div>
      )}
    </div>
  );
}
