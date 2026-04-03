import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { changeLanguage, LANGUAGES } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className, variant = 'dark' }: { className?: string; variant?: 'dark' | 'light' }) {
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
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all',
          variant === 'dark'
            ? 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            : 'text-[#1a1615]/60 hover:text-[#1a1615] hover:bg-black/[0.04]'
        )}
        title="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium uppercase">{i18n.language}</span>
      </button>

      {open && (
        <div className={cn(
          'absolute top-full right-0 mt-2 w-36 py-1 rounded-xl z-50',
          variant === 'dark'
            ? 'bg-surface-900 border border-white/[0.1] shadow-xl shadow-black/40 backdrop-blur-xl'
            : 'bg-white border border-gray-200 shadow-xl shadow-black/[0.08]'
        )}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { changeLanguage(lang.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                i18n.language === lang.code
                  ? variant === 'dark' ? 'text-white bg-white/[0.06]' : 'text-[#1a1615] bg-black/[0.04]'
                  : variant === 'dark' ? 'text-white/50 hover:text-white hover:bg-white/[0.04]' : 'text-[#555] hover:text-[#1a1615] hover:bg-black/[0.03]'
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
