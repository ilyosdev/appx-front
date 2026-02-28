import { useState, useMemo } from 'react';
import {
  GitBranch,
  Plus,
  Minus,
  FileCode,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'untracked';

export interface GitChangedFile {
  path: string;
  status: GitFileStatus;
  staged: boolean;
}

interface GitPanelProps {
  changedFiles: GitChangedFile[];
  currentBranch?: string;
  onStageFile?: (path: string) => void;
  onUnstageFile?: (path: string) => void;
  onCommit?: (message: string) => void;
  onPush?: () => void;
  onPull?: () => void;
  onRefresh?: () => void;
  onViewDiff?: (path: string) => void;
}

function getStatusIcon(status: GitFileStatus) {
  switch (status) {
    case 'added':
    case 'untracked':
      return <Plus className="w-3 h-3 text-green-400" />;
    case 'modified':
      return <FileCode className="w-3 h-3 text-yellow-400" />;
    case 'deleted':
      return <Minus className="w-3 h-3 text-red-400" />;
  }
}

function getStatusLabel(status: GitFileStatus): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'modified':
      return 'M';
    case 'deleted':
      return 'D';
    case 'untracked':
      return 'U';
  }
}

function getStatusColor(status: GitFileStatus): string {
  switch (status) {
    case 'added':
    case 'untracked':
      return 'text-green-400';
    case 'modified':
      return 'text-yellow-400';
    case 'deleted':
      return 'text-red-400';
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function GitPanel({
  changedFiles,
  currentBranch = 'main',
  onStageFile,
  onUnstageFile,
  onCommit,
  onPush,
  onPull,
  onRefresh,
  onViewDiff,
}: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [showStaged, setShowStaged] = useState(true);
  const [showUnstaged, setShowUnstaged] = useState(true);

  const stagedFiles = useMemo(
    () => changedFiles.filter((f) => f.staged),
    [changedFiles]
  );
  const unstagedFiles = useMemo(
    () => changedFiles.filter((f) => !f.staged),
    [changedFiles]
  );

  const handleCommit = () => {
    if (!commitMessage.trim() || stagedFiles.length === 0) return;
    onCommit?.(commitMessage.trim());
    setCommitMessage('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-surface-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Source Control
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Branch info */}
      <div className="px-3 py-2 border-b border-surface-800 flex items-center gap-2">
        <GitBranch className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs text-surface-300">{currentBranch}</span>
      </div>

      {/* Commit input */}
      <div className="px-3 py-2 border-b border-surface-800">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCommit();
              }
            }}
            placeholder="Commit message"
            className="flex-1 bg-surface-800 border border-surface-700 rounded px-2 py-1.5 text-xs text-white placeholder-surface-500 outline-none focus:border-primary-500"
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            className={cn(
              'p-1.5 rounded',
              commitMessage.trim() && stagedFiles.length > 0
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-surface-800 text-surface-600 cursor-not-allowed'
            )}
            title="Commit (Cmd+Enter)"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Push/Pull buttons */}
        <div className="flex gap-1 mt-2">
          {onPush && (
            <button
              onClick={onPush}
              className="flex-1 px-2 py-1 text-xs rounded bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
            >
              Push
            </button>
          )}
          {onPull && (
            <button
              onClick={onPull}
              className="flex-1 px-2 py-1 text-xs rounded bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
            >
              Pull
            </button>
          )}
        </div>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged changes */}
        <div>
          <button
            onClick={() => setShowStaged(!showStaged)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-400 hover:bg-surface-800/50"
          >
            {showStaged ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="font-medium">Staged Changes</span>
            <span className="ml-auto text-surface-600">{stagedFiles.length}</span>
          </button>

          {showStaged &&
            stagedFiles.map((file) => (
              <div
                key={file.path}
                className="flex items-center gap-1.5 px-3 pl-6 py-1 text-xs hover:bg-surface-800/50 group cursor-pointer"
                onClick={() => onViewDiff?.(file.path)}
              >
                {getStatusIcon(file.status)}
                <span className="text-surface-300 truncate flex-1">
                  {getFileName(file.path)}
                </span>
                <span
                  className={cn(
                    'text-xs font-mono shrink-0',
                    getStatusColor(file.status)
                  )}
                >
                  {getStatusLabel(file.status)}
                </span>
                {onUnstageFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnstageFile(file.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-700 text-surface-500"
                    title="Unstage"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
        </div>

        {/* Unstaged changes */}
        <div>
          <button
            onClick={() => setShowUnstaged(!showUnstaged)}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-surface-400 hover:bg-surface-800/50"
          >
            {showUnstaged ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="font-medium">Changes</span>
            <span className="ml-auto text-surface-600">{unstagedFiles.length}</span>
          </button>

          {showUnstaged &&
            unstagedFiles.map((file) => (
              <div
                key={file.path}
                className="flex items-center gap-1.5 px-3 pl-6 py-1 text-xs hover:bg-surface-800/50 group cursor-pointer"
                onClick={() => onViewDiff?.(file.path)}
              >
                {getStatusIcon(file.status)}
                <span className="text-surface-300 truncate flex-1">
                  {getFileName(file.path)}
                </span>
                <span
                  className={cn(
                    'text-xs font-mono shrink-0',
                    getStatusColor(file.status)
                  )}
                >
                  {getStatusLabel(file.status)}
                </span>
                {onStageFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageFile(file.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-700 text-surface-500"
                    title="Stage"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
        </div>

        {changedFiles.length === 0 && (
          <div className="px-3 py-4 text-sm text-surface-600 text-center">
            No changes detected
          </div>
        )}
      </div>
    </div>
  );
}
