import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert prose-surface max-w-none space-y-6">
          <p className="text-surface-300 leading-relaxed">
            Last updated: January 2, 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">1. Information We Collect</h2>
            <p className="text-surface-300 leading-relaxed">
              We collect information you provide directly to us, including your name, email address, 
              and any content you submit through our service. We also automatically collect certain 
              information about your device and usage of our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">2. How We Use Your Information</h2>
            <p className="text-surface-300 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services, 
              to communicate with you, and to personalize your experience. Your design prompts 
              may be used to improve our AI models.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">3. Information Sharing</h2>
            <p className="text-surface-300 leading-relaxed">
              We do not sell your personal information. We may share information with service 
              providers who assist in our operations, when required by law, or in connection 
              with a merger or acquisition.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
            <p className="text-surface-300 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or 
              destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">5. Data Retention</h2>
            <p className="text-surface-300 leading-relaxed">
              We retain your information for as long as your account is active or as needed to 
              provide you services. You may request deletion of your data at any time by 
              contacting us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">6. Your Rights</h2>
            <p className="text-surface-300 leading-relaxed">
              You have the right to access, correct, or delete your personal information. You may 
              also object to or restrict certain processing of your information. To exercise these 
              rights, please contact us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">7. Cookies</h2>
            <p className="text-surface-300 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our service 
              and hold certain information. You can instruct your browser to refuse all cookies 
              or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">8. Changes to This Policy</h2>
            <p className="text-surface-300 leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any 
              changes by posting the new privacy policy on this page and updating the "last 
              updated" date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">9. Contact Us</h2>
            <p className="text-surface-300 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at 
              support@appx.uz
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
