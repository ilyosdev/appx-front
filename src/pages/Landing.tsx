import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { AppComposer } from '../components/composer/AppComposer';
import { ArrowRight, Check, Menu, X, Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { cn } from '../lib/utils';
import { MeshGradient } from '@paper-design/shaders-react';

// ─── FONT ──────────────────────────────────────────────
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap';

// ─── ANIMATION ─────────────────────────────────────────
const reveal = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};
void reveal; // suppress unused warning

function Reveal({ children, className, id, delay = 0 }: { children: React.ReactNode; className?: string; id?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


// ─── NAV ───────────────────────────────────────────────
function Nav({ ctaPath: _ctaPath, isAuthenticated }: { ctaPath: string; isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-500',
      scrolled ? 'bg-black/80 backdrop-blur-2xl' : 'bg-transparent'
    )}>
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl backdrop-blur-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center p-1.5">
            <img src="/logo.png" alt="AppX" className="w-full h-full invert" />
          </div>
          <span className="font-sans font-semibold text-[15px] text-white tracking-tight">AppX</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: t('nav.features'), href: '#features' },
            { label: t('nav.howItWorks'), href: '#how-it-works' },
            { label: t('nav.pricing'), href: '#pricing' },
            { label: 'Docs', href: 'https://docs.appx.uz/intro', target: '_blank' },
          ].map((l) => (
            <a key={l.href} href={l.href}
              {...('target' in l ? { target: l.target, rel: 'noopener noreferrer' } : {})}
              className="text-[13px] text-white/50 hover:text-white transition-colors duration-300">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Link to="/dashboard" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">
              {t('nav.dashboard')} →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[13px] text-white/50 hover:text-white transition-colors">
                {t('nav.signIn')}
              </Link>
              <Link to="/register"
                className="text-[13px] font-medium text-black bg-white hover:bg-white/90 rounded-full px-5 py-2 transition-all">
                {t('nav.startBuilding')}
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-white/50">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-black/90 backdrop-blur-2xl border-t border-white/[0.08] px-6 pb-6 pt-4"
        >
          {[
            { label: t('nav.features'), href: '#features' },
            { label: t('nav.howItWorks'), href: '#how-it-works' },
            { label: t('nav.pricing'), href: '#pricing' },
            { label: 'Docs', href: 'https://docs.appx.uz/intro', target: '_blank' },
          ].map((l) => (
            <a key={l.href} href={l.href}
              {...('target' in l ? { target: l.target, rel: 'noopener noreferrer' } : {})}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/50 hover:text-white py-2.5">{l.label}</a>
          ))}
          <div className="border-t border-white/[0.08] pt-4 mt-3 space-y-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link to="/dashboard" className="block text-sm font-medium text-black text-center bg-white rounded-full py-2.5">{t('nav.dashboard')}</Link>
            ) : (
              <>
                <Link to="/login" className="block text-sm text-white/50 hover:text-white py-1">{t('nav.signIn')}</Link>
                <Link to="/register" className="block text-sm font-medium text-black bg-white rounded-full py-2.5 text-center">{t('nav.startBuilding')}</Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── HERO PHONE MOCKUP ─────────────────────────────────
function HeroPhone() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <motion.div ref={ref} style={{ y }} className="relative mx-auto w-[280px] sm:w-[300px]">
      {/* Phone frame */}
      <div className="relative bg-[#0a0a0a] rounded-[44px] border-[3px] border-white/[0.12] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]">
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[28px] bg-black rounded-full z-20" />
        {/* Screen */}
        <div className="pt-14 pb-6 px-4 min-h-[520px] bg-[#0f172a]">
          {/* Header */}
          <div className="mb-6">
            <div className="h-[6px] rounded-full bg-white/20 w-1/3 mb-3" />
            <div className="h-[4px] rounded-full bg-white/10 w-2/3" />
          </div>
          {/* Hero card */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 mb-4">
            <div className="h-[5px] rounded-full bg-white/15 w-3/4 mb-3" />
            <div className="flex gap-2 mb-3">
              <div className="h-14 flex-1 rounded-xl bg-white/[0.06]" />
              <div className="h-14 flex-1 rounded-xl bg-white/[0.04]" />
            </div>
            <div className="h-[4px] rounded-full bg-white/[0.08] w-1/2" />
          </div>
          {/* List */}
          <div className="space-y-3">
            {[0.7, 0.5, 0.6, 0.4].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-[4px] rounded-full bg-white/[0.12] mb-1.5" style={{ width: `${w * 100}%` }} />
                  <div className="h-[3px] rounded-full bg-white/[0.06] w-4/5" />
                </div>
              </div>
            ))}
          </div>
          {/* Tab bar */}
          <div className="flex justify-around mt-8 pt-4 border-t border-white/[0.04]">
            {[true, false, false, false, false].map((active, i) => (
              <div key={i} className={cn('w-5 h-5 rounded-lg', active ? 'bg-white/20' : 'bg-white/[0.05]')} />
            ))}
          </div>
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-28 h-1 rounded-full bg-white/15" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── FEATURE ROW ───────────────────────────────────────
function FeatureRow({ num, title, desc, delay = 0 }: { num: string; title: string; desc: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="group">
      <div className="flex items-start gap-6 sm:gap-10 py-8 border-b border-white/[0.08] group-hover:border-white/[0.15] transition-colors duration-500">
        <span className="font-serif text-[32px] sm:text-[40px] text-white/25 leading-none flex-shrink-0 w-12 sm:w-16">{num}</span>
        <div>
          <h3 className="font-serif text-xl sm:text-2xl text-white mb-2">{title}</h3>
          <p className="text-[15px] text-white/50 leading-relaxed max-w-lg">{desc}</p>
        </div>
      </div>
    </Reveal>
  );
}

// ─── STEP ──────────────────────────────────────────────
function Step({ num, word, desc, delay = 0 }: { num: string; word: string; desc: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-white/[0.12] bg-white/[0.04] mb-6">
        <span className="font-sans text-xs font-semibold text-white/40">{num}</span>
      </div>
      <h3 className="font-serif text-3xl sm:text-4xl text-white mb-3">{word}</h3>
      <p className="text-[15px] text-white/50 leading-relaxed max-w-[260px] mx-auto">{desc}</p>
    </Reveal>
  );
}

// ─── LANDING PAGE ──────────────────────────────────────
export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const ctaPath = isAuthenticated ? '/dashboard' : '/register';

  const PLANS = [
    {
      name: t('pricing.free.name'), price: '$0', period: '',
      credits: `10 ${t('pricing.creditsPerMonth')}`,
      features: [
        t('pricing.features.projects', { count: 1 }),
        t('pricing.features.containers', { count: 1 }),
        t('pricing.features.dailyGenerations', { count: 5 }),
        t('pricing.features.webPreview'),
        t('pricing.features.communitySupport'),
      ],
      cta: t('pricing.free.cta'), highlight: false,
    },
    {
      name: t('pricing.pro.name'), price: '$20', period: '/mo',
      credits: `100 ${t('pricing.creditsPerMonth')}`,
      features: [
        t('pricing.features.projects', { count: 3 }),
        t('pricing.features.containers', { count: 3 }),
        t('pricing.features.unlimitedGenerations'),
        t('pricing.features.devicePreview'),
        t('pricing.features.customDomain'),
        t('pricing.features.codeExport'),
        t('pricing.features.prioritySupport'),
      ],
      cta: t('pricing.pro.cta'), highlight: true,
    },
    {
      name: t('pricing.business.name'), price: '$100', period: '/mo',
      credits: `500 ${t('pricing.creditsPerMonth')}`,
      features: [
        t('pricing.features.projects', { count: 10 }),
        t('pricing.features.containers', { count: 10 }),
        t('pricing.features.unlimitedEverything'),
        t('pricing.features.customDomain'),
        t('pricing.features.githubIntegration'),
        t('pricing.features.alwaysOnContainers'),
        t('pricing.features.dedicatedSupport'),
      ],
      cta: t('pricing.business.cta'), highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white antialiased overflow-x-hidden selection:bg-blue-500/30">
      <style>{`
        @import url('${FONT_LINK}');
        .font-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .font-sans { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
      `}</style>

      {/* Mesh gradient background — full page */}
      <div className="fixed inset-0 z-0">
        <MeshGradient
          className="w-full h-full"
          colors={["#000000", "#0a0a0a", "#1a1a1a", "#2a2a2a"]}
          speed={0.8}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* All content above the canvas */}
      <div className="relative z-10">
        <Nav ctaPath={ctaPath} isAuthenticated={isAuthenticated} />

        {/* ═══════════════════════════════════════════════════
            HERO — One bold statement. Nothing else.
            ═══════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-[13px] text-white/40 uppercase tracking-[0.3em] font-sans font-medium mb-8"
            >
              {t('hero.badge')}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-serif text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-white"
            >
              {t('hero.titleLine1')}
              <br />
              <span className="text-white/60">{t('hero.titleLine2')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="font-sans text-lg sm:text-xl text-white/50 mt-8 mb-12 max-w-xl mx-auto leading-relaxed"
            >
              {t('hero.subtitle1')}
              <br className="hidden sm:block" />
              {t('hero.subtitle2')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="max-w-2xl mx-auto"
            >
              <AppComposer />
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 z-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-[1px] h-8 bg-white/20 mx-auto"
            />
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════
            PRODUCT — The phone speaks for itself.
            ═══════════════════════════════════════════════════ */}
        <section className="py-32 sm:py-40 px-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
              <div>
                <Reveal>
                  <p className="text-[11px] text-white/40 uppercase tracking-[0.25em] font-sans font-medium mb-6">{t('product.label')}</p>
                </Reveal>
                <Reveal delay={0.1}>
                  <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] mb-6 text-white">
                    {t('product.titleLine1')}
                    <br />
                    <span className="text-white/60">{t('product.titleLine2')}</span>
                  </h2>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className="font-sans text-[15px] text-white/50 leading-relaxed max-w-md">
                    {t('product.description')}
                  </p>
                </Reveal>
              </div>

              <Reveal delay={0.3}>
                <HeroPhone />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            FEATURES — Numbered, editorial. One per row.
            ═══════════════════════════════════════════════════ */}
        <section id="features" className="py-24 sm:py-32 px-6">
          <div className="max-w-[800px] mx-auto">
            <div className="backdrop-blur-md bg-white/[0.05] border border-white/[0.12] rounded-2xl px-8 sm:px-12 py-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
              <Reveal>
                <h2 className="font-serif text-4xl sm:text-5xl text-center mb-16 leading-[1.05] text-white">
                  {t('features.title1')}
                  <br />
                  <span className="text-white/60">{t('features.title2')}</span>
                </h2>
              </Reveal>

              <FeatureRow num="01" title={t('features.items.multiScreen.title')}
                desc={t('features.items.multiScreen.desc')}
                delay={0} />
              <FeatureRow num="02" title={t('features.items.livePreview.title')}
                desc={t('features.items.livePreview.desc')}
                delay={0.05} />
              <FeatureRow num="03" title={t('features.items.chatDriven.title')}
                desc={t('features.items.chatDriven.desc')}
                delay={0.1} />
              <FeatureRow num="04" title={t('features.items.publish.title')}
                desc={t('features.items.publish.desc')}
                delay={0.15} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            HOW IT WORKS — Three words. That's all you need.
            ═══════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-32 sm:py-40 px-6">
          <div className="max-w-[900px] mx-auto">
            <Reveal>
              <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-sans text-center mb-16">{t('howItWorks.label')}</p>
            </Reveal>

            <div className="backdrop-blur-md bg-white/[0.05] border border-white/[0.12] rounded-2xl px-8 py-14 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
              <div className="grid md:grid-cols-3 gap-16 md:gap-8">
                <Step num="01" word={t('howItWorks.describe.word')} desc={t('howItWorks.describe.desc')} delay={0} />
                <Step num="02" word={t('howItWorks.generate.word')} desc={t('howItWorks.generate.desc')} delay={0.15} />
                <Step num="03" word={t('howItWorks.ship.word')} desc={t('howItWorks.ship.desc')} delay={0.3} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            STATEMENT — A single powerful line.
            ═══════════════════════════════════════════════════ */}
        <section className="py-32 sm:py-40 px-6">
          <Reveal className="max-w-[900px] mx-auto text-center">
            <h2 className="font-serif text-[clamp(2rem,6vw,5rem)] leading-[1] tracking-[-0.02em] text-white">
              <span className="text-white/60">{t('statement.pre')} </span>
              {t('statement.highlight')}
              <span className="text-white/60"> {t('statement.mid')}</span>
              <br />
              <span className="text-white/60">{t('statement.end')}</span>
            </h2>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════
            PRICING — Clean and decisive.
            ═══════════════════════════════════════════════════ */}
        <section id="pricing" className="py-24 sm:py-32 px-6">
          <div className="max-w-[960px] mx-auto">
            <Reveal>
              <h2 className="font-serif text-4xl sm:text-5xl text-center mb-4 text-white">{t('pricing.title')}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-sans text-[15px] text-white/40 text-center mb-16">{t('pricing.subtitle')}</p>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 0.1}>
                  <div className={cn(
                    'relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300',
                    plan.highlight
                      ? 'backdrop-blur-md bg-white/[0.08] border border-blue-500/40 shadow-[0_0_30px_-5px_rgba(59,130,246,0.25),0_8px_40px_-12px_rgba(0,0,0,0.4)] hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.35)]'
                      : 'backdrop-blur-md bg-white/[0.05] border border-white/[0.12] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] hover:border-white/[0.18]'
                  )}>
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-sans font-bold tracking-wide uppercase">
                        {t('pricing.mostPopular')}
                      </span>
                    )}

                    <p className="font-sans text-sm font-medium text-white/40 mb-5">{plan.name}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-serif text-[42px] text-white leading-none">{plan.price}</span>
                      {plan.period && <span className="font-sans text-sm text-white/40">{plan.period}</span>}
                    </div>
                    <p className="font-sans text-[12px] text-white/40 mb-8">{plan.credits}</p>

                    <ul className="space-y-3 flex-1 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 font-sans text-[13px] text-white/60">
                          <Check className="w-3.5 h-3.5 text-white/40 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={ctaPath}
                      className={cn(
                        'block text-center py-3 rounded-full font-sans text-[13px] font-semibold transition-all duration-300',
                        plan.highlight
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.10] border border-white/[0.08]'
                      )}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            BOTTOM CTA — One final moment.
            ═══════════════════════════════════════════════════ */}
        <section className="py-32 sm:py-40 px-6">
          <Reveal className="text-center">
            <div className="max-w-2xl mx-auto backdrop-blur-md bg-white/[0.05] border border-white/[0.12] rounded-2xl px-8 py-16 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
              <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl mb-8 leading-[1] text-white">
                {t('cta.title1')}
                <br />
                {t('cta.title2')}
              </h2>
              <Link
                to={ctaPath}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-sans text-sm font-semibold hover:bg-white/90 transition-all duration-300 group"
              >
                {t('cta.button')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════
            FOOTER — Quiet. Respectful.
            ═══════════════════════════════════════════════════ */}
        <footer className="border-t border-white/[0.08] py-16 px-6 bg-black">
          <div className="max-w-[1000px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
              <div className="col-span-2 md:col-span-1">
                <Link to="/" className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg backdrop-blur-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center p-1.5">
                    <img src="/logo.png" alt="AppX" className="w-full h-full invert opacity-70" />
                  </div>
                  <span className="font-sans font-semibold text-sm text-white">AppX</span>
                </Link>
                <p className="font-sans text-[12px] text-white/40 leading-relaxed max-w-[180px]">
                  {t('footer.tagline')}
                </p>
              </div>

              <FooterCol title={t('footer.product')} items={[
                { label: t('nav.features'), href: '#features' },
                { label: t('nav.pricing'), href: '#pricing' },
                { label: t('footer.changelog'), to: '/changelog' },
              ]} />
              <FooterCol title={t('footer.developers')} items={[
                { label: t('footer.documentation'), to: '/docs' },
                { label: t('footer.apiReference'), to: '/docs' },
                { label: t('footer.status'), to: '/docs' },
              ]} />
              <FooterCol title={t('footer.company')} items={[
                { label: t('footer.about'), to: '/about' },
                { label: t('footer.blog'), to: '/blog' },
                { label: t('footer.contact'), to: '/pricing' },
              ]} />
              <FooterCol title={t('footer.legal')} items={[
                { label: t('footer.terms'), to: '/terms' },
                { label: t('footer.privacy'), to: '/privacy' },
              ]} />
            </div>

            <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="font-sans text-[11px] text-white/30">&copy; 2026 AppX Inc.</p>
              <div className="flex items-center gap-4 text-white/30">
                <a href="https://github.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href="https://twitter.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to?: string; href?: string }[] }) {
  return (
    <div>
      <p className="font-sans text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium mb-4">{title}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a href={item.href} className="font-sans text-[12px] text-white/40 hover:text-white transition-colors duration-300">{item.label}</a>
            ) : (
              <Link to={item.to!} className="font-sans text-[12px] text-white/40 hover:text-white transition-colors duration-300">{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
