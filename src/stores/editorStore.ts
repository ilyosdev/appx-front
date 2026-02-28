import { create } from 'zustand';

export interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
}

export interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  lineContent: string;
  matchLength: number;
}

export interface SearchResultGroup {
  filePath: string;
  matches: SearchResult[];
}

export interface Problem {
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

export interface TerminalLine {
  id: string;
  text: string;
  type: 'stdout' | 'stderr' | 'info' | 'success';
  timestamp: number;
}

export type ActivityPanel = 'explorer' | 'search' | 'git' | 'problems';
export type BottomPanel = 'terminal' | 'problems' | 'output';
export type EditorTheme = 'appx-dark' | 'vs-dark' | 'vs-light';

interface EditorState {
  // Open files
  openFiles: Map<string, OpenFile>;
  activeFilePath: string | null;
  tabOrder: string[];

  // Panels
  activeActivityPanel: ActivityPanel;
  showSidebar: boolean;
  showBottomPanel: boolean;
  activeBottomPanel: BottomPanel;
  bottomPanelHeight: number;
  sidebarWidth: number;

  // Search
  searchQuery: string;
  searchRegex: boolean;
  searchCaseSensitive: boolean;
  searchResults: SearchResultGroup[];
  replaceQuery: string;

  // Terminal
  terminalLines: TerminalLine[];

  // Problems
  problems: Problem[];

  // Settings
  fontSize: number;
  theme: EditorTheme;
  showMinimap: boolean;
  wordWrap: boolean;

  // Quick open
  showQuickOpen: boolean;

  // Actions
  openFile: (path: string, content: string, language: string) => void;
  closeFile: (path: string) => void;
  closeOtherFiles: (path: string) => void;
  closeAllFiles: () => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string, newContent?: string) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;

  setActiveActivityPanel: (panel: ActivityPanel) => void;
  toggleSidebar: () => void;
  toggleBottomPanel: () => void;
  setActiveBottomPanel: (panel: BottomPanel) => void;
  setBottomPanelHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;

  setSearchQuery: (query: string) => void;
  setSearchRegex: (enabled: boolean) => void;
  setSearchCaseSensitive: (enabled: boolean) => void;
  setSearchResults: (results: SearchResultGroup[]) => void;
  setReplaceQuery: (query: string) => void;

  addTerminalLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void;
  clearTerminal: () => void;

  setProblems: (problems: Problem[]) => void;

  setFontSize: (size: number) => void;
  setTheme: (theme: EditorTheme) => void;
  setShowMinimap: (show: boolean) => void;
  setWordWrap: (wrap: boolean) => void;

  setShowQuickOpen: (show: boolean) => void;
}

let lineIdCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: new Map(),
  activeFilePath: null,
  tabOrder: [],

  activeActivityPanel: 'explorer',
  showSidebar: true,
  showBottomPanel: false,
  activeBottomPanel: 'terminal',
  bottomPanelHeight: 200,
  sidebarWidth: 260,

  searchQuery: '',
  searchRegex: false,
  searchCaseSensitive: false,
  searchResults: [],
  replaceQuery: '',

  terminalLines: [],
  problems: [],

  fontSize: 14,
  theme: 'appx-dark',
  showMinimap: false,
  wordWrap: true,

  showQuickOpen: false,

  openFile: (path, content, language) => {
    const state = get();
    const newFiles = new Map(state.openFiles);
    if (!newFiles.has(path)) {
      newFiles.set(path, {
        path,
        content,
        originalContent: content,
        isDirty: false,
        language,
      });
    }
    const newOrder = state.tabOrder.includes(path)
      ? state.tabOrder
      : [...state.tabOrder, path];
    set({
      openFiles: newFiles,
      activeFilePath: path,
      tabOrder: newOrder,
    });
  },

  closeFile: (path) => {
    const state = get();
    const newFiles = new Map(state.openFiles);
    newFiles.delete(path);
    const newOrder = state.tabOrder.filter((p) => p !== path);
    let newActive = state.activeFilePath;
    if (state.activeFilePath === path) {
      const oldIdx = state.tabOrder.indexOf(path);
      newActive = newOrder[Math.min(oldIdx, newOrder.length - 1)] || null;
    }
    set({
      openFiles: newFiles,
      activeFilePath: newActive,
      tabOrder: newOrder,
    });
  },

  closeOtherFiles: (path) => {
    const state = get();
    const file = state.openFiles.get(path);
    const newFiles = new Map<string, OpenFile>();
    if (file) {
      newFiles.set(path, file);
    }
    set({
      openFiles: newFiles,
      activeFilePath: path,
      tabOrder: file ? [path] : [],
    });
  },

  closeAllFiles: () => {
    set({
      openFiles: new Map(),
      activeFilePath: null,
      tabOrder: [],
    });
  },

  setActiveFile: (path) => {
    set({ activeFilePath: path });
  },

  updateFileContent: (path, content) => {
    const state = get();
    const file = state.openFiles.get(path);
    if (!file) return;
    const newFiles = new Map(state.openFiles);
    newFiles.set(path, {
      ...file,
      content,
      isDirty: content !== file.originalContent,
    });
    set({ openFiles: newFiles });
  },

  markFileSaved: (path, newContent) => {
    const state = get();
    const file = state.openFiles.get(path);
    if (!file) return;
    const savedContent = newContent ?? file.content;
    const newFiles = new Map(state.openFiles);
    newFiles.set(path, {
      ...file,
      content: savedContent,
      originalContent: savedContent,
      isDirty: false,
    });
    set({ openFiles: newFiles });
  },

  reorderTab: (fromIndex, toIndex) => {
    const state = get();
    const newOrder = [...state.tabOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    set({ tabOrder: newOrder });
  },

  setActiveActivityPanel: (panel) => {
    const state = get();
    if (state.activeActivityPanel === panel && state.showSidebar) {
      set({ showSidebar: false });
    } else {
      set({ activeActivityPanel: panel, showSidebar: true });
    }
  },

  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  toggleBottomPanel: () => set((s) => ({ showBottomPanel: !s.showBottomPanel })),
  setActiveBottomPanel: (panel) =>
    set({ activeBottomPanel: panel, showBottomPanel: true }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchRegex: (enabled) => set({ searchRegex: enabled }),
  setSearchCaseSensitive: (enabled) => set({ searchCaseSensitive: enabled }),
  setSearchResults: (results) => set({ searchResults: results }),
  setReplaceQuery: (query) => set({ replaceQuery: query }),

  addTerminalLine: (line) => {
    set((state) => ({
      terminalLines: [
        ...state.terminalLines,
        { ...line, id: `line-${++lineIdCounter}`, timestamp: Date.now() },
      ],
    }));
  },
  clearTerminal: () => set({ terminalLines: [] }),

  setProblems: (problems) => set({ problems }),

  setFontSize: (size) => set({ fontSize: size }),
  setTheme: (theme) => set({ theme }),
  setShowMinimap: (show) => set({ showMinimap: show }),
  setWordWrap: (wrap) => set({ wordWrap: wrap }),

  setShowQuickOpen: (show) => set({ showQuickOpen: show }),
}));
