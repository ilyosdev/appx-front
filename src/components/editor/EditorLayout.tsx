import {
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  FolderTree,
  Search,
  GitBranch,
  AlertCircle,
  Terminal as TerminalIcon,
  AlertTriangle,
  PanelLeft,
  PanelBottom,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEditorStore,
  type ActivityPanel,
  type BottomPanel,
} from '@/stores/editorStore';
import { FileTree, type ProjectFile } from './FileTree';
import { EditorTabs } from './EditorTabs';
import { MonacoEditor } from './MonacoEditor';
import { Terminal } from './Terminal';
import { SearchPanel } from './SearchPanel';
import { ProblemsPanel } from './ProblemsPanel';
import { GitPanel, type GitChangedFile } from './GitPanel';
import { QuickOpen } from './QuickOpen';
import { useGitStorage } from '@/hooks/useGitStorage';

interface SourceFile {
  id: string;
  projectId: string;
  path: string;
  filename: string;
  directory: string;
  fileType: 'file' | 'folder';
  contentType: string | null;
  content: string | null;
  isScreen: boolean;
  screenName: string | null;
  screenOrder: number;
  screenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditorLayoutProps {
  projectId: string;
  files: SourceFile[];
  onSaveFile: (fileId: string, path: string, content: string) => Promise<void>;
  onFilesChanged?: (files: SourceFile[]) => void;
}

function convertToProjectFiles(files: SourceFile[]): ProjectFile[] {
  return files.map((f) => ({
    _id: f.id,
    projectId: f.projectId,
    path: f.path,
    filename: f.filename,
    directory: f.directory,
    type: f.fileType,
    contentType: f.contentType || undefined,
    content: f.content || undefined,
    isScreen: f.isScreen,
    screenName: f.screenName || undefined,
    screenOrder: f.screenOrder,
    updatedAt: new Date(f.updatedAt).getTime(),
  }));
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
    case 'scss':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    default:
      return 'typescript';
  }
}

const ACTIVITY_ITEMS: Array<{
  id: ActivityPanel;
  icon: typeof FolderTree;
  label: string;
  shortcut: string;
}> = [
  { id: 'explorer', icon: FolderTree, label: 'Explorer', shortcut: 'Cmd+Shift+E' },
  { id: 'search', icon: Search, label: 'Search', shortcut: 'Cmd+Shift+F' },
  { id: 'git', icon: GitBranch, label: 'Source Control', shortcut: 'Cmd+Shift+G' },
  { id: 'problems', icon: AlertCircle, label: 'Problems', shortcut: 'Cmd+Shift+M' },
];

const BOTTOM_ITEMS: Array<{
  id: BottomPanel;
  label: string;
}> = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'problems', label: 'Problems' },
  { id: 'output', label: 'Output' },
];

