import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoAuthenticated, setDemoSession, validateDemoLogin } from "@/lib/demoAuth";
import { cn } from "@/lib/utils";

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
      if (validateDemoLogin(email, password)) {
        setDemoSession();
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
        <div className="flex flex-col items-center text-center">
          <img src="/paive-logo.png" alt="PAiVE" className="h-11 w-auto" width={154} height={44} />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Access the PAiVE pilot workspace to review BIM changes and value engineering options.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="user@paive.eu"
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

        <p className={cn("mt-6 text-center text-xs text-muted-foreground")}>Demo pilot environment — credentials are not sent to a server.</p>
      </div>
    </div>
  );
}