import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Terms and Conditions"
        description="Review Joblify's terms and conditions. Understand the rules and guidelines for using our AI-powered job search platform and career tools."
        keywords="terms and conditions, terms of service, user agreement, Joblify terms, platform rules"
        canonicalUrl="https://joblifyai.com/terms-and-conditions"
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
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-8">Last Updated: February 5, 2026</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Welcome to Joblify. These Terms and Conditions ("Terms," "Agreement") constitute a legally binding agreement between you ("you," "your," "user") and Joblify Inc. ("Joblify," "we," "our," "us") governing your access to and use of the Joblify platform, website, mobile applications, and related services (collectively, the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By accessing, browsing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy, which is incorporated herein by reference. If you do not agree to these Terms, you must not access or use our Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to update, modify, or replace these Terms at any time at our sole discretion. Your continued use of the Service after any such changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Eligibility and Account Registration</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Age Requirement</h3>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 16 years of age to use Joblify. By using our Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into this Agreement.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Account Creation</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To access certain features of our Service, you must create an account. When creating an account, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security and confidentiality of your password</li>
                <li>Notify us immediately of any unauthorized access or security breach</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Account Responsibility</h3>
              <p className="text-muted-foreground leading-relaxed">
                You are solely responsible for maintaining the confidentiality of your account credentials and for all activities conducted through your account. We are not liable for any loss or damage arising from your failure to protect your account information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Joblify provides an AI-powered resume building platform that includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>AI Chat Resume Builder:</strong> A conversational AI assistant that helps you create resumes through natural dialogue</li>
                <li><strong>Traditional Resume Builder:</strong> Form-based resume creation tools with templates</li>
                <li><strong>Resume Editor:</strong> Tools to edit, refine, and customize your resumes</li>
                <li><strong>ATS Scanner:</strong> Analysis tools to optimize resumes for Applicant Tracking Systems</li>
                <li><strong>Cover Letter Generator:</strong> AI-assisted cover letter creation</li>
                <li><strong>Export Features:</strong> Ability to download resumes in PDF and DOCX formats</li>
                <li><strong>Professional Export:</strong> Download your resume in multiple formats (PDF, DOCX)</li>
                <li><strong>Additional Features:</strong> Other tools and services we may introduce from time to time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Permitted Use</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may use Joblify solely for lawful purposes in connection with creating professional resumes, cover letters, and related career development materials for your personal or professional use.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Prohibited Activities</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree NOT to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Use the Service for any illegal, fraudulent, or unauthorized purpose</li>
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Upload false, misleading, or fraudulent information</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers/networks connected to the Service</li>
                <li>Use automated systems (bots, scrapers) to access or extract data from the Service without permission</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Remove, obscure, or alter any copyright or proprietary notices</li>
                <li>Transmit viruses, malware, or other harmful code</li>
                <li>Harass, abuse, threaten, or harm others</li>
                <li>Resell, sublicense, or redistribute the Service without our written consent</li>
                <li>Use the Service to create resumes on behalf of others as a commercial service without a proper license</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Enforcement</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to investigate violations of these Terms and take appropriate action, including suspending or terminating accounts, removing content, and reporting illegal activity to law enforcement authorities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Joblify's Intellectual Property</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                The Service, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Software, code, algorithms, and AI models</li>
                <li>Website design, graphics, logos, and branding</li>
                <li>Resume templates and formatting tools</li>
                <li>Text, content, and documentation</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                ...are owned by Joblify or our licensors and are protected by copyright and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable license to use the Service solely for your personal, non-commercial purposes, subject to these Terms.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">5.2 User-Generated Content</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You retain ownership of the content you create using our Service, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Resume content (work experience, education, skills, etc.)</li>
                <li>Cover letters and personal statements</li>
                <li>Uploaded documents and files</li>
                <li>Chat conversations with our AI (collectively, "User Content")</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">5.3 License to Joblify</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                By creating or uploading User Content, you grant Joblify a worldwide, non-exclusive, royalty-free, transferable license to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Store, process, and display your User Content to provide the Service to you</li>
                <li>Use your User Content to train and improve our AI models (in anonymized, aggregated form)</li>
                <li>Create derivative works (e.g., formatted resumes, optimized content) based on your User Content</li>
                <li>Perform technical operations necessary to offer the Service</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                This license terminates when you delete your User Content or close your account, except for content that has been anonymized or aggregated for AI training purposes.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">5.4 User Content Representations</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You own or have the necessary rights to your User Content</li>
                <li>Your User Content does not violate any third-party rights (intellectual property, privacy, etc.)</li>
                <li>Your User Content is accurate and not fraudulent or misleading</li>
                <li>Your User Content complies with these Terms and applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. AI-Generated Content Disclaimers</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Nature of AI Assistance</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI Chat Resume Builder and other AI-powered features use artificial intelligence to assist you in creating resumes and related content. While we strive for accuracy and quality, AI-generated content may contain errors, inaccuracies, or inappropriate suggestions.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">6.2 User Responsibility</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You are solely responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Reviewing and verifying all AI-generated content before use</li>
                <li>Ensuring the accuracy and truthfulness of information in your resume</li>
                <li>Complying with any applicable laws or regulations regarding resume content</li>
                <li>The final content and presentation of your resumes and cover letters</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">6.3 No Guarantee of Results</h3>
              <p className="text-muted-foreground leading-relaxed">
                While our AI is designed to help you create effective resumes, we make no guarantees regarding:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Interview invitations or job offers</li>
                <li>Success in passing ATS systems</li>
                <li>Hiring decisions by employers</li>
                <li>Any specific outcomes from using our Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Subscription Plans and Payments</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Pricing and Plans</h3>
              <p className="text-muted-foreground leading-relaxed">
                Joblify offers both free and paid subscription plans. Current pricing and plan details are available on our pricing page. We reserve the right to modify our pricing, features, and plans at any time with advance notice to active subscribers.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Payment Terms</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Paid subscriptions are billed in advance on a recurring basis (monthly or annually)</li>
                <li>All fees are non-refundable except as required by law or as explicitly stated in our refund policy</li>
                <li>You authorize us to charge your payment method for all fees incurred</li>
                <li>Payment processing is handled securely through our third-party payment processor (Stripe)</li>
                <li>Prices are stated in US dollars unless otherwise specified</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Auto-Renewal</h3>
              <p className="text-muted-foreground leading-relaxed">
                Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You will be charged the then-current subscription fee. You can cancel auto-renewal at any time through your account settings.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.4 Failed Payments</h3>
              <p className="text-muted-foreground leading-relaxed">
                If a payment fails, we may suspend your access to paid features until payment is received. We may attempt to re-charge your payment method. After multiple failed payment attempts, your subscription may be cancelled.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">7.5 Free Trial</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may offer free trials for paid plans. At the end of the trial period, you will be automatically charged for the subscription unless you cancel before the trial ends. Free trial eligibility is limited to new users and may be subject to additional terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Refund Policy</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Our refund policy is as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Renewal Charges:</strong> Renewal charges are generally non-refundable, but we may offer refunds on a case-by-case basis for accidental renewals reported within 7 days</li>
                <li><strong>Partial Refunds:</strong> We do not offer pro-rated refunds for partial billing periods</li>
                <li><strong>Refund Process:</strong> To request a refund, contact our support team at privacy@joblifyai.com with your account details and reason for the request</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Service Availability and Modifications</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">9.1 Service Availability</h3>
              <p className="text-muted-foreground leading-relaxed">
                We strive to provide reliable, uninterrupted access to our Service, but we do not guarantee that the Service will be available at all times. The Service may be subject to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Scheduled maintenance and updates</li>
                <li>Unscheduled downtime or technical issues</li>
                <li>Third-party service disruptions</li>
                <li>Force majeure events beyond our control</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">9.2 Service Modifications</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. This includes adding or removing features, changing functionality, or altering the user interface. We are not liable for any modifications, suspensions, or discontinuations of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOBLIFY, ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES, AND LICENSORS SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                <li>LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES</li>
                <li>DAMAGES RESULTING FROM YOUR USE OR INABILITY TO USE THE SERVICE</li>
                <li>DAMAGES RESULTING FROM AI-GENERATED CONTENT OR RESUME SUGGESTIONS</li>
                <li>DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT</li>
                <li>DAMAGES RESULTING FROM ERRORS, BUGS, OR SERVICE INTERRUPTIONS</li>
                <li>DAMAGES ARISING FROM THIRD-PARTY ACTIONS OR CONTENT</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS RELATED TO THE SERVICE EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless Joblify, its officers, directors, employees, affiliates, licensors, and service providers from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or related to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Your use or misuse of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your User Content or any content you submit</li>
                <li>Your violation of any third-party rights, including intellectual property, privacy, or other rights</li>
                <li>Your violation of any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Disclaimers and Warranties</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">12.1 Service "As Is"</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, JOBLIFY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT</li>
                <li>WARRANTIES REGARDING ACCURACY, RELIABILITY, OR AVAILABILITY OF THE SERVICE</li>
                <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE</li>
                <li>WARRANTIES REGARDING THE QUALITY OR EFFECTIVENESS OF AI-GENERATED CONTENT</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">12.2 Third-Party Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service may contain links to third-party websites, job boards, or services. We do not endorse, warrant, or assume responsibility for any third-party content, products, or services. Your use of third-party services is at your own risk and subject to their terms and policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">13.1 Termination by You</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by accessing your account settings and following the account deletion process, or by contacting our support team. Upon termination, your access to the Service will cease, and your User Content may be deleted in accordance with our data retention policies.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">13.2 Termination by Us</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We reserve the right to suspend or terminate your account and access to the Service at any time, with or without notice, for any reason, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Violation of these Terms or our policies</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>Non-payment of fees</li>
                <li>Extended inactivity</li>
                <li>To comply with legal requirements or court orders</li>
                <li>At our sole discretion for any other reason</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">13.3 Effect of Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination, your right to use the Service immediately ceases. Sections of these Terms that by their nature should survive termination (including but not limited to intellectual property provisions, disclaimers, limitations of liability, and dispute resolution) shall survive termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution and Governing Law</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">14.1 Governing Law</h3>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">14.2 Informal Resolution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Before filing a claim, you agree to contact us at privacy@joblifyai.com to attempt to resolve the dispute informally. We will work in good faith to resolve the matter within 60 days.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">14.3 Arbitration Agreement</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If informal resolution is unsuccessful, you agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association's rules, except as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Arbitration shall be conducted in San Francisco, California, or remotely via video conference</li>
                <li>Either party may seek injunctive relief in court to prevent harm or protect intellectual property rights</li>
                <li>Small claims court disputes are exempt from arbitration</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6">14.4 Class Action Waiver</h3>
              <p className="text-muted-foreground leading-relaxed">
                TO THE EXTENT PERMITTED BY LAW, YOU AGREE THAT ANY DISPUTE SHALL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">14.5 Jurisdiction and Venue</h3>
              <p className="text-muted-foreground leading-relaxed">
                If arbitration does not apply, you agree to submit to the personal and exclusive jurisdiction of the state and federal courts located in San Francisco County, California.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. General Provisions</h2>
              
              <h3 className="text-xl font-semibold mb-3 mt-6">15.1 Entire Agreement</h3>
              <p className="text-muted-foreground leading-relaxed">
                These Terms, together with our Privacy Policy and any additional terms or policies referenced herein, constitute the entire agreement between you and Joblify regarding your use of the Service.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">15.2 Severability</h3>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">15.3 Waiver</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">15.4 Assignment</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may not assign or transfer these Terms or your account without our prior written consent. We may assign or transfer these Terms and our rights and obligations without restriction.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">15.5 Force Majeure</h3>
              <p className="text-muted-foreground leading-relaxed">
                We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, pandemics, or government actions.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6">15.6 Export Compliance</h3>
              <p className="text-muted-foreground leading-relaxed">
                You agree to comply with all applicable export and import control laws and regulations in your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you have questions, concerns, or feedback regarding these Terms or our Service, please contact us:
              </p>
              <div className="bg-muted/50 p-6 rounded-lg">
                <p className="text-muted-foreground mb-2"><strong>Email:</strong> privacy@joblifyai.com</p>
                <p className="text-muted-foreground"><strong>Response Time:</strong> We aim to respond to all inquiries within 2-3 business days</p>
              </div>
            </section>

            <section className="border-t pt-8">
              <p className="text-sm text-muted-foreground italic">
                These Terms and Conditions were last updated on February 5, 2026. By continuing to use Joblify after this date, you acknowledge and agree to these Terms.
              </p>
              <p className="text-sm text-muted-foreground italic mt-4">
                Thank you for choosing Joblify. We're committed to helping you build exceptional resumes and advance your career.
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
