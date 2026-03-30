import { createClient } from "@/lib/supabase/server";
import { toggleFavoriteFromForm } from "@/lib/actions/lists";
import { Star } from "lucide-react";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: products } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      brand,
      unit,
      category:categories(name, icon)
    `
    )
    .order("name")
    .limit(200);

  const { data: favRows } = user
    ? await supabase.from("favorite_products").select("product_id").eq("user_id", user.id)
    : { data: [] as { product_id: string }[] };

  const favSet = new Set((favRows ?? []).map((f) => f.product_id));

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Produtos</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Base para adicionar às listas. Toque na estrela para favoritar.
      </p>

      <ul className="space-y-2">
        {(products ?? []).map((p) => {
          const catRaw = p.category as unknown;
          const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
            name: string;
            icon: string | null;
          } | null;
          const fav = favSet.has(p.id);
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {cat?.icon} {cat?.name}
                  {p.brand && ` · ${p.brand}`} · {p.unit}
                </p>
              </div>
              <form action={toggleFavoriteFromForm}>
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="next_favorited" value={fav ? "0" : "1"} />
                <button
                  type="submit"
                  className={`p-2 rounded-xl ${fav ? "text-amber-500" : "text-slate-300"}`}
                  aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
                >
                  <Star className="h-5 w-5" fill={fav ? "currentColor" : "none"} />
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {(products ?? []).length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">
          Nenhum produto. Rode o seed SQL no Supabase (veja README).
        </p>
      )}
    </div>
  );
}
