import Link from "next/link";
import {
  Sprout,
  Shield,
  Database,
  Zap,
  CreditCard,
  Mail,
  Palette,
  Terminal,
  ArrowRight,
  Check,
  Star,
  Github,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/header";
import { Faq } from "@/components/landing/faq";
import { NewsletterSignup } from "@/components/landing/newsletter";
import { WaitlistSignup } from "@/components/landing/waitlist-signup";

const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

/* ---------- JSON-LD Structured Data ---------- */

const siteUrl = process.env.BETTER_AUTH_URL || "https://maddiehq.example.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "MaddieHQ",
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      description:
        "Production-ready Next.js starter with auth, database, payments, and email.",
    },
    {
      "@type": "WebSite",
      name: "MaddieHQ",
      url: siteUrl,
    },
    {
      "@type": "SoftwareApplication",
      name: "MaddieHQ",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free plan with core features",
        },
        {
          "@type": "Offer",
          price: "49",
          priceCurrency: "USD",
          description: "Pro plan with premium features",
        },
      ],
    },
  ],
};

/* ---------- Data ---------- */

const features = [
  {
    icon: Shield,
    title: "Authentication",
    description:
      "Email/password, Google & GitHub OAuth, two-factor auth, email verification, and password reset — all pre-built.",
  },
  {
    icon: Database,
    title: "Database Ready",
    description:
      "SQLite via better-sqlite3 for instant local dev. Migration scripts included. Swap to Postgres when you scale.",
  },
  {
    icon: CreditCard,
    title: "Stripe Payments",
    description:
      "Checkout sessions, webhooks, billing portal, and subscription management wired up end-to-end.",
  },
  {
    icon: Mail,
    title: "Transactional Email",
    description:
      "Resend integration for verification emails, password resets, and any transactional messages you need.",
  },
  {
    icon: Palette,
    title: "Component Library",
    description:
      "Buttons, modals, cards, tables, badges, alerts, tabs — a complete dark-mode-ready UI kit.",
  },
  {
    icon: Terminal,
    title: "Developer Experience",
    description:
      "TypeScript, Tailwind CSS v4, ESLint, Vitest, Playwright, and Turbopack — modern tooling out of the box.",
  },
  {
    icon: Zap,
    title: "Deploy Anywhere",
    description:
      "Dockerfile, docker-compose, and Caddy config included. Push, build, and go live in minutes.",
  },
  {
    icon: Sprout,
    title: "Open & Extensible",
    description:
      "No vendor lock-in. You own the code. Extend, customize, or rip out whatever you don't need.",
  },
];

const steps = [
  {
    step: "01",
    title: "Clone & Configure",
    description:
      "Clone the repo, add your environment variables, and run the dev server. You're up in under 2 minutes.",
  },
  {
    step: "02",
    title: "Customize & Build",
    description:
      "Swap in your brand, add your features, and build on top of the pre-configured auth, database, and payments.",
  },
  {
    step: "03",
    title: "Deploy & Launch",
    description:
      "Push to GitHub, build the Docker image, and deploy to any cloud. Your app is live and ready for users.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start building.",
    badge: null as string | null,
    features: [
      "Authentication (email, OAuth, 2FA)",
      "SQLite database with migrations",
      "Stripe payment integration",
      "Transactional email (Resend)",
      "Component library",
      "Dark mode support",
      "Docker deployment config",
      "Community support",
    ],
    cta: "Get Started Free",
    href: "/auth?tab=signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "one-time",
    description: "All Pro features, forever. One payment, lifetime access.",
    badge: "LIFETIME DEAL",
    features: [
      "Everything in Free, plus:",
      "Premium UI components",
      "Advanced analytics dashboard",
      "Priority email support",
      "Early access to new features",
      "Blog & changelog with MDX",
      "SEO infrastructure",
      "Lifetime updates — no subscription",
    ],
    cta: "Get Lifetime Access",
    href: "/auth?tab=signup",
    highlighted: true,
  },
];

