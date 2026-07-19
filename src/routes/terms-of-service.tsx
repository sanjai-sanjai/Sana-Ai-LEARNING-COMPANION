import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  User,
  GraduationCap,
  MessageSquare,
  UploadCloud,
  Cpu,
  ShieldAlert,
  XCircle,
  Mail,
  RefreshCw,
  Scale,
} from "lucide-react";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Sana AI" },
      {
        name: "description",
        content:
          "Terms of Service for Sana AI (Mnemora Sync AI). Read about your responsibilities, our educational policies, AI disclaimers, and community guidelines.",
      },
      { property: "og:title", content: "Terms of Service | Sana AI" },
      {
        property: "og:description",
        content:
          "Terms of Service for Sana AI. Read about your responsibilities and our educational policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsOfService,
});

function TermsOfService() {
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
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Please read these terms carefully before using Sana AI.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
            <RefreshCw className="h-3.5 w-3.5" /> Last Updated: July 2026
          </div>
        </header>

        {/* Content Sections */}
        <div className="space-y-8">
          <Section icon={<CheckCircle />} title="1. Acceptance of Terms">
            <p>
              By accessing and using <strong>Sana AI</strong> (also known as Mnemora Sync AI), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of those changes.
            </p>
          </Section>

          <Section icon={<User />} title="2. Account Responsibility">
            <p>
              When you create an account with us, typically via Google Authentication, you guarantee that the information you provide is accurate and complete. You are responsible for safeguarding the password and the Google account you use to access Sana AI. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </Section>

          <Section icon={<GraduationCap />} title="3. Educational Purpose">
            <p>
              Sana AI is strictly an educational platform designed to assist users in learning, studying, and understanding new topics. It is not intended to replace formal education, professional advice, or verified academic instruction. The tools provided, including AI tutoring and roadmaps, are for supplementary educational use only.
            </p>
          </Section>

          <Section icon={<MessageSquare />} title="4. Study Together Rules">
            <p>When using our collaborative features like "Study Together", you agree to follow our community guidelines:</p>
            <ul className="mt-3 list-inside list-disc space-y-2 text-muted-foreground">
              <li>Be respectful and constructive with your peers.</li>
              <li>Do not share explicit, offensive, or harmful content.</li>
              <li>Do not spam or disrupt the learning environment.</li>
              <li>Respect the intellectual property and privacy of others.</li>
            </ul>
          </Section>

          <Section icon={<UploadCloud />} title="5. Resource Upload Policy">
            <p>
              You may upload resources such as PDFs to Sana AI for analysis and study. By uploading, you confirm that you have the right to use and share these documents. You retain full ownership of your uploaded content. However, you grant Sana AI a temporary license to parse and process the documents solely to provide you with the AI-generated study aids and summaries you request.
            </p>
          </Section>

          <Section icon={<Cpu />} title="6. AI Generated Content Disclaimer">
            <p>
              Sana AI uses artificial intelligence to generate explanations, summaries, quizzes, and learning roadmaps. While we strive for accuracy, AI can sometimes produce incorrect, incomplete, or biased information (commonly known as "hallucinations"). You should always verify critical information against authoritative sources. Sana AI is not liable for errors in AI-generated content.
            </p>
          </Section>

          <Section icon={<ShieldAlert />} title="7. Limitation of Liability">
            <p>
              In no event shall Sana AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
          </Section>

          <Section icon={<Scale />} title="8. Intellectual Property">
            <p>
              The Sana AI platform, including its original content (excluding user-uploaded PDFs), features, design, and functionality, are and will remain the exclusive property of Sana AI and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Sana AI.
            </p>
          </Section>

          <Section icon={<XCircle />} title="9. Termination">
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms of Service. Upon termination, your right to use the Service will immediately cease.
            </p>
          </Section>
        </div>

        {/* Contact Section */}
        <div className="mt-16 rounded-3xl bg-primary/5 p-8 text-center shadow-sm border border-primary/10">
          <Mail className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">Contact Sana AI Support</h2>
          <p className="mt-2 text-muted-foreground">
            Have questions about these terms or your responsibilities?
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
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-primary hover:underline">
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
