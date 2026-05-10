"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What exactly do I get with MaddieHQ?",
    answer:
      "You get a production-ready Next.js application with authentication (email/password, OAuth, 2FA), SQLite database, Stripe subscription billing, transactional email via Resend, a full component library, dark mode, and deployment configuration — all wired up and ready to customize.",
  },
  {
    question: "Is MaddieHQ a SaaS or a template?",
    answer:
      "MaddieHQ is a template you own entirely. Clone the repository, customize it, and deploy it anywhere. There are no ongoing fees for the code itself — you only pay for the Pro plan if you want premium features and priority support.",
  },
  {
    question: "What databases are supported?",
    answer:
      "MaddieHQ ships with SQLite via better-sqlite3 for zero-config local development. The data layer is designed to be swappable — you can migrate to PostgreSQL, MySQL, or any other database when you're ready to scale.",
  },
  {
    question: "Can I use MaddieHQ for commercial projects?",
    answer:
      "Absolutely. MaddieHQ is licensed for both personal and commercial use. Build your startup, client project, or side hustle — there are no restrictions on what you build with it.",
  },
  {
    question: "How does authentication work?",
    answer:
      "MaddieHQ uses Better Auth, a modern authentication library. It supports email/password login, Google and GitHub OAuth, two-factor authentication (TOTP), email verification, and password reset flows — all pre-configured and ready to go.",
  },
  {
    question: "Do I need to set up Stripe separately?",
    answer:
      "Yes, you'll need your own Stripe account (free to create). MaddieHQ provides the complete integration — checkout sessions, webhooks, billing portal, and subscription management. Just add your Stripe API keys and price IDs.",
  },
  {
    question: "How do I deploy MaddieHQ?",
    answer:
      "MaddieHQ includes a Dockerfile, docker-compose configuration, and Caddy server config. Push to GitHub, build the Docker image, and deploy to any VPS, cloud provider, or container platform. You can also deploy to Vercel or similar platforms.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes! The free plan gives you access to core features including authentication, database, and basic deployment configuration. Upgrade to Pro for premium components, priority support, and early access to new features.",
  },
];

/**
 * Accordion-style FAQ section.
 * Each item toggles open/closed independently.
 */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-2xl mx-auto divide-y divide-gray-200 dark:divide-gray-700">
      {faqs.map((faq, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => toggle(i)}
            className="flex items-center justify-between w-full text-left gap-4 group"
            aria-expanded={openIndex === i}
          >
            <span className="text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary/80 dark:group-hover:text-primary/80 transition-colors">
              {faq.question}
            </span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200",
                openIndex === i && "rotate-180"
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-out",
              openIndex === i ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
