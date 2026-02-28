import { useMemo, useState } from "react";
import { FileCode, FolderOpen, ChevronDown, Layers, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileSelectorProps {
  files: Map<string, { content: string; isComplete: boolean }>;
  activeFile: string | null;
  onSelectFile: (filePath: string) => void;
}

interface FileGroup {
  label: string;
  icon: React.ReactNode;
  files: string[];
}

function categorizeFiles(filePaths: string[]): FileGroup[] {
  const screens: string[] = [];
  const utilities: string[] = [];
  const other: string[] = [];

  for (const fp of filePaths) {
    const lower = fp.toLowerCase();
    if (
      lower.includes("/app/") ||
      lower.includes("/screen") ||
      lower.includes("/page") ||
      lower.includes("/view")
    ) {
      screens.push(fp);
    } else if (
      lower.includes("/constant") ||
      lower.includes("/hook") ||
      lower.includes("/util") ||
      lower.includes("/lib") ||
      lower.includes("/helper") ||
      lower.includes("/service") ||
      lower.includes("/config") ||
      lower.includes("/type") ||
      lower.includes("/context")
    ) {
      utilities.push(fp);
    } else {
      other.push(fp);
    }
  }

  const groups: FileGroup[] = [];

  if (screens.length > 0) {
    groups.push({
      label: "Screens",
      icon: <Layers className="w-3.5 h-3.5" />,
      files: screens,
    });
  }

  if (utilities.length > 0) {
    groups.push({
      label: "Utilities",
      icon: <Settings2 className="w-3.5 h-3.5" />,
      files: utilities,
    });
  }

  if (other.length > 0) {
    groups.push({
      label: "Other",
      icon: <FolderOpen className="w-3.5 h-3.5" />,
      files: other,
    });
  }

  return groups;
}

function getFileName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

function getFileDir(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

export function FileSelector({ files, activeFile, onSelectFile }: FileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const filePaths = useMemo(() => {
    return Array.from(files.keys()).filter(fp => files.get(fp)?.isComplete);
  }, [files]);

  const groups = useMemo(() => categorizeFiles(filePaths), [filePaths]);

  const activeFileName = activeFile ? getFileName(activeFile) : null;

  if (filePaths.length === 0) return null;

  // If only one file, no need for a selector
  if (filePaths.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-800/50">
        <FileCode className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs font-medium text-surface-300 font-mono truncate">
          {filePaths[0]}
        </span>
      </div>
    );
  }

  return (
    <div className="border-b border-surface-800/50">
      {/* Compact active file bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-800/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
          <span className="text-xs font-medium text-white font-mono truncate">
            {activeFileName || "Select a file"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-surface-500 tabular-nums">
            {filePaths.length} files
          </span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-surface-400 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>

      {/* Expanded file list */}
      {isExpanded && (
        <div className="px-2 pb-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
          {groups.map((group) => (
            <div key={group.label} className="mb-1.5 last:mb-0">
              {/* Group header */}
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="text-surface-500">{group.icon}</span>
                <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              {/* Files in group */}
              {group.files.map((filePath) => {
                const isActive = filePath === activeFile;
                const dir = getFileDir(filePath);
                const name = getFileName(filePath);

                return (
                  <button
                    key={filePath}
                    onClick={() => {
                      onSelectFile(filePath);
                      setIsExpanded(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                      isActive
                        ? "bg-primary-500/10 border border-primary-500/30"
                        : "hover:bg-surface-800/50 border border-transparent"
                    )}
                  >
                    <FileCode className={cn(
                      "w-3 h-3 flex-shrink-0",
                      isActive ? "text-primary-400" : "text-surface-500"
                    )} />
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        "text-xs font-mono truncate block",
                        isActive ? "text-white" : "text-surface-300"
                      )}>
                        {name}
                      </span>
                      {dir && (
                        <span className="text-[10px] text-surface-500 font-mono truncate block">
                          {dir}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
