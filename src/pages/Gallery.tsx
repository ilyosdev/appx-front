import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Loader2, Sparkles } from 'lucide-react';
import { galleryApi, rewriteStorageUrl, type GalleryProject } from '../lib/api';

export default function Gallery() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null);
  const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await galleryApi.getProjects(50);
        setProjects(response.projects);
      } catch (error) {
        console.log('Could not load gallery');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const openProject = (project: GalleryProject) => {
    setSelectedProject(project);
    setSelectedScreenIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030014]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-blue-200/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link 
            to="/login" 
            className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Start Creating
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-blue-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-[#06b6d4]" />
              <span className="text-xs font-medium text-blue-100/90">Community Gallery</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-semibold tracking-tight mb-6"
            >
              AI-Generated <span className="text-blue-500">Apps</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-blue-200/60 max-w-2xl mx-auto"
            >
              Explore mobile apps created by our community using AppX
            </motion.p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-blue-200/40 text-lg">No projects in gallery yet</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * Math.min(i, 10) }}
                  whileHover={{ y: -8 }}
                  onClick={() => openProject(project)}
                  className="group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 p-4 hover:border-blue-500/30 hover:bg-white/[0.05] transition-all duration-300">
                    <div className="aspect-square rounded-2xl overflow-hidden mb-5 bg-black/20 relative">
                      {project.coverImageUrl ? (
                        <img
                          src={rewriteStorageUrl(project.coverImageUrl)}
                          alt={project.name}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-blue-900/30', 'to-black/40'); }}
                        />
                      ) : project.screens.length > 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                          <div className="relative w-full h-full">
                            {project.screens.slice(0, 3).map((screen, idx) => (
                              <div
                                key={screen.id}
                                className="absolute rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/30"
                                style={{
                                  width: '65%',
                                  height: '80%',
                                  left: `${12 + idx * 10}%`,
                                  top: `${8 + idx * 5}%`,
                                  zIndex: 3 - idx,
                                  transform: `rotate(${(idx - 1) * 4}deg)`,
                                }}
                              >
                                <img
                                  src={rewriteStorageUrl(screen.thumbnailUrl || screen.imageUrl)}
                                  alt={screen.name}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-black/40" />
                      )}
                    </div>
                    <div className="text-center px-2">
                      <h3 className="text-white font-semibold text-base group-hover:text-[#06b6d4] transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-blue-200/50 text-sm mt-1">
                        {project.screenCount} screen{project.screenCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col"
            onClick={() => setSelectedProject(null)}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg md:text-xl font-semibold text-white truncate">{selectedProject.name}</h2>
                <p className="text-blue-200/60 text-sm mt-0.5">
                  {selectedProject.screenCount} screen{selectedProject.screenCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedProject(null); }}
                className="ml-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </div>

            <div 
              className="flex-1 flex flex-col lg:flex-row overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 p-4 md:p-6 overflow-y-auto">
                {selectedProject.coverImageUrl && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-blue-200/60 mb-3">Cover</h3>
                    <div className="aspect-[3/2] rounded-xl overflow-hidden border border-white/10 bg-black/30">
                      <img
                        src={selectedProject.coverImageUrl}
                        alt={`${selectedProject.name} cover`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {selectedProject.galleryDescription && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-blue-200/60 mb-2">Description</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {selectedProject.galleryDescription}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-blue-200/60 mb-3">
                    Screens ({selectedProject.screens.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                    {selectedProject.screens.map((screen, i) => (
                      <button
                        key={screen.id}
                        onClick={() => setSelectedScreenIndex(i)}
                        className={`aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          i === selectedScreenIndex
                            ? 'border-blue-500 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img
                          src={rewriteStorageUrl(screen.thumbnailUrl || screen.imageUrl)}
                          alt={screen.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-black/30 min-h-0">
                {selectedProject.screens.length > 0 && (
                  <motion.div
                    key={selectedScreenIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="h-full max-h-[70vh] lg:max-h-[80vh] aspect-[9/19] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
                  >
                    <img
                      src={rewriteStorageUrl(selectedProject.screens[selectedScreenIndex]?.imageUrl || selectedProject.screens[selectedScreenIndex]?.thumbnailUrl)}
                      alt={selectedProject.screens[selectedScreenIndex]?.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
