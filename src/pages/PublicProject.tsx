import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Wand2, Loader2 } from 'lucide-react';
import { publicApi, type PublicProjectData } from '../lib/api';

export default function PublicProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<PublicProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      try {
        const data = await publicApi.getProject(projectId);
        setProject(data);
      } catch {
        setError('Project not found or is no longer public.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-surface-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const currentScreen = project.screens[selectedIndex];

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to="/gallery"
                className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{project.name}</h1>
                <p className="text-xs text-surface-400">{project.screenCount} screens</p>
              </div>
            </div>
            <Link
              to="/project/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors shrink-0"
            >
              <Wand2 className="w-4 h-4" />
              Create Your Own
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Description */}
        {(project.galleryDescription || project.appPurpose) && (
          <p className="text-surface-400 mb-8 max-w-2xl">
            {project.galleryDescription || project.appPurpose}
          </p>
        )}

        {/* Screen viewer */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Screen thumbnails */}
          <div className="lg:w-64 shrink-0">
            <h3 className="text-sm font-medium text-surface-400 mb-3">Screens</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {project.screens.map((screen, i) => (
                <button
                  key={screen.id}
                  onClick={() => setSelectedIndex(i)}
                  className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    i === selectedIndex
                      ? 'border-primary-500 shadow-lg shadow-primary-500/30'
                      : 'border-surface-700 hover:border-surface-600'
                  }`}
                >
                  <img
                    src={screen.thumbnailUrl || screen.imageUrl}
                    alt={screen.name}
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Main preview */}
          <div className="flex-1 flex flex-col items-center">
            {currentScreen && (
              <>
                <p className="text-sm text-surface-400 mb-4">{currentScreen.name}</p>
                <motion.div
                  key={selectedIndex}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-sm aspect-[9/19] rounded-3xl overflow-hidden border border-surface-700 shadow-2xl cursor-pointer"
                  onClick={() => setFullscreenIndex(selectedIndex)}
                >
                  <img
                    src={currentScreen.imageUrl || currentScreen.thumbnailUrl}
                    alt={currentScreen.name}
                    className="w-full h-full object-cover object-top"
                  />
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Made with badge */}
        <div className="mt-16 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-800/50 border border-surface-700/50 text-surface-400 text-sm hover:text-white hover:border-surface-600 transition-colors"
          >
            Made with <span className="font-semibold text-primary-400">AppX</span>
          </Link>
        </div>
      </main>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreenIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setFullscreenIndex(null)}
          >
            <button
              onClick={() => setFullscreenIndex(null)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="h-[95vh] aspect-[9/19] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={project.screens[fullscreenIndex]?.imageUrl || project.screens[fullscreenIndex]?.thumbnailUrl}
                alt={project.screens[fullscreenIndex]?.name}
                className="w-full h-full object-cover object-top"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
