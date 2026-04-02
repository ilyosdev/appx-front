import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";


interface ThinkingBlockProps {
  text: string;
  defaultOpen?: boolean;
}

export function ThinkingBlock({ text, defaultOpen = false }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="ml-9 my-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-surface-400 transition-colors w-full"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <Brain className="w-3 h-3" />
        <span className="font-medium">Thinking...</span>
      </button>
      {isOpen && (
        <div className="mt-1 ml-[1.125rem] pl-2 border-l border-surface-700/50 text-[11px] text-surface-500 leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
