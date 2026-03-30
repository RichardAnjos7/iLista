import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select(
      `
      id,
      name,
      completed_at,
      supermarket:supermarkets(name),
      items:list_items(quantity, unit_price)
    `
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(40);

  const rows = lists ?? [];

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Histórico</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Compras concluídas e totais registrados.
      </p>

      <ul className="space-y-2">
        {rows.map((l) => {
          const smRaw = l.supermarket as unknown;
          const sm = (Array.isArray(smRaw) ? smRaw[0] : smRaw) as { name: string } | null | undefined;
          const itemsRaw = l.items as unknown;
          const items = (Array.isArray(itemsRaw) ? itemsRaw : []) as {
            quantity: number;
            unit_price: number | null;
          }[];
          const total = items.reduce(
            (s, i) => s + Number(i.quantity) * (i.unit_price != null ? Number(i.unit_price) : 0),
            0
          );
          const when = l.completed_at
            ? format(new Date(l.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
            : "—";
          return (
            <li key={l.id}>
              <Link
                href={`/lists/${l.id}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{l.name}</p>
                    <p className="text-xs text-slate-500">{when}</p>
                    {sm?.name && <p className="text-xs text-slate-400">{sm.name}</p>}
                  </div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                    {formatBRL(total)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhuma compra concluída. Finalize uma lista na tela da lista.
        </p>
      )}
    </div>
  );
}
