import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { changeLanguage, LANGUAGES } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
        title="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium uppercase">{i18n.language}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-36 py-1 rounded-xl bg-surface-900 border border-white/[0.1] shadow-xl shadow-black/40 backdrop-blur-xl z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                i18n.language === lang.code
                  ? 'text-white bg-white/[0.06]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
