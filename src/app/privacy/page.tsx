import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tickly',
  description: 'Privacy Policy for Tickly task management application',
};

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 19, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p className="text-foreground leading-relaxed">
                Tickly ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains
                how we collect, use, disclose, and safeguard your information when you use our task management
                application and related services (collectively, the "Service").
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.1 Information You Provide</h3>
              <p className="text-foreground leading-relaxed mb-3">We collect information that you provide directly to us:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li><strong>Account Information:</strong> Name, email address, password (hashed), and language preference</li>
                <li><strong>Content:</strong> Tasks, projects, comments, subtasks, and any other content you create or upload</li>
                <li><strong>Preferences:</strong> User preferences and settings you configure</li>
                <li><strong>Feedback:</strong> Information you provide when contacting us or submitting feedback</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <p className="text-foreground leading-relaxed mb-3">When you use the Service, we automatically collect:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li><strong>Usage Data:</strong> Information about how you interact with the Service</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                <li><strong>Log Data:</strong> Server logs, including timestamps, request types, and error information</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p className="text-foreground leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process your transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Information Sharing and Disclosure</h2>
              <p className="text-foreground leading-relaxed mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your
                information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>
                  <strong>Service Providers:</strong> We may share information with third-party service providers who
                  perform services on our behalf (e.g., hosting, analytics, email delivery)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose information if required by law or in response to
                  valid requests by public authorities
                </li>
                <li>
                  <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your
                  information may be transferred as part of that transaction
                </li>
                <li>
                  <strong>With Your Consent:</strong> We may share information for any other purpose with your explicit
                  consent
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Data Security</h2>
              <p className="text-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against
                unauthorized access, alteration, disclosure, or destruction. These measures include encryption,
                secure authentication, regular security assessments, and access controls. However, no method of
                transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute
                security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Data Retention</h2>
              <p className="text-foreground leading-relaxed">
                We retain your personal information for as long as necessary to provide the Service and fulfill the
                purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by
                law. When you delete your account, we will delete or anonymize your personal information, except where
                we are required to retain it for legal or legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Your Rights and Choices</h2>
              <p className="text-foreground leading-relaxed mb-3">Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-3">
                To exercise these rights, please contact us at{' '}
                <a
                  href="mailto:support@tickly.one"
                  className="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  support@tickly.one
                </a>
                . We will respond to your request within a reasonable timeframe.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. Cookies and Tracking Technologies</h2>
              <p className="text-foreground leading-relaxed">
                We use cookies and similar tracking technologies to track activity on the Service and store certain
                information. Cookies are small data files stored on your device. You can instruct your browser to refuse
                all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may
                not be able to use some portions of our Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. Third-Party Services</h2>
              <p className="text-foreground leading-relaxed">
                The Service may contain links to third-party websites or services that are not owned or controlled by
                us. We are not responsible for the privacy practices of such third parties. We encourage you to read
                the privacy policies of any third-party services you access.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Children's Privacy</h2>
              <p className="text-foreground leading-relaxed">
                The Service is not intended for children under the age of 13. We do not knowingly collect personal
                information from children under 13. If you become aware that a child has provided us with personal
                information, please contact us, and we will take steps to delete such information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">11. International Data Transfers</h2>
              <p className="text-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have data protection laws that differ from those in your country. By using the
                Service, you consent to the transfer of your information to these countries.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">12. Changes to This Privacy Policy</h2>
              <p className="text-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
                new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this
                Privacy Policy periodically for any changes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">13. Contact Us</h2>
              <p className="text-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at{' '}
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
