"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsersRound } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      setLoading(false);
      return;
    }

    if (inviteToken) {
      router.push(`/join/${encodeURIComponent(inviteToken)}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f0620]">
      {/* Lado esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 px-16 bg-gradient-to-br from-[#1a0a2e] to-[#0f0620]">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/factorzap-icon.svg" alt="FatorZap" className="h-32 w-32" />
          <div>
            <p className="text-4xl font-bold">
              <span className="text-white">Fator</span>
              <span className="text-green-400">Zap</span>
            </p>
            <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
              CRM para Comunicação no WhatsApp
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm text-slate-500 leading-relaxed">
            Gerencie conversas, contatos, negócios e automações — tudo em um único lugar, integrado ao WhatsApp Business.
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        {/* Logo mobile */}
        <div className="flex lg:hidden flex-col items-center gap-3 mb-10">
          <img src="/factorzap-icon.svg" alt="FatorZap" className="h-16 w-16" />
          <p className="text-2xl font-bold">
            <span className="text-white">Fator</span>
            <span className="text-green-400">Zap</span>
          </p>
        </div>

        <div className="w-full max-w-sm">
          {inviteToken ? (
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Você foi convidado</h1>
                <p className="text-sm text-slate-400">Entre para aceitar o convite</p>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
              <p className="mt-1 text-sm text-slate-400">Acesse sua conta para continuar</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm text-slate-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-slate-300">
                  Senha
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Não tem uma conta?{" "}
            <Link
              href={inviteToken ? `/signup?invite=${encodeURIComponent(inviteToken)}` : "/signup"}
              className="font-medium text-primary hover:text-primary/80"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
