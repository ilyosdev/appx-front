import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { AppComposer } from '../components/composer/AppComposer';
import {
  ArrowRight,
  Check,
  Menu,
  X,
  Github,
  Layers,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── ANIMATION VARIANTS ─────────────────────────────────
const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 0.68, 0.32, 1.0] },
  }),
};

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── NAV ────────────────────────────────────────────────
function Nav({ ctaPath, isAuthenticated }: { ctaPath: string; isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Gallery', href: '#gallery' },
  ];

  return (
    <nav className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-surface-950/80 backdrop-blur-xl border-b border-white/[0.06]'
        : 'bg-transparent'
    )}>
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center p-1 shadow-lg shadow-primary-500/20">
            <img src="/logo.png" alt="" className="w-full h-full invert brightness-200" />
          </div>
          <span className="font-manrope font-bold text-[15px] text-white">AppX</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-[13px] text-white/40 hover:text-white/70 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-[13px] font-medium text-white bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/25 hover:border-primary-500/40 rounded-lg px-4 py-1.5 transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[13px] text-white/40 hover:text-white/70 transition-colors px-3 py-1.5">
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-[13px] font-medium text-white bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/25 hover:border-primary-500/40 rounded-lg px-4 py-1.5 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1.5 text-white/50">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-surface-950/95 backdrop-blur-xl border-t border-white/[0.06] px-5 pb-5 pt-3"
        >
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/50 py-2">{l.label}</a>
          ))}
          <div className="border-t border-white/[0.06] pt-3 mt-2 space-y-2">
            {isAuthenticated ? (
              <Link to="/dashboard"
                className="block text-sm font-medium text-white bg-primary-500/20 border border-primary-500/30 rounded-lg px-4 py-2 text-center">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="block text-sm text-white/50 py-1.5">Sign in</Link>
                <Link to="/register"
                  className="block text-sm font-medium text-white bg-primary-500/20 border border-primary-500/30 rounded-lg px-4 py-2 text-center">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
}

// ─── PRODUCT SHOWCASE (CSS-only IDE mock) ───────────────
function ProductShowcase() {
  return (
    <div className="relative rounded-2xl bg-surface-900 border border-surface-700/50 overflow-hidden shadow-2xl shadow-black/40">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-surface-700/50 bg-surface-900/80">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="ml-4 flex-1 flex justify-center">
          <div className="px-4 py-0.5 rounded-md bg-surface-800 text-[10px] text-white/30 font-mono">appx.uz/project/canvas</div>
        </div>
      </div>

      <div className="flex min-h-[280px] sm:min-h-[340px]">
        {/* Left: Chat panel */}
        <div className="flex-1 p-4 sm:p-5 border-r border-surface-700/40 space-y-3">
          <div className="text-[10px] text-white/20 uppercase tracking-wider mb-3 font-medium">Chat</div>
          {/* User message */}
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary-500/20 flex-shrink-0" />
            <div className="bg-surface-800 rounded-xl rounded-tl-sm px-3 py-2 max-w-[200px]">
              <p className="text-[11px] text-white/60 leading-relaxed">Build a fitness tracker with workouts, progress charts & social challenges</p>
            </div>
          </div>
          {/* AI response */}
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-accent-500/20 flex-shrink-0" />
            <div className="space-y-2 max-w-[220px]">
              <div className="bg-surface-800/60 rounded-xl rounded-tl-sm px-3 py-2">
                <p className="text-[11px] text-white/50 leading-relaxed">Creating 5 screens with tab navigation...</p>
              </div>
              {/* Fake code artifact */}
              <div className="bg-surface-800/40 border border-surface-700/30 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded bg-primary-500/40" />
                  <span className="text-[9px] text-white/30 font-mono">HomeScreen.tsx</span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-primary-500/15 w-4/5" />
                  <div className="h-1.5 rounded-full bg-accent-500/10 w-3/5" />
                  <div className="h-1.5 rounded-full bg-primary-500/10 w-full" />
                  <div className="h-1.5 rounded-full bg-accent-500/15 w-2/3" />
                  <div className="h-1.5 rounded-full bg-primary-500/10 w-4/5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Phone preview */}
        <div className="w-[180px] sm:w-[220px] flex items-center justify-center p-4 sm:p-6 bg-surface-900/50">
          <div className="relative w-[130px] sm:w-[150px]">
            {/* Phone frame */}
            <div className="relative bg-surface-950 rounded-[24px] border-2 border-surface-700/60 overflow-hidden shadow-xl shadow-black/40">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-surface-950 rounded-b-xl z-10" />
              {/* Screen */}
              <div className="pt-7 pb-3 px-2">
                {/* Status bar */}
                <div className="flex justify-between px-2 mb-3">
                  <div className="h-1 w-6 rounded bg-white/20" />
                  <div className="flex gap-1">
                    <div className="h-1 w-3 rounded bg-white/20" />
                    <div className="h-1 w-3 rounded bg-white/20" />
                  </div>
                </div>
                {/* App content mockup */}
                <div className="space-y-2 px-1">
                  <div className="h-2 rounded bg-white/15 w-3/4" />
                  <div className="h-1.5 rounded bg-white/8 w-full" />
                  {/* Card mockup */}
                  <div className="bg-gradient-to-br from-primary-500/20 to-accent-500/15 rounded-lg p-2 mt-1.5">
                    <div className="h-1.5 rounded bg-white/20 w-2/3 mb-1.5" />
                    <div className="flex gap-1.5">
                      <div className="h-6 flex-1 rounded bg-primary-500/20" />
                      <div className="h-6 flex-1 rounded bg-accent-500/15" />
                      <div className="h-6 flex-1 rounded bg-primary-500/15" />
                    </div>
                  </div>
                  {/* List items */}
                  <div className="space-y-1.5 mt-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-primary-500/10 flex-shrink-0" />
                        <div className="flex-1 space-y-0.5">
                          <div className="h-1.5 rounded bg-white/12 w-4/5" />
                          <div className="h-1 rounded bg-white/6 w-3/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Tab bar */}
                <div className="flex justify-around mt-3 pt-2 border-t border-white/[0.06]">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={cn('w-4 h-4 rounded-md', i === 0 ? 'bg-primary-500/30' : 'bg-white/8')} />
                  ))}
                </div>
              </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-4 bg-primary-500/[0.04] rounded-full blur-2xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PHONE FRAME (for gallery) ──────────────────────────
