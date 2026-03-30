"use client";

import { joinListByCodeAction } from "@/lib/actions/lists";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function JoinListClient({ code }: { code: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const listId = await joinListByCodeAction(code);
        if (!cancelled) router.replace(`/lists/${listId}`);
      } catch (e) {
        if (!cancelled) setMsg(e instanceof Error ? e.message : "Não foi possível entrar na lista.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (loading) {
    return <p className="text-sm text-slate-600">Conectando…</p>;
  }

  return (
    <div className="w-full max-w-sm text-center space-y-4">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Convite para lista</h1>
      {msg && <p className="text-sm text-amber-700 dark:text-amber-300">{msg}</p>}
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Código: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{code}</code>
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(`/lists/join/${code}`)}`}
        className="inline-block w-full rounded-xl bg-emerald-600 text-white font-medium py-2.5 text-sm"
      >
        Entrar para colaborar
      </Link>
      <Link href="/" className="block text-xs text-slate-500">
        Ir para o app
      </Link>
    </div>
  );
}
