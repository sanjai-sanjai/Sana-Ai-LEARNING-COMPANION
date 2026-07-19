import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Users,
  Bot,
  FileText,
  Mail,
  RefreshCw,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Sana AI" },
      {
        name: "description",
        content:
          "Privacy Policy for Sana AI (Mnemora Sync AI). Learn how we collect, use, and protect your data, including Google Authentication, study progress, and AI interactions.",
      },
      { property: "og:title", content: "Privacy Policy | Sana AI" },
      {
        property: "og:description",
        content:
          "Privacy Policy for Sana AI. Learn how we collect, use, and protect your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-lavender/50 pb-20">
      {/* Navigation */}
      <nav className="mx-auto max-w-4xl px-6 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </nav>

      <main className="mx-auto mt-12 w-full max-w-4xl px-6">
        {/* Header */}
        <header className="mb-16 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black text-white shadow-glow gradient-primary">
            S
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your privacy matters to us at Sana AI.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
            <RefreshCw className="h-3.5 w-3.5" /> Last Updated: July 2026
          </div>
        </header>

        {/* Content Sections */}
        <div className="space-y-8">
          <Section icon={<Eye />} title="1. Introduction">
            <p>
              Welcome to <strong>Sana AI</strong> (also known as Mnemora Sync AI). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application. Our mission is to provide you with a personalized, AI-powered learning companion while treating your personal data with the utmost respect and security.
            </p>
          </Section>

          <Section icon={<Database />} title="2. Information We Collect">
            <p>To provide a tailored educational experience, we collect the following types of information:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong>Google Account Information:</strong> When you use Google Authentication to sign in, we collect your name, email address, and profile picture.
              </li>
              <li>
                <strong>Study Data:</strong> Your learning preferences, study progress, roadmaps, notes, and realtime collaboration activities.
              </li>
              <li>
                <strong>Uploaded Resources:</strong> PDFs and other materials you upload for analysis and study purposes.
              </li>
              <li>
                <strong>AI Conversations:</strong> Interactions and prompts sent to the Sana AI assistant to generate personalized learning responses.
              </li>
            </ul>
          </Section>

          <Section icon={<Bot />} title="3. How We Use Your Information">
            <p>Your data is strictly used to improve your educational journey on Sana AI:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
              <li>To create and manage your secure account.</li>
              <li>To provide personalized learning roadmaps and AI recommendations.</li>
              <li>To facilitate the "Study Together" feature and realtime collaboration with peers.</li>
              <li>To analyze uploaded PDFs and provide contextual insights and summaries.</li>
              <li>To monitor platform analytics in order to improve performance and user experience.</li>
            </ul>
          </Section>

          <Section icon={<Lock />} title="4. Google Authentication">
            <p>
              Sana AI utilizes Google OAuth for secure and seamless login. By authenticating with Google, you grant us access only to basic profile information (Name, Email, Profile Picture) required to establish your identity. We do not access your Google Drive, Contacts, or any other sensitive Google services without explicit, separate consent.
            </p>
          </Section>

          <Section icon={<FileText />} title="5. Data Storage and Security">
            <p>
              We implement robust security measures to maintain the safety of your personal information. Your data, including uploaded PDFs and study notes, is stored securely. We use industry-standard encryption protocols during data transmission and at rest. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
            </p>
          </Section>

          <Section icon={<ShieldCheck />} title="6. Data Sharing Policy">
            <p>
              <strong>We do not sell your personal data.</strong> We may only share information with third-party service providers (like our secure database or AI processing APIs) strictly for the purpose of operating Sana AI. All third parties are bound by strict confidentiality agreements and data protection standards.
            </p>
          </Section>

          <Section icon={<Users />} title="7. User Rights and Children's Privacy">
            <p>
              You have the right to access, update, or delete your account and associated data at any time through your profile settings. Because Sana AI is an educational tool, we take children's privacy seriously. We do not knowingly collect personal information from children under 13 without parental consent. If we learn we have collected such information, we will delete it promptly.
            </p>
          </Section>

          <Section icon={<Globe />} title="8. Cookies and Tracking">
            <p>
              We use minimal cookies necessary for the essential functioning of the platform (such as keeping you logged in) and basic analytics to understand how our app is used. We do not use intrusive tracking or marketing cookies.
            </p>
          </Section>

          <Section icon={<RefreshCw />} title="9. Changes to this Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any significant changes by updating the "Last Updated" date at the top of this policy and, when appropriate, through an in-app notification.
            </p>
          </Section>
        </div>

        {/* Contact Section */}
        <div className="mt-16 rounded-3xl bg-primary/5 p-8 text-center shadow-sm border border-primary/10">
          <Mail className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Contact Sana AI Support</h2>
          <p className="mt-2 text-muted-foreground">
            Have questions about your privacy or our data practices?
          </p>
          <a
            href="mailto:support@sana-ai.com"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105 hover:bg-primary/90"
          >
            Email Support
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            Website: <a href="https://sana-ai.com" className="text-primary hover:underline">sana-ai.com</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border/50 bg-background/50 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Sana AI (Mnemora Sync AI). All rights reserved. Version 1.0.0
          </p>
          <div className="flex gap-4 text-sm font-semibold">
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-card sm:p-8 border border-border/50">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}