function PhoneFrame({ gradient, appName, screens }: { gradient: string; appName: string; screens: string }) {
  return (
    <div className="group">
      <div className="relative bg-surface-950 rounded-[22px] border-2 border-surface-700/50 overflow-hidden shadow-lg shadow-black/30 group-hover:border-surface-600/60 group-hover:shadow-xl transition-all duration-300">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-4 bg-surface-950 rounded-b-lg z-10" />
        {/* Screen */}
        <div className={cn('aspect-[9/16] bg-gradient-to-br', gradient)}>
          {/* Fake app UI */}
          <div className="pt-7 px-3 h-full flex flex-col">
            <div className="h-1.5 rounded bg-white/20 w-1/2 mb-3" />
            <div className="h-1 rounded bg-white/10 w-3/4 mb-4" />
            <div className="flex-1 space-y-2">
              <div className="h-16 rounded-xl bg-white/[0.07] backdrop-blur-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-lg bg-white/[0.05]" />
                <div className="h-12 rounded-lg bg-white/[0.05]" />
              </div>
              <div className="h-10 rounded-lg bg-white/[0.04]" />
            </div>
            {/* Tab bar */}
            <div className="flex justify-around py-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={cn('w-3.5 h-3.5 rounded-md', i === 0 ? 'bg-white/25' : 'bg-white/8')} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-white/70">{appName}</p>
        <p className="text-[11px] text-white/30 mt-0.5">{screens}</p>
      </div>
    </div>
  );
}

// ─── DATA ───────────────────────────────────────────────
const FEATURES = [
  {
    icon: Layers,
    title: 'Multi-Screen Generation',
    desc: 'Describe an entire app. Get a complete multi-screen project with navigation, state, and data flow — not just a single page.',
  },
  {
    icon: Smartphone,
    title: 'Live Device Preview',
    desc: 'Scan a QR code, test instantly on your phone. Real device, real performance, real haptics. Not a simulator.',
  },
  {
    icon: MessageSquare,
    title: 'Chat-Driven Iteration',
    desc: 'Refine any screen conversationally. Change layouts, colors, logic — like pair-programming with an expert.',
  },
];

const STEPS = [
  { num: '01', title: 'Describe', desc: 'Tell the AI what you want to build in plain English.' },
  { num: '02', title: 'Generate', desc: 'AI writes production React Native code with live preview.' },
  { num: '03', title: 'Ship', desc: 'Export to GitHub, build with EAS, publish to stores.' },
];