export function EditorLayout({
  projectId,
  files,
  onSaveFile,
}: EditorLayoutProps) {
  const store = useEditorStore();
  const {
    openFiles,
    activeFilePath,
    tabOrder: _tabOrder,
    activeActivityPanel,
    showSidebar,
    showBottomPanel,
    activeBottomPanel,
    bottomPanelHeight,
    sidebarWidth,
    problems,
    setActiveActivityPanel,
    toggleSidebar,
    setActiveBottomPanel,
    toggleBottomPanel,
    setBottomPanelHeight,
    setSidebarWidth,
    openFile,
    setActiveFile: _setActiveFile,
    updateFileContent,
    addTerminalLine: _addTerminalLine,
    markFileSaved,
  } = store;

  const projectFiles = useMemo(() => convertToProjectFiles(files), [files]);

  // Build file map by path
  const filesByPath = useMemo(() => {
    const map = new Map<string, SourceFile>();
    for (const f of files) {
      map.set(f.path, f);
    }
    return map;
  }, [files]);

  // Current active file data
  const activeOpenFile = activeFilePath ? openFiles.get(activeFilePath) : null;
  const activeSourceFile = activeFilePath
    ? filesByPath.get(activeFilePath)
    : null;

  // File select handler
  const handleFileSelect = useCallback(
    (file: ProjectFile) => {
      const sourceFile = files.find((f) => f.id === file._id);
      if (sourceFile && sourceFile.fileType === 'file') {
        const language = getLanguageFromPath(sourceFile.path);
        openFile(sourceFile.path, sourceFile.content || '', language);
      }
    },
    [files, openFile]
  );

  // Navigate to search result
  const handleNavigateToResult = useCallback(
    (filePath: string, _line: number, _column: number) => {
      const sourceFile = filesByPath.get(filePath);
      if (sourceFile) {
        const language = getLanguageFromPath(sourceFile.path);
        openFile(sourceFile.path, sourceFile.content || '', language);
      }
    },
    [filesByPath, openFile]
  );

  // Navigate from quick open
  const handleQuickOpenSelect = useCallback(
    (path: string) => {
      const sourceFile = filesByPath.get(path);
      if (sourceFile) {
        const language = getLanguageFromPath(sourceFile.path);
        openFile(sourceFile.path, sourceFile.content || '', language);
      }
    },
    [filesByPath, openFile]
  );

  // Save handler
  const handleSave = useCallback(async () => {
    if (!activeFilePath || !activeOpenFile || !activeSourceFile) return;
    if (!activeOpenFile.isDirty) return;

    try {
      await onSaveFile(
        activeSourceFile.id,
        activeFilePath,
        activeOpenFile.content
      );
      markFileSaved(activeFilePath);
    } catch {
      // Error logged in terminal by onSaveFile
    }
  }, [activeFilePath, activeOpenFile, activeSourceFile, onSaveFile, markFileSaved]);

  // Content change handler
  const handleContentChange = useCallback(
    (value: string) => {
      if (activeFilePath) {
        updateFileContent(activeFilePath, value);
      }
    },
    [activeFilePath, updateFileContent]
  );

  // Git storage hook for real commit history and branch data
  const gitStorage = useGitStorage(projectId);

  // Fetch git data on mount and when activity panel switches to git
  useEffect(() => {
    if (activeActivityPanel === 'git') {
      gitStorage.fetchHistory(50);
      gitStorage.getBranches();
    }
  }, [activeActivityPanel, projectId]);

  // Git changed files (compute from dirty open files)
  const gitChangedFiles = useMemo<GitChangedFile[]>(() => {
    const changed: GitChangedFile[] = [];
    for (const [path, file] of openFiles) {
      if (file.isDirty) {
        changed.push({
          path,
          status: 'modified',
          staged: false,
        });
      }
    }
    return changed;
  }, [openFiles]);

  // Problem counts
  const problemCounts = useMemo(() => {
    let errors = 0, warnings = 0;
    for (const p of problems) {
      if (p.severity === 'error') errors++;
      if (p.severity === 'warning') warnings++;
    }
    return { errors, warnings };
  }, [problems]);

  // Files list for search
  const searchableFiles = useMemo(
    () =>
      files
        .filter((f) => f.fileType === 'file')
        .map((f) => ({ path: f.path, content: f.content })),
    [files]
  );

  // Selected file for FileTree
  const selectedProjectFile = activeFilePath
    ? projectFiles.find((f) => f.path === activeFilePath) || null
    : null;

  // Resize handlers
  const sidebarResizeRef = useRef<HTMLDivElement>(null);
  const bottomResizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sidebarEl = sidebarResizeRef.current;
    if (!sidebarEl) return;

    let startX: number;
    let startWidth: number;

    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      startWidth = sidebarWidth;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(500, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    sidebarEl.addEventListener('mousedown', handleMouseDown);
    return () => sidebarEl.removeEventListener('mousedown', handleMouseDown);
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => {
    const bottomEl = bottomResizeRef.current;
    if (!bottomEl) return;

    let startY: number;
    let startHeight: number;

    const handleMouseDown = (e: MouseEvent) => {
      startY = e.clientY;
      startHeight = bottomPanelHeight;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const newHeight = Math.max(100, Math.min(500, startHeight + delta));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    bottomEl.addEventListener('mousedown', handleMouseDown);
    return () => bottomEl.removeEventListener('mousedown', handleMouseDown);
  }, [bottomPanelHeight, setBottomPanelHeight]);

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="w-12 bg-surface-900 border-r border-surface-800 flex flex-col items-center py-2 gap-1 shrink-0">
          {ACTIVITY_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeActivityPanel === item.id && showSidebar;
            const showBadge =
              item.id === 'problems' &&
              (problemCounts.errors > 0 || problemCounts.warnings > 0);
            return (
              <button
                key={item.id}
                onClick={() => setActiveActivityPanel(item.id)}
                className={cn(
                  'relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-surface-800 text-white'
                    : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50'
                )}
                title={`${item.label} (${item.shortcut})`}
              >
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/50"
            title="Toggle Sidebar (Cmd+B)"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-lg',
              showBottomPanel
                ? 'bg-surface-800 text-white'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50'
            )}
            title="Toggle Panel (Ctrl+`)"
          >
            <PanelBottom className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <>
            <div
              className="bg-surface-900/50 border-r border-surface-800 overflow-hidden shrink-0"
              style={{ width: sidebarWidth }}
            >
              {activeActivityPanel === 'explorer' && (
                <FileTree
                  files={projectFiles}
                  selectedFile={selectedProjectFile}
                  onFileSelect={handleFileSelect}
                />
              )}
              {activeActivityPanel === 'search' && (
                <SearchPanel
                  files={searchableFiles}
                  onNavigateToResult={handleNavigateToResult}
                />
              )}
              {activeActivityPanel === 'git' && (
                <GitPanel
                  changedFiles={gitChangedFiles}
                  currentBranch={gitStorage.currentBranch}
                  onRefresh={() => {
                    gitStorage.fetchHistory(50);
                    gitStorage.getBranches();
                  }}
                />
              )}
              {activeActivityPanel === 'problems' && (
                <SidebarProblems
                  onNavigateToProblem={handleNavigateToResult}
                />
              )}
            </div>
            {/* Sidebar resize handle */}
            <div
              ref={sidebarResizeRef}
              className="w-1 bg-transparent hover:bg-primary-500/50 cursor-col-resize transition-colors shrink-0"
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor main + bottom panel split */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Editor tabs + content */}
            <div className="flex-1 flex flex-col min-h-0">
              <EditorTabs />

              <div className="flex-1 min-h-0">
                {activeOpenFile && activeFilePath ? (
                  <MonacoEditor
                    filePath={activeFilePath}
                    value={activeOpenFile.content}
                    language={activeOpenFile.language}
                    onChange={handleContentChange}
                    onSave={handleSave}
                  />
                ) : (
                  <EmptyEditor />
                )}
              </div>
            </div>

            {/* Bottom panel */}
            {showBottomPanel && (
              <>
                {/* Bottom resize handle */}
                <div
                  ref={bottomResizeRef}
                  className="h-1 bg-transparent hover:bg-primary-500/50 cursor-row-resize transition-colors shrink-0"
                />
                <div
                  className="border-t border-surface-800 shrink-0 overflow-hidden"
                  style={{ height: bottomPanelHeight }}
                >
                  {/* Bottom panel tabs */}
                  <div className="flex items-center border-b border-surface-800 bg-surface-900/50">
                    {BOTTOM_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveBottomPanel(item.id)}
                        className={cn(
                          'px-3 py-1 text-xs font-medium transition-colors',
                          activeBottomPanel === item.id
                            ? 'text-white border-b border-primary-500'
                            : 'text-surface-500 hover:text-surface-300'
                        )}
                      >
                        {item.label}
                        {item.id === 'problems' &&
                          (problemCounts.errors > 0 ||
                            problemCounts.warnings > 0) && (
                            <span className="ml-1 px-1 rounded text-xs bg-red-500/20 text-red-400">
                              {problemCounts.errors + problemCounts.warnings}
                            </span>
                          )}
                      </button>
                    ))}
                  </div>

                  <div className="h-[calc(100%-28px)]">
                    {activeBottomPanel === 'terminal' && <Terminal />}
                    {activeBottomPanel === 'problems' && (
                      <ProblemsPanel
                        onNavigateToProblem={handleNavigateToResult}
                      />
                    )}
                    {activeBottomPanel === 'output' && <Terminal />}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        activeFilePath={activeFilePath}
        isDirty={activeOpenFile?.isDirty || false}
        language={activeOpenFile?.language || ''}
        problemCounts={problemCounts}
        onToggleProblems={() => {
          if (showBottomPanel && activeBottomPanel === 'problems') {
            toggleBottomPanel();
          } else {
            setActiveBottomPanel('problems');
          }
        }}
        onToggleTerminal={() => {
          if (showBottomPanel && activeBottomPanel === 'terminal') {
            toggleBottomPanel();
          } else {
            setActiveBottomPanel('terminal');
          }
        }}
      />

      {/* Quick open overlay */}
      <QuickOpen
        files={searchableFiles}
        onSelectFile={handleQuickOpenSelect}
      />
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-surface-600">
      <div className="text-4xl font-bold text-surface-800">AppX</div>
      <div className="text-sm space-y-1 text-center">
        <p>Cmd+P to open a file</p>
        <p>Cmd+Shift+F to search</p>
        <p>Cmd+B to toggle sidebar</p>
      </div>
    </div>
  );
}

