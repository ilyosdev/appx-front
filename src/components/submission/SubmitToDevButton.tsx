import { useState } from 'react';
import { Send } from 'lucide-react';
import { SubmitToDevModal } from './SubmitToDevModal';

interface SubmitToDevButtonProps {
  projectId: string;
  projectName: string;
}

export function SubmitToDevButton({ projectId, projectName }: SubmitToDevButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-400 hover:text-white hover:bg-surface-800 hover:border-surface-600 transition-colors"
      >
        <Send className="w-4 h-4" />
        <span className="text-sm">Submit to Dev</span>
      </button>

      <SubmitToDevModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </>
  );
}
