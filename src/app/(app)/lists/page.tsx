import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select(
      `
      id,
      name,
      status,
      updated_at,
      supermarket:supermarkets(name)
    `
    )
    .order("updated_at", { ascending: false });

  const rows = lists ?? [];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Listas</h1>
        <Link
          href="/lists/new"
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-medium px-3 py-2"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <ul className="space-y-2">
        {rows.map((l) => {
          const smRaw = l.supermarket as unknown;
          const sm = (Array.isArray(smRaw) ? smRaw[0] : smRaw) as { name: string } | null | undefined;
          return (
            <li key={l.id}>
              <Link
                href={`/lists/${l.id}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{l.name}</p>
                    {sm?.name && <p className="text-xs text-slate-500">{sm.name}</p>}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 h-fit ${
                      l.status === "active"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : l.status === "completed"
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {l.status === "active" ? "Ativa" : l.status === "completed" ? "Concluída" : l.status}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhuma lista ainda.{" "}
          <Link href="/lists/new" className="text-emerald-600 font-medium">
            Criar primeira lista
          </Link>
        </p>
      )}
    </div>
  );
}
