import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-surface-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-surface max-w-none space-y-6">
          <p className="text-surface-300 leading-relaxed">
            Last updated: January 2, 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="text-surface-300 leading-relaxed">
              By accessing and using AppX, you accept and agree to be bound by the terms and
              provisions of this agreement. If you do not agree to abide by these terms, please do
              not use this service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
            <p className="text-surface-300 leading-relaxed">
              AppX is an AI-powered mobile app builder that creates production-ready React Native
              apps based on text descriptions. The service includes app generation, live preview,
              and export capabilities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">3. User Accounts</h2>
            <p className="text-surface-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account. You agree to notify us 
              immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">4. Intellectual Property</h2>
            <p className="text-surface-300 leading-relaxed">
              Designs generated through our service are owned by you and may be used for commercial 
              purposes. However, the underlying AI models, algorithms, and platform remain the 
              property of AppX Inc.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">5. Acceptable Use</h2>
            <p className="text-surface-300 leading-relaxed">
              You agree not to use the service to generate content that is illegal, harmful, 
              threatening, abusive, harassing, defamatory, or otherwise objectionable.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">6. Limitation of Liability</h2>
            <p className="text-surface-300 leading-relaxed">
              AppX Inc. shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">7. Changes to Terms</h2>
            <p className="text-surface-300 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting. Your continued use of the service constitutes acceptance 
              of the modified terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">8. Contact</h2>
            <p className="text-surface-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at 
              support@appx.uz
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
