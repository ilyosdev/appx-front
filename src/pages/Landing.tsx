import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { AppComposer } from '../components/composer/AppComposer';
import { ArrowRight, Check, Menu, X, Github, Code2, Smartphone, Rocket, ChevronDown, MessageSquare, Upload, FileCode, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { cn } from '../lib/utils';

// ─── FONT ──────────────────────────────────────────────
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

// ─── REVEAL (scroll animation wrapper) ─────────────────
function Reveal({ children, className, id, delay = 0 }: { children: React.ReactNode; className?: string; id?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SECTION LABEL ─────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3b82f6] mb-4">{children}</p>;
}

// ─── FOOTER COLUMN ─────────────────────────────────────
function FooterCol({ title, items }: { title: string; items: { label: string; to?: string; href?: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 mb-4">{title}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a href={item.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{item.label}</a>
            ) : (
              <Link to={item.to!} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── NAV ───────────────────────────────────────────────
function Nav({ ctaPath, isAuthenticated }: { ctaPath: string; isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const NAV_LINKS = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.pricing'), href: '#pricing' },
    { label: t('nav.showcase'), href: '#showcase' },
    { label: 'Docs', href: 'https://docs.appx.uz/intro', external: true },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full px-4">
      <div
        className={cn(
          'max-w-[900px] w-full mx-auto px-6 h-14 flex items-center justify-between bg-white/90 backdrop-blur-xl rounded-full transition-shadow duration-300',
          scrolled && 'shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
        )}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center p-1.5">
            <img src="/logo.png" alt="AppX" className="w-full h-full" />
          </div>
          <span className="font-semibold text-[15px] text-gray-900 tracking-tight">AppX</span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher variant="light" />
          {isAuthenticated ? (
            <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {t('nav.dashboard')} →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                {t('nav.signIn')}
              </Link>
              <Link
                to={ctaPath}
                className="bg-gray-900 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                {t('nav.startBuilding')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden max-w-[900px] mx-auto mt-2 bg-white/95 backdrop-blur-xl border-t border-gray-100 rounded-2xl px-6 pb-6 pt-4 shadow-[0_2px_20px_rgba(0,0,0,0.08)]"
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-gray-600 hover:text-gray-900 py-2.5"
            >
              {l.label}
            </a>
          ))}
          <div className="border-t border-gray-100 pt-4 mt-3 space-y-3">
            <LanguageSwitcher variant="light" />
            {isAuthenticated ? (
              <Link to="/dashboard" className="block text-sm font-semibold text-center bg-gray-900 text-white rounded-full py-2.5">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="block text-sm text-gray-600 hover:text-gray-900 py-1">
                  {t('nav.signIn')}
                </Link>
                <Link to="/register" className="block text-sm font-semibold text-center bg-gray-900 text-white rounded-full py-2.5">
                  {t('nav.startBuilding')}
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── SHOWCASE DATA ─────────────────────────────────────
const SHOWCASE_APPS = [
  { name: 'FitTrack Pro', category: 'Fitness', time: '12 min', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'FoodDash', category: 'Delivery', time: '18 min', gradient: 'from-orange-500 to-red-600' },
  { name: 'MindfulMe', category: 'Wellness', time: '8 min', gradient: 'from-purple-500 to-indigo-600' },
  { name: 'ShopLocal', category: 'E-commerce', time: '22 min', gradient: 'from-blue-500 to-cyan-600' },
  { name: 'StudyBuddy', category: 'Education', time: '15 min', gradient: 'from-amber-500 to-yellow-600' },
  { name: 'PetCare', category: 'Lifestyle', time: '10 min', gradient: 'from-pink-500 to-rose-600' },
];

// ─── FAQ DATA ──────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Do I need coding experience?', a: 'No. But if you can code, you\'ll love the real code output. Every project is a standard Expo/React Native codebase you can open in any IDE.' },
  { q: 'Is it really production-quality code?', a: 'Yes. Expo + React Native \u2014 the same stack used by companies like Shopify, Discord, and thousands of startups. StyleSheet.create, proper navigation, real state management.' },
  { q: 'Can I edit the code myself?', a: 'Absolutely. Export to GitHub, open in VS Code or any IDE. It\'s your code \u2014 no lock-in, no proprietary format.' },
  { q: 'What if the AI gets it wrong?', a: 'Just tell it. Every change is conversational. Say "make the button bigger" or "add a settings screen" and it updates instantly. You can also edit the code directly.' },
  { q: 'How does App Store publishing work?', a: 'AppX uses EAS Build from Expo. Connect your Apple Developer account, and we handle the build, signing, and submission process.' },
  { q: 'Will my app work on Android too?', a: 'Yes. React Native runs on both iOS and Android from the same codebase. Build once, ship everywhere.' },
  { q: 'What can I build with this?', a: 'Anything from a simple habit tracker to a multi-screen marketplace with user auth, data storage, and real-time features. If React Native can do it, AppX can build it.' },
];

// ─── COMPARISON DATA ───────────────────────────────────
const COMPARISON_HEADERS = ['', 'AppX Pro', 'Freelance Dev', 'No-Code Tool'];
const COMPARISON_ROWS = [
  ['Cost', '$20/mo', '$5,000\u2013$50,000', '$30\u2013$300/mo'],
  ['Time to App Store', 'Hours', 'Months', 'Never (web only)'],
  ['Real native code', '\u2713', '\u2713', '\u2717'],
  ['You own the code', '\u2713', '\u2713', '\u2717'],
  ['App Store publishing', '\u2713', '\u2713', '\u2717'],
];

// ─── SOCIAL PROOF BRANDS ───────────────────────────────
const BRAND_NAMES = ['TechCo', 'StartupHQ', 'AppWorks', 'DevStudio', 'LaunchPad', 'BuildFast'];

// ─── LANDING PAGE ──────────────────────────────────────
export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const ctaPath = isAuthenticated ? '/dashboard' : '/register';
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const FEATURES = [
    { icon: FileCode, title: t('features.items.multiScreen.title'), desc: t('features.items.multiScreen.desc'), wide: true },
    { icon: Smartphone, title: t('features.items.livePreview.title'), desc: t('features.items.livePreview.desc'), wide: false },
    { icon: MessageSquare, title: t('features.items.chatDriven.title'), desc: t('features.items.chatDriven.desc'), wide: false },
    { icon: Upload, title: t('features.items.publish.title'), desc: t('features.items.publish.desc'), wide: false },
    { icon: Code2, title: t('features.items.realCode.title'), desc: t('features.items.realCode.desc'), wide: false },
    { icon: Brain, title: t('features.items.gemini.title'), desc: t('features.items.gemini.desc'), wide: true },
  ];

  const HOW_IT_WORKS_STEPS = [
    { num: '1', word: t('howItWorks.describe.word'), desc: t('howItWorks.describe.desc') },
    { num: '2', word: t('howItWorks.generate.word'), desc: t('howItWorks.generate.desc') },
    { num: '3', word: t('howItWorks.preview.word'), desc: t('howItWorks.preview.desc') },
    { num: '4', word: t('howItWorks.refine.word'), desc: t('howItWorks.refine.desc') },
    { num: '5', word: t('howItWorks.ship.word'), desc: t('howItWorks.ship.desc') },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased overflow-x-hidden font-sans">
      <style>{`
        @import url('${FONT_LINK}');
        .font-sans { font-family: 'Inter', system-ui, sans-serif; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      <Nav ctaPath={ctaPath} isAuthenticated={isAuthenticated} />

      {/* ═══════════════════════════════════════════════════
          SECTION 1: HERO — Input is the star
          ═══════════════════════════════════════════════════ */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-6 bg-gradient-to-b from-[#f0f5ff] via-white to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3b82f6] mb-6"
          >
            {t('hero.superTagline')}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold tracking-tight leading-[1.05]"
          >
            <span className="text-gray-900">{t('hero.headline1')}</span>
            <br />
            <span className="text-gray-400">{t('hero.headline2')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-lg sm:text-xl text-gray-600 mt-6 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('hero.subheadline')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="max-w-3xl mx-auto"
          >
            <AppComposer variant="light" />
          </motion.div>

          {/* Trust strip — replaces "What You Get" section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mt-8 text-sm text-gray-400"
          >
            <span className="flex items-center gap-2"><Code2 className="w-4 h-4" /> Real React Native code</span>
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Test on your phone</span>
            <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Ship to App Store</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="text-sm text-gray-400 mt-4 text-center"
          >
            {t('hero.trustLine')}
          </motion.p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: SOCIAL PROOF BAR
          ═══════════════════════════════════════════════════ */}
      <section className="py-12 overflow-hidden">
        <p className="text-sm text-gray-400 text-center mb-8">{t('socialProof.title')}</p>
        <div className="overflow-hidden">
          <div className="flex" style={{ animation: 'scroll 30s linear infinite', width: 'max-content' }}>
            {[...BRAND_NAMES, ...BRAND_NAMES].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex-shrink-0 px-8 py-3 mx-3 rounded-full bg-gray-100 text-sm font-medium text-gray-400"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 3: APP SHOWCASE GALLERY (moved up)
          ═══════════════════════════════════════════════════ */}
      <section id="showcase" className="py-20 sm:py-28 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <Reveal>
            <SectionLabel>{t('showcase.label')}</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-12">{t('showcase.headline')}</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SHOWCASE_APPS.map((app, i) => (
              <Reveal key={app.name} delay={i * 0.06}>
                <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-shadow">
                  <div className={`h-48 bg-gradient-to-br ${app.gradient} flex items-center justify-center`}>
                    <Smartphone className="w-14 h-14 text-white/40" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold">{app.name}</h3>
                      <span className="text-xs text-gray-400">Built in {app.time}</span>
                    </div>
                    <span className="text-xs font-medium text-[#3b82f6] bg-blue-50 px-2.5 py-1 rounded-full">{app.category}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 4: FEATURES BENTO GRID
          ═══════════════════════════════════════════════════ */}
      <section id="features" className="py-20 sm:py-28 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <Reveal>
            <SectionLabel>{t('features.label')}</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">{t('features.headline')}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-gray-600 text-lg mb-12 max-w-xl mx-auto">{t('features.subheadline')}</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feat, i) => (
              <Reveal key={feat.title} delay={i * 0.06} className={feat.wide ? 'md:col-span-2' : ''}>
                <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] p-7 h-full text-left">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <feat.icon className="w-5 h-5 text-[#3b82f6]" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                  <p className="text-[15px] text-gray-600 leading-relaxed">{feat.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 5: HOW IT WORKS
          ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <Reveal>
            <SectionLabel>{t('howItWorks.label')}</SectionLabel>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="bg-white rounded-[32px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] p-8 sm:p-12">
              <div className="flex flex-wrap justify-center gap-6 sm:gap-4">
                {HOW_IT_WORKS_STEPS.map((step, i) => (
                  <Reveal key={step.num} delay={i * 0.08}>
                    <div className="flex flex-col items-center text-center w-[140px] sm:w-[160px]">
                      <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center mb-4">
                        <span className="text-sm font-bold text-gray-400">{step.num}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{step.word}</h3>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 6: PRICING
          ═══════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 sm:py-28 px-6">
        <div className="max-w-[1000px] mx-auto text-center">
          <Reveal>
            <SectionLabel>{t('nav.pricing')}</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">{t('pricing.title')}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-gray-600 text-lg mb-12 max-w-xl mx-auto">{t('pricing.subtitle')}</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div className={cn(
                  'relative bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] p-7 flex flex-col h-full text-left',
                  plan.highlight && 'ring-2 ring-[#3b82f6]'
                )}>
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#3b82f6] text-white text-[10px] font-bold tracking-wide uppercase">
                      {t('pricing.mostPopular')}
                    </span>
                  )}

                  <p className="text-sm font-medium text-gray-400 mb-5">{plan.name}</p>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[42px] font-extrabold text-gray-900 leading-none">{plan.price}</span>
                    {plan.period && <span className="text-sm text-gray-400">{plan.period}</span>}
                  </div>
                  <p className="text-[12px] text-gray-400 mb-8">{plan.credits}</p>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[13px] text-gray-600">
                        <Check className="w-3.5 h-3.5 text-[#3b82f6] mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={ctaPath}
                    className={cn(
                      'block text-center py-3 rounded-full text-[13px] font-semibold transition-colors',
                      plan.highlight
                        ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════
              COMPARISON TABLE
              ═══════════════════════════════════════════════ */}
          <div className="mt-16">
            <Reveal>
              <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden">
                <h3 className="text-2xl font-extrabold p-7 pb-0">{t('comparison.title')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="bg-gray-50">
                        {COMPARISON_HEADERS.map((header, i) => (
                          <th key={i} className={cn(
                            'px-6 py-3 text-sm font-semibold',
                            i === 0 ? 'text-left' : 'text-center'
                          )}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_ROWS.map((row, ri) => (
                        <tr key={ri} className="border-t border-gray-100">
                          {row.map((cell, ci) => (
                            <td key={ci} className={cn(
                              'px-6 py-4',
                              ci === 0 ? 'font-semibold text-left' : 'text-center',
                              ci === 1 && cell !== '\u2717' && 'text-emerald-600 font-semibold',
                              cell === '\u2713' && ci !== 1 && 'text-emerald-600',
                              cell === '\u2717' && 'text-red-400'
                            )}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 7: FAQ
          ═══════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-[800px] mx-auto">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-12 text-center">{t('faq.headline')}</h2>
          </Reveal>

          <div>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-gray-100">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span className="text-[15px] font-semibold pr-4">{item.q}</span>
                  <ChevronDown className={cn(
                    'w-5 h-5 text-gray-400 transition-transform flex-shrink-0',
                    openFaq === i && 'rotate-180'
                  )} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[15px] text-gray-600 leading-relaxed pb-5">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 8: FINAL CTA
          ═══════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-[800px] mx-auto">
          <Reveal>
            <div className="bg-gray-900 rounded-[32px] px-8 sm:px-16 py-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
                {t('cta.headline')}
              </h2>
              <p className="text-xl text-white/50 mb-4">{t('cta.sub')}</p>
              <p className="text-white/40 mb-8 max-w-md mx-auto">{t('cta.desc')}</p>
              <Link
                to={ctaPath}
                className="bg-white text-gray-900 rounded-full px-8 py-4 font-semibold inline-flex items-center gap-2 hover:bg-white/90 transition-colors group"
              >
                {t('cta.button')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div>
                <a href="#showcase" className="text-white/40 hover:text-white/60 text-sm mt-4 inline-block transition-colors">
                  {t('cta.secondary')}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SECTION 9: FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer className="bg-gray-50 py-16 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center p-1.5">
                  <img src="/logo.png" alt="AppX" className="w-full h-full" />
                </div>
                <span className="font-semibold text-sm text-gray-900">AppX</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed max-w-[180px]">
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

          <div className="pt-8 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-400">&copy; 2026 AppX Inc.</p>
            <div className="flex items-center gap-4 text-gray-400">
              <a href="https://github.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
