"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = useMemo(() => {
    const candidate = searchParams.get("next");

    if (!candidate || !candidate.startsWith("/")) {
      return "/";
    }

    return candidate;
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "Falha ao autenticar");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm border-white/10 bg-[linear-gradient(180deg,rgba(46,34,70,0.9),rgba(23,18,35,0.94))]">
        <CardHeader className="space-y-2">
          <div className="mb-2 inline-flex w-fit rounded-lg bg-white/10 p-2 text-violet-100">
            <LockKeyhole className="size-4" />
          </div>
          <CardTitle className="text-white">Acesso privado</CardTitle>
          <CardDescription className="text-violet-100/60">
            Entre com seu login para acessar a carteira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="border-white/10 bg-white/8 text-white placeholder:text-violet-100/45"
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              className="border-white/10 bg-white/8 text-white placeholder:text-violet-100/45"
              required
            />
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
