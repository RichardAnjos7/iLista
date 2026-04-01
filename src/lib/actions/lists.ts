"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";

const shareCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export async function createList(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const name = String(formData.get("name") ?? "").trim() || "Nova lista";
  const supermarketId = String(formData.get("supermarket_id") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({
      name,
      owner_id: user.id,
      supermarket_id: supermarketId || null,
      share_code: shareCode(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/lists");
  return data.id as string;
}

export async function ensureShareCode(listId: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("shopping_lists")
    .select("share_code")
    .eq("id", listId)
    .single();

  if (row?.share_code) return row.share_code as string;

  const code = shareCode();
  const { error } = await supabase.from("shopping_lists").update({ share_code: code }).eq("id", listId);
  if (error) throw new Error(error.message);
  revalidatePath(`/lists/${listId}`);
  return code;
}

export async function addListItem(listId: string, productId: string, quantity: number, unitPrice: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("list_items").insert({
    list_id: listId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    added_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/lists/${listId}`);
}

export async function updateListItem(
  itemId: string,
  listId: string,
  patch: { quantity?: number; unit_price?: number | null; checked?: boolean }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const body: Record<string, unknown> = { ...patch };
  if (patch.checked === true) body.checked_by = user.id;
  if (patch.checked === false) body.checked_by = null;

  const { error } = await supabase.from("list_items").update(body).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/lists/${listId}`);
}

export async function removeListItem(itemId: string, listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/lists/${listId}`);
}

export async function completeList(listId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("supermarket_id")
    .eq("id", listId)
    .single();

  const { data: items } = await supabase
    .from("list_items")
    .select("product_id, unit_price, quantity")
    .eq("list_id", listId);

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("shopping_lists")
    .update({ status: "completed", completed_at: now })
    .eq("id", listId);

  if (upErr) throw new Error(upErr.message);

  const rows =
    items?.map((i) => ({
      product_id: i.product_id,
      supermarket_id: list?.supermarket_id ?? null,
      price: i.unit_price != null ? Number(i.unit_price) : 0,
      list_id: listId,
    })) ?? [];

  if (rows.length > 0) {
    const { error: phErr } = await supabase.from("price_history").insert(
      rows.filter((r) => r.price > 0)
    );
    if (phErr) throw new Error(phErr.message);
  }

  revalidatePath("/lists");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function joinListByCodeAction(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_list_by_code", { code: code.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/lists");
  return data as string;
}

export async function toggleFavoriteFromForm(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const favorited = String(formData.get("next_favorited") ?? "") === "1";
  if (!productId) throw new Error("Produto inválido");
  await toggleFavorite(productId, favorited);
}

export async function toggleFavorite(productId: string, favorited: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  if (favorited) {
    const { error } = await supabase.from("favorite_products").insert({ user_id: user.id, product_id: productId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("favorite_products")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/products");
}
