import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, History, RotateCcw, Loader2 } from 'lucide-react';
import { projectsApi, type ScreenVersion } from '@/lib/projects';

interface VersionHistoryModalProps {
  projectId: string;
  screenId: string;
  screenName: string;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionHistoryModal({
  projectId,
  screenId,
  screenName,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<ScreenVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [projectId, screenId]);

  const loadVersions = async () => {
    try {
      const response = await projectsApi.getScreenVersions(projectId, screenId);
      setVersions(response.data.data.versions);
      setCurrentVersion(response.data.data.currentVersion);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      await projectsApi.restoreScreenVersion(projectId, screenId, versionId);
      onRestore();
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-surface-900 rounded-2xl border border-surface-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-800">
              <History className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Version History</h2>
              <p className="text-sm text-surface-400">{screenName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No previous versions available</p>
              <p className="text-sm mt-1">Versions are saved when you edit a screen</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-primary-400">Current Version</span>
                    <span className="ml-2 text-xs text-surface-400">v{currentVersion}</span>
                  </div>
                </div>
              </div>
              
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="px-3 py-3 rounded-lg bg-surface-800 border border-surface-700 hover:border-surface-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-white">Version {version.version}</span>
                      <p className="text-xs text-surface-400 mt-0.5">{formatDate(version.createdAt)}</p>
                      {version.aiPrompt && (
                        <p className="text-xs text-surface-500 mt-1 truncate max-w-[250px]">
                          "{version.aiPrompt}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {restoring === version.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