const GALLERY_APPS = [
  { name: 'Fitness Tracker', screens: '6 screens', gradient: 'from-emerald-600/80 via-teal-600/70 to-cyan-700/80' },
  { name: 'Food Delivery', screens: '8 screens', gradient: 'from-orange-600/80 via-amber-600/70 to-yellow-700/80' },
  { name: 'Travel Planner', screens: '5 screens', gradient: 'from-primary-600/80 via-indigo-600/70 to-violet-700/80' },
  { name: 'Meditation', screens: '4 screens', gradient: 'from-violet-600/80 via-purple-600/70 to-fuchsia-700/80' },
];

const PLANS = [
  {
    name: 'Free', price: '$0', period: '', credits: '5 credits / day',
    features: ['5 screens', '1 project', 'Web preview', 'Community support'],
    cta: 'Get Started', highlight: false,
  },
  {
    name: 'Starter', price: '$25', period: '/mo', credits: '100 credits / month',
    features: ['50 screens', '3 projects', 'Device preview', 'Email support', 'Git export'],
    cta: 'Start Free Trial', highlight: false,
  },
  {
    name: 'Pro', price: '$50', period: '/mo', credits: '250 credits / month',
    features: ['Unlimited screens', '10 projects', 'Device preview', 'Priority support', 'GitHub integration', 'Human publishing'],
    cta: 'Start Free Trial', highlight: true,
  },
  {
    name: 'Business', price: '$100', period: '/mo', credits: '500 credits / month',
    features: ['Unlimited everything', 'Team collaboration', 'Custom branding', 'Dedicated support', 'EAS Build & Deploy', 'Human publishing', 'API integration'],
    cta: 'Contact Sales', highlight: false,
  },
];

