"use client";

import { useOfflineSync } from "@/lib/hooks/useOfflineSync";

export function OfflineBanner() {
  const { online } = useOfflineSync();
  if (online) return null;
  return (
    <div className="bg-amber-500 text-amber-950 text-center text-xs font-medium py-1.5 px-3">
      Sem conexão — alterações serão enviadas ao voltar online (fila local em evolução).
    </div>
  );
}
