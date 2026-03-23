"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const isDevelopment = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/"
    });

    setPending(false);

    if (result?.error) {
      setError("That login did not work. Check your email and password.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleDemoLogin() {
    setDemoPending(true);
    setError("");

    const seedResponse = await fetch("/api/dev/demo-user", {
      method: "POST"
    });

    const payload = (await seedResponse.json()) as {
      email?: string;
      password?: string;
      message?: string;
    };

    if (!seedResponse.ok || !payload.email || !payload.password) {
      setDemoPending(false);
      setError(payload.message ?? "Demo login setup failed.");
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
      callbackUrl: "/"
    });

    setDemoPending(false);

    if (result?.error) {
      setError("Demo login failed.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="page auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Creator Login</p>
        <h1>Log in to Maddie HQ</h1>
        <p className="lede">
          This is the new security front door. Once you log in, the protected creator
          rooms are available behind your account instead of acting like one open browser notebook.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="input-card">
            <span className="input-card__label">Email</span>
            <input
              autoComplete="email"
              className="input-card__field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="input-card">
            <span className="input-card__label">Password</span>
            <input
              autoComplete="current-password"
              className="input-card__field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="auth-form__error">{error}</p> : null}

          <button className="hero__cta auth-form__submit" disabled={pending} type="submit">
            {pending ? "Logging in..." : "Log In"}
          </button>

          {isDevelopment ? (
            <button
              className="auth-form__demo"
              disabled={demoPending}
              type="button"
              onClick={handleDemoLogin}
            >
              {demoPending ? "Opening demo account..." : "Use Demo Account"}
            </button>
          ) : null}
        </form>

        <p className="auth-form__switch">
          Need an account? <Link href="/signup">Create one here</Link>.
        </p>
      </section>
    </main>
  );
}