function SidebarProblems({
  onNavigateToProblem,
}: {
  onNavigateToProblem: (filePath: string, line: number, column: number) => void;
}) {
  const problems = useEditorStore((s) => s.problems);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-surface-700">
        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          Problems
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {problems.length === 0 ? (
          <div className="px-3 py-4 text-sm text-surface-600 text-center">
            No problems
          </div>
        ) : (
          problems.map((problem, idx) => (
            <button
              key={`${problem.filePath}-${problem.line}-${idx}`}
              onClick={() =>
                onNavigateToProblem(
                  problem.filePath,
                  problem.line,
                  problem.column
                )
              }
              className="w-full flex items-start gap-2 px-3 py-1.5 text-xs hover:bg-surface-800/50 text-left"
            >
              {problem.severity === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-surface-300 truncate">{problem.message}</p>
                <p className="text-surface-600 truncate">
                  {problem.filePath}:{problem.line}:{problem.column}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBar({
  activeFilePath,
  isDirty,
  language,
  problemCounts,
  onToggleProblems,
  onToggleTerminal,
}: {
  activeFilePath: string | null;
  isDirty: boolean;
  language: string;
  problemCounts: { errors: number; warnings: number };
  onToggleProblems: () => void;
  onToggleTerminal: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-0.5 bg-primary-600 text-white text-xs shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleProblems}
          className="flex items-center gap-1 hover:bg-primary-500/50 px-1.5 py-0.5 rounded"
        >
          {problemCounts.errors > 0 && (
            <span className="flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />
              {problemCounts.errors}
            </span>
          )}
          {problemCounts.warnings > 0 && (
            <span className="flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {problemCounts.warnings}
            </span>
          )}
          {problemCounts.errors === 0 && problemCounts.warnings === 0 && (
            <span className="flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />0
              <AlertTriangle className="w-3 h-3" />0
            </span>
          )}
        </button>
        <button
          onClick={onToggleTerminal}
          className="flex items-center gap-1 hover:bg-primary-500/50 px-1.5 py-0.5 rounded"
        >
          <TerminalIcon className="w-3 h-3" />
          Terminal
        </button>
      </div>

      <div className="flex items-center gap-3">
        {activeFilePath && (
          <>
            {isDirty && <span className="text-primary-200">Modified</span>}
            <span>{language.toUpperCase()}</span>
            <span>UTF-8</span>
            <span>Spaces: 2</span>
          </>
        )}
      </div>
    </div>
  );
}
