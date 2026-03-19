import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { publicApi, type PublicProjectData } from '../lib/api';
import { rewriteStorageUrl } from '../lib/api';

export default function PublishedAppPage() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<PublicProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchProject = async () => {
      try {
        const data = await publicApi.getProjectBySlug(slug);
        setProject(data);
      } catch {
        setError('App not found.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

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
          <h1 className="text-6xl font-bold text-surface-700 mb-4">404</h1>
          <h2 className="text-xl font-semibold text-white mb-2">App Not Found</h2>
          <p className="text-surface-400 mb-8 max-w-md">
            {error || 'This app does not exist or is no longer published.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Gallery
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-400 transition-colors text-sm font-medium"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const appUrl = window.location.href;
  const iconSrc = rewriteStorageUrl((project as any).appIconUrl || project.coverImageUrl);

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/"
              className="flex items-center gap-2 text-white font-bold text-lg"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              AppX
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-400 transition-colors"
            >
              Build yours
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* App identity */}
        <div className="flex flex-col sm:flex-row items-start gap-5 mb-10">
          {/* App Icon */}
          <div className="w-24 h-24 rounded-[1.25rem] bg-surface-800 border border-surface-700 flex items-center justify-center overflow-hidden shrink-0">
            {iconSrc ? (
              <img
                src={iconSrc}
                alt={project.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-surface-500 text-3xl font-bold">
                {project.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {project.name}
            </h1>
            <p className="text-surface-400 text-sm mb-3">
              {project.screenCount} screen{project.screenCount !== 1 ? 's' : ''}
            </p>
            {(project.galleryDescription || project.appPurpose) && (
              <p className="text-surface-400 leading-relaxed max-w-xl">
                {project.galleryDescription || project.appPurpose}
              </p>
            )}
          </div>
        </div>

        {/* QR Code + Actions */}
        <div className="flex flex-col sm:flex-row gap-6 mb-12">
          {/* QR code */}
          <div className="flex-shrink-0">
            <div className="w-52 h-52 rounded-2xl bg-white p-3 flex items-center justify-center">
              <QRCodeSVG
                value={appUrl}
                size={184}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-surface-500 text-center mt-2">
              Scan to view on mobile
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 justify-center">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-surface-800 border border-surface-700 text-white hover:bg-surface-700 transition-colors text-sm font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-surface-400" />
                  Copy Link
                </>
              )}
            </button>
            <Link
              to={`/p/${project.id}`}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-surface-800 border border-surface-700 text-white hover:bg-surface-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4 text-surface-400" />
              View Full Project
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Remix in AppX
            </Link>
          </div>
        </div>

        {/* Screen previews */}
        {project.screens.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Screens</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-surface-700 scrollbar-track-transparent">
              {project.screens.map((screen) => (
                <div
                  key={screen.id}
                  className="flex-shrink-0 w-48 snap-start"
                >
                  <div className="aspect-[9/16] rounded-xl overflow-hidden border border-surface-700 bg-surface-800">
                    <img
                      src={screen.thumbnailUrl || screen.imageUrl}
                      alt={screen.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <p className="mt-2 text-sm text-surface-400 truncate">{screen.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800/50 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-surface-500 hover:text-surface-300 transition-colors text-sm"
          >
            Made with <span className="font-semibold text-primary-400">AppX</span>
            <span className="mx-1">·</span>
            appx.uz
          </Link>
        </div>
      </footer>
    </div>
  );
}
