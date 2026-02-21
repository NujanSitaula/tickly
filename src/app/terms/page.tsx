import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Tickly',
  description: 'Terms of Service for Tickly task management application',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span>Tickly</span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8" tabIndex={-1}>
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p className="text-foreground leading-relaxed">
                By accessing and using Tickly ("the Service"), you accept and agree to be bound by the terms and
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p className="text-foreground leading-relaxed">
                Tickly is a task and project management application that allows users to organize, track, and manage
                their tasks and projects. The Service is provided "as is" and "as available" without warranties of
                any kind.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. User Accounts</h2>
              <p className="text-foreground leading-relaxed mb-3">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and identification</li>
                <li>Accept all responsibility for activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. User Content</h2>
              <p className="text-foreground leading-relaxed mb-3">
                You retain ownership of all content you create, upload, or store using the Service ("User Content").
                By using the Service, you grant us a limited, non-exclusive license to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>Store, process, and display your User Content as necessary to provide the Service</li>
                <li>Use your User Content to improve and maintain the Service</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                You are solely responsible for your User Content and agree not to upload content that is illegal,
                harmful, or violates any third-party rights.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
              <p className="text-foreground leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Transmit any viruses, malware, or harmful code</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Privacy</h2>
              <p className="text-foreground leading-relaxed">
                Your use of the Service is also governed by our{' '}
                <Link href="/privacy" className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
                  Privacy Policy
                </Link>
                . Please review it to understand how we collect, use, and protect your information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Account Termination</h2>
              <p className="text-foreground leading-relaxed">
                You may delete your account at any time through your account settings. We reserve the right to suspend
                or terminate your account if you violate these Terms or engage in any fraudulent, abusive, or illegal
                activity. Upon termination, your right to use the Service will immediately cease.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Intellectual Property</h2>
              <p className="text-foreground leading-relaxed">
                The Service, including its original content, features, and functionality, is owned by Tickly and is
                protected by international copyright, trademark, patent, trade secret, and other intellectual property
                laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our express
                written permission.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. Disclaimers</h2>
              <p className="text-foreground leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or
                implied. We do not warrant that the Service will be uninterrupted, secure, or error-free. We are not
                responsible for any loss or damage resulting from your use of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Limitation of Liability</h2>
              <p className="text-foreground leading-relaxed">
                To the maximum extent permitted by law, Tickly shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred
                directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from
                your use of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">11. Changes to Terms</h2>
              <p className="text-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by
                posting the new Terms on this page and updating the "Last updated" date. Your continued use of the
                Service after such modifications constitutes acceptance of the updated Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">12. Contact Information</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at{' '}
                <a
                  href="mailto:support@tickly.one"
                  className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  support@tickly.one
                </a>
                .
              </p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tickly
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
