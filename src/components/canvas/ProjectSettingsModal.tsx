import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { projectsApi } from '@/lib/projects';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  screensCount: number;
  createdAt: string;
  onProjectUpdate?: (updates: { name: string }) => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  screensCount,
  createdAt,
  onProjectUpdate,
}: ProjectSettingsModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(projectName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveName = async () => {
    if (name.trim() === projectName || !name.trim()) return;
    setIsSaving(true);
    try {
      await projectsApi.update(projectId, { name: name.trim() });
      onProjectUpdate?.({ name: name.trim() });
    } catch (error) {
      console.error('Failed to update project name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Project Settings" size="md">
        <div className="space-y-6">
          {/* Rename */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Project Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleSaveName}
                disabled={isSaving || name.trim() === projectName || !name.trim()}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>

          {/* Info */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Project Info</label>
            <div className="space-y-2 text-sm text-surface-400">
              <div className="flex justify-between">
                <span>Created</span>
                <span className="text-surface-300">{new Date(createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Screens</span>
                <span className="text-surface-300">{screensCount}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-surface-800">
            <h3 className="text-sm font-medium text-red-400 mb-3">Danger Zone</h3>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              Delete Project
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? All screens and data will be permanently lost. This action cannot be undone."
        confirmLabel="Delete Project"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
