"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoaderCircle, LogIn } from "lucide-react";

function AdminLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") ?? "/am-dashboard", [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Invalid password");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-md rounded-[32px] border border-border bg-card p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 space-y-2 px-0">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Enter the admin password to access <span className="font-bold">/am-dashboard</span>.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 w-full rounded-2xl px-4 font-bold text-foreground bg-background/10 focus-visible:ring-primary/30"
            />
          </div>

          {error && <div className="text-sm font-bold text-destructive">{error}</div>}

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-2xl font-black uppercase tracking-widest text-[11px] disabled:opacity-50"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground font-bold">
          <Link href="/" className="hover:text-foreground">
            Back to site
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-6">
          <Card className="w-full max-w-md rounded-[32px] border border-border bg-card p-8 shadow-2xl shadow-black/40">
            <div className="h-6 w-40 animate-pulse rounded-xl bg-muted" />
            <div className="mt-4 h-10 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="mt-3 h-10 w-full animate-pulse rounded-2xl bg-muted" />
          </Card>
        </div>
      }
    >
      <AdminLoginPageInner />
    </Suspense>
  );
}