const testimonials = [
  {
    quote:
      "MaddieHQ saved me weeks of boilerplate setup. I had auth, payments, and email working in an afternoon.",
    author: "Sarah Chen",
    role: "Indie Developer",
    avatar: "SC",
  },
  {
    quote:
      "The code quality is excellent. It's exactly how I would structure a project, just already done for me.",
    author: "Marcus Johnson",
    role: "Senior Engineer at Startup",
    avatar: "MJ",
  },
  {
    quote:
      "I've tried a dozen Next.js starters. MaddieHQ is the first one that actually felt production-ready out of the box.",
    author: "Priya Patel",
    role: "Freelance Developer",
    avatar: "PP",
  },
];

/* ---------- Page ---------- */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 scroll-smooth">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      {/* ───── Hero ───── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-white to-white /20 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent border border-accent text-accent-foreground text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Sprout className="w-3.5 h-3.5" />
            The Next.js starter for builders
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight leading-[1.1] mb-6">
            Ship your next idea
            <br />
            <span className="text-primary">
              in days, not months.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            MaddieHQ is a production-ready Next.js starter with auth, database,
            payments, and email already wired up. Stop rebuilding the same
            infrastructure — start building your product.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {!WAITLIST_MODE && (
              <Link
                href="/auth?tab=signup"
                className="inline-flex items-center gap-2 bg-primary text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-base shadow-lg shadow-primary/20"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {WAITLIST_MODE && (
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 bg-primary text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-base shadow-lg shadow-primary/20"
              >
                Join the Waitlist
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-base"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 fill-amber-400 text-amber-400"
                />
              ))}
              <span className="ml-1.5">5.0 from 200+ developers</span>
            </div>
            <span className="hidden sm:block">·</span>
            <span>Used by 1,000+ projects worldwide</span>
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Everything you need to launch
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Stop wiring up auth, payments, and infrastructure from scratch.
              MaddieHQ gives you a head start with production-ready features.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary/90 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section
        id="how-it-works"
        className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Up and running in 3 steps
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              From clone to production in minutes, not weeks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center md:text-left">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px bg-gradient-to-r from-primary to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-5">
                  <span className="text-2xl font-bold text-primary">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Start free, upgrade when you need premium features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-primary text-white ring-4 ring-ring/20 /20 shadow-xl shadow-primary/20"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge ?? "MOST POPULAR"}
                  </div>
                )}

                <h3
                  className={`text-lg font-semibold mb-1 ${
                    plan.highlighted
                      ? "text-white"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-5 ${
                    plan.highlighted
                      ? "text-accent-foreground"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className={`text-4xl font-extrabold ${
                      plan.highlighted
                        ? "text-white"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlighted
                        ? "text-accent-foreground"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    /{plan.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.highlighted
                            ? "text-accent-foreground"
                            : "text-primary"
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted
                            ? "text-accent-foreground"
                            : "text-gray-600 dark:text-gray-300"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlighted
                      ? "bg-white text-primary hover:bg-primary/90"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Loved by developers
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Hear from the builders shipping with MaddieHQ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <blockquote className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.author}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Everything you need to know about MaddieHQ.
            </p>
          </div>

          <Faq />
        </div>
      </section>

      {/* ───── Waitlist / Newsletter ───── */}
      {WAITLIST_MODE ? (
        <div id="waitlist">
          <WaitlistSignup />
        </div>
      ) : (
        <NewsletterSignup />
      )}

      {/* ───── CTA Footer ───── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary to-primary ">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Sprout className="w-10 h-10 text-accent-foreground mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Ready to build something great?
          </h2>
          <p className="text-lg text-accent-foreground mb-8 max-w-lg mx-auto">
            Join thousands of developers shipping faster with MaddieHQ. Your next
            idea is just a clone away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {WAITLIST_MODE ? (
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 bg-white text-primary px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-base"
              >
                Join the Waitlist
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <Link
                href="/auth?tab=signup"
                className="inline-flex items-center gap-2 bg-white text-primary px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-base"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Sprout className="w-5 h-5 text-primary" />
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  MaddieHQ
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The production-ready Next.js starter for modern web apps.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a href="#features" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <Link href="/privacy-policy" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Connect
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} MaddieHQ. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Built with Next.js, Tailwind CSS, and a lot of coffee.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
