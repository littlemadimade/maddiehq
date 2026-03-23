"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setPending(false);
      setError(payload.message ?? "Sign up failed.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/"
    });

    setPending(false);

    if (result?.error) {
      setError("Your account was created, but auto-login failed. Try logging in manually.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="page auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Create Account</p>
        <h1>Start your protected creator workspace</h1>
        <p className="lede">
          This is the first real step away from browser-only prototype mode. Your account
          becomes the identity the app can attach creator data to.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="input-card">
            <span className="input-card__label">Name</span>
            <input
              autoComplete="name"
              className="input-card__field"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

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
              autoComplete="new-password"
              className="input-card__field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="input-card__help">Use at least 8 characters for now.</span>
          </label>

          {error ? <p className="auth-form__error">{error}</p> : null}

          <button className="hero__cta auth-form__submit" disabled={pending} type="submit">
            {pending ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-form__switch">
          Already have an account? <Link href="/login">Log in here</Link>.
        </p>
      </section>
    </main>
  );
}
