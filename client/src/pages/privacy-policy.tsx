import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy"
        description="Read Joblify's privacy policy to understand how we collect, use, and protect your personal data. Your privacy and security are our top priorities."
        keywords="privacy policy, data protection, personal data, Joblify privacy, user data security"
        canonicalUrl="https://joblifyai.com/privacy-policy"
      />
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Joblify</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: February 5, 2026</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Welcome to Joblify ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our AI-powered resume building platform and related services (collectively, the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Joblify, you agree to the terms of this Privacy Policy. If you do not agree with any part of this policy, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you create an account or use our Service, we collect the following personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Account Information: Name, email address, password (encrypted), and account preferences</li>
                <li>Profile Information: Professional title, location, contact information (phone number, LinkedIn profile, website)</li>
                <li>Resume Data: Work experience, education history, skills, certifications, projects, and other career-related information you provide</li>
                <li>Payment Information: Billing details and payment card information (processed securely through our payment processor, Stripe)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.2 AI Chat Interaction Data</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Our unique AI Chat Resume Builder collects and processes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Chat conversations between you and our AI assistant</li>
                <li>Information extracted from your responses to build your resume</li>
                <li>User feedback and corrections to improve AI accuracy</li>
                <li>Conversation history for reference and editing purposes</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Uploaded Documents</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you choose to upload existing resumes or documents:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>File content and metadata from uploaded resumes (PDF, DOCX, etc.)</li>
                <li>LinkedIn profile data if you use our LinkedIn import feature</li>
                <li>Any other documents you voluntarily upload to enhance your resume</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Usage Data</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We automatically collect information about how you interact with our Service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Device information: IP address, browser type, operating system, device identifiers</li>
                <li>Usage patterns: Pages visited, features used, time spent on the platform</li>
                <li>Session data: Login times, session duration, interaction timestamps</li>
                <li>Performance metrics: Load times, error logs, feature utilization</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.5 Cookies and Tracking Technologies</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Maintain your session and keep you logged in</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze usage patterns and improve our Service</li>
                <li>Provide personalized content and features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Collect Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Directly from you:</strong> When you create an account, build resumes, or communicate with our AI</li>
                <li><strong>Automatically:</strong> Through cookies, analytics tools, and server logs as you use our Service</li>
                <li><strong>From third parties:</strong> If you choose to import data from LinkedIn or other connected services</li>
                <li><strong>Through file uploads:</strong> When you upload existing resumes or documents for parsing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use the collected information for the following purposes:
              </p>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Service Provision</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Create, store, and manage your resume data</li>
                <li>Power our AI Chat Resume Builder and provide personalized assistance</li>
                <li>Generate resume documents in various formats (PDF, DOCX)</li>
                <li>Provide ATS optimization and analysis</li>
                <li>Enable resume editing and refinement features</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.2 AI Personalization and Improvement</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Train and improve our AI models to provide better, more accurate assistance</li>
                <li>Adapt questions and suggestions based on your responses and background</li>
                <li>Analyze conversation patterns to enhance the chat experience</li>
                <li>Improve resume suggestions and keyword optimization</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Analytics and Performance</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Monitor and analyze usage patterns to improve our Service</li>
                <li>Identify and fix technical issues</li>
                <li>Conduct research and development for new features</li>
                <li>Generate anonymized, aggregated statistics about Service usage</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.4 Communication</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Send account-related notifications and updates</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send marketing communications (with your consent, where required)</li>
                <li>Notify you of changes to our Service or policies</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.5 Legal Compliance and Security</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Comply with legal obligations and respond to lawful requests</li>
                <li>Prevent fraud, abuse, and security incidents</li>
                <li>Enforce our Terms and Conditions</li>
                <li>Protect the rights and safety of our users and the public</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. How We Store and Protect Your Data</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Data Storage</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your data is stored on secure servers hosted by reputable cloud service providers</li>
                <li>Resume data and chat history are stored in encrypted databases</li>
                <li>We use industry-standard PostgreSQL databases with encryption at rest</li>
                <li>Backups are performed regularly and stored securely</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Security Measures</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using HTTPS/TLS</li>
                <li><strong>Password Security:</strong> Passwords are hashed using industry-standard algorithms (bcrypt) and never stored in plain text</li>
                <li><strong>Access Controls:</strong> Strict access controls limit who can view or modify your data</li>
                <li><strong>Security Headers:</strong> We implement Content-Security-Policy, X-Frame-Options, and other security headers</li>
                <li><strong>Regular Audits:</strong> We conduct regular security audits and vulnerability assessments</li>
                <li><strong>Session Management:</strong> Secure session handling with automatic timeout and CSRF protection</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Data Retention</h3>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide you services. After account deletion, we may retain certain information for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Legal compliance purposes (e.g., tax records) for the period required by law</li>
                <li>Resolving disputes and enforcing agreements</li>
                <li>Aggregated, anonymized analytics that cannot identify you personally</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services and Data Sharing</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We share your information with trusted third-party service providers who assist us in operating our Service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Payment Processing:</strong> Stripe (for secure payment processing)</li>
                <li><strong>AI Services:</strong> OpenAI (for AI chat and resume optimization features)</li>
                <li><strong>Cloud Hosting:</strong> Our hosting providers for infrastructure and storage</li>
                <li><strong>Analytics:</strong> Analytics providers to understand usage patterns (anonymized data)</li>
                <li><strong>Email Services:</strong> Email delivery services for transactional and marketing emails</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                These providers are contractually obligated to protect your data and use it only for the purposes we specify.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will notify you of any such change and provide you with choices regarding your data.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose your information if required by law, court order, or governmental authority, or to protect our rights, property, or safety, or that of our users or the public.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">6.4 No Selling of Data</h3>
              <p className="text-muted-foreground leading-relaxed font-semibold">
                We do not sell, rent, or trade your personal information to third parties for their marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Access and Portability</h3>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to access your personal information and request a copy of your data in a portable format. You can export your resumes at any time through your account dashboard.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Correction and Update</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can update your personal information, resume data, and account settings at any time through your account dashboard or by contacting us.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Deletion</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can delete your account and associated data at any time through account settings. Upon deletion, we will remove your personal information from our active databases, subject to legal retention requirements.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.4 Opt-Out of Marketing</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can opt out of receiving marketing emails by clicking the "unsubscribe" link in any marketing email or by updating your communication preferences in your account settings.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.5 Cookie Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can control cookies through your browser settings. Note that disabling certain cookies may limit your ability to use some features of our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. GDPR Compliance (EU Users)</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you are located in the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Legal Basis:</strong> We process your data based on consent, contract performance, legitimate interests, and legal obligations</li>
                <li><strong>Data Subject Rights:</strong> Right to access, rectification, erasure, restriction, portability, and objection</li>
                <li><strong>Right to Withdraw Consent:</strong> You can withdraw consent at any time without affecting the lawfulness of prior processing</li>
                <li><strong>Right to Lodge a Complaint:</strong> You can file a complaint with your local data protection authority</li>
                <li><strong>Data Transfers:</strong> When transferring data outside the EEA, we ensure adequate safeguards are in place</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. CCPA Compliance (California Users)</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Right to Know:</strong> You can request information about the categories and specific pieces of personal information we collect</li>
                <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
                <li><strong>Right to Opt-Out:</strong> We do not sell personal information, but you can opt out of future sales</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Joblify is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we learn that we have collected information from a child under 16, we will delete that information promptly. If you believe a child under 16 has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws different from your jurisdiction. We ensure that such transfers comply with applicable laws and that adequate safeguards are in place to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Posting the updated policy on our website with a new "Last Updated" date</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a prominent notice on our platform</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Your continued use of Joblify after the effective date of the updated Privacy Policy constitutes acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted/50 p-6 rounded-lg">
                <p className="text-muted-foreground mb-2"><strong>Email:</strong> privacy@joblifyai.com</p>
                <p className="text-muted-foreground"><strong>Response Time:</strong> We aim to respond to all inquiries within 30 days</p>
              </div>
            </section>

            <section className="border-t pt-8">
              <p className="text-sm text-muted-foreground italic">
                This Privacy Policy was last updated on February 5, 2026. We are committed to transparency and protecting your privacy while providing you with the best AI-powered resume building experience.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Joblify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
