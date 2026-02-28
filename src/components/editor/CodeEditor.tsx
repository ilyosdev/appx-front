import { useRef, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export interface CodeEditorProps {
  /** The code content to display/edit */
  value: string;
  /** Callback when the code changes */
  onChange: (value: string) => void;
  /** Programming language for syntax highlighting */
  language: 'typescript' | 'javascript' | 'json' | 'css' | 'html' | 'tsx' | 'jsx';
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Height of the editor */
  height?: string | number;
  /** Whether to show the minimap */
  showMinimap?: boolean;
  /** Optional className for the container */
  className?: string;
}

/**
 * Monaco Editor component for code editing with dark theme,
 * TypeScript/TSX support, and auto-format on save.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '400px',
  showMinimap = true,
  className = '',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Configure TypeScript/JavaScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
    });

    // Enable validation for TypeScript
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Add keyboard shortcut for format on save (Ctrl/Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Focus the editor
    editor.focus();
  }, []);

  const handleEditorChange: OnChange = useCallback(
    (newValue) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  // Map language to Monaco language ID
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      typescript: 'typescript',
      javascript: 'javascript',
      tsx: 'typescript',
      jsx: 'javascript',
      json: 'json',
      css: 'css',
      html: 'html',
    };
    return languageMap[lang] || lang;
  };

  return (
    <div className={`h-full rounded-lg overflow-hidden border border-gray-700 ${className}`}>
      <Editor
        height={height}
        language={getMonacoLanguage(language)}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: {
            enabled: showMinimap,
          },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
          fontLigatures: true,
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          wordWrap: 'on',
          padding: {
            top: 12,
            bottom: 12,
          },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          formatOnPaste: true,
          formatOnType: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}

export default CodeEditor;
