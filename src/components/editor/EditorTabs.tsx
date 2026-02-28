import { useRef, useCallback, useState } from 'react';
import { X, FileCode, FileJson, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    default:
      return FileType;
  }
}

function getFileIconColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'text-blue-400';
    case 'json':
      return 'text-yellow-400';
    case 'css':
    case 'scss':
      return 'text-pink-400';
    case 'js':
    case 'jsx':
      return 'text-yellow-300';
    default:
      return 'text-gray-400';
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function EditorTabs() {
  const tabOrder = useEditorStore((s) => s.tabOrder);
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const closeOtherFiles = useEditorStore((s) => s.closeOtherFiles);
  const closeAllFiles = useEditorStore((s) => s.closeAllFiles);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
  } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleClose = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      closeFile(path);
    },
    [closeFile]
  );

  const handleMiddleClick = useCallback(
    (e: React.MouseEvent, path: string) => {
      if (e.button === 1) {
        e.preventDefault();
        closeFile(path);
      }
    },
    [closeFile]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, path });
    },
    []
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, idx: number) => {
      setDragIdx(idx);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      if (dragIdx !== null && dragIdx !== targetIdx) {
        useEditorStore.getState().reorderTab(dragIdx, targetIdx);
      }
      setDragIdx(null);
    },
    [dragIdx]
  );

  if (tabOrder.length === 0) return null;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex items-center bg-surface-900/50 border-b border-surface-800 overflow-x-auto scrollbar-none"
      >
        {tabOrder.map((path, idx) => {
          const file = openFiles.get(path);
          if (!file) return null;
          const name = getFileName(path);
          const Icon = getFileIcon(name);
          const isActive = activeFilePath === path;

          return (
            <div
              key={path}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => setActiveFile(path)}
              onMouseDown={(e) => handleMiddleClick(e, path)}
              onContextMenu={(e) => handleContextMenu(e, path)}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-surface-800 cursor-pointer select-none shrink-0 min-w-0',
                isActive
                  ? 'bg-surface-950 text-white border-b-2 border-b-primary-500'
                  : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-300'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5 shrink-0', getFileIconColor(name))} />
              <span className="truncate max-w-[120px]">{name}</span>
              {file.isDirty && (
                <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
              )}
              <button
                onClick={(e) => handleClose(e, path)}
                className={cn(
                  'ml-1 p-0.5 rounded hover:bg-surface-700 shrink-0',
                  isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenuOverlay
          x={contextMenu.x}
          y={contextMenu.y}
          path={contextMenu.path}
          onClose={() => setContextMenu(null)}
          onCloseFile={() => {
            closeFile(contextMenu.path);
            setContextMenu(null);
          }}
          onCloseOthers={() => {
            closeOtherFiles(contextMenu.path);
            setContextMenu(null);
          }}
          onCloseAll={() => {
            closeAllFiles();
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
}

function ContextMenuOverlay({
  x,
  y,
  path,
  onClose,
  onCloseFile,
  onCloseOthers,
  onCloseAll,
}: {
  x: number;
  y: number;
  path: string;
  onClose: () => void;
  onCloseFile: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 min-w-[180px] py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl"
        style={{ left: x, top: y }}
      >
        <button
          onClick={onCloseFile}
          className="w-full text-left px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
        >
          Close
        </button>
        <button
          onClick={onCloseOthers}
          className="w-full text-left px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
        >
          Close Others
        </button>
        <button
          onClick={onCloseAll}
          className="w-full text-left px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
        >
          Close All
        </button>
        <div className="my-1 border-t border-surface-700" />
        <button
          onClick={() => {
            navigator.clipboard.writeText(path);
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
        >
          Copy Path
        </button>
      </div>
    </>
  );
}
