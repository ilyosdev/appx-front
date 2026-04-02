import { useMemo, useState, useCallback } from "react";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode2,
  FileJson,
  FileType,
  Braces,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  files: Array<{ path: string; size?: number }>;
  selectedFile?: string;
  onSelectFile: (path: string) => void;
  className?: string;
}

/* ---------- tree data structure ---------- */

interface TreeNode {
  name: string;
  path: string; // full path for files, folder prefix for dirs
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(files: Array<{ path: string; size?: number }>): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };

  for (const { path } of files) {
    const parts = path.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      let child = current.children.find(
        (c) => c.name === part && c.isFolder === !isFile,
      );

      if (!child) {
        child = {
          name: part,
          path: isFile ? path : parts.slice(0, i + 1).join("/"),
          isFolder: !isFile,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: folders first (alphabetical), then files (alphabetical)
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    const folders = nodes
      .filter((n) => n.isFolder)
      .sort((a, b) => a.name.localeCompare(b.name));
    const filesArr = nodes
      .filter((n) => !n.isFolder)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of folders) {
      folder.children = sortNodes(folder.children);
    }

    return [...folders, ...filesArr];
  };

  return sortNodes(root.children);
}

/* ---------- file icon helper ---------- */

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "tsx":
    case "jsx":
      return FileCode2;
    case "ts":
      return FileType;
    case "json":
      return FileJson;
    case "js":
    case "mjs":
    case "cjs":
      return Braces;
    default:
      return File;
  }
}

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "tsx":
    case "jsx":
      return "text-sky-400";
    case "ts":
      return "text-blue-400";
    case "json":
      return "text-yellow-400";
    case "js":
    case "mjs":
    case "cjs":
      return "text-amber-400";
    case "css":
    case "scss":
      return "text-pink-400";
    case "md":
      return "text-surface-400";
    default:
      return "text-surface-500";
  }
}

/* ---------- tree node component ---------- */

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  selectedFile?: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}

function TreeNodeRow({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
}: TreeNodeRowProps) {
  if (node.isFolder) {
    const isExpanded = expandedFolders.has(node.path);
    return (
      <>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full flex items-center gap-1 py-[3px] pr-2 text-left hover:bg-surface-800/50 transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-primary-400/70 flex-shrink-0" />
          )}
          <span className="text-xs text-surface-300 group-hover:text-white truncate ml-0.5">
            {node.name}
          </span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeRow
              key={child.path + (child.isFolder ? "/" : "")}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))}
      </>
    );
  }

  // File node
  const Icon = getFileIcon(node.name);
  const iconColor = getFileIconColor(node.name);
  const isSelected = selectedFile === node.path;

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "w-full flex items-center gap-1 py-[3px] pr-2 text-left transition-colors",
        isSelected
          ? "bg-primary-500/15 text-white"
          : "text-surface-300 hover:bg-surface-800/50 hover:text-white",
      )}
      style={{ paddingLeft: `${depth * 12 + 4 + 18}px` }}
    >
      <Icon
        className={cn("w-3.5 h-3.5 flex-shrink-0", isSelected ? "text-primary-400" : iconColor)}
      />
      <span className="text-xs font-mono truncate ml-0.5">{node.name}</span>
    </button>
  );
}

/* ---------- main component ---------- */

export function FileTree({ files, selectedFile, onSelectFile, className }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-expand folders that contain the selected file, plus all top-level folders
  const [manualToggles, setManualToggles] = useState<Set<string>>(new Set());
  const [toggledPaths, setToggledPaths] = useState<Set<string>>(new Set());

  const expandedFolders = useMemo(() => {
    const expanded = new Set<string>();

    // Expand top-level folders by default
    for (const node of tree) {
      if (node.isFolder) {
        expanded.add(node.path);
      }
    }

    // Expand ancestor folders of the selected file
    if (selectedFile) {
      const parts = selectedFile.split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        expanded.add(parts.slice(0, i).join("/"));
      }
    }

    // Apply manual toggles
    for (const path of toggledPaths) {
      if (manualToggles.has(path)) {
        if (expanded.has(path)) {
          expanded.delete(path);
        } else {
          expanded.add(path);
        }
      }
    }

    return expanded;
  }, [tree, selectedFile, manualToggles, toggledPaths]);

  const handleToggleFolder = useCallback((path: string) => {
    setManualToggles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
    setToggledPaths((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  if (files.length === 0) return null;

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      <div className="px-3 py-2 border-b border-surface-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
            Files
          </h3>
          <span className="text-[10px] text-surface-500 tabular-nums">
            {files.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-surface-700">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.path + (node.isFolder ? "/" : "")}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
