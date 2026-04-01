"use client";

import { createClient } from "@/lib/supabase/client";
import type { ListItemRow, Product } from "@/types";
import { useEffect, useMemo, useState } from "react";

type Row = ListItemRow & { product?: Product | null };

export function useRealtimeList(listId: string, initial: Row[]) {
  const [items, setItems] = useState<Row[]>(initial);

  useEffect(() => {
    setItems(initial);
  }, [listId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`list-items-${listId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `list_id=eq.${listId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string };
            if (oldRow.id) setItems((prev) => prev.filter((i) => i.id !== oldRow.id));
            return;
          }

          const row = (payload.new as { id?: string })?.id
            ? (payload.new as Row)
            : null;
          if (!row?.id) return;

          const { data: full } = await supabase
            .from("list_items")
            .select(
              `
              *,
              product:products(id, name, brand, unit, category_id),
              added_by_profile:profiles!list_items_added_by_fkey (id, name)
            `
            )
            .eq("id", row.id)
            .maybeSingle();

          if (payload.eventType === "INSERT" && full) {
            setItems((prev) => {
              if (prev.some((i) => i.id === full.id)) return prev;
              return [...prev, full as Row].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
            return;
          }

          if (payload.eventType === "UPDATE" && full) {
            setItems((prev) => prev.map((i) => (i.id === full.id ? { ...i, ...full } : i)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId]);

  const total = useMemo(
    () =>
      items.reduce((sum, i) => {
        const q = Number(i.quantity);
        const p = i.unit_price != null ? Number(i.unit_price) : 0;
        return sum + q * p;
      }, 0),
    [items]
  );

  return { items, setItems, total };
}
