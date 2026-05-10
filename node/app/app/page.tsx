"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Sprout, LogOut, Star, ExternalLink, Lock, Settings, Sun, Moon, Monitor, MessageSquare } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/lib/use-toast";
import { commandRegistry } from "@/lib/commands";
import { Onboarding } from "@/components/onboarding";

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModalContent({ onDismiss }: { onDismiss: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      toast.error("Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ul className="space-y-3 mb-6">
        {[
          { icon: "\u221E", text: "Unlimited access to all features" },
          { icon: "\uD83D\uDE80", text: "Priority support" },
          { icon: "\u2728", text: "Early access to new features" },
        ].map((f) => (
          <li key={f.text} className="flex items-center gap-3">
            <span className="w-7 h-7 bg-accent text-primary rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              {f.icon}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{f.text}</span>
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        size="lg"
        loading={loading}
        icon={<ExternalLink className="w-4 h-4" />}
        onClick={handleUpgrade}
        className="w-full mb-3"
      >
        Upgrade now
      </Button>
      <button
        onClick={onDismiss}
        className="w-full text-gray-400 dark:text-gray-500 text-sm hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        Maybe later
      </button>
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AppPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBannerDismissed, setUpgradeBannerDismissed] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [verifiedBanner, setVerifiedBanner] = useState(false);

  const isPro = plan === "pro";

  const loadPlanStatus = useCallback(async () => {
    const res = await fetch("/api/stripe/status");
    if (res.ok) {
      const data = await res.json();
      setPlan(data.plan ?? "free");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const { data: session } = await authClient.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUserEmail(session.user.email);
        await loadPlanStatus();
      } catch {
        router.push("/auth");
      } finally {
        setAuthLoading(false);
      }
    }
    init();
  }, [router, loadPlanStatus]);

  // Register commands
  useEffect(() => {
    const commands = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        category: "Navigation",
        icon: <Sprout className="w-4 h-4" />,
        keywords: ["home", "main"],
        action: () => router.push("/app"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        category: "Navigation",
        icon: <Settings className="w-4 h-4" />,
        keywords: ["preferences", "account"],
        action: () => router.push("/settings"),
      },
      {
        id: "action-signout",
        label: "Sign Out",
        category: "Actions",
        icon: <LogOut className="w-4 h-4" />,
        keywords: ["logout", "exit"],
        action: async () => {
          await authClient.signOut();
          router.push("/auth");
        },
      },
      {
        id: "action-theme-light",
        label: "Switch to Light Mode",
        category: "Actions",
        icon: <Sun className="w-4 h-4" />,
        keywords: ["theme", "appearance"],
        action: () => {
          localStorage.setItem("maddiehq-theme", "light");
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add("light");
          window.location.reload();
        },
      },
      {
        id: "action-theme-dark",
        label: "Switch to Dark Mode",
        category: "Actions",
        icon: <Moon className="w-4 h-4" />,
        keywords: ["theme", "appearance"],
        action: () => {
          localStorage.setItem("maddiehq-theme", "dark");
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add("dark");
          window.location.reload();
        },
      },
      {
        id: "action-theme-system",
        label: "Use System Theme",
        category: "Actions",
        icon: <Monitor className="w-4 h-4" />,
        keywords: ["theme", "appearance", "auto"],
        action: () => {
          localStorage.setItem("maddiehq-theme", "system");
          window.location.reload();
        },
      },
    ];

    commandRegistry.registerAll(commands);
    return () => commands.forEach((c) => commandRegistry.unregister(c.id));
  }, [router]);

  // Detect ?upgraded=1 and ?verified=1 params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      loadPlanStatus();
      toast.success("Welcome to Pro! Your upgrade is complete.");
      window.history.replaceState({}, "", "/app");
    }
    if (params.get("verified") === "1") {
      setVerifiedBanner(true);
      window.history.replaceState({}, "", "/app");
    }
  }, [loadPlanStatus]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal");
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch {
      toast.error("Could not open subscription portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Skeleton circle width="w-8" height="h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Onboarding for new users */}
      <Onboarding plan={isPro ? "pro" : "free"} />

      {/* Upgrade Modal */}
      <Modal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Pro"
        titleIcon={<Star className="w-5 h-5 text-primary" />}
      >
        <UpgradeModalContent onDismiss={() => setShowUpgradeModal(false)} />
      </Modal>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary" />
            <span className="font-bold text-gray-900 dark:text-gray-100">MaddieHQ</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{userEmail}</span>
            {isPro && (
              <Badge variant="pro" icon={<Star className="w-3 h-3" />}>
                Pro
              </Badge>
            )}
            {isPro && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-primary/80 underline transition-colors hidden sm:block"
              >
                {portalLoading ? "Loading\u2026" : "Manage subscription"}
              </button>
            )}
            <button
              onClick={() => router.push("/app/chat")}
              className="text-gray-400 hover:text-primary/80 transition-colors"
              title="AI Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <NotificationBell />
            <ThemeToggle compact />
            <button
              onClick={() => router.push("/settings")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Email verified banner */}
        {verifiedBanner && (
          <Alert variant="success" onDismiss={() => setVerifiedBanner(false)}>
            Your email has been verified. Welcome aboard!
          </Alert>
        )}

        {/* Free plan upgrade banner */}
        {!isPro && !upgradeBannerDismissed && (
          <Alert variant="info" onDismiss={() => setUpgradeBannerDismissed(true)}>
            <span>
              You&apos;re on the free plan.{" "}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="font-semibold underline hover:text-primary/80"
              >
                Upgrade to Pro &rarr;
              </button>
            </span>
          </Alert>
        )}

        {/* Welcome */}
        <Card padding="lg">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Welcome back{userEmail ? `, ${userEmail}` : ""}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You&apos;re signed in and ready to build.{" "}
            {isPro ? (
              <span className="text-primary font-medium">You have Pro access.</span>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-primary font-medium hover:text-primary/80 underline"
              >
                Upgrade to Pro
              </button>
            )}
          </p>
        </Card>

        {/* Pro-gated feature example */}
        <Card
          title="Pro Feature Example"
          headerAction={
            !isPro ? (
              <Badge variant="default" icon={<Lock className="w-3 h-3" />}>
                Pro only
              </Badge>
            ) : undefined
          }
        >
          {isPro ? (
            <div className="bg-accent rounded-xl p-4 text-center">
              <p className="text-accent-foreground font-medium text-sm">
                This is your Pro feature. Replace this with your actual Pro content.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                This feature requires a Pro subscription.
              </p>
              <Button
                variant="primary"
                icon={<Star className="w-4 h-4" />}
                onClick={() => setShowUpgradeModal(true)}
              >
                Upgrade to Pro
              </Button>
            </div>
          )}
        </Card>

        {/* Free feature placeholder */}
        <Card title="Dashboard Content">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center border border-dashed border-gray-200 dark:border-gray-600">
            <Sprout className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Your app goes here.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Replace this placeholder with your actual UI. Auth, DB, Stripe, and email are all wired up.
            </p>
          </div>
        </Card>

        {/* Bottom padding */}
        <div className="pb-8" />
      </main>
    </div>
  );
}
