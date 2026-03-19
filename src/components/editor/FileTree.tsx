import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileType,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Settings,
  Palette,
  ChevronsDownUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * ProjectFile interface - matching the structure from useProjectFiles hook
 */
export interface ProjectFile {
  _id: string;
  projectId: string;
  path: string;
  filename: string;
  directory: string;
  type: 'file' | 'folder';
  contentType?: string;
  content?: string;
  isScreen?: boolean;
  screenName?: string;
  screenOrder?: number;
  updatedAt: number;
}

/**
 * Internal tree node structure for organizing files hierarchically
 */
interface TreeNode {
  name: string;
  path: string;
  file?: ProjectFile;
  children: TreeNode[];
  isFolder: boolean;
}

/**
 * FileTree component props
 */
interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
  onFileCreate?: () => void;
  onFileDelete?: (file: ProjectFile) => void;
  className?: string;
}

/**
 * Get the appropriate icon for a file based on its extension
 */
function getFileIcon(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'tsx':
    case 'ts':
      return FileCode;
    case 'json':
      return FileJson;
    case 'css':
    case 'scss':
    case 'less':
      return Palette;
    case 'js':
    case 'jsx':
      return FileCode;
    case 'md':
    case 'txt':
      return FileText;
    case 'config':
      return Settings;
    default:
      return FileType;
  }
}

/**
 * Get icon color class based on file extension
 */
function getFileIconColor(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'tsx':
      return 'text-blue-400';
    case 'ts':
      return 'text-sky-400';
    case 'json':
      return 'text-yellow-400';
    case 'css':
    case 'scss':
    case 'less':
      return 'text-pink-400';
    case 'js':
    case 'jsx':
      return 'text-yellow-300';
    case 'md':
    case 'txt':
      return 'text-surface-400';
    case 'config':
      return 'text-surface-500';
    default:
      return 'text-surface-400';
  }
}

/**
 * Count total file descendants in a tree node (excluding folders)
 */
function countFiles(node: TreeNode): number {
  if (!node.isFolder) return 1;
  let count = 0;
  for (const child of node.children) {
    count += countFiles(child);
  }
  return count;
}

/**
 * Build tree structure from flat file list
 * Creates intermediate folder nodes dynamically from file paths
 */
function buildTreeSimple(files: ProjectFile[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  // Helper to ensure a folder node exists at a path
  const ensureFolder = (folderPath: string): TreeNode => {
    // Normalize path (remove leading/trailing slashes)
    const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
    if (!normalizedPath) {
      // Root level - return a dummy node that won't be used
      return { name: '', path: '', children: [], isFolder: true };
    }

    if (nodeMap.has(normalizedPath)) {
      return nodeMap.get(normalizedPath)!;
    }

    // Create the folder node
    const parts = normalizedPath.split('/');
    const folderName = parts[parts.length - 1];
    const node: TreeNode = {
      name: folderName,
      path: normalizedPath,
      children: [],
      isFolder: true,
    };
    nodeMap.set(normalizedPath, node);

    // Recursively ensure parent folder exists
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = ensureFolder(parentPath);
      if (parentNode.path) {
        parentNode.children.push(node);
      }
    }

    return node;
  };

  // Process all files
  for (const file of files) {
    // Normalize file path
    const normalizedPath = file.path.replace(/^\/+/, '');
    const parts = normalizedPath.split('/');
    const fileName = parts[parts.length - 1];

    // Create file node
    const fileNode: TreeNode = {
      name: fileName,
      path: normalizedPath,
      file,
      children: [],
      isFolder: file.type === 'folder',
    };

    // If it's a folder entry from the database, merge with existing or create
    if (file.type === 'folder') {
      if (nodeMap.has(normalizedPath)) {
        // Folder already exists, update with file reference
        const existingNode = nodeMap.get(normalizedPath)!;
        existingNode.file = file;
      } else {
        nodeMap.set(normalizedPath, fileNode);
        // Ensure parent exists
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('/');
          const parentNode = ensureFolder(parentPath);
          if (parentNode.path) {
            parentNode.children.push(fileNode);
          }
        }
      }
    } else {
      // It's a file
      nodeMap.set(normalizedPath, fileNode);

      // Ensure parent folder exists and add this file to it
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('/');
        const parentNode = ensureFolder(parentPath);
        if (parentNode.path) {
          parentNode.children.push(fileNode);
        }
      }
    }
  }

  // Collect root nodes (nodes whose parent path doesn't exist in nodeMap)
  const rootNodes: TreeNode[] = [];
  for (const node of nodeMap.values()) {
    const parts = node.path.split('/');
    if (parts.length === 1) {
      // Top-level file or folder
      rootNodes.push(node);
    } else {
      // Check if already added to a parent (avoid duplicates)
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = nodeMap.get(parentPath);
      if (!parentNode) {
        // No parent found, add to root
        rootNodes.push(node);
      }
    }
  }

  // Sort function: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    // First, deduplicate children by path
    const dedupeChildren = (nodeList: TreeNode[]): TreeNode[] => {
      const seen = new Set<string>();
      return nodeList.filter((node) => {
        if (seen.has(node.path)) return false;
        seen.add(node.path);
        return true;
      });
    };

    return dedupeChildren(nodes)
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }))
      .sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  return sortNodes(rootNodes);
}

