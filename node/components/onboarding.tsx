"use client";

import { useState, useEffect } from "react";
import { Sprout, Zap, Shield, Database, ArrowRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "maddiehq-onboarding-completed";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to MaddieHQ!",
    description:
      "You've just launched your new app with authentication, database, payments, and email all wired up and ready to go.",
    icon: <Sprout className="w-8 h-8 text-primary" />,
  },
  {
    title: "Built-in Security",
    description:
      "Your app comes with secure authentication including OAuth providers, email/password login, two-factor authentication, and password reset flows.",
    icon: <Shield className="w-8 h-8 text-primary" />,
  },
  {
    title: "Database Ready",
    description:
      "SQLite is set up with better-sqlite3 for fast local development. Add tables, create API routes, and start building your data layer immediately.",
    icon: <Database className="w-8 h-8 text-primary" />,
  },
  {
    title: "You're All Set!",
    description:
      "Start building by editing the dashboard page. Your app is ready for development with Stripe payments, email (Resend), and everything configured.",
    icon: <Zap className="w-8 h-8 text-primary" />,
  },
];

export interface OnboardingProps {
  /** User's plan type (affects messaging) */
  plan?: "free" | "pro" | "trial";
  /** Called when onboarding completes or is skipped */
  onComplete?: () => void;
}

/**
 * Onboarding flow for new users.
 * Detects first visit and shows a multi-step guided tour.
 * Completion is persisted in localStorage.
 *
 * @example
 * ```tsx
 * <Onboarding plan="free" onComplete={() => console.log("done")} />
 * ```
 */
export function Onboarding({ plan = "free", onComplete }: OnboardingProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Detect first visit
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setShow(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!show) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                    ? "w-3 bg-primary"
                    : "w-3 bg-gray-200 dark:bg-gray-600"
                )}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step content */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mx-auto mb-4">
            {current.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {current.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {current.description}
          </p>
          {step === 0 && plan === "free" && (
            <p className="text-xs text-primary mt-3 font-medium">
              You&apos;re on the free plan. Upgrade anytime for full access.
            </p>
          )}
          {step === 0 && plan === "trial" && (
            <p className="text-xs text-primary mt-3 font-medium">
              You&apos;re on a free trial. Explore everything!
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            icon={isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            className="flex-1"
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="w-full mt-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}