// ─── LANDING PAGE ───────────────────────────────────────
export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const ctaPath = isAuthenticated ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen bg-surface-950 text-white antialiased overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
        .font-manrope { font-family: 'Manrope', system-ui, sans-serif; }
      `}</style>

      <Nav ctaPath={ctaPath} isAuthenticated={isAuthenticated} />

      {/* ═══════ HERO ═══════ */}
      <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16 px-5">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-radial pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 0.68, 0.32, 1.0] }}
            className="font-manrope font-extrabold text-4xl sm:text-5xl md:text-[56px] tracking-[-0.035em] leading-[1.08]"
          >
            Build real mobile apps,{' '}
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">fast.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/50 text-base sm:text-lg mt-4 mb-8 max-w-lg mx-auto leading-relaxed"
          >
            Create native mobile apps by chatting with AI.
            <br className="hidden sm:block" />
            Idea to phone in minutes, to App Store in hours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AppComposer />
          </motion.div>
        </div>
      </section>

      {/* ═══════ PRODUCT SHOWCASE ═══════ */}
      <Section className="py-10 sm:py-14 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fade} custom={0}>
            <ProductShowcase />
          </motion.div>
          <motion.p variants={fade} custom={1} className="text-center text-[13px] text-white/30 mt-5">
            Chat with AI. Preview on your phone. Ship to stores.
          </motion.p>
        </div>
      </Section>

      {/* ═══════ FEATURES ═══════ */}
      <Section id="features" className="py-12 sm:py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.h2 variants={fade} custom={0} className="font-manrope font-bold text-2xl sm:text-3xl text-center tracking-[-0.02em] mb-10">
            Everything you need to ship.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                variants={fade}
                custom={i}
                className="rounded-xl bg-surface-900/80 border border-surface-700/40 p-5 hover:border-surface-600/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-4 h-4 text-primary-400" />
                </div>
                <h3 className="font-manrope font-semibold text-[15px] text-white/90 mb-2">{feat.title}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <Section className="py-12 sm:py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.p variants={fade} custom={0} className="text-[11px] text-white/25 uppercase tracking-[0.2em] text-center mb-8 font-medium">
            How it works
          </motion.p>

          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fade}
                custom={i}
                className="relative rounded-xl bg-surface-900/60 border border-surface-700/30 p-5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center mb-4">
                  <span className="font-mono text-xs font-semibold text-primary-400">{step.num}</span>
                </div>
                <h3 className="font-manrope font-semibold text-base text-white/90 mb-1.5">{step.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{step.desc}</p>
                {/* Arrow connector (hidden on last) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 text-surface-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════ APP GALLERY ═══════ */}
      <Section id="gallery" className="py-12 sm:py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fade} custom={0} className="font-manrope font-bold text-2xl sm:text-3xl text-center tracking-[-0.02em] mb-3">
            Built with AppX
          </motion.h2>
          <motion.p variants={fade} custom={1} className="text-sm text-white/35 text-center mb-10 max-w-md mx-auto">
            Real apps generated from a single prompt. Each took minutes, not months.
          </motion.p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6">
            {GALLERY_APPS.map((app, i) => (
              <motion.div key={app.name} variants={fade} custom={i}>
                <PhoneFrame gradient={app.gradient} appName={app.name} screens={app.screens} />
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="max-w-5xl mx-auto px-5">
        <div className="h-px bg-gradient-to-r from-transparent via-surface-700/50 to-transparent" />
      </div>

      {/* ═══════ PRICING ═══════ */}
      <Section id="pricing" className="py-14 sm:py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.h2 variants={fade} custom={0} className="font-manrope font-bold text-2xl sm:text-3xl text-center tracking-[-0.02em] mb-3">
            Simple pricing
          </motion.h2>
          <motion.p variants={fade} custom={1} className="text-sm text-white/35 text-center mb-10 max-w-md mx-auto">
            One credit per generation. Pick a plan, start building.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fade}
                custom={i}
                className={cn(
                  'relative rounded-xl p-5 flex flex-col',
                  plan.highlight
                    ? 'bg-primary-500/[0.07] border border-primary-500/25 shadow-[0_0_40px_rgba(59,130,246,0.06)]'
                    : 'bg-surface-900/60 border border-surface-700/40'
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-500 text-[10px] font-bold text-white tracking-wide">
                    Popular
                  </span>
                )}

                <h3 className="text-sm font-semibold text-white/80">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-0.5">
                  <span className="font-manrope font-bold text-2xl text-white">{plan.price}</span>
                  {plan.period && <span className="text-xs text-white/30">{plan.period}</span>}
                </div>
                <p className="mt-1.5 text-[11px] text-primary-400/60 font-medium">{plan.credits}</p>

                <ul className="mt-5 flex flex-col gap-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-white/40">
                      <Check className="w-3.5 h-3.5 text-primary-400/50 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.name === 'Business' ? '/pricing' : ctaPath}
                  className={cn(
                    'mt-5 block text-center py-2.5 rounded-lg text-[12px] font-semibold transition-all',
                    plan.highlight
                      ? 'bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12]'
                  )}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════ BOTTOM CTA ═══════ */}
      <Section className="py-14 sm:py-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fade} custom={0} className="font-manrope font-bold text-2xl sm:text-3xl tracking-[-0.02em] mb-2">
            Your next app is{' '}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">one message away.</span>
          </motion.h2>
          <motion.p variants={fade} custom={1} className="text-sm text-white/35 mb-6">
            Join thousands of teams shipping production mobile apps with AppX.
          </motion.p>
          <motion.div variants={fade} custom={2}>
            <Link
              to={ctaPath}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all"
            >
              Start Building Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-surface-700/30 py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center p-1">
                  <img src="/logo.png" alt="" className="w-full h-full invert brightness-200" />
                </div>
                <span className="font-manrope font-bold text-sm text-white">AppX</span>
              </Link>
              <p className="text-[11px] text-white/25 leading-relaxed max-w-[180px]">
                The AI platform for shipping mobile apps.
              </p>
            </div>

            <FooterCol title="Product" items={[
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Gallery', href: '#gallery' },
              { label: 'Changelog', to: '/changelog' },
            ]} />
            <FooterCol title="Developers" items={[
              { label: 'Documentation', to: '/docs' },
              { label: 'API Reference', to: '/docs' },
              { label: 'Status', to: '/docs' },
            ]} />
            <FooterCol title="Company" items={[
              { label: 'About', to: '/about' },
              { label: 'Blog', to: '/blog' },
              { label: 'Careers', to: '/careers' },
              { label: 'Contact', to: '/pricing' },
            ]} />
            <FooterCol title="Legal" items={[
              { label: 'Terms', to: '/terms' },
              { label: 'Privacy', to: '/privacy' },
              { label: 'Security', to: '/security' },
            ]} />
          </div>

          <div className="pt-6 border-t border-surface-700/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-white/20">&copy; 2026 AppX Inc.</p>
            <div className="flex items-center gap-3.5 text-white/20">
              <a href="https://github.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/appx" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
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

function FooterCol({ title, items }: { title: string; items: { label: string; to?: string; href?: string }[] }) {
  return (
    <div>
      <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-medium mb-3">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <a href={item.href} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">{item.label}</a>
            ) : (
              <Link to={item.to!} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
