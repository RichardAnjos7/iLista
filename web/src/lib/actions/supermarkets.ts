"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSupermarket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome obrigatório");

  const { error } = await supabase.from("supermarkets").insert({
    name,
    user_id: user.id,
    address: String(formData.get("address") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/lists/new");
  revalidatePath("/");
}
