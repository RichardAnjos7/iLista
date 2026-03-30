import { ListDetailClient } from "@/components/list/ListDetailClient";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list, error: le } = await supabase
    .from("shopping_lists")
    .select(
      `
      id,
      name,
      status,
      share_code,
      supermarket_id,
      supermarket:supermarkets(name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (le || !list) notFound();

  const { data: rawItems } = await supabase
    .from("list_items")
    .select(
      `
      *,
      product:products(id, name, brand, unit, category_id),
      added_by_profile:profiles!list_items_added_by_fkey(id, name)
    `
    )
    .eq("list_id", id)
    .order("created_at", { ascending: true });

  const smRaw = list.supermarket as unknown;
  const supermarket = (Array.isArray(smRaw) ? smRaw[0] : smRaw) as { name: string } | null | undefined;

  return (
    <div>
      <Link href="/lists" className="text-xs text-emerald-600 font-medium">
        ← Listas
      </Link>
      <ListDetailClient
        list={{
          id: list.id,
          name: list.name,
          status: list.status,
          share_code: list.share_code,
          supermarket_id: list.supermarket_id,
          supermarket: supermarket ?? null,
        }}
        initialItems={rawItems ?? []}
      />
    </div>
  );
}
