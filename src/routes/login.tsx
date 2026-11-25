import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ADMIN_EMAIL, DEMO_VIEWER_EMAIL, isDemoAuthenticated, setDemoSession, validateDemoLogin } from "@/lib/demoAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PAiVE" },
      { name: "description", content: "Sign in to the PAiVE value engineering workspace." },
    ],
  }),
  beforeLoad: () => {
    if (isDemoAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    window.setTimeout(() => {
      const account = validateDemoLogin(email, password);
      if (account) {
        setDemoSession(account);
        void navigate({ to: "/" });
        return;
      }
      setError("Invalid email or password.");
      setPending(false);
    }, 400);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.72_0.17_233/0.22),transparent)]"
      />
      <div className="glass relative w-full max-w-md border border-border p-8 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center rounded-lg bg-white px-6 py-3 shadow-sm ring-1 ring-border">
            <img src="/paive-logo.png" alt="PAiVE" className="h-10 w-auto" width={140} height={40} />
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder={`${DEMO_ADMIN_EMAIL} or ${DEMO_VIEWER_EMAIL}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="h-10 w-full text-base font-semibold" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}