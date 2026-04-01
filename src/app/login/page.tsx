"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    err === "auth" ? "Não foi possível concluir o login." : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("Verifique seu e-mail para confirmar a conta (se o projeto exigir confirmação).");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">iList</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Listas inteligentes para o supermercado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          {message && (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5 text-sm transition-colors"
          >
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-emerald-700 dark:text-emerald-400"
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Configure <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">.env.local</code> com as chaves do Supabase.
        </p>
      </div>
    </div>
  );
}
