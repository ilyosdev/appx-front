import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';

/**
 * Mobile preview landing page (Rork-style).
 * QR code encodes this URL. On mobile, shows "Open in Expo Go" button.
 * On desktop, redirects to the canvas page.
 */
export default function PreviewLanding() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<{ name: string; appIconUrl?: string } | null>(null);
  const [expoUrl, setExpoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (!projectId) return;

    // Use the API base from the current page's origin (works on LAN too)
    const apiBase = (window as any).__API_BASE ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`);

    fetch(`${apiBase}/api/v1/projects/${projectId}/preview-info`)
      .then(r => r.json())
      .then(res => {
        const d = res.data || res;
        if (d.name) setProject({ name: d.name, appIconUrl: d.appIconUrl });
        if (d.expoUrl) {
          // Expo Go deep link: exps://hostname for HTTPS containers
          const url = d.expoUrl
            .replace('https://', 'exps://')
            .replace('http://', 'exp://');
          setExpoUrl(url);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Desktop: redirect to canvas
  useEffect(() => {
    if (!isMobile && !loading && projectId) {
      window.location.href = `/project/${projectId}/canvas`;
    }
  }, [isMobile, loading, projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const storeUrl = isIOS
    ? 'https://apps.apple.com/app/expo-go/id982107779'
    : 'https://play.google.com/store/apps/details?id=host.exp.exponent';

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>

      {/* App icon */}
      <div className="w-20 h-20 bg-white rounded-[22px] shadow-lg mb-6 flex items-center justify-center overflow-hidden">
        {project?.appIconUrl ? (
          <img src={project.appIconUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        {project?.name || 'Your app preview'}
      </h1>
      <p className="text-[15px] text-gray-400 mb-8 max-w-[280px] leading-relaxed">
        This is a mini app made in AppX, you need Expo Go to preview it.
      </p>

      {/* Install button */}
      <a
        href={storeUrl}
        className="block w-full max-w-[300px] bg-white text-[#0a0a0f] py-4 rounded-xl font-semibold text-base no-underline mb-3"
      >
        Install Expo Go
      </a>

      {/* Open in Expo Go — always show, uses expoUrl or fallback */}
      <a
        href={expoUrl || '#'}
        onClick={!expoUrl ? (e) => { e.preventDefault(); alert('Container is starting... try again in a few seconds.'); } : undefined}
        className="block w-full max-w-[300px] bg-[#1e1e2e] text-white py-4 rounded-xl font-semibold text-base no-underline border border-[#2e2e3e]"
      >
        Open in Expo Go
      </a>

      {/* Branding */}
      <p className="text-gray-600 text-xs mt-10">
        Made with <span className="text-blue-500">AppX</span>
      </p>
    </div>
  );
}