/**
 * Context menu component for file operations
 */
interface ContextMenuProps {
  x: number;
  y: number;
  file: ProjectFile;
  onDelete: () => void;
  onClose: () => void;
}

function ContextMenu({ x, y, file, onDelete, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-700 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete {file.type === 'folder' ? 'Folder' : 'File'}
      </button>
    </div>
  );
}

/**
 * Individual tree node component
 */
interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedFile: ProjectFile | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect: (file: ProjectFile) => void;
  onContextMenu: (e: React.MouseEvent, file: ProjectFile) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onToggleFolder,
  onFileSelect,
  onContextMenu,
}: TreeNodeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile?._id === node.file?._id;
  const FileIcon = node.isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);
  const fileCount = node.isFolder ? countFiles(node) : 0;

  const handleClick = () => {
    if (node.isFolder) {
      onToggleFolder(node.path);
    } else if (node.file) {
      onFileSelect(node.file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (node.file) {
      onContextMenu(e, node.file);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'group w-full flex items-center gap-1 px-2 py-[3px] text-[13px] transition-colors',
          'hover:bg-surface-700/50',
          isSelected && 'bg-primary-500/15 text-primary-300'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse indicator for folders */}
        {node.isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center text-surface-500 shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}

        {/* File/folder icon */}
        <FileIcon
          className={cn(
            'w-4 h-4 shrink-0',
            node.isFolder ? 'text-amber-400' : getFileIconColor(node.name)
          )}
        />

        {/* File/folder name */}
        <span
          className={cn(
            'truncate',
            isSelected ? 'text-primary-300' : 'text-surface-300'
          )}
        >
          {node.name}
        </span>

        {/* File count badge for collapsed folders */}
        {node.isFolder && !isExpanded && fileCount > 0 && (
          <span className="ml-auto mr-1 text-[10px] text-surface-600 tabular-nums">
            {fileCount}
          </span>
        )}
      </button>

      {/* Render children if folder is expanded */}
      {node.isFolder && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * FileTree component for displaying project files in a hierarchical tree structure
 *
 * Features:
 * - Converts flat file list to tree structure based on path
 * - Folders are expandable/collapsible
 * - Files show icons based on extension (tsx, ts, css, json)
 * - Selected file is highlighted
 * - Context menu for delete operations
 * - Optional file creation button
 */
export function FileTree({
  files,
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  className,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: ProjectFile;
  } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Build tree structure from flat file list
  const tree = useMemo(() => buildTreeSimple(files), [files]);

  // Auto-expand common folders on initial load
  useEffect(() => {
    if (hasInitialized || files.length === 0) return;

    // Collect all folder paths from the tree
    const collectFolderPaths = (nodes: TreeNode[], paths: string[] = []): string[] => {
      for (const node of nodes) {
        if (node.isFolder) {
          paths.push(node.path);
          collectFolderPaths(node.children, paths);
        }
      }
      return paths;
    };

    const allFolderPaths = collectFolderPaths(tree);

    // Auto-expand first 2 levels and common important folders
    const commonFolders = new Set([
      'app', 'app/(tabs)', 'components', 'components/ui',
      'constants', 'mocks', 'types', 'lib', 'hooks',
      'src', 'src/app', 'src/components',
    ]);
    const foldersToExpand = allFolderPaths.filter((path) => {
      const depth = path.split('/').length;
      return depth <= 2 || commonFolders.has(path);
    });

    if (foldersToExpand.length > 0) {
      setExpandedFolders(new Set(foldersToExpand));
    }
    setHasInitialized(true);
  }, [files, tree, hasInitialized]);

  // Auto-expand folders containing the selected file
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.path.replace(/^\/+/, '').split('/').filter(Boolean);
      const pathsToExpand: string[] = [];
      let currentPath = '';

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        pathsToExpand.push(currentPath);
      }

      if (pathsToExpand.length > 0) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          pathsToExpand.forEach((p) => next.add(p));
          return next;
        });
      }
    }
  }, [selectedFile]);

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: ProjectFile) => {
      if (onFileDelete) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          file,
        });
      }
    },
    [onFileDelete]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (contextMenu && onFileDelete) {
      onFileDelete(contextMenu.file);
    }
  }, [contextMenu, onFileDelete]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with optional create button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Explorer
          </span>
          <span className="text-[10px] text-surface-600 tabular-nums">
            {files.filter((f) => f.type === 'file').length} files
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setExpandedFolders(new Set())}
            className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
            title="Collapse All"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
          </button>
          {onFileCreate && (
            <button
              onClick={onFileCreate}
              className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
              title="Create new file"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* File tree content */}
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 ? (
          <div className="px-3 py-4 text-sm text-surface-500 text-center">
            No files in project
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onFileSelect={onFileSelect}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onDelete={handleDelete}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

export default FileTree;
