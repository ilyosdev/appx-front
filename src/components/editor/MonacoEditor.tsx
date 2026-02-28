import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type OnChange, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from '@/stores/editorStore';
import { configureMonacoLanguages, defineAppxTheme } from '@/lib/editor/languages';

interface MonacoEditorProps {
  filePath: string;
  value: string;
  language: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

let monacoConfigured = false;

export function MonacoEditor({
  filePath,
  value,
  language,
  onChange,
  onSave,
  readOnly = false,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const fontSize = useEditorStore((s) => s.fontSize);
  const showMinimap = useEditorStore((s) => s.showMinimap);
  const wordWrap = useEditorStore((s) => s.wordWrap);
  const theme = useEditorStore((s) => s.theme);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      if (!monacoConfigured) {
        configureMonacoLanguages(monaco);
        defineAppxTheme(monaco);
        monacoConfigured = true;
      }

      monaco.editor.setTheme(theme);

      // Cmd+S / Ctrl+S to save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        editor.getAction('editor.action.formatDocument')?.run().then(() => {
          onSave?.();
        });
      });

      // Cmd+P for quick open
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
        useEditorStore.getState().setShowQuickOpen(true);
      });

      // Cmd+Shift+F for global search
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => {
          const store = useEditorStore.getState();
          store.setActiveActivityPanel('search');
        }
      );

      // Cmd+B for toggle sidebar
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        useEditorStore.getState().toggleSidebar();
      });

      // Ctrl+` for toggle terminal
      editor.addCommand(
        monaco.KeyMod.WinCtrl | monaco.KeyCode.Backquote,
        () => {
          useEditorStore.getState().toggleBottomPanel();
        }
      );

      // Cmd+W to close current tab
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
        const activeFile = useEditorStore.getState().activeFilePath;
        if (activeFile) {
          useEditorStore.getState().closeFile(activeFile);
        }
      });

      editor.focus();
    },
    [onSave, theme]
  );

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme]);

  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Map language name to Monaco language id
  const monacoLanguage =
    language === 'tsx' || language === 'typescript'
      ? 'typescript'
      : language === 'jsx' || language === 'javascript'
      ? 'javascript'
      : language;

  return (
    <div className="h-full w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1 bg-surface-900/30 border-b border-surface-800 text-xs text-surface-500 overflow-x-auto scrollbar-none">
        {filePath.split('/').map((segment, i, arr) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span className="text-surface-600">/</span>}
            <span className={i === arr.length - 1 ? 'text-surface-300' : ''}>
              {segment}
            </span>
          </span>
        ))}
      </div>

      <Editor
        height="calc(100% - 28px)"
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme={theme === 'appx-dark' ? 'appx-dark' : theme}
        path={filePath}
        options={{
          readOnly,
          minimap: { enabled: showMinimap },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          fontSize,
          fontFamily:
            "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
          fontLigatures: true,
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: wordWrap ? 'on' : 'off',
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          suggest: { showKeywords: true, showSnippets: true },
          quickSuggestions: { other: true, comments: false, strings: true },
          formatOnPaste: true,
          formatOnType: true,
          stickyScroll: { enabled: true },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-surface-950 text-surface-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
