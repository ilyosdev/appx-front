import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ParallaxStarsBackground } from '../components/landing/ParallaxStarsBackground';
import { useAuthStore } from '../stores/authStore';
import {
  ArrowRight,
  Check,
  Menu,
  X,
  MessageSquareText,
  Cpu,
  Smartphone,
  Layers,
  QrCode,
  Code2,
  Paintbrush,
  Rocket,
  MessageCircle,
  ChevronRight,
  Star,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { galleryApi, type GalleryProject } from '../lib/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Global Styles ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

    :root {
      --accent-blue: #3b82f6;
      --accent-cyan: #06b6d4;
      --accent-glow: rgba(59, 130, 246, 0.5);
    }

    .font-manrope { font-family: 'Manrope', sans-serif; }

    /* Shiny CTA Button */
    @property --gradient-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    @property --gradient-angle-offset { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    @property --gradient-percent { syntax: "<percentage>"; initial-value: 20%; inherits: false; }
    @property --gradient-shine { syntax: "<color>"; initial-value: #06b6d4; inherits: false; }

    .shiny-cta {
      --gradient-angle: 0deg;
      --gradient-angle-offset: 0deg;
      --gradient-percent: 20%;
      --gradient-shine: #06b6d4;
      background: linear-gradient(
        calc(var(--gradient-angle) + var(--gradient-angle-offset)),
        #1e40af,
        #3b82f6 var(--gradient-percent),
        var(--gradient-shine) calc(var(--gradient-percent) + 20%),
        #3b82f6 calc(var(--gradient-percent) + 40%),
        #1e40af
      );
      animation: shiny-cta-anim 3s ease-in-out infinite;
    }
    .shiny-cta:hover {
      --gradient-angle-offset: 45deg;
      --gradient-shine: #22d3ee;
      animation-duration: 1.5s;
    }
    @keyframes shiny-cta-anim {
      0% { --gradient-angle: 0deg; --gradient-percent: 0%; }
      50% { --gradient-percent: 100%; }
      100% { --gradient-angle: 360deg; --gradient-percent: 0%; }
    }

    /* Phone mockup glow */
    .phone-glow {
      box-shadow: 0 0 60px rgba(59, 130, 246, 0.3), 0 0 120px rgba(6, 182, 212, 0.15);
    }

    /* Glass card */
    .glass-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(12px);
    }
    .glass-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(59, 130, 246, 0.2);
    }

    /* Step connector line */
    .step-connector {
      background: linear-gradient(90deg, #3b82f6, #06b6d4);
    }
  `}</style>
);

// --- Animation Variants ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// --- Section Wrapper ---
function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={cn('relative z-10 px-4 sm:px-6 lg:px-8', className)}
    >
      {children}
    </motion.section>
  );
}

// --- Phone Mockup ---
function PhoneMockup({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative mx-auto', className)} style={{ width: 280 }}>
      <div className="phone-glow rounded-[3rem] border-[3px] border-surface-700 bg-surface-900 overflow-hidden">
        {/* Notch */}
        <div className="relative h-7 bg-surface-900 flex items-end justify-center">
          <div className="w-24 h-5 bg-black rounded-b-2xl" />
        </div>
        {/* Screen area */}
        <div className="bg-surface-950 aspect-[9/17] overflow-hidden">
          {children}
        </div>
        {/* Bottom bar */}
        <div className="h-5 bg-surface-900 flex items-center justify-center">
          <div className="w-28 h-1 bg-surface-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// --- Gallery Phone Card ---
function GalleryCard({ project }: { project: GalleryProject }) {
  const screen = project.screens?.[0];
  const imageUrl = screen?.thumbnailUrl || screen?.imageUrl || project.coverImageUrl;

  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
      <PhoneMockup className="w-full max-w-[240px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-900 to-accent-900 flex items-center justify-center">
            <Layers className="w-10 h-10 text-primary-400 opacity-40" />
          </div>
        )}
      </PhoneMockup>
      <div className="text-center">
        <p className="text-sm font-medium text-white truncate max-w-[200px]">{project.name}</p>
        {project.galleryDescription && (
          <p className="text-xs text-surface-400 mt-0.5 line-clamp-2 max-w-[200px]">
            {project.galleryDescription}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// --- Placeholder Gallery Card ---
function PlaceholderCard({ name, desc }: { name: string; desc: string }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
      <PhoneMockup className="w-full max-w-[240px]">
        <div className="w-full h-full bg-gradient-to-br from-primary-950 to-accent-950 flex items-center justify-center">
          <Layers className="w-10 h-10 text-primary-500 opacity-30" />
        </div>
      </PhoneMockup>
      <div className="text-center">
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
      </div>
    </motion.div>
  );
}

// === MAIN COMPONENT ===
export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [galleryProjects, setGalleryProjects] = useState<GalleryProject[]>([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    galleryApi.getProjects(8).then((res) => {
      setGalleryProjects(res.projects || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ctaPath = isAuthenticated ? '/projects' : '/register';

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-surface-950 text-white overflow-x-hidden">
      <GlobalStyles />

      {/* Stars Background */}
      <div className="fixed inset-0 z-0">
        <ParallaxStarsBackground
          speed={0.4}
          backgroundColorStart="#0f172a"
          backgroundColorEnd="#030712"
          className="w-full h-full"
        />
      </div>

      {/* ==================== NAVBAR ==================== */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="font-manrope font-bold text-sm text-white">A</span>
              </div>
              <span className="font-manrope font-bold text-xl text-white">AppX</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-sm text-surface-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-sm text-surface-300 hover:text-white transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('gallery')}
                className="text-sm text-surface-300 hover:text-white transition-colors"
              >
                Gallery
              </button>
              <Link
                to={ctaPath}
                className="shiny-cta px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-shadow"
              >
                Start Building Free
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden text-surface-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-surface-950/95 backdrop-blur-xl border-b border-surface-800/50 overflow-hidden"
            >
              <div className="px-4 py-4 flex flex-col gap-3">
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-left text-sm text-surface-300 hover:text-white py-2"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-left text-sm text-surface-300 hover:text-white py-2"
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection('gallery')}
                  className="text-left text-sm text-surface-300 hover:text-white py-2"
                >
                  Gallery
                </button>
                <Link
                  to={ctaPath}
                  className="shiny-cta px-5 py-2.5 rounded-full text-sm font-semibold text-white text-center mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start Building Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ==================== HERO ==================== */}
      <Section className="pt-32 sm:pt-40 pb-20 sm:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/20 bg-primary-500/5 mb-6"
              >
                <Star className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-xs font-medium text-primary-300">
                  AI-Powered Mobile App Builder
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-manrope font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight"
              >
                <span className="text-white">Build Any App.</span>
                <br />
                <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  Just Describe It.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 text-lg text-surface-300 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              >
                AppX is your senior mobile engineer. Describe your app, get production-ready
                React Native code, test on your phone instantly.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
              >
                <Link
                  to={ctaPath}
                  className="shiny-cta group flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow"
                >
                  Start Building Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <button
                  onClick={() => scrollToSection('gallery')}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-medium text-surface-300 border border-surface-700 hover:border-surface-500 hover:text-white transition-all"
                >
                  See Examples
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>

            {/* Right: Phone Mockup */}
            <motion.div
              variants={fadeUp}
              className="flex justify-center lg:justify-end"
            >
              <PhoneMockup>
                <div className="w-full h-full bg-gradient-to-b from-surface-900 to-surface-950 p-4 flex flex-col">
                  {/* Fake app UI */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-20 h-3 bg-surface-700 rounded-full" />
                    <div className="w-6 h-6 rounded-full bg-primary-500/20" />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="h-32 rounded-2xl bg-gradient-to-br from-primary-600/30 to-accent-600/30 border border-primary-500/10" />
                    <div className="flex gap-3">
                      <div className="flex-1 h-20 rounded-xl bg-surface-800 border border-surface-700" />
                      <div className="flex-1 h-20 rounded-xl bg-surface-800 border border-surface-700" />
                    </div>
                    <div className="h-12 rounded-xl bg-surface-800 border border-surface-700" />
                    <div className="h-12 rounded-xl bg-surface-800 border border-surface-700" />
                  </div>
                  <div className="flex justify-around pt-3 mt-auto border-t border-surface-800">
                    <div className="w-6 h-6 rounded bg-primary-500/30" />
                    <div className="w-6 h-6 rounded bg-surface-700" />
                    <div className="w-6 h-6 rounded bg-surface-700" />
                    <div className="w-6 h-6 rounded bg-surface-700" />
                  </div>
                </div>
              </PhoneMockup>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ==================== HOW IT WORKS ==================== */}
      <Section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="font-manrope font-bold text-3xl sm:text-4xl text-white">
              How It Works
            </h2>
            <p className="mt-4 text-surface-400 text-lg">Three steps to a working app</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connector lines (desktop) */}
            <div className="hidden md:block absolute top-12 left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)] h-[2px]">
              <div className="step-connector w-full h-full opacity-30 rounded-full" />
            </div>

            {[
              {
                icon: MessageSquareText,
                step: '01',
                title: 'Describe Your App',
                desc: 'Tell AppX what you want to build in plain English',
              },
              {
                icon: Cpu,
                step: '02',
                title: 'AI Builds It',
                desc: 'Our AI engineer generates production-ready React Native code',
              },
              {
                icon: Smartphone,
                step: '03',
                title: 'Run on Your Phone',
                desc: 'Scan QR code, test instantly on your device via Expo Go',
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-5">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20 flex items-center justify-center">
                    <item.icon className="w-10 h-10 text-primary-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-manrope font-semibold text-lg text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-surface-400 max-w-[240px]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ==================== FEATURES ==================== */}
      <Section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="font-manrope font-bold text-3xl sm:text-4xl text-white">
              Everything You Need
            </h2>
            <p className="mt-4 text-surface-400 text-lg max-w-2xl mx-auto">
              From idea to App Store. AppX handles the entire mobile development workflow.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Layers,
                title: 'One-Shot Complex Apps',
                desc: 'Build crypto wallets, social networks, fitness trackers — entire platforms in one prompt.',
              },
              {
                icon: QrCode,
                title: 'Live Device Preview',
                desc: 'Scan a QR code, test your app instantly on your phone with Expo Go.',
              },
              {
                icon: Code2,
                title: 'Production-Ready Code',
                desc: 'NativeWind styling, React Native Paper components, Expo SDK 54.',
              },
              {
                icon: Paintbrush,
                title: 'Smart Design System',
                desc: 'AI-generated themes, color palettes, and typography that look professional.',
              },
              {
                icon: Rocket,
                title: 'Export & Deploy',
                desc: 'Export to GitHub, build with EAS, publish to App Store and Google Play.',
              },
              {
                icon: MessageCircle,
                title: 'Iterate With Chat',
                desc: 'Refine any screen by chatting. Change colors, layout, features conversationally.',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card rounded-2xl p-6 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15 border border-primary-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="font-manrope font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ==================== GALLERY ==================== */}
      <Section id="gallery" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="font-manrope font-bold text-3xl sm:text-4xl text-white">
              See What People Are Building
            </h2>
            <p className="mt-4 text-surface-400 text-lg">
              Real apps built with AppX in minutes, not months
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {galleryProjects.length > 0
              ? galleryProjects.slice(0, 8).map((project) => (
                  <GalleryCard key={project.id} project={project} />
                ))
              : [
                  { name: 'Fitness Tracker', desc: 'Workout & nutrition' },
                  { name: 'Social Feed', desc: 'Photo sharing app' },
                  { name: 'Crypto Wallet', desc: 'DeFi dashboard' },
                  { name: 'Task Manager', desc: 'Team productivity' },
                ].map((p) => (
                  <PlaceholderCard key={p.name} name={p.name} desc={p.desc} />
                ))}
          </div>
        </div>
      </Section>

      {/* ==================== PRICING ==================== */}
      <Section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="font-manrope font-bold text-3xl sm:text-4xl text-white">
              Simple, Credit-Based Pricing
            </h2>
            <p className="mt-4 text-surface-400 text-lg">
              Each prompt costs 1 credit. Pick a plan that fits your workflow.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                credits: '5 credits/day',
                features: ['5 screens', '1 project', 'Web preview', 'Community support'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Starter',
                price: '$25',
                period: '/month',
                credits: '100 credits/mo',
                features: ['50 screens', '3 projects', 'Device preview', 'Email support'],
                cta: 'Start Free Trial',
                popular: false,
              },
              {
                name: 'Pro',
                price: '$50',
                period: '/month',
                credits: '250 credits/mo',
                features: [
                  'Unlimited screens',
                  '10 projects',
                  'Device preview',
                  'Priority support',
                  'Export to GitHub',
                ],
                cta: 'Start Free Trial',
                popular: true,
              },
              {
                name: 'Business',
                price: '$100',
                period: '/month',
                credits: '500 credits/mo',
                features: [
                  'Unlimited everything',
                  'Team collaboration',
                  'Custom branding',
                  'Dedicated support',
                  'EAS Build & Deploy',
                ],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={cn(
                  'relative rounded-2xl p-6 flex flex-col transition-all duration-300',
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/10 to-primary-500/5 border-2 border-primary-500/40 shadow-lg shadow-primary-500/10'
                    : 'glass-card'
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-500 text-xs font-semibold text-white">
                    Popular
                  </span>
                )}
                <h3 className="font-manrope font-semibold text-lg text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-manrope font-bold text-3xl text-white">{plan.price}</span>
                  <span className="text-sm text-surface-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-accent-400 font-medium">{plan.credits}</p>

                <ul className="mt-5 flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-surface-300">
                      <Check className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.name === 'Business' ? '/pricing' : ctaPath}
                  className={cn(
                    'mt-6 block text-center py-2.5 rounded-xl text-sm font-semibold transition-all',
                    plan.popular
                      ? 'bg-primary-500 text-white hover:bg-primary-400 shadow-md shadow-primary-500/20'
                      : 'bg-surface-800 text-surface-200 hover:bg-surface-700 border border-surface-700'
                  )}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p variants={fadeUp} className="text-center mt-8 text-sm text-surface-500">
            Need more credits?{' '}
            <Link to="/pricing" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
              Credit packs available
            </Link>
          </motion.p>
        </div>
      </Section>

      {/* ==================== FINAL CTA ==================== */}
      <Section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            variants={fadeUp}
            className="font-manrope font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight"
          >
            Your Dream App Is{' '}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              One Prompt Away
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-lg text-surface-400">
            Join thousands of builders creating apps with AI. No coding required.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8">
            <Link
              to={ctaPath}
              className="shiny-cta inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative z-10 border-t border-surface-800/50 py-10 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="font-manrope font-bold text-xs text-white">A</span>
              </div>
              <span className="font-manrope font-bold text-base text-white">AppX</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-surface-500">
              <Link to="/terms" className="hover:text-surface-300 transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-surface-300 transition-colors">Privacy</Link>
              <Link to="/pricing" className="hover:text-surface-300 transition-colors">Pricing</Link>
            </div>
            <p className="text-sm text-surface-600">&copy; 2025 AppX Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
